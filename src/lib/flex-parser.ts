import { XMLParser } from 'fast-xml-parser';
import type { Execution } from '@/types/database';

// Raw trade data from IBKR Flex XML
interface FlexTrade {
  symbol: string;
  dateTime: string;
  buySell: string;
  quantity: string;
  tradePrice: string;
  ibCommission: string;
  netCash: string;
  exchange: string;
  ibExecID: string;
  ibOrderID: string;
  // Additional fields that might be present
  currency?: string;
  fxRateToBase?: string;
  assetCategory?: string;
  description?: string;
}

interface FlexStatement {
  accountId: string;
  Trades?: {
    Trade?: FlexTrade | FlexTrade[];
  };
}

interface FlexQueryResponse {
  FlexQueryResponse?: {
    FlexStatements?: {
      FlexStatement?: FlexStatement | FlexStatement[];
    };
  };
}

export interface ParsedExecution {
  execution_id: string;
  account_id: string;
  order_id: string | null;
  ticker: string;
  executed_at: Date;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  commission: number;
  net_cash: number | null;
  exchange: string | null;
}

export interface ParseResult {
  success: boolean;
  executions: ParsedExecution[];
  errors: string[];
  accountId: string | null;
}

/**
 * Parse IBKR Flex XML report and extract executions
 */
export function parseFlexXml(xmlContent: string): ParseResult {
  const errors: string[] = [];
  const executions: ParsedExecution[] = [];
  let accountId: string | null = null;

  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: false, // Keep as strings for explicit parsing
    });

    const parsed = parser.parse(xmlContent) as FlexQueryResponse;

    // Navigate to FlexStatement(s)
    const flexStatements = parsed.FlexQueryResponse?.FlexStatements?.FlexStatement;

    if (!flexStatements) {
      return {
        success: false,
        executions: [],
        errors: ['No FlexStatement found in XML'],
        accountId: null,
      };
    }

    // Handle single or multiple statements
    const statements = Array.isArray(flexStatements) ? flexStatements : [flexStatements];

    for (const statement of statements) {
      accountId = statement.accountId || accountId;

      const trades = statement.Trades?.Trade;
      if (!trades) continue;

      // Handle single or multiple trades
      const tradeList = Array.isArray(trades) ? trades : [trades];

      for (const trade of tradeList) {
        try {
          const execution = parseFlexTrade(trade, statement.accountId);
          executions.push(execution);
        } catch (e) {
          errors.push(`Failed to parse trade: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }

    return {
      success: errors.length === 0,
      executions,
      errors,
      accountId,
    };
  } catch (e) {
    return {
      success: false,
      executions: [],
      errors: [`XML parsing failed: ${e instanceof Error ? e.message : String(e)}`],
      accountId: null,
    };
  }
}

/**
 * Parse a single trade element into an execution
 */
function parseFlexTrade(trade: FlexTrade, accountId: string): ParsedExecution {
  // Parse dateTime - IBKR format: "YYYYMMDD;HHMMSS" or "YYYY-MM-DD, HH:MM:SS"
  const executedAt = parseIbkrDateTime(trade.dateTime);

  // Normalize side
  const side = normalizeSide(trade.buySell);

  // Parse numeric values
  const quantity = Math.abs(parseFloat(trade.quantity));
  const price = parseFloat(trade.tradePrice);
  const commission = Math.abs(parseFloat(trade.ibCommission || '0'));
  const netCash = trade.netCash ? parseFloat(trade.netCash) : null;

  if (isNaN(quantity) || isNaN(price)) {
    throw new Error(`Invalid quantity or price for trade ${trade.ibExecID}`);
  }

  return {
    execution_id: trade.ibExecID,
    account_id: accountId,
    order_id: trade.ibOrderID || null,
    ticker: normalizeSymbol(trade.symbol),
    executed_at: executedAt,
    side,
    quantity,
    price,
    commission,
    net_cash: netCash,
    exchange: trade.exchange || null,
  };
}

/**
 * Parse IBKR datetime formats
 */
function parseIbkrDateTime(dateTimeStr: string): Date {
  // Format 1: "YYYYMMDD;HHMMSS"
  if (dateTimeStr.includes(';')) {
    const [datePart, timePart] = dateTimeStr.split(';');
    const year = parseInt(datePart.substring(0, 4));
    const month = parseInt(datePart.substring(4, 6)) - 1;
    const day = parseInt(datePart.substring(6, 8));
    const hour = parseInt(timePart.substring(0, 2));
    const minute = parseInt(timePart.substring(2, 4));
    const second = parseInt(timePart.substring(4, 6));
    return new Date(Date.UTC(year, month, day, hour, minute, second));
  }

  // Format 2: "YYYY-MM-DD, HH:MM:SS" or "YYYY-MM-DD HH:MM:SS"
  if (dateTimeStr.includes('-')) {
    const cleaned = dateTimeStr.replace(',', '');
    return new Date(cleaned);
  }

  // Fallback: try direct parsing
  const date = new Date(dateTimeStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Unable to parse datetime: ${dateTimeStr}`);
  }
  return date;
}

/**
 * Normalize buy/sell indicator
 */
function normalizeSide(buySell: string): 'BUY' | 'SELL' {
  const upper = buySell.toUpperCase();
  if (upper === 'BUY' || upper === 'B' || upper === 'BOT') {
    return 'BUY';
  }
  if (upper === 'SELL' || upper === 'S' || upper === 'SLD') {
    return 'SELL';
  }
  throw new Error(`Unknown side: ${buySell}`);
}

/**
 * Normalize ticker symbol
 */
function normalizeSymbol(symbol: string): string {
  // Remove any whitespace
  return symbol.trim().toUpperCase();
}

/**
 * Map account ID from IBKR to our aliases
 */
export function mapAccountId(ibkrAccountId: string, accountMapping: Record<string, string>): string {
  return accountMapping[ibkrAccountId] || ibkrAccountId;
}

/**
 * Convert parsed executions to database format
 */
export function toExecutionInserts(
  executions: ParsedExecution[],
  accountMapping?: Record<string, string>
): Omit<Execution, 'id' | 'imported_at'>[] {
  return executions.map((exec) => ({
    execution_id: exec.execution_id,
    account_id: accountMapping ? mapAccountId(exec.account_id, accountMapping) : exec.account_id,
    order_id: exec.order_id,
    ticker: exec.ticker,
    executed_at: exec.executed_at.toISOString(),
    side: exec.side,
    quantity: exec.quantity,
    price: exec.price,
    commission: exec.commission,
    net_cash: exec.net_cash,
    exchange: exec.exchange,
  }));
}
