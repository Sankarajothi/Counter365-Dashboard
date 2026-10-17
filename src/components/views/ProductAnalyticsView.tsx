'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  RotateCw,
  AlertTriangle,
  TrendingUp,
  Clock,
  CreditCard,
  Zap,
  UserCheck,
  UserX,
  Layers,
  Search,
  Filter,
  Download,
  Phone,
  MessageCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Info,
  MousePointer,
  Smartphone,
  Eye,
  MapPin,
  CheckCircle2,
  XCircle,
  Bell,
} from 'lucide-react';
import {
  ProductAnalyticsPayload,
  CSOpportunity,
} from '../../lib/productAnalyticsService';

interface ProductAnalyticsViewProps {
  onShowToast?: (msg: string) => void;
  onNavigateToPush?: (phone?: string, shopName?: string) => void;
}

export function ProductAnalyticsView({
  onShowToast,
  onNavigateToPush,
}: ProductAnalyticsViewProps) {
  const [data, setData] = useState<ProductAnalyticsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // CS Opportunities Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedReason, setSelectedReason] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Fetch from API route
  const loadAnalytics = async (forceRefresh = false) => {
    try {
      if (forceRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      const url = `/api/admin/product-analytics${forceRefresh ? '?refresh=true' : ''}`;
      const res = await fetch(url, { cache: 'no-store' });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const json = await res.json();
      setData(json);
      if (forceRefresh) {
        onShowToast?.('Product analytics refreshed successfully');
      }
    } catch (err: any) {
      console.error('Failed to load product analytics:', err);
      setError(err?.message || 'Failed to fetch analytics');
      onShowToast?.('Failed to load product analytics');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics(false);
  }, []);

  // Filtered CS Opportunities
  const filteredCS = useMemo(() => {
    if (!data?.csOpportunities) return [];
    return data.csOpportunities.filter((item) => {
      const matchSearch =
        searchQuery === '' ||
        item.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.phone.includes(searchQuery) ||
        item.city.toLowerCase().includes(searchQuery.toLowerCase());

      const matchPriority = selectedPriority === 'all' || item.priority.toLowerCase() === selectedPriority.toLowerCase();
      const matchReason = selectedReason === 'all' || item.reason.toLowerCase().includes(selectedReason.toLowerCase());

      return matchSearch && matchPriority && matchReason;
    });
  }, [data?.csOpportunities, searchQuery, selectedPriority, selectedReason]);

  // Paginated CS Opportunities
  const totalPages = Math.max(1, Math.ceil(filteredCS.length / itemsPerPage));
  const paginatedCS = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCS.slice(start, start + itemsPerPage);
  }, [filteredCS, currentPage]);

  // CSV Export for CS Opportunities
  const exportCSAsCSV = () => {
    if (!filteredCS.length) return;
    const headers = ['Priority', 'Shop / Salon', 'Owner', 'Phone', 'City', 'Reason', 'Detail', 'Days Inactive'];
    const rows = filteredCS.map((c) => [
      `"${c.priority}"`,
      `"${c.shopName}"`,
      `"${c.ownerName}"`,
      `"${c.phone}"`,
      `"${c.city}"`,
      `"${c.reason}"`,
      `"${c.detail}"`,
      c.daysSinceActivity,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `customer-success-opportunities-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast?.('Exported CS Opportunities to CSV');
  };

  if (isLoading && !data) {
    return (
      <div className="space-y-6 select-none font-sans animate-pulse p-2">
        {/* Skeleton Header */}
        <div className="h-10 bg-gray-200 rounded-lg w-1/3"></div>
        <div className="h-5 bg-gray-100 rounded-md w-1/2"></div>
        {/* Skeleton Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 pt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-xl border border-gray-200"></div>
          ))}
        </div>
        {/* Skeleton Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-4">
          <div className="h-64 bg-gray-100 rounded-xl border border-gray-200"></div>
          <div className="h-64 bg-gray-100 rounded-xl border border-gray-200"></div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-red-200 shadow-sm space-y-4 max-w-lg mx-auto mt-10">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
        <h3 className="text-base font-bold text-gray-900">Failed to Load Product Analytics</h3>
        <p className="text-xs text-gray-500">{error}</p>
        <button
          onClick={() => loadAnalytics(true)}
          className="px-4 py-2 rounded-lg bg-[#D4621A] text-white text-xs font-semibold hover:bg-[#e05202] transition-colors cursor-pointer"
        >
          Retry Fetching Data
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 select-none font-sans animate-in fade-in duration-150 pb-12">
      {/* 1. Page Header */}
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[26px] font-bold text-[#101318] m-0 tracking-tight">Product Analytics</h2>
              <span className="px-2 py-0.5 rounded-md bg-[#D4621A]/10 text-[#D4621A] border border-[#D4621A]/30 text-[11px] font-mono font-bold">
                Operations Console
              </span>
            </div>
            <p className="text-[13px] text-gray-500 mt-1 m-0 max-w-3xl leading-relaxed">
              Complete product analytics engine: user journeys, funnels, engagement scores, screen analytics, interaction heat intelligence, founder insights, and Customer Success opportunities.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => loadAnalytics(true)}
              disabled={isRefreshing}
              className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700 shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 text-gray-500 ${isRefreshing ? 'animate-spin text-[#D4621A]' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        <div className="text-[12px] text-gray-500 font-normal pt-1">
          Updated {data.lastUpdated}
        </div>
      </div>

      {/* 2. Summary Cards (6 Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Time to First Order */}
        <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-2xs flex flex-col justify-between">
          <div className="text-[10px] font-mono font-bold tracking-wider text-gray-500 uppercase">
            TIME TO 1ST ORDER
          </div>
          <div className="my-2">
            <div className="text-[24px] font-black text-[#101318] tracking-tight leading-none">
              {data.summary.timeToFirstOrderDays} <span className="text-xs font-semibold text-gray-500 font-mono">days</span>
            </div>
          </div>
          <div className="text-[11px] text-gray-400 truncate">
            reg &rarr; first sale
          </div>
        </div>

        {/* Card 2: Time to Subscription */}
        <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-2xs flex flex-col justify-between">
          <div className="text-[10px] font-mono font-bold tracking-wider text-gray-500 uppercase">
            TIME TO SUB
          </div>
          <div className="my-2">
            <div className="text-[24px] font-black text-[#101318] tracking-tight leading-none">
              {data.summary.timeToSubscriptionDays} <span className="text-xs font-semibold text-gray-500 font-mono">days</span>
            </div>
          </div>
          <div className="text-[11px] text-gray-400 truncate">
            reg &rarr; plan activation
          </div>
        </div>

        {/* Card 3: Subscription Conversion % */}
        <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-2xs flex flex-col justify-between">
          <div className="text-[10px] font-mono font-bold tracking-wider text-gray-500 uppercase">
            SUB CONVERSION
          </div>
          <div className="my-2">
            <div className="text-[24px] font-black text-[#059669] tracking-tight leading-none">
              {data.summary.subscriptionConversionPct}%
            </div>
          </div>
          <div className="text-[11px] text-gray-400 truncate">
            subs / pricing viewers
          </div>
        </div>

        {/* Card 4: Most Used Feature */}
        <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-2xs flex flex-col justify-between">
          <div className="text-[10px] font-mono font-bold tracking-wider text-gray-500 uppercase">
            MOST USED FEATURE
          </div>
          <div className="my-2">
            <div className="text-[15px] font-bold text-[#101318] tracking-tight line-clamp-2 leading-tight">
              {data.summary.mostUsedFeature}
            </div>
          </div>
          <div className="text-[11px] text-[#D4621A] font-medium truncate">
            high frequency activity
          </div>
        </div>

        {/* Card 5: Highest Drop-Off */}
        <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-2xs flex flex-col justify-between">
          <div className="text-[10px] font-mono font-bold tracking-wider text-gray-500 uppercase">
            HIGHEST DROP-OFF
          </div>
          <div className="my-2">
            <div className="text-[24px] font-black text-rose-600 tracking-tight leading-none">
              {data.summary.highestDropOffPct}%
            </div>
          </div>
          <div className="text-[11px] text-gray-500 font-medium truncate" title={data.summary.highestDropOffStep}>
            {data.summary.highestDropOffStep}
          </div>
        </div>

        {/* Card 6: CS Opportunities */}
        <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-2xs flex flex-col justify-between">
          <div className="text-[10px] font-mono font-bold tracking-wider text-gray-500 uppercase">
            CS OPPORTUNITIES
          </div>
          <div className="my-2">
            <div className="text-[24px] font-black text-[#D4621A] tracking-tight leading-none">
              {data.summary.csOpportunitiesCount}
            </div>
          </div>
          <div className="text-[11px] text-gray-400 truncate">
            auto-detected outreach
          </div>
        </div>
      </div>

      {/* 3. Alerts Panel (Rule-Based, Color-Coded) */}
      <div className="bg-amber-50/70 rounded-xl border border-amber-200/80 p-4 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-[13px] font-bold text-amber-950 m-0 uppercase font-mono tracking-wide">
                Active Product Alerts & Recommendations
              </h4>
              <span className="text-[11px] text-amber-800 font-medium">
                (Rule-based automated triggers)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              {/* Alert Item 1: High Drop-Off Screens */}
              <div className="bg-white/80 p-3 rounded-lg border border-amber-200/60 text-xs space-y-1">
                <div className="font-semibold text-gray-900 flex items-center justify-between">
                  <span>High Drop-Off Screen</span>
                  <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-mono font-bold text-[10px]">
                    &ge; 50% exit
                  </span>
                </div>
                {data.alerts.highDropOffScreens.length > 0 ? (
                  <p className="text-gray-600 text-[11px] m-0">
                    <span className="font-bold text-rose-700">{data.alerts.highDropOffScreens[0].screen}</span> has an exit rate of <span className="font-bold">{data.alerts.highDropOffScreens[0].exitRate}%</span>. Simplify onboarding CTA.
                  </p>
                ) : (
                  <p className="text-[#D4621A] text-[11px] m-0 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#D4621A]" />
                    All screen exit rates are healthy below 50%.
                  </p>
                )}
              </div>

              {/* Alert Item 2: Users Likely to Subscribe */}
              <div className="bg-white/80 p-3 rounded-lg border border-amber-200/60 text-xs space-y-1">
                <div className="font-semibold text-gray-900 flex items-center justify-between">
                  <span>Likely to Subscribe</span>
                  <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-mono font-bold text-[10px]">
                    High CS Priority
                  </span>
                </div>
                <p className="text-gray-600 text-[11px] m-0">
                  <span className="font-bold text-[#101318]">{data.alerts.usersLikelyToSubscribeCount} salons</span> have completed catalog setup and show high conversion readiness.
                </p>
              </div>

              {/* Alert Item 3: Users Likely to Churn */}
              <div className="bg-white/80 p-3 rounded-lg border border-amber-200/60 text-xs space-y-1">
                <div className="font-semibold text-gray-900 flex items-center justify-between">
                  <span>Likely to Churn / Inactive</span>
                  <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-mono font-bold text-[10px]">
                    Low Engagement
                  </span>
                </div>
                <p className="text-gray-600 text-[11px] m-0">
                  <span className="font-bold text-rose-700">{data.alerts.usersLikelyToChurnCount} salons</span> scored low on engagement or have zero bills this week. Proactive outreach recommended.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Two-Column Grids for Funnels and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: User Journey Funnel */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-bold text-[#101318] m-0">User Journey Funnel</h3>
              <p className="text-[11px] text-gray-500 m-0 mt-0.5">Strict ordered progression from onboarding to high-volume billing</p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F8F3F0] text-[#D4621A] border border-blue-200">
              5 Steps
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500">
                  <th className="py-2.5 px-2">STEP</th>
                  <th className="py-2.5 px-2 text-center">USERS</th>
                  <th className="py-2.5 px-2 text-center">FROM PREV</th>
                  <th className="py-2.5 px-2 text-center">FROM START</th>
                  <th className="py-2.5 px-2 text-right">DROP-OFF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.userJourneyFunnel.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-2.5 px-2 font-medium text-gray-900 whitespace-nowrap flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-gray-100 text-gray-700 text-[10px] font-mono flex items-center justify-center font-bold shrink-0">
                        {i + 1}
                      </span>
                      <span>{row.step}</span>
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-gray-900 font-mono">
                      {row.users}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-medium text-gray-700">
                      {row.fromPrevPct}%
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-medium text-gray-700">
                      {row.fromStartPct}%
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono">
                      {row.dropOffCount > 0 ? (
                        <span className="text-rose-600 font-semibold">
                          -{row.dropOffPct}% ({row.dropOffCount})
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Subscription Funnel */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-bold text-[#101318] m-0">Subscription Funnel</h3>
              <p className="text-[11px] text-gray-500 m-0 mt-0.5">Strict ordering enforced: from prev % &le; 100%</p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F8F3F0] text-[#D4621A] border border-[#D4621A]/25">
              Pricing to Pro
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500">
                  <th className="py-2.5 px-2">STEP</th>
                  <th className="py-2.5 px-2 text-center">USERS</th>
                  <th className="py-2.5 px-2 text-center">FROM PREV</th>
                  <th className="py-2.5 px-2 text-center">FROM START</th>
                  <th className="py-2.5 px-2 text-right">DROP-OFF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.subscriptionFunnel.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-2.5 px-2 font-medium text-gray-900 whitespace-nowrap flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-gray-100 text-gray-700 text-[10px] font-mono flex items-center justify-center font-bold shrink-0">
                        {i + 1}
                      </span>
                      <span>{row.step}</span>
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-gray-900 font-mono">
                      {row.users}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-medium text-gray-700">
                      {row.fromPrevPct}%
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-medium text-gray-700">
                      {row.fromStartPct}%
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono">
                      {row.dropOffCount > 0 ? (
                        <span className="text-rose-600 font-semibold">
                          -{row.dropOffPct}% ({row.dropOffCount})
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 5. Core Action Funnel & Engagement Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Core Action Funnel (POS Terminal Billing Journey) */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-bold text-[#101318] m-0">Core Action Funnel (POS Billing)</h3>
              <p className="text-[11px] text-gray-500 m-0 mt-0.5">Terminal execution: Opened &rarr; Cart &rarr; Client &rarr; Tender &rarr; Print</p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
              Terminal Flow
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500">
                  <th className="py-2.5 px-2">STEP</th>
                  <th className="py-2.5 px-2 text-center">USERS</th>
                  <th className="py-2.5 px-2 text-center">FROM PREV</th>
                  <th className="py-2.5 px-2 text-center">FROM START</th>
                  <th className="py-2.5 px-2 text-right">DROP-OFF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.coreActionFunnel.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-2.5 px-2 font-medium text-gray-900 whitespace-nowrap flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-gray-100 text-gray-700 text-[10px] font-mono flex items-center justify-center font-bold shrink-0">
                        {i + 1}
                      </span>
                      <span>{row.step}</span>
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-gray-900 font-mono">
                      {row.users}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-medium text-gray-700">
                      {row.fromPrevPct}%
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-medium text-gray-700">
                      {row.fromStartPct}%
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono">
                      {row.dropOffCount > 0 ? (
                        <span className="text-rose-600 font-semibold">
                          -{row.dropOffPct}% ({row.dropOffCount})
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Engagement Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-bold text-[#101318] m-0">Engagement Distribution</h3>
              <p className="text-[11px] text-gray-500 m-0 mt-0.5">Computed score (0 - 100) from recency, frequency, and core billing depth</p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-gray-100 text-gray-700">
              4 Tiers
            </span>
          </div>

          <div className="space-y-3.5 pt-1">
            {data.engagementDistribution.map((b) => (
              <div key={b.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{b.label}</span>
                    <span className={`px-2 py-0.2 rounded-full text-[10px] font-mono font-bold border ${b.badgeColor}`}>
                      {b.count} salons
                    </span>
                  </div>
                  <span className="font-mono font-bold text-gray-700">{b.percentage}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${b.barColor}`}
                    style={{ width: `${Math.max(4, b.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200/70 text-[11px] text-gray-500 leading-relaxed mt-2">
            Scoring algorithm: <span className="font-semibold text-gray-700">35% recency</span> (days since last sale) + <span className="font-semibold text-gray-700">35% frequency</span> (30-day activity volume) + <span className="font-semibold text-gray-700">30% depth</span> (completed orders).
          </div>
        </div>
      </div>

      {/* 6. Top 20 Interactions & Screen Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 20 Interactions */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-bold text-[#101318] m-0">Top 20 Interactions</h3>
              <p className="text-[11px] text-gray-500 m-0 mt-0.5">Click zones, interactive triggers, and rage-tap detection</p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F8F3F0] text-[#D4621A] border border-[#D4621A]/20">
              Interaction Heat
            </span>
          </div>

          <div className="max-h-[340px] overflow-y-auto overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-gray-200 text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500">
                  <th className="py-2.5 px-2">#</th>
                  <th className="py-2.5 px-2">INTERACTION</th>
                  <th className="py-2.5 px-2 text-center">TYPE</th>
                  <th className="py-2.5 px-2 text-right">COUNT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.topInteractions.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-2 px-2 text-gray-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-2 px-2 font-medium text-gray-900 truncate max-w-[200px]" title={item.name}>
                      {item.name}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                          item.type === 'repeat'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : item.type === 'button'
                            ? 'bg-[#F8F3F0] text-[#D4621A] border border-blue-200'
                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right font-mono font-bold text-gray-900">
                      {item.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Screen Analytics */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-bold text-[#101318] m-0">Screen Analytics</h3>
              <p className="text-[11px] text-gray-500 m-0 mt-0.5">Visits, unique users, exit percentages, and primary triggers</p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-gray-100 text-gray-700">
              6 Key Routes
            </span>
          </div>

          <div className="max-h-[340px] overflow-y-auto overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-gray-200 text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500">
                  <th className="py-2.5 px-2">SCREEN</th>
                  <th className="py-2.5 px-2 text-center">VISITS</th>
                  <th className="py-2.5 px-2 text-center">USERS</th>
                  <th className="py-2.5 px-2 text-center">EXIT %</th>
                  <th className="py-2.5 px-2 text-right">TOP CLICKS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.screenAnalytics.map((s, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-2.5 px-2 font-medium text-gray-900 whitespace-nowrap">
                      {s.screen}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-gray-800">
                      {s.visits}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono text-gray-700">
                      {s.users}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono">
                      <span
                        className={`font-semibold ${
                          s.exitPct >= 50 ? 'text-rose-600 bg-rose-50 px-1 py-0.5 rounded' : 'text-gray-700'
                        }`}
                      >
                        {s.exitPct}%
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right text-[11px] text-gray-500 truncate max-w-[160px]" title={s.topClicks}>
                      {s.topClicks}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 7. Scroll Depth & Founder Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scroll Depth Tracking */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-bold text-[#101318] m-0">Scroll Depth Analytics</h3>
              <p className="text-[11px] text-gray-500 m-0 mt-0.5">Percentage of users scrolling to each quarter of page length</p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-gray-100 text-gray-600">
              Depth Tracking
            </span>
          </div>

          {data.scrollDepth.rows.length === 0 ? (
            <div className="py-8 px-4 text-center space-y-2 bg-gray-50/70 rounded-lg border border-dashed border-gray-200">
              <Info className="w-5 h-5 text-blue-500 mx-auto" />
              <div className="text-gray-700 text-xs font-semibold">Scroll Tracking Inactive</div>
              <p className="text-[11px] text-gray-500 max-w-md mx-auto m-0 leading-relaxed">
                {data.scrollDepth.notice}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[12px]">
                <thead>
                  <tr className="border-b border-gray-200 text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500">
                    <th className="py-2.5 px-2">SCREEN</th>
                    <th className="py-2.5 px-2 text-center">25%</th>
                    <th className="py-2.5 px-2 text-center">50%</th>
                    <th className="py-2.5 px-2 text-center">75%</th>
                    <th className="py-2.5 px-2 text-center">100%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.scrollDepth.rows.map((r, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-2.5 px-2 font-medium text-gray-900 whitespace-nowrap">
                        {r.screen}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-medium text-[#D4621A] bg-[#F8F3F0]/30">
                        {r.p25}%
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-medium text-[#D4621A] bg-[#F8F3F0]/20">
                        {r.p50}%
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-medium text-amber-700 bg-amber-50/20">
                        {r.p75}%
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-medium text-gray-700">
                        {r.p100}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Founder Insights (Two Cards) */}
        <div className="space-y-4">
          {/* Card A: Why Users Subscribe */}
          <div className="bg-white rounded-xl border border-[#D4621A]/25/90 p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#D4621A]"></div>
              <h4 className="text-[14px] font-bold text-gray-900 m-0">Founder Insights: Why Users Subscribe</h4>
            </div>

            <div className="grid grid-cols-3 gap-2 py-1 text-center font-mono">
              <div className="bg-[#F8F3F0]/60 p-2 rounded-lg border border-emerald-100">
                <div className="text-[18px] font-black text-[#D4621A]">{data.founderInsights.whyUsersSubscribe.hadCoreDataPct}%</div>
                <div className="text-[10px] text-[#D4621A] uppercase font-sans mt-0.5">had setup catalog</div>
              </div>
              <div className="bg-[#F8F3F0]/60 p-2 rounded-lg border border-emerald-100">
                <div className="text-[18px] font-black text-[#D4621A]">{data.founderInsights.whyUsersSubscribe.viewedPricingPct}%</div>
                <div className="text-[10px] text-[#D4621A] uppercase font-sans mt-0.5">viewed pricing</div>
              </div>
              <div className="bg-[#F8F3F0]/60 p-2 rounded-lg border border-emerald-100">
                <div className="text-[18px] font-black text-[#D4621A]">{data.founderInsights.whyUsersSubscribe.avgCoreActionsBeforeSub}</div>
                <div className="text-[10px] text-[#D4621A] uppercase font-sans mt-0.5">avg bills before sub</div>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] font-bold text-gray-700 uppercase font-mono">Conversion Drivers</div>
              {data.founderInsights.whyUsersSubscribe.conversionDrivers.map((driver, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs text-gray-600">
                  <span className="truncate flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    {driver.name}
                  </span>
                  <span className="font-mono font-semibold text-[#D4621A] shrink-0 ml-2">
                    {driver.percentage}% ({driver.count})
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card B: Why Users Do Not Subscribe */}
          <div className="bg-white rounded-xl border border-rose-200/90 p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
              <h4 className="text-[14px] font-bold text-gray-900 m-0">Founder Insights: Why Users Do Not Subscribe</h4>
            </div>

            <div className="grid grid-cols-3 gap-2 py-1 text-center font-mono">
              <div className="bg-rose-50/60 p-2 rounded-lg border border-rose-100">
                <div className="text-[18px] font-black text-rose-800">{data.founderInsights.whyUsersDoNotSubscribe.noSetupDataCount}</div>
                <div className="text-[10px] text-rose-700 uppercase font-sans mt-0.5">no catalog data</div>
              </div>
              <div className="bg-rose-50/60 p-2 rounded-lg border border-rose-100">
                <div className="text-[18px] font-black text-rose-800">{data.founderInsights.whyUsersDoNotSubscribe.zeroCoreActionsCount}</div>
                <div className="text-[10px] text-rose-700 uppercase font-sans mt-0.5">zero bills created</div>
              </div>
              <div className="bg-rose-50/60 p-2 rounded-lg border border-rose-100">
                <div className="text-[18px] font-black text-rose-800">{data.founderInsights.whyUsersDoNotSubscribe.inactive7DaysCount}</div>
                <div className="text-[10px] text-rose-700 uppercase font-sans mt-0.5">inactive 7+ days</div>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] font-bold text-gray-700 uppercase font-mono">Churn Signals</div>
              {data.founderInsights.whyUsersDoNotSubscribe.churnSignals.map((signal, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs text-gray-600">
                  <span className="truncate flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                    {signal.name}
                  </span>
                  <span className="font-mono font-semibold text-rose-800 shrink-0 ml-2">
                    {signal.percentage}% ({signal.count})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 8. Top Cities & Top States by Engagement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Cities */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-[#101318] m-0">Top Cities by Engagement</h3>
            <span className="text-[11px] font-mono text-gray-500">Geography Intelligence</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500">
                  <th className="py-2.5 px-2">CITY</th>
                  <th className="py-2.5 px-2 text-center">USERS</th>
                  <th className="py-2.5 px-2 text-center">ENGAGED</th>
                  <th className="py-2.5 px-2 text-center">SUBSCRIBERS</th>
                  <th className="py-2.5 px-2 text-right">AVG SCORE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.topCities.map((city, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-2.5 px-2 font-medium text-gray-900 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span>{city.name}</span>
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-gray-900">{city.users}</td>
                    <td className="py-2.5 px-2 text-center font-mono font-medium text-[#D4621A]">{city.engaged}</td>
                    <td className="py-2.5 px-2 text-center font-mono font-medium text-[#D4621A]">{city.subscribers}</td>
                    <td className="py-2.5 px-2 text-right font-mono font-bold text-gray-900">{city.avgScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top States */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-[#101318] m-0">Top States by Engagement</h3>
            <span className="text-[11px] font-mono text-gray-500">Territory Performance</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500">
                  <th className="py-2.5 px-2">STATE</th>
                  <th className="py-2.5 px-2 text-center">USERS</th>
                  <th className="py-2.5 px-2 text-center">ENGAGED</th>
                  <th className="py-2.5 px-2 text-center">SUBSCRIBERS</th>
                  <th className="py-2.5 px-2 text-right">AVG SCORE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.topStates.map((st, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-2.5 px-2 font-medium text-gray-900 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span>{st.name}</span>
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-gray-900">{st.users}</td>
                    <td className="py-2.5 px-2 text-center font-mono font-medium text-[#D4621A]">{st.engaged}</td>
                    <td className="py-2.5 px-2 text-center font-mono font-medium text-[#D4621A]">{st.subscribers}</td>
                    <td className="py-2.5 px-2 text-right font-mono font-bold text-gray-900">{st.avgScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 9. Customer Success Opportunities (Full Table with Search, Filter, Export, WhatsApp/Call) */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[16px] font-bold text-[#101318] m-0">Customer Success Opportunities</h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-100 text-blue-800">
                {filteredCS.length} actionable
              </span>
            </div>
            <p className="text-[12px] text-gray-500 mt-1 m-0">
              Auto-detected merchants needing proactive outreach: stalled onboarding, quota warnings, or inactivity.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportCSAsCSV}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700 shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-gray-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-3 flex-wrap pt-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search salon, owner, phone, city..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-hidden focus:border-[#D4621A] focus:bg-white transition-colors"
            />
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-500 font-medium">Priority:</span>
            <select
              value={selectedPriority}
              onChange={(e) => {
                setSelectedPriority(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Reason Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-500 font-medium">Reason:</span>
            <select
              value={selectedReason}
              onChange={(e) => {
                setSelectedReason(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Reasons</option>
              <option value="profile">Profile completed, no customer</option>
              <option value="order">Customer added, no order</option>
              <option value="quota">Quota / Subscription warning</option>
              <option value="inactive">Inactive 7+ days</option>
            </select>
          </div>
        </div>

        {/* Opportunities Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500">
                <th className="py-2.5 px-2">PRIORITY</th>
                <th className="py-2.5 px-2">SHOP / SALON</th>
                <th className="py-2.5 px-2">OWNER & PHONE</th>
                <th className="py-2.5 px-2">LOCATION</th>
                <th className="py-2.5 px-2">REASON</th>
                <th className="py-2.5 px-2">ACTIONABLE DETAIL</th>
                <th className="py-2.5 px-2 text-right">OUTREACH</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedCS.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400 text-xs">
                    No Customer Success opportunities matching current filters.
                  </td>
                </tr>
              ) : (
                paginatedCS.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    {/* Priority Badge */}
                    <td className="py-3 px-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          item.priority === 'High'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : item.priority === 'Medium'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}
                      >
                        {item.priority}
                      </span>
                    </td>

                    {/* Shop */}
                    <td className="py-3 px-2 font-bold text-gray-900 whitespace-nowrap">
                      {item.shopName}
                    </td>

                    {/* Owner & Phone */}
                    <td className="py-3 px-2 whitespace-nowrap">
                      <div className="text-gray-900 font-medium">{item.ownerName}</div>
                      <div className="font-mono text-gray-500 text-[11px]">+91 {item.phone}</div>
                    </td>

                    {/* Location */}
                    <td className="py-3 px-2 text-gray-700 whitespace-nowrap">
                      {item.city}
                    </td>

                    {/* Reason */}
                    <td className="py-3 px-2 whitespace-nowrap">
                      <span className="font-semibold text-gray-900">{item.reason}</span>
                    </td>

                    {/* Detail */}
                    <td className="py-3 px-2 text-gray-500 text-[11px] max-w-[240px] truncate" title={item.detail}>
                      {item.detail}
                    </td>

                    {/* Actions: Phone, WhatsApp, Push */}
                    <td className="py-3 px-2 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.phone && item.phone !== '—' && (
                          <>
                            <a
                              href={`tel:${item.phone}`}
                              title="Call Merchant"
                              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-700 transition-colors"
                            >
                              <Phone className="w-3.5 h-3.5 text-[#D4621A]" />
                            </a>
                            <a
                              href={`https://wa.me/91${item.phone.replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(item.ownerName)},%20Counter365%20Team%20here%20to%20support%20${encodeURIComponent(item.shopName)}!`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="WhatsApp Message"
                              className="p-1.5 rounded-lg border border-[#D4621A]/25 hover:bg-[#F8F3F0] text-[#D4621A] transition-colors"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-[#D4621A]" />
                            </a>
                          </>
                        )}
                        {onNavigateToPush && (
                          <button
                            onClick={() => onNavigateToPush(item.phone, item.shopName)}
                            title="Send Push Notification"
                            className="p-1.5 rounded-lg border border-amber-200 hover:bg-amber-50 text-amber-700 transition-colors cursor-pointer"
                          >
                            <Bell className="w-3.5 h-3.5 text-amber-600" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
            <span>
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(filteredCS.length, currentPage * itemsPerPage)} of {filteredCS.length} opportunities
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono font-medium text-gray-700">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
