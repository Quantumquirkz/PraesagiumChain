//! Reputation service: compute creator reputation from resolved markets and prediction accuracy.

use crate::db::Database;
use crate::error::Result;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tracing::debug;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CreatorReputation {
    pub creator_address: String,
    pub markets_created: i64,
    pub markets_resolved: i64,
    pub correct_predictions: i64,
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
            "SELECT creator_address, markets_created, markets_resolved, correct_predictions, reputation_score, updated_at FROM creator_reputation WHERE creator_address = ?"
        )
        .bind(&normalized)
        .fetch_optional(self.db.pool())
        .await?
        {
            return Ok(row);
        }

        self.compute_and_upsert(&normalized).await
    }

    /// Called when a market is resolved: update creator stats and accuracy.
    pub async fn on_market_resolved(
        &self,
        creator_address: &str,
        market_id: i64,
        outcome: &str,
    ) -> Result<CreatorReputation> {
        let normalized = creator_address.trim().to_lowercase();
        let now = chrono::Utc::now().timestamp();

        let last_pred = sqlx::query_scalar::<_, Option<f32>>(
            "SELECT probability FROM predictions WHERE market_id = ? ORDER BY timestamp DESC LIMIT 1"
        )
        .bind(market_id)
        .fetch_optional(self.db.pool())
        .await?
        .flatten();

        let predicted_yes = last_pred.map(|p| p >= 0.5).unwrap_or(false);
        let actual_yes = outcome.eq_ignore_ascii_case("yes");
        let correct = predicted_yes == actual_yes;

        let existing = sqlx::query_as::<_, CreatorReputation>(
            "SELECT creator_address, markets_created, markets_resolved, correct_predictions, reputation_score, updated_at FROM creator_reputation WHERE creator_address = ?"
        )
        .bind(&normalized)
        .fetch_optional(self.db.pool())
        .await?;

        if let Some(cre) = existing {
            let new_resolved = cre.markets_resolved + 1;
            let new_correct = cre.correct_predictions + if correct { 1 } else { 0 };
            let score = if new_resolved > 0 { (new_correct as f64) / (new_resolved as f64) } else { 0.0 };
            sqlx::query(
                "UPDATE creator_reputation SET markets_resolved = ?, correct_predictions = ?, reputation_score = ?, updated_at = ? WHERE creator_address = ?"
            )
            .bind(new_resolved)
            .bind(new_correct)
            .bind(score)
            .bind(now)
            .bind(&normalized)
            .execute(self.db.pool())
            .await?;
        } else {
            sqlx::query(
                "INSERT INTO creator_reputation (creator_address, markets_created, markets_resolved, correct_predictions, reputation_score, updated_at) VALUES (?, 0, 1, ?, ?, ?)"
            )
            .bind(&normalized)
            .bind(if correct { 1i64 } else { 0i64 })
            .bind(if correct { 1.0 } else { 0.0 })
            .bind(now)
            .execute(self.db.pool())
            .await?;
        }

        self.get_reputation(creator_address).await
    }

    /// Called when a market is created: increment markets_created for creator.
    pub async fn on_market_created(&self, creator_address: &str) -> Result<()> {
        let normalized = creator_address.trim().to_lowercase();
        let now = chrono::Utc::now().timestamp();

        let existing = sqlx::query_scalar::<_, Option<i64>>(
            "SELECT markets_created FROM creator_reputation WHERE creator_address = ?"
        )
        .bind(&normalized)
        .fetch_optional(self.db.pool())
        .await?
        .flatten();

        if let Some(created) = existing {
            sqlx::query(
                "UPDATE creator_reputation SET markets_created = ?, updated_at = ? WHERE creator_address = ?"
            )
            .bind(created + 1)
            .bind(now)
            .bind(&normalized)
            .execute(self.db.pool())
            .await?;
        } else {
            sqlx::query(
                "INSERT INTO creator_reputation (creator_address, markets_created, markets_resolved, correct_predictions, reputation_score, updated_at) VALUES (?, 1, 0, 0, 0, ?)"
            )
            .bind(&normalized)
            .bind(now)
            .execute(self.db.pool())
            .await?;
        }

        Ok(())
    }

    async fn compute_and_upsert(&self, creator_address: &str) -> Result<CreatorReputation> {
        let created: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM markets WHERE creator = ?"
        )
        .bind(creator_address)
        .fetch_one(self.db.pool())
        .await?;

        let resolved: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM markets WHERE creator = ? AND status = 'Resolved'"
        )
        .bind(creator_address)
        .fetch_one(self.db.pool())
        .await?;

        let mut correct = 0i64;
        let rows = sqlx::query_as::<_, (i64, Option<String>)>(
            "SELECT id, outcome FROM markets WHERE creator = ? AND status = 'Resolved'"
        )
        .bind(creator_address)
        .fetch_all(self.db.pool())
        .await?;

        for (market_id, outcome) in rows {
            if let Some(out) = outcome {
                let pred: Option<f32> = sqlx::query_scalar(
                    "SELECT probability FROM predictions WHERE market_id = ? ORDER BY timestamp DESC LIMIT 1"
                )
                .bind(market_id)
                .fetch_optional(self.db.pool())
                .await?
                .flatten();
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
        let existing = sqlx::query_scalar::<_, Option<i64>>(
            "SELECT 1 FROM creator_reputation WHERE creator_address = ?"
        )
        .bind(creator_address)
        .fetch_optional(self.db.pool())
        .await?;

        if existing.is_some() {
            sqlx::query(
                "UPDATE creator_reputation SET markets_created = ?, markets_resolved = ?, correct_predictions = ?, reputation_score = ?, updated_at = ? WHERE creator_address = ?"
            )
            .bind(created)
            .bind(resolved)
            .bind(correct)
            .bind(score)
            .bind(now)
            .bind(creator_address)
            .execute(self.db.pool())
            .await?;
        } else {
            sqlx::query(
                "INSERT INTO creator_reputation (creator_address, markets_created, markets_resolved, correct_predictions, reputation_score, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
            )
            .bind(creator_address)
            .bind(created)
            .bind(resolved)
            .bind(correct)
            .bind(score)
            .bind(now)
            .execute(self.db.pool())
            .await?;
        }

        self.get_reputation(creator_address).await
    }

    async fn recompute_score(&self, creator_address: &str) -> Result<CreatorReputation> {
        let row = sqlx::query_as::<_, (i64, i64)>(
            "SELECT markets_resolved, correct_predictions FROM creator_reputation WHERE creator_address = ?"
        )
        .bind(creator_address)
        .fetch_optional(self.db.pool())
        .await?;

        if let Some((resolved, correct)) = row {
            let score = if resolved > 0 {
                (correct as f64) / (resolved as f64)
            } else {
                0.0
            };
            let now = chrono::Utc::now().timestamp();
            sqlx::query(
                "UPDATE creator_reputation SET reputation_score = ?, updated_at = ? WHERE creator_address = ?"
            )
            .bind(score)
            .bind(now)
            .bind(creator_address)
            .execute(self.db.pool())
            .await?;
        }

        self.get_reputation(creator_address).await
    }
}
