# Trade Analytics

A trade journaling and analytics platform for discretionary breakout traders.

Built for IBKR users following Qullamaggie-style momentum trading.

## Features

- **Auto-import trades** from IBKR Flex XML reports
- **FIFO trade matching** with support for partials (add, trim, scale)
- **A+ setup checklist** for trade annotation
- **Performance analytics** segmented by setup type, grade, market regime
- **Rule adherence tracking** to identify what's costing you money
- **Multi-account support** (ISA + Margin)

## Tech Stack

- **Frontend:** Next.js + React + Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** Supabase (PostgreSQL)
- **Hosting:** Vercel
- **Screenshots:** Cloudflare R2 (planned)
- **Email:** Resend (planned)

## Quick Start

See [SETUP.md](./SETUP.md) for full deployment instructions.

```bash
# Install dependencies
npm install

# Copy environment file and fill in your values
cp .env.example .env.local

# Run locally
npm run dev
```

## Project Structure

```
src/
├── app/                    # Next.js pages and API routes
│   ├── api/               # REST API endpoints
│   ├── trades/            # Trade list and detail pages
│   ├── import/            # Flex XML import page
│   └── stats/             # Analytics page
├── components/            # React components
├── lib/                   # Business logic
│   ├── flex-parser.ts    # IBKR XML parsing
│   ├── trade-matcher.ts  # FIFO matching algorithm
│   ├── analytics.ts      # Performance calculations
│   └── db/               # Database operations
└── types/                # TypeScript definitions

supabase/
└── schema.sql            # Database schema with RLS policies
```

## A+ Checklist

The annotation system implements a full pre-trade checklist:

1. Market Context (bullish conditions)
2. Stock Selection (momentum leader, RS>90, ADR>4-5%)
3. Prior Uptrend (clear strong pole)
4. Consolidation Structure (orderly, not choppy)
5. Moving Average Support (near rising 10/20d, MAs stacked)
6. Volatility Contraction (quantitative check required for A+)
7. Volume Pattern (contracted, low on tight days)
8. Pivot & Risk Definition (clear trigger, logical stop)
9. Context (leading sector, recent catalyst)

## License

Private project.
