import { supabase } from '../supabase';
import type {
  BrokerConnection,
  BrokerAccountLink,
  SyncHistory,
  BrokerConnectionWithAccounts,
  ConnectionStatus,
  SyncTriggerType,
} from '@/types/database';

// ============================================
// BROKER CONNECTIONS
// ============================================

/**
 * Get all broker connections
 */
export async function getConnections(): Promise<BrokerConnection[]> {
  const { data, error } = await supabase
    .from('broker_connections')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch connections: ${error.message}`);
  }

  return data || [];
}

/**
 * Get all active broker connections (for sync)
 */
export async function getActiveConnections(): Promise<BrokerConnection[]> {
  const { data, error } = await supabase
    .from('broker_connections')
    .select('*')
    .eq('status', 'active')
    .eq('auto_sync_enabled', true)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch active connections: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a connection by ID
 */
export async function getConnection(id: number): Promise<BrokerConnection | null> {
  const { data, error } = await supabase
    .from('broker_connections')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch connection: ${error.message}`);
  }

  return data;
}

/**
 * Get a connection with its linked accounts
 */
export async function getConnectionWithAccounts(
  id: number
): Promise<BrokerConnectionWithAccounts | null> {
  const connection = await getConnection(id);
  if (!connection) return null;

  const accountLinks = await getAccountLinks(id);
  const lastSync = await getLastSync(id);

  return {
    ...connection,
    account_links: accountLinks,
    last_sync: lastSync,
  };
}

/**
 * Get all connections with their linked accounts
 */
export async function getConnectionsWithAccounts(): Promise<BrokerConnectionWithAccounts[]> {
  const connections = await getConnections();

  const result: BrokerConnectionWithAccounts[] = [];

  for (const conn of connections) {
    const accountLinks = await getAccountLinks(conn.id);
    const lastSync = await getLastSync(conn.id);

    result.push({
      ...conn,
      account_links: accountLinks,
      last_sync: lastSync,
    });
  }

  return result;
}

/**
 * Create a new broker connection
 */
export async function createConnection(
  connection: Omit<BrokerConnection, 'id' | 'created_at' | 'updated_at'>
): Promise<BrokerConnection> {
  const { data, error } = await supabase
    .from('broker_connections')
    .insert(connection)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create connection: ${error.message}`);
  }

  return data;
}

/**
 * Update a broker connection
 */
export async function updateConnection(
  id: number,
  updates: Partial<Omit<BrokerConnection, 'id' | 'created_at'>>
): Promise<BrokerConnection> {
  const { data, error } = await supabase
    .from('broker_connections')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update connection: ${error.message}`);
  }

  return data;
}

/**
 * Update connection status
 */
export async function updateConnectionStatus(
  id: number,
  status: ConnectionStatus,
  lastError?: string
): Promise<void> {
  const { error } = await supabase
    .from('broker_connections')
    .update({
      status,
      last_error: lastError || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update connection status: ${error.message}`);
  }
}

/**
 * Update last sync time
 */
export async function updateConnectionLastSync(id: number): Promise<void> {
  const { error } = await supabase
    .from('broker_connections')
    .update({
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update last sync time: ${error.message}`);
  }
}

/**
 * Delete a broker connection (cascades to account links and sync history)
 */
export async function deleteConnection(id: number): Promise<void> {
  const { error } = await supabase
    .from('broker_connections')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete connection: ${error.message}`);
  }
}

// ============================================
// BROKER ACCOUNT LINKS
// ============================================

/**
 * Get account links for a connection
 */
export async function getAccountLinks(connectionId: number): Promise<BrokerAccountLink[]> {
  const { data, error } = await supabase
    .from('broker_account_links')
    .select('*')
    .eq('broker_connection_id', connectionId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch account links: ${error.message}`);
  }

  return data || [];
}

/**
 * Get all account links
 */
export async function getAllAccountLinks(): Promise<BrokerAccountLink[]> {
  const { data, error } = await supabase
    .from('broker_account_links')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch account links: ${error.message}`);
  }

  return data || [];
}

/**
 * Get account mapping from broker links (external ID -> internal ID)
 */
export async function getAccountMappingFromLinks(
  connectionId?: number
): Promise<Record<string, string>> {
  const links = connectionId
    ? await getAccountLinks(connectionId)
    : await getAllAccountLinks();

  const mapping: Record<string, string> = {};
  for (const link of links) {
    mapping[link.external_account_id] = link.internal_account_id;
  }

  return mapping;
}

/**
 * Create an account link
 */
export async function createAccountLink(
  link: Omit<BrokerAccountLink, 'id' | 'created_at'>
): Promise<BrokerAccountLink> {
  const { data, error } = await supabase
    .from('broker_account_links')
    .insert(link)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create account link: ${error.message}`);
  }

  return data;
}

/**
 * Update an account link
 */
export async function updateAccountLink(
  id: number,
  updates: Partial<Omit<BrokerAccountLink, 'id' | 'created_at'>>
): Promise<BrokerAccountLink> {
  const { data, error } = await supabase
    .from('broker_account_links')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update account link: ${error.message}`);
  }

  return data;
}

/**
 * Delete an account link
 */
export async function deleteAccountLink(id: number): Promise<void> {
  const { error } = await supabase
    .from('broker_account_links')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete account link: ${error.message}`);
  }
}

// ============================================
// SYNC HISTORY
// ============================================

/**
 * Get sync history for a connection
 */
export async function getSyncHistory(
  connectionId: number,
  limit = 10
): Promise<SyncHistory[]> {
  const { data, error } = await supabase
    .from('sync_history')
    .select('*')
    .eq('broker_connection_id', connectionId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch sync history: ${error.message}`);
  }

  return data || [];
}

/**
 * Get last sync for a connection
 */
export async function getLastSync(connectionId: number): Promise<SyncHistory | null> {
  const { data, error } = await supabase
    .from('sync_history')
    .select('*')
    .eq('broker_connection_id', connectionId)
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch last sync: ${error.message}`);
  }

  return data;
}

/**
 * Create a sync history entry (when sync starts)
 */
export async function createSyncHistory(
  connectionId: number,
  triggerType: SyncTriggerType,
  dateRangeFrom?: Date,
  dateRangeTo?: Date
): Promise<SyncHistory> {
  const { data, error } = await supabase
    .from('sync_history')
    .insert({
      broker_connection_id: connectionId,
      trigger_type: triggerType,
      date_range_from: dateRangeFrom?.toISOString().split('T')[0] || null,
      date_range_to: dateRangeTo?.toISOString().split('T')[0] || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create sync history: ${error.message}`);
  }

  return data;
}

/**
 * Update sync history (when sync completes)
 */
export async function completeSyncHistory(
  id: number,
  result: {
    status: 'success' | 'partial' | 'error';
    executionsFetched?: number;
    executionsInserted?: number;
    executionsSkipped?: number;
    tradesMatched?: number;
    errorMessage?: string;
    errorDetails?: Record<string, unknown>;
  }
): Promise<void> {
  const { error } = await supabase
    .from('sync_history')
    .update({
      completed_at: new Date().toISOString(),
      status: result.status,
      executions_fetched: result.executionsFetched || 0,
      executions_inserted: result.executionsInserted || 0,
      executions_skipped: result.executionsSkipped || 0,
      trades_matched: result.tradesMatched || 0,
      error_message: result.errorMessage || null,
      error_details: result.errorDetails || null,
    })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update sync history: ${error.message}`);
  }
}

/**
 * Get all sync history (for global sync status)
 */
export async function getAllSyncHistory(limit = 20): Promise<SyncHistory[]> {
  const { data, error } = await supabase
    .from('sync_history')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch sync history: ${error.message}`);
  }

  return data || [];
}
