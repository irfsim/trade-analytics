import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import {
  isSupabaseConfigured,
  createSeededRandom,
  generateDeterministicTrades,
  generateChecklist,
} from '@/lib/dummy-data';

const SETUP_TYPES = ['EP', 'FLAG', 'BASE_BREAKOUT'] as const;

export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      success: true,
      message: 'Demo data already loaded (in-memory mode)',
      trades: 940,
      executions: 1880,
      annotations: 658,
    });
  }

  try {
    const supabase = createAdminClient();
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
      market_condition: string;
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

      // Market condition - weighted distribution: 50% uptrends, 30% choppy, 20% bearish
      const marketRoll = annotationRandom();
      let marketCondition: string;
      if (marketRoll < 0.30) marketCondition = 'STRONG_UPTREND';
      else if (marketRoll < 0.50) marketCondition = 'UPTREND_CHOP';
      else if (marketRoll < 0.70) marketCondition = 'SIDEWAYS';
      else if (marketRoll < 0.85) marketCondition = 'DOWNTREND';
      else marketCondition = 'CORRECTION';

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
        market_condition: marketCondition,
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
    message: 'POST to this endpoint to seed 940 deterministic demo trades',
    usage: 'curl -X POST http://localhost:3000/api/seed',
    details: {
      trades: 940,
      dateRange: 'Jan 1, 2025 - Feb 4, 2026',
      winRate: '22.23%',
      avgWin: '14.12%',
      avgLoss: '2.08%',
      avgWinnerHold: '3.79 days',
      avgLoserHold: '1.31 days',
      avgPositionSize: '$9k',
    },
  });
}
