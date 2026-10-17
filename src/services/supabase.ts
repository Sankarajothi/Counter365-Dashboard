import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 
  process.env.NEXT_PUBLIC_SUPABASE_URL || 
  'https://tziqjkklqtmjlncoraba.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY = 
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  'sb_publishable_CkIw1TkmOb9qbIVd8Lb0RA_8FCAHfli';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export async function checkSupabaseConnection(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = performance.now();
  try {
    const { error } = await supabase.from('shops').select('id').limit(1);
    const latencyMs = Math.round(performance.now() - start);
    if (error) {
      return { ok: false, latencyMs, error: error.message };
    }
    return { ok: true, latencyMs };
  } catch (err: any) {
    return { ok: false, latencyMs: Math.round(performance.now() - start), error: err?.message || 'Unknown network error' };
  }
}
