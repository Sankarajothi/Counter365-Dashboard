import { supabase } from './supabase';
import { AccountDeletion } from '../types/database';

export interface DeletionReasonStat {
  reason: string;
  count: number;
  percentage: number;
}

export async function fetchAccountDeletions(): Promise<{ data: AccountDeletion[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('account_deletions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err: any) {
    console.error('Error fetching account deletions:', err);
    return { data: [], error: err.message || 'Unable to load account deletions' };
  }
}

export function calculateDeletionReasonStats(deletions: AccountDeletion[]): DeletionReasonStat[] {
  if (!deletions || deletions.length === 0) return [];

  const counts: Record<string, number> = {};
  deletions.forEach((d) => {
    const reason = d.reason?.trim() || 'No reason provided';
    counts[reason] = (counts[reason] || 0) + 1;
  });

  const total = deletions.length;
  return Object.entries(counts)
    .map(([reason, count]) => ({
      reason,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

export function subscribeToAccountDeletions(onUpdate: () => void) {
  const channel = supabase
    .channel('account_deletions_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'account_deletions' },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
