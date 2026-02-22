//! Pre-instantiated data sources with shared HTTP client.

use reqwest::Client;

use crate::services::sources::{
    BinanceSource, ChainlinkSource, CryptocompareSource, ExchangeRateSource,
    FinnhubSource, KrakenSource, NewsApiSource,
};

pub struct SourcesRegistry {
    pub binance: BinanceSource,
    pub chainlink: ChainlinkSource,
    pub cryptocompare: CryptocompareSource,
    pub kraken: KrakenSource,
    pub exchangerate: ExchangeRateSource,
    pub finnhub: FinnhubSource,
    pub newsapi: NewsApiSource,
}

impl SourcesRegistry {
    pub fn new(
        client: Client,
        finnhub_api_key: Option<String>,
        newsapi_key: Option<String>,
    ) -> Self {
        Self {
            binance: BinanceSource::with_client(client.clone()),
            chainlink: ChainlinkSource::with_client(client.clone()),
            cryptocompare: CryptocompareSource::with_client(client.clone()),
            kraken: KrakenSource::with_client(client.clone()),
            exchangerate: ExchangeRateSource::with_client(client.clone()),
            finnhub: FinnhubSource::with_client(client.clone(), finnhub_api_key),
            newsapi: NewsApiSource::with_client(client, newsapi_key),
        }
    }
}
