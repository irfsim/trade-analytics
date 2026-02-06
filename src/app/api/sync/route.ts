import { NextResponse } from 'next/server';
import { parseFlexXml, toExecutionInserts } from '@/lib/flex-parser';
import { matchExecutionsToTrades } from '@/lib/trade-matcher';
import { insertExecutions, getExecutions } from '@/lib/db/executions';
import { insertTrades } from '@/lib/db/trades';
import {
  getActiveConnections,
  getAccountMappingFromLinks,
  createSyncHistory,
  completeSyncHistory,
  updateConnectionStatus,
  updateConnectionLastSync,
} from '@/lib/db/connections';
import { getBrokerAdapter } from '@/lib/brokers';

const IBKR_FLEX_BASE = 'https://gdcdyn.interactivebrokers.com/Universal/servlet/FlexStatementService';

// Account mapping from environment (legacy mode)
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

/**
 * Request a Flex statement from IBKR (legacy mode)
 * Returns a reference code to poll for the result
 */
async function requestFlexStatement(token: string, queryId: string): Promise<string> {
  const url = `${IBKR_FLEX_BASE}.SendRequest?t=${token}&q=${queryId}&v=3`;

  const res = await fetch(url);
  const text = await res.text();

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
 * Poll for and retrieve the Flex statement (legacy mode)
 */
async function getFlexStatement(token: string, referenceCode: string, maxAttempts = 10): Promise<string> {
  const url = `${IBKR_FLEX_BASE}.GetStatement?q=${referenceCode}&t=${token}&v=3`;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url);
    const text = await res.text();

    if (text.includes('<Status>') && text.includes('Statement generation in progress')) {
      console.log(`IBKR statement generation in progress, attempt ${attempt}/${maxAttempts}`);
      await sleep(2000);
      continue;
    }

    const errorMatch = text.match(/<ErrorMessage>([^<]+)<\/ErrorMessage>/);
    if (errorMatch && !text.includes('<FlexStatement')) {
      throw new Error(`IBKR error: ${errorMatch[1]}`);
    }

    if (text.includes('<FlexStatement') || text.includes('<FlexQueryResponse')) {
      return text;
    }

    await sleep(2000);
  }

  throw new Error('Timeout waiting for IBKR statement generation');
}

/**
 * Sync all database connections
 */
async function syncAllConnections(): Promise<{
  success: boolean;
  results: Array<{
    connectionId: number;
    label: string;
    success: boolean;
    inserted?: number;
    skipped?: number;
    error?: string;
  }>;
}> {
  const connections = await getActiveConnections();

  if (connections.length === 0) {
    return { success: true, results: [] };
  }

  const results = [];

  for (const connection of connections) {
    const syncHistory = await createSyncHistory(connection.id, 'cron');

    try {
      const adapter = getBrokerAdapter(connection.broker_type);

      const fetchResult = await adapter.fetchExecutions({
        connectionId: connection.id,
        flexToken: connection.flex_token || undefined,
        flexQueryId: connection.flex_query_id || undefined,
      });

      if (!fetchResult.success) {
        await completeSyncHistory(syncHistory.id, {
          status: 'error',
          errorMessage: fetchResult.errors.join(', '),
        });
        await updateConnectionStatus(connection.id, 'error', fetchResult.errors.join(', '));

        results.push({
          connectionId: connection.id,
          label: connection.label,
          success: false,
          error: fetchResult.errors.join(', '),
        });
        continue;
      }

      const accountMapping = await getAccountMappingFromLinks(connection.id);
      const executionsToInsert = toExecutionInserts(fetchResult.executions, accountMapping);
      const insertResult = await insertExecutions(executionsToInsert);

      let tradesMatched = 0;
      if (insertResult.inserted > 0) {
        const allExecutions = await getExecutions();
        const matched = matchExecutionsToTrades(allExecutions);
        const tradeResult = await insertTrades(matched.trades);
        tradesMatched = tradeResult.inserted;
      }

      await completeSyncHistory(syncHistory.id, {
        status: 'success',
        executionsFetched: fetchResult.executions.length,
        executionsInserted: insertResult.inserted,
        executionsSkipped: insertResult.skipped,
        tradesMatched,
      });

      await updateConnectionStatus(connection.id, 'active');
      await updateConnectionLastSync(connection.id);

      results.push({
        connectionId: connection.id,
        label: connection.label,
        success: true,
        inserted: insertResult.inserted,
        skipped: insertResult.skipped,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      await completeSyncHistory(syncHistory.id, {
        status: 'error',
        errorMessage: errorMsg,
      });
      await updateConnectionStatus(connection.id, 'error', errorMsg);

      results.push({
        connectionId: connection.id,
        label: connection.label,
        success: false,
        error: errorMsg,
      });
    }
  }

  return {
    success: results.every(r => r.success),
    results,
  };
}

/**
 * Legacy sync using environment variables
 */
async function syncLegacyMode(): Promise<Response> {
  const token = process.env.IBKR_FLEX_TOKEN;
  const queryId = process.env.IBKR_FLEX_QUERY_ID;

  if (!token || !queryId) {
    return NextResponse.json(
      {
        error: 'IBKR Flex credentials not configured',
        details: 'Set IBKR_FLEX_TOKEN and IBKR_FLEX_QUERY_ID in environment variables',
      },
      { status: 400 }
    );
  }

  console.log('Requesting IBKR Flex statement (legacy mode)...');
  const referenceCode = await requestFlexStatement(token, queryId);
  console.log(`Got reference code: ${referenceCode}`);

  console.log('Fetching IBKR Flex statement...');
  const xmlContent = await getFlexStatement(token, referenceCode);
  console.log(`Got statement XML (${xmlContent.length} bytes)`);

  const parseResult = parseFlexXml(xmlContent);

  if (!parseResult.success && parseResult.executions.length === 0) {
    return NextResponse.json(
      { error: 'Failed to parse Flex XML', details: parseResult.errors },
      { status: 400 }
    );
  }

  const accountMapping = getAccountMapping();
  const executionsToInsert = toExecutionInserts(parseResult.executions, accountMapping);
  const insertResult = await insertExecutions(executionsToInsert);

  let matchResult = { inserted: 0, errors: [] as string[] };

  if (insertResult.inserted > 0) {
    const allExecutions = await getExecutions();
    const matched = matchExecutionsToTrades(allExecutions);
    matchResult = await insertTrades(matched.trades);
  }

  return NextResponse.json({
    success: true,
    mode: 'legacy',
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
}

/**
 * Sync trades from IBKR Flex Web Service
 * POST /api/sync - triggers a sync
 * GET /api/sync - returns sync status/info
 *
 * Supports two modes:
 * 1. Database mode: Uses broker_connections table
 * 2. Legacy mode: Uses environment variables (IBKR_FLEX_TOKEN, IBKR_FLEX_QUERY_ID)
 */
export async function POST(request: Request) {
  try {
    // Check for request body specifying mode
    const body = await request.json().catch(() => ({}));
    const useLegacy = body.legacy === true;

    // Check if database connections exist
    const connections = await getActiveConnections();
    const hasDbConnections = connections.length > 0;

    // Check if legacy env vars are configured
    const hasLegacyConfig = !!(process.env.IBKR_FLEX_TOKEN && process.env.IBKR_FLEX_QUERY_ID);

    // Decide which mode to use
    if (useLegacy && hasLegacyConfig) {
      return syncLegacyMode();
    }

    if (hasDbConnections) {
      // Database mode - sync all active connections
      console.log(`Syncing ${connections.length} database connection(s)...`);
      const result = await syncAllConnections();

      return NextResponse.json({
        success: result.success,
        mode: 'database',
        synced_at: new Date().toISOString(),
        connections_synced: result.results.length,
        results: result.results,
      });
    }

    if (hasLegacyConfig) {
      // Fall back to legacy mode
      return syncLegacyMode();
    }

    // No configuration at all
    return NextResponse.json(
      {
        error: 'No sync configuration found',
        details: 'Either connect an IBKR account via the app, or set IBKR_FLEX_TOKEN and IBKR_FLEX_QUERY_ID environment variables',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  // Check if this is a Vercel cron request
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';

  // Also allow triggering via query param for testing
  const url = new URL(request.url);
  const triggerSync = url.searchParams.get('run') === 'true';

  if (isVercelCron || triggerSync) {
    // Trigger the sync
    return POST(request);
  }

  // Get status information
  const connections = await getActiveConnections();
  const hasDbConnections = connections.length > 0;
  const hasLegacyConfig = !!(process.env.IBKR_FLEX_TOKEN && process.env.IBKR_FLEX_QUERY_ID);

  return NextResponse.json({
    configured: hasDbConnections || hasLegacyConfig,
    mode: hasDbConnections ? 'database' : hasLegacyConfig ? 'legacy' : 'none',
    database: {
      connections: connections.length,
      connectionLabels: connections.map(c => c.label),
    },
    legacy: {
      hasToken: !!process.env.IBKR_FLEX_TOKEN,
      hasQueryId: !!process.env.IBKR_FLEX_QUERY_ID,
    },
    usage: 'POST to this endpoint to sync trades from IBKR',
    cronSchedule: '21:30 UTC weekdays (9:30pm GMT)',
    setup: {
      recommended: 'Use the Connect page in the app to connect your IBKR account',
      legacy: {
        step1: 'Log into IBKR Portal > Reports > Flex Queries',
        step2: 'Create a new Flex Query for Trade Confirmations',
        step3: 'Enable Flex Web Service and copy the token',
        step4: 'Set IBKR_FLEX_TOKEN and IBKR_FLEX_QUERY_ID in .env.local',
      },
    },
  });
}
