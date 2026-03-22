//! Sign-In With Ethereum (SIWE): nonce storage, message building, signature recovery, JWT issuance.
//! HTTP handlers live in [`crate::api::auth`].

use ethers::core::types::{Address, Signature};
use ethers::utils::hash_message;
use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::info;

use crate::error::{AppError, Result};

// ─── Nonce store ─────────────────────────────────────────────────────────────

pub struct NonceEntry {
    pub nonce: String,
    pub expires_at: i64,
}

/// Backend for SIWE nonces: in-memory (default) or Redis when REDIS_URL is set.
#[derive(Clone)]
pub enum NonceStoreBackend {
    Memory(Arc<RwLock<HashMap<String, NonceEntry>>>),
    Redis(Arc<redis::Client>),
}

const NONCE_PREFIX: &str = "siwe:nonce:";
const NONCE_TTL_SECS: i64 = 300;

impl NonceStoreBackend {
    pub async fn set(&self, address: &str, nonce: &str, expires_at: i64) -> Result<()> {
        match self {
            NonceStoreBackend::Memory(store) => {
                let mut m = store.write().await;
                let now = chrono::Utc::now().timestamp();
                m.retain(|_, v| v.expires_at > now);
                m.insert(
                    address.to_string(),
                    NonceEntry {
                        nonce: nonce.to_string(),
                        expires_at,
                    },
                );
                Ok(())
            }
            NonceStoreBackend::Redis(client) => {
                let mut conn = client
                    .get_multiplexed_async_connection()
                    .await
                    .map_err(|e| AppError::Internal(anyhow::anyhow!("Redis connect: {}", e)))?;
                let key = format!("{}{}", NONCE_PREFIX, address.to_lowercase());
                let value = format!("{}:{}", nonce, expires_at);
                redis::cmd("SETEX")
                    .arg(&key)
                    .arg(NONCE_TTL_SECS)
                    .arg(&value)
                    .query_async::<_, ()>(&mut conn)
                    .await
                    .map_err(|e| AppError::Internal(anyhow::anyhow!("Redis SETEX: {}", e)))?;
                Ok(())
            }
        }
    }

    /// Returns (nonce, expires_at) and removes the entry.
    pub async fn get_and_remove(&self, address: &str) -> Result<Option<(String, i64)>> {
        match self {
            NonceStoreBackend::Memory(store) => {
                let mut m = store.write().await;
                let entry = m.remove(address);
                Ok(entry.map(|e| (e.nonce, e.expires_at)))
            }
            NonceStoreBackend::Redis(client) => {
                let mut conn = client
                    .get_multiplexed_async_connection()
                    .await
                    .map_err(|e| AppError::Internal(anyhow::anyhow!("Redis connect: {}", e)))?;
                let key = format!("{}{}", NONCE_PREFIX, address.to_lowercase());
                let value: Option<String> = redis::cmd("GET")
                    .arg(&key)
                    .query_async::<_, Option<String>>(&mut conn)
                    .await
                    .map_err(|e| AppError::Internal(anyhow::anyhow!("Redis GET: {}", e)))?;
                if let Some(s) = value {
                    let _: () = redis::cmd("DEL")
                        .arg(&key)
                        .query_async::<_, ()>(&mut conn)
                        .await
                        .map_err(|e| AppError::Internal(anyhow::anyhow!("Redis DEL: {}", e)))?;
                    let parts: Vec<&str> = s.splitn(2, ':').collect();
                    if parts.len() == 2 {
                        if let Ok(exp) = parts[1].parse::<i64>() {
                            return Ok(Some((parts[0].to_string(), exp)));
                        }
                    }
                }
                Ok(None)
            }
        }
    }
}

/// Type alias for shared nonce store (used in AppState).
pub type NonceStore = Arc<NonceStoreBackend>;

pub fn new_nonce_store(redis_url: Option<&str>) -> Result<NonceStore> {
    Ok(Arc::new(if let Some(url) = redis_url.filter(|s| !s.trim().is_empty()) {
        let client = redis::Client::open(url)
            .map_err(|e| AppError::Internal(anyhow::anyhow!("Redis client: {}", e)))?;
        NonceStoreBackend::Redis(Arc::new(client))
    } else {
        NonceStoreBackend::Memory(Arc::new(RwLock::new(HashMap::new())))
    }))
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
pub const JWT_EXPIRY_SECS: i64 = 86_400;

// ─── Challenge / verify (domain logic) ──────────────────────────────────────

#[derive(Debug, serde::Serialize)]
pub struct ChallengeResult {
    pub nonce: String,
    pub message: String,
    pub expires_at: i64,
}

/// Build and store a SIWE challenge for the given normalized address.
pub async fn issue_challenge(
    store: &NonceStoreBackend,
    address: &str,
) -> Result<ChallengeResult> {
    let nonce = generate_nonce();
    let now = chrono::Utc::now().timestamp();
    let expires_at = now + 300; // 5 minutes

    let message = build_siwe_message(address, &nonce, expires_at);

    store.set(address, &nonce, expires_at).await?;

    info!(address = %address, "SIWE challenge issued");

    Ok(ChallengeResult {
        nonce,
        message,
        expires_at,
    })
}

#[derive(Debug, serde::Deserialize)]
pub struct VerifyInput {
    pub address: String,
    /// Hex-encoded EIP-191 signature (0x-prefixed).
    pub signature: String,
}

#[derive(Debug, serde::Serialize)]
pub struct VerifyResult {
    pub token: String,
    pub address: String,
    pub expires_at: i64,
}

/// Verify SIWE signature and issue JWT. `jwt_secret` should come from config.
pub async fn verify_and_issue_token(
    store: &NonceStoreBackend,
    jwt_secret: &str,
    input: VerifyInput,
) -> Result<VerifyResult> {
    let address = normalize_address(&input.address)?;
    let now = chrono::Utc::now().timestamp();

    let nonce = {
        let entry = store.get_and_remove(&address).await?;
        let (nonce, exp) = entry.ok_or_else(|| {
            AppError::Validation("No pending challenge for this address".to_string())
        })?;
        if exp < now {
            return Err(AppError::Validation("Challenge expired".to_string()));
        }
        nonce
    };

    let expires_at_for_msg = now + 300;
    let message = build_siwe_message(&address, &nonce, expires_at_for_msg);

    let recovered = recover_signer(&message, &input.signature)?;

    if recovered.to_lowercase() != address.to_lowercase() {
        return Err(AppError::Validation(
            "Signature does not match address".to_string(),
        ));
    }

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

    Ok(VerifyResult {
        token,
        address,
        expires_at,
    })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

pub fn normalize_address(raw: &str) -> Result<String> {
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
