//! Universal resolution endpoint for CRE workflows.
//!
//! POST /api/resolve/evaluate
//!   Accepts a market_id, resolution_type, and type-specific params.
//!   Calls the appropriate oracle (price feed, weather, sports, AI sentiment, or hybrid PHPE).
//!   Persists the result to `market_resolutions` for a full audit trail.
//!   Returns outcome (0/1), confidence, source, and raw_value.
//!
//! GET /api/markets/:id/resolutions
//!   Returns the full resolution history for a market.

use axum::{
    extract::{Path, State},
    Json,
};
use serde::Deserialize;
use std::sync::Arc;
use tracing::info;

use crate::error::{AppError, Result};
use crate::models::{MarketResolution, ResolveRequest, ResolveResponse};
use crate::state::AppState;

const OPEN_METEO_ARCHIVE: &str = "https://archive-api.open-meteo.com/v1/archive";
const BINANCE_PRICE: &str = "https://api.binance.com/api/v3/ticker/price";
const COINGECKO_PRICE: &str = "https://api.coingecko.com/api/v3/simple/price";

// ─── POST /api/resolve/evaluate ─────────────────────────────────────────────

/// Universal oracle resolution handler.
///
/// Dispatches to the correct oracle based on `resolution_type`, computes
/// outcome + confidence, persists the result, and returns it.
pub async fn evaluate(
    State(state): State<Arc<AppState>>,
    Json(req): Json<ResolveRequest>,
) -> Result<Json<ResolveResponse>> {
    let resolved_at = chrono::Utc::now().timestamp();

    let response = match req.resolution_type.as_str() {
        "price_above" => resolve_price_above(&state, &req, resolved_at).await?,
        "weather_rained" => resolve_weather_rained(&state, &req, resolved_at).await?,
        "sports_winner" => resolve_sports_winner(&state, &req, resolved_at).await?,
        "ai_sentiment" => resolve_ai_sentiment(&state, &req, resolved_at).await?,
        "hybrid" => resolve_hybrid(&state, &req, resolved_at).await?,
        other => {
            return Err(AppError::Validation(format!(
                "Unknown resolution_type '{}'. Valid: price_above, weather_rained, sports_winner, ai_sentiment, hybrid",
                other
            )))
        }
    };

    // Persist to audit trail
    persist_resolution(&state, &response).await?;

    info!(
        market_id = response.market_id,
        resolution_type = %response.resolution_type,
        outcome = response.outcome,
        confidence = response.confidence,
        source = %response.source,
        "Resolution evaluated"
    );

    Ok(Json(response))
}

// ─── GET /api/markets/:id/resolutions ───────────────────────────────────────

pub async fn list_resolutions(
    State(state): State<Arc<AppState>>,
    Path(market_id): Path<i64>,
) -> Result<Json<Vec<MarketResolution>>> {
    let rows: Vec<MarketResolution> = sqlx::query_as::<_, MarketResolution>(
        "SELECT id, market_id, resolution_type, outcome, confidence, source, raw_value, resolved_at \
         FROM market_resolutions WHERE market_id = $1 ORDER BY resolved_at DESC LIMIT 100",
    )
    .bind(market_id)
    .fetch_all(state.db.pool())
    .await
    .map_err(|e| AppError::Internal(anyhow::anyhow!("list_resolutions: {}", e)))?;

    Ok(Json(rows))
}

// ─── Resolution helpers ──────────────────────────────────────────────────────

#[derive(Deserialize)]
struct PriceAboveParams {
    symbol: String,
    threshold: f64,
    #[serde(default)]
    source: Option<String>,
}

async fn resolve_price_above(
    state: &AppState,
    req: &ResolveRequest,
    resolved_at: i64,
) -> Result<ResolveResponse> {
    let p: PriceAboveParams = serde_json::from_value(req.params.clone())
        .map_err(|e| AppError::Validation(format!("price_above params: {e}")))?;

    let use_binance = p.source.as_deref() == Some("binance")
        || p.symbol.to_uppercase().ends_with("USDT");

    let (price, source_name) = if use_binance {
        let sym = if p.symbol.to_uppercase().ends_with("USDT") {
            p.symbol.to_uppercase()
        } else {
            format!("{}USDT", p.symbol.to_uppercase())
        };
        let url = format!("{}?symbol={}", BINANCE_PRICE, sym);
        let resp = state
            .http_client
            .get(&url)
            .send()
            .await
            .map_err(|e| AppError::ExternalApi(format!("Binance: {e}")))?;
        if !resp.status().is_success() {
            return Err(AppError::ExternalApi(format!(
                "Binance HTTP {}",
                resp.status()
            )));
        }
        #[derive(Deserialize)]
        struct BinanceResp {
            price: String,
        }
        let data: BinanceResp = resp
            .json()
            .await
            .map_err(|e| AppError::ExternalApi(format!("Binance parse: {e}")))?;
        let price = data
            .price
            .parse::<f64>()
            .map_err(|_| AppError::Validation("Binance: invalid price".into()))?;
        (price, "binance".to_string())
    } else {
        let id = p.symbol.to_lowercase();
        let url = format!("{}?ids={}&vs_currencies=usd", COINGECKO_PRICE, id);
        let resp = state
            .http_client
            .get(&url)
            .send()
            .await
            .map_err(|e| AppError::ExternalApi(format!("CoinGecko: {e}")))?;
        if !resp.status().is_success() {
            return Err(AppError::ExternalApi(format!(
                "CoinGecko HTTP {}",
                resp.status()
            )));
        }
        let data: std::collections::HashMap<
            String,
            std::collections::HashMap<String, f64>,
        > = resp
            .json()
            .await
            .map_err(|e| AppError::ExternalApi(format!("CoinGecko parse: {e}")))?;
        let price = data
            .get(&id)
            .and_then(|m| m.get("usd"))
            .copied()
            .ok_or_else(|| AppError::Validation(format!("CoinGecko: unknown id '{id}'")))?;
        (price, "coingecko".to_string())
    };

    let outcome = if price >= p.threshold { 1 } else { 0 };
    // Confidence: how far (normalised) from the threshold. Capped at 1.
    let distance = ((price - p.threshold).abs() / p.threshold.max(1.0)) as f32;
    let confidence = (distance * 10.0).min(1.0);

    Ok(ResolveResponse {
        market_id: req.market_id,
        resolution_type: "price_above".to_string(),
        outcome,
        confidence,
        source: source_name,
        raw_value: Some(price),
        resolved_at,
    })
}

#[derive(Deserialize)]
struct WeatherRainedParams {
    lat: f64,
    lon: f64,
    date: String,
}

async fn resolve_weather_rained(
    state: &AppState,
    req: &ResolveRequest,
    resolved_at: i64,
) -> Result<ResolveResponse> {
    let p: WeatherRainedParams = serde_json::from_value(req.params.clone())
        .map_err(|e| AppError::Validation(format!("weather_rained params: {e}")))?;

    let url = format!(
        "{}?latitude={}&longitude={}&start_date={}&end_date={}&daily=precipitation_sum",
        OPEN_METEO_ARCHIVE, p.lat, p.lon, p.date, p.date
    );
    let resp = state
        .http_client
        .get(&url)
        .send()
        .await
        .map_err(|e| AppError::ExternalApi(format!("Open-Meteo: {e}")))?;
    if !resp.status().is_success() {
        return Err(AppError::ExternalApi(format!(
            "Open-Meteo HTTP {}",
            resp.status()
        )));
    }
    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| AppError::ExternalApi(format!("Open-Meteo parse: {e}")))?;
    let sum = json
        .get("daily")
        .and_then(|d| d.get("precipitation_sum"))
        .and_then(|a| a.as_array())
        .and_then(|a| a.first())
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);

    let outcome = if sum > 0.0 { 1 } else { 0 };
    // Confidence: more rain → more confident it rained. Cap at 50 mm.
    let confidence = ((sum / 50.0) as f32).min(1.0);

    Ok(ResolveResponse {
        market_id: req.market_id,
        resolution_type: "weather_rained".to_string(),
        outcome,
        confidence,
        source: "open-meteo".to_string(),
        raw_value: Some(sum),
        resolved_at,
    })
}

#[derive(Deserialize)]
struct SportsWinnerParams {
    fixture_id: Option<String>,
    winner_team: String,
    demo_outcome: Option<u8>,
}

async fn resolve_sports_winner(
    state: &AppState,
    req: &ResolveRequest,
    resolved_at: i64,
) -> Result<ResolveResponse> {
    let p: SportsWinnerParams = serde_json::from_value(req.params.clone())
        .map_err(|e| AppError::Validation(format!("sports_winner params: {e}")))?;

    if let Some(demo) = p.demo_outcome {
        return Ok(ResolveResponse {
            market_id: req.market_id,
            resolution_type: "sports_winner".to_string(),
            outcome: demo.min(1),
            confidence: 1.0,
            source: "demo".to_string(),
            raw_value: None,
            resolved_at,
        });
    }

    let api_key = state.config.api_football_key.clone();
    if let (Some(key), Some(fixture_id)) = (api_key, &p.fixture_id) {
        let url = format!("https://v3.football.api-sports.io/fixtures?id={}", fixture_id);
        let resp = state
            .http_client
            .get(&url)
            .header("x-apisports-key", key)
            .send()
            .await
            .map_err(|e| AppError::ExternalApi(format!("API-Football: {e}")))?;
        if !resp.status().is_success() {
            return Err(AppError::ExternalApi(format!(
                "API-Football HTTP {}",
                resp.status()
            )));
        }
        let json: serde_json::Value = resp
            .json()
            .await
            .map_err(|e| AppError::ExternalApi(format!("API-Football parse: {e}")))?;
        let fixture = json
            .get("response")
            .and_then(|r| r.get(0))
            .ok_or_else(|| AppError::Validation("API-Football: no fixture".into()))?;
        let goals = fixture.get("goals");
        let home_goals = goals
            .and_then(|g| g.get("home"))
            .and_then(|v| v.as_u64())
            .unwrap_or(0);
        let away_goals = goals
            .and_then(|g| g.get("away"))
            .and_then(|v| v.as_u64())
            .unwrap_or(0);
        let teams = fixture.get("teams");
        let home_name = teams
            .and_then(|t| t.get("home"))
            .and_then(|h| h.get("name"))
            .and_then(|n| n.as_str())
            .unwrap_or("");
        let away_name = teams
            .and_then(|t| t.get("away"))
            .and_then(|a| a.get("name"))
            .and_then(|n| n.as_str())
            .unwrap_or("");
        let winner_name = match home_goals.cmp(&away_goals) {
            std::cmp::Ordering::Greater => home_name,
            std::cmp::Ordering::Less => away_name,
            std::cmp::Ordering::Equal => "",
        };
        let outcome = if winner_name.eq_ignore_ascii_case(p.winner_team.trim()) {
            1
        } else {
            0
        };
        let goal_diff = (home_goals as i64 - away_goals as i64).unsigned_abs();
        let confidence = ((goal_diff as f32) / 5.0).min(1.0);
        return Ok(ResolveResponse {
            market_id: req.market_id,
            resolution_type: "sports_winner".to_string(),
            outcome,
            confidence,
            source: "api-football".to_string(),
            raw_value: Some(goal_diff as f64),
            resolved_at,
        });
    }

    Err(AppError::Validation(
        "sports_winner requires API_FOOTBALL_KEY + fixture_id, or demo_outcome".into(),
    ))
}

#[derive(Deserialize)]
struct AiSentimentParams {
    text: String,
    /// Probability threshold above which outcome = 1 (default 0.5)
    threshold: Option<f32>,
}

async fn resolve_ai_sentiment(
    state: &AppState,
    req: &ResolveRequest,
    resolved_at: i64,
) -> Result<ResolveResponse> {
    let p: AiSentimentParams = serde_json::from_value(req.params.clone())
        .map_err(|e| AppError::Validation(format!("ai_sentiment params: {e}")))?;

    let threshold = p.threshold.unwrap_or(0.5).clamp(0.0, 1.0);
    let (_score, prob) = state
        .ai_service
        .sentiment(&p.text)
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("AI sentiment: {}", e)))?;

    let prob = prob.clamp(0.0, 1.0);
    let outcome = if prob >= threshold { 1 } else { 0 };
    let confidence = ((prob - threshold).abs() / threshold.max(1.0 - threshold)).min(1.0);

    Ok(ResolveResponse {
        market_id: req.market_id,
        resolution_type: "ai_sentiment".to_string(),
        outcome,
        confidence,
        source: "ai-provider".to_string(),
        raw_value: Some(prob as f64),
        resolved_at,
    })
}

#[derive(Deserialize)]
struct HybridParams {
    sentiment_text: Option<String>,
    binance_symbol: Option<String>,
    threshold: Option<f32>,
}

async fn resolve_hybrid(
    state: &AppState,
    req: &ResolveRequest,
    resolved_at: i64,
) -> Result<ResolveResponse> {
    let p: HybridParams = serde_json::from_value(req.params.clone())
        .map_err(|e| AppError::Validation(format!("hybrid params: {e}")))?;

    let threshold = p.threshold.unwrap_or(0.5).clamp(0.0, 1.0);

    let (prob, _uncertainty) = state
        .hybrid_predictor
        .predict_hybrid(
            None,
            p.sentiment_text.as_deref(),
            None,
            p.binance_symbol.as_deref(),
            false,
        )
        .await?;

    let outcome = if prob >= threshold { 1 } else { 0 };
    let confidence = ((prob - threshold).abs() * 2.0).min(1.0);

    Ok(ResolveResponse {
        market_id: req.market_id,
        resolution_type: "hybrid".to_string(),
        outcome,
        confidence,
        source: "phpe-hybrid".to_string(),
        raw_value: Some(prob as f64),
        resolved_at,
    })
}

// ─── Persistence ─────────────────────────────────────────────────────────────

async fn persist_resolution(state: &AppState, r: &ResolveResponse) -> Result<()> {
    let _: sqlx::postgres::PgQueryResult = sqlx::query(
        "INSERT INTO market_resolutions \
         (market_id, resolution_type, outcome, confidence, source, raw_value, resolved_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7)",
    )
    .bind(r.market_id)
    .bind(&r.resolution_type)
    .bind(r.outcome as i16)
    .bind(r.confidence as f64)
    .bind(&r.source)
    .bind(r.raw_value)
    .bind(r.resolved_at)
    .execute(state.db.pool())
    .await
    .map_err(|e| AppError::Internal(anyhow::anyhow!("persist_resolution: {}", e)))?;
    Ok(())
}
