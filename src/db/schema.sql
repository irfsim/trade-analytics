-- Trade Analytics Database Schema
-- For use with Supabase (PostgreSQL)

-- Accounts table (ISA, Margin)
CREATE TABLE accounts (
    account_id TEXT PRIMARY KEY,
    alias TEXT NOT NULL,
    account_type TEXT NOT NULL DEFAULT 'margin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Raw executions from IBKR Flex reports
CREATE TABLE executions (
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

CREATE INDEX idx_executions_account ON executions(account_id);
CREATE INDEX idx_executions_ticker ON executions(ticker);
CREATE INDEX idx_executions_executed_at ON executions(executed_at);

-- Normalized trades (matched positions)
CREATE TABLE trades (
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

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trades_account ON trades(account_id);
CREATE INDEX idx_trades_ticker ON trades(ticker);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_entry_datetime ON trades(entry_datetime);

-- Trade legs (individual entries/exits within a trade)
CREATE TABLE trade_legs (
    id SERIAL PRIMARY KEY,
    trade_id INTEGER NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    execution_id TEXT NOT NULL REFERENCES executions(execution_id),

    leg_type TEXT NOT NULL CHECK (leg_type IN ('ENTRY', 'ADD', 'TRIM', 'EXIT')),
    shares INTEGER NOT NULL,
    price DECIMAL(12, 4) NOT NULL,
    executed_at TIMESTAMPTZ NOT NULL,

    CONSTRAINT positive_shares CHECK (shares > 0)
);

CREATE INDEX idx_trade_legs_trade ON trade_legs(trade_id);

-- Trade annotations (your A+ checklist and notes)
CREATE TABLE trade_annotations (
    trade_id INTEGER PRIMARY KEY REFERENCES trades(id) ON DELETE CASCADE,

    -- Overall assessment
    grade TEXT CHECK (grade IN ('A+', 'A', 'B', 'C', 'F')),
    should_have_taken BOOLEAN,
    setup_type TEXT CHECK (setup_type IN ('EP', 'FLAG', 'BASE_BREAKOUT', 'OTHER')),
    setup_type_other TEXT,
    market_regime TEXT CHECK (market_regime IN ('STRONG_UPTREND', 'UPTREND_CHOP', 'SIDEWAYS', 'DOWNTREND', 'CORRECTION')),

    -- Risk management
    initial_risk_dollars DECIMAL(10, 2),
    initial_stop_price DECIMAL(12, 4),

    -- A+ Checklist (stored as JSONB for flexibility)
    checklist JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Media and notes
    screenshot_urls TEXT[] DEFAULT '{}',
    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily summaries (precomputed for performance)
CREATE TABLE daily_summaries (
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

CREATE INDEX idx_daily_summaries_date ON daily_summaries(date);

-- Weekly summaries
CREATE TABLE weekly_summaries (
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
CREATE TABLE monthly_summaries (
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
CREATE TABLE yearly_summaries (
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

-- Default A+ checklist template (for reference)
COMMENT ON COLUMN trade_annotations.checklist IS '
JSON structure:
{
  "marketContext": {
    "bullishConditions": boolean
  },
  "stockSelection": {
    "momentumLeader": boolean,
    "highRS": boolean,
    "sufficientVolume": boolean,
    "sufficientADR": boolean
  },
  "priorUptrend": {
    "clearStrongUptrend": boolean
  },
  "consolidation": {
    "orderlyPattern": boolean,
    "notChoppy": boolean
  },
  "maSupport": {
    "nearRisingMA": boolean,
    "masStacked": boolean
  },
  "volatilityContraction": {
    "visuallyTighter": boolean,
    "quantitativeCheck": boolean,
    "tightnessNearPivot": boolean
  },
  "volumePattern": {
    "volumeContracted": boolean,
    "lowVolumeTightDays": boolean
  },
  "pivotAndRisk": {
    "clearPivot": boolean,
    "logicalStop": boolean,
    "acceptableRisk": boolean
  },
  "context": {
    "leadingSector": boolean,
    "recentCatalyst": boolean
  }
}
';

-- Insert default accounts
INSERT INTO accounts (account_id, alias, account_type) VALUES
    ('ISA', 'ISA', 'isa'),
    ('MARGIN', 'Margin', 'margin');
