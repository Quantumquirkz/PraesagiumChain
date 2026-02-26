//! NewsAPI - News headlines for sentiment/context. Free tier: 100 req/day.
//! https://newsapi.org/docs Requires NEWSAPI_KEY.
//! Sentiment is computed via keyword scoring on titles and descriptions.

use crate::error::{AppError, Result};
use crate::services::sources::types::Signal;
use serde::Deserialize;

const BASE_URL: &str = "https://newsapi.org/v2/top-headlines";

/// Positive and negative keywords used for sentiment scoring.
const POSITIVE_KEYWORDS: &[&str] = &[
    "surge", "rally", "gain", "rise", "bull", "bullish", "up", "high", "record", "growth",
    "profit", "win", "success", "positive", "strong", "boost", "recover", "soar", "breakout",
    "adoption", "approval", "launch", "partnership", "upgrade",
];
const NEGATIVE_KEYWORDS: &[&str] = &[
    "crash", "fall", "drop", "bear", "bearish", "down", "low", "loss", "decline", "sell",
    "dump", "fear", "risk", "ban", "hack", "fraud", "scam", "lawsuit", "fine", "warning",
    "concern", "negative", "weak", "plunge", "collapse",
];

#[derive(Debug, Deserialize)]
#[allow(non_snake_case)]
struct ApiResponse {
    status: String,
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

    /// Fetch headlines for a query. Returns a signal with real keyword-based sentiment in [0, 1].
    pub async fn fetch_headlines(&self, query: &str, country: &str) -> Result<Signal> {
        let key = self
            .api_key
            .as_deref()
            .ok_or_else(|| AppError::Validation("NEWSAPI_KEY not set".into()))?;
        let q: String = query
            .chars()
            .map(|c| if c.is_ascii_alphanumeric() || c == ' ' { c } else { '_' })
            .collect();
        let url = format!(
            "{}?q={}&country={}&pageSize=20&apiKey={}",
            BASE_URL,
            q.replace(' ', "+"),
            country,
            key
        );
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
        let data: ApiResponse = resp
            .json()
            .await
            .map_err(|e| AppError::Validation(format!("NewsAPI parse failed: {e}")))?;

        if data.status != "ok" {
            return Err(AppError::Validation(format!("NewsAPI status: {}", data.status)));
        }

        let articles = data.articles.unwrap_or_default();
        let sentiment = compute_sentiment(&articles);

        Ok(Signal {
            source: "newsapi".to_string(),
            price: None,
            price_change_24h: None,
            volume_24h: Some(articles.len() as f64),
            sentiment: Some(sentiment),
        })
    }
}

/// Scores articles by counting positive and negative keyword hits in titles and descriptions.
/// Returns a value in [0, 1] where 0.5 is neutral.
fn compute_sentiment(articles: &[Article]) -> f32 {
    if articles.is_empty() {
        return 0.5;
    }

    let mut positive = 0i32;
    let mut negative = 0i32;

    for article in articles {
        let text = format!(
            "{} {}",
            article.title.as_deref().unwrap_or(""),
            article.description.as_deref().unwrap_or("")
        )
        .to_lowercase();

        for kw in POSITIVE_KEYWORDS {
            if text.contains(kw) {
                positive += 1;
            }
        }
        for kw in NEGATIVE_KEYWORDS {
            if text.contains(kw) {
                negative += 1;
            }
        }
    }

    let total = positive + negative;
    if total == 0 {
        return 0.5;
    }

    // Map to [0, 1]: 0 = fully negative, 0.5 = neutral, 1 = fully positive
    (positive as f32) / (total as f32)
}
