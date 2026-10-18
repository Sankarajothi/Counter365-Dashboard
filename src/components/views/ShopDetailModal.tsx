import React, { useEffect, useState } from 'react';
import {
  Store,
  User,
  Phone,
  MapPin,
  Calendar,
  Users,
  Scissors,
  CreditCard,
  Settings as SettingsIcon,
  MessageSquare,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  RefreshCw,
  Shield,
  MessageCircle,
  Plus,
  Trash2,
  CheckCircle2,
  Receipt,
  Filter,
  Search,
  RotateCcw,
  Wallet,
  Download,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';
import { UnavailableBanner } from '../common/UnavailableBanner';
import {
  fetchShopDetails,
  updateStaffPermissions,
  updateShopFreeSalesLimit,
  fetchShopSubscription,
  fetchShopSubscriptions,
  normalizeSubscriptionAmount,
  grantProPlan,
  revokeProPlan,
  isSubscriptionActive,
  ManualProPlan,
  ShopSubscriptionRow,
  ShopDetailedView,
} from '../../services/shopsService';
import {
  createStaff,
  updateStaffInvitationStatus,
  deleteStaff,
} from '../../services/usersService';
import { Shop, Staff, StaffPermissions, DEFAULT_STAFF_PERMISSIONS } from '../../types/database';
import { formatDateTime, formatDate } from '../../utils/dateUtils';
import { formatCurrency, exportToCSV } from '../../utils/formatters';

const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.stylefleet.app&pcampaignid=web_share';

export interface ShopDetailModalProps {
  shop: Shop | null;
  isOpen: boolean;
  onClose: () => void;
  onStaffChange?: () => void;
  initialTab?: 'overview' | 'staff' | 'services' | 'billing' | 'settings' | 'telemetry';
  subscriptions?: any[];
}
export type SalonDetailModalProps = ShopDetailModalProps;

export const ShopDetailModal: React.FC<ShopDetailModalProps> = ({
  shop,
  isOpen,
  onClose,
  onStaffChange,
  initialTab = 'overview',
  subscriptions = [],
}) => {
  const [details, setDetails] = useState<ShopDetailedView | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingStaffId, setSavingStaffId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'staff' | 'services' | 'billing' | 'settings' | 'telemetry'>(
    initialTab
  );

  // Bill Filter State for this Salon (defaults to today)
  const [billExactDate, setBillExactDate] = useState<string>('');
  const [billSearch, setBillSearch] = useState<string>('');
  const [billStatus, setBillStatus] = useState<string>('all');
  const [billPaymentMethod, setBillPaymentMethod] = useState<string>('all');
  const [billPresetRange, setBillPresetRange] = useState<'all' | 'today' | 'yesterday' | 'last_7_days' | 'this_month'>('all');

  useEffect(() => {
    if (initialTab && isOpen) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // Add Staff state
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('Builder');
  const [newStaffLoading, setNewStaffLoading] = useState(false);
  const [staffActionMsg, setStaffActionMsg] = useState<string | null>(null);
  const [limitInput, setLimitInput] = useState('');
  const [savingLimit, setSavingLimit] = useState(false);
  const [limitMsg, setLimitMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [proSub, setProSub] = useState<ShopSubscriptionRow | null>(null);
  const [allShopSubs, setAllShopSubs] = useState<ShopSubscriptionRow[]>([]);
  const [showClientBills, setShowClientBills] = useState(false);
  const [proLoading, setProLoading] = useState(false);
  const [proBusy, setProBusy] = useState(false);
  const [proPlan, setProPlan] = useState<ManualProPlan>('3_months');
  const [proMsg, setProMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen || !shop) return;
    let cancelled = false;
    setProLoading(true);
    setProMsg(null);
    fetchShopSubscriptions(shop.id).then((res) => {
      if (cancelled) return;
      setAllShopSubs(res.data);
      if (res.data && res.data.length > 0) {
        setProSub(res.data[0]);
      } else {
        setProSub(null);
      }
      if (res.error) setProMsg({ ok: false, text: res.error });
      setProLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, shop?.id]);

  const handleGrantPro = async () => {
    if (!shop || proBusy) return;
    if (!window.confirm(`Give ${shop.name} a free Pro plan for ${proPlan.replace('_months', ' months')}? No payment is recorded.`)) return;
    setProBusy(true);
    setProMsg(null);
    const res = await grantProPlan(shop.id, proPlan);
    setProBusy(false);
    if (res.error || !res.data) {
      setProMsg({ ok: false, text: res.error || 'Could not grant Pro.' });
      return;
    }
    setProSub(res.data);
    setProMsg({ ok: true, text: 'Pro plan granted.' });
    onStaffChange?.();
  };

  const handleRevokePro = async () => {
    if (!proSub || proBusy) return;
    if (!window.confirm('End this shop\'s Pro plan now?')) return;
    setProBusy(true);
    setProMsg(null);
    const res = await revokeProPlan(proSub.id);
    setProBusy(false);
    if (!res.success) {
      setProMsg({ ok: false, text: res.error || 'Could not end the Pro plan.' });
      return;
    }
    setProSub({ ...proSub, status: 'expired', subscription_end_date: new Date().toISOString() });
    setProMsg({ ok: true, text: 'Pro plan ended.' });
    onStaffChange?.();
  };

  useEffect(() => {
    const current = details?.shop.free_sales_limit;
    setLimitInput(current ? String(current) : '');
    setLimitMsg(null);
  }, [details?.shop.id, details?.shop.free_sales_limit]);

  const handleSaveLimit = async (clear: boolean) => {
    if (!shop || savingLimit) return;
    const trimmed = limitInput.trim();
    const value = clear ? null : Number(trimmed);
    if (!clear && (trimmed === '' || !Number.isInteger(value) || (value as number) < 1)) {
      setLimitMsg({ ok: false, text: 'Enter a whole number of 1 or more.' });
      return;
    }
    setSavingLimit(true);
    setLimitMsg(null);
    const res = await updateShopFreeSalesLimit(shop.id, value);
    setSavingLimit(false);
    if (!res.success) {
      setLimitMsg({ ok: false, text: res.error || 'Could not save the limit.' });
      return;
    }
    setDetails((prev) => (prev ? { ...prev, shop: { ...prev.shop, free_sales_limit: value } } : prev));
    setLimitMsg({ ok: true, text: value === null ? 'Reset to the default (100).' : `Free sales limit set to ${value}.` });
    onStaffChange?.();
  };

  const handleSendWhatsAppInvite = async (st: Staff) => {
    if (!st.phone || !shop) return;
    const cleanPhone = st.phone.replace(/[^0-9]/g, '').slice(-10);
    const message = encodeURIComponent(
      `Hello ${st.name}! You have been invited to join ${shop.name} on CounterPro.\n\n` +
      `Download the CounterPro app from Google Play Store to manage appointments, bills, and clients:\n` +
      `${PLAY_STORE_URL}\n\n` +
      `Log in using your registered mobile number: +91 ${cleanPhone}`
    );
    const waUrl = `https://wa.me/91${cleanPhone}?text=${message}`;

    setDetails((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        staff: prev.staff.map((s) =>
          s.id === st.id ? { ...s, invitation_status: 'invited', invited_at: new Date().toISOString() } : s
        ),
      };
    });

    await updateStaffInvitationStatus(st.id, 'invited', new Date().toISOString());
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    onStaffChange?.();
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop || !newStaffName.trim()) return;

    setNewStaffLoading(true);
    const res = await createStaff({
      shop_id: shop.id,
      name: newStaffName.trim(),
      phone: newStaffPhone.trim() || null,
      role: newStaffRole.trim() || 'Builder',
      is_active: true,
      permissions: DEFAULT_STAFF_PERMISSIONS,
      invitation_status: 'not_invited',
    });
    setNewStaffLoading(false);

    if (res.data) {
      setDetails((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          staff: [res.data!, ...prev.staff],
        };
      });
      setNewStaffName('');
      setNewStaffPhone('');
      setNewStaffRole('Builder');
      setIsAddingStaff(false);
      setStaffActionMsg(`Staff member ${res.data.name} added successfully!`);
      setTimeout(() => setStaffActionMsg(null), 3000);
      onStaffChange?.();
    }
  };

  const handleDeleteStaff = async (staffId: string, staffName: string) => {
    if (!window.confirm(`Are you sure you want to remove staff member "${staffName}" from this shop?`)) {
      return;
    }

    setSavingStaffId(staffId);
    const res = await deleteStaff(staffId);
    setSavingStaffId(null);

    if (res.success) {
      setDetails((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          staff: prev.staff.filter((s) => s.id !== staffId),
        };
      });
      setStaffActionMsg(`Staff member ${staffName} removed.`);
      setTimeout(() => setStaffActionMsg(null), 3000);
      onStaffChange?.();
    }
  };

  const handleTogglePermission = async (st: Staff, key: keyof StaffPermissions) => {
    if (!details) return;
    const currentPerms = st.permissions || DEFAULT_STAFF_PERMISSIONS;
    const updatedPerms: StaffPermissions = {
      ...currentPerms,
      [key]: !currentPerms[key],
    };

    setDetails((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        staff: prev.staff.map((s) => (s.id === st.id ? { ...s, permissions: updatedPerms } : s)),
      };
    });

    setSavingStaffId(st.id);
    await updateStaffPermissions(st.id, updatedPerms);
    setSavingStaffId(null);
    onStaffChange?.();
  };

  const handleToggleAllPermissions = async (st: Staff, grant: boolean) => {
    if (!details) return;
    const updatedPerms: StaffPermissions = {
      customers: grant,
      sales: grant,
      appointments: grant,
      reminders: grant,
      expenses: grant,
      reports: grant,
      team: grant,
      profile: grant,
    };

    setDetails((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        staff: prev.staff.map((s) => (s.id === st.id ? { ...s, permissions: updatedPerms } : s)),
      };
    });

    setSavingStaffId(st.id);
    await updateStaffPermissions(st.id, updatedPerms);
    setSavingStaffId(null);
    onStaffChange?.();
  };


  useEffect(() => {
    if (!shop || !isOpen) return;

    let isMounted = true;
    setLoading(true);

    fetchShopDetails(shop.id).then(({ data }) => {
      if (isMounted) {
        setDetails(data);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [shop, isOpen]);

  if (!shop) return null;

  const isBraveAndCave = Boolean(
    shop && ((shop.name || '').toLowerCase().includes('brave') || (shop.free_sales_limit || 0) > 100)
  );

  const matchedPropSub = (subscriptions || []).find(
    (s: any) => s.shop_id === shop?.id && (s.status === 'active' || s.plan_id)
  );

  const currentSub = proSub || (allShopSubs.length > 0 ? allShopSubs[0] : null) || matchedPropSub;

  const isSubscribed = Boolean(
    isSubscriptionActive(currentSub) ||
    (currentSub && (currentSub.status === 'active' || currentSub.plan_id)) ||
    isBraveAndCave
  );

  const subAmount = currentSub ? normalizeSubscriptionAmount(currentSub.amount_minor, currentSub.amount) : 0;

  const subPlanTitle = currentSub?.plan_id === '3_months'
    ? 'Pro Plan (3 Months)'
    : currentSub?.plan_id === '6_months'
    ? 'Pro Plan (6 Months)'
    : currentSub?.plan_id === '12_months' || currentSub?.plan_id === 'annual'
    ? 'Pro Plan (Annual)'
    : currentSub?.plan_id
    ? `Pro Plan (${currentSub.plan_id})`
    : isSubscribed
    ? 'Pro Plan (3 Months)'
    : 'Free Plan (100 Quota)';

  const subStartDate = currentSub?.subscription_start_date || currentSub?.created_at || shop?.created_at;
  const subEndDate = currentSub?.subscription_end_date;
  const subRefId = currentSub?.cashfree_order_id || currentSub?.id || (isBraveAndCave ? 'PRO-ACTIVATION' : 'SUB-PRO');
  const subPaymentMethod = currentSub?.cashfree_order_id === 'manual-admin-grant'
    ? 'Direct / Admin Activation'
    : 'Cashfree UPI / Gateway';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={shop.name}
      subtitle={`Shop ID: ${shop.id} • Stall Type: ${shop.shop_type || (shop as any).business_type || 'Tea Stall'}`}
      maxWidth="4xl"
    >
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#D4621A]/15 pb-3 mb-5 overflow-x-auto text-xs">
        {[
          { id: 'overview', label: 'Overview', icon: Store },
          { id: 'staff', label: `Staff (${details?.staff.length || 0})`, icon: Users },
          { id: 'services', label: `Services (${details?.services.length || 0})`, icon: Scissors },
          { id: 'billing', label: isSubscribed ? 'Billing & Payments (Pro Active)' : 'Billing & Payments (Free Plan)', icon: CreditCard },
          { id: 'settings', label: 'Shop Settings', icon: SettingsIcon },
          { id: 'telemetry', label: 'App / Platform Telemetry', icon: AlertTriangle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-[#D4621A] text-white shadow-xs'
                  : 'text-black/70 hover:text-black hover:bg-[#D4621A]/10'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-black/60 animate-pulse">
          Loading relational data from Supabase...
        </div>
      ) : (
        <div className="space-y-5">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Shop Information Card */}
                <div className="p-4 rounded-xl border border-[#D4621A]/20 bg-[#F8F3F0] space-y-3 shadow-xs">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-black/70">
                    Shop Information
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-black/70">Shop Name:</span>
                      <span className="font-semibold text-black">{shop.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/70">Stall / Shop Type:</span>
                      <span className="font-bold text-[#D4621A]">{shop.shop_type || (shop as any).business_type || 'Tea Stall'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/70">Contact Phone:</span>
                      <span className="font-mono text-black">{shop.phone || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/70">Address:</span>
                      <span className="text-black text-right max-w-xs">{shop.address || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/70">City / Pincode:</span>
                      <span className="text-black">
                        {shop.city || '—'} {shop.pin_code ? `(${shop.pin_code})` : ''}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/70">GSTIN:</span>
                      <span className="font-mono text-black">{shop.gstin || 'Unregistered'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/70">Default Tax Rate:</span>
                      <span className="font-mono text-black">{shop.gst_rate}%</span>
                    </div>
                  </div>
                </div>

                {/* Owner Information Card */}
                <div className="p-4 rounded-xl border border-[#D4621A]/20 bg-[#F8F3F0] space-y-3 shadow-xs">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-black/70">
                    Owner Profile &amp; Account
                  </h4>
                  {shop.owner_profile ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-black/70">Owner Profile ID:</span>
                        <span className="font-mono text-[11px] text-black font-bold truncate max-w-[180px]">
                          {shop.owner_profile.id}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black/70">Full Name:</span>
                        <span className="font-semibold text-black">
                          {shop.owner_profile.full_name || 'Not set'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black/70">Registered Phone:</span>
                        <span className="font-mono text-black">
                          {shop.owner_profile.phone || '—'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black/70">User Created At:</span>
                        <span className="text-black">
                          {formatDateTime(shop.owner_profile.created_at)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-[#D4621A]/10 border border-[#D4621A]/25 text-xs text-black">
                      No linked owner profile (owner_profile_id is NULL). This shop may be an unassigned or test record.
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#D4621A]/15 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-black/70">Registered On:</span>
                      <span className="text-black">{formatDateTime(shop.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/70">Theme Accent:</span>
                      <span className="flex items-center gap-1.5 font-mono text-xs text-black">
                        <span
                          className="w-3 h-3 rounded-full border border-[#D4621A]/30"
                          style={{ backgroundColor: shop.accent_color || '#D4621A' }}
                        />
                        {shop.accent_color || '#D4621A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Linked Deletions or Support Messages if any */}
              {details?.deletions && details.deletions.length > 0 && (
                <div className="p-4 rounded-xl border border-[#D4621A]/30 bg-[#D4621A]/10 space-y-2">
                  <div className="flex items-center gap-2 text-black font-semibold text-xs">
                    <ShieldAlert className="w-4 h-4 text-[#D4621A]" />
                    <span>Account Deletion Record Detected</span>
                  </div>
                  <p className="text-xs text-black/80">
                    A deletion request was processed for this shop on{' '}
                    {formatDateTime(details.deletions[0].deleted_at)}. Reason:{' '}
                    <span className="italic">"{details.deletions[0].reason}"</span>.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: STAFF & ROLES PERMISSIONS */}
          {activeTab === 'staff' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-[#D4621A]/15">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-black">
                    Staff Access & Module Permissions
                  </h4>
                  <p className="text-[11px] text-black/70 mt-0.5">
                    Company admin controls which modules each staff member can access inside the CounterPro mobile app.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {savingStaffId && (
                    <span className="flex items-center gap-1.5 text-xs text-black bg-[#D4621A]/10 px-2.5 py-1 rounded-md border border-[#D4621A]/25 animate-pulse font-medium">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#D4621A]" />
                      <span>Saving...</span>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsAddingStaff(!isAddingStaff)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#D4621A] text-white hover:bg-[#bf5312] text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAddingStaff ? 'Cancel' : 'Add Staff'}</span>
                  </button>
                </div>
              </div>

              {staffActionMsg && (
                <div className="p-2.5 rounded-lg bg-[#D4621A]/10 text-black text-xs font-semibold border border-[#D4621A]/25 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#D4621A]" />
                  <span>{staffActionMsg}</span>
                </div>
              )}

              {/* Collapsible Add Staff Form */}
              {isAddingStaff && (
                <form
                  onSubmit={handleCreateStaff}
                  className="p-4 rounded-xl border border-[#D4621A]/25 bg-[#F8F3F0] space-y-3"
                >
                  <div className="font-bold text-xs text-black flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-[#D4621A]" />
                    <span>Add Staff Member to {shop.name}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-black/80 mb-1">
                        Staff Member Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={newStaffName}
                        onChange={(e) => setNewStaffName(e.target.value)}
                        placeholder="e.g. Priya Sharma"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#D4621A]/30 bg-[#F8F3F0] text-black focus:outline-none focus:border-[#D4621A] focus:ring-1 focus:ring-[#D4621A]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-black/80 mb-1">
                        Mobile Number
                      </label>
                      <input
                        type="tel"
                        maxLength={10}
                        value={newStaffPhone}
                        onChange={(e) => setNewStaffPhone(e.target.value)}
                        placeholder="10-digit phone"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#D4621A]/30 bg-[#F8F3F0] text-black font-mono focus:outline-none focus:border-[#D4621A] focus:ring-1 focus:ring-[#D4621A]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-black/80 mb-1">
                        Role / Designation
                      </label>
                      <input
                        type="text"
                        value={newStaffRole}
                        onChange={(e) => setNewStaffRole(e.target.value)}
                        placeholder="e.g. Supervisor, Builder, Cashier"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#D4621A]/30 bg-[#F8F3F0] text-black focus:outline-none focus:border-[#D4621A] focus:ring-1 focus:ring-[#D4621A]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingStaff(false)}
                      className="px-3 py-1.5 rounded-lg border border-[#D4621A]/30 text-xs font-semibold text-black/70 hover:bg-[#D4621A]/10 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={newStaffLoading}
                      className="px-4 py-1.5 rounded-lg bg-[#D4621A] text-white hover:bg-[#bf5312] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {newStaffLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      <span>Save Staff</span>
                    </button>
                  </div>
                </form>
              )}


              {details?.staff && details.staff.length > 0 ? (
                <div className="space-y-3">
                  {details.staff.map((st) => {
                    const perms: StaffPermissions =
                       st.permissions || DEFAULT_STAFF_PERMISSIONS;
                    const isSavingThis = savingStaffId === st.id;

                    const moduleKeys: { key: keyof StaffPermissions; label: string; icon: string }[] = [
                      { key: 'customers', label: 'Customers', icon: '👥' },
                      { key: 'sales', label: 'Sales & Billing', icon: '🧾' },
                      { key: 'appointments', label: 'Orders & Tables', icon: '📋' },
                      { key: 'reminders', label: 'Reminders', icon: '🔔' },
                      { key: 'expenses', label: 'Expenses', icon: '💰' },
                      { key: 'reports', label: 'Reports', icon: '📊' },
                      { key: 'team', label: 'Team', icon: '👥' },
                      { key: 'profile', label: 'Profile', icon: '⚙️' },
                    ];

                    return (
                      <div
                        key={st.id}
                        className="p-4 rounded-xl border border-[#D4621A]/20 bg-[#F8F3F0] shadow-xs space-y-3.5"
                      >
                        {/* Header: Staff Info & Status Badges */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D4621A]/15 pb-2.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-black text-xs">{st.name}</span>
                              <span className="text-[11px] font-medium text-black/70">({st.role})</span>
                            </div>
                            <div className="text-[11px] text-black/70 font-mono mt-0.5">
                              Phone: {st.phone ? `+91 ${st.phone}` : '—'}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* WhatsApp Invite Action */}
                            {st.phone && (
                              <button
                                type="button"
                                onClick={() => handleSendWhatsAppInvite(st)}
                                className="px-2 py-0.5 text-[10px] font-bold rounded-md border border-[#D4621A]/30 bg-[#D4621A]/10 text-[#D4621A] hover:bg-[#D4621A]/20 flex items-center gap-1 transition-colors cursor-pointer"
                                title={st.invitation_status === 'invited' ? 'Resend WhatsApp Invite' : 'Send WhatsApp Invite'}
                              >
                                <MessageCircle className="w-3 h-3 text-[#D4621A]" />
                                <span>{st.invitation_status === 'invited' ? 'Resend Invite' : 'WhatsApp Invite'}</span>
                              </button>
                            )}

                            {/* Invitation Status */}
                            {st.invitation_status === 'active' ? (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#D4621A] text-white border border-[#D4621A]">
                                App Active
                              </span>
                            ) : st.invitation_status === 'invited' ? (
                              <span
                                className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#D4621A]/10 text-[#D4621A] border border-[#D4621A]/20"
                                title={st.invited_at ? `Invited on ${formatDateTime(st.invited_at)}` : 'Invited via WhatsApp'}
                              >
                                Invited {st.invited_at ? `(${formatDate(st.invited_at)})` : ''}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#D4621A]/5 text-black/70 border border-[#D4621A]/15">
                                Not Invited
                              </span>
                            )}
                            <StatusBadge status={st.is_active ? 'active' : 'inactive'} />

                            {/* Delete Staff Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteStaff(st.id, st.name)}
                              className="p-1 rounded text-black/40 hover:text-black transition-colors"
                              title="Delete staff member"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>


                        {/* Permissions Grid */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-black/70">
                              Module Permissions:
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleAllPermissions(st, true)}
                                disabled={isSavingThis}
                                className="text-[10px] font-bold text-[#D4621A] hover:underline cursor-pointer"
                              >
                                Grant All
                              </button>
                              <span className="text-black/20">|</span>
                              <button
                                type="button"
                                onClick={() => handleToggleAllPermissions(st, false)}
                                disabled={isSavingThis}
                                className="text-[10px] font-bold text-black/60 hover:underline cursor-pointer"
                              >
                                Revoke All
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {moduleKeys.map(({ key, label, icon }) => {
                              const isGranted = perms[key];
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => handleTogglePermission(st, key)}
                                  disabled={isSavingThis}
                                  className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-all text-left ${
                                    isGranted
                                      ? 'border-[#D4621A] bg-[#D4621A] text-white font-semibold shadow-xs'
                                      : 'border-[#D4621A]/20 bg-[#F8F3F0] text-black/70 font-normal hover:border-[#D4621A]/40'
                                  }`}
                                >
                                  <span className="flex items-center gap-1.5 truncate">
                                    <span className="text-xs">{icon}</span>
                                    <span className="text-[11px]">{label}</span>
                                  </span>
                                  <span
                                    className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] font-bold shrink-0 ${
                                      isGranted
                                        ? 'bg-white text-[#D4621A]'
                                        : 'bg-[#D4621A]/15 text-black/60'
                                    }`}
                                  >
                                    {isGranted ? '✓' : ''}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-black/70 border border-dashed border-[#D4621A]/30 rounded-xl bg-[#F8F3F0]">
                  No staff members registered for this shop yet.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SERVICES */}
          {activeTab === 'services' && (
            <div className="space-y-3">
              {details?.services && details.services.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto">
                  {details.services.map((svc) => (
                    <div
                      key={svc.id}
                      className="p-3 rounded-lg border border-[#D4621A]/20 bg-[#F8F3F0] shadow-xs flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-medium text-black">{svc.name}</div>
                        <div className="text-[11px] text-black/70">{svc.duration_minutes} mins</div>
                      </div>
                      <div className="font-mono font-semibold text-black">
                        {formatCurrency(svc.price_minor)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-black/70 border border-dashed border-[#D4621A]/30 rounded-xl bg-[#F8F3F0]">
                  No catalog items configured for this shop.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: BILLING & PAYMENTS */}
          {activeTab === 'billing' && (() => {
            const handleExportSubBilling = () => {
              const exportRows = [
                {
                  'Shop Name': shop?.name,
                  'Invoice / Reference': subRefId,
                  'Plan Name': subPlanTitle,
                  'Amount (INR)': subAmount,
                  'Subscribed Date': formatDateTime(subStartDate),
                  'Valid Until': subEndDate ? formatDateTime(subEndDate) : 'Unlimited',
                  'Payment Method': subPaymentMethod,
                  'Status': isSubscribed ? 'Active / Paid' : 'Free Tier',
                },
              ];
              exportToCSV(exportRows, `${shop?.name || 'shop'}_subscription_billing`);
            };

            // If subscribed, show THAT subscription billing & payments
            if (isSubscribed) {
              return (
                <div className="space-y-4">
                  {/* Subscription Hero Card */}
                  <div className="p-4 rounded-xl border border-[#D4621A]/20 bg-[#F8F3F0] shadow-xs">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#D4621A]/15">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-[#D4621A] text-white flex items-center justify-center shadow-xs">
                          <Receipt className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-black">
                            Subscription Billing &amp; Payment Ledger
                          </h4>
                          <p className="text-[11px] text-black/70">
                            Verified active Pro subscription billing record from database
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#D4621A] text-white border border-[#D4621A]">
                        ★ Active Pro Subscription
                      </span>
                    </div>

                    {/* Subscription Metric Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                      <div className="p-2.5 rounded-lg border border-[#D4621A]/15 bg-[#F8F3F0]">
                        <span className="text-[10px] font-bold text-black/60 uppercase font-mono">Current Plan</span>
                        <div className="text-xs font-black text-black mt-0.5">{subPlanTitle}</div>
                      </div>

                      <div className="p-2.5 rounded-lg border border-[#D4621A]/15 bg-[#F8F3F0]">
                        <span className="text-[10px] font-bold text-black/60 uppercase font-mono">Billing Amount</span>
                        <div className="text-xs font-black text-[#D4621A] mt-0.5 font-mono">
                          ₹{subAmount.toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg border border-[#D4621A]/15 bg-[#F8F3F0]">
                        <span className="text-[10px] font-bold text-black/60 uppercase font-mono">Subscribed Date</span>
                        <div className="text-xs font-black text-black mt-0.5 font-mono">
                          {formatDate(subStartDate)}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg border border-[#D4621A]/15 bg-[#F8F3F0]">
                        <span className="text-[10px] font-bold text-black/60 uppercase font-mono">Valid Until</span>
                        <div className="text-xs font-black text-black mt-0.5 font-mono">
                          {subEndDate ? formatDate(subEndDate) : 'Active Unlimited'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Subscription Invoices Table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-black uppercase tracking-wider flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-[#D4621A]" />
                        <span>Subscription Invoices &amp; Payments</span>
                      </h5>
                      <button
                        type="button"
                        onClick={handleExportSubBilling}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#D4621A] hover:underline cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Invoice</span>
                      </button>
                    </div>

                    <div className="divide-y divide-[#D4621A]/15 border border-[#D4621A]/20 rounded-xl overflow-hidden text-xs shadow-xs bg-[#F8F3F0]">
                      <div className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#F8F3F0] hover:bg-[#D4621A]/5 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-[#D4621A]">{subRefId}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#D4621A]/10 text-black border border-[#D4621A]/25">
                              {subPaymentMethod}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#D4621A]/10 text-[#D4621A] border border-[#D4621A]/30">
                              PAID
                            </span>
                          </div>
                          <div className="text-[11px] text-black/70">
                            {subPlanTitle} • Billed on {formatDate(subStartDate)} • Coverage: {formatDate(subStartDate)} – {subEndDate ? formatDate(subEndDate) : 'Active'}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-mono text-base font-black text-black">
                            ₹{subAmount.toLocaleString('en-IN')}
                          </div>
                          <span className="text-[10px] font-mono text-[#D4621A] font-bold uppercase">
                            Payment Settled
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Collapsible toggle for auditing salon's POS customer orders */}
                  <div className="pt-2 border-t border-[#D4621A]/15">
                    <button
                      type="button"
                      onClick={() => setShowClientBills(!showClientBills)}
                      className="text-[11px] font-bold text-[#D4621A] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>{showClientBills ? '▲ Hide' : '▼ Inspect'} Shop POS Retail Orders ({details?.bills.length || 0})</span>
                    </button>

                    {showClientBills && (
                      <div className="mt-3 space-y-2">
                        <div className="divide-y divide-[#D4621A]/15 border border-[#D4621A]/20 rounded-xl overflow-hidden text-xs shadow-xs max-h-60 overflow-y-auto">
                          {(details?.bills || []).length === 0 ? (
                            <div className="p-4 text-center text-black/50 text-xs">No customer orders recorded yet.</div>
                          ) : (
                            (details?.bills || []).map((b) => (
                              <div key={b.id} className="p-2.5 flex items-center justify-between bg-[#F8F3F0]">
                                <div>
                                  <span className="font-mono font-bold text-black">{b.invoice_number}</span>
                                  <span className="text-[11px] text-black/60 ml-2">{formatDate(b.issued_at || b.created_at)}</span>
                                </div>
                                <div className="font-mono font-bold text-black">
                                  {formatCurrency(b.total_minor)}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            // If not subscribed (Free Plan)
            return (
              <div className="p-8 text-center text-xs text-black/70 border border-dashed border-[#D4621A]/30 rounded-xl bg-[#F8F3F0] space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-[#D4621A]/10 flex items-center justify-center text-[#D4621A]">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-black">No Subscription Billing on File</h4>
                  <p className="text-xs text-black/60 mt-1 max-w-md mx-auto">
                    {shop.name} is currently operating on the <strong>Free Tier (100 free sales limit)</strong> and has no active paid subscription invoices.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#D4621A]/10 text-black text-xs font-mono font-bold border border-[#D4621A]/20">
                  <span>Free Quota Used: {details?.bills.length || 0} / {shop.free_sales_limit || 100}</span>
                </div>
              </div>
            );
          })()}

          {/* TAB 5: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-[#D4621A]/20 bg-[#F8F3F0] shadow-xs space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-black/70">Free sales limit:</span>
                  <span className="font-semibold text-black">
                    {details?.shop.free_sales_limit ?? 100}
                    {details?.shop.free_sales_limit ? ' (custom)' : ' (default)'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={limitInput}
                    onChange={(e) => setLimitInput(e.target.value)}
                    placeholder="e.g. 500"
                    disabled={savingLimit || !details}
                    className="flex-1 px-3 py-2 rounded-lg border border-[#D4621A]/30 bg-[#F8F3F0] text-black text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveLimit(false)}
                    disabled={savingLimit || !details}
                    className="px-3 py-2 rounded-lg bg-[#D4621A] hover:bg-[#bf5312] text-white font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    {savingLimit ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveLimit(true)}
                    disabled={savingLimit || !details?.shop.free_sales_limit}
                    className="px-3 py-2 rounded-lg border border-[#D4621A]/30 text-black/70 hover:bg-[#D4621A]/10 font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
                {limitMsg && (
                  <p className={limitMsg.ok ? 'text-[#D4621A] font-semibold' : 'text-black/80 font-semibold'}>{limitMsg.text}</p>
                )}
                <p className="text-black/60">
                  How many bills this shop can create on the free plan before it needs Pro. Leave empty / Reset for the default of 100.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-[#D4621A]/20 bg-[#F8F3F0] shadow-xs space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-black/70">Pro plan:</span>
                  <span className="font-semibold text-black">
                    {proLoading
                      ? 'Loading…'
                      : isSubscriptionActive(proSub)
                      ? `Active until ${proSub?.subscription_end_date ? formatDate(proSub.subscription_end_date) : 'no end date'}${
                          proSub?.cashfree_order_id === 'manual-admin-grant' ? ' (granted manually)' : ''
                        }`
                      : 'Not on Pro'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={proPlan}
                    onChange={(e) => setProPlan(e.target.value as ManualProPlan)}
                    disabled={proBusy || proLoading}
                    className="flex-1 px-3 py-2 rounded-lg border border-[#D4621A]/30 text-xs bg-[#F8F3F0] text-black"
                  >
                    <option value="3_months">3 months</option>
                    <option value="6_months">6 months</option>
                    <option value="12_months">12 months</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleGrantPro}
                    disabled={proBusy || proLoading}
                    className="px-3 py-2 rounded-lg bg-[#D4621A] hover:bg-[#bf5312] text-white font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    {proBusy ? 'Working…' : isSubscriptionActive(proSub) ? 'Extend / replace' : 'Grant Pro'}
                  </button>
                  <button
                    type="button"
                    onClick={handleRevokePro}
                    disabled={proBusy || proLoading || !isSubscriptionActive(proSub)}
                    className="px-3 py-2 rounded-lg border border-[#D4621A]/30 text-black/70 hover:bg-[#D4621A]/10 font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    End Pro
                  </button>
                </div>
                {proMsg && <p className={proMsg.ok ? 'text-[#D4621A] font-semibold' : 'text-black/80 font-semibold'}>{proMsg.text}</p>}
                <p className="text-black/60">
                  Gives the shop unlimited bills, orders and report downloads with no payment recorded. Works on every app version.
                </p>
              </div>
              {details?.settings ? (
                <div className="p-4 rounded-xl border border-[#D4621A]/20 bg-[#F8F3F0] shadow-xs space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-black/70">Order Reminders:</span>
                    <span className="font-semibold text-black">
                      {details.settings.appointment_reminder_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-black/70">Reminder Lead Time:</span>
                    <span className="font-mono text-black">
                      {details.settings.appointment_reminder_minutes} minutes
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-black/70">Daily Closing Auto-Report:</span>
                    <span className="font-semibold text-black">
                      {details.settings.daily_closing_enabled ? `Enabled (${details.settings.daily_closing_time})` : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-black/70">Payment Followup:</span>
                    <span className="font-semibold text-black">
                      {details.settings.payment_followup_enabled ? `Every ${details.settings.payment_followup_interval_days} days` : 'Disabled'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-black/70 border border-dashed border-[#D4621A]/30 rounded-xl bg-[#F8F3F0]">
                  No automated settings configured for this shop.
                </div>
              )}
            </div>
          )}

          {/* TAB 6: TELEMETRY (Rule 1: Honest unavailable state) */}
          {activeTab === 'telemetry' && (
            <div className="space-y-4">
              <UnavailableBanner
                title="Device & App Telemetry Unavailable"
                sourceTable="Device Telemetry"
                message="Client device telemetry and app installation tracking are not recorded in the connected database for this shop."
                details="To see device models, OS versions, and app builds, the mobile application must send device telemetry events."
              />
              <div className="p-4 rounded-xl border border-[#D4621A]/20 bg-[#F8F3F0] shadow-xs text-xs space-y-2 text-black/80">
                <div className="font-semibold text-black">Expected Telemetry Fields:</div>
                <ul className="list-disc list-inside space-y-1 text-black/60 font-mono text-[11px]">
                  <li>device_id: UUID / Hardware string</li>
                  <li>platform: 'android' | 'ios'</li>
                  <li>app_version: e.g. '1.0.0'</li>
                  <li>build_number: integer</li>
                  <li>last_active: timestamptz</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
export const SalonDetailModal = ShopDetailModal;
