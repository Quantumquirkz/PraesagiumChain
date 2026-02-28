use crate::db::Database;
use crate::error::{AppError, Result};
use crate::models::{
    ConditionalConditionView, CreateConditionalMarketRequest, CreateMarketRequest, Market,
    MarketStats, MarketView, PaginatedResponse, Prediction, PredictionView, UpdateStatusRequest,
};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{debug, info};

const LIST_CACHE_TTL_SECS: u64 = 15;
const MARKET_CACHE_TTL_SECS: u64 = 20;
const STATS_CACHE_TTL_SECS: u64 = 30;

#[derive(Clone)]
struct TimedEntry<T: Clone> {
    value: T,
    expires_at: u64,
}

impl<T: Clone> TimedEntry<T> {
    fn new(value: T, ttl: u64) -> Self {
        let now = chrono::Utc::now().timestamp() as u64;
        Self { value, expires_at: now + ttl }
    }
    fn is_valid(&self) -> bool {
        (chrono::Utc::now().timestamp() as u64) < self.expires_at
    }
}

pub struct MarketService {
    db: Database,
    market_cache: Arc<RwLock<HashMap<i64, TimedEntry<MarketView>>>>,
    list_cache: Arc<RwLock<HashMap<String, TimedEntry<PaginatedResponse<MarketView>>>>>,
    stats_cache: Arc<RwLock<Option<TimedEntry<MarketStats>>>>,
}

impl MarketService {
    pub fn new(db: Database) -> Self {
        Self {
            db,
            market_cache: Arc::new(RwLock::new(HashMap::new())),
            list_cache: Arc::new(RwLock::new(HashMap::new())),
            stats_cache: Arc::new(RwLock::new(None)),
        }
    }

    fn list_cache_key(page: i64, limit: i64, status: Option<&str>) -> String {
        format!("{}:{}:{}", page, limit, status.unwrap_or(""))
    }

    async fn invalidate_list_cache(&self) {
        let mut cache = self.list_cache.write().await;
        cache.clear();
        let mut stats = self.stats_cache.write().await;
        *stats = None;
    }

    pub async fn invalidate_market_cache(&self, id: i64) {
        let mut cache = self.market_cache.write().await;
        cache.remove(&id);
        drop(cache);
        self.invalidate_list_cache().await;
    }

    pub async fn list(
        &self,
        page: i64,
        limit: i64,
        status: Option<&str>,
    ) -> Result<PaginatedResponse<MarketView>> {
        let cache_key = Self::list_cache_key(page, limit, status);

        // Cache read
        {
            let cache = self.list_cache.read().await;
            if let Some(entry) = cache.get(&cache_key) {
                if entry.is_valid() {
                    debug!("List cache hit: {}", cache_key);
                    return Ok(entry.value.clone());
                }
            }
        }

        let offset = (page - 1) * limit;
        debug!("Listing markets: page={}, limit={}, status={:?}", page, limit, status);

        let total: i64 = if let Some(s) = status {
            sqlx::query_scalar("SELECT COUNT(*) FROM markets WHERE status = $1")
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
                "SELECT * FROM markets WHERE status = $1 ORDER BY id DESC LIMIT $2 OFFSET $3"
            )
            .bind(s)
            .bind(limit)
            .bind(offset)
            .fetch_all(self.db.pool())
            .await?
        } else {
            sqlx::query_as::<_, Market>(
                "SELECT * FROM markets ORDER BY id DESC LIMIT $1 OFFSET $2"
            )
            .bind(limit)
            .bind(offset)
            .fetch_all(self.db.pool())
            .await?
        };

        let mut items: Vec<MarketView> = rows.into_iter().map(MarketView::from).collect();

        // Bulk fetch latest predictions (avoids N+1)
        if !items.is_empty() {
            let ids: Vec<i64> = items.iter().map(|m| m.id).collect();
            let preds = self.get_latest_predictions_bulk(&ids).await?;
            for item in &mut items {
                if let Some(pred) = preds.get(&item.id) {
                    item.latest_prediction = Some(pred.clone());
                }
            }
        }

        let result = PaginatedResponse { items, total, page, limit };

        // Cache write
        {
            let mut cache = self.list_cache.write().await;
            cache.insert(cache_key, TimedEntry::new(result.clone(), LIST_CACHE_TTL_SECS));
        }

        Ok(result)
    }

    pub async fn get_by_id(&self, id: i64) -> Result<MarketView> {
        // Cache read
        {
            let cache = self.market_cache.read().await;
            if let Some(entry) = cache.get(&id) {
                if entry.is_valid() {
                    debug!("Market cache hit: {}", id);
                    return Ok(entry.value.clone());
                }
            }
        }

        debug!("Getting market by id: {}", id);
        let market = sqlx::query_as::<_, Market>(
            "SELECT * FROM markets WHERE id = $1"
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

        // Cache write
        {
            let mut cache = self.market_cache.write().await;
            cache.insert(id, TimedEntry::new(market_view.clone(), MARKET_CACHE_TTL_SECS));
        }

        Ok(market_view)
    }

    /// Returns the market that was synced from chain with this on_chain_market_id (for indexer).
    pub async fn get_by_on_chain_market_id(&self, on_chain_market_id: i64) -> Result<MarketView> {
        let market = sqlx::query_as::<_, Market>(
            "SELECT * FROM markets WHERE on_chain_market_id = $1"
        )
        .bind(on_chain_market_id)
        .fetch_optional(self.db.pool())
        .await?;

        let mut market_view = market
            .map(MarketView::from)
            .ok_or(AppError::NotFound)?;

        if let Ok(Some(pred)) = self.get_latest_prediction(market_view.id).await {
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

        let id: i64 = sqlx::query_scalar(
            "INSERT INTO markets (question, close_time, resolve_time, status, created_at, creator, market_type, metadata, details_hash, encrypted_uri, on_chain_market_id)
             VALUES ($1, $2, $3, 'Open', $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT(on_chain_market_id) DO UPDATE SET
               question = excluded.question,
               close_time = excluded.close_time,
               resolve_time = excluded.resolve_time,
               creator = excluded.creator,
               market_type = excluded.market_type,
               metadata = excluded.metadata
             RETURNING id"
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
        .bind(req.on_chain_market_id)
        .fetch_one(self.db.pool())
        .await?;

        self.get_by_id(id).await
    }

    /// Upserts a market from on-chain indexer (by on_chain_market_id).
    pub async fn create_from_chain(
        &self,
        on_chain_market_id: i64,
        question: &str,
        close_time: i64,
        resolve_time: i64,
        creator: Option<String>,
    ) -> Result<MarketView> {
        info!("Syncing market from chain: on_chain_market_id={}", on_chain_market_id);
        let now = chrono::Utc::now().timestamp();
        let creator_str = creator.as_deref();
        let id: i64 = sqlx::query_scalar(
            r#"
            INSERT INTO markets (question, close_time, resolve_time, status, created_at, market_type, on_chain_market_id, creator)
             VALUES (?1, ?2, ?3, 'Open', ?4, 'base', ?5, ?6)
             ON CONFLICT(on_chain_market_id) DO UPDATE SET
               question = excluded.question,
               close_time = excluded.close_time,
               resolve_time = excluded.resolve_time
             RETURNING id
            "#
        )
        .bind(question.trim())
        .bind(close_time)
        .bind(resolve_time)
        .bind(now)
        .bind(on_chain_market_id)
        .bind(creator_str)
        .fetch_one(self.db.pool())
        .await?;

        self.get_by_id(id).await
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

        let id: i64 = sqlx::query_scalar(
            "INSERT INTO markets (question, close_time, resolve_time, status, created_at, creator, market_type, metadata)
             VALUES ($1, $2, $3, 'Open', $4, $5, 'conditional', $6) RETURNING id"
        )
        .bind(req.question.trim())
        .bind(req.close_time)
        .bind(req.resolve_time)
        .bind(now)
        .bind(req.creator.clone())
        .bind(req.metadata.clone())
        .fetch_one(self.db.pool())
        .await?;

        for c in req.conditions {
            if c.expected_outcome != "Yes" && c.expected_outcome != "No" {
                return Err(AppError::Validation("expected_outcome must be 'Yes' or 'No'".to_string()));
            }
            sqlx::query(
                "INSERT INTO conditional_conditions (market_id, condition_contract, condition_market_id, expected_outcome)
                 VALUES ($1, $2, $3, $4)"
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
            "UPDATE markets SET status = $1, outcome = $2 WHERE id = $3"
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
            "INSERT INTO predictions (market_id, probability, uncertainty, model_version, model_hash, timestamp) VALUES ($1, $2, $3, $4, $5, $6)"
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
            "SELECT * FROM predictions WHERE market_id = $1 ORDER BY timestamp DESC LIMIT 1"
        )
        .bind(market_id)
        .fetch_optional(self.db.pool())
        .await?;

        Ok(pred.map(PredictionView::from))
    }

    /// Fetches latest prediction per market (SQLite: correlated subquery per market_id).
    pub async fn get_latest_predictions_bulk(
        &self,
        market_ids: &[i64],
    ) -> Result<std::collections::HashMap<i64, PredictionView>> {
        if market_ids.is_empty() {
            return Ok(std::collections::HashMap::new());
        }
        let mut map = std::collections::HashMap::new();
        for &mid in market_ids {
            let pred = sqlx::query_as::<_, Prediction>(
                "SELECT * FROM predictions WHERE market_id = ?1 ORDER BY timestamp DESC LIMIT 1"
            )
            .bind(mid)
            .fetch_optional(self.db.pool())
            .await?;
            if let Some(p) = pred {
                map.insert(mid, PredictionView::from(p));
            }
        }
        Ok(map)
    }

    pub async fn get_predictions(&self, market_id: i64, limit: i64) -> Result<Vec<PredictionView>> {
        let preds = sqlx::query_as::<_, Prediction>(
            "SELECT * FROM predictions WHERE market_id = $1 ORDER BY timestamp DESC LIMIT $2"
        )
        .bind(market_id)
        .bind(limit)
        .fetch_all(self.db.pool())
        .await?;

        Ok(preds.into_iter().map(PredictionView::from).collect())
    }

    /// Returns all conditions for a conditional market.
    pub async fn get_conditions(&self, market_id: i64) -> Result<Vec<ConditionalConditionView>> {
        // Verify the market exists first.
        let exists: Option<i64> = sqlx::query_scalar("SELECT id FROM markets WHERE id = $1")
            .bind(market_id)
            .fetch_optional(self.db.pool())
            .await?;
        if exists.is_none() {
            return Err(AppError::NotFound);
        }

        let rows = sqlx::query_as::<_, ConditionalConditionView>(
            "SELECT id, condition_contract, condition_market_id, expected_outcome \
             FROM conditional_conditions WHERE market_id = $1 ORDER BY id ASC",
        )
        .bind(market_id)
        .fetch_all(self.db.pool())
        .await?;

        Ok(rows)
    }

    pub async fn get_stats(&self) -> Result<MarketStats> {
        // Cache read
        {
            let cache = self.stats_cache.read().await;
            if let Some(entry) = cache.as_ref() {
                if entry.is_valid() {
                    debug!("Stats cache hit");
                    return Ok(entry.value.clone());
                }
            }
        }

        let total_markets: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM markets")
            .fetch_one(self.db.pool()).await?;
        let open_markets: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM markets WHERE status = 'Open'")
            .fetch_one(self.db.pool()).await?;
        let resolved_markets: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM markets WHERE status = 'Resolved'")
            .fetch_one(self.db.pool()).await?;
        let total_predictions: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM predictions")
            .fetch_one(self.db.pool()).await?;

        let result = MarketStats {
            total_markets,
            open_markets,
            resolved_markets,
            total_predictions,
        };

        // Cache write
        {
            let mut cache = self.stats_cache.write().await;
            *cache = Some(TimedEntry::new(result.clone(), STATS_CACHE_TTL_SECS));
        }

        Ok(result)
    }
}
