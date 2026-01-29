-- Add starting_balance to accounts
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS starting_balance DECIMAL(14, 2) NOT NULL DEFAULT 0;

-- Cash flows table for deposits and withdrawals
CREATE TABLE IF NOT EXISTS cash_flows (
    id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    flow_type TEXT NOT NULL CHECK (flow_type IN ('DEPOSIT', 'WITHDRAWAL')),
    amount DECIMAL(14, 2) NOT NULL,
    flow_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT positive_amount CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_cash_flows_account ON cash_flows(account_id);
CREATE INDEX IF NOT EXISTS idx_cash_flows_date ON cash_flows(flow_date);

-- RLS policies for cash_flows
ALTER TABLE cash_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access" ON cash_flows FOR SELECT USING (true);
CREATE POLICY "Allow insert" ON cash_flows FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON cash_flows FOR UPDATE USING (true);
CREATE POLICY "Allow delete" ON cash_flows FOR DELETE USING (true);
