import React, { useState, useMemo } from 'react';
import {
  Users,
  Store,
  Phone,
  Shield,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  Filter,
  MessageCircle,
  Edit2,
  Trash2,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Smartphone,
  Calendar,
  Sparkles,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';
import { ExportButton } from '../common/ExportButton';
import { EmptyState } from '../common/EmptyState';
import { KPICard } from '../common/KPICard';
import {
  Shop,
  Staff,
  StaffPermissions,
  DEFAULT_STAFF_PERMISSIONS,
} from '../../types/database';
import {
  createStaff,
  updateStaff,
  updateStaffPermissions,
  updateStaffInvitationStatus,
  deleteStaff,
} from '../../services/usersService';
import { formatDateTime, formatDate } from '../../utils/dateUtils';

export interface ShopStaffViewProps {
  staff: Staff[];
  shops: Shop[];
  loading?: boolean;
  onRefresh?: () => void;
  onSelectSalon?: (shop: Shop) => void;
  onSelectShop?: (shop: Shop) => void;
}

export type StylistsViewProps = ShopStaffViewProps;

const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.counterpro.app';

const MODULE_DEFINITIONS: {
  key: keyof StaffPermissions;
  label: string;
  description: string;
  icon: string;
}[] = [
  { key: 'customers', label: 'Customers', description: 'View and add client directory & history', icon: '👥' },
  { key: 'sales', label: 'Sales & Billing', description: 'Create and view bills, payments & invoices', icon: '🧾' },
  { key: 'appointments', label: 'Orders & Tables', description: 'Manage dine-in orders and table billing', icon: '📋' },
  { key: 'reminders', label: 'Reminders', description: 'Send automated WhatsApp reminders & alerts', icon: '🔔' },
  { key: 'expenses', label: 'Expenses', description: 'View and record store operational expenses', icon: '💰' },
  { key: 'reports', label: 'Reports & BI', description: 'Access financial & performance analytics', icon: '📊' },
  { key: 'team', label: 'Team', description: 'View staff members, roles & permissions', icon: '👥' },
  { key: 'profile', label: 'Profile & Settings', description: 'View and edit shop profile & configuration', icon: '⚙️' },
];

export const ShopStaffView: React.FC<ShopStaffViewProps> = ({
  staff,
  shops,
  loading = false,
  onRefresh,
  onSelectShop,
  onSelectSalon,
}) => {
  const handleSelectShop = onSelectShop || onSelectSalon;

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShopFilter, setSelectedShopFilter] = useState<string>('all');
  const [inviteStatusFilter, setInviteStatusFilter] = useState<string>('all');
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('all');

  // Modals
  const [permissionModalStaff, setPermissionModalStaff] = useState<Staff | null>(null);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [deleteConfirmStaff, setDeleteConfirmStaff] = useState<Staff | null>(null);

  // Form states for Add/Edit
  const [formShopId, setFormShopId] = useState('');
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState('Builder');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formPermissions, setFormPermissions] = useState<StaffPermissions>(DEFAULT_STAFF_PERMISSIONS);
  const [formSendInvite, setFormSendInvite] = useState(true);

  // Action pending states
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staff.filter((st) => {
      // 1. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const nameMatch = (st.name || '').toLowerCase().includes(query);
        const phoneMatch = st.phone ? st.phone.includes(query) : false;
        const shopMatch = st.shop?.name ? st.shop.name.toLowerCase().includes(query) : false;
        const roleMatch = st.role ? st.role.toLowerCase().includes(query) : false;
        if (!nameMatch && !phoneMatch && !shopMatch && !roleMatch) return false;
      }

      // 2. Shop filter
      if (selectedShopFilter !== 'all') {
        const selectedShop = shops.find((s) => s.id === selectedShopFilter);
        const allowedIds = selectedShop?.duplicate_ids ? selectedShop.duplicate_ids : [selectedShopFilter];
        if (!allowedIds.includes(st.shop_id)) return false;
      }

      // 3. Invitation status filter
      if (inviteStatusFilter !== 'all') {
        const status = st.invitation_status || 'not_invited';
        if (inviteStatusFilter === 'active' && status !== 'active') return false;
        if (inviteStatusFilter === 'invited' && status !== 'invited') return false;
        if (inviteStatusFilter === 'not_invited' && status !== 'not_invited') return false;
      }

      // 4. Account active filter
      if (activeStatusFilter !== 'all') {
        if (activeStatusFilter === 'active' && !st.is_active) return false;
        if (activeStatusFilter === 'inactive' && st.is_active) return false;
      }

      return true;
    });
  }, [staff, searchQuery, selectedShopFilter, inviteStatusFilter, activeStatusFilter, shops]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = staff.length;
    const appActive = staff.filter((s) => s.invitation_status === 'active').length;
    const invited = staff.filter((s) => s.invitation_status === 'invited').length;
    const notInvited = staff.filter((s) => !s.invitation_status || s.invitation_status === 'not_invited').length;
    const activeAccounts = staff.filter((s) => s.is_active).length;

    return { total, appActive, invited, notInvited, activeAccounts };
  }, [staff]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingStaff(null);
    setFormShopId(shops[0]?.id || '');
    setFormName('');
    setFormPhone('');
    setFormRole('Builder');
    setFormIsActive(true);
    setFormPermissions(DEFAULT_STAFF_PERMISSIONS);
    setFormSendInvite(true);
    setIsAddEditModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (st: Staff) => {
    setEditingStaff(st);
    setFormShopId(st.shop_id);
    setFormName(st.name);
    setFormPhone(st.phone || '');
    setFormRole(st.role || 'Builder');
    setFormIsActive(st.is_active);
    setFormPermissions(st.permissions || DEFAULT_STAFF_PERMISSIONS);
    setFormSendInvite(false);
    setIsAddEditModalOpen(true);
  };

  // Save Add/Edit
  const handleSaveStaffForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formShopId) {
      showFeedback('Please select a shop for this staff member', 'error');
      return;
    }
    if (!formName.trim()) {
      showFeedback('Staff name is required', 'error');
      return;
    }

    const cleanPhone = formPhone.replace(/[^0-9]/g, '').slice(-10);
    if (formPhone.trim() && cleanPhone.length !== 10) {
      showFeedback('Please enter a valid 10-digit mobile number', 'error');
      return;
    }

    setActionLoading(true);

    try {
      if (editingStaff) {
        // Update existing
        const res = await updateStaff(editingStaff.id, {
          shop_id: formShopId,
          name: formName.trim(),
          phone: cleanPhone || null,
          role: formRole.trim(),
          is_active: formIsActive,
          permissions: formPermissions,
        });

        if (res.error) throw new Error(res.error);
        showFeedback(`Staff "${formName}" updated successfully`);
      } else {
        // Create new
        const res = await createStaff({
          shop_id: formShopId,
          name: formName.trim(),
          phone: cleanPhone || null,
          role: formRole.trim(),
          is_active: formIsActive,
          permissions: formPermissions,
          invitation_status: 'not_invited',
        });

        if (res.error) throw new Error(res.error);
        showFeedback(`Staff "${formName}" added successfully`);

        // If send invite was selected and phone exists, open WhatsApp invite
        if (formSendInvite && cleanPhone && res.data) {
          handleSendWhatsAppInvite(res.data);
        }
      }

      setIsAddEditModalOpen(false);
      onRefresh?.();
    } catch (err: any) {
      showFeedback(err.message || 'Operation failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Single Permission in Modal
  const handleTogglePermission = async (key: keyof StaffPermissions) => {
    if (!permissionModalStaff) return;
    const currentPerms = permissionModalStaff.permissions || DEFAULT_STAFF_PERMISSIONS;
    const updated: StaffPermissions = {
      ...currentPerms,
      [key]: !currentPerms[key],
    };

    setPermissionModalStaff({
      ...permissionModalStaff,
      permissions: updated,
    });

    const res = await updateStaffPermissions(permissionModalStaff.id, updated);
    if (res.error) {
      showFeedback('Failed to update permission in database', 'error');
    } else {
      onRefresh?.();
    }
  };

  // Grant or Revoke All Permissions
  const handleBulkPermissions = async (grant: boolean) => {
    if (!permissionModalStaff) return;
    const updated: StaffPermissions = {
      customers: grant,
      sales: grant,
      appointments: grant,
      expenses: grant,
      reports: grant,
      team: grant,
      reminders: grant,
      profile: grant,
    };

    setPermissionModalStaff({
      ...permissionModalStaff,
      permissions: updated,
    });

    const res = await updateStaffPermissions(permissionModalStaff.id, updated);
    if (res.error) {
      showFeedback('Failed to update permissions', 'error');
    } else {
      showFeedback(grant ? 'All permissions granted' : 'All permissions revoked');
      onRefresh?.();
    }
  };

  // Toggle Active/Inactive status directly in list
  const handleToggleActive = async (st: Staff) => {
    const newStatus = !st.is_active;
    setActionLoading(true);
    const res = await updateStaff(st.id, { is_active: newStatus });
    setActionLoading(false);

    if (res.error) {
      showFeedback('Failed to toggle status', 'error');
    } else {
      showFeedback(`Staff is now ${newStatus ? 'Active' : 'Inactive'}`);
      onRefresh?.();
    }
  };

  // Send WhatsApp Invite
  const handleSendWhatsAppInvite = async (st: Staff) => {
    if (!st.phone) {
      showFeedback('Cannot send WhatsApp invite: No phone number registered for this staff member', 'error');
      return;
    }

    const cleanPhone = st.phone.replace(/[^0-9]/g, '').slice(-10);
    const shopName = st.shop?.name || 'our shop';
    const message = encodeURIComponent(
      `Hello ${st.name}! You have been invited to join ${shopName} on CounterPro.\n\n` +
      `Download the CounterPro POS app from Google Play Store to manage orders, bills, and customers:\n` +
      `${PLAY_STORE_URL}\n\n` +
      `Log in using your registered mobile number: +91 ${cleanPhone}`
    );

    const waUrl = `https://wa.me/91${cleanPhone}?text=${message}`;

    // Mark as invited in database
    await updateStaffInvitationStatus(st.id, 'invited', new Date().toISOString());
    onRefresh?.();

    // Open WhatsApp in new tab
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    showFeedback(`WhatsApp invitation opened for ${st.name}`);
  };

  // Delete Staff
  const handleDeleteStaff = async () => {
    if (!deleteConfirmStaff) return;
    setActionLoading(true);
    const res = await deleteStaff(deleteConfirmStaff.id);
    setActionLoading(false);

    if (res.error) {
      showFeedback(res.error || 'Failed to delete staff member', 'error');
    } else {
      showFeedback(`Staff "${deleteConfirmStaff.name}" has been removed`);
      setDeleteConfirmStaff(null);
      onRefresh?.();
    }
  };

  // Copy phone number
  const handleCopyPhone = (id: string, phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhoneId(id);
    setTimeout(() => setCopiedPhoneId(null), 2000);
    showFeedback('Phone number copied to clipboard');
  };

  return (
    <div className="space-y-6">
      {/* Feedback Toast */}
      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-md transition-all ${
            feedbackMessage.type === 'success'
              ? 'bg-[#D4621A]/15 text-black border-[#D4621A]/30'
              : 'bg-[#D4621A]/10 text-black border-[#D4621A]/25'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#D4621A]" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-[#D4621A]" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-black/60 hover:text-black font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner & KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <KPICard
          title="Total Staff"
          value={metrics.total}
          subtitle={`Across ${shops.length} shops`}
          icon={Users}
          tone="revenue"
        />
        <KPICard
          title="App Active"
          value={metrics.appActive}
          subtitle="Logged in app"
          icon={Smartphone}
          tone="usage"
        />
        <KPICard
          title="WA Invited"
          value={metrics.invited}
          subtitle="Invite delivered"
          icon={MessageCircle}
          tone="conversion"
        />
        <KPICard
          title="Pending Invite"
          value={metrics.notInvited}
          subtitle="Needs invite"
          icon={Users}
          tone="neutral"
        />
        <KPICard
          title="Active Status"
          value={metrics.activeAccounts}
          subtitle="Enabled work"
          icon={CheckCircle2}
          tone="order-good"
        />
      </div>

      {/* Control Bar: Search, Filters & Actions */}
      <div className="panel">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff by name, phone, shop, or role..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/70 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#D4621A] focus:bg-white transition-all"
              />
            </div>

            {/* Shop Dropdown Filter */}
            <div className="min-w-[160px]">
              <select
                value={selectedShopFilter}
                onChange={(e) => setSelectedShopFilter(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/70 text-slate-800 focus:outline-none focus:border-[#D4621A] transition-all"
              >
                <option value="all">All Shops ({shops.length})</option>
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Invitation Status Filter */}
            <div className="min-w-[140px]">
              <select
                value={inviteStatusFilter}
                onChange={(e) => setInviteStatusFilter(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/70 text-slate-800 focus:outline-none focus:border-[#D4621A] transition-all"
              >
                <option value="all">All Invite Statuses</option>
                <option value="active">App Active</option>
                <option value="invited">Invited</option>
                <option value="not_invited">Not Invited</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <ExportButton
              data={filteredStaff.map((s) => {
                const perms = s.permissions || DEFAULT_STAFF_PERMISSIONS;
                return {
                  Name: s.name,
                  Role: s.role,
                  Phone: s.phone ? `+91 ${s.phone}` : '—',
                  Shop: s.shop?.name || '—',
                  Status: s.is_active ? 'Active' : 'Inactive',
                  Invitation: s.invitation_status || 'not_invited',
                  InvitedAt: s.invited_at ? formatDate(s.invited_at) : '—',
                  CustomersAccess: perms.customers ? 'Yes' : 'No',
                  SalesAccess: perms.sales ? 'Yes' : 'No',
                  OrdersAccess: perms.appointments ? 'Yes' : 'No',
                  RemindersAccess: perms.reminders ? 'Yes' : 'No',
                  ExpensesAccess: perms.expenses ? 'Yes' : 'No',
                  ReportsAccess: perms.reports ? 'Yes' : 'No',
                  TeamAccess: perms.team ? 'Yes' : 'No',
                  ProfileAccess: perms.profile ? 'Yes' : 'No',
                };
              })}
              filename="counterpro_shops_staff.csv"
            />

            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4621A] text-white hover:bg-[#bf5312] text-xs font-semibold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>Add Staff</span>
            </button>
          </div>
        </div>
      </div>

      {/* Shops / Staff Table */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-[#D4621A]" />
            <h3 className="text-sm font-bold text-gray-900 m-0">Shops</h3>
          </div>
          <span className="text-xs text-gray-500 font-mono">
            {filteredStaff.length} staff members across shops
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-neutral-500 animate-pulse">
            Loading team & staff from Supabase...
          </div>
        ) : filteredStaff.length === 0 ? (
          <EmptyState
            title="No Staff Found"
            description={
              searchQuery || selectedShopFilter !== 'all' || inviteStatusFilter !== 'all'
                ? 'No staff members match the selected filter criteria. Try adjusting your filters or search query.'
                : 'No staff currently registered. Click "+ Add Staff" to add the first staff member.'
            }
            actionText="+ Add First Staff"
            onAction={handleOpenAdd}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-700 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Shop Assigned</th>
                  <th className="py-3 px-4">Mobile Number</th>
                  <th className="py-3 px-4">Invitation Status</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Module Permissions</th>
                  <th className="py-3 px-4 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredStaff.map((st) => {
                  const perms = st.permissions || DEFAULT_STAFF_PERMISSIONS;
                  const grantedCount = Object.values(perms).filter(Boolean).length;
                  const isAppActive = st.invitation_status === 'active';
                  const isInvited = st.invitation_status === 'invited';

                  // Format role badge: Supervisor, Builder, Cashier, Admin
                  const roleFormatted = st.role
                    ? st.role.charAt(0).toUpperCase() + st.role.slice(1)
                    : 'Builder';

                  return (
                    <tr key={st.id} className="hover:bg-neutral-50/80 transition-colors">
                      {/* Staff Member Column */}
                      <td className="py-3.5 px-4 font-medium text-neutral-900">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#D4621A]/10 text-[#D4621A] flex items-center justify-center font-bold text-xs uppercase shrink-0 border border-[#D4621A]/20">
                            {st.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-neutral-900 flex items-center gap-1.5">
                              <span>{st.name}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                                {roleFormatted}
                              </span>
                            </div>
                            <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
                              ID: {st.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Shop Column */}
                      <td className="py-3.5 px-4">
                        {st.shop ? (
                          <div>
                            <button
                              onClick={() => handleSelectShop && handleSelectShop(st.shop!)}
                              className="font-bold text-black hover:text-[#D4621A] hover:underline flex items-center gap-1 text-left cursor-pointer"
                            >
                              <Store className="w-3.5 h-3.5 text-[#D4621A] shrink-0" />
                              <span>{st.shop.name}</span>
                            </button>
                            <div className="text-[11px] text-neutral-500 font-mono">
                              {st.shop.city || 'Tamil Nadu'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-neutral-400 italic">Unassigned Shop</span>
                        )}
                      </td>

                      {/* Phone Column */}
                      <td className="py-3.5 px-4 font-mono">
                        {st.phone ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-neutral-900 font-bold">+91 {st.phone}</span>
                            <button
                              onClick={() => handleCopyPhone(st.id, st.phone!)}
                              title="Copy Phone Number"
                              className="text-neutral-400 hover:text-neutral-700 p-0.5 rounded cursor-pointer transition-colors"
                            >
                              {copiedPhoneId === st.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-neutral-400 italic font-sans">No phone linked</span>
                        )}
                      </td>

                      {/* Invitation Status Column */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {isAppActive ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#D4621A] text-white shadow-2xs">
                              <Smartphone className="w-3 h-3 text-white" />
                              <span>App Active</span>
                            </span>
                          ) : isInvited ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#D4621A]/15 text-[#D4621A] border border-[#D4621A]/30">
                              <MessageCircle className="w-3 h-3 text-[#D4621A]" />
                              <span>Invited</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-200">
                              <span>Not Invited</span>
                            </span>
                          )}

                          {st.invited_at && (
                            <div className="text-[10px] text-neutral-400 font-mono">
                              {formatDate(st.invited_at)}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleActive(st)}
                            title={`Click to ${st.is_active ? 'deactivate' : 'activate'} this staff member`}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              st.is_active ? 'bg-[#D4621A]' : 'bg-neutral-300'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                st.is_active ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span
                            className={`text-xs font-semibold ${
                              st.is_active ? 'text-black' : 'text-neutral-400'
                            }`}
                          >
                            {st.is_active ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                      </td>

                      {/* Permissions Matrix Column */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => setPermissionModalStaff(st)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-200 hover:border-[#D4621A] hover:bg-[#D4621A]/5 text-neutral-800 transition-all cursor-pointer group"
                        >
                          <Shield className="w-3.5 h-3.5 text-[#D4621A] group-hover:scale-110 transition-transform" />
                          <span className="font-bold font-mono text-[11px]">
                            {grantedCount}/8 Modules
                          </span>
                          <span className="text-[10px] text-neutral-400 group-hover:text-black">
                            Configure →
                          </span>
                        </button>
                      </td>

                      {/* Admin Actions Column */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Send WhatsApp Invite Button */}
                          <button
                            onClick={() => handleSendWhatsAppInvite(st)}
                            title="Send/Resend App Invite via WhatsApp"
                            className="p-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Details */}
                          <button
                            onClick={() => handleOpenEdit(st)}
                            title="Edit Staff Details"
                            className="p-1.5 rounded-lg text-neutral-600 hover:text-black hover:bg-neutral-100 border border-neutral-200 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Staff */}
                          <button
                            onClick={() => setDeleteConfirmStaff(st)}
                            title="Remove Staff"
                            className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* MODAL 1: STAFF PERMISSIONS CONTROL MODAL                             */}
      {/* ==================================================================== */}
      {permissionModalStaff && (
        <Modal
          isOpen={!!permissionModalStaff}
          onClose={() => setPermissionModalStaff(null)}
          title={`Staff Permissions: ${permissionModalStaff.name}`}
          subtitle={`Role: ${permissionModalStaff.role || 'Staff'} • Shop: ${
            permissionModalStaff.shop?.name || 'Assigned Shop'
          }`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {/* Header / Bulk controls */}
            <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#D4621A]" />
                <span className="font-bold text-neutral-900">Module Access Controls</span>
                <span className="text-neutral-500 font-mono text-[11px]">
                  ({Object.values(permissionModalStaff.permissions || DEFAULT_STAFF_PERMISSIONS).filter(Boolean).length}/8 Active)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleBulkPermissions(true)}
                  className="px-2.5 py-1 rounded-lg bg-black text-white hover:bg-neutral-800 text-[10.5px] font-bold cursor-pointer"
                >
                  Grant All
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkPermissions(false)}
                  className="px-2.5 py-1 rounded-lg bg-neutral-200 text-neutral-700 hover:bg-neutral-300 text-[10.5px] font-bold cursor-pointer"
                >
                  Revoke All
                </button>
              </div>
            </div>

            {/* Permissions Matrix Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {MODULE_DEFINITIONS.map((mod) => {
                const perms = permissionModalStaff.permissions || DEFAULT_STAFF_PERMISSIONS;
                const isEnabled = Boolean(perms[mod.key]);

                return (
                  <div
                    key={mod.key}
                    onClick={() => handleTogglePermission(mod.key)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                      isEnabled
                        ? 'border-[#D4621A]/40 bg-[#D4621A]/5 shadow-2xs'
                        : 'border-neutral-200 bg-white hover:border-neutral-300 opacity-70'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-base leading-none mt-0.5">{mod.icon}</span>
                      <div>
                        <div className="font-bold text-xs text-neutral-900 flex items-center gap-1.5">
                          <span>{mod.label}</span>
                          {isEnabled && (
                            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#D4621A] bg-[#D4621A]/10 px-1.5 py-0.2 rounded">
                              Allowed
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-500 mt-0.5 leading-snug">
                          {mod.description}
                        </div>
                      </div>
                    </div>

                    <div className="pt-0.5">
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
                          isEnabled ? 'bg-[#D4621A] text-white' : 'bg-neutral-200 text-transparent'
                        }`}
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-neutral-200">
              <span className="text-[11px] text-neutral-400">
                Staff ID: <code className="font-mono text-neutral-800">{permissionModalStaff.id}</code>
              </span>
              <button
                type="button"
                onClick={() => setPermissionModalStaff(null)}
                className="px-4 py-2 rounded-xl bg-black text-white hover:bg-neutral-800 font-bold text-xs transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: ADD / EDIT STAFF MODAL                                      */}
      {/* ==================================================================== */}
      {isAddEditModalOpen && (
        <Modal
          isOpen={isAddEditModalOpen}
          onClose={() => setIsAddEditModalOpen(false)}
          title={editingStaff ? `Edit Staff: ${editingStaff.name}` : 'Add New Staff Member'}
          subtitle="Configure staff member credentials, shop assignment, and permissions."
          maxWidth="lg"
        >
          <form onSubmit={handleSaveStaffForm} className="space-y-4">
            {/* Shop Selection */}
            <div>
              <label className="block text-xs font-bold text-black/80 mb-1">
                Select Shop <span className="text-[#D4621A]">*</span>
              </label>
              <select
                value={formShopId}
                onChange={(e) => setFormShopId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#D4621A]/30 bg-[#F8F3F0] text-black focus:outline-none focus:border-[#D4621A]"
              >
                <option value="">-- Choose a shop --</option>
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.city ? `(${s.city})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Staff Name */}
            <div>
              <label className="block text-xs font-bold text-black/80 mb-1">
                Staff Full Name <span className="text-[#D4621A]">*</span>
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#D4621A]/30 bg-[#F8F3F0] text-black focus:outline-none focus:border-[#D4621A]"
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Mobile Number (for OTP & WhatsApp Invite)
              </label>
              <div className="flex items-center">
                <span className="px-3 py-2 text-xs bg-neutral-100 border border-r-0 border-neutral-200 rounded-l-xl text-neutral-600 font-semibold font-mono">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full px-3 py-2 text-xs rounded-r-xl border border-neutral-200 bg-white text-neutral-900 font-mono focus:outline-none focus:border-black"
                />
              </div>
              <p className="text-[10px] text-neutral-500 mt-1">
                10-digit number used by staff member to sign in via Supabase OTP on mobile.
              </p>
            </div>

            {/* Role / Designation */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Role / Title
              </label>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {['Supervisor', 'Builder', 'Cashier', 'Admin'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setFormRole(r)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      formRole === r
                        ? 'bg-[#D4621A] text-white border-[#D4621A]'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
                placeholder="e.g. Supervisor, Builder, Cashier, Admin"
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:border-black"
              />
            </div>

            {/* Active Toggle */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="formIsActive"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="rounded border-neutral-300 text-black focus:ring-black"
              />
              <label htmlFor="formIsActive" className="text-xs font-semibold text-neutral-800">
                Active Staff Member (Can be assigned to bills and orders)
              </label>
            </div>

            {/* Auto WhatsApp Invite Checkbox (only for new creation) */}
            {!editingStaff && (
              <div className="flex items-center gap-2 p-3 rounded-xl border border-neutral-200 bg-neutral-50">
                <input
                  type="checkbox"
                  id="formSendInvite"
                  checked={formSendInvite}
                  onChange={(e) => setFormSendInvite(e.target.checked)}
                  className="rounded border-neutral-300 text-black focus:ring-black"
                />
                <label htmlFor="formSendInvite" className="text-xs font-semibold text-neutral-900">
                  Prompt WhatsApp invitation immediately upon creation
                </label>
              </div>
            )}

            {/* Form Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setIsAddEditModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-black text-white hover:bg-neutral-800 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />}
                <span>{editingStaff ? 'Update Staff' : 'Save Staff'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: DELETE CONFIRMATION MODAL                                   */}
      {/* ==================================================================== */}
      {deleteConfirmStaff && (
        <Modal
          isOpen={!!deleteConfirmStaff}
          onClose={() => setDeleteConfirmStaff(null)}
          title="Remove Staff"
          subtitle="Are you sure you want to remove this staff member from the shop?"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl border border-[#D4621A]/20 bg-[#D4621A]/10 text-xs text-black leading-relaxed">
              This will remove <strong>{deleteConfirmStaff.name}</strong> from shop{' '}
              <strong>{deleteConfirmStaff.shop?.name || 'assigned shop'}</strong>. Past bills and orders will retain historical staff attribution.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D4621A]/15">
              <button
                type="button"
                onClick={() => setDeleteConfirmStaff(null)}
                className="px-3.5 py-1.5 rounded-xl border border-[#D4621A]/30 text-xs font-semibold text-black/70 hover:bg-[#D4621A]/10 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteStaff}
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-xl bg-[#D4621A] text-white hover:bg-[#bf5312] font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// Aliases for backward compatibility
export const StylistsView = ShopStaffView;
