//! Hybrid predictor: fuses time series (engine), sentiment (AI), Binance, Chainlink.
//! Sources: X, Reddit, Binance, Chainlink (proxy) for multi-signal predictions.

use std::sync::Arc;

use predictor::{default_context, predict, TimeSeriesSample};

use crate::error::Result;
use crate::services::ai::AiService;
use crate::services::sources::{BinanceSource, ChainlinkSource};
use crate::services::Cache;
use tracing::debug;

/// Weights for hybrid fusion (sum = 1.0).
#[derive(Clone)]
pub struct HybridWeights {
    pub series: f32,
    pub sentiment: f32,
    pub price: f32,
}

impl Default for HybridWeights {
    fn default() -> Self {
        Self {
            series: 0.35,
            sentiment: 0.40,
            price: 0.25,
        }
    }
}

/// Hybrid predictor: engine + AI + Binance + Chainlink.
pub struct HybridPredictor {
    ai: Arc<AiService>,
    binance: BinanceSource,
    chainlink: ChainlinkSource,
    #[allow(dead_code)]
    cache: Arc<Cache>,
    weights: HybridWeights,
}

impl HybridPredictor {
    pub fn new(ai: Arc<AiService>, cache: Arc<Cache>) -> Self {
        Self {
            ai,
            binance: BinanceSource::new(),
            chainlink: ChainlinkSource::new(),
            cache,
            weights: HybridWeights::default(),
        }
    }

    /// Prediction from time series only (engine). Returns (probability, uncertainty).
    pub fn predict_series_with_uncertainty(&self, series: &TimeSeriesSample) -> (f32, f32) {
        if series.is_empty() {
            return (0.5, 0.25);
        }
        let ctx = default_context(series);
        let res = predict(series, &ctx);
        (res.probability, res.uncertainty)
    }

    /// Prediction from time series only (engine).
    #[allow(dead_code)]
    pub fn predict_series(&self, series: &TimeSeriesSample) -> f32 {
        self.predict_series_with_uncertainty(series).0
    }

    /// Predict from sentiment text (AI).
    pub async fn predict_sentiment(&self, text: &str) -> Result<f32> {
        let (_, prob) = self.ai.sentiment(text).await?;
        Ok(prob)
    }

    fn price_to_prob(&self, change_pct: f32) -> f32 {
        1.0 / (1.0 + (-0.2 * change_pct).exp())
    }

    /// Average sentiment from multiple texts (X, Reddit, etc.).
    async fn predict_sentiment_multi(&self, texts: &[String]) -> Result<f32> {
        if texts.is_empty() {
            return Err(crate::error::AppError::Validation("no texts".to_string()));
        }
        let mut sum = 0.0_f32;
        let mut count = 0;
        for t in texts {
            if !t.trim().is_empty() {
                if let Ok((_, p)) = self.ai.sentiment(t).await {
                    sum += p;
                    count += 1;
                }
            }
        }
        Ok(if count > 0 { sum / count as f32 } else { 0.5 })
    }

    /// Hybrid: series + sentiment (single or multi) + Binance/Chainlink price.
    /// Returns (probability, optional PHPE uncertainty when series was used).
    pub async fn predict_hybrid(
        &self,
        series: Option<&TimeSeriesSample>,
        sentiment_text: Option<&str>,
        social_texts: Option<&[String]>,
        binance_symbol: Option<&str>,
        use_chainlink: bool,
    ) -> Result<(f32, Option<f32>)> {
        let w = &self.weights;
        let mut total_weight = 0.0_f32;
        let mut weighted_sum = 0.0_f32;
        let mut phpe_uncertainty: Option<f32> = None;

        if let Some(s) = series {
            if !s.is_empty() {
                let (p, u) = self.predict_series_with_uncertainty(s);
                weighted_sum += w.series * p;
                total_weight += w.series;
                phpe_uncertainty = Some(u);
            }
        }

        if let Some(texts) = social_texts {
            if !texts.is_empty() {
                if let Ok(p) = self.predict_sentiment_multi(texts).await {
                    weighted_sum += w.sentiment * p;
                    total_weight += w.sentiment;
                    debug!("Social ({} texts): prob={:.3}", texts.len(), p);
                }
            }
        } else if let Some(text) = sentiment_text {
            if !text.trim().is_empty() {
                if let Ok(p) = self.predict_sentiment(text).await {
                    weighted_sum += w.sentiment * p;
                    total_weight += w.sentiment;
                }
            }
        }

        if use_chainlink {
            match self.chainlink.fetch_eth_usd().await {
                Ok(sig) => {
                    if let Some(change) = sig.price_change_24h {
                        let p = self.price_to_prob(change);
                        weighted_sum += w.price * p;
                        total_weight += w.price;
                        debug!("Chainlink proxy: change={}% -> prob={:.3}", change, p);
                    }
                }
                Err(e) => tracing::warn!("Chainlink fetch failed: {}", e),
            }
        } else if let Some(sym) = binance_symbol {
            if let Ok(sig) = self.binance.fetch_ticker(sym).await {
                if let Some(change) = sig.price_change_24h {
                    let p = self.price_to_prob(change);
                    weighted_sum += w.price * p;
                    total_weight += w.price;
                    debug!("Binance {}: change={}% -> prob={:.3}", sym, change, p);
                }
            }
        }

        let prob = if total_weight > 0.0 {
            (weighted_sum / total_weight).clamp(0.0, 1.0)
        } else {
            0.5
        };

        Ok((prob, phpe_uncertainty))
    }
}
