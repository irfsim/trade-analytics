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

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update 'tasks/lessons.md' with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests -> then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management
1. **Plan First**: Write plan to 'tasks/todo.md' with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review to 'tasks/todo.md'
6. **Capture Lessons**: Update 'tasks/lessons.md' after corrections

## UI & Typography Standards
- Use `tabular-nums` (via Tailwind `tabular-nums` class) on all numeric data: prices, P&L, percentages, stats, table columns
- Use `text-balance` on headings, `text-pretty` on body/paragraph text
- Use `truncate` or `line-clamp-*` for dense UI instead of manual JS string slicing
- Add `aria-label` to all icon-only buttons (don't rely on `title` alone)
- Never animate layout properties (width, height, margin) — use `transform` and `opacity` only
- Use `ease-out` on entrance transitions
- Use `rounded-full` on all standalone action buttons (CTAs, submit, save, delete). Use `rounded-lg` only for dropdown menu items, form inputs, and containers
- Never modify `letter-spacing` / `tracking-*` unless absolutely necessary

## Core Principles
- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
