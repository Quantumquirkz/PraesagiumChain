use crate::db::Database;
use crate::error::{AppError, Result};
use crate::services::market_sql::MARKET_SELECT;
use crate::models::{
    ConditionalConditionView, CreateConditionalMarketRequest, CreateMarketRequest, Market,
    MarketRow, MarketStats, MarketView, PaginatedResponse, Prediction, PredictionView,
    UpdateMarketRequest, UpdateStatusRequest,
};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{debug, info};

const LIST_CACHE_TTL_SECS: u64 = 25;
const MARKET_CACHE_TTL_SECS: u64 = 20;
const STATS_CACHE_TTL_SECS: u64 = 45;

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

/// Returns effective status: if DB says "Open" but close_time has passed, treat as "Locked".
fn effective_status(status: &str, close_time: i64) -> String {
    let now = chrono::Utc::now().timestamp();
    if status == "Open" && close_time < now {
        "Locked".to_string()
    } else {
        status.to_string()
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

    /// Deletes all markets and related data (predictions, conditions, resolutions).
    /// Only for development/reset. Caller must ensure this is not exposed in production.
    pub async fn delete_all(&self) -> Result<u64> {
        let pool = self.db.pool();
        sqlx::query("DELETE FROM predictions").execute(pool).await?;
        sqlx::query("DELETE FROM conditional_conditions").execute(pool).await?;
        sqlx::query("DELETE FROM market_resolutions").execute(pool).await?;
        let result = sqlx::query("DELETE FROM markets").execute(pool).await?;
        let n = result.rows_affected();
        self.market_cache.write().await.clear();
        self.invalidate_list_cache().await;
        info!("Deleted all markets ({} rows)", n);
        Ok(n)
    }

    /// Deletes a single market and its related data (predictions, conditions, resolutions).
    /// Returns the number of rows deleted (0 if market did not exist). For admin/dev use.
    pub async fn delete_by_id(&self, id: i64) -> Result<u64> {
        let pool = self.db.pool();
        sqlx::query("DELETE FROM predictions WHERE market_id = $1")
            .bind(id)
            .execute(pool)
            .await?;
        sqlx::query("DELETE FROM conditional_conditions WHERE market_id = $1")
            .bind(id)
            .execute(pool)
            .await?;
        sqlx::query("DELETE FROM market_resolutions WHERE market_id = $1")
            .bind(id)
            .execute(pool)
            .await?;
        let result = sqlx::query("DELETE FROM markets WHERE id = $1")
            .bind(id)
            .execute(pool)
            .await?;
        let n = result.rows_affected();
        if n > 0 {
            self.invalidate_market_cache(id).await;
            info!("Deleted market id={}", id);
        }
        Ok(n)
    }

    /// Updates total_yes_stake or total_no_stake when BetPlaced is indexed.
    /// `outcome` must be "Yes" or "No"; `amount` is in wei.
    /// Returns Ok even if no row was updated (market may not exist yet if BetPlaced precedes MarketCreated in the same block).
    pub async fn update_stakes(
        &self,
        on_chain_market_id: i64,
        outcome: &str,
        amount: u64,
    ) -> Result<()> {
        let amount_i64 = amount.min(i64::MAX as u64) as i64;
        let result: sqlx::postgres::PgQueryResult = if outcome.eq_ignore_ascii_case("yes") {
            sqlx::query(
                "UPDATE markets SET total_yes_stake = total_yes_stake + $1 WHERE on_chain_market_id = $2",
            )
            .bind(amount_i64)
            .bind(on_chain_market_id)
            .execute(self.db.pool())
            .await?
        } else if outcome.eq_ignore_ascii_case("no") {
            sqlx::query(
                "UPDATE markets SET total_no_stake = total_no_stake + $1 WHERE on_chain_market_id = $2",
            )
            .bind(amount_i64)
            .bind(on_chain_market_id)
            .execute(self.db.pool())
            .await?
        } else {
            return Err(AppError::Validation(format!(
                "update_stakes: outcome must be 'Yes' or 'No', got '{}'",
                outcome
            )));
        };
        if result.rows_affected() > 0 {
            if let Ok(market) = self.get_by_on_chain_market_id(on_chain_market_id).await {
                self.invalidate_market_cache(market.id).await;
            }
        }
        Ok(())
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

        let rows: Vec<Market> = if let Some(s) = status {
            sqlx::query_as::<_, MarketRow>(&format!(
                "{} FROM markets WHERE status = $1 ORDER BY id DESC LIMIT $2 OFFSET $3",
                MARKET_SELECT
            ))
            .bind(s)
            .bind(limit)
            .bind(offset)
            .fetch_all(self.db.pool())
            .await?
            .into_iter()
            .map(Market::from)
            .collect()
        } else {
            sqlx::query_as::<_, MarketRow>(&format!(
                "{} FROM markets ORDER BY id DESC LIMIT $1 OFFSET $2",
                MARKET_SELECT
            ))
            .bind(limit)
            .bind(offset)
            .fetch_all(self.db.pool())
            .await?
            .into_iter()
            .map(Market::from)
            .collect()
        };

        let mut items: Vec<MarketView> = rows.into_iter().map(MarketView::from).collect();

        // Apply effective status: Open -> Locked when close_time has passed
        let now = chrono::Utc::now().timestamp();
        for item in &mut items {
            if item.status == "Open" && item.close_time < now {
                item.status = "Locked".to_string();
            }
        }

        // Bulk fetch latest predictions (avoids N+1). On failure, markets are shown without prediction.
        if !items.is_empty() {
            let ids: Vec<i64> = items.iter().map(|m| m.id).collect();
            match self.get_latest_predictions_bulk(&ids).await {
                Ok(preds) => {
                    for item in &mut items {
                        if let Some(pred) = preds.get(&item.id) {
                            item.latest_prediction = Some(pred.clone());
                        }
                    }
                }
                Err(e) => {
                    tracing::warn!("get_latest_predictions_bulk failed (list still returned): {}", e);
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
        let market: Option<Market> = sqlx::query_as::<_, MarketRow>(&format!(
            "{} FROM markets WHERE id = $1",
            MARKET_SELECT
        ))
        .bind(id)
        .fetch_optional(self.db.pool())
        .await?
        .map(Market::from);

        let mut market_view = market
            .map(MarketView::from)
            .ok_or(AppError::NotFound)?;

        if let Ok(Some(pred)) = self.get_latest_prediction(id).await {
            market_view.latest_prediction = Some(pred);
        }

        // Effective status: Open -> Locked when close_time has passed
        market_view.status = effective_status(&market_view.status, market_view.close_time);

        // Cache write
        {
            let mut cache = self.market_cache.write().await;
            cache.insert(id, TimedEntry::new(market_view.clone(), MARKET_CACHE_TTL_SECS));
        }

        Ok(market_view)
    }

    /// Returns the market that was synced from chain with this on_chain_market_id (for indexer).
    pub async fn get_by_on_chain_market_id(&self, on_chain_market_id: i64) -> Result<MarketView> {
        let market: Option<Market> = sqlx::query_as::<_, MarketRow>(&format!(
            "{} FROM markets WHERE on_chain_market_id = $1",
            MARKET_SELECT
        ))
        .bind(on_chain_market_id)
        .fetch_optional(self.db.pool())
        .await?
        .map(Market::from);

        let mut market_view = market
            .map(MarketView::from)
            .ok_or(AppError::NotFound)?;

        if let Ok(Some(pred)) = self.get_latest_prediction(market_view.id).await {
            market_view.latest_prediction = Some(pred);
        }

        // Effective status: Open -> Locked when close_time has passed
        market_view.status = effective_status(&market_view.status, market_view.close_time);

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
        if req.metadata.as_ref().map(|m| m.len()).unwrap_or(0) > 10_000 {
            return Err(AppError::Validation("metadata too long (max 10000 chars)".to_string()));
        }
        if req.creator.as_ref().map(|c| c.len()).unwrap_or(0) > 100 {
            return Err(AppError::Validation("creator too long (max 100 chars)".to_string()));
        }
        if req.resolve_time <= req.close_time {
            return Err(AppError::Validation("resolveTime must be after closeTime".to_string()));
        }
        // When on_chain_market_id is present, we are syncing a market already confirmed on-chain.
        // Do not require close_time > now: the tx may have taken time to confirm (Sepolia).
        if req.on_chain_market_id.is_none() && req.close_time <= now {
            return Err(AppError::Validation("closeTime must be in the future".to_string()));
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

        match self.get_by_id(id).await {
            Ok(m) => Ok(m),
            Err(AppError::NotFound) if req.on_chain_market_id.is_some() => {
                self.get_by_on_chain_market_id(req.on_chain_market_id.unwrap()).await
            }
            other => other,
        }
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
             VALUES ($1, $2, $3, 'Open', $4, 'base', $5, $6)
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

    /// Updates market display data (question, metadata). On-chain data is immutable.
    pub async fn update(&self, id: i64, req: UpdateMarketRequest) -> Result<MarketView> {
        if req.question.is_none() && req.metadata.is_none() {
            return Err(AppError::Validation(
                "at least one of question or metadata must be provided".into(),
            ));
        }
        if let Some(ref q) = req.question {
            let q = q.trim();
            if q.is_empty() {
                return Err(AppError::Validation("question cannot be empty".into()));
            }
            if q.len() > 500 {
                return Err(AppError::Validation("question too long (max 500 chars)".into()));
            }
        }
        if let Some(ref m) = req.metadata {
            if m.len() > 10_000 {
                return Err(AppError::Validation("metadata too long (max 10000 chars)".into()));
            }
        }

        if let Some(ref q) = req.question {
            sqlx::query("UPDATE markets SET question = $1 WHERE id = $2")
                .bind(q.trim())
                .bind(id)
                .execute(self.db.pool())
                .await?;
        }
        if let Some(ref m) = req.metadata {
            sqlx::query("UPDATE markets SET metadata = $1 WHERE id = $2")
                .bind(m)
                .bind(id)
                .execute(self.db.pool())
                .await?;
        }
        self.invalidate_market_cache(id).await;
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
        if !(0.0..=1.0).contains(&probability) {
            return Err(AppError::Validation("probability must be between 0 and 1".to_string()));
        }

        if let Some(unc) = uncertainty {
            if !(0.0..=1.0).contains(&unc) {
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
        let pred: Option<Prediction> = sqlx::query_as::<_, Prediction>(
            "SELECT * FROM predictions WHERE market_id = $1 ORDER BY timestamp DESC LIMIT 1"
        )
        .bind(market_id)
        .fetch_optional(self.db.pool())
        .await?;

        Ok(pred.map(PredictionView::from))
    }

    /// Fetches latest prediction per market in a single query (avoids N+1).
    pub async fn get_latest_predictions_bulk(
        &self,
        market_ids: &[i64],
    ) -> Result<std::collections::HashMap<i64, PredictionView>> {
        if market_ids.is_empty() {
            return Ok(std::collections::HashMap::new());
        }
        let placeholders: Vec<String> = (1..=market_ids.len()).map(|i| format!("${}", i)).collect();
        let in_list = placeholders.join(", ");
        let sql = format!(
            "SELECT p.id, p.market_id, p.probability, p.uncertainty, p.model_version, p.model_hash, p.timestamp \
             FROM predictions p \
             INNER JOIN ( \
               SELECT market_id, MAX(timestamp) AS max_ts \
               FROM predictions \
               WHERE market_id IN ({}) \
               GROUP BY market_id \
             ) latest ON p.market_id = latest.market_id AND p.timestamp = latest.max_ts",
            in_list
        );
        let mut q = sqlx::query_as::<_, Prediction>(&sql);
        for mid in market_ids {
            q = q.bind(mid);
        }
        let rows: Vec<Prediction> = q.fetch_all(self.db.pool()).await?;
        let map = rows
            .into_iter()
            .map(|p| (p.market_id, PredictionView::from(p)))
            .collect();
        Ok(map)
    }

    pub async fn get_predictions(&self, market_id: i64, limit: i64) -> Result<Vec<PredictionView>> {
        let preds: Vec<Prediction> = sqlx::query_as::<_, Prediction>(
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
