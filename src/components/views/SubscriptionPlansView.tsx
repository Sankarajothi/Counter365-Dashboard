'use client';

import React, { useMemo, useState } from 'react';
import {
  Crown,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  Download,
  Receipt,
  Building2,
  Calendar,
  Sparkles,
  Phone,
  ArrowRight,
  TrendingUp,
  X,
  Copy,
  Check,
  CreditCard,
  ChevronRight,
} from 'lucide-react';
import { Shop, Bill, Payment } from '../../types/database';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { formatDate } from '../../utils/dateUtils';
import { ExportButton } from '../common/ExportButton';
import { KPICard } from '../common/KPICard';

export type ProPlanTier = '3m' | '6m' | '1y';

export interface SalonQuotaSummary {
  shopId: string;
  name: string;
  city: string;
  phone: string;
  registeredDate: string;
  registeredDateFormatted: string;
  daysActive: number;
  salesDone: number;
  salesRemaining: number;
  quotaPercentage: number;
  totalBilled: number;
  totalCollected: number;
  status: 'free_active' | 'nearing_limit' | 'pro_required' | 'upgraded';
  upgradedPlan?: ProPlanTier | null;
  associatedShopIds: string[];
}

interface SubscriptionPlansViewProps {
  shops: Shop[];
  bills: Bill[];
  payments?: Payment[];
  subscriptions?: any[];
  loading?: boolean;
  onSelectSalon?: (shop: Shop) => void;
  onOpenShopDrawer?: (shop: Shop) => void;
  onShowToast?: (msg: string) => void;
}

export function SubscriptionPlansView({
  shops = [],
  bills = [],
  payments = [],
  subscriptions = [],
  loading = false,
  onSelectSalon,
  onOpenShopDrawer,
  onShowToast,
}: SubscriptionPlansViewProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'sales_desc' | 'sales_asc' | 'remaining_asc' | 'newest' | 'oldest'>('sales_desc');
  const [selectedSalonBills, setSelectedSalonBills] = useState<SalonQuotaSummary | null>(null);
  const [billModalDateFilter, setBillModalDateFilter] = useState<string>('');
  const [copiedShopName, setCopiedShopName] = useState<string | null>(null);

  const handleSelectShop = (shop: Shop) => {
    if (onSelectSalon) onSelectSalon(shop);
    else if (onOpenShopDrawer) onOpenShopDrawer(shop);
  };

  // Upgraded plans cache
  const [upgradedShopPlans, setUpgradedShopPlans] = useState<Record<string, ProPlanTier>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem('counterpro_pro_upgraded_plans');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const assignProPlan = (shopNameKey: string, plan: ProPlanTier | null) => {
    setUpgradedShopPlans((prev) => {
      const next = { ...prev };
      if (!plan) delete next[shopNameKey];
      else next[shopNameKey] = plan;
      try {
        localStorage.setItem('counterpro_pro_upgraded_plans', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  // Group and compute quota summaries
  const quotaSummaries = useMemo(() => {
    const aggByName = new Map<
      string,
      {
        name: string;
        shopId: string;
        city: string;
        phone: string;
        earliestCreated: string;
        associatedShopIds: string[];
        shopObj: Shop;
      }
    >();

    shops.forEach((s) => {
      const phoneKey = s.phone ? s.phone.replace(/[^0-9]/g, '').slice(-10) : '';
      const key = (phoneKey && phoneKey.length >= 10 ? phoneKey : '') || s.name.trim().toLowerCase();
      const existing = aggByName.get(key);
      if (!existing) {
        aggByName.set(key, {
          name: s.name.trim(),
          shopId: s.id,
          city: s.city || 'Tamil Nadu',
          phone: s.phone || '—',
          earliestCreated: s.created_at,
          associatedShopIds: [s.id],
          shopObj: s,
        });
      } else {
        existing.associatedShopIds.push(s.id);
        if (s.created_at && new Date(s.created_at) < new Date(existing.earliestCreated)) {
          existing.earliestCreated = s.created_at;
          existing.shopId = s.id;
          existing.shopObj = s;
        }
      }
    });

    const list: SalonQuotaSummary[] = [];
    const now = new Date().getTime();

    aggByName.forEach((item, key) => {
      const shopIdsSet = new Set(item.associatedShopIds);
      const salonBills = bills.filter((b) => shopIdsSet.has(b.shop_id));
      const salonPayments = payments.filter((p) => shopIdsSet.has(p.shop_id));

      const salesDone = salonBills.length;
      const salesRemaining = Math.max(0, 100 - salesDone);
      const quotaPercentage = Math.min(100, Math.round((salesDone / 100) * 100));

      const totalBilled = salonBills.reduce((acc, b) => acc + Number(b.total_amount || 0), 0);
      const totalCollected = salonPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);

      const regDate = item.earliestCreated ? new Date(item.earliestCreated) : new Date();
      const daysActive = Math.max(0, Math.floor((now - regDate.getTime()) / (1000 * 60 * 60 * 24)));

      const dbSub = (subscriptions || []).find(
        (sub: any) =>
          item.associatedShopIds.includes(sub.shop_id) &&
          (sub.status === 'active' || sub.plan === 'pro') &&
          (!sub.current_period_end || new Date(sub.current_period_end).getTime() > Date.now())
      );
      const isRealPro = !!dbSub;

      let dbTier: ProPlanTier = '3m';
      if (dbSub?.plan) {
        const pid = String(dbSub.plan).toLowerCase();
        if (pid.includes('1y') || pid.includes('year')) dbTier = '1y';
        else if (pid.includes('6m') || pid.includes('half')) dbTier = '6m';
        else dbTier = '3m';
      }

      const assignedPlan = isRealPro ? upgradedShopPlans[key] || dbTier : null;
      let status: SalonQuotaSummary['status'] = 'free_active';
      if (isRealPro) {
        status = 'upgraded';
      } else if (salesDone >= 100) {
        status = 'pro_required';
      } else if (salesDone >= 50) {
        status = 'nearing_limit';
      } else {
        status = 'free_active';
      }

      list.push({
        shopId: item.shopId,
        name: item.name,
        city: item.city,
        phone: item.phone,
        registeredDate: item.earliestCreated || new Date().toISOString(),
        registeredDateFormatted: formatDate(item.earliestCreated),
        daysActive,
        salesDone,
        salesRemaining,
        quotaPercentage,
        totalBilled,
        totalCollected,
        status,
        upgradedPlan: assignedPlan,
        associatedShopIds: item.associatedShopIds,
      });
    });

    return list;
  }, [shops, bills, payments, subscriptions, upgradedShopPlans]);

  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    quotaSummaries.forEach((s) => {
      if (s.city && s.city !== '—') set.add(s.city);
    });
    return Array.from(set).sort();
  }, [quotaSummaries]);

  const filteredSummaries = useMemo(() => {
    return quotaSummaries
      .filter((s) => {
        if (statusFilter !== 'all' && s.status !== statusFilter) return false;
        if (cityFilter !== 'all' && s.city !== cityFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = (s.name || '').toLowerCase().includes(q);
          const matchCity = (s.city || '').toLowerCase().includes(q);
          const matchPhone = (s.phone || '').includes(q);
          if (!matchName && !matchCity && !matchPhone) return false;
        }
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'sales_desc':
            return b.salesDone - a.salesDone;
          case 'sales_asc':
            return a.salesDone - b.salesDone;
          case 'remaining_asc':
            return a.salesRemaining - b.salesRemaining;
          case 'newest':
            return new Date(b.registeredDate).getTime() - new Date(a.registeredDate).getTime();
          case 'oldest':
            return new Date(a.registeredDate).getTime() - new Date(b.registeredDate).getTime();
          default:
            return 0;
        }
      });
  }, [quotaSummaries, statusFilter, cityFilter, searchQuery, sortBy]);

  // Top metric counters
  const totalSalons = quotaSummaries.length;
  const freeActiveCount = quotaSummaries.filter((s) => s.status === 'free_active').length;
  const nearingLimitCount = quotaSummaries.filter((s) => s.status === 'nearing_limit').length;
  const proRequiredCount = quotaSummaries.filter((s) => s.status === 'pro_required').length;
  const upgradedCount = quotaSummaries.filter((s) => s.status === 'upgraded').length;
  const totalPlatformSalesDone = quotaSummaries.reduce((acc, s) => acc + s.salesDone, 0);

  // Modal bills for selected salon
  const currentModalBills = useMemo(() => {
    if (!selectedSalonBills) return [];
    const ids = new Set(selectedSalonBills.associatedShopIds);
    let list = bills.filter((b) => ids.has(b.shop_id));

    if (billModalDateFilter.trim()) {
      list = list.filter((b) => {
        const d = (b.created_at || b.completed_at || '').slice(0, 10);
        return d === billModalDateFilter.trim();
      });
    }

    return list.sort(
      (a, b) =>
        new Date(b.created_at || b.completed_at || 0).getTime() -
        new Date(a.created_at || a.completed_at || 0).getTime()
    );
  }, [selectedSalonBills, bills, billModalDateFilter]);

  const handleCopyReminder = (salon: SalonQuotaSummary) => {
    const text = `Hi ${salon.name},\n\nYou have completed ${salon.salesDone} out of your 100 free sales on CounterPro (${salon.salesRemaining} free sales remaining).\n\nTo ensure your billing continues uninterrupted, upgrade to CounterPro Unlimited:\n• 3 Months: ₹2,999\n• 6 Months: ₹2,799\n• 1 Year: ₹4,999\n\n👉 Contact: support@tecstellar.com\n\nThank you for choosing CounterPro!`;
    navigator.clipboard.writeText(text);
    setCopiedShopName(salon.name);
    setTimeout(() => setCopiedShopName(null), 3000);
    onShowToast?.(`Copied upgrade reminder for ${salon.name}`);
  };

  const getStatusBadge = (salon: SalonQuotaSummary) => {
    switch (salon.status) {
      case 'pro_required':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-100 text-red-800 border border-red-200">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            PRO REQUIRED (100+)
          </span>
        );
      case 'nearing_limit':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            NEARING 100 LIMIT
          </span>
        );
      case 'upgraded':
        const planName =
          salon.upgradedPlan === '3m'
            ? 'PRO 3M (₹2,999)'
            : salon.upgradedPlan === '6m'
            ? 'PRO 6M (₹2,799)'
            : 'PRO 1Y (₹4,999)';
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#D4621A] text-white border border-teal-700 shadow-xs">
            <Crown className="w-3.5 h-3.5 text-white fill-white" />
            {planName}
          </span>
        );
      case 'free_active':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#D4621A]" />
            FREE TIER ACTIVE
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4621A] block font-mono">
            SHOP BILLING LIMITS
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
            Subscription &amp; Free Sales Quota
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track shop sales quota usage (100 free sales limit) and verified subscription status
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportButton
            data={filteredSummaries.map((s) => ({
              'Shop Name': s.name,
              'City': s.city,
              'Phone': s.phone,
              'Registered Date': s.registeredDateFormatted,
              'Days on Platform': s.daysActive,
              'Sales Completed': s.salesDone,
              'Free Sales Left': s.salesRemaining,
              'Quota Used %': `${s.quotaPercentage}%`,
              'Total Invoiced (₹)': s.totalBilled,
              'Total Collected (₹)': s.totalCollected,
              'Plan Status': s.status.replace('_', ' ').toUpperCase(),
            }))}
            filename={`counterpro_100_sales_quota_${new Date().toISOString().split('T')[0]}`}
            label="Export Quota (CSV)"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <KPICard
          title="Shops"
          value={totalSalons}
          subtitle="Registered"
          icon={Building2}
          tone="usage"
        />
        <KPICard
          title="Free Active"
          value={freeActiveCount}
          subtitle="< 50 sales"
          icon={CheckCircle2}
          tone="signup"
        />
        <KPICard
          title="Near Limit"
          value={nearingLimitCount}
          subtitle="50-99 sales"
          icon={Clock}
          tone="conversion"
        />
        <KPICard
          title="Pro Required"
          value={proRequiredCount}
          subtitle="100+ sales"
          icon={AlertTriangle}
          tone="neutral"
        />
        <KPICard
          title="Sales Billed"
          value={totalPlatformSalesDone}
          subtitle="In database"
          icon={Receipt}
          tone="revenue"
        />
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 space-y-3 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by shop name, city, or phone..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#D4621A] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="all">All Quota Statuses ({quotaSummaries.length})</option>
                <option value="free_active">Free Tier Active (&lt; 50) ({freeActiveCount})</option>
                <option value="nearing_limit">Nearing 100 Limit (50–99) ({nearingLimitCount})</option>
                <option value="pro_required">Pro Required (100+) ({proRequiredCount})</option>
                <option value="upgraded">Pro Plan Active ({upgradedCount})</option>
              </select>
            </div>

            {/* City Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="all">All Cities</option>
                {uniqueCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Options */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
              <span className="text-slate-400 font-medium">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="sales_desc">Most Sales Completed</option>
                <option value="remaining_asc">Fewest Sales Left (Closest to 100)</option>
                <option value="sales_asc">Least Sales Completed</option>
                <option value="newest">Newest Registration</option>
                <option value="oldest">Oldest Registration</option>
              </select>
            </div>
          </div>
        </div>

        {/* Status Pills Quick Filter */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-semibold uppercase text-slate-400 mr-1 font-mono">Quick View:</span>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#EA580C] text-white shadow-xs border border-[#C2410C]'
                : 'bg-white text-black border border-[#EA580C]/30 hover:bg-[#FFEDD5] hover:border-[#EA580C]'
            }`}
          >
            All Shops ({quotaSummaries.length})
          </button>
          <button
            onClick={() => setStatusFilter('nearing_limit')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'nearing_limit'
                ? 'bg-[#EA580C] text-white shadow-xs border border-[#C2410C]'
                : 'bg-white text-black border border-[#EA580C]/30 hover:bg-[#FFEDD5] hover:border-[#EA580C]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Nearing Limit ({nearingLimitCount})
          </button>
          <button
            onClick={() => setStatusFilter('free_active')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'free_active'
                ? 'bg-[#EA580C] text-white shadow-xs border border-[#C2410C]'
                : 'bg-white text-black border border-[#EA580C]/30 hover:bg-[#FFEDD5] hover:border-[#EA580C]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Free Active ({freeActiveCount})
          </button>
          <button
            onClick={() => setStatusFilter('pro_required')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'pro_required'
                ? 'bg-[#EA580C] text-white shadow-xs border border-[#C2410C]'
                : 'bg-white text-black border border-[#EA580C]/30 hover:bg-[#FFEDD5] hover:border-[#EA580C]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Pro Required ({proRequiredCount})
          </button>
          {upgradedCount > 0 && (
            <button
              onClick={() => setStatusFilter('upgraded')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'upgraded'
                  ? 'bg-[#D4621A] text-white shadow-xs'
                  : 'bg-[#F8F3F0] text-[#D4621A] hover:bg-[#D4621A]/10'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              Pro Active ({upgradedCount})
            </button>
          )}
        </div>
      </div>

      {/* Main Quota Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Shop 100 Free Sales Quota Ledger
            </h2>
            <p className="text-slate-500 text-xs">
              Showing {filteredSummaries.length} of {quotaSummaries.length} registered shops with live sales counts.
            </p>
          </div>
          <div className="text-xs text-slate-600 font-mono bg-white px-3 py-1.5 rounded-lg border border-slate-200">
            Rule: <strong>100 Free Invoices</strong> since Registration Date
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-extrabold tracking-wider font-mono">
              <tr>
                <th className="py-3 px-4">Shop &amp; Location</th>
                <th className="py-3 px-4">Registration Date</th>
                <th className="py-3 px-4 text-center">Sales Done</th>
                <th className="py-3 px-4 min-w-[170px]">100 Free Quota Progress</th>
                <th className="py-3 px-4 text-center">Sales Left</th>
                <th className="py-3 px-4">Plan Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredSummaries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No shops found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredSummaries.map((salon) => {
                  const key = (salon.name || '').trim().toLowerCase();
                  return (
                    <tr
                      key={salon.name}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Shop & Location */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900 text-sm">{salon.name}</div>
                        <div className="flex items-center gap-2 text-slate-500 text-[11px] mt-0.5">
                          <span>{salon.city}</span>
                          <span>•</span>
                          <span className="font-mono">{salon.phone}</span>
                        </div>
                      </td>

                      {/* Registration Date */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{salon.registeredDateFormatted}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{salon.daysActive} days active</span>
                        </div>
                      </td>

                      {/* Sales Done */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono text-base font-black text-slate-900">
                          {salon.salesDone}
                        </span>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">invoices</div>
                      </td>

                      {/* Quota Progress Bar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                          <span className="font-bold text-slate-700">{salon.salesDone} / 100</span>
                          <span
                            className={`font-black ${
                              salon.quotaPercentage >= 100
                                ? 'text-red-600'
                                : salon.quotaPercentage >= 50
                                ? 'text-amber-600'
                                : 'text-[#D4621A]'
                            }`}
                          >
                            {salon.quotaPercentage}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              salon.status === 'upgraded'
                                ? 'bg-[#D4621A]'
                                : salon.quotaPercentage >= 100
                                ? 'bg-red-600'
                                : salon.quotaPercentage >= 50
                                ? 'bg-amber-500'
                                : 'bg-[#D4621A]'
                            }`}
                            style={{ width: `${Math.min(100, salon.quotaPercentage)}%` }}
                          />
                        </div>
                      </td>

                      {/* Sales Left */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`font-mono text-sm font-bold ${
                            salon.salesRemaining === 0 ? 'text-red-600' : 'text-slate-700'
                          }`}
                        >
                          {salon.status === 'upgraded' ? 'Unlimited' : salon.salesRemaining}
                        </span>
                      </td>

                      {/* Plan Status */}
                      <td className="py-3.5 px-4">
                        {getStatusBadge(salon)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleCopyReminder(salon)}
                            title="Copy Pro upgrade reminder text for WhatsApp / SMS"
                            className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setSelectedSalonBills(salon)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            <span>Bills ({salon.salesDone})</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drilldown Modal: Bills for Selected Shop */}
      {selectedSalonBills && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-[#F8F3F0] rounded-2xl max-w-4xl w-full max-h-[85vh] shadow-2xl border border-slate-300 p-6 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Bills for {selectedSalonBills.name} ({currentModalBills.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified invoices contributing to the 100 free sales limit
                </p>
              </div>
              <button
                onClick={() => setSelectedSalonBills(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-x-auto flex-1 mt-4">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100/70 font-mono">
                    <th className="py-2.5 px-3">INVOICE #</th>
                    <th className="py-2.5 px-3">DATE</th>
                    <th className="py-2.5 px-3">CUSTOMER</th>
                    <th className="py-2.5 px-3 text-right">AMOUNT</th>
                    <th className="py-2.5 px-3 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentModalBills.map((b) => (
                    <tr key={b.id} className="hover:bg-[#F8F3F0]/20">
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">
                        {b.bill_number || b.id.slice(0, 8)}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600">
                        {formatDate(b.created_at || b.completed_at)}
                      </td>
                      <td className="py-2 px-3 text-slate-800">
                        {b.customer_name || 'Walk-in'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{Number(b.total_amount || 0).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-center font-mono">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                          {b.status || 'completed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end">
              <button
                onClick={() => setSelectedSalonBills(null)}
                className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
