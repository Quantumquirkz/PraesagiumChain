pub mod providers;
pub use providers::{GeminiProvider, HuggingFaceProvider, MockAiProvider};

use async_trait::async_trait;
use std::sync::Arc;
use crate::error::{AppError, Result};

#[async_trait]
pub trait AiProvider: Send + Sync {
    fn name(&self) -> &'static str;
    async fn sentiment_score(&self, text: &str) -> Result<f32>;
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
        let score = self.provider.sentiment_score(text).await?;
        let prob = 1.0 / (1.0 + (-2.0 * score).exp());
        Ok((score, prob.clamp(0.0, 1.0)))
    }
}
