# Trade Analytics - Project Plan

A trade journaling and analytics platform for momentum/breakout traders using IBKR.

## Overview

This application helps traders analyze their trading performance by importing execution data from Interactive Brokers and providing detailed statistics, visualizations, and trade annotation capabilities.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel (planned)

## Current Features

### Data Import
- CSV import from IBKR Flex Queries
- Automatic trade grouping from executions
- Support for multiple accounts (MARGIN, ISA)

### Trade Management
- Trade list with period filtering (Today, Week, Month, Year, All)
- Trade detail panel with execution breakdown
- Trade annotation system:
  - Setup type (EP, Flag, Base Breakout)
  - Market regime classification
  - Grade assignment (A+, A, B, C, F)
  - Setup checklist with multiple categories
  - Plan compliance tracking
  - Notes

### Statistics & Analytics

#### Trades Page (`/`)
- Period-scoped trade list
- Quick stats (Net P&L, Win Rate, Trade Count)
- Account switcher

#### Stats Page (`/stats`)
- **Year Summary**: Total trades, win rate, total P&L, best/worst trade
- **Cumulative Returns**: Monthly returns with running cumulative %
- **Max Consecutive Wins/Losses**: By month
- **Month-by-Month Breakdown**: Avg Gain %, Avg Loss %, Win %, Wins, Losses, Trades, Best %, Worst %, Total P&L
- **Rule Adherence Impact**: Compare performance of plan-following vs plan-breaking trades
- **Segmented Analysis**: Performance breakdown by setup type, market regime, or grade
- **Plan Only Toggle**: Filter all stats to show only trades that followed the plan

## Database Schema

### Tables
- `executions` - Raw execution data from IBKR
- `trades` - Grouped trades with entry/exit info
- `trade_legs` - Links executions to trades
- `trade_annotations` - User annotations for trades

## API Endpoints

- `GET /api/trades` - Fetch trades with optional filters
- `GET /api/stats` - Overall performance statistics
- `GET /api/stats/monthly` - Monthly breakdown statistics
- `GET /api/accounts` - List available accounts
- `POST /api/import` - Import CSV executions
- `POST /api/seed` - Seed dummy data for testing
- `GET/PUT /api/trades/[id]/annotation` - Trade annotations

## File Structure

```
src/
├── app/
│   ├── page.tsx              # Trades page
│   ├── stats/page.tsx        # Stats page
│   └── api/
│       ├── trades/
│       ├── stats/
│       ├── accounts/
│       ├── import/
│       └── seed/
├── components/
│   ├── trade-table.tsx
│   ├── trade-panel.tsx
│   ├── monthly-breakdown.tsx
│   ├── account-switcher.tsx
│   ├── nav-tabs.tsx
│   ├── period-tabs.tsx
│   ├── plan-filter-toggle.tsx
│   └── ...
├── lib/
│   └── supabase.ts
└── types/
    └── database.ts
```

## Planned Features

### Short Term
- [ ] Real account balance integration for cumulative returns calculation
- [ ] Export statistics to CSV/PDF
- [ ] Trade tagging system
- [ ] Search/filter trades by ticker

### Medium Term
- [ ] Chart integration (view entry/exit on price chart)
- [ ] Risk metrics (R-multiple tracking, position sizing analysis)
- [ ] Calendar view of trading days
- [ ] Streak tracking (current win/loss streak)

### Long Term
- [ ] Automated pattern recognition
- [ ] Performance alerts and notifications
- [ ] Multi-timeframe analysis
- [ ] Comparison with market benchmarks
- [ ] Mobile-responsive design improvements

### AI Trading Coach
- [ ] **Conversational AI chat interface** - Talk to an AI about your trading
- [ ] **Stats-aware responses** - AI has full context of your performance data
- [ ] **Professional feedback** - Identify patterns, weaknesses, and areas for improvement
- [ ] **Setup analysis** - Review specific trades and get feedback on execution
- [ ] **Plan compliance coaching** - Help reinforce rule-following behavior
- [ ] **Weekly/monthly reviews** - AI-generated performance summaries and insights
- [ ] **Goal tracking** - Set targets and get AI accountability
- [ ] Potential integrations: Claude API, with RAG over trade history

## Design Principles

1. **Clean, minimal UI** - Focus on data, reduce visual noise
2. **Fast data access** - Quick filtering and navigation
3. **Actionable insights** - Statistics that help improve trading
4. **Plan compliance focus** - Emphasize rule-following behavior

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```
