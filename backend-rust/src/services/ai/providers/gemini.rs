use async_trait::async_trait;
use reqwest::header::CONTENT_TYPE;
use serde::Deserialize;
use crate::error::{AppError, Result};
use super::super::AiProvider;

pub struct GeminiProvider {
    api_key: String,
    model: String,
    client: reqwest::Client,
}

impl GeminiProvider {
    pub fn new(api_key: String, model: String) -> Self {
        Self { api_key, model, client: reqwest::Client::new() }
    }
}

#[derive(Debug, Deserialize)]
struct GeminiContentPart { text: Option<String> }
#[derive(Debug, Deserialize)]
struct GeminiContent { parts: Vec<GeminiContentPart> }
#[derive(Debug, Deserialize)]
struct GeminiCandidate { content: GeminiContent }
#[derive(Debug, Deserialize)]
struct GeminiResponse { candidates: Option<Vec<GeminiCandidate>> }

#[async_trait]
impl AiProvider for GeminiProvider {
    fn name(&self) -> &'static str { "gemini" }

    async fn sentiment_score(&self, text: &str) -> Result<f32> {
        let url = format!("https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}", self.model, self.api_key);
        let prompt = format!("Analyze the sentiment of this text. Reply with ONLY a single number from -1 (very negative) to 1 (very positive). Text: {}", text);
        let body = serde_json::json!({
            "contents": [{ "parts": [{ "text": prompt }] }],
            "generationConfig": { "temperature": 0.1, "maxOutputTokens": 10 }
        });
        let resp = self.client.post(&url).header(CONTENT_TYPE, "application/json").json(&body).send()
            .await.map_err(|e| AppError::Validation(format!("Gemini request failed: {e}")))?;
        if !resp.status().is_success() {
            let status = resp.status();
            let body_text = resp.text().await.unwrap_or_default();
            return Err(AppError::Validation(format!("Gemini API error ({status}): {body_text}")));
        }
        let parsed: GeminiResponse = resp.json().await.map_err(|e| AppError::Validation(format!("Gemini parse failed: {e}")))?;
        let text_response = parsed.candidates.and_then(|c| c.into_iter().next())
            .and_then(|c| c.content.parts.into_iter().next()).and_then(|p| p.text).unwrap_or_default();
        let score_str = text_response.trim().split_whitespace().next().unwrap_or("0");
        let score: f32 = score_str.parse().unwrap_or(0.0);
        Ok(score.clamp(-1.0, 1.0))
    }
}
