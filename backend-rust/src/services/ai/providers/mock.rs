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
        let analysis = "Análisis simulado (mock): El mercado muestra una distribución de probabilidad basada en las señales PHPE, el sentimiento IA y los datos de precio en tiempo real. La fusión de fuentes (Binance, Chainlink, noticias/social) aporta contexto para la predicción híbrida.".to_string();
        let description = "Descripción (mock): La información se recopila de múltiples fuentes: datos de mercado (Binance, Chainlink), series temporales PHPE para tendencias históricas, y análisis de sentimiento de noticias y redes sociales. El modelo combina estas señales con pesos configurables (PHPE 35%, Sentimiento 40%, Precio 25%) para producir una predicción calibrada con banda de incertidumbre.".to_string();
        Ok((analysis, description))
    }
}
