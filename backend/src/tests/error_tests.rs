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
