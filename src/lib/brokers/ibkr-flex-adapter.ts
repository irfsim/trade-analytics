import type {
  BrokerAdapter,
  BrokerConfig,
  ConnectionTestResult,
  DiscoveredAccount,
  FetchOptions,
  FetchResult,
} from './types';
import { parseFlexXml, type ParsedExecution } from '@/lib/flex-parser';

const IBKR_FLEX_BASE = 'https://gdcdyn.interactivebrokers.com/Universal/servlet/FlexStatementService';

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class IbkrFlexAdapter implements BrokerAdapter {
  readonly brokerType = 'ibkr_flex' as const;

  /**
   * Test connection by requesting a Flex statement
   */
  async testConnection(config: BrokerConfig): Promise<ConnectionTestResult> {
    const { flexToken, flexQueryId } = config;

    if (!flexToken || !flexQueryId) {
      return {
        success: false,
        error: 'Missing Flex Token or Query ID',
      };
    }

    try {
      // Try to request a statement - this validates the credentials
      const referenceCode = await this.requestFlexStatement(flexToken, flexQueryId);

      // If we get a reference code, credentials are valid
      // Optionally fetch and count accounts
      try {
        const xmlContent = await this.getFlexStatement(flexToken, referenceCode, 5);
        const parseResult = parseFlexXml(xmlContent);
        const accounts = this.extractAccountIds(parseResult.executions);

        return {
          success: true,
          accountsFound: accounts.length,
        };
      } catch {
        // We got a reference code so credentials are valid, even if statement fetch fails
        return {
          success: true,
          accountsFound: 0,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  }

  /**
   * Discover accounts by fetching a statement and extracting unique account IDs
   */
  async discoverAccounts(config: BrokerConfig): Promise<DiscoveredAccount[]> {
    const { flexToken, flexQueryId } = config;

    if (!flexToken || !flexQueryId) {
      throw new Error('Missing Flex Token or Query ID');
    }

    const referenceCode = await this.requestFlexStatement(flexToken, flexQueryId);
    const xmlContent = await this.getFlexStatement(flexToken, referenceCode);
    const parseResult = parseFlexXml(xmlContent);

    const accountIds = this.extractAccountIds(parseResult.executions);

    return accountIds.map(id => ({
      externalId: id,
      // IBKR Flex doesn't provide account names/types directly in trade data
      // Users will need to label these manually
    }));
  }

  /**
   * Fetch executions from IBKR Flex Web Service
   */
  async fetchExecutions(
    config: BrokerConfig,
    options?: FetchOptions
  ): Promise<FetchResult> {
    const { flexToken, flexQueryId } = config;

    if (!flexToken || !flexQueryId) {
      return {
        success: false,
        executions: [],
        errors: ['Missing Flex Token or Query ID'],
        accountsProcessed: [],
      };
    }

    try {
      // Step 1: Request the statement
      console.log('Requesting IBKR Flex statement...');
      const referenceCode = await this.requestFlexStatement(flexToken, flexQueryId);
      console.log(`Got reference code: ${referenceCode}`);

      // Step 2: Poll for and retrieve the statement
      console.log('Fetching IBKR Flex statement...');
      const xmlContent = await this.getFlexStatement(flexToken, referenceCode);
      console.log(`Got statement XML (${xmlContent.length} bytes)`);

      // Step 3: Parse the Flex XML
      const parseResult = parseFlexXml(xmlContent);

      if (!parseResult.success && parseResult.executions.length === 0) {
        return {
          success: false,
          executions: [],
          errors: parseResult.errors,
          accountsProcessed: [],
        };
      }

      let executions = parseResult.executions;

      // Apply filters if specified
      if (options?.fromDate) {
        executions = executions.filter(e => e.executed_at >= options.fromDate!);
      }
      if (options?.toDate) {
        executions = executions.filter(e => e.executed_at <= options.toDate!);
      }
      if (options?.accountIds && options.accountIds.length > 0) {
        const accountSet = new Set(options.accountIds);
        executions = executions.filter(e => accountSet.has(e.account_id));
      }

      const accountsProcessed = this.extractAccountIds(executions);

      return {
        success: true,
        executions,
        errors: parseResult.errors,
        accountsProcessed,
      };
    } catch (error) {
      return {
        success: false,
        executions: [],
        errors: [error instanceof Error ? error.message : 'Fetch failed'],
        accountsProcessed: [],
      };
    }
  }

  /**
   * Request a Flex statement from IBKR
   * Returns a reference code to poll for the result
   */
  private async requestFlexStatement(token: string, queryId: string): Promise<string> {
    const url = `${IBKR_FLEX_BASE}.SendRequest?t=${token}&q=${queryId}&v=3`;

    const res = await fetch(url);
    const text = await res.text();

    // Parse XML response
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
  private async getFlexStatement(
    token: string,
    referenceCode: string,
    maxAttempts = 10
  ): Promise<string> {
    const url = `${IBKR_FLEX_BASE}.GetStatement?q=${referenceCode}&t=${token}&v=3`;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const res = await fetch(url);
      const text = await res.text();

      // Check if it's still processing
      if (text.includes('<Status>') && text.includes('Statement generation in progress')) {
        console.log(`IBKR statement generation in progress, attempt ${attempt}/${maxAttempts}`);
        await sleep(2000);
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
   * Extract unique account IDs from executions
   */
  private extractAccountIds(executions: ParsedExecution[]): string[] {
    const accountIds = new Set<string>();
    for (const exec of executions) {
      accountIds.add(exec.account_id);
    }
    return Array.from(accountIds).sort();
  }
}
