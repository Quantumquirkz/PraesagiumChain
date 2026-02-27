//! Sign-In With Ethereum (SIWE) authentication.
//!
//! Flow:
//!   1. Client calls `POST /api/auth/challenge` with their Ethereum address.
//!      Server returns a nonce + expiry.
//!   2. Client signs the EIP-4361 message with their wallet.
//!   3. Client calls `POST /api/auth/verify` with address + signature.
//!      Server recovers the signer, validates the nonce, and returns a JWT.
//!   4. Protected endpoints check the `Authorization: Bearer <jwt>` header.
//!
//! The nonce store is an in-memory `DashMap` keyed by address (lowercase).
//! Nonces expire after 5 minutes. For production, replace with Redis.

use axum::{extract::State, http::StatusCode, Json};
use ethers::core::types::{Address, Signature};
use ethers::utils::hash_message;
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::info;

use crate::error::{AppError, Result};
use crate::state::AppState;

// ─── Nonce store ─────────────────────────────────────────────────────────────

/// In-memory nonce store. Shared via `AppState::nonce_store`.
pub type NonceStore = Arc<RwLock<HashMap<String, NonceEntry>>>;

pub struct NonceEntry {
    pub nonce: String,
    pub expires_at: i64,
}

pub fn new_nonce_store() -> NonceStore {
    Arc::new(RwLock::new(HashMap::new()))
}

// ─── JWT claims ──────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    /// Ethereum address (checksummed).
    pub sub: String,
    /// Issued-at (Unix seconds).
    pub iat: i64,
    /// Expiry (Unix seconds).
    pub exp: i64,
}

/// JWT lifetime: 24 hours.
const JWT_EXPIRY_SECS: i64 = 86_400;

// ─── Request / response types ────────────────────────────────────────────────

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

// ─── Handlers ────────────────────────────────────────────────────────────────

/// POST /api/auth/challenge
///
/// Issues a fresh nonce for the given address. The client must sign the
/// returned `message` string with their Ethereum wallet.
pub async fn challenge(
    State(state): State<Arc<AppState>>,
    Json(req): Json<ChallengeRequest>,
) -> Result<Json<ChallengeResponse>> {
    let address = normalize_address(&req.address)?;
    let nonce = generate_nonce();
    let now = chrono::Utc::now().timestamp();
    let expires_at = now + 300; // 5 minutes

    let message = build_siwe_message(&address, &nonce, expires_at);

    {
        let mut store = state.nonce_store.write().await;
        // Purge expired entries opportunistically
        store.retain(|_, v| v.expires_at > now);
        store.insert(address.clone(), NonceEntry { nonce: nonce.clone(), expires_at });
    }

    info!(address = %address, "SIWE challenge issued");

    Ok(Json(ChallengeResponse {
        nonce,
        message,
        expires_at,
    }))
}

/// POST /api/auth/verify
///
/// Verifies the SIWE signature. On success, returns a JWT valid for 24 hours.
pub async fn verify(
    State(state): State<Arc<AppState>>,
    Json(req): Json<VerifyRequest>,
) -> Result<Json<VerifyResponse>> {
    let address = normalize_address(&req.address)?;
    let now = chrono::Utc::now().timestamp();

    // Retrieve and consume the nonce
    let nonce = {
        let mut store = state.nonce_store.write().await;
        let entry = store.remove(&address).ok_or_else(|| {
            AppError::Validation("No pending challenge for this address".to_string())
        })?;
        if entry.expires_at < now {
            return Err(AppError::Validation("Challenge expired".to_string()));
        }
        entry.nonce
    };

    // Reconstruct the message that was signed
    let expires_at_for_msg = now + 300; // approximate; we only need the nonce to match
    let message = build_siwe_message(&address, &nonce, expires_at_for_msg);

    // Recover the signer from the signature
    let recovered = recover_signer(&message, &req.signature)?;

    if recovered.to_lowercase() != address.to_lowercase() {
        return Err(AppError::Validation(
            "Signature does not match address".to_string(),
        ));
    }

    // Issue JWT
    let jwt_secret = state
        .config
        .jwt_secret
        .as_deref()
        .unwrap_or("praesagium-default-secret-change-in-production");

    let expires_at = now + JWT_EXPIRY_SECS;
    let claims = Claims {
        sub: address.clone(),
        iat: now,
        exp: expires_at,
    };
    let token = encode(
        &Header::new(Algorithm::HS256),
        &claims,
        &EncodingKey::from_secret(jwt_secret.as_bytes()),
    )
    .map_err(|e| AppError::Internal(anyhow::anyhow!("JWT encode: {}", e)))?;

    info!(address = %address, "SIWE verification successful");

    Ok(Json(VerifyResponse {
        token,
        address,
        expires_at,
    }))
}

// ─── JWT validation helper (used by middleware) ───────────────────────────────

/// Validates a Bearer JWT and returns the claims on success.
pub fn validate_jwt(token: &str, secret: &str) -> std::result::Result<Claims, String> {
    let key = DecodingKey::from_secret(secret.as_bytes());
    let mut validation = Validation::new(Algorithm::HS256);
    validation.validate_exp = true;

    decode::<Claims>(token, &key, &validation)
        .map(|data| data.claims)
        .map_err(|e| format!("Invalid JWT: {e}"))
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn normalize_address(raw: &str) -> Result<String> {
    let trimmed = raw.trim();
    if trimmed.len() < 42 || !trimmed.starts_with("0x") {
        return Err(AppError::Validation(
            "Invalid Ethereum address (must be 0x + 40 hex chars)".to_string(),
        ));
    }
    Ok(trimmed.to_lowercase())
}

fn generate_nonce() -> String {
    use uuid::Uuid;
    Uuid::new_v4().to_string().replace('-', "")
}

fn build_siwe_message(address: &str, nonce: &str, expires_at: i64) -> String {
    format!(
        "praesagiumchain.io wants you to sign in with your Ethereum account:\n\
         {address}\n\n\
         Sign in to PraesagiumChain\n\n\
         URI: https://praesagiumchain.io\n\
         Version: 1\n\
         Chain ID: 11155111\n\
         Nonce: {nonce}\n\
         Issued At: {}\n\
         Expiration Time: {}",
        chrono::DateTime::from_timestamp(expires_at - 300, 0)
            .unwrap_or_default()
            .format("%Y-%m-%dT%H:%M:%SZ"),
        chrono::DateTime::from_timestamp(expires_at, 0)
            .unwrap_or_default()
            .format("%Y-%m-%dT%H:%M:%SZ"),
    )
}

fn recover_signer(message: &str, signature_hex: &str) -> Result<String> {
    let sig_bytes = hex::decode(signature_hex.trim_start_matches("0x"))
        .map_err(|_| AppError::Validation("Invalid signature hex".to_string()))?;

    if sig_bytes.len() != 65 {
        return Err(AppError::Validation(
            "Signature must be 65 bytes".to_string(),
        ));
    }

    let sig = Signature::try_from(sig_bytes.as_slice())
        .map_err(|e| AppError::Validation(format!("Signature parse: {e}")))?;

    let msg_hash = hash_message(message);
    let recovered: Address = sig
        .recover(msg_hash)
        .map_err(|e| AppError::Validation(format!("Signature recovery failed: {e}")))?;

    Ok(format!("{:?}", recovered))
}

// ─── JWT extractor middleware ─────────────────────────────────────────────────

/// Axum extractor that validates the `Authorization: Bearer <jwt>` header.
/// Use this in protected handlers: `auth: AuthenticatedUser`.
#[derive(Debug, Clone)]
pub struct AuthenticatedUser {
    pub address: String,
}

#[axum::async_trait]
impl<S> axum::extract::FromRequestParts<S> for AuthenticatedUser
where
    S: Send + Sync,
    Arc<AppState>: axum::extract::FromRef<S>,
{
    type Rejection = (StatusCode, String);

    async fn from_request_parts(
        parts: &mut axum::http::request::Parts,
        state: &S,
    ) -> std::result::Result<Self, Self::Rejection> {
        use axum::extract::FromRef;

        let app_state: Arc<AppState> = Arc::from_ref(state);
        let jwt_secret = app_state
            .config
            .jwt_secret
            .as_deref()
            .unwrap_or("praesagium-default-secret-change-in-production");

        let auth_header = parts
            .headers
            .get(axum::http::header::AUTHORIZATION)
            .and_then(|v| v.to_str().ok())
            .ok_or_else(|| {
                (
                    StatusCode::UNAUTHORIZED,
                    "Missing Authorization header".to_string(),
                )
            })?;

        let token = auth_header.strip_prefix("Bearer ").ok_or_else(|| {
            (
                StatusCode::UNAUTHORIZED,
                "Authorization header must start with 'Bearer '".to_string(),
            )
        })?;

        let claims = validate_jwt(token, jwt_secret)
            .map_err(|e| (StatusCode::UNAUTHORIZED, e))?;

        Ok(AuthenticatedUser {
            address: claims.sub,
        })
    }
}
