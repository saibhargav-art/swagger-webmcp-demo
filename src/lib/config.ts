export const config = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL as string,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  },
} as const;

export const isSupabaseConfigured = Boolean(
  config.supabase.url && config.supabase.anonKey
);

export function requireSupabaseConfig() {
  if (!config.supabase.url || !config.supabase.anonKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  }

  return { 
    supabaseUrl: config.supabase.url, 
    supabaseAnonKey: config.supabase.anonKey 
  };
}
