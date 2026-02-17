-- Creator reputation (backend-computed from resolved markets and prediction accuracy).

CREATE TABLE IF NOT EXISTS creator_reputation (
    creator_address TEXT PRIMARY KEY,
    markets_created INTEGER NOT NULL DEFAULT 0,
    markets_resolved INTEGER NOT NULL DEFAULT 0,
    correct_predictions INTEGER NOT NULL DEFAULT 0,
    reputation_score REAL NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_creator_reputation_score ON creator_reputation(reputation_score);
