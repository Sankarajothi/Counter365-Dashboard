import { supabase } from './supabase';
import { Profile, Staff, Customer, StylistPermissions, DEFAULT_STYLIST_PERMISSIONS } from '../types/database';

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

export async function fetchStaff(): Promise<{ data: Staff[]; error: string | null }> {
  try {
    // CounterPro stores staff in shop_members
    const { data: members, error: memErr } = await supabase
      .from('shop_members')
      .select('*, shop:shops(id, name, city, phone)')
      .order('created_at', { ascending: false });

    if (memErr) throw memErr;

    const staffList: Staff[] = (members || []).map((m: any) => ({
      id: m.id,
      shop_id: m.shop_id,
      profile_id: m.user_id || null,
      name: m.full_name || 'Staff Member',
      role: m.role || 'Staff',
      phone: m.phone || null,
      is_active: m.is_active !== false,
      target_amount_minor: 0,
      permissions: DEFAULT_STYLIST_PERMISSIONS,
      invitation_status: m.is_active ? 'active' : 'invited',
      invited_at: m.joined_at || m.created_at,
      created_at: m.created_at,
      updated_at: m.updated_at,
      shop: m.shop,
    }));

    return { data: staffList, error: null };
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
  phone?: string | null;
  role?: string;
  is_active?: boolean;
  permissions?: StylistPermissions;
  invitation_status?: string;
  invited_at?: string | null;
}): Promise<{ data: Staff | null; error: string | null }> {
  try {
    const phoneClean = params.phone ? params.phone.replace(/[^0-9]/g, '').slice(-10) : null;
    const { data, error } = await supabase
      .from('shop_members')
      .insert({
        shop_id: params.shop_id,
        full_name: params.name.trim(),
        phone: phoneClean,
        role: params.role || 'Supervisor',
        is_active: params.is_active !== undefined ? params.is_active : true,
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
      permissions: params.permissions || DEFAULT_STYLIST_PERMISSIONS,
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
  permissions: StylistPermissions
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
    console.error('Error updating stylist permissions:', err);
    return { success: false, error: err.message || 'Failed to update stylist permissions' };
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
