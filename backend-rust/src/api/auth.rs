//! Sign-In With Ethereum (SIWE) HTTP handlers. Domain logic in [`crate::services::siwe`].
//!
//! Flow:
//!   1. `POST /api/auth/challenge` — nonce + message to sign.
//!   2. Client signs EIP-4361 message.
//!   3. `POST /api/auth/verify` — signature verified; returns JWT.

use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::error::Result;
use crate::services::siwe::{
    issue_challenge, normalize_address, verify_and_issue_token, ChallengeResult, VerifyInput,
    VerifyResult,
};
use crate::state::AppState;

// ─── Request / response types (HTTP / JSON) ───────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct ChallengeRequest {
    /// Ethereum address requesting a challenge (0x-prefixed, any case).
    pub address: String,
}

#[derive(Debug, Serialize)]
pub struct ChallengeResponse {
    pub nonce: String,
    pub message: String,
    pub expires_at: i64,
}

#[derive(Debug, Deserialize)]
pub struct VerifyRequest {
    pub address: String,
    /// Hex-encoded EIP-191 signature (0x-prefixed).
    pub signature: String,
}

#[derive(Debug, Serialize)]
pub struct VerifyResponse {
    pub token: String,
    pub address: String,
    pub expires_at: i64,
}

impl From<ChallengeResult> for ChallengeResponse {
    fn from(r: ChallengeResult) -> Self {
        ChallengeResponse {
            nonce: r.nonce,
            message: r.message,
            expires_at: r.expires_at,
        }
    }
}

impl From<VerifyResult> for VerifyResponse {
    fn from(r: VerifyResult) -> Self {
        VerifyResponse {
            token: r.token,
            address: r.address,
            expires_at: r.expires_at,
        }
    }
}

/// POST /api/auth/challenge
pub async fn challenge(
    State(state): State<Arc<AppState>>,
    Json(req): Json<ChallengeRequest>,
) -> Result<Json<ChallengeResponse>> {
    let address = normalize_address(&req.address)?;
    let inner = issue_challenge(state.nonce_store.as_ref(), &address).await?;
    Ok(Json(ChallengeResponse::from(inner)))
}

/// POST /api/auth/verify
pub async fn verify(
    State(state): State<Arc<AppState>>,
    Json(req): Json<VerifyRequest>,
) -> Result<Json<VerifyResponse>> {
    let jwt_secret = state
        .config
        .jwt_secret
        .as_deref()
        .unwrap_or("praesagium-default-secret-change-in-production");

    let inner = verify_and_issue_token(
        state.nonce_store.as_ref(),
        jwt_secret,
        VerifyInput {
            address: req.address,
            signature: req.signature,
        },
    )
    .await?;
    Ok(Json(VerifyResponse::from(inner)))
}
