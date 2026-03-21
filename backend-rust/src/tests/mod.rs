//! Backend tests. Run: cargo test

#[cfg(test)]
mod phpe_tests {
    use predictor::{default_context, predict, EventFeatures, TimeSeriesSample};

    fn make_series(rows: &[&[f32]]) -> TimeSeriesSample {
        let features: Vec<EventFeatures> = rows
            .iter()
            .map(|r| EventFeatures::new(r.to_vec()))
            .collect();
        let timestamps: Vec<u64> = (0..features.len() as u64).collect();
        TimeSeriesSample::new(timestamps, features)
    }

    #[test]
    fn predict_returns_valid_range() {
        let ts = make_series(&[&[0.1, 0.2], &[0.2, 0.3], &[0.15, 0.25]]);
        let ctx = default_context(&ts);
        let result = predict(&ts, &ctx);
        assert!(
            (0.0..=1.0).contains(&result.probability),
            "probability out of range: {}",
            result.probability
        );
        assert!(
            (0.0..=1.0).contains(&result.uncertainty),
            "uncertainty out of range: {}",
            result.uncertainty
        );
    }

    #[test]
    fn predict_empty_series_handled() {
        let ts = TimeSeriesSample::new(vec![], vec![]);
        let ctx = default_context(&ts);
        let result = predict(&ts, &ctx);
        assert!((0.0..=1.0).contains(&result.probability));
    }

    #[test]
    fn model_hash_is_deterministic() {
        let ts = make_series(&[&[1.0], &[2.0]]);
        let ctx = default_context(&ts);
        let r1 = predict(&ts, &ctx);
        let r2 = predict(&ts, &ctx);
        assert_eq!(r1.model_hash, r2.model_hash, "model_hash should be deterministic");
    }

    #[test]
    fn sliding_window_context_chosen_for_long_series() {
        let rows: Vec<Vec<f32>> = (0..20).map(|i| vec![i as f32]).collect();
        let refs: Vec<&[f32]> = rows.iter().map(|v| v.as_slice()).collect();
        let ts = make_series(&refs);
        let ctx = default_context(&ts);
        assert!(
            matches!(ctx.temporal_params.strategy, predictor::EncodingStrategy::SlidingWindow(10)),
            "expected SlidingWindow(10) for 20-point series"
        );
    }
}

#[cfg(test)]
mod cache_tests {
    use crate::services::Cache;
    use predictor::PredictionResult;

    fn make_result(hash: [u8; 32]) -> PredictionResult {
        PredictionResult {
            probability: 0.75,
            uncertainty: 0.1,
            model_version: "test-v1".to_string(),
            model_hash: hash,
        }
    }

    #[tokio::test]
    async fn cache_hit_preserves_model_hash() {
        let cache = Cache::new();
        let hash = [42u8; 32];
        let result = make_result(hash);

        cache.set_prediction(1, &result, 3600).await;
        let cached = cache.get_prediction(1).await.expect("should be a cache hit");

        assert_eq!(cached.model_hash, hash, "model_hash must be preserved on cache hit");
        assert_eq!(cached.probability, 0.75);
        assert_eq!(cached.model_version, "test-v1");
    }

    #[tokio::test]
    async fn cache_miss_after_invalidation() {
        let cache = Cache::new();
        let result = make_result([1u8; 32]);
        cache.set_prediction(2, &result, 3600).await;
        cache.invalidate_market(2).await;
        assert!(cache.get_prediction(2).await.is_none());
    }

    #[tokio::test]
    async fn cache_stats_reflect_entries() {
        let cache = Cache::new();
        assert_eq!(cache.stats().await.cached_predictions, 0);
        cache.set_prediction(10, &make_result([0u8; 32]), 3600).await;
        cache.set_prediction(11, &make_result([0u8; 32]), 3600).await;
        assert_eq!(cache.stats().await.cached_predictions, 2);
    }
}

#[cfg(test)]
mod error_tests {
    use crate::error::AppError;
    use axum::response::IntoResponse;

    #[tokio::test]
    async fn validation_error_returns_400() {
        let err = AppError::Validation("bad input".into());
        let resp = err.into_response();
        assert_eq!(resp.status(), axum::http::StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn not_found_returns_404() {
        let err = AppError::NotFound;
        let resp = err.into_response();
        assert_eq!(resp.status(), axum::http::StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn external_api_returns_502() {
        let err = AppError::ExternalApi("upstream down".into());
        let resp = err.into_response();
        assert_eq!(resp.status(), axum::http::StatusCode::BAD_GATEWAY);
    }
}

#[cfg(test)]
mod signal_price_tests {
    use crate::services::sources::types::Signal;

    #[test]
    fn signal_default_has_none_price() {
        let sig = Signal::default();
        assert!(sig.price.is_none());
        assert!(sig.price_change_24h.is_none());
    }
}

#[cfg(test)]
mod api_markets_tests {
    use axum::body::Body;
    use axum::http::{Request, StatusCode};

    /// Build app and state for integration tests. Returns None if DATABASE_URL is not set.
    async fn build_test_app() -> Option<(axum::Router, std::sync::Arc<crate::state::AppState>)> {
        let database_url = std::env::var("DATABASE_URL").ok();
        let database_url = match database_url {
            Some(url) if url.starts_with("postgresql://") || url.starts_with("postgres://") => url,
            _ => {
                eprintln!("Skipping test: DATABASE_URL (PostgreSQL) not set or invalid");
                return None;
            }
        };

        let db = match crate::db::Database::new(&database_url, 5).await {
            Ok(d) => d,
            Err(_) => {
                eprintln!("Skipping test: could not connect to DB");
                return None;
            }
        };
        let _ = db.migrate().await;

        let cache = std::sync::Arc::new(crate::services::Cache::new());
        let market_service = std::sync::Arc::new(crate::services::MarketService::new(db.clone()));
        let prediction_service = std::sync::Arc::new(crate::services::PredictionService::new(
            db.clone(),
            cache.clone(),
            300,
        ));
        let reputation_service =
            std::sync::Arc::new(crate::services::ReputationService::new(db.clone()));
        let ai_service = std::sync::Arc::new(crate::services::AiService::new(std::sync::Arc::new(
            crate::services::MockAiProvider,
        )));
        let hybrid_predictor = std::sync::Arc::new(crate::services::HybridPredictor::new(
            ai_service.clone(),
        ));
        let http_client = std::sync::Arc::new(reqwest::Client::new());
        let sources_registry = std::sync::Arc::new(crate::services::SourcesRegistry::new(
            (*http_client).clone(),
            None,
        ));
        let config = std::sync::Arc::new(crate::config::Config {
            database_url: database_url.clone(),
            db_pool_size: 5,
            port: 4000,
            ai_provider: "mock".to_string(),
            gemini_api_key: None,
            gemini_model: None,
            hf_api_key: None,
            hf_model: None,
            prediction_cache_ttl: 300,
            rpc_url: None,
            prediction_market_address: None,
            start_block: None,
            rate_limit_per_second: 100,
            rate_limit_burst: 200,
            finnhub_api_key: None,
            api_football_key: None,
            cors_origins: None,
            jwt_secret: None,
            redis_url: None,
            clickhouse_url: None,
            environment: None,
            chainlink_eth_usd_feed: None,
            chainlink_btc_usd_feed: None,
        });

        let state = std::sync::Arc::new(crate::state::AppState {
            market_service,
            prediction_service,
            reputation_service,
            ai_service,
            hybrid_predictor,
            sources_registry,
            cache,
            http_client,
            config,
            db,
            event_bus: crate::services::EventBus::new(),
            indexer_state: None,
            started_at: chrono::Utc::now().timestamp(),
            nonce_store: crate::api::auth::new_nonce_store(None).unwrap(),
            chainlink_feeds: None,
        });

        let app = crate::router::build_router(state.clone());
        Some((app, state))
    }

    /// List markets integration test. Requires DATABASE_URL (PostgreSQL).
    #[tokio::test]
    async fn list_markets_returns_paginated() {
        let Some((app, _)) = build_test_app().await else { return };
        let req = Request::builder()
            .uri("/api/markets?page=1&limit=5")
            .body(Body::empty())
            .unwrap();
        use tower::util::ServiceExt;
        let response = app.oneshot(req).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert!(json.get("items").and_then(|v| v.as_array()).is_some());
        assert!(json.get("total").is_some());
    }

    /// GET /api/markets/:id returns 404 for non-existent market.
    #[tokio::test]
    async fn get_by_id_returns_404_for_nonexistent() {
        let Some((app, _)) = build_test_app().await else { return };
        let req = Request::builder()
            .uri("/api/markets/99999")
            .body(Body::empty())
            .unwrap();
        use tower::util::ServiceExt;
        let response = app.oneshot(req).await.unwrap();
        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }

    /// GET /api/markets/:id/predictions returns 200 and empty array when market has no predictions.
    #[tokio::test]
    async fn get_predictions_returns_empty_for_nonexistent_market() {
        let Some((app, _)) = build_test_app().await else { return };
        let req = Request::builder()
            .uri("/api/markets/99999/predictions")
            .body(Body::empty())
            .unwrap();
        use tower::util::ServiceExt;
        let response = app.oneshot(req).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert!(json.is_array());
        assert!(json.as_array().unwrap().is_empty());
    }

    /// GET /api/markets/private/access?key=INVALID returns 404 for unknown key.
    #[tokio::test]
    async fn private_access_returns_404_for_invalid_key() {
        let Some((app, _)) = build_test_app().await else { return };
        let req = Request::builder()
            .uri("/api/markets/private/access?key=PRIV-INVALID1")
            .body(Body::empty())
            .unwrap();
        use tower::util::ServiceExt;
        let response = app.oneshot(req).await.unwrap();
        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }

    /// GET /api/sources/fetch?source=unknown returns 400 validation error.
    #[tokio::test]
    async fn sources_fetch_returns_400_for_unknown_source() {
        let Some((app, _)) = build_test_app().await else { return };
        let req = Request::builder()
            .uri("/api/sources/fetch?source=unknownsource")
            .body(Body::empty())
            .unwrap();
        use tower::util::ServiceExt;
        let response = app.oneshot(req).await.unwrap();
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }

    /// POST /api/markets with valid body returns 201 and MarketView.
    #[tokio::test]
    async fn create_market_returns_201_with_valid_body() {
        let Some((app, _)) = build_test_app().await else { return };
        let now = chrono::Utc::now().timestamp();
        let body = serde_json::json!({
            "question": "Will BTC exceed 100k by end of 2025?",
            "close_time": now + 86400,
            "resolve_time": now + 86400 * 2,
            "market_type": "base"
        });
        let req = Request::builder()
            .method("POST")
            .uri("/api/markets")
            .header("Content-Type", "application/json")
            .body(Body::from(body.to_string()))
            .unwrap();
        use tower::util::ServiceExt;
        let response = app.oneshot(req).await.unwrap();
        assert_eq!(response.status(), StatusCode::CREATED);
        let body_bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body_bytes).unwrap();
        assert!(json.get("id").is_some());
        assert_eq!(json.get("question").and_then(|v| v.as_str()).unwrap(), "Will BTC exceed 100k by end of 2025?");
        assert_eq!(json.get("status").and_then(|v| v.as_str()).unwrap(), "Open");
    }
}
