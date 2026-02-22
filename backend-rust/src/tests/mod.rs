//! Backend tests. Run: cargo test

#[cfg(test)]
mod health_tests {
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use axum::routing::get;
    use axum::Router;
    use tower::util::ServiceExt;

    #[tokio::test]
    async fn health_returns_ok_and_ok_true() {
        let app = Router::new().route("/health", get(crate::health));
        let req = Request::builder()
            .uri("/health")
            .body(Body::empty())
            .unwrap();
        let response = app.oneshot(req).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json.get("ok").and_then(|v| v.as_bool()), Some(true));
        assert_eq!(json.get("status").and_then(|v| v.as_str()), Some("ok"));
    }
}

#[cfg(test)]
mod api_markets_tests {
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use axum::routing::get;
    use axum::{extract::Extension, Router};
    use std::sync::Arc;
    use tower::util::ServiceExt;

    /// List markets without DB: we need a real Database to run this test.
    /// Skipped unless DATABASE_URL is set (integration test).
    #[tokio::test]
    async fn list_markets_returns_paginated() {
        let database_url = std::env::var("DATABASE_URL").ok();
        let database_url = match database_url {
            Some(url) if url.starts_with("postgres") => url,
            _ => {
                eprintln!("Skipping list_markets test: DATABASE_URL (postgres) not set");
                return;
            }
        };

        let db = match crate::db::Database::new(&database_url, 5).await {
            Ok(d) => d,
            Err(_) => {
                eprintln!("Skipping list_markets test: could not connect to DB");
                return;
            }
        };
        let _ = db.migrate().await;
        let market_service = Arc::new(crate::services::MarketService::new(db));
        let app = Router::new()
            .route("/api/markets", get(crate::api::markets::list))
            .layer(Extension(market_service));

        let req = Request::builder()
            .uri("/api/markets?page=1&limit=5")
            .body(Body::empty())
            .unwrap();
        let response = app.oneshot(req).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert!(json.get("items").and_then(|v| v.as_array()).is_some());
        assert!(json.get("total").is_some());
    }
}
