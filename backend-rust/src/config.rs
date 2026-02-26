use serde::Deserialize;

fn default_db_pool_size() -> u32 {
    10
}
fn default_prediction_cache_ttl() -> u64 {
    300
}
fn default_rate_limit_per_second() -> u64 {
    60
}
fn default_rate_limit_burst() -> u32 {
    30
}

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub port: u16,
    pub database_url: String,
    /// Max connections in the DB pool (default 10).
    #[serde(default = "default_db_pool_size")]
    pub db_pool_size: u32,
    /// TTL in seconds for prediction cache (default 300).
    #[serde(default = "default_prediction_cache_ttl")]
    pub prediction_cache_ttl: u64,
    pub rpc_url: Option<String>,
    pub prediction_market_address: Option<String>,
    pub start_block: Option<u64>,
    pub ai_provider: String,
    pub hf_api_key: Option<String>,
    pub hf_model: Option<String>,
    pub gemini_api_key: Option<String>,
    pub gemini_model: Option<String>,
    pub finnhub_api_key: Option<String>,
    pub newsapi_key: Option<String>,
    pub api_football_key: Option<String>,
    /// Comma-separated origins for CORS (e.g. "https://app.example.com,http://localhost:3000"). If unset, allows all.
    pub cors_origins: Option<Vec<String>>,
    /// Rate limit: requests per second per IP (default 60).
    #[serde(default = "default_rate_limit_per_second")]
    pub rate_limit_per_second: u64,
    /// Rate limit: burst size per IP (default 30).
    #[serde(default = "default_rate_limit_burst")]
    pub rate_limit_burst: u32,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        let port = std::env::var("PORT")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(4000);

        let database_url = std::env::var("DATABASE_URL").map_err(|_| {
            anyhow::anyhow!(
                "DATABASE_URL is not set. Create .env in repo root or backend-rust/ with:\n  DATABASE_URL=postgresql://postgres:PASSWORD@host:5432/postgres"
            )
        })?;
        if database_url.starts_with("postgres://localhost") {
            anyhow::bail!(
                "DATABASE_URL cannot be postgres://localhost (use your Supabase URI in .env)"
            );
        }

        let cors_origins = std::env::var("CORS_ORIGINS").ok().map(|s| {
            s.split(',').map(|x| x.trim().to_string()).filter(|x| !x.is_empty()).collect()
        });

        let db_pool_size = std::env::var("DB_POOL_SIZE")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or_else(default_db_pool_size);
        let prediction_cache_ttl = std::env::var("PREDICTION_CACHE_TTL")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or_else(default_prediction_cache_ttl);
        let rate_limit_per_second = std::env::var("RATE_LIMIT_PER_SECOND")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or_else(default_rate_limit_per_second);
        let rate_limit_burst = std::env::var("RATE_LIMIT_BURST")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or_else(default_rate_limit_burst);

        Ok(Config {
            port,
            database_url,
            db_pool_size,
            prediction_cache_ttl,
            rpc_url: std::env::var("RPC_URL").ok(),
            prediction_market_address: std::env::var("PREDICTION_MARKET_ADDRESS").ok(),
            start_block: std::env::var("START_BLOCK")
                .ok()
                .and_then(|s| s.parse().ok()),
            ai_provider: std::env::var("AI_PROVIDER").unwrap_or_else(|_| "mock".to_string()),
            hf_api_key: std::env::var("HF_API_KEY").ok(),
            hf_model: std::env::var("HF_MODEL").ok(),
            gemini_api_key: std::env::var("GEMINI_API_KEY").ok(),
            gemini_model: std::env::var("GEMINI_MODEL").ok(),
            finnhub_api_key: std::env::var("FINNHUB_API_KEY").ok(),
            newsapi_key: std::env::var("NEWSAPI_KEY").ok(),
            api_football_key: std::env::var("API_FOOTBALL_KEY").ok(),
            cors_origins,
            rate_limit_per_second,
            rate_limit_burst,
        })
    }
}
