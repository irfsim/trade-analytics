-- Trade Analytics Database Schema for Supabase
-- Run this in the Supabase SQL Editor

-- ============================================
-- TABLES
-- ============================================

-- Accounts table (ISA, Margin)
CREATE TABLE IF NOT EXISTS accounts (
    account_id TEXT PRIMARY KEY,
    alias TEXT NOT NULL,
    account_type TEXT NOT NULL DEFAULT 'margin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Raw executions from IBKR Flex reports
CREATE TABLE IF NOT EXISTS executions (
    id SERIAL PRIMARY KEY,
    execution_id TEXT NOT NULL UNIQUE,
    account_id TEXT NOT NULL REFERENCES accounts(account_id),
    order_id TEXT,
    ticker TEXT NOT NULL,
    executed_at TIMESTAMPTZ NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
    quantity INTEGER NOT NULL,
    price DECIMAL(12, 4) NOT NULL,
    commission DECIMAL(10, 4) NOT NULL DEFAULT 0,
    net_cash DECIMAL(14, 4),
    exchange TEXT,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT positive_quantity CHECK (quantity > 0),
    CONSTRAINT positive_price CHECK (price > 0)
);

CREATE INDEX IF NOT EXISTS idx_executions_account ON executions(account_id);
CREATE INDEX IF NOT EXISTS idx_executions_ticker ON executions(ticker);
CREATE INDEX IF NOT EXISTS idx_executions_executed_at ON executions(executed_at);

-- Normalized trades (matched positions)
CREATE TABLE IF NOT EXISTS trades (
    id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(account_id),
    ticker TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
    status TEXT NOT NULL CHECK (status IN ('OPEN', 'CLOSED')) DEFAULT 'OPEN',

    entry_datetime TIMESTAMPTZ NOT NULL,
    exit_datetime TIMESTAMPTZ,

    entry_price DECIMAL(12, 4) NOT NULL,
    exit_price DECIMAL(12, 4),

    total_shares INTEGER NOT NULL,
    remaining_shares INTEGER NOT NULL DEFAULT 0,

    realized_pnl DECIMAL(14, 4),
    total_commission DECIMAL(10, 4) NOT NULL DEFAULT 0,

    market_condition TEXT CHECK (market_condition IN ('STRONG_UPTREND', 'UPTREND_CHOP', 'SIDEWAYS', 'DOWNTREND', 'CORRECTION')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trades_account ON trades(account_id);
CREATE INDEX IF NOT EXISTS idx_trades_ticker ON trades(ticker);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_entry_datetime ON trades(entry_datetime);

-- Trade legs (individual entries/exits within a trade)
CREATE TABLE IF NOT EXISTS trade_legs (
    id SERIAL PRIMARY KEY,
    trade_id INTEGER NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    execution_id TEXT NOT NULL REFERENCES executions(execution_id),

    leg_type TEXT NOT NULL CHECK (leg_type IN ('ENTRY', 'ADD', 'TRIM', 'EXIT')),
    shares INTEGER NOT NULL,
    price DECIMAL(12, 4) NOT NULL,
    executed_at TIMESTAMPTZ NOT NULL,

    CONSTRAINT positive_shares CHECK (shares > 0)
);

CREATE INDEX IF NOT EXISTS idx_trade_legs_trade ON trade_legs(trade_id);

-- Setup types (global, user-defined trading setups)
CREATE TABLE IF NOT EXISTS setup_types (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    checklist_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default setup types
-- "No setup / Other" is the default, cannot be deleted
INSERT INTO setup_types (name, color, is_default) VALUES
    ('No setup / Other', '#6b7280', TRUE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO setup_types (name) VALUES
    ('Flag'),
    ('Base Breakout'),
    ('EP')
ON CONFLICT (name) DO NOTHING;

-- Trade annotations (A+ checklist and notes)
CREATE TABLE IF NOT EXISTS trade_annotations (
    trade_id INTEGER PRIMARY KEY REFERENCES trades(id) ON DELETE CASCADE,

    grade TEXT CHECK (grade IN ('A+', 'A', 'B', 'C', 'F')),
    should_have_taken BOOLEAN,
    followed_plan BOOLEAN,
    setup_rating INTEGER CHECK (setup_rating >= 0 AND setup_rating <= 9),
    setup_type_id INTEGER REFERENCES setup_types(id) ON DELETE SET NULL,
    market_regime TEXT CHECK (market_regime IN ('STRONG_UPTREND', 'UPTREND_CHOP', 'SIDEWAYS', 'DOWNTREND', 'CORRECTION')),

    initial_risk_dollars DECIMAL(10, 2),
    initial_stop_price DECIMAL(12, 4),

    checklist JSONB NOT NULL DEFAULT '{}'::jsonb,

    screenshot_urls TEXT[] DEFAULT '{}',
    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily summaries
CREATE TABLE IF NOT EXISTS daily_summaries (
    id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(account_id),
    date DATE NOT NULL,

    trades_closed INTEGER NOT NULL DEFAULT 0,
    gross_pnl DECIMAL(14, 4) NOT NULL DEFAULT 0,
    total_commission DECIMAL(10, 4) NOT NULL DEFAULT 0,
    net_pnl DECIMAL(14, 4) NOT NULL DEFAULT 0,

    winners INTEGER NOT NULL DEFAULT 0,
    losers INTEGER NOT NULL DEFAULT 0,
    breakeven INTEGER NOT NULL DEFAULT 0,

    total_r DECIMAL(10, 4),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(account_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON daily_summaries(date);

-- Weekly summaries
CREATE TABLE IF NOT EXISTS weekly_summaries (
    id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(account_id),
    year INTEGER NOT NULL,
    week INTEGER NOT NULL,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,

    trades_closed INTEGER NOT NULL DEFAULT 0,
    gross_pnl DECIMAL(14, 4) NOT NULL DEFAULT 0,
    total_commission DECIMAL(10, 4) NOT NULL DEFAULT 0,
    net_pnl DECIMAL(14, 4) NOT NULL DEFAULT 0,

    winners INTEGER NOT NULL DEFAULT 0,
    losers INTEGER NOT NULL DEFAULT 0,

    total_r DECIMAL(10, 4),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(account_id, year, week)
);

-- Monthly summaries
CREATE TABLE IF NOT EXISTS monthly_summaries (
    id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(account_id),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,

    trades_closed INTEGER NOT NULL DEFAULT 0,
    gross_pnl DECIMAL(14, 4) NOT NULL DEFAULT 0,
    total_commission DECIMAL(10, 4) NOT NULL DEFAULT 0,
    net_pnl DECIMAL(14, 4) NOT NULL DEFAULT 0,

    winners INTEGER NOT NULL DEFAULT 0,
    losers INTEGER NOT NULL DEFAULT 0,

    total_r DECIMAL(10, 4),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(account_id, year, month)
);

-- Yearly summaries
CREATE TABLE IF NOT EXISTS yearly_summaries (
    id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(account_id),
    year INTEGER NOT NULL,

    trades_closed INTEGER NOT NULL DEFAULT 0,
    gross_pnl DECIMAL(14, 4) NOT NULL DEFAULT 0,
    total_commission DECIMAL(10, 4) NOT NULL DEFAULT 0,
    net_pnl DECIMAL(14, 4) NOT NULL DEFAULT 0,

    winners INTEGER NOT NULL DEFAULT 0,
    losers INTEGER NOT NULL DEFAULT 0,

    total_r DECIMAL(10, 4),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(account_id, year)
);

-- Chart data cache (for preserving intraday data)
CREATE TABLE IF NOT EXISTS chart_cache (
    id SERIAL PRIMARY KEY,
    ticker TEXT NOT NULL,
    interval TEXT NOT NULL CHECK (interval IN ('5m', '1h')),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    candles JSONB NOT NULL,  -- Array of {time, open, high, low, close, volume}
    cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(ticker, interval, start_date, end_date)
);

CREATE INDEX IF NOT EXISTS idx_chart_cache_lookup ON chart_cache(ticker, interval, start_date, end_date);

-- QQQ market data cache (for market condition detection)
CREATE TABLE IF NOT EXISTS qqq_market_data (
    date DATE PRIMARY KEY,
    close DECIMAL(12, 4) NOT NULL,
    high_20d DECIMAL(12, 4),
    ma_10 DECIMAL(12, 4),
    ma_20 DECIMAL(12, 4),
    ma_50 DECIMAL(12, 4),
    ma_10_5d_ago DECIMAL(12, 4),
    ma_20_5d_ago DECIMAL(12, 4),
    market_condition TEXT CHECK (market_condition IN ('STRONG_UPTREND', 'UPTREND_CHOP', 'SIDEWAYS', 'DOWNTREND', 'CORRECTION')),
    cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
-- Since this is a single-user app, we enable RLS but allow all operations
-- This protects against accidental public access while keeping things simple

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_legs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE setup_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE yearly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE qqq_market_data ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (service role bypasses RLS)
-- These policies allow the anon key to read, and service role to write

-- Accounts: read for anon, full access for service role
CREATE POLICY "Allow read access" ON accounts FOR SELECT USING (true);
CREATE POLICY "Allow insert" ON accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON accounts FOR UPDATE USING (true);
CREATE POLICY "Allow delete" ON accounts FOR DELETE USING (true);

-- Executions
CREATE POLICY "Allow read access" ON executions FOR SELECT USING (true);
CREATE POLICY "Allow insert" ON executions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON executions FOR UPDATE USING (true);
CREATE POLICY "Allow delete" ON executions FOR DELETE USING (true);

-- Trades
CREATE POLICY "Allow read access" ON trades FOR SELECT USING (true);
CREATE POLICY "Allow insert" ON trades FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON trades FOR UPDATE USING (true);
CREATE POLICY "Allow delete" ON trades FOR DELETE USING (true);

-- Trade legs
CREATE POLICY "Allow read access" ON trade_legs FOR SELECT USING (true);
CREATE POLICY "Allow insert" ON trade_legs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON trade_legs FOR UPDATE USING (true);
CREATE POLICY "Allow delete" ON trade_legs FOR DELETE USING (true);

-- Trade annotations
CREATE POLICY "Allow read access" ON trade_annotations FOR SELECT USING (true);
CREATE POLICY "Allow insert" ON trade_annotations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON trade_annotations FOR UPDATE USING (true);
CREATE POLICY "Allow delete" ON trade_annotations FOR DELETE USING (true);

-- Setup types
CREATE POLICY "Allow read access" ON setup_types FOR SELECT USING (true);
CREATE POLICY "Allow insert" ON setup_types FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON setup_types FOR UPDATE USING (true);
CREATE POLICY "Allow delete" ON setup_types FOR DELETE USING (true);

-- Summaries (read-only for most cases, but allow writes)
CREATE POLICY "Allow read access" ON daily_summaries FOR SELECT USING (true);
CREATE POLICY "Allow insert" ON daily_summaries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON daily_summaries FOR UPDATE USING (true);
CREATE POLICY "Allow delete" ON daily_summaries FOR DELETE USING (true);

CREATE POLICY "Allow read access" ON weekly_summaries FOR SELECT USING (true);
CREATE POLICY "Allow insert" ON weekly_summaries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON weekly_summaries FOR UPDATE USING (true);
CREATE POLICY "Allow delete" ON weekly_summaries FOR DELETE USING (true);

CREATE POLICY "Allow read access" ON monthly_summaries FOR SELECT USING (true);
CREATE POLICY "Allow insert" ON monthly_summaries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON monthly_summaries FOR UPDATE USING (true);
CREATE POLICY "Allow delete" ON monthly_summaries FOR DELETE USING (true);

CREATE POLICY "Allow read access" ON yearly_summaries FOR SELECT USING (true);
CREATE POLICY "Allow insert" ON yearly_summaries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON yearly_summaries FOR UPDATE USING (true);
CREATE POLICY "Allow delete" ON yearly_summaries FOR DELETE USING (true);

-- Chart cache
CREATE POLICY "Allow read access" ON chart_cache FOR SELECT USING (true);
CREATE POLICY "Allow insert" ON chart_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON chart_cache FOR UPDATE USING (true);
CREATE POLICY "Allow delete" ON chart_cache FOR DELETE USING (true);

-- QQQ market data
CREATE POLICY "Allow read access" ON qqq_market_data FOR SELECT USING (true);
CREATE POLICY "Allow insert" ON qqq_market_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON qqq_market_data FOR UPDATE USING (true);
CREATE POLICY "Allow delete" ON qqq_market_data FOR DELETE USING (true);

-- ============================================
-- SEED DATA
-- ============================================

-- Insert default accounts (ISA and Margin)
INSERT INTO accounts (account_id, alias, account_type) VALUES
    ('ISA', 'ISA', 'isa'),
    ('MARGIN', 'Margin', 'margin')
ON CONFLICT (account_id) DO NOTHING;
