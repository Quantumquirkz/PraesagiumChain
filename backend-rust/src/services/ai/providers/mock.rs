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
}
