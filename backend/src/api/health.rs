//! Health check endpoint with DB ping and service version.

use axum::{extract::State, Json};
use std::sync::Arc;

use crate::state::AppState;

const SERVICE_VERSION: &str = env!("CARGO_PKG_VERSION");

#[derive(serde::Serialize)]
pub struct HealthResponse {
    pub ok: bool,
    pub status: &'static str,
    pub version: &'static str,
    pub service: &'static str,
    pub db: &'static str,
}

pub async fn health(State(state): State<Arc<AppState>>) -> Json<HealthResponse> {
    let res: Result<sqlx::postgres::PgQueryResult, sqlx::Error> =
        sqlx::query("SELECT 1").execute(state.db.pool()).await;
    let db_ok = res.is_ok();

    Json(HealthResponse {
        ok: db_ok,
        status: if db_ok { "ok" } else { "degraded" },
        version: SERVICE_VERSION,
        service: "praesagiumchain-backend",
        db: if db_ok { "ok" } else { "unreachable" },
    })
}
