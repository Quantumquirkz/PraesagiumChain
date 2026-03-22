use async_trait::async_trait;
use crate::error::Result;
use super::super::AiProvider;

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
            if t.contains(p) { score += 0.15; }
        }
        for n in negatives {
            if t.contains(n) { score -= 0.15; }
        }
        Ok(score.clamp(-1.0, 1.0))
    }

    async fn generate_analysis(&self, prompt: &str) -> Result<(String, String)> {
        let _ = prompt;
        let analysis = "Simulated analysis (mock): The market shows a probability distribution based on PHPE signals, AI sentiment and real-time price data. The fusion of sources (Binance, Chainlink, news/social) provides context for the hybrid prediction.".to_string();
        let description = "Description (mock): Information is gathered from multiple sources: market data (Binance, Chainlink), PHPE time series for historical trends, and news/social sentiment analysis. The model combines these signals with configurable weights (PHPE 35%, Sentiment 40%, Price 25%) to produce a calibrated prediction with uncertainty band.".to_string();
        Ok((analysis, description))
    }
}
