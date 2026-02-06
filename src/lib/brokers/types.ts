import type { ParsedExecution } from '@/lib/flex-parser';

// Supported broker types
export type BrokerType = 'ibkr_flex' | 'schwab' | 'tda';

// Configuration passed to broker adapters
export interface BrokerConfig {
  connectionId: number;

  // IBKR Flex specific
  flexToken?: string;
  flexQueryId?: string;

  // Future: OAuth-based brokers
  // accessToken?: string;
  // refreshToken?: string;
}

// Result of testing a connection
export interface ConnectionTestResult {
  success: boolean;
  error?: string;
  accountsFound?: number;
}

// Account discovered from broker
export interface DiscoveredAccount {
  externalId: string;       // e.g., "U1234567"
  name?: string;            // e.g., "Individual Margin"
  type?: string;            // e.g., "MARGIN", "IRA"
  currency?: string;        // e.g., "USD"
}

// Options for fetching executions
export interface FetchOptions {
  fromDate?: Date;
  toDate?: Date;
  accountIds?: string[];    // Filter to specific external account IDs
}

// Result of fetching executions
export interface FetchResult {
  success: boolean;
  executions: ParsedExecution[];
  errors: string[];
  accountsProcessed: string[];
}

// Core broker adapter interface
export interface BrokerAdapter {
  readonly brokerType: BrokerType;

  // Test connection with credentials
  testConnection(config: BrokerConfig): Promise<ConnectionTestResult>;

  // Discover accounts available with this connection
  discoverAccounts(config: BrokerConfig): Promise<DiscoveredAccount[]>;

  // Fetch executions for date range
  fetchExecutions(
    config: BrokerConfig,
    options?: FetchOptions
  ): Promise<FetchResult>;
}

// Metadata about a broker for UI display
export interface BrokerInfo {
  type: BrokerType;
  name: string;
  description: string;
  setupInstructions: string[];
  comingSoon?: boolean;
}

// Available brokers metadata
export const BROKER_INFO: Record<BrokerType, BrokerInfo> = {
  ibkr_flex: {
    type: 'ibkr_flex',
    name: 'Interactive Brokers (Flex)',
    description: 'Connect via IBKR Flex Web Service for automated trade sync',
    setupInstructions: [
      'Log into IBKR Account Management',
      'Go to Reports > Flex Queries',
      'Create a new Activity Flex Query',
      'Select Trade Confirmations with required fields',
      'Enable Flex Web Service and copy your token',
    ],
  },
  schwab: {
    type: 'schwab',
    name: 'Charles Schwab',
    description: 'Connect your Schwab account',
    setupInstructions: [],
    comingSoon: true,
  },
  tda: {
    type: 'tda',
    name: 'TD Ameritrade',
    description: 'Connect your TD Ameritrade account',
    setupInstructions: [],
    comingSoon: true,
  },
};
