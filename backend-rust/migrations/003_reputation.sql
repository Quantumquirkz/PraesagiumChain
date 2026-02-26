-- PostgreSQL - Creator reputation
CREATE TABLE IF NOT EXISTS creator_reputation (
    creator_address TEXT PRIMARY KEY,
    markets_created INTEGER NOT NULL DEFAULT 0,
    markets_resolved INTEGER NOT NULL DEFAULT 0,
    correct_predictions INTEGER NOT NULL DEFAULT 0,
    reputation_score REAL NOT NULL DEFAULT 0,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_creator_reputation_score ON creator_reputation(reputation_score);
