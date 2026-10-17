import { supabase } from '../lib/supabase';

export interface CrmUserAccount {
  id: string;
  name: string;
  email: string;
  password?: string;
  crm_role: 'admin' | 'staff';
  access_type: 'full' | 'strict';
  allowed_modules: string[];
  created_by: string;
  created_at: string;
}

const CRM_USERS_STORAGE_KEY = 'counterpro_crm_user_accounts';

export const ALL_AVAILABLE_MODULES: { id: string; label: string; group: string }[] = [
  { id: 'dashboard', label: 'Founder Dashboard', group: 'Workspace' },
  { id: 'daily_user_metrics', label: 'Daily User Metrics', group: 'Workspace' },
  { id: 'daily_bills', label: 'Daily Order Metrics', group: 'Workspace' },
  { id: 'revenue_trend', label: 'Revenue Trend', group: 'Workspace' },
  { id: 'overview', label: 'Overview', group: 'Workspace' },
  { id: 'customer_tracking', label: 'Customer Tracking', group: 'Workspace' },
  { id: 'incomplete_signups', label: 'Incomplete Signups', group: 'Workspace' },
  { id: 'account_deletions', label: 'Deleted Users', group: 'Workspace' },
  { id: 'app_telemetry', label: 'Touch Heatmap (App Activity)', group: 'App Activity' },
  { id: 'diagnostic_logs', label: 'App Bugs (App Activity)', group: 'App Activity' },
  { id: 'salons_360', label: 'Shop Directory', group: 'Shop Analytics' },
  { id: 'subscription_plans', label: 'Subscription & 100 Quotas', group: 'Shop Analytics' },
  { id: 'staff_access', label: 'Staff Access Control', group: 'Shop Analytics' },
  { id: 'platform_audit', label: 'Activity Logs', group: 'Shop Analytics' },
  { id: 'user_details', label: 'User Details', group: 'Shop Analytics' },
  { id: 'purchases', label: 'Payment History', group: 'Shop Analytics' },
  { id: 'system_health', label: 'Shop Health', group: 'Shop Analytics' },
  { id: 'reports_bi', label: 'Analytics', group: 'Shop Analytics' },
  { id: 'support_messages', label: 'Support & Tickets', group: 'Engagement' },
];

export const SUPER_ADMIN_ACCOUNT: CrmUserAccount = {
  id: 'c707e078-28af-4bf3-bd7f-2ea5be24c958',
  name: 'Tecstellar Super Admin',
  email: 'info@tecstellar.com',
  password: 'tecstellar@123',
  crm_role: 'admin',
  access_type: 'full',
  allowed_modules: ALL_AVAILABLE_MODULES.map((m) => m.id),
  created_by: 'System',
  created_at: '2026-10-17T00:00:00.000Z',
};

const RANDOM_EMPLOYEE_NAMES = ['kesavan', 'jagadeswari', 'kamalesh'];

function getLocalCrmUserAccounts(): CrmUserAccount[] {
  if (typeof window === 'undefined') return [SUPER_ADMIN_ACCOUNT];
  try {
    const raw = localStorage.getItem(CRM_USERS_STORAGE_KEY);
    const parsed: CrmUserAccount[] = raw ? JSON.parse(raw) : [];

    // Filter out any random mock employees
    const filtered = parsed.filter(
      (u) =>
        !RANDOM_EMPLOYEE_NAMES.includes((u.name || '').trim().toLowerCase()) &&
        !RANDOM_EMPLOYEE_NAMES.includes((u.email || '').trim().toLowerCase().split('@')[0])
    );

    // Ensure Super Admin info@tecstellar.com is present
    if (!filtered.some((u) => (u?.email || '').toLowerCase() === 'info@tecstellar.com')) {
      filtered.unshift(SUPER_ADMIN_ACCOUNT);
    }

    return filtered;
  } catch {
    return [SUPER_ADMIN_ACCOUNT];
  }
}

function saveLocalCrmUserAccounts(users: CrmUserAccount[]) {
  if (typeof window === 'undefined') return;
  try {
    const cleaned = users.filter(
      (u) =>
        !RANDOM_EMPLOYEE_NAMES.includes((u.name || '').trim().toLowerCase()) &&
        !RANDOM_EMPLOYEE_NAMES.includes((u.email || '').trim().toLowerCase().split('@')[0])
    );
    localStorage.setItem(CRM_USERS_STORAGE_KEY, JSON.stringify(cleaned));
  } catch (e) {
    console.error('Failed to save CRM user accounts locally:', e);
  }
}

export async function fetchCrmUserAccounts(): Promise<CrmUserAccount[]> {
  const localItems = getLocalCrmUserAccounts();

  try {
    const { data, error } = await supabase
      .from('crm_user_accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const dbUsers: CrmUserAccount[] = data.map((row: any) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        password: row.password,
        crm_role: row.crm_role || 'staff',
        access_type: row.access_type || 'full',
        allowed_modules: Array.isArray(row.allowed_modules) ? row.allowed_modules : [],
        created_by: row.created_by || 'info@tecstellar.com',
        created_at: row.created_at,
      }));

      // Merge with local items
      const mergedMap = new Map<string, CrmUserAccount>();
      localItems.forEach((u) => { if (u?.email) mergedMap.set(u.email.toLowerCase(), u); });
      dbUsers.forEach((u) => { if (u?.email) mergedMap.set(u.email.toLowerCase(), u); });
      const merged = Array.from(mergedMap.values());
      saveLocalCrmUserAccounts(merged);
      return merged;
    }
  } catch (err) {
    console.warn('Could not query crm_user_accounts from DB, using local storage:', err);
  }

  return localItems;
}

export async function createCrmUserAccount(
  account: Omit<CrmUserAccount, 'id' | 'created_at'>
): Promise<{ success: boolean; user?: CrmUserAccount; error?: string }> {
  const emailClean = (account.email || '').trim().toLowerCase();
  const newId = `crm-usr-${Date.now()}`;
  const now = new Date().toISOString();

  const newAccount: CrmUserAccount = {
    ...account,
    id: newId,
    email: emailClean,
    created_at: now,
  };

  // 1. Save to local storage first (instant guaranteed persistence)
  const current = getLocalCrmUserAccounts();
  if (current.some((u) => (u?.email || '').toLowerCase() === emailClean)) {
    return { success: false, error: 'An account with this email address already exists.' };
  }
  const updated = [newAccount, ...current];
  saveLocalCrmUserAccounts(updated);

  // 2. Try saving to Supabase crm_user_accounts table
  try {
    const { data, error } = await supabase
      .from('crm_user_accounts')
      .insert([
        {
          name: newAccount.name,
          email: newAccount.email,
          password: newAccount.password,
          crm_role: newAccount.crm_role,
          access_type: newAccount.access_type,
          allowed_modules: newAccount.allowed_modules,
          created_by: newAccount.created_by,
        },
      ])
      .select()
      .single();

    if (!error && data?.id) {
      newAccount.id = data.id;
      saveLocalCrmUserAccounts([newAccount, ...current]);
    }
  } catch (err: any) {
    console.warn('Database write to crm_user_accounts skipped (table not created yet):', err.message);
  }

  return { success: true, user: newAccount };
}

export async function deleteCrmUserAccount(id: string): Promise<boolean> {
  const current = getLocalCrmUserAccounts();
  const updated = current.filter((u) => u.id !== id);
  saveLocalCrmUserAccounts(updated);

  try {
    await supabase.from('crm_user_accounts').delete().eq('id', id);
  } catch (err) {
    console.warn('Could not delete from DB:', err);
  }

  return true;
}
