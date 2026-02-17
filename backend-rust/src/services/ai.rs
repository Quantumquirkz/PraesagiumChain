use async_trait::async_trait;
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use serde::Deserialize;
use std::sync::Arc;

use crate::error::{AppError, Result};

#[async_trait]
pub trait AiProvider: Send + Sync {
    fn name(&self) -> &'static str;
    async fn sentiment_score(&self, text: &str) -> Result<f32>;
}

/// A deterministic mock provider for local development.
pub struct MockAiProvider;

#[async_trait]
impl AiProvider for MockAiProvider {
    fn name(&self) -> &'static str {
        "mock"
    }

    async fn sentiment_score(&self, text: &str) -> Result<f32> {
        let t = text.to_lowercase();
        let positives = ["bull", "bullish", "up", "pump", "good", "positive", "win", "growth"];
        let negatives = ["bear", "bearish", "down", "dump", "bad", "negative", "lose", "decline"];

        let mut score = 0.0_f32;
        for p in positives {
            if t.contains(p) {
                score += 0.15;
            }
        }
        for n in negatives {
            if t.contains(n) {
                score -= 0.15;
            }
        }
        Ok(score.clamp(-1.0, 1.0))
    }
}

/// Hugging Face Inference API provider.
pub struct HuggingFaceProvider {
    api_key: String,
    model: String,
    client: reqwest::Client,
}

impl HuggingFaceProvider {
    pub fn new(api_key: String, model: String) -> Self {
        Self {
            api_key,
            model,
            client: reqwest::Client::new(),
        }
    }
}

#[derive(Debug, Deserialize)]
struct HfLabelScore {
    label: String,
    score: f32,
}

// HF commonly returns either:
// 1) [ {label, score}, ... ]
// 2) [ [ {label, score}, ... ] ]
#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum HfResponse {
    Flat(Vec<HfLabelScore>),
    Nested(Vec<Vec<HfLabelScore>>),
}

#[async_trait]
impl AiProvider for HuggingFaceProvider {
    fn name(&self) -> &'static str {
        "huggingface"
    }

    async fn sentiment_score(&self, text: &str) -> Result<f32> {
        let url = format!("https://api-inference.huggingface.co/models/{}", self.model);
        let auth = format!("Bearer {}", self.api_key);

        let resp = self
            .client
            .post(url)
            .header(AUTHORIZATION, auth)
            .header(CONTENT_TYPE, "application/json")
            .json(&serde_json::json!({ "inputs": text }))
            .send()
            .await
            .map_err(|e| AppError::Validation(format!("AI request failed: {e}")))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(AppError::Validation(format!(
                "AI provider error ({status}): {body}"
            )));
        }

        let parsed: HfResponse = resp
            .json()
            .await
            .map_err(|e| AppError::Validation(format!("AI response parse failed: {e}")))?;

        let labels = match parsed {
            HfResponse::Flat(v) => v,
            HfResponse::Nested(mut vv) => vv.pop().unwrap_or_default(),
        };

        // Map typical labels to a scalar in [-1, 1].
        // Many sentiment models output POSITIVE/NEGATIVE; some output star ratings.
        let mut score = 0.0_f32;
        for ls in labels {
            let l = ls.label.to_uppercase();
            if l.contains("POSITIVE") || l.contains("5") || l.contains("4") {
                score += ls.score;
            } else if l.contains("NEGATIVE") || l.contains("1") || l.contains("2") {
                score -= ls.score;
            }
        }

        Ok(score.clamp(-1.0, 1.0))
    }
}

#[derive(Clone)]
pub struct AiService {
    provider: Arc<dyn AiProvider>,
}

impl AiService {
    pub fn new(provider: Arc<dyn AiProvider>) -> Self {
        Self { provider }
    }

    pub fn provider_name(&self) -> &'static str {
        self.provider.name()
    }

    pub async fn sentiment(&self, text: &str) -> Result<(f32, f32)> {
        if text.trim().is_empty() {
            return Err(AppError::Validation("text cannot be empty".to_string()));
        }
        // score in [-1, 1]
        let score = self.provider.sentiment_score(text).await?;
        // map to probability in [0, 1]
        let prob = 1.0 / (1.0 + (-2.0 * score).exp());
        Ok((score, prob.clamp(0.0, 1.0)))
    }
}

