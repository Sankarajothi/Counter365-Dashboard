import { supabase } from './supabase';
import { Bill, Payment, Expense } from '../types/database';

export async function fetchBills(): Promise<{ data: Bill[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('bills')
      .select('*, shop:shops(id, name, city, phone)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const normalizedBills: Bill[] = (data || []).map((b: any) => {
      const tot = Number(b.total_amount || 0);
      const sub = Number(b.subtotal || 0);
      const pend = Number(b.pending_amount || 0);
      const tax = Number(b.gst_amount || b.tax_amount || 0);
      const disc = Number(b.discount_amount || 0);

      return {
        id: b.id,
        shop_id: b.shop_id,
        bill_number: b.bill_number,
        invoice_number: b.bill_number || `INV-${b.id.slice(0, 6)}`,
        customer_id: b.customer_id,
        customer_name: b.customer_name,
        customer_phone: b.customer_phone,
        status: b.is_deleted ? 'deleted' : (b.is_cancelled ? 'cancelled' : (b.status || 'completed')),
        is_cancelled: Boolean(b.is_cancelled),
        is_deleted: Boolean(b.is_deleted),
        created_by_name: b.created_by_name,
        created_by_role: b.created_by_role,
        subtotal: sub,
        subtotal_minor: Math.round(sub * 100),
        tax_minor: Math.round(tax * 100),
        discount_minor: Math.round(disc * 100),
        total_amount: tot,
        total_minor: Math.round(tot * 100),
        paid_amount: Number(b.paid_amount || 0),
        pending_amount: pend,
        due_amount_minor: Math.round(pend * 100),
        payment_mode: b.payment_mode || 'CASH',
        notes: b.notes,
        issued_at: b.completed_at || b.created_at,
        created_at: b.created_at,
        updated_at: b.updated_at,
        shop: b.shop,
        customer: b.customer_name ? {
          id: b.customer_id || b.id,
          shop_id: b.shop_id,
          name: b.customer_name,
          phone: b.customer_phone || '',
          created_at: b.created_at,
        } : undefined,
      };
    });

    return { data: normalizedBills, error: null };
  } catch (err: any) {
    console.error('Error fetching bills:', err);
    return { data: [], error: err.message || 'Unable to load bills' };
  }
}

export async function fetchPayments(): Promise<{ data: Payment[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*, shop:shops(id, name, city)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const normalizedPayments: Payment[] = (data || []).map((p: any) => {
      const amt = Number(p.amount || 0);
      return {
        id: p.id,
        shop_id: p.shop_id,
        bill_id: p.bill_id,
        payment_method: p.payment_method || p.payment_mode || 'CASH',
        method: (p.payment_method || p.payment_mode || 'CASH').toUpperCase(),
        amount: amt,
        amount_minor: Math.round(amt * 100),
        status: p.status || 'successful',
        reference: p.reference_number || null,
        paid_at: p.paid_at || p.recorded_at || p.created_at,
        created_at: p.created_at,
        shop: p.shop,
      };
    });

    return { data: normalizedPayments, error: null };
  } catch (err: any) {
    console.error('Error fetching payments:', err);
    return { data: [], error: err.message || 'Unable to load payment records' };
  }
}

export async function fetchExpenses(): Promise<{ data: Expense[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('expense_date', { ascending: false });

    if (error) throw error;

    const normalizedExpenses: Expense[] = (data || []).map((e: any) => ({
      ...e,
      amount_minor: Math.round(Number(e.amount || 0) * 100),
      note: e.description || '',
    }));

    return { data: normalizedExpenses, error: null };
  } catch (err: any) {
    console.error('Error fetching expenses:', err);
    return { data: [], error: err.message || 'Unable to load expenses' };
  }
}

export async function fetchSubscriptions(): Promise<{ data: any[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*, shop:shops(id, name, city)')
      .order('created_at', { ascending: false });

    const dbSubs: any[] = (data || []).map((s: any) => ({
      ...s,
      plan_name: s.plan_name || (s.plan === 'pro' ? 'Pro Plan (3 Months)' : 'Free Plan (100 Quota)'),
      amount_minor: s.amount_minor || Math.round(Number(s.amount || 0) * 100),
      subscription_start_date: s.subscription_start_at || s.current_period_start || s.created_at,
      subscription_end_date: s.subscription_end_at || s.current_period_end,
    }));

    // Merge any manual subscriptions stored in localStorage
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('counterpro_manual_subscriptions_registry');
        if (raw) {
          const manualMap: Record<string, any> = JSON.parse(raw);
          Object.values(manualMap).forEach((mSub: any) => {
            const idx = dbSubs.findIndex((s) => s.shop_id === mSub.shop_id);
            if (idx >= 0) {
              dbSubs[idx] = { ...dbSubs[idx], ...mSub };
            } else {
              dbSubs.push(mSub);
            }
          });
        }
      }
    } catch (e) {
      console.warn('Error reading manual subscriptions registry:', e);
    }

    return { data: dbSubs, error: null };
  } catch (err: any) {
    console.error('Error fetching subscriptions:', err);
    return { data: [], error: err.message || 'Unable to load subscriptions' };
  }
}

export function subscribeToSubscriptions(callback: () => void) {
  const channel = supabase
    .channel('subscriptions_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'subscriptions' },
      () => {
        callback();
      }
    )
    .subscribe();

  const handleCustomUpdate = () => {
    callback();
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('counterpro_subscription_updated', handleCustomUpdate);
  }

  return () => {
    supabase.removeChannel(channel);
    if (typeof window !== 'undefined') {
      window.removeEventListener('counterpro_subscription_updated', handleCustomUpdate);
    }
  };
}

export async function saveManualSubscription(subscription: {
  shop_id: string;
  plan_id: string;
  plan_name?: string;
  status: string;
  subscription_start_date: string;
  subscription_end_date: string;
  amount_minor: number;
  currency?: string;
  cashfree_order_id?: string;
  discount_type?: string;
  discount_value?: number;
  payment_type?: string;
  payment_status?: string;
  note?: string;
}): Promise<{ success: boolean; data?: any; error: string | null }> {
  try {
    const payload = {
      ...subscription,
      id: `sub-manual-${subscription.shop_id}-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('counterpro_manual_subscriptions_registry') || '{}';
      const map = JSON.parse(raw);
      map[subscription.shop_id] = payload;
      localStorage.setItem('counterpro_manual_subscriptions_registry', JSON.stringify(map));
      window.dispatchEvent(new CustomEvent('counterpro_subscription_updated'));
    }

    return { success: true, data: payload, error: null };
  } catch (err: any) {
    console.error('Error saving manual subscription:', err);
    return { success: false, error: err.message || 'Failed to save manual subscription' };
  }
}
