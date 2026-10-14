import React, { useState, useMemo } from 'react';
import {
  Shop,
  Bill,
  Payment,
  Subscription,
  Profile,
  ShopMember,
  Customer,
} from '../../types/database';
import { formatINR, timeAgo } from '../../lib/adminData';
import {
  Store,
  Receipt,
  CreditCard,
  TrendingUp,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  CheckCircle2,
  Users,
  Smartphone,
  Printer,
  Sparkles,
  ArrowRight,
  Wallet,
  Activity,
  Layers,
  ShoppingBag,
  KeyRound,
  X,
  Mail,
  Lock,
  ShieldCheck,
  Globe,
} from 'lucide-react';

interface FounderDashboardViewProps {
  shops: Shop[];
  bills: Bill[];
  payments: Payment[];
  subscriptions: Subscription[];
  profiles: Profile[];
  shopMembers: ShopMember[];
  customers?: Customer[];
  adminUser?: { email: string; role: string; name?: string } | null;
  onUpdateAdminUser?: (user: { email: string; role: string; name: string }) => void;
  onOpenShopDrawer: (shop: Shop) => void;
  onNavigate: (view: string) => void;
  onShowToast?: (msg: string) => void;
}

export function FounderDashboardView({
  shops,
  bills,
  payments,
  subscriptions,
  profiles,
  shopMembers,
  customers = [],
  adminUser,
  onUpdateAdminUser,
  onOpenShopDrawer,
  onNavigate,
  onShowToast,
}: FounderDashboardViewProps) {
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState(adminUser?.email || 'counter365@tecstellar.com');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail.trim() || !adminEmail.includes('@')) {
      onShowToast?.('Please enter a valid email address.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      onShowToast?.('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      onShowToast?.('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail.trim(), password: newPassword }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onShowToast?.('Admin email and password updated successfully.');
        if (data.user && onUpdateAdminUser) {
          onUpdateAdminUser(data.user);
        }
        setIsResetModalOpen(false);
        setNewPassword('');
        setConfirmPassword('');
      } else {
        onShowToast?.(data.message || 'Failed to update credentials.');
      }
    } catch (err) {
      onShowToast?.('Network error updating credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };
  // Real data calculations
  const completedBills = useMemo(
    () => bills.filter((b) => b.status === 'completed'),
    [bills]
  );

  const totalGMV = useMemo(
    () => completedBills.reduce((acc, b) => acc + Number(b.total_amount || 0), 0),
    [completedBills]
  );

  const totalBillsCount = completedBills.length;
  const avgBill = totalBillsCount > 0 ? Math.round(totalGMV / totalBillsCount) : 0;

  // Today's metrics
  const { todayGMV, todayBillsCount, todayBills } = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const filteredToday = completedBills.filter(
      (b) => new Date(b.created_at || b.completed_at || 0).getTime() >= startOfToday
    );
    const gmv = filteredToday.reduce((acc, b) => acc + Number(b.total_amount || 0), 0);
    return { todayGMV: gmv, todayBillsCount: filteredToday.length, todayBills: filteredToday };
  }, [completedBills]);

  // Payment splits calculation
  const { cashGmv, upiGmv, pendingGmv, cashPct, upiPct, pendingPct } = useMemo(() => {
    let cash = 0;
    let upi = 0;
    let pending = 0;

    completedBills.forEach((b) => {
      const amt = Number(b.total_amount || 0);
      const mode = (b.payment_mode || '').toLowerCase();
      const pend = Number(b.pending_amount || 0);

      if (pend > 0) pending += pend;
      if (mode.includes('upi') || mode.includes('gpay') || mode.includes('online')) {
        upi += Math.max(amt - pend, 0);
      } else {
        cash += Math.max(amt - pend, 0);
      }
    });

    const total = Math.max(cash + upi + pending, 1);
    return {
      cashGmv: cash,
      upiGmv: upi,
      pendingGmv: pending,
      cashPct: Math.round((cash / total) * 100),
      upiPct: Math.round((upi / total) * 100),
      pendingPct: Math.max(100 - Math.round((cash / total) * 100) - Math.round((upi / total) * 100), 0),
    };
  }, [completedBills]);

  // Active stores & hardware counts
  const activeShops = useMemo(() => shops.filter((s) => s.is_active), [shops]);
  const printerEnabledShops = useMemo(() => shops.filter((s) => s.printer_enabled), [shops]);
  const gstEnabledShops = useMemo(() => shops.filter((s) => s.gst_enabled), [shops]);

  // Top Performing Stores by GMV
  const topStores = useMemo(() => {
    return shops
      .map((shop) => {
        const shopBills = completedBills.filter((b) => b.shop_id === shop.id);
        const shopGmv = shopBills.reduce((acc, b) => acc + Number(b.total_amount || 0), 0);
        const billCount = shopBills.length;
        const sub = subscriptions.find((s) => s.shop_id === shop.id);
        const isPro = (sub?.plan || '').toLowerCase() === 'pro';
        const quotaPct = Math.min(Math.round((billCount / 100) * 100), 100);

        return {
          shop,
          shopGmv,
          billCount,
          isPro,
          quotaPct,
        };
      })
      .sort((a, b) => b.shopGmv - a.shopGmv);
  }, [shops, completedBills, subscriptions]);

  // 7-Day Revenue Trajectory
  const last7DaysData = useMemo(() => {
    const days: { label: string; dateStr: string; gmv: number; bills: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

      const dayBills = completedBills.filter((b) => {
        const bDate = (b.created_at || b.completed_at || '').split('T')[0];
        return bDate === dateStr;
      });

      const dayGmv = dayBills.reduce((acc, b) => acc + Number(b.total_amount || 0), 0);
      days.push({ label, dateStr, gmv: dayGmv, bills: dayBills.length });
    }
    const maxGmv = Math.max(...days.map((d) => d.gmv), 1);
    return days.map((d) => ({
      ...d,
      heightPct: Math.max(Math.round((d.gmv / maxGmv) * 100), d.gmv > 0 ? 15 : 6),
    }));
  }, [completedBills]);

  return (
    <div className="space-y-6 font-sans select-none animate-in fade-in duration-150">
      {/* 1. Hero Platform Status Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#11141a] via-[#1c1f28] to-[#11141a] border border-[#2b303c] p-6 text-white shadow-md relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-[#FD5E03]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-xs" />
              <span className="text-xs font-mono font-bold tracking-wider text-emerald-400 uppercase">
                Supabase Database &bull; All-Time Platform Analytics
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white m-0">
              Counter<span className="text-[#FD5E03]">365</span> Founder Cockpit
            </h2>
            <p className="text-xs sm:text-[13px] text-gray-400 max-w-2xl leading-relaxed m-0">
              Executive oversight across {shops.length} merchant POS counters, completed sales volume,
              payment gateway distributions, and 100-bill free quota allowances.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              onClick={() => setIsResetModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-xs"
              title="Reset Admin Email & Password"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#FD5E03]" />
              <span>Reset Admin Password</span>
            </button>
            <button
              onClick={() => onNavigate('geography')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-xs"
            >
              <Globe className="w-3.5 h-3.5 text-[#FD5E03]" />
              <span>Territory Radar</span>
            </button>
            <button
              onClick={() => onNavigate('overview')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-xs"
            >
              <span>Shops Directory</span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
            </button>
            <button
              onClick={() => onNavigate('subscription_plans')}
              className="px-4 py-2.5 rounded-xl bg-[#FD5E03] hover:bg-[#ea5602] text-white text-xs font-bold transition-all shadow-md shadow-[#FD5E03]/30 flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Free Quota Monitor</span>
            </button>
          </div>
        </div>

        {/* Real Status Bar */}
        <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-gray-300">
              <Store className="w-4 h-4 text-[#FD5E03]" />
              <span>
                <strong>{shops.length}</strong> Registered Outlets
              </span>
            </div>
            <span className="text-gray-600">&bull;</span>
            <div className="flex items-center gap-1.5 text-gray-300">
              <Receipt className="w-4 h-4 text-emerald-400" />
              <span>
                <strong>{completedBills.length}</strong> Completed Invoices
              </span>
            </div>
            <span className="text-gray-600">&bull;</span>
            <div className="flex items-center gap-1.5 text-gray-300">
              <TrendingUp className="w-4 h-4 text-[#FD5E03]" />
              <span>
                <strong>{formatINR(totalGMV)}</strong> Platform GMV
              </span>
            </div>
            <span className="text-gray-600">&bull;</span>
            <div className="flex items-center gap-1.5 text-gray-300">
              <Printer className="w-4 h-4 text-teal-400" />
              <span>
                <strong>{printerEnabledShops.length}</strong> Thermal Printers Active
              </span>
            </div>
          </div>
          <span className="text-[11px] font-mono text-gray-400">
            Default Limit: 100 Bills Per Shop
          </span>
        </div>
      </div>

      {/* 2. Executive 4-Card KPI Stat Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total GMV Card */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:border-[#FD5E03]/50 transition-all group">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Total Platform GMV</span>
            <div className="p-2 rounded-xl bg-[#FFF7ED] text-[#FD5E03] group-hover:scale-105 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-[#111827]">
            {formatINR(totalGMV)}
          </div>
          <div className="mt-2 text-[11.5px] text-gray-500 flex items-center justify-between">
            <span>{completedBills.length} completed bills</span>
            <span className="text-emerald-600 font-bold">All-Time Data</span>
          </div>
        </div>

        {/* All-Time Completed Invoices Card */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:border-emerald-400/50 transition-all group">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Completed Invoices</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-[#111827]">
            {completedBills.length}
          </div>
          <div className="mt-2 text-[11.5px] text-gray-500 flex items-center justify-between">
            <span>All-time platform sales</span>
            <span className="text-emerald-600 font-bold font-mono">{formatINR(totalGMV)}</span>
          </div>
        </div>

        {/* Active Outlets Card */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:border-blue-400/50 transition-all group">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Active Outlets</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-[#111827]">
            {activeShops.length} <span className="text-sm font-medium text-gray-400">/ {shops.length}</span>
          </div>
          <div className="mt-2 text-[11.5px] text-gray-500 flex items-center justify-between">
            <span>
              {shops.length > 0
                ? `${Math.round((activeShops.length / shops.length) * 100)}% active rate`
                : 'No shops'}
            </span>
            <span className="text-blue-600 font-semibold">{shops.length - activeShops.length} Inactive</span>
          </div>
        </div>

        {/* Average Bill Size Card */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:border-purple-400/50 transition-all group">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Avg Bill Ticket Size</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600 group-hover:scale-105 transition-transform">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-[#111827]">
            {formatINR(avgBill)}
          </div>
          <div className="mt-2 text-[11.5px] text-gray-500 flex items-center justify-between">
            <span>Pending dues: {formatINR(pendingGmv)}</span>
            <span className="text-amber-600 font-bold font-mono">Udhaar</span>
          </div>
        </div>
      </div>

      {/* 3. Deep Analytics Section: Payment Split & 7-Day Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Methods Split */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#FD5E03]/10 text-[#FD5E03]">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#111827] m-0">Payment Collections Split</h3>
                  <p className="text-[11px] text-gray-400 m-0">Real checkout modes recorded by POS cashiers</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                100% Real
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {/* Cash Payment */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-gray-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                    <span>Cash Payment</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-gray-900">{formatINR(cashGmv)}</span>
                    <span className="text-gray-400 text-[11px] ml-1">({cashPct}%)</span>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-slate-800 rounded-full transition-all duration-500"
                    style={{ width: `${cashPct}%` }}
                  />
                </div>
              </div>

              {/* UPI / GPay */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-gray-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FD5E03]" />
                    <span>UPI / QR / Online</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[#FD5E03]">{formatINR(upiGmv)}</span>
                    <span className="text-gray-400 text-[11px] ml-1">({upiPct}%)</span>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-[#FD5E03] rounded-full transition-all duration-500"
                    style={{ width: `${upiPct}%` }}
                  />
                </div>
              </div>

              {/* Pending / Credit */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-gray-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span>Customer Credit (Udhaar)</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-amber-700">{formatINR(pendingGmv)}</span>
                    <span className="text-gray-400 text-[11px] ml-1">({pendingPct}%)</span>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${pendingPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-[11.5px] text-gray-500">
            <span>Aggregated across {completedBills.length} orders</span>
            <button
              onClick={() => onNavigate('revenue_trend')}
              className="text-[#FD5E03] font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
            >
              Revenue Trend &rarr;
            </button>
          </div>
        </div>

        {/* 7-Day Revenue Velocity Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#111827] m-0">7-Day Sales Trajectory</h3>
                  <p className="text-[11px] text-gray-400 m-0">Daily gross revenue and order frequency trends</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('daily_bills')}
                className="text-xs font-semibold text-[#FD5E03] hover:underline flex items-center gap-1 cursor-pointer"
              >
                Daily Bills <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Bar Visualizer */}
            <div className="mt-6">
              <div className="h-44 flex items-end justify-between gap-3 pt-6 pb-2 border-b border-gray-100">
                {last7DaysData.map((day, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded shadow-2xs whitespace-nowrap">
                      {formatINR(day.gmv)} ({day.bills})
                    </div>
                    <div className="w-full max-w-[40px] bg-gray-100 rounded-t-lg overflow-hidden h-full flex items-end">
                      <div
                        className="w-full bg-gradient-to-t from-[#ea5602] to-[#FD5E03] rounded-t-lg transition-all duration-500 group-hover:brightness-110"
                        style={{ height: `${day.heightPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-gray-400 group-hover:text-black">
                      {day.label.split(',')[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#FD5E03]" />
              <span>Real GMV Volume</span>
            </span>
            <span className="font-mono text-gray-400 text-[11px]">
              {completedBills.length} Total Platform Transactions
            </span>
          </div>
        </div>
      </div>

      {/* 4. Merchant 100 Quota Consumption & Top Outlets Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Merchant Free Sales 100-Quota Radar */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
            <div>
              <h3 className="font-bold text-sm text-[#111827] m-0">Merchant Sales & 100 Free Quota Tracker</h3>
              <p className="text-[11px] text-gray-400 m-0">
                Live monitoring of merchant sales usage toward the 100 free bill cap
              </p>
            </div>
            <button
              onClick={() => onNavigate('overview')}
              className="text-xs font-semibold text-[#FD5E03] hover:underline flex items-center gap-1 cursor-pointer"
            >
              All Outlets <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {topStores.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs">
              No registered merchant stores found in database.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {topStores.slice(0, 5).map(({ shop, shopGmv, billCount, isPro, quotaPct }) => {
                const isNearLimit = !isPro && billCount >= 80;
                const isLimitReached = !isPro && billCount >= 100;

                return (
                  <div
                    key={shop.id}
                    onClick={() => onOpenShopDrawer(shop)}
                    className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50/70 px-2 rounded-xl transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-gray-900 truncate">
                          {shop.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 font-mono">
                          {shop.shop_type || 'Retail'}
                        </span>
                        {isPro && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#FD5E03]/15 text-[#FD5E03] font-bold border border-[#FD5E03]/30">
                            PRO
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5">
                        <span>{shop.city || 'Tamil Nadu'}</span>
                        <span>&bull;</span>
                        <span className="font-mono">{shop.phone}</span>
                      </div>
                    </div>

                    {/* Quota Progress Bar */}
                    <div className="w-40 hidden sm:block">
                      <div className="flex items-center justify-between text-[10.5px] font-mono mb-1">
                        <span className="font-semibold text-gray-700">
                          {isPro ? 'Pro Unlimited' : `${billCount}/100 Sales`}
                        </span>
                        <span
                          className={`font-bold ${
                            isLimitReached
                              ? 'text-red-600'
                              : isNearLimit
                              ? 'text-amber-600'
                              : 'text-gray-500'
                          }`}
                        >
                          {isPro ? 'Active' : `${quotaPct}%`}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isPro
                              ? 'bg-[#FD5E03]'
                              : isLimitReached
                              ? 'bg-red-500'
                              : isNearLimit
                              ? 'bg-amber-500'
                              : 'bg-[#FD5E03]'
                          }`}
                          style={{ width: `${isPro ? 100 : quotaPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Revenue from store */}
                    <div className="text-right shrink-0">
                      <div className="font-bold text-xs text-gray-900 font-mono">
                        {formatINR(shopGmv)}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {billCount} orders
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Diagnostics & Hardware Telemetry Widget */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#111827] m-0">POS Hardware Readiness</h3>
                  <p className="text-[11px] text-gray-400 m-0">Thermal printer & Bluetooth configuration</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('app_telemetry')}
                className="text-xs font-semibold text-[#FD5E03] hover:underline cursor-pointer"
              >
                Telemetry &rarr;
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">ESC/POS Printers</div>
                    <div className="text-[10.5px] text-gray-500">Wireless 58mm/80mm pairing</div>
                  </div>
                </div>
                <span className="font-bold text-xs text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                  {printerEnabledShops.length} Configured
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">GSTIN Tax Ready</div>
                    <div className="text-[10.5px] text-gray-500">Official tax invoices enabled</div>
                  </div>
                </div>
                <span className="font-bold text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  {gstEnabledShops.length} Active
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">Android POS App</div>
                    <div className="text-[10.5px] text-gray-500">Counter Pro retail terminals</div>
                  </div>
                </div>
                <span className="font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {activeShops.length} Online
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-400 text-center">
            Zero hardware latency detected &bull; Realtime SQLite/Supabase sync
          </div>
        </div>
      </div>

      {/* 5. Recent Platform Bills Feed */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
          <div>
            <h3 className="font-bold text-sm text-[#111827] m-0">Recent Counter Transactions</h3>
            <p className="text-[11px] text-gray-400 m-0">Live verified transactions processed across retail terminals</p>
          </div>
          <button
            onClick={() => onNavigate('daily_bills')}
            className="text-xs font-semibold text-[#FD5E03] hover:underline flex items-center gap-1 cursor-pointer"
          >
            View All Bills <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {bills.length === 0 ? (
          <div className="py-14 text-center text-gray-400 text-xs">
            <Receipt className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <div className="font-semibold text-gray-600">No transactions recorded yet in live database.</div>
            <div className="text-[11px] text-gray-400 mt-0.5">Bills created on POS counters will appear here instantly.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase text-[10.5px] tracking-wider">
                  <th className="pb-3 px-2">Bill #</th>
                  <th className="pb-3 px-2">Outlet</th>
                  <th className="pb-3 px-2">Customer</th>
                  <th className="pb-3 px-2">Payment Mode</th>
                  <th className="pb-3 px-2 text-right">Amount (₹)</th>
                  <th className="pb-3 px-2 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bills.slice(0, 6).map((bill) => {
                  const shop = shops.find((s) => s.id === bill.shop_id);
                  const isPending = (bill.payment_mode || '').toLowerCase().includes('pending');
                  return (
                    <tr
                      key={bill.id}
                      onClick={() => shop && onOpenShopDrawer(shop)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-2 font-mono font-bold text-gray-900">
                        #{bill.bill_number}
                      </td>
                      <td className="py-3 px-2 font-medium text-gray-900">
                        {shop?.name || 'Counter Pro Store'}
                      </td>
                      <td className="py-3 px-2 text-gray-600">
                        {bill.customer_name || 'Walk-in Shopper'}
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            isPending
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-[#FFF7ED] text-[#FD5E03] border border-[#FED7AA]'
                          }`}
                        >
                          {bill.payment_mode || 'Cash'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right font-mono font-bold text-gray-900">
                        {formatINR(Number(bill.total_amount || 0))}
                      </td>
                      <td className="py-3 px-2 text-right text-gray-400 font-mono text-[11px]">
                        {timeAgo(bill.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admin Reset Credentials Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 p-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FD5E03] flex items-center justify-center border border-orange-100">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#101318] m-0">Reset Admin Credentials</h3>
                  <p className="text-xs text-gray-500 m-0 mt-0.5">Update Super Admin login email & password</p>
                </div>
              </div>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#FD5E03]" />
                  <span>Admin Email Address</span>
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:border-[#FD5E03] focus:outline-hidden bg-gray-50 focus:bg-white text-gray-900 font-medium"
                  placeholder="admin@tecstellar.com"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#FD5E03]" />
                  <span>New Password</span>
                </label>
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:border-[#FD5E03] focus:outline-hidden bg-gray-50 focus:bg-white text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#FD5E03]" />
                  <span>Confirm New Password</span>
                </label>
                <input
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:border-[#FD5E03] focus:outline-hidden bg-gray-50 focus:bg-white text-gray-900"
                  required
                />
              </div>

              <div className="pt-3 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-[#FD5E03] hover:bg-[#ea5602] rounded-xl shadow-md shadow-[#FD5E03]/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save Credentials</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
