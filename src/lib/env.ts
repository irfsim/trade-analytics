// Environment variable validation and access

export function getEnvVar(name: string, required: boolean = true): string {
  const value = process.env[name];

  if (required && !value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value || '';
}

export function getSupabaseConfig() {
  return {
    url: getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
    anonKey: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    serviceRoleKey: getEnvVar('SUPABASE_SERVICE_ROLE_KEY', false),
  };
}

export function getIbkrAccountMap(): Record<string, string> {
  const mapJson = getEnvVar('IBKR_ACCOUNT_MAP', false);

  if (!mapJson) {
    return {};
  }

  try {
    return JSON.parse(mapJson);
  } catch (e) {
    console.error('Failed to parse IBKR_ACCOUNT_MAP:', e);
    return {};
  }
}

// Validate all required env vars at startup (for server components)
export function validateEnv(): { valid: boolean; missing: string[] } {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];

  const missing = required.filter((name) => !process.env[name]);

  return {
    valid: missing.length === 0,
    missing,
  };
}
