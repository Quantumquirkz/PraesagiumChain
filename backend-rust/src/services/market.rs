use crate::db::Database;
use crate::error::{AppError, Result};
use crate::models::{
    CreateConditionalMarketRequest, CreateMarketRequest, Market, MarketStats, MarketView,
    PaginatedResponse, Prediction, PredictionView, UpdateStatusRequest,
};
use tracing::{debug, info, warn};

pub struct MarketService {
    db: Database,
}

impl MarketService {
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    pub async fn list(
        &self,
        page: i64,
        limit: i64,
        status: Option<&str>,
    ) -> Result<PaginatedResponse<MarketView>> {
        let offset = (page - 1) * limit;
        debug!("Listing markets: page={}, limit={}, status={:?}", page, limit, status);

        let total: i64 = if let Some(s) = status {
            sqlx::query_scalar("SELECT COUNT(*) FROM markets WHERE status = ?")
                .bind(s)
                .fetch_one(self.db.pool())
                .await?
        } else {
            sqlx::query_scalar("SELECT COUNT(*) FROM markets")
                .fetch_one(self.db.pool())
                .await?
        };

        let rows = if let Some(s) = status {
            sqlx::query_as::<_, Market>(
                "SELECT * FROM markets WHERE status = ? ORDER BY id DESC LIMIT ? OFFSET ?"
            )
            .bind(s)
            .bind(limit)
            .bind(offset)
            .fetch_all(self.db.pool())
            .await?
        } else {
            sqlx::query_as::<_, Market>(
                "SELECT * FROM markets ORDER BY id DESC LIMIT ? OFFSET ?"
            )
            .bind(limit)
            .bind(offset)
            .fetch_all(self.db.pool())
            .await?
        };

        let mut items: Vec<MarketView> = rows.into_iter().map(MarketView::from).collect();

        for item in &mut items {
            if let Ok(Some(pred)) = self.get_latest_prediction(item.id).await {
                item.latest_prediction = Some(pred);
            }
        }

        Ok(PaginatedResponse {
            items,
            total,
            page,
            limit,
        })
    }

    pub async fn get_by_id(&self, id: i64) -> Result<MarketView> {
        debug!("Getting market by id: {}", id);
        let market = sqlx::query_as::<_, Market>(
            "SELECT * FROM markets WHERE id = ?"
        )
        .bind(id)
        .fetch_optional(self.db.pool())
        .await?;

        let mut market_view = market
            .map(MarketView::from)
            .ok_or(AppError::NotFound)?;

        if let Ok(Some(pred)) = self.get_latest_prediction(id).await {
            market_view.latest_prediction = Some(pred);
        }

        Ok(market_view)
    }

    pub async fn create(&self, req: CreateMarketRequest) -> Result<MarketView> {
        let now = chrono::Utc::now().timestamp();
        
        if req.question.trim().is_empty() {
            return Err(AppError::Validation("question cannot be empty".to_string()));
        }
        if req.question.len() > 500 {
            return Err(AppError::Validation("question too long (max 500 chars)".to_string()));
        }
        if req.close_time <= now {
            return Err(AppError::Validation("closeTime must be in the future".to_string()));
        }
        if req.resolve_time <= req.close_time {
            return Err(AppError::Validation("resolveTime must be after closeTime".to_string()));
        }

        info!("Creating market: {}", req.question);

        let id = sqlx::query(
            "INSERT INTO markets (question, close_time, resolve_time, status, created_at, creator, market_type, metadata, details_hash, encrypted_uri)
             VALUES (?, ?, ?, 'Open', ?, ?, ?, ?, ?, ?)"
        )
        .bind(req.question.trim())
        .bind(req.close_time)
        .bind(req.resolve_time)
        .bind(now)
        .bind(req.creator)
        .bind(req.market_type.unwrap_or_else(|| "base".to_string()))
        .bind(req.metadata)
        .bind(req.details_hash)
        .bind(req.encrypted_uri)
        .execute(self.db.pool())
        .await?
        .last_insert_rowid();

        self.get_by_id(id).await
    }

    pub async fn create_from_chain(
        &self,
        market_id: i64,
        question: &str,
        close_time: i64,
        resolve_time: i64,
    ) -> Result<MarketView> {
        info!("Syncing market from chain: id={}", market_id);
        let now = chrono::Utc::now().timestamp();
        sqlx::query(
            "INSERT OR REPLACE INTO markets (id, question, close_time, resolve_time, status, created_at, market_type)
             VALUES (?, ?, ?, ?, 'Open', ?, 'base')"
        )
        .bind(market_id)
        .bind(question.trim())
        .bind(close_time)
        .bind(resolve_time)
        .bind(now)
        .execute(self.db.pool())
        .await?;

        self.get_by_id(market_id).await
    }

    pub async fn create_conditional(&self, req: CreateConditionalMarketRequest) -> Result<MarketView> {
        let now = chrono::Utc::now().timestamp();
        if req.question.trim().is_empty() {
            return Err(AppError::Validation("question cannot be empty".to_string()));
        }
        if req.conditions.is_empty() {
            return Err(AppError::Validation("conditions cannot be empty".to_string()));
        }
        if req.close_time <= now {
            return Err(AppError::Validation("closeTime must be in the future".to_string()));
        }
        if req.resolve_time <= req.close_time {
            return Err(AppError::Validation("resolveTime must be after closeTime".to_string()));
        }

        let id = sqlx::query(
            "INSERT INTO markets (question, close_time, resolve_time, status, created_at, creator, market_type, metadata)
             VALUES (?, ?, ?, 'Open', ?, ?, 'conditional', ?)"
        )
        .bind(req.question.trim())
        .bind(req.close_time)
        .bind(req.resolve_time)
        .bind(now)
        .bind(req.creator.clone())
        .bind(req.metadata.clone())
        .execute(self.db.pool())
        .await?
        .last_insert_rowid();

        for c in req.conditions {
            if c.expected_outcome != "Yes" && c.expected_outcome != "No" {
                return Err(AppError::Validation("expected_outcome must be 'Yes' or 'No'".to_string()));
            }
            sqlx::query(
                "INSERT INTO conditional_conditions (market_id, condition_contract, condition_market_id, expected_outcome)
                 VALUES (?, ?, ?, ?)"
            )
            .bind(id)
            .bind(c.condition_contract)
            .bind(c.condition_market_id)
            .bind(c.expected_outcome)
            .execute(self.db.pool())
            .await?;
        }

        self.get_by_id(id).await
    }

    pub async fn update_status(
        &self,
        id: i64,
        req: UpdateStatusRequest,
    ) -> Result<MarketView> {
        let valid_statuses = ["Open", "Locked", "Resolved", "Cancelled"];
        if !valid_statuses.contains(&req.status.as_str()) {
            return Err(AppError::Validation(format!("Invalid status. Must be one of: {:?}", valid_statuses)));
        }

        if req.status == "Resolved" && req.outcome.is_none() {
            return Err(AppError::Validation("outcome is required when resolving a market".to_string()));
        }

        if let Some(ref outcome) = req.outcome {
            if outcome != "Yes" && outcome != "No" {
                return Err(AppError::Validation("outcome must be 'Yes' or 'No'".to_string()));
            }
        }

        info!("Updating market {} status to {}", id, req.status);

        sqlx::query(
            "UPDATE markets SET status = ?, outcome = ? WHERE id = ?"
        )
        .bind(&req.status)
        .bind(&req.outcome)
        .bind(id)
        .execute(self.db.pool())
        .await?;

        self.get_by_id(id).await
    }

    pub async fn set_prediction(
        &self,
        market_id: i64,
        probability: f32,
        uncertainty: Option<f32>,
        model_version: Option<String>,
        model_hash: Option<String>,
    ) -> Result<MarketView> {
        if probability < 0.0 || probability > 1.0 {
            return Err(AppError::Validation("probability must be between 0 and 1".to_string()));
        }

        if let Some(unc) = uncertainty {
            if unc < 0.0 || unc > 1.0 {
                return Err(AppError::Validation("uncertainty must be between 0 and 1".to_string()));
            }
        }

        debug!("Setting prediction for market {}: probability={}", market_id, probability);

        let timestamp = chrono::Utc::now().timestamp();
        sqlx::query(
            "INSERT INTO predictions (market_id, probability, uncertainty, model_version, model_hash, timestamp) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .bind(market_id)
        .bind(probability)
        .bind(uncertainty)
        .bind(model_version)
        .bind(model_hash)
        .bind(timestamp)
        .execute(self.db.pool())
        .await?;

        self.get_by_id(market_id).await
    }

    pub async fn get_latest_prediction(&self, market_id: i64) -> Result<Option<PredictionView>> {
        let pred = sqlx::query_as::<_, Prediction>(
            "SELECT * FROM predictions WHERE market_id = ? ORDER BY timestamp DESC LIMIT 1"
        )
        .bind(market_id)
        .fetch_optional(self.db.pool())
        .await?;

        Ok(pred.map(PredictionView::from))
    }

    pub async fn get_predictions(&self, market_id: i64, limit: i64) -> Result<Vec<PredictionView>> {
        let preds = sqlx::query_as::<_, Prediction>(
            "SELECT * FROM predictions WHERE market_id = ? ORDER BY timestamp DESC LIMIT ?"
        )
        .bind(market_id)
        .bind(limit)
        .fetch_all(self.db.pool())
        .await?;

        Ok(preds.into_iter().map(PredictionView::from).collect())
    }

    pub async fn get_stats(&self) -> Result<MarketStats> {
        let total_markets: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM markets")
            .fetch_one(self.db.pool())
            .await?;

        let open_markets: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM markets WHERE status = 'Open'")
            .fetch_one(self.db.pool())
            .await?;

        let resolved_markets: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM markets WHERE status = 'Resolved'")
            .fetch_one(self.db.pool())
            .await?;

        let total_predictions: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM predictions")
            .fetch_one(self.db.pool())
            .await?;

        Ok(MarketStats {
            total_markets,
            open_markets,
            resolved_markets,
            total_predictions,
        })
    }
}
