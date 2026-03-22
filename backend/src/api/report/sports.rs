//! Sports outcome helper for CRE (API-Football).

use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use std::sync::Arc;

use crate::error::{AppError, Result};
use crate::state::AppState;

use super::types::OutcomeResponse;

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
