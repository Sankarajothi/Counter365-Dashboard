'use client';

import React, { useState, useMemo } from 'react';
import { Shop, Profile, ShopMember, Subscription, Bill, AccountDeletion } from '../../types/database';
import { formatINR } from '../../lib/adminData';
import {
  RotateCw,
  X,
  Store,
  Download,
  MapPin,
} from 'lucide-react';

interface DailyUserMetricsViewProps {
  shops?: Shop[];
  profiles?: Profile[];
  shopMembers?: ShopMember[];
  subscriptions?: Subscription[];
  bills?: Bill[];
  accountDeletions?: AccountDeletion[];
  lastFetched?: Date | null;
  onRefresh?: () => void;
  onShowToast?: (msg: string) => void;
}

export interface SalonItem {
  id: string;
  name: string;
  phone: string;
  city: string;
  ownerName: string;
  ordersCount: number;
  revenue: number;
  isActive: boolean;
  registeredAt: string;
}

interface DailyMetricRow {
  dateKey: string; // YYYY-MM-DD
  dateFormatted: string; // e.g. '12 October 2026'
  monthKey: string; // e.g. 'October 2026'
  newUsers: number; // New salons onboarded on this date
  activeUsers: number; // Salons actively billing or onboarded on this date
  premiumConversions: number; // Salons converted to pro on this date
  premiumChurned: number; // Salons churned / deleted on this date
  totalUsers: number; // Cumulative total salons (1 salon = 1 user)
  newSalonsList: SalonItem[];
  activeSalonsList: SalonItem[];
  totalSalonsList: SalonItem[];
  proSalonsList: SalonItem[];
  churnedSalonsList: SalonItem[];
}

function toLocalDateStr(dInput: string | Date | null | undefined): string {
  if (!dInput) return '';
  const d = typeof dInput === 'string' ? new Date(dInput) : dInput;
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateLabel(d: Date): string {
  const day = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

export function DailyUserMetricsView({
  shops = [],
  profiles = [],
  shopMembers = [],
  subscriptions = [],
  bills = [],
  accountDeletions = [],
  lastFetched,
  onRefresh,
  onShowToast,
}: DailyUserMetricsViewProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedDrilldown, setSelectedDrilldown] = useState<{
    dateFormatted: string;
    metricLabel: string;
    count: number;
    salons: SalonItem[];
  } | null>(null);

  // Formatted update timestamp (e.g. "Updated 13 Oct, 11:05 am")
  const updatedTimestampText = useMemo(() => {
    const d = lastFetched || new Date();
    const day = d.getDate();
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
    return `Updated ${day} ${month}, ${time}`;
  }, [lastFetched]);

  // Available Month Tabs (e.g. All dates, October 2026, September 2026, August 2026, July 2026, June 2026)
  const monthTabs = useMemo(() => {
    const tabs = ['All dates'];
    const now = new Date();
    for (let i = 0; i < 5; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      tabs.push(label);
    }
    return tabs;
  }, []);

  // Compute Daily Salon/User Metrics: STRICTLY 1 SALON = 1 USER (Zero customer shoppers counted)
  const dailyData = useMemo(() => {
    // Helper to format salon for drilldown
    const formatSalonItem = (s: Shop, forDateKey?: string): SalonItem => {
      const member = shopMembers.find((m) => m.shop_id === s.id && m.role?.toLowerCase() === 'owner');
      const profile = profiles.find((p) => p.id === member?.user_id);
      const shopBills = bills.filter((b) => b.shop_id === s.id && b.status === 'completed');

      const dayBills = forDateKey
        ? shopBills.filter((b) => toLocalDateStr(b.completed_at || b.created_at) === forDateKey)
        : shopBills;
      const count = forDateKey ? dayBills.length : shopBills.length;
      const revenue = (forDateKey ? dayBills : shopBills).reduce((acc, b) => acc + Number(b.total_amount || 0), 0);

      return {
        id: s.id,
        name: s.name,
        phone: s.phone || '—',
        city: s.city || 'Tamil Nadu',
        ownerName: profile?.full_name || 'Salon Owner',
        ordersCount: count,
        revenue,
        isActive: Boolean(s.is_active),
        registeredAt: s.created_at
          ? new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
          : '—',
      };
    };

    // 1. Group real salons by their local registered date
    const shopsByDate = new Map<string, Shop[]>();
    shops.forEach((s) => {
      const dateKey = toLocalDateStr(s.created_at);
      if (dateKey) {
        if (!shopsByDate.has(dateKey)) shopsByDate.set(dateKey, []);
        shopsByDate.get(dateKey)!.push(s);
      }
    });

    // 2. Group completed bills by local date to detect active salons
    const billsByDate = new Map<string, Bill[]>();
    bills.forEach((b) => {
      if (b.status === 'completed') {
        const dateKey = toLocalDateStr(b.completed_at || b.created_at);
        if (dateKey) {
          if (!billsByDate.has(dateKey)) billsByDate.set(dateKey, []);
          billsByDate.get(dateKey)!.push(b);
        }
      }
    });

    // 3. Group account deletions by local date
    const churnByDate = new Map<string, AccountDeletion[]>();
    accountDeletions.forEach((d) => {
      const dateKey = toLocalDateStr(d.deleted_at);
      if (dateKey) {
        if (!churnByDate.has(dateKey)) churnByDate.set(dateKey, []);
        churnByDate.get(dateKey)!.push(d);
      }
    });

    // 4. Generate continuous daily timeline for the last 60 days
    const now = new Date();
    const rows: DailyMetricRow[] = [];

    for (let i = 0; i < 60; i++) {
      const dayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dateKey = toLocalDateStr(dayDate);
      const monthKey = dayDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const dateFormatted = formatDateLabel(dayDate);

      // Local end-of-day timestamp
      const endOfDayTs = new Date(
        dayDate.getFullYear(),
        dayDate.getMonth(),
        dayDate.getDate(),
        23,
        59,
        59,
        999
      ).getTime();

      // Salons registered on this date (Real 1 Salon = 1 User)
      const realNewShops = shopsByDate.get(dateKey) || [];

      // Salons active on this date: completed bills on this date OR registered on this date
      const dayBills = billsByDate.get(dateKey) || [];
      const activeShopIds = new Set<string>();
      dayBills.forEach((b) => activeShopIds.add(b.shop_id));
      realNewShops.forEach((s) => activeShopIds.add(s.id));
      const activeShops = shops.filter((s) => activeShopIds.has(s.id));

      // Premium conversions: salons converted to pro plan on this date
      const proShopsToday = realNewShops.filter((s) => {
        const sub = subscriptions.find((sub) => sub.shop_id === s.id);
        return sub?.plan?.toLowerCase() === 'pro' || Number(sub?.amount || 0) > 0;
      });

      // Churned salons
      const churnedToday = churnByDate.get(dateKey) || [];
      const churnedShops: Shop[] = churnedToday.map((c) => ({
        id: c.shop_id || c.id,
        name: c.shop_name || 'Churned Salon',
        phone: c.phone || '—',
        city: 'Tamil Nadu',
        is_active: false,
        created_at: c.deleted_at,
        shop_type: 'salon',
        email: null,
        address: null,
        state: 'Tamil Nadu',
        country: 'India',
        currency_code: 'INR',
        timezone: 'Asia/Kolkata',
        gst_enabled: false,
        gst_rate: 0,
        gst_number: null,
        round_off_enabled: true,
        daily_backup_enabled: true,
        printer_enabled: false,
        printer_name: null,
        updated_at: c.deleted_at,
      }));

      // Cumulative registered salons up to the end of this date
      const cumulativeShops = shops.filter((s) => {
        if (!s.created_at) return false;
        return new Date(s.created_at).getTime() <= endOfDayTs;
      });

      rows.push({
        dateKey,
        dateFormatted,
        monthKey,
        newUsers: realNewShops.length,
        activeUsers: activeShops.length,
        premiumConversions: proShopsToday.length,
        premiumChurned: churnedToday.length,
        totalUsers: cumulativeShops.length,
        newSalonsList: realNewShops.map((s) => formatSalonItem(s, dateKey)),
        activeSalonsList: activeShops.map((s) => formatSalonItem(s, dateKey)),
        totalSalonsList: cumulativeShops.map((s) => formatSalonItem(s)),
        proSalonsList: proShopsToday.map((s) => formatSalonItem(s, dateKey)),
        churnedSalonsList: churnedShops.map((s) => formatSalonItem(s, dateKey)),
      });
    }

    return rows;
  }, [shops, bills, subscriptions, accountDeletions, shopMembers, profiles]);

  // Filtered rows by selected month tab
  const filteredRows = useMemo(() => {
    if (selectedMonth === 'all' || selectedMonth === 'All dates') {
      return dailyData;
    }
    return dailyData.filter((r) => r.monthKey.toLowerCase() === selectedMonth.toLowerCase());
  }, [dailyData, selectedMonth]);

  // Headline KPI Metrics: 1 Salon = 1 User
  const totalSalonsCount = shops.length;
  const totalSubscribersCount = subscriptions.length;
  const newSubscribersCount = subscriptions.filter(
    (s) => s.status === 'active' || s.plan === 'pro'
  ).length || subscriptions.length;

  const userGrowth = useMemo(() => {
    if (shops.length <= 1) {
      return {
        text: shops.length === 1 ? '+100.0%' : '0.0%',
        subtext: 'baseline established',
      };
    }
    const sorted = [...shops].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const firstDate = toLocalDateStr(sorted[0]?.created_at);
    const firstDayCount = shops.filter((s) => toLocalDateStr(s.created_at) === firstDate).length || 1;
    const currentTotal = shops.length;
    const pct = ((currentTotal - firstDayCount) / firstDayCount) * 100;
    return {
      text: `+${pct.toFixed(1)}%`,
      subtext: `from ${firstDayCount} initial salon to ${currentTotal} current`,
    };
  }, [shops]);

  const handleCellClick = (
    row: DailyMetricRow,
    metricType: 'new' | 'active' | 'pro' | 'churned' | 'total',
    label: string,
    count: number
  ) => {
    let list: SalonItem[] = [];
    if (metricType === 'new') list = row.newSalonsList;
    else if (metricType === 'active') list = row.activeSalonsList;
    else if (metricType === 'pro') list = row.proSalonsList;
    else if (metricType === 'churned') list = row.churnedSalonsList;
    else if (metricType === 'total') list = row.totalSalonsList;

    setSelectedDrilldown({
      dateFormatted: row.dateFormatted,
      metricLabel: label,
      count,
      salons: list,
    });
    onShowToast?.(`Viewing ${label} for ${row.dateFormatted}`);
  };

  const handleExportCSV = () => {
    const headers = [
      'DATE',
      'NEW SALONS (USERS)',
      'ACTIVE SALONS',
      'PREMIUM CONVERSIONS',
      'PREMIUM CHURNED',
      'TOTAL SALONS',
    ];
    const csvRows = filteredRows.map((r) => [
      `"${r.dateFormatted}"`,
      r.newUsers,
      r.activeUsers,
      r.premiumConversions,
      r.premiumChurned,
      r.totalUsers,
    ]);

    const csvContent = [headers.join(','), ...csvRows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `daily-salon-user-metrics-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast?.('Exported Daily Salon Metrics to CSV');
  };

  return (
    <div className="space-y-6 select-none font-sans animate-in fade-in duration-150">
      {/* 1. Header & Title Section */}
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[26px] font-bold text-[#101318] m-0 tracking-tight">Daily User Metrics</h2>
              <span className="px-2 py-0.5 rounded-md bg-[#FD5E03]/10 text-[#FD5E03] border border-[#FD5E03]/30 text-[11px] font-mono font-bold">
                1 Salon = 1 User
              </span>
            </div>
            <p className="text-[13px] text-gray-500 mt-1 m-0">
              Daily signups, active salons, premium conversions, churn, and totals.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700 shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-gray-500" />
              <span>Export</span>
            </button>
            <button
              onClick={() => {
                onRefresh?.();
                onShowToast?.('Refreshed salon metrics');
              }}
              className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700 shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RotateCw className="w-3.5 h-3.5 text-gray-500" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="text-[12px] text-gray-500 font-normal pt-1">
          {updatedTimestampText}
        </div>
      </div>

      {/* 2. Top 4 Metric Cards Strip (1 Salon = 1 User, strictly from shops dataset) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: TOTAL USERS (SALONS) */}
        <div className="bg-white rounded-xl border border-gray-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-mono font-bold tracking-wider text-gray-500 uppercase">
              TOTAL USERS
            </div>
            <div className="text-[32px] font-black text-[#101318] tracking-tight mt-1 leading-none">
              {totalSalonsCount}
            </div>
          </div>
          <div className="text-[12px] text-gray-500 mt-3">
            as of {dailyData[0]?.dateFormatted || 'Today'} &bull; 1 salon = 1 user
          </div>
        </div>

        {/* Card 2: NEW SUBSCRIBERS */}
        <div className="bg-white rounded-xl border border-gray-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-mono font-bold tracking-wider text-gray-500 uppercase">
              NEW SUBSCRIBERS
            </div>
            <div className="text-[32px] font-black text-[#101318] tracking-tight mt-1 leading-none">
              {newSubscribersCount}
            </div>
          </div>
          <div className="text-[12px] text-gray-500 mt-3">
            all active plans &bull; 1 salon = 1 sub
          </div>
        </div>

        {/* Card 3: TOTAL SUBSCRIBERS */}
        <div className="bg-white rounded-xl border border-gray-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-mono font-bold tracking-wider text-gray-500 uppercase">
              TOTAL SUBSCRIBERS
            </div>
            <div className="text-[32px] font-black text-[#101318] tracking-tight mt-1 leading-none">
              {totalSubscribersCount}
            </div>
          </div>
          <div className="text-[12px] text-gray-500 mt-3">
            as of {dailyData[0]?.dateFormatted || 'Today'}
          </div>
        </div>

        {/* Card 4: USER GROWTH */}
        <div className="bg-white rounded-xl border border-gray-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-mono font-bold tracking-wider text-gray-500 uppercase">
              USER GROWTH
            </div>
            <div className="text-[32px] font-black text-[#059669] tracking-tight mt-1 leading-none">
              {userGrowth.text}
            </div>
          </div>
          <div className="text-[12px] text-gray-500 mt-3">
            {userGrowth.subtext}
          </div>
        </div>
      </div>

      {/* 3. Main Data Table Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-5">
        <div>
          <h3 className="text-[15px] font-bold text-[#101318] m-0">
            Select Daily User Metrics to change
          </h3>

          {/* Month Filter Tabs */}
          <div className="flex items-center gap-5 overflow-x-auto pt-3 border-b border-gray-200 text-[13px] scrollbar-none">
            {monthTabs.map((tab) => {
              const isActive =
                (tab === 'All dates' && (selectedMonth === 'all' || selectedMonth === 'All dates')) ||
                selectedMonth.toLowerCase() === tab.toLowerCase();

              return (
                <button
                  key={tab}
                  onClick={() => {
                    setSelectedMonth(tab === 'All dates' ? 'all' : tab);
                    onShowToast?.(`Filtering metrics: ${tab}`);
                  }}
                  className={`pb-2.5 whitespace-nowrap transition-colors cursor-pointer font-medium ${
                    isActive
                      ? 'text-[#101318] font-bold border-b-2 border-[#101318]'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-gray-200 text-[11px] font-mono font-bold uppercase tracking-wider text-gray-500">
                <th className="py-3 px-2 font-mono">DATE</th>
                <th className="py-3 px-4 text-center font-mono">NEW USERS</th>
                <th className="py-3 px-4 text-center font-mono">ACTIVE USERS</th>
                <th className="py-3 px-4 text-center font-mono">PREMIUM CONVERSIONS</th>
                <th className="py-3 px-4 text-center font-mono">PREMIUM CHURNED</th>
                <th className="py-3 px-4 text-right font-mono">TOTAL USERS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-400">
                    No salon records found for the selected period.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.dateKey} className="hover:bg-gray-50/80 transition-colors">
                    {/* Date */}
                    <td className="py-3 px-2 font-medium text-gray-900 whitespace-nowrap">
                      {row.dateFormatted}
                    </td>

                    {/* New Salons (Clickable Blue link style) */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleCellClick(row, 'new', 'New Salons Registered', row.newUsers)}
                        className={`font-semibold cursor-pointer ${
                          row.newUsers > 0
                            ? 'text-[#2563EB] hover:text-blue-700 hover:underline'
                            : 'text-gray-400'
                        }`}
                      >
                        {row.newUsers}
                      </button>
                    </td>

                    {/* Active Salons (Clickable Blue link style) */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleCellClick(row, 'active', 'Active Salons Operating', row.activeUsers)}
                        className={`font-semibold cursor-pointer ${
                          row.activeUsers > 0
                            ? 'text-[#2563EB] hover:text-blue-700 hover:underline'
                            : 'text-gray-400'
                        }`}
                      >
                        {row.activeUsers}
                      </button>
                    </td>

                    {/* Premium Conversions */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleCellClick(row, 'pro', 'Premium Conversions', row.premiumConversions)}
                        className={`font-medium cursor-pointer ${
                          row.premiumConversions > 0
                            ? 'text-[#2563EB] hover:text-blue-700 hover:underline'
                            : 'text-gray-500'
                        }`}
                      >
                        {row.premiumConversions}
                      </button>
                    </td>

                    {/* Premium Churned */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleCellClick(row, 'churned', 'Premium Churned Salons', row.premiumChurned)}
                        className={`font-medium cursor-pointer ${
                          row.premiumChurned > 0
                            ? 'text-red-600 hover:text-red-700 hover:underline'
                            : 'text-gray-500'
                        }`}
                      >
                        {row.premiumChurned}
                      </button>
                    </td>

                    {/* Total Salons (Cumulative, Clickable Blue link style) */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleCellClick(row, 'total', 'Cumulative Registered Salons', row.totalUsers)}
                        className="text-[#2563EB] hover:text-blue-700 font-semibold hover:underline cursor-pointer"
                      >
                        {row.totalUsers.toLocaleString()}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Interactive Drilldown Modal when clicking any salon metric */}
      {selectedDrilldown && (
        <div className="fixed inset-0 bg-[#101318]/50 flex items-center justify-center z-50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 px-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase text-[#FD5E03]">
                  {selectedDrilldown.dateFormatted} &bull; 1 Salon = 1 User
                </span>
                <h4 className="text-base font-bold text-gray-900 m-0">
                  {selectedDrilldown.metricLabel} ({selectedDrilldown.count})
                </h4>
              </div>
              <button
                onClick={() => setSelectedDrilldown(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content: 100% Salons / Outlets */}
            <div className="p-5 max-h-[380px] overflow-y-auto space-y-2.5">
              {selectedDrilldown.salons.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-xs">
                  No salons recorded for this metric on this date.
                </div>
              ) : (
                selectedDrilldown.salons.map((s, i) => (
                  <div
                    key={`${s.id}-${i}`}
                    className="p-3.5 rounded-xl border border-gray-200 bg-white hover:border-[#FD5E03] transition-colors flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-gray-900 truncate flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-[#FD5E03]" />
                        <span>{s.name}</span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span>{s.city}</span>
                        <span>&bull;</span>
                        <span>Owner: {s.ownerName}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <div className="font-mono text-gray-700 font-medium">+91 {s.phone}</div>
                      <div className="text-[11px] text-[#FD5E03] font-semibold mt-0.5">
                        {s.ordersCount} bills &bull; {formatINR(s.revenue)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 px-5 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedDrilldown(null)}
                className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold transition-colors cursor-pointer"
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
