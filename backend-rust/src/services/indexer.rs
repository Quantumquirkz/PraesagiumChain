//! Indexador de eventos on-chain usando ethers-rs.
//! Simplified version that can be extended with event-specific logic.

use crate::db::Database;
use crate::error::Result;
use crate::services::MarketService;
use ethers::{
    providers::{Http, Provider},
    types::Address,
};
use std::sync::Arc;
use tracing::{debug, error, info};

pub struct EventIndexer {
    provider: Arc<Provider<Http>>,
    contract_address: Address,
    market_service: Arc<MarketService>,
    last_processed_block: u64,
}

impl EventIndexer {
    pub async fn new(
        rpc_url: &str,
        contract_address: Address,
        market_service: Arc<MarketService>,
        start_block: Option<u64>,
    ) -> anyhow::Result<Self> {
        let provider = Arc::new(Provider::<Http>::try_from(rpc_url)?);

        let last_processed_block = start_block.unwrap_or_else(|| {
            provider
                .get_block_number()
                .now_or_never()
                .and_then(|r| r.ok())
                .map(|n| n.as_u64())
                .unwrap_or(0)
        });

        info!(
            "Event indexer initialized: contract={:?}, start_block={}",
            contract_address, last_processed_block
        );

        Ok(Self {
            provider,
            contract_address,
            market_service,
            last_processed_block,
        })
    }

    pub async fn start(&mut self) -> anyhow::Result<()> {
        info!("Starting event indexer from block {}", self.last_processed_block);

        loop {
            match self.process_events().await {
                Ok(processed) => {
                    if processed > 0 {
                        debug!("Processed up to block {}", self.last_processed_block);
                    }
                }
                Err(e) => {
                    error!("Error processing events: {}", e);
                }
            }

            tokio::time::sleep(tokio::time::Duration::from_secs(12)).await;
        }
    }

    async fn process_events(&mut self) -> Result<usize> {
        let current_block = self
            .provider
            .get_block_number()
            .await?
            .as_u64();

        if current_block <= self.last_processed_block {
            return Ok(0);
        }

        debug!("Scanning blocks {} to {}", self.last_processed_block, current_block);

        let to_block = current_block.min(self.last_processed_block + 1000);
        self.last_processed_block = to_block;
        
        Ok(1)
    }
}
