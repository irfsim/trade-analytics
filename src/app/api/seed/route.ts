import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Seeded PRNG for deterministic data generation (Mulberry32)
function createSeededRandom(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// US momentum/breakout stocks
const TICKERS = [
  'NVDA', 'TSLA', 'AMD', 'META', 'AAPL', 'MSFT', 'GOOGL', 'AMZN',
  'NFLX', 'CRWD', 'SNOW', 'PLTR', 'COIN', 'SQ', 'ROKU', 'DKNG',
  'AFRM', 'UPST', 'SOFI', 'RIVN', 'SMCI', 'ARM', 'PANW', 'ZS',
  'NET', 'DDOG', 'MDB', 'CFLT', 'ABNB', 'UBER', 'DASH', 'RBLX',
  'U', 'PATH', 'OKTA', 'CRSP', 'BILL', 'HUBS', 'TTD', 'ENPH',
];

const SETUP_TYPES = ['EP', 'FLAG', 'BASE_BREAKOUT'] as const;
const MARKET_REGIMES = ['STRONG_UPTREND', 'UPTREND_CHOP', 'SIDEWAYS'] as const;

// Deterministic trade generation with user requirements:
// - Date range: Jan 1, 2025 to Feb 4, 2026
// - 500 trades distributed throughout
// - 25% win rate
// - Avg loss ~3%, avg win ~9% with outliers
// - Avg position size ~$9k
function generateDeterministicTrades() {
  const SEED = 42;
  const random = createSeededRandom(SEED);

  const trades = [];
  const count = 500;
  const startDate = new Date('2025-01-01T00:00:00Z');
  const endDate = new Date('2026-02-04T23:59:59Z');
  const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // Helper functions using seeded random
  const seededElement = <T,>(arr: readonly T[]): T => arr[Math.floor(random() * arr.length)];
  const seededBetween = (min: number, max: number): number => random() * (max - min) + min;
  const gaussianRandom = (): number => {
    // Box-Muller transform for normal distribution
    const u1 = random();
    const u2 = random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };

  for (let i = 0; i < count; i++) {
    const ticker = seededElement(TICKERS);

    // Distribute trades evenly across the date range
    const dayOffset = Math.floor((i / count) * totalDays);
    const entryDate = new Date(startDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    // Add some hour variation (market hours 9:30-16:00)
    entryDate.setUTCHours(14 + Math.floor(random() * 5), Math.floor(random() * 60));

    // Skip weekends
    const dayOfWeek = entryDate.getUTCDay();
    if (dayOfWeek === 0) entryDate.setDate(entryDate.getDate() + 1);
    if (dayOfWeek === 6) entryDate.setDate(entryDate.getDate() + 2);

    // Holding period: 0-5 days
    const holdingDays = Math.floor(random() * 6);
    const exitDate = new Date(entryDate);
    exitDate.setDate(exitDate.getDate() + holdingDays);
    exitDate.setUTCHours(entryDate.getUTCHours() + Math.floor(random() * 4));

    // Price between $30 and $400 (realistic for these stocks)
    const entryPrice = seededBetween(30, 400);

    // 25% win rate
    const isWinner = random() < 0.25;

    let movePercent: number;
    if (isWinner) {
      // Winners: avg 9% with outliers (some 15-25% runners)
      const base = 0.09;
      const variation = gaussianRandom() * 0.04; // std dev 4%
      movePercent = base + variation;
      // 10% chance of outlier winner (15-30%)
      if (random() < 0.10) {
        movePercent = seededBetween(0.15, 0.30);
      }
      movePercent = Math.max(0.02, movePercent); // min 2% win
    } else {
      // Losers: avg 3% loss with some outliers
      const base = -0.03;
      const variation = gaussianRandom() * 0.015; // std dev 1.5%
      movePercent = base + variation;
      // 5% chance of outlier loss (8-15%)
      if (random() < 0.05) {
        movePercent = seededBetween(-0.15, -0.08);
      }
      movePercent = Math.min(-0.005, movePercent); // min 0.5% loss
      movePercent = Math.max(-0.20, movePercent); // max 20% loss
    }

    const exitPrice = entryPrice * (1 + movePercent);

    // Position size: target ~$9k average
    // Use log-normal distribution for realistic position sizing
    const targetPosition = 9000;
    const positionMultiplier = Math.exp(gaussianRandom() * 0.3); // log-normal with ~30% std dev
    const positionValue = targetPosition * positionMultiplier;
    const shares = Math.max(10, Math.round(positionValue / entryPrice / 10) * 10);

    // Commission: ~$1-3
    const commission = seededBetween(1, 3);

    const realizedPnl = (exitPrice - entryPrice) * shares - commission;

    // Account: 60% margin, 40% ISA
    const accountId = random() < 0.6 ? 'MARGIN' : 'ISA';

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

function generateChecklist(isGoodSetup: boolean, random: () => number) {
  const check = (prob: number) => random() < prob;
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

export async function POST() {
  try {
    // Clear existing data first (use gte to match all records)
    await supabase.from('trade_annotations').delete().gte('trade_id', 0);
    await supabase.from('trade_legs').delete().gte('id', 0);
    await supabase.from('trades').delete().gte('id', 0);
    await supabase.from('executions').delete().like('execution_id', '%');

    // Generate deterministic trades (same every time)
    const dummyTrades = generateDeterministicTrades();

    // Create a separate seeded random for annotations (also deterministic)
    const ANNOTATION_SEED = 123;
    const annotationRandom = createSeededRandom(ANNOTATION_SEED);
    const seededElement = <T,>(arr: readonly T[]): T => arr[Math.floor(annotationRandom() * arr.length)];
    const seededBetween = (min: number, max: number): number => annotationRandom() * (max - min) + min;

    // Prepare all data for batch inserts
    const allExecutions: Array<{
      execution_id: string;
      account_id: string;
      order_id: string;
      ticker: string;
      executed_at: string;
      side: string;
      quantity: number;
      price: number;
      commission: number;
      net_cash: number;
      exchange: string;
    }> = [];

    const allTrades: Array<{
      account_id: string;
      ticker: string;
      direction: string;
      status: string;
      entry_datetime: string;
      exit_datetime: string;
      entry_price: number;
      exit_price: number;
      total_shares: number;
      remaining_shares: number;
      realized_pnl: number;
      total_commission: number;
    }> = [];

    // Store trade metadata for legs/annotations (indexed by position)
    const tradeMetadata: Array<{
      entryExecId: string;
      exitExecId: string;
      entryDate: Date;
      exitDate: Date;
      entryPrice: number;
      exitPrice: number;
      shares: number;
      isWinner: boolean;
    }> = [];

    let executionCounter = 1;

    // Build execution and trade arrays
    for (const trade of dummyTrades) {
      const entryExecId = `DUMMY-ENTRY-${executionCounter++}`;
      const exitExecId = `DUMMY-EXIT-${executionCounter++}`;

      allExecutions.push({
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

      allExecutions.push({
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

      allTrades.push({
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
      });

      tradeMetadata.push({
        entryExecId,
        exitExecId,
        entryDate: trade.entryDate,
        exitDate: trade.exitDate,
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice,
        shares: trade.shares,
        isWinner: trade.isWinner,
      });
    }

    // Batch insert executions (in chunks of 100 to avoid payload limits)
    const CHUNK_SIZE = 100;
    for (let i = 0; i < allExecutions.length; i += CHUNK_SIZE) {
      const chunk = allExecutions.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase.from('executions').insert(chunk);
      if (error) {
        console.error('Execution batch error:', error);
        throw new Error(`Failed to insert executions: ${error.message}`);
      }
    }

    // Batch insert trades and get back IDs
    const insertedTradeIds: number[] = [];
    for (let i = 0; i < allTrades.length; i += CHUNK_SIZE) {
      const chunk = allTrades.slice(i, i + CHUNK_SIZE);
      const { data, error } = await supabase.from('trades').insert(chunk).select('id');
      if (error) {
        console.error('Trade batch error:', error);
        throw new Error(`Failed to insert trades: ${error.message}`);
      }
      insertedTradeIds.push(...(data?.map(t => t.id) || []));
    }

    // Build legs array using trade IDs
    const allLegs: Array<{
      trade_id: number;
      execution_id: string;
      leg_type: string;
      shares: number;
      price: number;
      executed_at: string;
    }> = [];

    for (let i = 0; i < insertedTradeIds.length; i++) {
      const tradeId = insertedTradeIds[i];
      const meta = tradeMetadata[i];

      allLegs.push({
        trade_id: tradeId,
        execution_id: meta.entryExecId,
        leg_type: 'ENTRY',
        shares: meta.shares,
        price: meta.entryPrice,
        executed_at: meta.entryDate.toISOString(),
      });

      allLegs.push({
        trade_id: tradeId,
        execution_id: meta.exitExecId,
        leg_type: 'EXIT',
        shares: meta.shares,
        price: meta.exitPrice,
        executed_at: meta.exitDate.toISOString(),
      });
    }

    // Batch insert legs
    for (let i = 0; i < allLegs.length; i += CHUNK_SIZE) {
      const chunk = allLegs.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase.from('trade_legs').insert(chunk);
      if (error) {
        console.error('Legs batch error:', error);
        throw new Error(`Failed to insert legs: ${error.message}`);
      }
    }

    // Build annotations array (for ~70% of trades, deterministic)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allAnnotations: Array<any> = [];

    for (let i = 0; i < insertedTradeIds.length; i++) {
      const tradeId = insertedTradeIds[i];
      const meta = tradeMetadata[i];

      // Add annotation for ~70% of trades (deterministic)
      if (annotationRandom() < 0.7) {
        const isGoodSetup = meta.isWinner ? annotationRandom() < 0.7 : annotationRandom() < 0.3;
        const grade = isGoodSetup
          ? seededElement(['A+', 'A', 'B'] as const)
          : seededElement(['B', 'C', 'F'] as const);

        const riskPercent = seededBetween(0.03, 0.08);
        const initialRisk = meta.entryPrice * meta.shares * riskPercent;

        const followedPlan = isGoodSetup ? annotationRandom() < 0.8 : annotationRandom() < 0.5;
        const generatedChecklist = generateChecklist(isGoodSetup, annotationRandom);

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

        allAnnotations.push({
          trade_id: tradeId,
          grade,
          setup_rating: setupRating,
          followed_plan: followedPlan,
          setup_type: seededElement(SETUP_TYPES),
          market_regime: seededElement(MARKET_REGIMES),
          initial_risk_dollars: Math.round(initialRisk * 100) / 100,
          initial_stop_price: Math.round(meta.entryPrice * (1 - riskPercent) * 100) / 100,
          checklist: generatedChecklist,
          notes: followedPlan
            ? 'Executed according to plan.'
            : 'Deviated from plan - need to review execution.',
        });
      }
    }

    // Batch insert annotations
    for (let i = 0; i < allAnnotations.length; i += CHUNK_SIZE) {
      const chunk = allAnnotations.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase.from('trade_annotations').insert(chunk);
      if (error) {
        console.error('Annotations batch error:', error);
        throw new Error(`Failed to insert annotations: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${insertedTradeIds.length} trades and ${allExecutions.length} executions`,
      trades: insertedTradeIds.length,
      executions: allExecutions.length,
      annotations: allAnnotations.length,
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
    message: 'POST to this endpoint to seed 500 deterministic demo trades',
    usage: 'curl -X POST http://localhost:3000/api/seed',
    details: {
      trades: 500,
      dateRange: 'Jan 1, 2025 - Feb 4, 2026',
      winRate: '25%',
      avgWin: '9%',
      avgLoss: '3%',
      avgPositionSize: '$9k',
    },
  });
}
