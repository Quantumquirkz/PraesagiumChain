use sqlx::postgres::{PgConnectOptions, PgPool, PgPoolOptions};
use std::str::FromStr;

/// Rewrites DATABASE_URL so the host is an IPv4 address. Fixes "Network is unreachable"
/// when the system resolves the host to IPv6 and the network has no IPv6 route (e.g. WSL2).
/// Skips rewrite for pooler hosts (pooler.supabase.com) — they are IPv4-friendly and need the hostname for TLS SNI.
pub async fn database_url_force_ipv4(url: &str) -> anyhow::Result<String> {
    let mut parsed = url::Url::parse(url).map_err(|e| anyhow::anyhow!("invalid DATABASE_URL: {}", e))?;
    let host = match parsed.host_str() {
        Some(h) => h,
        None => return Ok(url.to_string()),
    };
    if host.parse::<std::net::Ipv4Addr>().is_ok() {
        return Ok(url.to_string());
    }
    if host.contains("pooler.supabase.com") {
        return Ok(url.to_string());
    }
    let addrs: Vec<std::net::SocketAddr> = tokio::net::lookup_host((host, 5432))
        .await
        .map_err(|e| anyhow::anyhow!("DNS resolution failed for {}: {}", host, e))?
        .collect();
    let ipv4 = addrs
        .into_iter()
        .find(|a| a.is_ipv4())
        .map(|a| a.ip().to_string())
        .ok_or_else(|| {
            anyhow::anyhow!(
                "Host '{}' has no IPv4 (IPv6 only). Use Session pooler: Supabase Dashboard → Connect → Session pooler, copy the URI into DATABASE_URL.",
                host
            )
        })?;
    parsed.set_host(Some(&ipv4)).map_err(|e| anyhow::anyhow!("set_host: {}", e))?;
    Ok(parsed.to_string())
}

#[derive(Clone)]
pub struct Database {
    pool: PgPool,
}

impl Database {
    pub async fn new(url: &str, max_connections: u32) -> anyhow::Result<Self> {
        let url = database_url_force_ipv4(url).await?;
        let options = PgConnectOptions::from_str(&url)?;
        let pool = PgPoolOptions::new()
            .max_connections(max_connections)
            .connect_with(options)
            .await?;
        Ok(Self { pool })
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    pub async fn migrate(&self) -> anyhow::Result<()> {
        sqlx::migrate!().run(&self.pool).await?;
        Ok(())
    }
}
