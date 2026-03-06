mod api;
mod config;
mod constants;
mod db;
mod error;
mod middleware;
mod models;
mod router;
mod services;
mod startup;
mod state;

#[cfg(test)]
mod tests;

use std::net::SocketAddr;
use tracing::info;

use crate::config::Config;
use crate::db::Database;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter("praesagium_backend=debug,tower_http=debug")
        .init();

    // Load .env: try repo root (manifest parent) and cwd; override so .env always wins
    let root_env = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .join(".env");
    let cwd_env = std::env::current_dir().ok().map(|d| d.join(".env"));
    dotenvy::from_path_override(&root_env).ok();
    if let Some(ref p) = cwd_env {
        dotenvy::from_path_override(p).ok();
    }
    dotenvy::dotenv().ok();

    let config = Config::from_env()?;
    let db = Database::new(&config.database_url, config.db_pool_size)
        .await
        .map_err(|e| anyhow::anyhow!("DB connection failed: {}", e))?;
    db.migrate()
        .await
        .map_err(|e| anyhow::anyhow!("Migration failed: {}", e))?;

    if std::env::var("RUN_INDEXER_ONLY").map(|v| v == "1" || v.eq_ignore_ascii_case("true")).unwrap_or(false) {
        info!("RUN_INDEXER_ONLY=1: starting indexer without API");
        startup::run_indexer_only(config, db).await?;
        return Ok(());
    }

    let addr = format!("0.0.0.0:{}", config.port);
    let app = startup::build_app(config, db).await?;

    info!("Backend listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(&addr).await?;

    axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>())
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    info!("Server shut down gracefully");
    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install SIGTERM handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => info!("Received Ctrl+C, shutting down"),
        _ = terminate => info!("Received SIGTERM, shutting down"),
    }
}
