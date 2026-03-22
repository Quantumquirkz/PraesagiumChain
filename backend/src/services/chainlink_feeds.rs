//! Chainlink Data Feeds service.
//! Reads prices from Chainlink AggregatorV3 contracts via RPC.
//! Uses in-memory cache with 30s TTL to reduce RPC load.

use crate::error::Result;
use ethers::abi::{decode, ParamType, Token};
use ethers::providers::{Http, Middleware, Provider};
use ethers::types::{Address, Bytes, TransactionRequest};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::debug;

const CACHE_TTL_SECS: u64 = 30;

/// latestRoundData() selector: 0xfeaf968c
const LATEST_ROUND_DATA_SELECTOR: [u8; 4] = [0xfe, 0xaf, 0x96, 0x8c];

#[derive(Clone, Debug)]
struct CachedPrice {
    price: i64,
    updated_at: u64,
}

/// Chainlink Data Feeds service: fetches prices from AggregatorV3 contracts.
pub struct ChainlinkFeedsService {
    provider: Arc<Provider<Http>>,
    feeds: HashMap<String, Address>,
    cache: Arc<RwLock<HashMap<String, CachedPrice>>>,
}

impl ChainlinkFeedsService {
    pub fn new(rpc_url: &str, feeds: HashMap<String, Address>) -> Result<Self> {
        let provider = Provider::<Http>::try_from(rpc_url)
            .map_err(|e| crate::error::AppError::ExternalApi(format!("RPC provider: {}", e)))?;
        Ok(Self {
            provider: Arc::new(provider),
            feeds,
            cache: Arc::new(RwLock::new(HashMap::new())),
        })
    }

    /// Creates service from config. Returns None if RPC or feeds not configured.
    pub fn from_config(
        rpc_url: Option<&str>,
        eth_usd: Option<&str>,
        btc_usd: Option<&str>,
    ) -> Result<Option<Self>> {
        let rpc = rpc_url.filter(|s| !s.is_empty());
        let rpc = match rpc {
            Some(r) => r,
            None => return Ok(None),
        };

        let mut feeds = HashMap::new();
        if let Some(addr) = eth_usd.filter(|s| !s.is_empty()) {
            if let Ok(a) = addr.parse() {
                feeds.insert("ETH_USD".to_string(), a);
            }
        }
        if let Some(addr) = btc_usd.filter(|s| !s.is_empty()) {
            if let Ok(a) = addr.parse() {
                feeds.insert("BTC_USD".to_string(), a);
            }
        }

        if feeds.is_empty() {
            return Ok(None);
        }

        Ok(Some(Self::new(rpc, feeds)?))
    }

    /// Fetches latest price from the given feed (e.g. ETH_USD, BTC_USD).
    /// Uses cache with 30s TTL.
    pub async fn get_price(&self, feed: &str) -> Result<FeedPriceResponse> {
        let feed_upper = feed.to_uppercase().replace('-', "_");
        let address = self.feeds.get(&feed_upper).ok_or_else(|| {
            crate::error::AppError::Validation(format!(
                "Unknown feed: {}. Valid: {:?}",
                feed,
                self.feed_names()
            ))
        })?;

        let now = chrono::Utc::now().timestamp() as u64;
        {
            let cache = self.cache.read().await;
            if let Some(c) = cache.get(&feed_upper) {
                if now < c.updated_at + CACHE_TTL_SECS {
                    debug!("Chainlink cache hit for {}", feed_upper);
                    return Ok(FeedPriceResponse {
                        feed: feed_upper,
                        price: c.price,
                        updated_at: c.updated_at,
                    });
                }
            }
        }

        let (price, updated_at) = self.fetch_latest_round_data(*address).await?;

        {
            let mut cache = self.cache.write().await;
            cache.insert(
                feed_upper.clone(),
                CachedPrice { price, updated_at },
            );
        }

        Ok(FeedPriceResponse {
            feed: feed_upper,
            price,
            updated_at,
        })
    }

    pub fn feed_names(&self) -> Vec<String> {
        self.feeds.keys().cloned().collect()
    }

    async fn fetch_latest_round_data(&self, address: Address) -> Result<(i64, u64)> {
        let calldata = Bytes::from(LATEST_ROUND_DATA_SELECTOR.to_vec());
        let tx: ethers::types::TransactionRequest = TransactionRequest::default()
            .to(address)
            .data(calldata);
        let typed_tx: ethers::types::transaction::eip2718::TypedTransaction = tx.into();
        let result: Bytes = self
            .provider
            .call(&typed_tx, None)
            .await
            .map_err(|e| crate::error::AppError::ExternalApi(format!("RPC call: {}", e)))?;

        let tokens = decode(
            &[
                ParamType::Uint(80),
                ParamType::Int(256),
                ParamType::Uint(256),
                ParamType::Uint(256),
                ParamType::Uint(80),
            ],
            result.as_ref(),
        )
        .map_err(|e| crate::error::AppError::ExternalApi(format!("Decode: {}", e)))?;

        let answer = tokens
            .get(1)
            .and_then(|t| {
                if let Token::Int(v) = t {
                    let s = v.to_string();
                    s.parse::<i64>().ok()
                } else {
                    None
                }
            })
            .ok_or_else(|| crate::error::AppError::Validation("Invalid answer".into()))?;

        let updated_at = tokens
            .get(3)
            .and_then(|t| {
                if let Token::Uint(v) = t {
                    Some(v.as_u64())
                } else {
                    None
                }
            })
            .unwrap_or(0);

        Ok((answer, updated_at))
    }
}

#[derive(Debug, serde::Serialize)]
pub struct FeedPriceResponse {
    pub feed: String,
    /// Price with feed decimals (e.g. 8 for BTC/USD, 8 for ETH/USD).
    pub price: i64,
    pub updated_at: u64,
}
