//! Open-Meteo and Google Maps link resolution for CRE weather steps.

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

use super::types::OutcomeResponse;

const OPEN_METEO_ARCHIVE: &str = "https://archive-api.open-meteo.com/v1/archive";
const OPEN_METEO_FORECAST: &str = "https://api.open-meteo.com/v1/forecast";

#[derive(Debug, Deserialize)]
pub struct WeatherRainedQuery {
    pub lat: f64,
    pub lon: f64,
    pub date: String, // YYYY-MM-DD
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
pub struct WeatherCurrentQuery {
    pub lat: f64,
    pub lon: f64,
}

#[derive(Debug, Serialize)]
pub struct WeatherCurrentResponse {
    pub temp: f64,
    pub precipitation: f64,
    pub humidity: f64,
    pub cloud_cover: u8,
    pub timestamp: String,
}

/// GET /api/weather/current?lat=9&lon=-79.5
/// Returns current weather for a location (Open-Meteo forecast). Used for real-time weather chart.
pub async fn weather_current(
    State(state): State<Arc<AppState>>,
    Query(q): Query<WeatherCurrentQuery>,
) -> Result<impl IntoResponse> {
    let url = format!(
        "{}?latitude={}&longitude={}&current=temperature_2m,precipitation,relative_humidity_2m,cloud_cover",
        OPEN_METEO_FORECAST, q.lat, q.lon
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
    let current = json
        .get("current")
        .ok_or_else(|| AppError::Validation("Open-Meteo: missing current".into()))?;
    let temp = current
        .get("temperature_2m")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);
    let precipitation = current
        .get("precipitation")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);
    let humidity = current
        .get("relative_humidity_2m")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);
    let cloud_cover = current
        .get("cloud_cover")
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as u8;
    let timestamp = current
        .get("time")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    Ok((
        StatusCode::OK,
        Json(WeatherCurrentResponse {
            temp,
            precipitation,
            humidity,
            cloud_cover,
            timestamp,
        }),
    ))
}

#[derive(Debug, Deserialize)]
pub struct ResolveLocationQuery {
    pub url: String,
}

#[derive(Debug, Serialize)]
pub struct ResolveLocationResponse {
    pub lat: f64,
    pub lon: f64,
}

fn parse_lat_lon_from_url(s: &str) -> Option<(f64, f64)> {
    // @lat,lon,zoom
    if let Some(at_pos) = s.find('@') {
        let rest = &s[at_pos + 1..];
        let mut it = rest.split(',');
        if let (Some(a), Some(b)) = (it.next(), it.next()) {
            if let (Ok(lat), Ok(lon)) = (a.trim().parse::<f64>(), b.trim().parse::<f64>()) {
                return Some((lat, lon));
            }
        }
    }
    // ?q=lat,lon or &q=lat,lon
    if let Some(q_pos) = s.find("q=") {
        let rest = &s[q_pos + 2..];
        let end = rest.find('&').unwrap_or(rest.len());
        let pair = &rest[..end];
        let mut it = pair.split(',');
        if let (Some(a), Some(b)) = (it.next(), it.next()) {
            if let (Ok(lat), Ok(lon)) = (a.trim().parse::<f64>(), b.trim().parse::<f64>()) {
                return Some((lat, lon));
            }
        }
    }
    // ll=lat,lon
    if let Some(ll_pos) = s.find("ll=") {
        let rest = &s[ll_pos + 3..];
        let end = rest.find('&').unwrap_or(rest.len());
        let pair = &rest[..end];
        let mut it = pair.split(',');
        if let (Some(a), Some(b)) = (it.next(), it.next()) {
            if let (Ok(lat), Ok(lon)) = (a.trim().parse::<f64>(), b.trim().parse::<f64>()) {
                return Some((lat, lon));
            }
        }
    }
    None
}

/// GET /api/weather/resolve-location?url=https://maps.app.goo.gl/xxx
/// Resolves short Google Maps links (maps.app.goo.gl, goo.gl) by following redirects and returns lat/lon from the final URL.
pub async fn weather_resolve_location(
    State(state): State<Arc<AppState>>,
    Query(q): Query<ResolveLocationQuery>,
) -> Result<impl IntoResponse> {
    let url = q.url.trim();
    if url.is_empty() {
        return Err(AppError::Validation("url is required".into()));
    }
    let allowed = url.starts_with("https://maps.app.goo.gl/")
        || url.starts_with("https://goo.gl/maps/")
        || url.starts_with("http://maps.app.goo.gl/")
        || url.starts_with("https://www.google.com/maps")
        || url.starts_with("https://maps.google.com/");
    if !allowed {
        return Err(AppError::Validation(
            "URL must be a Google Maps link (maps.app.goo.gl, goo.gl/maps, or google.com/maps)".into(),
        ));
    }
    let resp = state
        .http_client
        .get(url)
        .send()
        .await
        .map_err(|e| AppError::ExternalApi(format!("Failed to resolve link: {e}")))?;
    let final_url = resp.url().as_str();
    let (lat, lon) = parse_lat_lon_from_url(final_url)
        .ok_or_else(|| AppError::Validation("Could not extract coordinates from the Maps link".into()))?;
    Ok((
        StatusCode::OK,
        Json(ResolveLocationResponse { lat, lon }),
    ))
}

#[derive(Debug, Deserialize)]
pub struct WeatherHistoryForecastQuery {
    pub lat: f64,
    pub lon: f64,
    /// Optional resolution date YYYY-MM-DD; forecast extends until this date or today+14.
    pub resolution_date: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct WeatherHistoryForecastResponse {
    pub daily: WeatherDailySeries,
}

#[derive(Debug, Serialize)]
pub struct WeatherDailySeries {
    pub time: Vec<String>,
    pub temperature_2m_max: Vec<f64>,
    pub temperature_2m_min: Vec<f64>,
    pub precipitation_sum: Vec<f64>,
    pub relative_humidity_2m_max: Vec<f64>,
    pub wind_speed_10m_max: Vec<f64>,
}

/// GET /api/weather/history-forecast?lat=9&lon=-79.5&resolution_date=2026-03-09
/// Returns combined historical (archive) + forecast daily data for chart: real data until yesterday, forecast from today.
pub async fn weather_history_forecast(
    State(state): State<Arc<AppState>>,
    Query(q): Query<WeatherHistoryForecastQuery>,
) -> Result<impl IntoResponse> {
    use chrono::Utc;

    let now = Utc::now();
    let today = now.format("%Y-%m-%d").to_string();
    let yesterday = (now - chrono::Duration::days(1)).format("%Y-%m-%d").to_string();
    let start_hist = (now - chrono::Duration::days(14)).format("%Y-%m-%d").to_string();

    let end_forecast = q.resolution_date.clone().unwrap_or_else(|| {
        (now + chrono::Duration::days(14)).format("%Y-%m-%d").to_string()
    });

    let archive_url = format!(
        "{}?latitude={}&longitude={}&start_date={}&end_date={}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_max,wind_speed_10m_max",
        OPEN_METEO_ARCHIVE, q.lat, q.lon, start_hist, yesterday
    );
    // Forecast API returns ~16 days from today; no start/end params.
    let forecast_url = format!(
        "{}?latitude={}&longitude={}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_max,wind_speed_10m_max",
        OPEN_METEO_FORECAST, q.lat, q.lon
    );

    let (archive_resp, forecast_resp) = tokio::join!(
        state.http_client.get(&archive_url).send(),
        state.http_client.get(&forecast_url).send(),
    );

    let mut time: Vec<String> = Vec::new();
    let mut temperature_2m_max: Vec<f64> = Vec::new();
    let mut temperature_2m_min: Vec<f64> = Vec::new();
    let mut precipitation_sum: Vec<f64> = Vec::new();
    let mut relative_humidity_2m_max: Vec<f64> = Vec::new();
    let mut wind_speed_10m_max: Vec<f64> = Vec::new();

    if let Ok(resp) = archive_resp {
        if resp.status().is_success() {
            if let Ok(json) = resp.json::<serde_json::Value>().await {
                if let (Some(t), Some(max_a), Some(min_a), Some(prec_a)) = (
                    json.get("daily").and_then(|d| d.get("time")).and_then(|a| a.as_array()),
                    json.get("daily").and_then(|d| d.get("temperature_2m_max")).and_then(|a| a.as_array()),
                    json.get("daily").and_then(|d| d.get("temperature_2m_min")).and_then(|a| a.as_array()),
                    json.get("daily").and_then(|d| d.get("precipitation_sum")).and_then(|a| a.as_array()),
                ) {
                    let hum_a = json.get("daily").and_then(|d| d.get("relative_humidity_2m_max")).and_then(|a| a.as_array());
                    let wind_a = json.get("daily").and_then(|d| d.get("wind_speed_10m_max")).and_then(|a| a.as_array());
                    for i in 0..t.len() {
                        if let Some(s) = t.get(i).and_then(|v| v.as_str()) {
                            time.push(s.to_string());
                            temperature_2m_max.push(max_a.get(i).and_then(|v| v.as_f64()).unwrap_or(0.0));
                            temperature_2m_min.push(min_a.get(i).and_then(|v| v.as_f64()).unwrap_or(0.0));
                            precipitation_sum.push(prec_a.get(i).and_then(|v| v.as_f64()).unwrap_or(0.0));
                            relative_humidity_2m_max.push(hum_a.and_then(|a| a.get(i).and_then(|v| v.as_f64())).unwrap_or(0.0));
                            wind_speed_10m_max.push(wind_a.and_then(|a| a.get(i).and_then(|v| v.as_f64())).unwrap_or(0.0));
                        }
                    }
                }
            }
        }
    }

    if let Ok(resp) = forecast_resp {
        if resp.status().is_success() {
            if let Ok(json) = resp.json::<serde_json::Value>().await {
                if let (Some(t), Some(max_a), Some(min_a), Some(prec_a)) = (
                    json.get("daily").and_then(|d| d.get("time")).and_then(|a| a.as_array()),
                    json.get("daily").and_then(|d| d.get("temperature_2m_max")).and_then(|a| a.as_array()),
                    json.get("daily").and_then(|d| d.get("temperature_2m_min")).and_then(|a| a.as_array()),
                    json.get("daily").and_then(|d| d.get("precipitation_sum")).and_then(|a| a.as_array()),
                ) {
                    let hum_a = json.get("daily").and_then(|d| d.get("relative_humidity_2m_max")).and_then(|a| a.as_array());
                    let wind_a = json.get("daily").and_then(|d| d.get("wind_speed_10m_max")).and_then(|a| a.as_array());
                    for i in 0..t.len() {
                        if let Some(s) = t.get(i).and_then(|v| v.as_str()) {
                            if s < today.as_str() {
                                continue;
                            }
                            if s > end_forecast.as_str() {
                                break;
                            }
                            time.push(s.to_string());
                            temperature_2m_max.push(max_a.get(i).and_then(|v| v.as_f64()).unwrap_or(0.0));
                            temperature_2m_min.push(min_a.get(i).and_then(|v| v.as_f64()).unwrap_or(0.0));
                            precipitation_sum.push(prec_a.get(i).and_then(|v| v.as_f64()).unwrap_or(0.0));
                            relative_humidity_2m_max.push(hum_a.and_then(|a| a.get(i).and_then(|v| v.as_f64())).unwrap_or(0.0));
                            wind_speed_10m_max.push(wind_a.and_then(|a| a.get(i).and_then(|v| v.as_f64())).unwrap_or(0.0));
                        }
                    }
                }
            }
        }
    }

    Ok((
        StatusCode::OK,
        Json(WeatherHistoryForecastResponse {
            daily: WeatherDailySeries {
                time,
                temperature_2m_max,
                temperature_2m_min,
                precipitation_sum,
                relative_humidity_2m_max,
                wind_speed_10m_max,
            },
        }),
    ))
}
