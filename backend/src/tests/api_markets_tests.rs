//! Integration-style API tests (require PostgreSQL via DATABASE_URL).

use axum::body::Body;
use axum::http::{Request, StatusCode};

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
    let reputation_service = std::sync::Arc::new(crate::services::ReputationService::new(db.clone()));
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
        nonce_store: crate::services::siwe::new_nonce_store(None).unwrap(),
        chainlink_feeds: None,
    });

    let app = crate::router::build_router(state.clone());
    Some((app, state))
}

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
    assert_eq!(
        json.get("question").and_then(|v| v.as_str()).unwrap(),
        "Will BTC exceed 100k by end of 2025?"
    );
    assert_eq!(json.get("status").and_then(|v| v.as_str()).unwrap(), "Open");
}
