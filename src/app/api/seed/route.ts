import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Popular momentum/breakout stocks for realistic dummy data
const TICKERS = [
  'NVDA', 'TSLA', 'AMD', 'META', 'AAPL', 'MSFT', 'GOOGL', 'AMZN',
  'NFLX', 'CRWD', 'SNOW', 'PLTR', 'COIN', 'SHOP', 'SQ', 'ROKU',
  'DKNG', 'AFRM', 'UPST', 'SOFI', 'RIVN', 'LCID', 'NIO', 'XPEV',
  'SMCI', 'ARM', 'PANW', 'ZS', 'NET', 'DDOG', 'MDB', 'CFLT',
];

const SETUP_TYPES = ['EP', 'FLAG', 'BASE_BREAKOUT'] as const;
const MARKET_REGIMES = ['STRONG_UPTREND', 'UPTREND_CHOP', 'SIDEWAYS'] as const;
const GRADES = ['A+', 'A', 'B', 'C', 'F'] as const;

function randomElement<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateDummyTrades(count: number, year: number = 2026, distributed: boolean = false) {
  const trades = [];
  const startDate = new Date(`${year}-01-02`);
  const endDate = new Date(`${year}-12-28`);

  for (let i = 0; i < count; i++) {
    const ticker = randomElement(TICKERS);

    let entryDate: Date;
    if (distributed) {
      // Distribute evenly across weeks of the year
      const weekNumber = Math.floor((i / count) * 52) + 1;
      const dayOfWeek = Math.floor(Math.random() * 5) + 1; // Mon-Fri (1-5)
      entryDate = new Date(`${year}-01-01`);
      entryDate.setDate(entryDate.getDate() + (weekNumber - 1) * 7 + dayOfWeek);
      entryDate.setHours(9 + Math.floor(Math.random() * 6), Math.floor(Math.random() * 60));
    } else {
      entryDate = randomDate(startDate, endDate);
    }

    // Random holding period: 0-5 days
    const holdingDays = Math.floor(Math.random() * 6);
    const exitDate = new Date(entryDate);
    exitDate.setDate(exitDate.getDate() + holdingDays);
    exitDate.setHours(entryDate.getHours() + Math.floor(Math.random() * 6));

    // Price between $20 and $500
    const entryPrice = randomBetween(20, 500);

    // Win rate ~45%, with varying magnitude
    const isWinner = Math.random() < 0.45;
    const movePercent = isWinner
      ? randomBetween(0.02, 0.15)  // Winners: 2-15%
      : randomBetween(-0.08, -0.01); // Losers: 1-8% loss

    const exitPrice = entryPrice * (1 + movePercent);

    // Position size: 100-1000 shares
    const shares = Math.floor(randomBetween(100, 1000) / 50) * 50;

    // Commission: ~$1-5
    const commission = randomBetween(1, 5);

    const realizedPnl = (exitPrice - entryPrice) * shares - commission;

    // Account: 60% margin, 40% ISA
    const accountId = Math.random() < 0.6 ? 'MARGIN' : 'ISA';

    trades.push({
      ticker,
      accountId,
      entryDate,
      exitDate,
      entryPrice: Math.round(entryPrice * 100) / 100,
      exitPrice: Math.round(exitPrice * 100) / 100,
      shares,
      commission: Math.round(commission * 100) / 100,
      realizedPnl: Math.round(realizedPnl * 100) / 100,
      isWinner,
    });
  }

  // Sort by entry date
  trades.sort((a, b) => a.entryDate.getTime() - b.entryDate.getTime());

  return trades;
}

function generateChecklist(isGoodSetup: boolean) {
  const check = (prob: number) => Math.random() < prob;
  const goodProb = isGoodSetup ? 0.85 : 0.4;
  const reqProb = isGoodSetup ? 0.95 : 0.3;

  return {
    marketContext: { bullishConditions: check(goodProb) },
    stockSelection: {
      momentumLeader: check(goodProb),
      highRS: check(goodProb),
      sufficientVolume: check(0.9),
      sufficientADR: check(goodProb),
    },
    priorUptrend: { clearStrongUptrend: check(goodProb) },
    consolidation: {
      orderlyPattern: check(goodProb),
      notChoppy: check(goodProb),
      stillInRange: check(goodProb),
    },
    maSupport: {
      nearRisingMA: check(goodProb),
      masStacked: check(goodProb),
    },
    volatilityContraction: {
      visuallyTighter: check(reqProb),
      quantitativeCheck: check(reqProb),
      tightnessNearPivot: check(reqProb),
    },
    volumePattern: {
      volumeContracted: check(goodProb),
      lowVolumeTightDays: check(goodProb),
    },
    pivotAndRisk: {
      clearPivot: check(0.9),
      logicalStop: check(0.85),
      acceptableRisk: check(0.8),
    },
    context: {
      leadingSector: check(0.6),
      recentCatalyst: check(0.4),
    },
  };
}

export async function POST(request: Request) {
  try {
    // Get params from query string
    const url = new URL(request.url);
    const count = parseInt(url.searchParams.get('count') || '50');
    const year = parseInt(url.searchParams.get('year') || '2026');
    const append = url.searchParams.get('append') === 'true';
    const distributed = url.searchParams.get('distributed') === 'true';

    // Clear existing data first (unless appending)
    if (!append) {
      await supabase.from('trade_annotations').delete().neq('trade_id', 0);
      await supabase.from('trade_legs').delete().neq('id', 0);
      await supabase.from('trades').delete().neq('id', 0);
      await supabase.from('executions').delete().neq('id', 0);
    }

    // Generate dummy trades
    const dummyTrades = generateDummyTrades(count, year, distributed);

    let executionCounter = 1;
    let insertedTrades = 0;
    let insertedExecutions = 0;

    for (const trade of dummyTrades) {
      // Create entry execution
      const entryExecId = `DUMMY-${Date.now()}-${executionCounter++}`;
      const { error: entryExecError } = await supabase.from('executions').insert({
        execution_id: entryExecId,
        account_id: trade.accountId,
        order_id: `ORD-${executionCounter}`,
        ticker: trade.ticker,
        executed_at: trade.entryDate.toISOString(),
        side: 'BUY',
        quantity: trade.shares,
        price: trade.entryPrice,
        commission: trade.commission / 2,
        net_cash: -(trade.shares * trade.entryPrice + trade.commission / 2),
        exchange: 'SMART',
      });

      if (entryExecError) {
        console.error('Entry exec error:', entryExecError);
        continue;
      }
      insertedExecutions++;

      // Create exit execution
      const exitExecId = `DUMMY-${Date.now()}-${executionCounter++}`;
      const { error: exitExecError } = await supabase.from('executions').insert({
        execution_id: exitExecId,
        account_id: trade.accountId,
        order_id: `ORD-${executionCounter}`,
        ticker: trade.ticker,
        executed_at: trade.exitDate.toISOString(),
        side: 'SELL',
        quantity: trade.shares,
        price: trade.exitPrice,
        commission: trade.commission / 2,
        net_cash: trade.shares * trade.exitPrice - trade.commission / 2,
        exchange: 'SMART',
      });

      if (exitExecError) {
        console.error('Exit exec error:', exitExecError);
        continue;
      }
      insertedExecutions++;

      // Create trade record
      const { data: tradeData, error: tradeError } = await supabase
        .from('trades')
        .insert({
          account_id: trade.accountId,
          ticker: trade.ticker,
          direction: 'LONG',
          status: 'CLOSED',
          entry_datetime: trade.entryDate.toISOString(),
          exit_datetime: trade.exitDate.toISOString(),
          entry_price: trade.entryPrice,
          exit_price: trade.exitPrice,
          total_shares: trade.shares,
          remaining_shares: 0,
          realized_pnl: trade.realizedPnl,
          total_commission: trade.commission,
        })
        .select('id')
        .single();

      if (tradeError) {
        console.error('Trade error:', tradeError);
        continue;
      }
      insertedTrades++;

      const tradeId = tradeData.id;

      // Create trade legs
      await supabase.from('trade_legs').insert([
        {
          trade_id: tradeId,
          execution_id: entryExecId,
          leg_type: 'ENTRY',
          shares: trade.shares,
          price: trade.entryPrice,
          executed_at: trade.entryDate.toISOString(),
        },
        {
          trade_id: tradeId,
          execution_id: exitExecId,
          leg_type: 'EXIT',
          shares: trade.shares,
          price: trade.exitPrice,
          executed_at: trade.exitDate.toISOString(),
        },
      ]);

      // Add annotation for ~70% of trades
      if (Math.random() < 0.7) {
        const isGoodSetup = trade.isWinner ? Math.random() < 0.7 : Math.random() < 0.3;
        const grade = isGoodSetup
          ? randomElement(['A+', 'A', 'B'] as const)
          : randomElement(['B', 'C', 'F'] as const);

        const riskPercent = randomBetween(0.03, 0.08);
        const initialRisk = trade.entryPrice * trade.shares * riskPercent;

        const followedPlan = isGoodSetup ? Math.random() < 0.8 : Math.random() < 0.5;
        const generatedChecklist = generateChecklist(isGoodSetup);
        // Calculate setup rating from checklist
        const sections = [
          generatedChecklist.marketContext,
          generatedChecklist.stockSelection,
          generatedChecklist.priorUptrend,
          generatedChecklist.consolidation,
          generatedChecklist.maSupport,
          generatedChecklist.volatilityContraction,
          generatedChecklist.volumePattern,
          generatedChecklist.pivotAndRisk,
          generatedChecklist.context,
        ];
        const setupRating = sections.filter(section =>
          Object.values(section).every(Boolean)
        ).length;

        await supabase.from('trade_annotations').insert({
          trade_id: tradeId,
          grade,
          setup_rating: setupRating,
          followed_plan: followedPlan,
          setup_type: randomElement(SETUP_TYPES),
          market_regime: randomElement(MARKET_REGIMES),
          initial_risk_dollars: Math.round(initialRisk * 100) / 100,
          initial_stop_price: Math.round(trade.entryPrice * (1 - riskPercent) * 100) / 100,
          checklist: generatedChecklist,
          notes: followedPlan
            ? 'Executed according to plan.'
            : 'Deviated from plan - need to review execution.',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${insertedTrades} trades and ${insertedExecutions} executions`,
      trades: insertedTrades,
      executions: insertedExecutions,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: 'Seeding failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Also support GET for easy browser testing
export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint to seed 100 dummy trades',
    usage: 'curl -X POST http://localhost:3000/api/seed',
  });
}
