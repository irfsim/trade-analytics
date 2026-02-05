import { NextRequest, NextResponse } from 'next/server';
import { parseFlexXml, toExecutionInserts } from '@/lib/flex-parser';
import { matchExecutionsToTrades } from '@/lib/trade-matcher';
import { insertExecutions, getExecutions } from '@/lib/db/executions';
import { insertTrades } from '@/lib/db/trades';
import { cacheTradeChartData } from '@/lib/chart-cache';
import { getMarketConditionsForDates, dateKeyFromDatetime, type MarketCondition } from '@/lib/market-condition';

// Account mapping from environment
function getAccountMapping(): Record<string, string> {
  const mapping = process.env.IBKR_ACCOUNT_MAP;
  if (!mapping) return {};
  try {
    return JSON.parse(mapping);
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read file content
    const xmlContent = await file.text();

    // Parse the Flex XML
    const parseResult = parseFlexXml(xmlContent);

    if (!parseResult.success && parseResult.executions.length === 0) {
      return NextResponse.json(
        { error: 'Failed to parse Flex XML', details: parseResult.errors },
        { status: 400 }
      );
    }

    // Map account IDs and convert to database format
    const accountMapping = getAccountMapping();
    const executionsToInsert = toExecutionInserts(parseResult.executions, accountMapping);

    // Insert executions (skip duplicates)
    const insertResult = await insertExecutions(executionsToInsert);

    // If new executions were inserted, re-match all trades
    let matchResult = { inserted: 0, errors: [] as string[] };

    if (insertResult.inserted > 0) {
      // Get all executions and re-match
      const allExecutions = await getExecutions();
      const matched = matchExecutionsToTrades(allExecutions);

      // Get unique entry dates for market condition lookup
      const entryDates = [
        ...new Set(
          matched.trades.map((t) => dateKeyFromDatetime(t.entryDatetime.toISOString()))
        ),
      ];

      // Fetch market conditions for entry dates
      let marketConditions: Map<string, MarketCondition> = new Map();
      try {
        marketConditions = await getMarketConditionsForDates(entryDates);
        console.log(`[Import] Fetched market conditions for ${marketConditions.size} dates`);
      } catch (err) {
        console.error('[Import] Failed to fetch market conditions:', err);
      }

      // Attach market conditions to trades
      for (const trade of matched.trades) {
        const dateKey = dateKeyFromDatetime(trade.entryDatetime.toISOString());
        const condition = marketConditions.get(dateKey);
        if (condition) {
          trade.marketCondition = condition;
        }
      }

      // Insert matched trades
      matchResult = await insertTrades(matched.trades);

      // Cache intraday chart data for closed trades (async, don't block response)
      const closedTrades = matched.trades.filter((t) => t.status === 'CLOSED');
      if (closedTrades.length > 0) {
        // Run caching in background - don't await to avoid blocking import
        cacheTradeChartData(
          closedTrades.map((t) => ({
            ticker: t.ticker,
            entry_datetime: t.entryDatetime.toISOString(),
            exit_datetime: t.exitDatetime?.toISOString() || null,
            status: t.status,
          }))
        ).catch((err) => {
          console.error('[Import] Chart caching failed:', err);
        });
      }
    }

    return NextResponse.json({
      success: true,
      executions: {
        parsed: parseResult.executions.length,
        inserted: insertResult.inserted,
        skipped: insertResult.skipped,
        errors: insertResult.errors,
      },
      trades: {
        matched: matchResult.inserted,
        errors: matchResult.errors,
      },
      parseErrors: parseResult.errors,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Import failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
