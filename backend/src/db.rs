//! Database: PostgreSQL only. Migrations from migrations/postgres/.
//! Redis is used separately (cache, sessions). ClickHouse for analytics (optional).

use sqlx::migrate::Migrator;
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

#[derive(Clone)]
pub struct Database {
    pool: PgPool,
}

impl Database {
    /// Connect to PostgreSQL. DATABASE_URL must be a postgresql:// URL.
    /// Runs migrations from `migrations/postgres/`.
    pub async fn new(url: &str, max_connections: u32) -> anyhow::Result<Self> {
        let url = url.trim();
        if !url.starts_with("postgresql://") && !url.starts_with("postgres://") {
            anyhow::bail!(
                "DATABASE_URL must be a PostgreSQL URL (postgresql://...). Got: {}",
                if url.is_empty() { "(empty)" } else { "non-postgres URL" }
            );
        }

        let pool = PgPoolOptions::new()
            .max_connections(max_connections)
            .connect(url)
            .await?;

        let manifest_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
        let migrations_path = manifest_dir.join("migrations").join("postgres");
        let migrator = Migrator::new(migrations_path.as_path()).await?;
        migrator.run(&pool).await?;

        Ok(Self { pool })
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    /// Migrations are run in `new()`. This method is kept for API compatibility (no-op).
    pub async fn migrate(&self) -> anyhow::Result<()> {
        Ok(())
    }
}
