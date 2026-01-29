import { NextResponse } from 'next/server';
import { parseFlexXml, toExecutionInserts } from '@/lib/flex-parser';
import { matchExecutionsToTrades } from '@/lib/trade-matcher';
import { insertExecutions, getExecutions } from '@/lib/db/executions';
import { insertTrades } from '@/lib/db/trades';

const IBKR_FLEX_BASE = 'https://gdcdyn.interactivebrokers.com/Universal/servlet/FlexStatementService';

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

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface FlexRequestResponse {
  Status: string;
  ReferenceCode?: string;
  ErrorCode?: string;
  ErrorMessage?: string;
}

interface FlexStatementResponse {
  Status: string;
  ErrorCode?: string;
  ErrorMessage?: string;
}

/**
 * Request a Flex statement from IBKR
 * Returns a reference code to poll for the result
 */
async function requestFlexStatement(token: string, queryId: string): Promise<string> {
  const url = `${IBKR_FLEX_BASE}.SendRequest?t=${token}&q=${queryId}&v=3`;

  const res = await fetch(url);
  const text = await res.text();

  // Parse XML response
  // Format: <FlexStatementResponse><Status>Success</Status><ReferenceCode>123456</ReferenceCode></FlexStatementResponse>
  const statusMatch = text.match(/<Status>([^<]+)<\/Status>/);
  const refCodeMatch = text.match(/<ReferenceCode>([^<]+)<\/ReferenceCode>/);
  const errorMatch = text.match(/<ErrorMessage>([^<]+)<\/ErrorMessage>/);

  const status = statusMatch?.[1];

  if (status !== 'Success' && status !== 'Warn') {
    const errorMsg = errorMatch?.[1] || 'Unknown error';
    throw new Error(`IBKR request failed: ${errorMsg}`);
  }

  const referenceCode = refCodeMatch?.[1];
  if (!referenceCode) {
    throw new Error('No reference code in IBKR response');
  }

  return referenceCode;
}

/**
 * Poll for and retrieve the Flex statement
 * IBKR may take a few seconds to generate the report
 */
async function getFlexStatement(token: string, referenceCode: string, maxAttempts = 10): Promise<string> {
  const url = `${IBKR_FLEX_BASE}.GetStatement?q=${referenceCode}&t=${token}&v=3`;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url);
    const text = await res.text();

    // Check if it's still processing
    if (text.includes('<Status>') && text.includes('Statement generation in progress')) {
      console.log(`IBKR statement generation in progress, attempt ${attempt}/${maxAttempts}`);
      await sleep(2000); // Wait 2 seconds before retrying
      continue;
    }

    // Check for errors
    const errorMatch = text.match(/<ErrorMessage>([^<]+)<\/ErrorMessage>/);
    if (errorMatch && !text.includes('<FlexStatement')) {
      throw new Error(`IBKR error: ${errorMatch[1]}`);
    }

    // Should have the actual Flex XML now
    if (text.includes('<FlexStatement') || text.includes('<FlexQueryResponse')) {
      return text;
    }

    // Unknown response, wait and retry
    await sleep(2000);
  }

  throw new Error('Timeout waiting for IBKR statement generation');
}

/**
 * Sync trades from IBKR Flex Web Service
 * POST /api/sync - triggers a sync
 * GET /api/sync - returns sync status/info
 */
export async function POST() {
  try {
    const token = process.env.IBKR_FLEX_TOKEN;
    const queryId = process.env.IBKR_FLEX_QUERY_ID;

    if (!token || !queryId) {
      return NextResponse.json(
        {
          error: 'IBKR Flex credentials not configured',
          details: 'Set IBKR_FLEX_TOKEN and IBKR_FLEX_QUERY_ID in environment variables'
        },
        { status: 400 }
      );
    }

    // Step 1: Request the statement
    console.log('Requesting IBKR Flex statement...');
    const referenceCode = await requestFlexStatement(token, queryId);
    console.log(`Got reference code: ${referenceCode}`);

    // Step 2: Poll for and retrieve the statement
    console.log('Fetching IBKR Flex statement...');
    const xmlContent = await getFlexStatement(token, referenceCode);
    console.log(`Got statement XML (${xmlContent.length} bytes)`);

    // Step 3: Parse the Flex XML
    const parseResult = parseFlexXml(xmlContent);

    if (!parseResult.success && parseResult.executions.length === 0) {
      return NextResponse.json(
        { error: 'Failed to parse Flex XML', details: parseResult.errors },
        { status: 400 }
      );
    }

    // Step 4: Map account IDs and convert to database format
    const accountMapping = getAccountMapping();
    const executionsToInsert = toExecutionInserts(parseResult.executions, accountMapping);

    // Step 5: Insert executions (skip duplicates)
    const insertResult = await insertExecutions(executionsToInsert);

    // Step 6: If new executions were inserted, re-match all trades
    let matchResult = { inserted: 0, errors: [] as string[] };

    if (insertResult.inserted > 0) {
      const allExecutions = await getExecutions();
      const matched = matchExecutionsToTrades(allExecutions);
      matchResult = await insertTrades(matched.trades);
    }

    return NextResponse.json({
      success: true,
      synced_at: new Date().toISOString(),
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
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const token = process.env.IBKR_FLEX_TOKEN;
  const queryId = process.env.IBKR_FLEX_QUERY_ID;

  // Check if this is a Vercel cron request
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';

  // Also allow triggering via query param for testing
  const url = new URL(request.url);
  const triggerSync = url.searchParams.get('run') === 'true';

  if (isVercelCron || triggerSync) {
    // Trigger the sync
    return POST();
  }

  return NextResponse.json({
    configured: !!(token && queryId),
    hasToken: !!token,
    hasQueryId: !!queryId,
    usage: 'POST to this endpoint to sync trades from IBKR',
    cronSchedule: '21:30 UTC weekdays (9:30pm GMT)',
    setup: {
      step1: 'Log into IBKR Portal > Reports > Flex Queries',
      step2: 'Create a new Flex Query for Trade Confirmations',
      step3: 'Enable Flex Web Service and copy the token',
      step4: 'Set IBKR_FLEX_TOKEN and IBKR_FLEX_QUERY_ID in .env.local',
    }
  });
}
