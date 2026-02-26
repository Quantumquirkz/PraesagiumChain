//! Report-step endpoints: external data sources that return outcome 0 or 1 for CRE resolution.

use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::error::{AppError, Result};
use crate::state::AppState;

const OPEN_METEO_ARCHIVE: &str = "https://archive-api.open-meteo.com/v1/archive";
const BINANCE_PRICE: &str = "https://api.binance.com/api/v3/ticker/price";
const COINGECKO_PRICE: &str = "https://api.coingecko.com/api/v3/simple/price";

#[derive(Debug, Deserialize)]
pub struct WeatherRainedQuery {
    pub lat: f64,
    pub lon: f64,
    pub date: String, // YYYY-MM-DD
}

#[derive(Debug, Serialize)]
pub struct OutcomeResponse {
    pub outcome: u8, // 0 = No, 1 = Yes
}

/// GET /api/weather/rained?lat=9&lon=-79.5&date=2026-02-20
/// Calls Open-Meteo Archive API; outcome = 1 if precipitation_sum > 0, else 0.
pub async fn weather_rained(
    State(state): State<Arc<AppState>>,
    Query(q): Query<WeatherRainedQuery>,
) -> Result<impl IntoResponse> {
    let url = format!(
        "{}?latitude={}&longitude={}&start_date={}&end_date={}&daily=precipitation_sum",
        OPEN_METEO_ARCHIVE, q.lat, q.lon, q.date, q.date
    );
    let resp = state
        .http_client
        .get(&url)
        .send()
        .await
        .map_err(|e| AppError::ExternalApi(format!("Open-Meteo request failed: {e}")))?;
    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(AppError::ExternalApi(format!(
            "Open-Meteo API error ({status}): {body}"
        )));
    }
    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| AppError::ExternalApi(format!("Open-Meteo parse failed: {e}")))?;
    let daily = json
        .get("daily")
        .and_then(|d| d.get("precipitation_sum"))
        .and_then(|a| a.as_array())
        .ok_or_else(|| AppError::Validation("Open-Meteo: missing daily.precipitation_sum".into()))?;
    let sum = daily.first().and_then(|v| v.as_f64()).unwrap_or(0.0);
    let outcome = if sum > 0.0 { 1 } else { 0 };
    Ok((StatusCode::OK, Json(OutcomeResponse { outcome })))
}

#[derive(Debug, Deserialize)]
pub struct PriceAboveQuery {
    /// e.g. bitcoin, ethereum (CoinGecko) or BTCUSDT, ETHUSDT (Binance)
    pub symbol: String,
    /// Threshold to compare against (e.g. 50000 for "BTC > 50000")
    pub threshold: f64,
    /// Optional: "binance" or "coingecko" (default: binance for *USDT, else coingecko)
    pub source: Option<String>,
}

#[derive(Debug, Deserialize)]
struct BinancePriceResponse {
    price: String,
}

/// GET /api/price/above?symbol=BTCUSDT&threshold=50000
/// or ?symbol=bitcoin&threshold=50000&source=coingecko
/// outcome = 1 if price >= threshold, else 0.
pub async fn price_above(
    State(state): State<Arc<AppState>>,
    Query(q): Query<PriceAboveQuery>,
) -> Result<impl IntoResponse> {
    let use_binance = q.source.as_deref() == Some("binance")
        || (q.symbol.len() >= 4 && q.symbol.ends_with("USDT"));
    let price = if use_binance {
        let sym = if q.symbol.contains("USDT") {
            q.symbol.to_uppercase()
        } else {
            format!("{}USDT", q.symbol.to_uppercase())
        };
        let url = format!("{}?symbol={}", BINANCE_PRICE, sym);
        let resp = state.http_client.get(&url).send().await.map_err(|e| {
            AppError::ExternalApi(format!("Binance price request failed: {e}"))
        })?;
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(AppError::ExternalApi(format!(
                "Binance error ({status}): {body}"
            )));
        }
        let data: BinancePriceResponse = resp.json().await.map_err(|e| {
            AppError::ExternalApi(format!("Binance parse failed: {e}"))
        })?;
        data.price.parse::<f64>().map_err(|_| {
            AppError::Validation("Binance: invalid price".into())
        })?
    } else {
        let id = q.symbol.to_lowercase();
        let url = format!("{}?ids={}&vs_currencies=usd", COINGECKO_PRICE, id);
        let resp = state.http_client.get(&url).send().await.map_err(|e| {
            AppError::ExternalApi(format!("CoinGecko request failed: {e}"))
        })?;
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(AppError::ExternalApi(format!(
                "CoinGecko error ({status}): {body}"
            )));
        }
        let data: std::collections::HashMap<String, std::collections::HashMap<String, f64>> =
            resp.json().await.map_err(|e| {
                AppError::ExternalApi(format!("CoinGecko parse failed: {e}"))
            })?;
        let inner = data.get(&id).ok_or_else(|| {
            AppError::Validation(format!("CoinGecko: unknown id '{id}'"))
        })?;
        *inner.get("usd").ok_or_else(|| {
            AppError::Validation("CoinGecko: missing usd".into())
        })?
    };
    let outcome = if price >= q.threshold { 1 } else { 0 };
    Ok((StatusCode::OK, Json(OutcomeResponse { outcome })))
}

#[derive(Debug, Deserialize)]
pub struct SportsWinnerQuery {
    /// Fixture ID (e.g. API-Football fixture id).
    pub fixture_id: Option<String>,
    /// Team name or id that must be the winner for outcome=1.
    pub winner_team: String,
    /// For demo without API key: force outcome 0 or 1 (optional).
    pub demo_outcome: Option<u8>,
}

/// GET /api/sports/winner?winner_team=TeamA&demo_outcome=1
/// With API_FOOTBALL_KEY set and fixture_id: calls API-Football and returns real outcome.
/// Without key: use demo_outcome for testing (0 or 1), or returns 400 with instructions.
pub async fn sports_winner(
    State(state): State<Arc<AppState>>,
    Query(q): Query<SportsWinnerQuery>,
) -> Result<impl IntoResponse> {
    if let Some(outcome) = q.demo_outcome {
        if outcome <= 1 {
            return Ok((StatusCode::OK, Json(OutcomeResponse { outcome })));
        }
    }
    // Use Config instead of std::env::var for proper DI
    let api_key = state.config.api_football_key.clone();
    if let (Some(key), Some(fixture_id)) = (api_key, &q.fixture_id) {
        let url = format!(
            "https://v3.football.api-sports.io/fixtures?id={}",
            fixture_id
        );
        let resp = state
            .http_client
            .get(&url)
            .header("x-apisports-key", key)
            .send()
            .await
            .map_err(|e| AppError::ExternalApi(format!("API-Football request failed: {e}")))?;
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(AppError::ExternalApi(format!(
                "API-Football error ({status}): {body}"
            )));
        }
        let json: serde_json::Value = resp.json().await.map_err(|e| {
            AppError::ExternalApi(format!("API-Football parse failed: {e}"))
        })?;
        let fixture = json
            .get("response")
            .and_then(|r| r.get(0))
            .ok_or_else(|| AppError::Validation("API-Football: no fixture in response".into()))?;
        let goals = fixture.get("goals");
        let home_goals = goals.and_then(|g| g.get("home")).and_then(|v| v.as_u64()).unwrap_or(0);
        let away_goals = goals.and_then(|g| g.get("away")).and_then(|v| v.as_u64()).unwrap_or(0);
        let teams = fixture.get("teams");
        let home_name = teams.and_then(|t| t.get("home")).and_then(|h| h.get("name")).and_then(|n| n.as_str()).unwrap_or("");
        let away_name = teams.and_then(|t| t.get("away")).and_then(|a| a.get("name")).and_then(|n| n.as_str()).unwrap_or("");
        let winner_name = match home_goals.cmp(&away_goals) {
            std::cmp::Ordering::Greater => home_name,
            std::cmp::Ordering::Less => away_name,
            std::cmp::Ordering::Equal => "",
        };
        let outcome = if winner_name.eq_ignore_ascii_case(q.winner_team.trim()) {
            1
        } else {
            0
        };
        return Ok((StatusCode::OK, Json(OutcomeResponse { outcome })));
    }
    Err(AppError::Validation(
        "Sports winner requires API_FOOTBALL_KEY and fixture_id, or use demo_outcome=0|1 for testing".into(),
    ))
}
