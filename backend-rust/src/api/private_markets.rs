//! Private market access keys API.
//!
//! POST /api/markets/private/register — Creator registers market after on-chain creation.
//! GET  /api/markets/private/access?key=PRIV-XXX — Validate key and return market info.

use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use std::sync::Arc;

use crate::error::{AppError, Result};
use crate::models::{
    PrivateMarketAccessKeyRow, PrivateMarketAccessResponse, PrivateMarketByCreatorItem,
    PrivateMarketRegisterRequest, PrivateMarketRegisterResponse,
};
use crate::state::AppState;

/// Generate a unique access key: PRIV- + 8 alphanumeric chars (uppercase).
fn generate_access_key() -> String {
    let uuid_str = uuid::Uuid::new_v4().simple().to_string();
    format!(
        "PRIV-{}",
        uuid_str[..8].to_uppercase()
    )
}

#[derive(Debug, Deserialize)]
pub struct AccessQuery {
    pub key: String,
}

#[derive(Debug, Deserialize)]
pub struct ByCreatorQuery {
    pub address: String,
}

/// POST /api/markets/private/register
pub async fn register(
    State(state): State<Arc<AppState>>,
    Json(req): Json<PrivateMarketRegisterRequest>,
) -> Result<impl IntoResponse> {
    let creator = req.creator_address.trim();
    if creator.is_empty() {
        return Err(AppError::Validation("creator_address is required".into()));
    }
    if req.question.trim().is_empty() {
        return Err(AppError::Validation("question is required".into()));
    }
    if req.on_chain_market_id < 1 {
        return Err(AppError::Validation("on_chain_market_id must be >= 1".into()));
    }
    if req.question.len() > 500 {
        return Err(AppError::Validation("question too long (max 500 chars)".into()));
    }
    if creator.len() > 100 {
        return Err(AppError::Validation("creator_address too long (max 100 chars)".into()));
    }

    let created_at = chrono::Utc::now().timestamp();

    // Generate unique key; retry on collision (very unlikely)
    let mut access_key = generate_access_key();
    for _ in 0..5 {
        let res = sqlx::query(
            "INSERT INTO private_market_access_keys \
             (on_chain_market_id, access_key, creator_address, question, close_time, resolve_time, created_at) \
             VALUES ($1, $2, $3, $4, $5, $6, $7)",
        )
        .bind(req.on_chain_market_id)
        .bind(&access_key)
        .bind(creator)
        .bind(req.question.trim())
        .bind(req.close_time)
        .bind(req.resolve_time)
        .bind(created_at)
        .execute(state.db.pool())
        .await;

        match res {
            Ok(_) => {
                return Ok((
                    StatusCode::CREATED,
                    Json(PrivateMarketRegisterResponse {
                        access_key: access_key.clone(),
                        market_id: req.on_chain_market_id,
                        message: "Share this key so others can join the private market.".to_string(),
                    }),
                ));
            }
            Err(e) => {
                let msg = e.to_string();
                let is_unique = msg.contains("UNIQUE") || msg.contains("unique") || msg.contains("duplicate");
                if is_unique {
                    access_key = generate_access_key();
                } else {
                    return Err(AppError::Database(e));
                }
            }
        }
    }

    Err(AppError::Internal(anyhow::anyhow!(
        "Could not generate unique access key after retries"
    )))
}

/// GET /api/markets/private/access?key=PRIV-XXX
pub async fn access(
    State(state): State<Arc<AppState>>,
    Query(q): Query<AccessQuery>,
) -> Result<impl IntoResponse> {
    let key = q.key.trim();
    if key.is_empty() {
        return Err(AppError::Validation("key query param required (e.g. PRIV-XXXXXXXX)".into()));
    }
    // Prevent DoS with excessively long keys (format is PRIV- + 8 chars)
    if key.len() > 64 {
        return Err(AppError::Validation("key too long or invalid format".into()));
    }

    let row: Option<PrivateMarketAccessKeyRow> = sqlx::query_as(
        "SELECT id, on_chain_market_id, access_key, creator_address, question, close_time, resolve_time, created_at \
         FROM private_market_access_keys WHERE access_key = $1",
    )
    .bind(key)
    .fetch_optional(state.db.pool())
    .await?;

    let row = row.ok_or(AppError::NotFound)?;

    Ok((
        StatusCode::OK,
        Json(PrivateMarketAccessResponse {
            market_id: row.on_chain_market_id,
            question: row.question,
            close_time: row.close_time,
            resolve_time: row.resolve_time,
            creator: row.creator_address,
        }),
    ))
}

/// GET /api/markets/private/by-creator?address=0x...
pub async fn by_creator(
    State(state): State<Arc<AppState>>,
    Query(q): Query<ByCreatorQuery>,
) -> Result<Json<Vec<PrivateMarketByCreatorItem>>> {
    let address = q.address.trim();
    if address.is_empty() {
        return Err(AppError::Validation("address query param is required".into()));
    }
    if address.len() > 100 {
        return Err(AppError::Validation("address too long".into()));
    }

    #[derive(sqlx::FromRow)]
    struct Row {
        on_chain_market_id: i64,
        question: String,
        close_time: i64,
        resolve_time: i64,
        access_key: String,
    }

    let rows = sqlx::query_as::<_, Row>(
        "SELECT on_chain_market_id, question, close_time, resolve_time, access_key \
         FROM private_market_access_keys \
         WHERE LOWER(creator_address) = LOWER($1) \
         ORDER BY created_at DESC",
    )
    .bind(address)
    .fetch_all(state.db.pool())
    .await?;

    let items: Vec<PrivateMarketByCreatorItem> = rows
        .into_iter()
        .map(|r| PrivateMarketByCreatorItem {
            market_id: r.on_chain_market_id,
            question: r.question,
            close_time: r.close_time,
            resolve_time: r.resolve_time,
            access_key: r.access_key,
        })
        .collect();

    Ok(Json(items))
}
