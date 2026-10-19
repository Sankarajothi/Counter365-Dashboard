import { supabase } from './supabase';
import { Shop, Staff, Customer, Service, ServiceCategory, Bill, Payment, ShopSettings, SupportMessage, AccountDeletion, StaffPermissions, DEFAULT_STAFF_PERMISSIONS, StylistPermissions, DEFAULT_STYLIST_PERMISSIONS } from '../types/database';

export interface ShopWithRelations extends Shop {
  staffCount?: number;
  customerCount?: number;
  serviceCount?: number;
  billCount?: number;
}
export type SalonWithRelations = ShopWithRelations;

export interface ShopDetailedView {
  shop: Shop;
  staff: Staff[];
  customers: Customer[];
  services: Service[];
  categories: ServiceCategory[];
  bills: Bill[];
  payments: Payment[];
  settings: ShopSettings | null;
  supportMessages: SupportMessage[];
  deletions: AccountDeletion[];
}
export type SalonDetailedView = ShopDetailedView;

function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '').slice(-10);
}

function isRealShop(shop: Shop): boolean {
  if (!shop.name || shop.name.trim().length === 0) return false;
  return true;
}

export async function fetchShops(): Promise<{ data: Shop[]; error: string | null }> {
  try {
    const [shopsRes, staffRes, customersRes, billsRes] = await Promise.all([
      supabase.from('shops').select('*').order('created_at', { ascending: false }),
      supabase.from('shop_members').select('id, shop_id'),
      supabase.from('customers').select('id, shop_id'),
      supabase.from('bills').select('id, shop_id'),
    ]);

    if (shopsRes.error) throw shopsRes.error;
    const rawShops: any[] = shopsRes.data || [];

    const staffCountMap = new Map<string, number>();
    const custCountMap = new Map<string, number>();
    const billCountMap = new Map<string, number>();

    (staffRes.data || []).forEach((st: any) => staffCountMap.set(st.shop_id, (staffCountMap.get(st.shop_id) || 0) + 1));
    (customersRes.data || []).forEach((c: any) => custCountMap.set(c.shop_id, (custCountMap.get(c.shop_id) || 0) + 1));
    (billsRes.data || []).forEach((b: any) => billCountMap.set(b.shop_id, (billCountMap.get(b.shop_id) || 0) + 1));

    const realShops = rawShops.filter(isRealShop);

    // Deduplication by phone or exact name
    const cleanName = (n: string) => (n || '').toLowerCase().trim();
    const groups: any[][] = [];

    for (const shop of realShops) {
      const sName = cleanName(shop.name);
      const sPhone = normalizePhone(shop.phone);

      let matchedGroupIndex = -1;
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        const gLeader = group[0];
        const gName = cleanName(gLeader.name);
        const gPhone = normalizePhone(gLeader.phone);

        if ((sPhone && gPhone && sPhone === gPhone) || (sName && gName && sName === gName)) {
          matchedGroupIndex = i;
          break;
        }
      }

      if (matchedGroupIndex >= 0) {
        groups[matchedGroupIndex].push(shop);
      } else {
        groups.push([shop]);
      }
    }

    const deduplicatedShops: Shop[] = groups.map((group) => {
      group.sort((a, b) => {
        const countA = (billCountMap.get(a.id) || 0) + (staffCountMap.get(a.id) || 0);
        const countB = (billCountMap.get(b.id) || 0) + (staffCountMap.get(b.id) || 0);
        if (countA !== countB) return countB - countA;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      const leader = group[0];
      const dupCount = group.length - 1;
      const dupIds = group.map((s) => s.id);

      let totalStaff = 0;
      let totalCust = 0;
      let totalBills = 0;

      dupIds.forEach((id) => {
        totalStaff += staffCountMap.get(id) || 0;
        totalCust += custCountMap.get(id) || 0;
        totalBills += billCountMap.get(id) || 0;
      });

      return {
        ...leader,
        city: leader.city || 'Tamil Nadu',
        staff_count: totalStaff,
        customer_count: totalCust,
        bill_count: totalBills,
        appointment_count: 0,
        duplicate_count: dupCount,
        duplicate_ids: dupIds,
      };
    });

    return { data: deduplicatedShops, error: null };
  } catch (err: any) {
    console.error('Error fetching shops:', err);
    return { data: [], error: err.message || 'Unable to load shops' };
  }
}

export async function fetchShopDetails(
  shopId: string
): Promise<{ data: ShopDetailedView | null; error: string | null }> {
  try {
    const [
      shopRes,
      staffRes,
      customersRes,
      billsRes,
      paymentsRes,
      deletionsRes,
    ] = await Promise.all([
      supabase.from('shops').select('*').eq('id', shopId).single(),
      supabase.from('shop_members').select('*').eq('shop_id', shopId).order('created_at', { ascending: false }),
      supabase.from('customers').select('*').eq('shop_id', shopId).order('created_at', { ascending: false }),
      supabase.from('bills').select('*').eq('shop_id', shopId).order('created_at', { ascending: false }),
      supabase.from('payments').select('*').eq('shop_id', shopId).order('created_at', { ascending: false }),
      supabase.from('account_deletions').select('*').eq('shop_id', shopId).order('created_at', { ascending: false }),
    ]);

    if (shopRes.error) throw shopRes.error;

    const staffMapped: Staff[] = (staffRes.data || []).map((m: any) => ({
      id: m.id,
      shop_id: m.shop_id,
      name: m.full_name || 'Staff Member',
      role: m.role || 'Staff',
      phone: m.phone,
      is_active: m.is_active !== false,
      permissions: DEFAULT_STAFF_PERMISSIONS,
      invitation_status: 'active',
      created_at: m.created_at,
    }));

    const billsMapped: Bill[] = (billsRes.data || []).map((b: any) => ({
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
      subtotal: Number(b.subtotal || 0),
      subtotal_minor: Math.round(Number(b.subtotal || 0) * 100),
      total_amount: Number(b.total_amount || 0),
      total_minor: Math.round(Number(b.total_amount || 0) * 100),
      due_amount_minor: Math.round(Number(b.pending_amount || 0) * 100),
      payment_mode: b.payment_mode || 'CASH',
      issued_at: b.completed_at || b.created_at,
      created_at: b.created_at,
    }));

    const paymentsMapped: Payment[] = (paymentsRes.data || []).map((p: any) => ({
      id: p.id,
      shop_id: p.shop_id,
      bill_id: p.bill_id,
      payment_method: p.payment_method || p.payment_mode || 'CASH',
      method: (p.payment_method || p.payment_mode || 'CASH').toUpperCase(),
      amount: Number(p.amount || 0),
      amount_minor: Math.round(Number(p.amount || 0) * 100),
      status: p.status || 'successful',
      paid_at: p.paid_at || p.recorded_at || p.created_at,
      created_at: p.created_at,
    }));

    return {
      data: {
        shop: {
          ...shopRes.data,
          city: shopRes.data.city || 'Tamil Nadu',
        },
        staff: staffMapped,
        customers: customersRes.data || [],
        services: [],
        categories: [],
        bills: billsMapped,
        payments: paymentsMapped,
        settings: null,
        supportMessages: [],
        deletions: deletionsRes.data || [],
      },
      error: null,
    };
  } catch (err: any) {
    console.error('Error fetching shop details:', err);
    return { data: null, error: err.message || 'Unable to load shop details' };
  }
}
export const fetchSalonDetails = fetchShopDetails;

export async function updateStaffPermissions(
  staffId: string,
  permissions: StaffPermissions
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('shop_members')
      .update({
        permissions_override: permissions,
        updated_at: new Date().toISOString(),
      })
      .eq('id', staffId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Error updating staff permissions:', err);
    return { success: false, error: err.message || 'Failed to update staff permissions' };
  }
}

export async function updateShopFreeSalesLimit(
  shopId: string,
  limit: number | null
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (limit !== null && (!Number.isInteger(limit) || limit < 1)) {
      return { success: false, error: 'Limit must be a whole number of 1 or more' };
    }
    const { data, error } = await supabase
      .from('shops')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', shopId)
      .select('id');

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Error updating free sales limit:', err);
    return { success: false, error: err.message || 'Failed to update free sales limit' };
  }
}

export type ManualProPlan = '3_months' | '6_months' | '12_months';

export interface ShopSubscriptionRow {
  id: string;
  shop_id: string;
  plan_id: string;
  status: string;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  cashfree_order_id: string | null;
  amount_minor: number;
  created_at: string;
}

export async function fetchShopSubscription(
  shopId: string
): Promise<{ data: ShopSubscriptionRow | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    if (data && data.length > 0) {
      const s = data[0];
      return {
        data: {
          id: s.id,
          shop_id: s.shop_id,
          plan_id: s.plan || 'pro',
          status: s.status || 'active',
          subscription_start_date: s.current_period_start || s.subscription_start_at || s.created_at,
          subscription_end_date: s.current_period_end || s.subscription_end_at,
          cashfree_order_id: s.cashfree_order_id || null,
          amount_minor: Math.round(Number(s.amount || 0) * 100),
          created_at: s.created_at,
        },
        error: null,
      };
    }
    return { data: null, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Failed to load subscription' };
  }
}

export async function fetchShopSubscriptions(
  shopId: string
): Promise<{ data: ShopSubscriptionRow[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    const rows = (data || []).map((s: any) => ({
      id: s.id,
      shop_id: s.shop_id,
      plan_id: s.plan || 'pro',
      status: s.status || 'active',
      subscription_start_date: s.current_period_start || s.subscription_start_at || s.created_at,
      subscription_end_date: s.current_period_end || s.subscription_end_at,
      cashfree_order_id: s.cashfree_order_id || null,
      amount_minor: Math.round(Number(s.amount || 0) * 100),
      created_at: s.created_at,
    }));
    return { data: rows, error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Failed to load subscriptions' };
  }
}

export function normalizeSubscriptionAmount(amtMinor?: number | null, amt?: number | null): number {
  if (typeof amtMinor === 'number' && amtMinor > 0) {
    if (amtMinor >= 10000) return Math.round(amtMinor / 100);
    return amtMinor;
  }
  if (typeof amt === 'number' && amt > 0) return amt;
  return 0;
}

export function isSubscriptionActive(sub: ShopSubscriptionRow | null): boolean {
  if (!sub) return false;
  if (sub.status !== 'active' && sub.status !== 'trialing') return false;
  if (!sub.subscription_end_date) return true;
  return new Date(sub.subscription_end_date).getTime() > Date.now();
}

export async function grantProPlan(
  shopId: string,
  planId: ManualProPlan
): Promise<{ data: ShopSubscriptionRow | null; error: string | null }> {
  try {
    const months = planId === '3_months' ? 3 : planId === '6_months' ? 6 : 12;
    const start = new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + months);

    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        shop_id: shopId,
        plan: 'pro',
        plan_name: `Pro Plan (${months} Months)`,
        status: 'active',
        amount: 2999,
        current_period_start: start.toISOString(),
        current_period_end: end.toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;
    return {
      data: {
        id: data.id,
        shop_id: data.shop_id,
        plan_id: planId,
        status: data.status,
        subscription_start_date: data.current_period_start,
        subscription_end_date: data.current_period_end,
        cashfree_order_id: 'manual-admin-grant',
        amount_minor: 299900,
        created_at: data.created_at,
      },
      error: null,
    };
  } catch (err: any) {
    console.error('Error granting Pro:', err);
    return { data: null, error: err.message || 'Failed to grant Pro' };
  }
}

export async function revokeProPlan(
  subscriptionId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Error revoking Pro:', err);
    return { success: false, error: err.message || 'Failed to end Pro plan' };
  }
}

export interface CreateShopAccountParams {
  shopName: string;
  salonName?: string;
  ownerName: string;
  phone: string;
  email: string;
  password?: string;
  city?: string;
  address?: string;
  pinCode?: string;
  gstin?: string;
}
export type CreateSalonAccountParams = CreateShopAccountParams;

export async function createShopAccount(
  params: CreateShopAccountParams
): Promise<{ success: boolean; data?: Shop; error: string | null }> {
  try {
    const cleanPhone = normalizePhone(params.phone);
    const shopName = (params.shopName || params.salonName || '').trim();
    const { data, error } = await supabase
      .from('shops')
      .insert({
        name: shopName,
        owner_name: params.ownerName.trim(),
        phone: cleanPhone,
        email: params.email.trim().toLowerCase(),
        city: params.city?.trim() || 'Tamil Nadu',
        address: params.address?.trim() || null,
        pincode: params.pinCode?.trim() || null,
        gst_number: params.gstin?.trim() || null,
        is_active: true,
      })
      .select('*')
      .single();

    if (error) throw error;
    return { success: true, data, error: null };
  } catch (err: any) {
    console.error('Error creating shop:', err);
    return { success: false, error: err.message || 'Failed to create shop' };
  }
}
export const createSalonAccount = createShopAccount;

export async function resetAccountPassword(
  email: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const res = await fetch('/api/auth/reset-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail }),
    });
    if (res.ok) return { success: true, error: null };
    return { success: false, error: 'Could not reset credentials' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to send password reset request' };
  }
}
