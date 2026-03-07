use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Not found")]
    NotFound,

    #[error("Validation error: {0}")]
    Validation(String),

    /// External API/upstream failure (Binance, Open-Meteo, etc.).
    #[error("External API error: {0}")]
    ExternalApi(String),

    #[error("Internal error: {0}")]
    Internal(#[from] anyhow::Error),

    #[allow(dead_code)]
    #[error("Rate limit exceeded")]
    RateLimit,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::NotFound => (StatusCode::NOT_FOUND, "Not found".to_string()),
            AppError::Validation(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            AppError::ExternalApi(msg) => {
                tracing::warn!("External API error: {}", msg);
                let is_dev = std::env::var("ENVIRONMENT")
                    .map(|v| v == "development" || v.eq_ignore_ascii_case("dev"))
                    .unwrap_or(false);
                let message = if is_dev {
                    msg.clone()
                } else {
                    "External service error".to_string()
                };
                (StatusCode::BAD_GATEWAY, message)
            }
            AppError::Database(e) => {
                let detail = e.to_string();
                tracing::error!("Database error: {}", detail);
                let is_dev = std::env::var("ENVIRONMENT")
                    .map(|v| v == "development" || v.eq_ignore_ascii_case("dev"))
                    .unwrap_or(false);
                let message = if is_dev {
                    format!("Database error: {}", detail)
                } else {
                    "Database error".to_string()
                };
                (StatusCode::INTERNAL_SERVER_ERROR, message)
            }
            AppError::Internal(e) => {
                tracing::error!("Internal error: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal error".to_string())
            }
            AppError::RateLimit => (StatusCode::TOO_MANY_REQUESTS, "Rate limit exceeded".to_string()),
        };

        let body = Json(json!({ "error": message }));
        (status, body).into_response()
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
