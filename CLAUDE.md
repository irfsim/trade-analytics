# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
```

## Architecture

Trade journaling platform for IBKR users following Qullamaggie-style momentum breakout trading. Imports executions from IBKR Flex XML reports, matches them into trades using FIFO, and provides analytics.

### Data Flow

1. **Import** (`/api/import`) - Upload IBKR Flex XML → parse executions → insert to DB
2. **Match** (`src/lib/trade-matcher.ts`) - FIFO algorithm groups executions into trades with legs (ENTRY/ADD/TRIM/EXIT)
3. **Annotate** - User adds A+ checklist grades, setup type, risk info via trade detail page
4. **Analyze** (`src/lib/analytics.ts`) - Calculate win rate, expectancy, R-multiples, drawdown, segmented by setup/grade/regime

### Key Business Logic

**Trade Matching** (`src/lib/trade-matcher.ts`):
- Executions sorted chronologically, grouped by account+ticker
- LONG: BUY opens/adds, SELL trims/closes
- SHORT: SELL opens/adds, BUY covers
- Position going to zero closes trade; excess shares start new opposite trade
- Outputs `MatchedTrade` with weighted avg entry/exit prices and realized P&L

**A+ Checklist** (`src/types/database.ts:APlusChecklist`):
- 9 categories: market context, stock selection, prior uptrend, consolidation, MA support, volatility contraction, volume pattern, pivot/risk, context
- Stored as JSONB in `trade_annotations.checklist`

### Database

Supabase PostgreSQL. Schema in `supabase/schema.sql`.

Core tables:
- `accounts` - ISA/MARGIN account types
- `executions` - Raw IBKR executions (unique by `execution_id`)
- `trades` - Matched positions with entry/exit prices, P&L
- `trade_legs` - Links executions to trades with leg type
- `trade_annotations` - Grades, checklist, notes, risk info

Environment: `IBKR_ACCOUNT_MAP` maps IBKR account IDs (e.g., `U1234567`) to internal account types.

### API Routes

- `POST /api/import` - Upload Flex XML, parses and re-matches all trades
- `GET /api/trades` - List trades with filters (accountId, from, to, includeStats)
- `GET /api/trades/[id]` - Trade detail with legs and annotation
- `PUT /api/trades/[id]/annotation` - Update trade annotation
- `GET /api/accounts` - List accounts
- `GET /api/stats` - Performance metrics with segmentation (setup_type, market_regime, grade)
- `GET /api/stats/monthly` - Monthly breakdown (returns, consecutive wins/losses)
- `POST /api/seed` - Generate dummy test data (useful for development)

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=<supabase_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
```
