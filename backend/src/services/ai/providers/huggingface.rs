//! Hugging Face Inference API provider for sentiment analysis.
//! Uses cardiffnlp/twitter-roberta-base-sentiment or similar models.

use async_trait::async_trait;
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use serde::Deserialize;

use crate::error::{AppError, Result};
use super::super::AiProvider;

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
