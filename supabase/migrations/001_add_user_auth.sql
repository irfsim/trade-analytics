-- Migration: Add multi-user authentication with data isolation
-- Run this in Supabase SQL Editor after enabling Auth

-- ============================================
-- 1. CREATE USER PROFILES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    flex_query_token TEXT,
    flex_query_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists then recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. ADD USER_ID TO ACCOUNTS AND SETUP_TYPES
-- ============================================

-- Add user_id column to accounts
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);

-- Add user_id column to setup_types
ALTER TABLE setup_types ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_setup_types_user ON setup_types(user_id);

-- Add starting_balance to accounts if not exists (for portfolio tracking)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS starting_balance DECIMAL(14, 2) DEFAULT 0;

-- ============================================
-- 3. DROP OLD PERMISSIVE RLS POLICIES
-- ============================================

-- Accounts
DROP POLICY IF EXISTS "Allow read access" ON accounts;
DROP POLICY IF EXISTS "Allow insert" ON accounts;
DROP POLICY IF EXISTS "Allow update" ON accounts;
DROP POLICY IF EXISTS "Allow delete" ON accounts;

-- Executions
DROP POLICY IF EXISTS "Allow read access" ON executions;
DROP POLICY IF EXISTS "Allow insert" ON executions;
DROP POLICY IF EXISTS "Allow update" ON executions;
DROP POLICY IF EXISTS "Allow delete" ON executions;

-- Trades
DROP POLICY IF EXISTS "Allow read access" ON trades;
DROP POLICY IF EXISTS "Allow insert" ON trades;
DROP POLICY IF EXISTS "Allow update" ON trades;
DROP POLICY IF EXISTS "Allow delete" ON trades;

-- Trade legs
DROP POLICY IF EXISTS "Allow read access" ON trade_legs;
DROP POLICY IF EXISTS "Allow insert" ON trade_legs;
DROP POLICY IF EXISTS "Allow update" ON trade_legs;
DROP POLICY IF EXISTS "Allow delete" ON trade_legs;

-- Trade annotations
DROP POLICY IF EXISTS "Allow read access" ON trade_annotations;
DROP POLICY IF EXISTS "Allow insert" ON trade_annotations;
DROP POLICY IF EXISTS "Allow update" ON trade_annotations;
DROP POLICY IF EXISTS "Allow delete" ON trade_annotations;

-- Setup types
DROP POLICY IF EXISTS "Allow read access" ON setup_types;
DROP POLICY IF EXISTS "Allow insert" ON setup_types;
DROP POLICY IF EXISTS "Allow update" ON setup_types;
DROP POLICY IF EXISTS "Allow delete" ON setup_types;

-- NOTE: The following tables may not exist in all deployments.
-- We'll handle their policies conditionally in section 4.

-- ============================================
-- 4. CREATE USER-SCOPED RLS POLICIES
-- ============================================

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- User profiles: users can only access their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Accounts: users can only access their own accounts
CREATE POLICY "Users can view own accounts" ON accounts
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own accounts" ON accounts
    FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own accounts" ON accounts
    FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own accounts" ON accounts
    FOR DELETE USING (user_id = auth.uid());

-- Executions: users can access executions for their accounts
CREATE POLICY "Users can view own executions" ON executions
    FOR SELECT USING (
        account_id IN (SELECT account_id FROM accounts WHERE user_id = auth.uid())
    );
CREATE POLICY "Users can insert own executions" ON executions
    FOR INSERT WITH CHECK (
        account_id IN (SELECT account_id FROM accounts WHERE user_id = auth.uid())
    );
CREATE POLICY "Users can update own executions" ON executions
    FOR UPDATE USING (
        account_id IN (SELECT account_id FROM accounts WHERE user_id = auth.uid())
    );
CREATE POLICY "Users can delete own executions" ON executions
    FOR DELETE USING (
        account_id IN (SELECT account_id FROM accounts WHERE user_id = auth.uid())
    );

-- Trades: users can access trades for their accounts
CREATE POLICY "Users can view own trades" ON trades
    FOR SELECT USING (
        account_id IN (SELECT account_id FROM accounts WHERE user_id = auth.uid())
    );
CREATE POLICY "Users can insert own trades" ON trades
    FOR INSERT WITH CHECK (
        account_id IN (SELECT account_id FROM accounts WHERE user_id = auth.uid())
    );
CREATE POLICY "Users can update own trades" ON trades
    FOR UPDATE USING (
        account_id IN (SELECT account_id FROM accounts WHERE user_id = auth.uid())
    );
CREATE POLICY "Users can delete own trades" ON trades
    FOR DELETE USING (
        account_id IN (SELECT account_id FROM accounts WHERE user_id = auth.uid())
    );

-- Trade legs: access through trades
CREATE POLICY "Users can view own trade legs" ON trade_legs
    FOR SELECT USING (
        trade_id IN (
            SELECT id FROM trades
            WHERE account_id IN (SELECT account_id FROM accounts WHERE user_id = auth.uid())
        )
    );
CREATE POLICY "Users can insert own trade legs" ON trade_legs
    FOR INSERT WITH CHECK (
        trade_id IN (
            SELECT id FROM trades
            WHERE account_id IN (SELECT account_id FROM accounts WHERE user_id = auth.uid())
        )
    );
CREATE POLICY "Users can update own trade legs" ON trade_legs
    FOR UPDATE USING (
        trade_id IN (
            SELECT id FROM trades
            WHERE account_id IN (SELECT account_id FROM accounts WHERE user_id = auth.uid())
        )
    );
CREATE POLICY "Users can delete own trade legs" ON trade_legs
    FOR DELETE USING (
        trade_id IN (
            SELECT id FROM trades
            WHERE account_id IN (SELECT account_id FROM accounts WHERE user_id = auth.uid())
        )
    );

-- Trade annotations: access through trades
CREATE POLICY "Users can view own annotations" ON trade_annotations
    FOR SELECT USING (
        trade_id IN (
            SELECT id FROM trades
            WHERE account_id IN (SELECT account_id FROM accounts WHERE user_id = auth.uid())
        )
    );
CREATE POLICY "Users can insert own annotations" ON trade_annotations
    FOR INSERT WITH CHECK (
        trade_id IN (
            SELECT id FROM trades
            WHERE account_id IN (SELECT account_id FROM accounts WHERE user_id = auth.uid())
        )
    );
CREATE POLICY "Users can update own annotations" ON trade_annotations
    FOR UPDATE USING (
        trade_id IN (
            SELECT id FROM trades
            WHERE account_id IN (SELECT account_id FROM accounts WHERE user_id = auth.uid())
        )
    );
CREATE POLICY "Users can delete own annotations" ON trade_annotations
    FOR DELETE USING (
        trade_id IN (
            SELECT id FROM trades
            WHERE account_id IN (SELECT account_id FROM accounts WHERE user_id = auth.uid())
        )
    );

-- Setup types: global defaults OR user-owned
CREATE POLICY "Users can view setups" ON setup_types
    FOR SELECT USING (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "Users can insert own setups" ON setup_types
    FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own setups" ON setup_types
    FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own setups" ON setup_types
    FOR DELETE USING (user_id = auth.uid() AND is_default = FALSE);

-- ============================================
-- 5. HELPER: MIGRATE EXISTING DATA
-- ============================================
-- Run this after creating your first user account:
--
-- UPDATE accounts SET user_id = 'YOUR-USER-UUID' WHERE user_id IS NULL;
-- UPDATE setup_types SET user_id = 'YOUR-USER-UUID' WHERE user_id IS NULL AND is_default = FALSE;
--
-- Replace 'YOUR-USER-UUID' with your auth.users id from Supabase dashboard
