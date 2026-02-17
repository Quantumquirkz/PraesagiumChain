use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub port: u16,
    pub database_url: String,
    pub rpc_url: Option<String>,
    pub prediction_market_address: Option<String>,
    pub start_block: Option<u64>,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        let port = std::env::var("PORT")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(4000);

        let database_url = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "sqlite:./data/markets.db".to_string());

        Ok(Config {
            port,
            database_url,
            rpc_url: std::env::var("RPC_URL").ok(),
            prediction_market_address: std::env::var("PREDICTION_MARKET_ADDRESS").ok(),
            start_block: std::env::var("START_BLOCK")
                .ok()
                .and_then(|s| s.parse().ok()),
        })
    }
}
