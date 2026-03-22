use serde::Deserialize;

fn default_db_pool_size() -> u32 {
    10
}
fn default_prediction_cache_ttl() -> u64 {
    300
}
fn default_rate_limit_per_second() -> u64 {
    600
}
fn default_rate_limit_burst() -> u32 {
    400
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
    #[serde(default)]
    pub gemini_api_key: Option<String>,
    #[serde(default)]
    pub gemini_model: Option<String>,
    pub finnhub_api_key: Option<String>,
    pub api_football_key: Option<String>,
    /// Comma-separated origins for CORS (e.g. "https://app.example.com,http://localhost:3000"). If unset, allows all.
    pub cors_origins: Option<Vec<String>>,
    /// Rate limit: requests per second per IP (default 600).
    #[serde(default = "default_rate_limit_per_second")]
    pub rate_limit_per_second: u64,
    /// Rate limit: burst size per IP (default 400).
    #[serde(default = "default_rate_limit_burst")]
    pub rate_limit_burst: u32,
    /// Secret key for JWT signing. If unset, a default insecure key is used (dev only).
    pub jwt_secret: Option<String>,
    /// Redis URL for SIWE nonce store (e.g. redis://localhost:6379). If unset, nonces are stored in memory.
    pub redis_url: Option<String>,
    /// ClickHouse URL for analytics events (e.g. http://localhost:8123). If unset, events are not persisted to ClickHouse.
    pub clickhouse_url: Option<String>,
    /// Chainlink ETH/USD price feed address (Sepolia/mainnet).
    pub chainlink_eth_usd_feed: Option<String>,
    /// Chainlink BTC/USD price feed address (Sepolia/mainnet).
    pub chainlink_btc_usd_feed: Option<String>,
    /// Environment: "production" enables strict checks (e.g. JWT_SECRET required). Unset or other = development.
    pub environment: Option<String>,
    /// Secret for `X-Admin-Token` on non-production `DELETE /api/admin/*` routes. Required when calling those endpoints outside production.
    pub admin_api_key: Option<String>,
}

impl Config {
    /// Resolves RPC URL: prefer SEPOLIA_RPC_URL (more reliable) for Sepolia indexer, else RPC_URL.
    /// Falls back to publicnode when rpc.sepolia.org would be used (Cloudflare 522 issues).
    fn resolve_rpc_url() -> Option<String> {
        let sepolia = std::env::var("SEPOLIA_RPC_URL").ok();
        let rpc = std::env::var("RPC_URL").ok();
        let url = sepolia.or(rpc);
        if let Some(ref u) = url {
            if u.contains("rpc.sepolia.org") {
                return Some("https://ethereum-sepolia-rpc.publicnode.com".to_string());
            }
        }
        url
    }

    /// Returns true when ENVIRONMENT=production (enables strict checks).
    pub fn is_production(&self) -> bool {
        self.environment
            .as_deref()
            .map(|e| e.eq_ignore_ascii_case("production"))
            .unwrap_or(false)
    }

    pub fn from_env() -> anyhow::Result<Self> {
        let port = std::env::var("PORT")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(4000);

        let database_url = std::env::var("DATABASE_URL").map_err(|_| {
            anyhow::anyhow!(
                "DATABASE_URL is required. Set it to a PostgreSQL URL (e.g. postgresql://user:pass@localhost:5432/praesagium or port 5433 when using Docker)"
            )
        })?;

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
            rpc_url: Self::resolve_rpc_url(),
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
            api_football_key: std::env::var("API_FOOTBALL_KEY").ok(),
            cors_origins,
            rate_limit_per_second,
            rate_limit_burst,
            jwt_secret: std::env::var("JWT_SECRET").ok(),
            redis_url: std::env::var("REDIS_URL").ok(),
            clickhouse_url: std::env::var("CLICKHOUSE_URL").ok(),
            environment: std::env::var("ENVIRONMENT").ok(),
            chainlink_eth_usd_feed: std::env::var("CHAINLINK_ETH_USD_FEED").ok(),
            chainlink_btc_usd_feed: std::env::var("CHAINLINK_BTC_USD_FEED").ok(),
            admin_api_key: std::env::var("ADMIN_API_KEY").ok(),
        })
    }
}
