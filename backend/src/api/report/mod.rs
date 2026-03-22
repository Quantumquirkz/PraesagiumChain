//! Report-step endpoints: external data sources that return outcome 0 or 1 for CRE resolution.

mod crypto;
mod price;
mod sports;
mod types;
mod weather;

pub use crypto::crypto_news_sentiment;
pub use price::price_above;
pub use sports::sports_winner;
pub use weather::{
    weather_current, weather_history_forecast, weather_rained, weather_resolve_location,
};
