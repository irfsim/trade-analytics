-- Broker Connections Migration
-- Adds tables for IBKR integration with multi-account support

-- ============================================
-- BROKER CONNECTIONS
-- ============================================

-- Stores broker credentials and connection metadata
CREATE TABLE IF NOT EXISTS broker_connections (
    id SERIAL PRIMARY KEY,
    broker_type TEXT NOT NULL DEFAULT 'ibkr_flex',
    label TEXT NOT NULL,

    -- IBKR Flex specific credentials (encrypted at rest by Supabase)
    flex_token TEXT,
    flex_query_id TEXT,

    -- Connection status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'error', 'disabled')),
    last_error TEXT,

    -- Sync configuration
    auto_sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sync_interval_hours INTEGER NOT NULL DEFAULT 24,
    last_sync_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broker_connections_status ON broker_connections(status);
CREATE INDEX IF NOT EXISTS idx_broker_connections_type ON broker_connections(broker_type);

-- ============================================
-- BROKER ACCOUNT LINKS
-- ============================================

-- Maps external broker account IDs to internal accounts
CREATE TABLE IF NOT EXISTS broker_account_links (
    id SERIAL PRIMARY KEY,
    broker_connection_id INTEGER NOT NULL REFERENCES broker_connections(id) ON DELETE CASCADE,

    -- External broker account ID (e.g., "U1234567" from IBKR)
    external_account_id TEXT NOT NULL,

    -- Link to our internal account
    internal_account_id TEXT NOT NULL REFERENCES accounts(account_id),

    -- Metadata discovered from broker
    account_name TEXT,
    account_type_from_broker TEXT,
    base_currency TEXT DEFAULT 'USD',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(broker_connection_id, external_account_id)
);

CREATE INDEX IF NOT EXISTS idx_broker_account_links_external ON broker_account_links(external_account_id);
CREATE INDEX IF NOT EXISTS idx_broker_account_links_connection ON broker_account_links(broker_connection_id);

-- ============================================
-- SYNC HISTORY
-- ============================================

-- Tracks sync operations for status display and debugging
CREATE TABLE IF NOT EXISTS sync_history (
    id SERIAL PRIMARY KEY,
    broker_connection_id INTEGER NOT NULL REFERENCES broker_connections(id) ON DELETE CASCADE,

    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'partial', 'error')),

    -- Results
    executions_fetched INTEGER DEFAULT 0,
    executions_inserted INTEGER DEFAULT 0,
    executions_skipped INTEGER DEFAULT 0,
    trades_matched INTEGER DEFAULT 0,

    -- Error tracking
    error_message TEXT,
    error_details JSONB,

    -- Request metadata
    date_range_from DATE,
    date_range_to DATE,
    trigger_type TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'cron', 'onboarding'))
);

CREATE INDEX IF NOT EXISTS idx_sync_history_connection ON sync_history(broker_connection_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_started_at ON sync_history(started_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE broker_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE broker_account_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_history ENABLE ROW LEVEL SECURITY;

-- Broker connections
CREATE POLICY "Allow read access" ON broker_connections FOR SELECT USING (true);
CREATE POLICY "Allow insert" ON broker_connections FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON broker_connections FOR UPDATE USING (true);
CREATE POLICY "Allow delete" ON broker_connections FOR DELETE USING (true);

-- Broker account links
CREATE POLICY "Allow read access" ON broker_account_links FOR SELECT USING (true);
CREATE POLICY "Allow insert" ON broker_account_links FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON broker_account_links FOR UPDATE USING (true);
CREATE POLICY "Allow delete" ON broker_account_links FOR DELETE USING (true);

-- Sync history
CREATE POLICY "Allow read access" ON sync_history FOR SELECT USING (true);
CREATE POLICY "Allow insert" ON sync_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON sync_history FOR UPDATE USING (true);
CREATE POLICY "Allow delete" ON sync_history FOR DELETE USING (true);
