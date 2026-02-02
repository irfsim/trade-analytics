# Trade Analytics - Project Plan

A trade journaling and analytics platform for momentum/breakout traders using IBKR.

## Overview

This application helps traders analyze their trading performance by importing execution data from Interactive Brokers and providing detailed trade viewing, annotation, and journaling capabilities.

## Tech Stack

- **Framework**: Next.js 15 (App Router, Turbopack)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS v4
- **UI Components**: Custom bloom-menu library (locally patched)
- **Deployment**: Vercel (planned)

---

## Release Phases

### Phase 1: MVP (Current Focus)

Core functionality for importing, viewing, and annotating trades.

#### Import
- [x] IBKR Flex XML import
- [x] Automatic trade matching from executions (FIFO algorithm)
- [x] Support for multiple accounts (MARGIN, ISA)
- [x] Execution grouping into trade legs (ENTRY/ADD/TRIM/EXIT)

#### Trade Viewing
- [x] Trade list with filtering
- [x] Period selection pills (This week, Last week, This month, Last month, YTD)
- [x] "More" dropdown with additional periods (Today, Yesterday, Last year, All time)
- [x] Trade count filtering (Last 10, 20, 50 trades)
- [x] Account switcher (in user menu)
- [x] Open/Closed trade tabs
- [x] Sortable columns with UK date format (d/m/yy)
- [x] Period stats bar (Trades, Winners %, Losers %, Net P&L)

#### Trade Detail Panel
- [x] Slide-out panel with full trade info
- [x] Execution legs breakdown (entry/exit prices, quantities, P&L per leg)
- [x] Keyboard navigation (arrow keys, escape to close)

#### Trade Annotations
- [x] Setup type (configurable - managed in Settings)
- [x] Setup rating (1-5 scale)
- [x] Plan followed (Yes/No toggle)
- [x] Notes field
- [ ] A+ Checklist (9 categories - UI needs implementation)

#### Settings
- [x] Settings modal
- [x] Setup type management (add/edit/delete custom setup types)

### Phase 2: Analytics (Future Release)

Comprehensive performance analysis and statistics.

- [ ] Stats dashboard page
- [ ] Year summary (total trades, win rate, total P&L, best/worst trade)
- [ ] Cumulative returns chart
- [ ] Monthly breakdown table
- [ ] Max consecutive wins/losses tracking
- [ ] Rule adherence impact analysis
- [ ] Segmented analysis (by setup type, grade, regime)
- [ ] Plan-only filter toggle

### Phase 2.5: Trade Charts

Visual chart display for each trade showing entry/exit points (Tradervue-style).

**Chart Features:**
- [ ] Candlestick chart with OHLC data
- [ ] Dark theme (dark slate background)
- [ ] Volume bars at bottom (green up / red down)
- [ ] OHLC info bar at top (Open, High, Low, Close, Volume)
- [ ] Price scale (right) and volume scale (left)
- [ ] ~3 months of price history context

**Timeframes:**
- [ ] Daily chart (default)
- [ ] 5-minute intraday chart
- [ ] 30-minute intraday chart
- [ ] Timeframe dropdown selector

**Execution Markers:**
- [ ] Green diamonds for buy executions (entries, adds)
- [ ] Red/coral diamonds for sell executions (trims, exits)
- [ ] Stacked diamonds when multiple executions at same price level
- [ ] Markers positioned at exact execution price
- [ ] Legend showing "buys" and "sells" icons

**Toolbar:**
- [ ] Zoom controls
- [ ] Export/screenshot
- [ ] Settings

**Technical:**
- [ ] Chart library (lightweight-charts, TradingView widget, or custom canvas)
- [ ] Market data API integration (Alpha Vantage, Polygon, or similar)
- [ ] Cache historical data to reduce API calls

### Phase 3: Advanced Features

- [ ] Risk metrics (R-multiple tracking, position sizing)
- [ ] Calendar view of trading days
- [ ] Export to CSV/PDF
- [ ] Trade tagging system
- [ ] Search/filter by ticker

### Phase 4: AI Trading Coach

- [ ] Conversational AI chat interface
- [ ] Stats-aware responses with full performance context
- [ ] Trade review and feedback
- [ ] Plan compliance coaching
- [ ] Weekly/monthly AI-generated reviews
- [ ] Goal tracking and accountability

---

## Current Features (Completed)

### UI/UX
- Clean, minimal design with zinc color palette
- Period pills for quick time range selection
- Dynamic "More" dropdown for additional periods
- User menu with account selector, settings, sign out
- Responsive trade table with sortable columns
- Right-aligned numerical columns
- Slide-out trade detail panel

### Data Flow
1. **Import** (`/api/import`) - Upload IBKR Flex XML → parse executions → insert to DB
2. **Match** (`src/lib/trade-matcher.ts`) - FIFO algorithm groups executions into trades
3. **View** - Trade list with period/account filtering
4. **Annotate** - Add setup type, rating, plan compliance, notes via detail panel

### Database Schema

#### Tables
- `accounts` - Trading accounts (ISA/MARGIN types)
- `executions` - Raw IBKR executions (unique by execution_id)
- `trades` - Matched positions with entry/exit prices, P&L
- `trade_legs` - Links executions to trades with leg type
- `trade_annotations` - User annotations (setup, rating, notes)
- `setup_types` - Configurable setup type definitions

---

## API Endpoints

- `GET /api/trades` - Fetch trades with filters (accountId, from, to, limit, includeStats)
- `GET /api/trades/[id]` - Trade detail with legs and annotation
- `PUT /api/trades/[id]/annotation` - Update trade annotation
- `GET /api/accounts` - List accounts
- `POST /api/import` - Import IBKR Flex XML
- `POST /api/seed` - Generate test data
- `GET /api/setup-types` - List setup types
- `POST /api/setup-types` - Create setup type
- `PUT /api/setup-types/[id]` - Update setup type
- `DELETE /api/setup-types/[id]` - Delete setup type

---

## File Structure

```
src/
├── app/
│   ├── page.tsx              # Main trades dashboard
│   ├── import/page.tsx       # Import page
│   └── api/
│       ├── trades/
│       ├── accounts/
│       ├── import/
│       ├── seed/
│       └── setup-types/
├── components/
│   ├── trade-table.tsx       # Main trade list
│   ├── trade-panel.tsx       # Slide-out detail panel
│   ├── annotation-form.tsx   # Trade annotation form
│   ├── period-dropdown.tsx   # Period pills + More dropdown
│   ├── period-stats.tsx      # Stats bar
│   ├── user-menu.tsx         # User menu with account selector
│   ├── settings-modal.tsx    # Settings modal
│   ├── setup-type-dropdown.tsx
│   └── import-dropzone.tsx
├── lib/
│   ├── supabase.ts
│   ├── trade-matcher.ts      # FIFO matching algorithm
│   └── bloom-menu.tsx        # Patched menu component
└── types/
    └── database.ts
```

---

## Recent Changes

- Moved account selector into user menu
- Replaced period dropdown with inline pills
- Added "More" dropdown with time ranges and trade count options
- Added Last 10/20/50 trades filtering
- Setup types are now database-backed and configurable in Settings
- Changed date format to UK style (d/m/yy)
- Fixed column header alignment for right-aligned data
- Improved menu sizing with ResizeObserver
- Removed stats page (deferred to Phase 2)
- Added cursor pointers to interactive elements

---

## Design Principles

1. **Clean, minimal UI** - Focus on data, reduce visual noise
2. **Fast data access** - Quick filtering and navigation
3. **Trade-first approach** - Prioritize viewing and annotating trades
4. **Iterative releases** - Ship core features first, add analytics later

---

## Development

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
```

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```
