//! Canonical model hash for on-chain traceability.

use sha2::{Digest, Sha256};

use crate::integration::api_types::ModelMetadata;

fn canonical_serialize(meta: &ModelMetadata) -> Vec<u8> {
    let mut s = format!(
        "{}:{}:{}:",
        meta.version,
        meta.trained_on,
        meta.dag_version
    );
    for b in &meta.weights_checksum {
        s.push_str(&format!("{:02x}", b));
    }
    s.into_bytes()
}

/// Devuelve SHA-256 de los metadatos del modelo.
pub fn model_hash(meta: &ModelMetadata) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(canonical_serialize(meta));
    let result = hasher.finalize();
    let mut out = [0u8; 32];
    out.copy_from_slice(&result);
    out
}
