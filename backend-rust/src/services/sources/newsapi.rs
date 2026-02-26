//! NewsAPI - News headlines for sentiment/context. Free tier: 100 req/day.
//! https://newsapi.org/docs Requires NEWSAPI_KEY.

use crate::error::{AppError, Result};
use crate::services::sources::types::Signal;
use serde::Deserialize;

const BASE_URL: &str = "https://newsapi.org/v2/top-headlines";

#[derive(Debug, Deserialize)]
struct ApiResponse {
    status: String,
    totalResults: Option<u32>,
    articles: Option<Vec<Article>>,
}

#[derive(Debug, Deserialize)]
struct Article {
    title: Option<String>,
    description: Option<String>,
}

pub struct NewsApiSource {
    client: reqwest::Client,
    api_key: Option<String>,
}

impl NewsApiSource {
    pub fn new(api_key: Option<String>) -> Self {
        Self {
            client: reqwest::Client::new(),
            api_key,
        }
    }

    pub fn with_client(client: reqwest::Client, api_key: Option<String>) -> Self {
        Self { client, api_key }
    }

    /// Fetch headlines for a query. Returns a signal derived from article count.
    pub async fn fetch_headlines(&self, query: &str, country: &str) -> Result<Signal> {
        let key = self.api_key.as_deref().ok_or_else(|| {
            AppError::Validation("NEWSAPI_KEY not set".into())
        })?;
        let q: String = query.chars().map(|c| if c.is_ascii_alphanumeric() || c == ' ' { c } else { '_' }).collect();
        let url = format!("{}?q={}&country={}&pageSize=10&apiKey={}", BASE_URL, q.replace(' ', "+"), country, key);
        let resp = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|e| AppError::Validation(format!("NewsAPI request failed: {e}")))?;
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(AppError::Validation(format!("NewsAPI error ({status}): {body}")));
        }
        let data: ApiResponse = resp.json().await
            .map_err(|e| AppError::Validation(format!("NewsAPI parse failed: {e}")))?;
        let count = data.articles.as_ref().map(|a| a.len()).unwrap_or(0) as f32;
        let prob = (count / 10.0).min(1.0) * 0.5 + 0.25;
        Ok(Signal {
            source: "newsapi".to_string(),
            price_change_24h: None,
            volume_24h: None,
            sentiment: Some(prob),
        })
    }
}
