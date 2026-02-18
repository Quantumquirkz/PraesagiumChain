use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub port: u16,
    pub database_url: String,
    pub rpc_url: Option<String>,
    pub prediction_market_address: Option<String>,
    pub start_block: Option<u64>,
    pub ai_provider: String,
    pub hf_api_key: Option<String>,
    pub hf_model: Option<String>,
    pub gemini_api_key: Option<String>,
    pub gemini_model: Option<String>,
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
            ai_provider: std::env::var("AI_PROVIDER").unwrap_or_else(|_| "mock".to_string()),
            hf_api_key: std::env::var("HF_API_KEY").ok(),
            hf_model: std::env::var("HF_MODEL").ok(),
            gemini_api_key: std::env::var("GEMINI_API_KEY").ok(),
            gemini_model: std::env::var("GEMINI_MODEL").ok(),
        })
    }
}
