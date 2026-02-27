//! Reputation service: compute creator reputation from resolved markets and prediction accuracy.
//! All mutations use atomic UPSERT to prevent race conditions.

use crate::db::Database;
use crate::error::Result;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CreatorReputation {
    pub creator_address: String,
    pub markets_created: i32,
    pub markets_resolved: i32,
    pub correct_predictions: i32,
    pub reputation_score: f64,
    pub updated_at: i64,
}

pub struct ReputationService {
    db: Database,
}

impl ReputationService {
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    /// Returns reputation for a creator (by address). Computes from DB if not stored.
    pub async fn get_reputation(&self, creator_address: &str) -> Result<CreatorReputation> {
        let normalized = creator_address.trim().to_lowercase();
        if normalized.is_empty() {
            return Err(crate::error::AppError::Validation(
                "creator_address cannot be empty".to_string(),
            ));
        }

        if let Some(row) = sqlx::query_as::<_, CreatorReputation>(
            "SELECT creator_address, markets_created, markets_resolved, correct_predictions, reputation_score, updated_at \
             FROM creator_reputation WHERE creator_address = $1",
        )
        .bind(&normalized)
        .fetch_optional(self.db.pool())
        .await?
        {
            return Ok(row);
        }

        self.compute_and_upsert(&normalized).await
    }

    /// Called when a market is created: atomically increments markets_created.
    pub async fn on_market_created(&self, creator_address: &str) -> Result<()> {
        let normalized = creator_address.trim().to_lowercase();
        let now = chrono::Utc::now().timestamp();

        sqlx::query(
            "INSERT INTO creator_reputation \
                (creator_address, markets_created, markets_resolved, correct_predictions, reputation_score, updated_at) \
             VALUES ($1, 1, 0, 0, 0.0, $2) \
             ON CONFLICT (creator_address) DO UPDATE \
             SET markets_created = creator_reputation.markets_created + 1, \
                 updated_at = EXCLUDED.updated_at",
        )
        .bind(&normalized)
        .bind(now)
        .execute(self.db.pool())
        .await?;

        Ok(())
    }

    /// Called when a market is resolved: atomically updates resolved count and accuracy score.
    pub async fn on_market_resolved(
        &self,
        creator_address: &str,
        market_id: i64,
        outcome: &str,
    ) -> Result<CreatorReputation> {
        let normalized = creator_address.trim().to_lowercase();
        let now = chrono::Utc::now().timestamp();

        let last_pred = sqlx::query_scalar::<_, Option<f32>>(
            "SELECT probability FROM predictions WHERE market_id = $1 ORDER BY timestamp DESC LIMIT 1",
        )
        .bind(market_id)
        .fetch_optional(self.db.pool())
        .await?
        .flatten();

        let predicted_yes = last_pred.map(|p| p >= 0.5).unwrap_or(false);
        let actual_yes = outcome.eq_ignore_ascii_case("yes");
        let correct_delta: i32 = if predicted_yes == actual_yes { 1 } else { 0 };

        // Atomic UPSERT: insert or update in a single statement, then recompute score.
        sqlx::query(
            "INSERT INTO creator_reputation \
                (creator_address, markets_created, markets_resolved, correct_predictions, reputation_score, updated_at) \
             VALUES ($1, 0, 1, $2, $3, $4) \
             ON CONFLICT (creator_address) DO UPDATE \
             SET markets_resolved    = creator_reputation.markets_resolved + 1, \
                 correct_predictions = creator_reputation.correct_predictions + $2, \
                 reputation_score    = CASE \
                     WHEN (creator_reputation.markets_resolved + 1) > 0 \
                     THEN (creator_reputation.correct_predictions + $2)::float8 / (creator_reputation.markets_resolved + 1)::float8 \
                     ELSE 0.0 END, \
                 updated_at = $4",
        )
        .bind(&normalized)
        .bind(correct_delta)
        .bind(correct_delta as f64)
        .bind(now)
        .execute(self.db.pool())
        .await?;

        self.get_reputation(creator_address).await
    }

    /// Returns the top creators ordered by reputation_score descending (leaderboard).
    pub async fn list(&self, limit: i64, offset: i64) -> Result<Vec<CreatorReputation>> {
        let rows = sqlx::query_as::<_, CreatorReputation>(
            "SELECT creator_address, markets_created, markets_resolved, correct_predictions, \
             reputation_score, updated_at \
             FROM creator_reputation \
             ORDER BY reputation_score DESC \
             LIMIT $1 OFFSET $2",
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(self.db.pool())
        .await?;
        Ok(rows)
    }

    async fn compute_and_upsert(&self, creator_address: &str) -> Result<CreatorReputation> {
        let created: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM markets WHERE creator = $1")
            .bind(creator_address)
            .fetch_one(self.db.pool())
            .await?;

        let resolved: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM markets WHERE creator = $1 AND status = 'Resolved'",
        )
        .bind(creator_address)
        .fetch_one(self.db.pool())
        .await?;

        let rows = sqlx::query_as::<_, (i64, Option<String>)>(
            "SELECT id, outcome FROM markets WHERE creator = $1 AND status = 'Resolved'",
        )
        .bind(creator_address)
        .fetch_all(self.db.pool())
        .await?;

        let market_ids: Vec<i64> = rows.iter().map(|(id, _)| *id).collect();
        let preds: std::collections::HashMap<i64, f32> = if market_ids.is_empty() {
            std::collections::HashMap::new()
        } else {
            let pred_rows = sqlx::query_as::<_, (i64, f32)>(
                r#"
                SELECT DISTINCT ON (market_id) market_id, probability
                FROM predictions
                WHERE market_id = ANY($1)
                ORDER BY market_id, timestamp DESC
                "#,
            )
            .bind(&market_ids)
            .fetch_all(self.db.pool())
            .await?;
            pred_rows.into_iter().collect()
        };

        let mut correct = 0i64;
        for (market_id, outcome) in &rows {
            if let Some(out) = outcome {
                let pred = preds.get(market_id).copied();
                let predicted_yes = pred.map(|p| p >= 0.5).unwrap_or(false);
                let actual_yes = out.eq_ignore_ascii_case("yes");
                if predicted_yes == actual_yes {
                    correct += 1;
                }
            }
        }

        let score = if resolved > 0 {
            (correct as f64) / (resolved as f64)
        } else {
            0.0
        };

        let now = chrono::Utc::now().timestamp();

        sqlx::query(
            "INSERT INTO creator_reputation \
                (creator_address, markets_created, markets_resolved, correct_predictions, reputation_score, updated_at) \
             VALUES ($1, $2, $3, $4, $5, $6) \
             ON CONFLICT (creator_address) DO UPDATE \
             SET markets_created     = EXCLUDED.markets_created, \
                 markets_resolved    = EXCLUDED.markets_resolved, \
                 correct_predictions = EXCLUDED.correct_predictions, \
                 reputation_score    = EXCLUDED.reputation_score, \
                 updated_at          = EXCLUDED.updated_at",
        )
        .bind(creator_address)
        .bind(created as i32)
        .bind(resolved as i32)
        .bind(correct as i32)
        .bind(score)
        .bind(now)
        .execute(self.db.pool())
        .await?;

        Ok(CreatorReputation {
            creator_address: creator_address.to_string(),
            markets_created: created as i32,
            markets_resolved: resolved as i32,
            correct_predictions: correct as i32,
            reputation_score: score,
            updated_at: now,
        })
    }
}
