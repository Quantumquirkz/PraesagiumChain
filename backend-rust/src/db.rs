//! Database: PostgreSQL (primary). Pool type is sqlx Any for compatibility.
//! Migrations: migrations_pg/ for PostgreSQL. Redis is used separately (cache, sessions, etc.).

use sqlx::any::AnyPoolOptions;
use sqlx::migrate::Migrator;
use sqlx::AnyPool;

#[derive(Clone)]
pub struct Database {
    pool: AnyPool,
}

impl Database {
    /// Connect to the database from `url`. Use PostgreSQL in production (e.g. postgresql://...).
    /// Runs migrations from `migrations_pg/`. Redis is configured via REDIS_URL for cache/sessions.
    pub async fn new(url: &str, max_connections: u32) -> anyhow::Result<Self> {
        sqlx::any::install_default_drivers();

        let url = url.trim();
        let is_postgres = url.starts_with("postgresql://") || url.starts_with("postgres://");

        let connect_url = if is_postgres {
            url.to_string()
        } else {
            let url = if url.starts_with("sqlite:") {
                url.to_string()
            } else {
                format!("sqlite:{}", url)
            };
            if url.contains('?') {
                format!("{}&mode=rwc", url)
            } else {
                format!("{}?mode=rwc", url)
            }
        };

        let pool = AnyPoolOptions::new()
            .max_connections(max_connections)
            .connect(&connect_url)
            .await?;

        let manifest_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
        let migrations_path = if is_postgres {
            manifest_dir.join("migrations_pg")
        } else {
            manifest_dir.join("migrations")
        };

        let migrator = Migrator::new(migrations_path.as_path()).await?;
        migrator.run(&pool).await?;

        Ok(Self { pool })
    }

    pub fn pool(&self) -> &AnyPool {
        &self.pool
    }

    /// Migrations are run in `new()`. This method is kept for API compatibility (no-op).
    pub async fn migrate(&self) -> anyhow::Result<()> {
        Ok(())
    }
}
