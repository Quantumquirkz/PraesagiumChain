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

/// Devuelve un mensaje corto y legible para el usuario (evita pegar el JSON crudo de Gemini).
fn format_gemini_error(status: reqwest::StatusCode, body: &str) -> String {
    if status.as_u16() == 429 {
        return "Límite de uso de la API de Gemini alcanzado. Prueba de nuevo en 1–2 minutos o revisa tu cuota en Google AI Studio.".to_string();
    }
    let preview = body.lines().next().unwrap_or(body).chars().take(120).collect::<String>();
    if preview.is_empty() {
        format!("Error de la API de Gemini ({})", status)
    } else {
        format!("Error de la API de Gemini ({}): {}", status, preview)
    }
}

fn parse_analysis_response(text: &str) -> Result<(String, String)> {
    let text = text.trim();
    let (analysis, description) = if let Some(idx) = text.find("DESCRIPTION:") {
        let (a, d) = text.split_at(idx);
        let analysis = a
            .trim_start_matches("ANALYSIS:")
            .trim()
            .lines()
            .map(str::trim)
            .collect::<Vec<_>>()
            .join(" ");
        let description = d
            .trim_start_matches("DESCRIPTION:")
            .trim()
            .lines()
            .map(str::trim)
            .collect::<Vec<_>>()
            .join(" ");
        (analysis, description)
    } else {
        let first = text.lines().next().unwrap_or("").trim().to_string();
        let rest = text
            .lines()
            .skip(1)
            .map(str::trim)
            .collect::<Vec<_>>()
            .join(" ");
        (first, rest)
    };
    Ok((
        if analysis.is_empty() {
            "No analysis available.".to_string()
        } else {
            analysis
        },
        if description.is_empty() {
            "No description available.".to_string()
        } else {
            description
        },
    ))
}

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
            let msg = format_gemini_error(status, &body_text);
            return Err(AppError::Validation(msg));
        }
        let parsed: GeminiResponse = resp.json().await.map_err(|e| AppError::Validation(format!("Gemini parse failed: {e}")))?;
        let text_response = parsed.candidates.and_then(|c| c.into_iter().next())
            .and_then(|c| c.content.parts.into_iter().next()).and_then(|p| p.text).unwrap_or_default();
        let score_str = text_response.split_whitespace().next().unwrap_or("0");
        let score: f32 = score_str.parse().unwrap_or(0.0);
        Ok(score.clamp(-1.0, 1.0))
    }

    async fn generate_analysis(&self, prompt: &str) -> Result<(String, String)> {
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            self.model, self.api_key
        );
        let body = serde_json::json!({
            "contents": [{ "parts": [{ "text": prompt }] }],
            "generationConfig": { "temperature": 0.5, "maxOutputTokens": 1024 }
        });
        let resp = self
            .client
            .post(&url)
            .header(CONTENT_TYPE, "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| AppError::Validation(format!("Gemini request failed: {e}")))?;
        if !resp.status().is_success() {
            let status = resp.status();
            let body_text = resp.text().await.unwrap_or_default();
            let msg = format_gemini_error(status, &body_text);
            return Err(AppError::Validation(msg));
        }
        let parsed: GeminiResponse = resp
            .json()
            .await
            .map_err(|e| AppError::Validation(format!("Gemini parse failed: {e}")))?;
        let text_response = parsed
            .candidates
            .and_then(|c| c.into_iter().next())
            .and_then(|c| c.content.parts.into_iter().next())
            .and_then(|p| p.text)
            .unwrap_or_default();
        parse_analysis_response(&text_response)
    }
}
