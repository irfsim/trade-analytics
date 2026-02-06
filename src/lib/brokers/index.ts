import type { BrokerAdapter, BrokerType } from './types';
import { IbkrFlexAdapter } from './ibkr-flex-adapter';

// Registry of available broker adapters
const adapters = new Map<BrokerType, BrokerAdapter>([
  ['ibkr_flex', new IbkrFlexAdapter()],
  // Future: ['schwab', new SchwabAdapter()],
  // Future: ['tda', new TdaAdapter()],
]);

/**
 * Get a broker adapter by type
 */
export function getBrokerAdapter(type: BrokerType): BrokerAdapter {
  const adapter = adapters.get(type);
  if (!adapter) {
    throw new Error(`Unknown broker type: ${type}`);
  }
  return adapter;
}

/**
 * Get all supported broker types
 */
export function getSupportedBrokers(): BrokerType[] {
  return Array.from(adapters.keys());
}

/**
 * Check if a broker type is supported
 */
export function isBrokerSupported(type: string): type is BrokerType {
  return adapters.has(type as BrokerType);
}

// Re-export types and constants
export * from './types';
export { IbkrFlexAdapter } from './ibkr-flex-adapter';
