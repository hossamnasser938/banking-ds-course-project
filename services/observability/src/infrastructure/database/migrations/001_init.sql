CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(32) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  account_id UUID PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL,
  balance NUMERIC(18, 2) NOT NULL DEFAULT 100,
  currency VARCHAR(8) NOT NULL DEFAULT 'USD',
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transfers (
  transfer_id UUID PRIMARY KEY,
  idempotency_key VARCHAR(128) UNIQUE NOT NULL,
  source_account_id UUID NOT NULL,
  destination_account_id UUID NOT NULL,
  amount NUMERIC(18, 2) NOT NULL,
  status VARCHAR(32) NOT NULL,
  rejection_reason TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  committed_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS idempotency_records (
  idempotency_key VARCHAR(128) PRIMARY KEY,
  request_hash TEXT NOT NULL,
  transfer_id UUID NOT NULL,
  outcome_status VARCHAR(32) NOT NULL,
  response_snapshot JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_nodes (
  node_id VARCHAR(128) PRIMARY KEY,
  component_type VARCHAR(32) NOT NULL,
  zone VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL,
  last_health_at TIMESTAMP NULL,
  last_observed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recovery_logs (
  log_id UUID PRIMARY KEY,
  event_type VARCHAR(64) NOT NULL,
  source_node_id VARCHAR(128) NOT NULL,
  target_node_id VARCHAR(128) NULL,
  zone VARCHAR(64) NOT NULL,
  payload JSONB NOT NULL,
  sync_status VARCHAR(32) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP NULL
);
