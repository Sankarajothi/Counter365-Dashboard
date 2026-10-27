import { supabase } from './supabase';
import { Profile, Staff, Customer, ShopMember, StaffPermissions, DEFAULT_STAFF_PERMISSIONS, StylistPermissions, DEFAULT_STYLIST_PERMISSIONS } from '../types/database';

export async function fetchProfiles(): Promise<{ data: Profile[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err: any) {
    console.error('Error fetching profiles:', err);
    return { data: [], error: err.message || 'Unable to load profiles' };
  }
}

// Maps shop_members rows to Staff: real name/phone come from profiles, saved permissions from permissions_override, Owner first.
export async function membersToStaff(members: any[]): Promise<Staff[]> {
  const ids = Array.from(new Set(members.map((m) => m.user_id).filter(Boolean)));
  const { data: profiles } = ids.length
    ? await supabase.from('profiles').select('id, full_name, phone').in('id', ids)
    : { data: [] as any[] };
  const byId = new Map((profiles || []).map((p: any) => [p.id, p]));

  return members
    .map((m: any): Staff => {
      const prof: any = byId.get(m.user_id);
      return {
        id: m.id,
        shop_id: m.shop_id,
        profile_id: m.user_id || null,
        name: m.full_name || prof?.full_name || 'Staff Member',
        role: m.role || 'Staff',
        phone: m.phone || prof?.phone || null,
        is_active: m.is_active !== false,
        target_amount_minor: 0,
        permissions: { ...DEFAULT_STAFF_PERMISSIONS, ...(m.permissions_override || {}) },
        invitation_status: m.is_active ? 'active' : 'invited',
        invited_at: m.joined_at || m.created_at,
        created_at: m.created_at,
        updated_at: m.updated_at,
        shop: m.shop,
      };
    })
    .sort((a, b) => Number(b.role === 'Owner') - Number(a.role === 'Owner'));
}

export async function fetchStaff(): Promise<{ data: Staff[]; error: string | null }> {
  try {
    // CounterPro stores staff in shop_members
    const { data: members, error: memErr } = await supabase
      .from('shop_members')
      .select('*, shop:shops(id, name, city, phone)')
      .order('created_at', { ascending: false });

    if (memErr) throw memErr;

    return { data: await membersToStaff(members || []), error: null };
  } catch (err: any) {
    console.error('Error fetching staff:', err);
    return { data: [], error: err.message || 'Unable to load staff data' };
  }
}

export async function fetchCustomers(): Promise<{ data: Customer[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*, shop:shops(id, name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err: any) {
    console.error('Error fetching customers:', err);
    return { data: [], error: err.message || 'Unable to load customers' };
  }
}

export async function createStaff(params: {
  shop_id: string;
  name: string;
  phone: string;
  role: string;
  is_active?: boolean;
  permissions?: StaffPermissions;
  invitation_status?: string;
  invited_at?: string | null;
}): Promise<{ data: Staff | null; error: string | null }> {
  try {
    const phoneClean = params.phone.replace(/[^0-9]/g, '').slice(-10);
    if (phoneClean.length !== 10) throw new Error('A valid 10-digit phone number is required');

    // Staff must already have an app account; the row is linked to it via user_id.
    const { data: profile } = await supabase.from('profiles').select('id').eq('phone', phoneClean).maybeSingle();
    if (!profile) throw new Error('No app account found for this phone. Ask them to sign up in the app first.');

    const { data: existing } = await supabase
      .from('shop_members')
      .select('id')
      .eq('shop_id', params.shop_id)
      .eq('user_id', profile.id)
      .maybeSingle();
    if (existing) throw new Error('This person is already a member of the shop.');

    const { data, error } = await supabase
      .from('shop_members')
      .insert({
        shop_id: params.shop_id,
        user_id: profile.id,
        full_name: params.name.trim(),
        phone: phoneClean,
        role: params.role,
        is_active: params.is_active !== undefined ? params.is_active : true,
        permissions_override: params.permissions || {},
      })
      .select('*, shop:shops(id, name, city, phone)')
      .single();

    if (error) throw error;

    const staffObj: Staff = {
      id: data.id,
      shop_id: data.shop_id,
      name: data.full_name || params.name,
      role: data.role,
      phone: data.phone,
      is_active: data.is_active,
      permissions: params.permissions || DEFAULT_STAFF_PERMISSIONS,
      invitation_status: 'active',
      created_at: data.created_at,
      shop: data.shop,
    };

    return { data: staffObj, error: null };
  } catch (err: any) {
    console.error('Error creating staff member:', err);
    return { data: null, error: err.message || 'Failed to create staff member' };
  }
}

export async function updateStaff(
  id: string,
  updates: Partial<Staff>
): Promise<{ success: boolean; error: string | null }> {
  try {
    const payload: any = { updated_at: new Date().toISOString() };
    if (updates.name) payload.full_name = updates.name.trim();
    if (updates.role) payload.role = updates.role;
    if (updates.is_active !== undefined) payload.is_active = updates.is_active;
    if (updates.phone) payload.phone = updates.phone.replace(/[^0-9]/g, '').slice(-10);

    const { error } = await supabase
      .from('shop_members')
      .update(payload)
      .eq('id', id);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Error updating staff member:', err);
    return { success: false, error: err.message || 'Failed to update staff member' };
  }
}

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

export async function updateStaffInvitationStatus(
  staffId: string,
  status: 'not_invited' | 'invited' | 'active',
  invitedAt?: string | null
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('shop_members')
      .update({
        is_active: status === 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', staffId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Error updating invitation status:', err);
    return { success: false, error: err.message || 'Failed to update invitation status' };
  }
}

export async function deleteStaff(staffId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('shop_members')
      .delete()
      .eq('id', staffId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Error deleting staff member:', err);
    return { success: false, error: err.message || 'Failed to delete staff member' };
  }
}

export async function fetchShopMembers(): Promise<{ data: ShopMember[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('shop_members')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: (data as ShopMember[]) || [], error: null };
  } catch (err: any) {
    console.error('Error fetching shop members:', err);
    return { data: [], error: err.message || 'Unable to load shop members' };
  }
}
