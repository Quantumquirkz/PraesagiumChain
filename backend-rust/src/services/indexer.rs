//! On-chain event indexer: MarketCreated, MarketResolved, BetPlaced.
//! Syncs markets from the PredictionMarket contract to the off-chain database.
//!
//! Now exposes real-time metrics via `IndexerState` and publishes events to
//! `EventBus` so SSE subscribers receive on-chain updates immediately.

use crate::error::Result;
use crate::models::UpdateStatusRequest;
use crate::services::event_bus::{EventBus, MarketEvent};
use crate::services::indexer_state::IndexerState;
use crate::services::{MarketService, ReputationService};
use ethers::abi::{decode, ParamType, Token};
use ethers::providers::{Http, Middleware, Provider};
use ethers::types::{Address, Filter, H256, U256, U64};
use std::sync::Arc;
use tracing::{debug, error, info, warn};

fn market_created_topic() -> H256 {
    ethers::utils::keccak256("MarketCreated(uint256,string,uint256,uint256,address)").into()
}

fn market_resolved_topic() -> H256 {
    ethers::utils::keccak256("MarketResolved(uint256,uint8,uint256,uint256)").into()
}

fn bet_placed_topic() -> H256 {
    ethers::utils::keccak256("BetPlaced(uint256,address,uint8,uint256)").into()
}

pub struct EventIndexer {
    provider: Arc<Provider<Http>>,
    contract_address: Address,
    market_service: Arc<MarketService>,
    reputation_service: Arc<ReputationService>,
    last_processed_block: u64,
    /// Shared metrics exposed to /api/metrics.
    state: Arc<IndexerState>,
    /// Event bus for SSE subscribers.
    event_bus: EventBus,
}

impl EventIndexer {
    /// Legacy constructor (no shared state / event bus). Used in tests.
    pub async fn new(
        rpc_url: &str,
        contract_address: Address,
        market_service: Arc<MarketService>,
        reputation_service: Arc<ReputationService>,
        start_block: Option<u64>,
    ) -> anyhow::Result<Self> {
        let dummy_state = IndexerState::new(start_block.unwrap_or(0));
        Self::new_with_state(
            rpc_url,
            contract_address,
            market_service,
            reputation_service,
            start_block,
            dummy_state,
            EventBus::new(),
        )
        .await
    }

    /// Full constructor with shared observability state and event bus.
    pub async fn new_with_state(
        rpc_url: &str,
        contract_address: Address,
        market_service: Arc<MarketService>,
        reputation_service: Arc<ReputationService>,
        start_block: Option<u64>,
        state: Arc<IndexerState>,
        event_bus: EventBus,
    ) -> anyhow::Result<Self> {
        let provider = Arc::new(Provider::<Http>::try_from(rpc_url)?);
        let current: u64 = provider
            .get_block_number()
            .await
            .ok()
            .map(|n: U64| n.as_u64())
            .unwrap_or(0);
        let last_processed_block = start_block.unwrap_or(current);

        state.update_block(last_processed_block);

        info!(
            "Event indexer initialized: contract={:?}, start_block={}",
            contract_address, last_processed_block
        );

        Ok(Self {
            provider,
            contract_address,
            market_service,
            reputation_service,
            last_processed_block,
            state,
            event_bus,
        })
    }

    pub async fn start(&mut self) -> anyhow::Result<()> {
        info!("Starting event indexer from block {}", self.last_processed_block);
        self.state.set_running(true);

        loop {
            match self.process_events().await {
                Ok(processed) => {
                    if processed > 0 {
                        debug!(
                            "Processed {} events up to block {}",
                            processed, self.last_processed_block
                        );
                        self.state.add_events(processed as u64);
                    }
                }
                Err(e) => {
                    error!("Indexer error: {}", e);
                }
            }

            tokio::time::sleep(tokio::time::Duration::from_secs(12)).await;
        }
    }

    async fn process_events(&mut self) -> Result<usize> {
        let current_block: u64 = self
            .provider
            .get_block_number()
            .await
            .map_err(|e| crate::error::AppError::Internal(anyhow::anyhow!("get_block_number: {}", e)))?
            .as_u64();

        if current_block <= self.last_processed_block {
            return Ok(0);
        }

        let from_block = self.last_processed_block + 1;
        // Alchemy Free tier limits eth_getLogs to a 10-block range max.
        let to_block = current_block.min(self.last_processed_block + 9);

        let filter = Filter::new()
            .address(self.contract_address)
            .from_block(from_block)
            .to_block(to_block);

        let logs: Vec<ethers::types::Log> = self.provider.get_logs(&filter).await.map_err(|e| {
            crate::error::AppError::Internal(anyhow::anyhow!("get_logs failed: {}", e))
        })?;

        let mut processed = 0usize;
        for log in logs {
            if log.topics.is_empty() {
                continue;
            }
            let topic0 = log.topics[0];
            if topic0 == market_created_topic() {
                if let Err(e) = self.handle_market_created(&log).await {
                    warn!("Failed to handle MarketCreated: {}", e);
                } else {
                    processed += 1;
                }
            } else if topic0 == market_resolved_topic() {
                if let Err(e) = self.handle_market_resolved(&log).await {
                    warn!("Failed to handle MarketResolved: {}", e);
                } else {
                    processed += 1;
                }
            } else if topic0 == bet_placed_topic() {
                if let Err(e) = self.handle_bet_placed(&log).await {
                    warn!("Failed to handle BetPlaced: {}", e);
                } else {
                    processed += 1;
                }
            }
        }

        self.last_processed_block = to_block;
        self.state.update_block(to_block);
        Ok(processed)
    }

    async fn handle_market_created(&self, log: &ethers::types::Log) -> Result<()> {
        if log.topics.len() < 3 {
            return Err(crate::error::AppError::Validation(
                "MarketCreated log missing topics".to_string(),
            ));
        }
        let market_id_u = U256::from_big_endian(log.topics[1].as_bytes());
        let market_id: i64 = market_id_u.as_u64() as i64;
        let creator = Address::from_slice(&log.topics[2].as_bytes()[12..32]);

        let tokens = decode(
            &[
                ParamType::String,
                ParamType::Uint(256),
                ParamType::Uint(256),
            ],
            log.data.as_ref(),
        )
        .map_err(|e| crate::error::AppError::Validation(format!("decode MarketCreated data: {}", e)))?;

        let question = match &tokens[0] {
            Token::String(s) => s.clone(),
            _ => return Err(crate::error::AppError::Validation("expected string question".to_string())),
        };
        let close_time: i64 = match &tokens[1] {
            Token::Uint(u) => u.as_u64() as i64,
            _ => 0,
        };
        let resolve_time: i64 = match &tokens[2] {
            Token::Uint(u) => u.as_u64() as i64,
            _ => 0,
        };

        let creator_str = format!("{:?}", creator);
        self.market_service
            .create_from_chain(
                market_id,
                &question,
                close_time,
                resolve_time,
                Some(creator_str),
            )
            .await?;
        info!("Indexed MarketCreated: on_chain_market_id={}", market_id);
        Ok(())
    }

    async fn handle_market_resolved(&self, log: &ethers::types::Log) -> Result<()> {
        if log.topics.len() < 2 {
            return Err(crate::error::AppError::Validation(
                "MarketResolved log missing topics".to_string(),
            ));
        }
        let market_id_u = U256::from_big_endian(log.topics[1].as_bytes());
        let on_chain_market_id: i64 = market_id_u.as_u64() as i64;

        let tokens = decode(
            &[
                ParamType::Uint(8),
                ParamType::Uint(256),
                ParamType::Uint(256),
            ],
            log.data.as_ref(),
        )
        .map_err(|e| crate::error::AppError::Validation(format!("decode MarketResolved data: {}", e)))?;

        let outcome_byte: u8 = match &tokens[0] {
            Token::Uint(u) => u.as_u64() as u8,
            _ => 0,
        };
        // Outcome enum: 0 Undecided, 1 Yes, 2 No
        let outcome = match outcome_byte {
            1 => "Yes",
            2 => "No",
            _ => {
                warn!(
                    "MarketResolved event for on_chain_market_id={} has unexpected outcome byte {}; skipping",
                    on_chain_market_id, outcome_byte
                );
                return Ok(());
            }
        };

        let market = self.market_service.get_by_on_chain_market_id(on_chain_market_id).await?;
        self.market_service
            .update_status(
                market.id,
                UpdateStatusRequest {
                    status: "Resolved".to_string(),
                    outcome: Some(outcome.to_string()),
                },
            )
            .await?;
        if let Some(ref creator) = market.creator {
            let _ = self.reputation_service.on_market_resolved(creator, market.id, outcome).await;
        }

        // Publish to event bus for SSE subscribers
        self.event_bus.publish(MarketEvent::OnChainResolved {
            market_id: market.id,
            on_chain_market_id,
            outcome: outcome.to_string(),
        });

        info!(
            "Indexed MarketResolved: on_chain_market_id={}, outcome={}",
            on_chain_market_id, outcome
        );
        Ok(())
    }

    async fn handle_bet_placed(&self, log: &ethers::types::Log) -> Result<()> {
        if log.topics.len() < 2 {
            return Err(crate::error::AppError::Validation(
                "BetPlaced log missing topics".to_string(),
            ));
        }
        let market_id_u = U256::from_big_endian(log.topics[1].as_bytes());
        let on_chain_market_id: i64 = market_id_u.as_u64() as i64;

        let tokens = decode(
            &[ParamType::Uint(8), ParamType::Uint(256)],
            log.data.as_ref(),
        )
        .map_err(|e| crate::error::AppError::Validation(format!("decode BetPlaced data: {}", e)))?;

        let outcome_byte: u8 = match &tokens[0] {
            Token::Uint(u) => u.as_u64() as u8,
            _ => {
                warn!("BetPlaced: invalid outcome byte");
                return Ok(());
            }
        };
        let amount: u64 = match &tokens[1] {
            Token::Uint(u) => u.as_u64(),
            _ => return Err(crate::error::AppError::Validation("BetPlaced: invalid amount".into())),
        };

        let outcome = match outcome_byte {
            1 => "Yes",
            2 => "No",
            _ => {
                warn!(
                    "BetPlaced for on_chain_market_id={} has unexpected outcome byte {}; skipping",
                    on_chain_market_id, outcome_byte
                );
                return Ok(());
            }
        };

        self.market_service
            .update_stakes(on_chain_market_id, outcome, amount)
            .await?;
        info!(
            "Indexed BetPlaced: on_chain_market_id={}, outcome={}, amount={}",
            on_chain_market_id, outcome, amount
        );
        Ok(())
    }
}
