use sqlx::sqlite::{SqliteConnectOptions, SqlitePool, SqlitePoolOptions};
use std::str::FromStr;

#[derive(Clone)]
pub struct Database {
    pool: SqlitePool,
}

impl Database {
    pub async fn new(url: &str, max_connections: u32) -> anyhow::Result<Self> {
        // Acepta tanto "sqlite:./data.db" como rutas absolutas
        let url = if url.starts_with("sqlite:") {
            url.to_string()
        } else {
            format!("sqlite:{}", url)
        };

        // Añadir ?mode=rwc a la URL para que SQLite cree el archivo si no existe
        let url = if url.contains('?') {
            format!("{}&mode=rwc", url)
        } else {
            format!("{}?mode=rwc", url)
        };

        let options = SqliteConnectOptions::from_str(&url)?
            .create_if_missing(true)
            // WAL mode: lecturas concurrentes sin bloquear escrituras
            .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
            .synchronous(sqlx::sqlite::SqliteSynchronous::Normal);

        let pool = SqlitePoolOptions::new()
            .max_connections(max_connections)
            .connect_with(options)
            .await?;

        Ok(Self { pool })
    }

    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }

    pub async fn migrate(&self) -> anyhow::Result<()> {
        sqlx::migrate!().run(&self.pool).await?;
        Ok(())
    }
}
