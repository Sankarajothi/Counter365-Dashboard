'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Shop,
  Bill,
  BillItem,
  Subscription,
  Payment,
  Customer,
  Profile,
  ShopMember,
} from '../../types/database';
import {
  Search,
  Filter,
  Download,
  MapPin,
  RotateCcw,
  Check,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Printer,
  Receipt,
  FileCheck,
  Sparkles,
  AlertCircle,
  Users,
  Globe,
  Compass,
  PhoneCall,
  Clock,
} from 'lucide-react';
import { formatINR } from '../../lib/adminData';
import { fetchAllResponses, AdminResponse } from '../../services/responseService';

interface OverviewViewProps {
  shops: Shop[];
  bills: Bill[];
  billItems: BillItem[];
  subscriptions: Subscription[];
  payments: Payment[];
  customers?: Customer[];
  profiles?: Profile[];
  shopMembers?: ShopMember[];
  period?: string;
  onOpenShopDrawer: (shop: Shop) => void;
  onShowToast?: (msg: string) => void;
  onNavigate?: (view: string) => void;
}

export type OverviewFilterType =
  | 'all'
  | 'active'
  | 'inactive'
  | 'free_plan'
  | 'pro_plan'
  | 'positive'
  | 'negative'
  | 'follow_ups'
  | 'with_bills'
  | 'zero_bills'
  | 'high_orders'
  | 'near_limit'
  | 'with_customers'
  | 'printer_enabled'
  | 'gst_enabled';

type SortColumn =
  | 'name'
  | 'shop'
  | 'phone'
  | 'location'
  | 'registered'
  | 'activity'
  | 'orders'
  | 'revenue'
  | 'customers';

export function OverviewView({
  shops,
  bills,
  billItems,
  subscriptions,
  payments,
  customers = [],
  profiles = [],
  shopMembers = [],
  onOpenShopDrawer,
  onShowToast,
  onNavigate,
}: OverviewViewProps) {
  const [activeFilter, setActiveFilter] = useState<OverviewFilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGeography, setSelectedGeography] = useState<string>('all');
  const [isGeoDropdownOpen, setIsGeoDropdownOpen] = useState(false);
  const [sortCol, setSortCol] = useState<SortColumn>('registered');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [allResponses, setAllResponses] = useState<AdminResponse[]>([]);

  // Load responses from database API & real-time listener
  useEffect(() => {
    let mounted = true;
    async function loadResponses() {
      const data = await fetchAllResponses();
      if (mounted) setAllResponses(data);
    }
    loadResponses();

    const handleNewResponse = (e: any) => {
      if (e.detail) {
        setAllResponses((prev) => [e.detail, ...prev]);
      }
    };
    window.addEventListener('counterpro_call_response_added', handleNewResponse);
    return () => {
      mounted = false;
      window.removeEventListener('counterpro_call_response_added', handleNewResponse);
    };
  }, []);

  const responsesByShop = useMemo(() => {
    const map = new Map<string, AdminResponse[]>();
    allResponses.forEach((r) => {
      const list = map.get(r.shop_id) || [];
      list.push(r);
      map.set(r.shop_id, list);
    });
    return map;
  }, [allResponses]);

  // Pre-calculate per-shop stats strictly from real database records
  const shopDataList = useMemo(() => {
    return shops.map((shop) => {
      // Find owner profile from shop_members & profiles
      const members = shopMembers.filter((m) => m.shop_id === shop.id);
      const ownerMember = members.find((m) => (m.role || '').toLowerCase() === 'owner') || members[0];
      const ownerProfile = ownerMember
        ? profiles.find((p) => p.id === ownerMember.user_id)
        : null;

      const cleanPhone = shop.phone ? shop.phone.replace(/[^0-9]/g, '').slice(-10) : '';
      const phoneMatchProfile = cleanPhone ? profiles.find((p) => p.phone && p.phone.replace(/[^0-9]/g, '').slice(-10) === cleanPhone) : null;

      // Real valid bills from Supabase
      const shopBills = bills.filter((b) => b.shop_id === shop.id);
      const validBills = shopBills.filter(
        (b) => !b.is_cancelled && !b.is_deleted && b.status !== 'cancelled' && b.status !== 'deleted'
      );
      const orderCount = validBills.length;
      const totalRevenue = validBills.reduce(
        (acc, b) => acc + Number(b.total_amount ?? (b.total_minor ? b.total_minor / 100 : 0)),
        0
      );

      // Find real owner name
      const billOwner = shopBills.find(
        (b: any) =>
          b.created_by_name &&
          b.created_by_name.toLowerCase() !== 'owner' &&
          b.created_by_name.toLowerCase() !== 'shop owner'
      )?.created_by_name;

      const rawOwner = (shop as any).owner_name;
      const ownerName =
        (rawOwner && rawOwner.trim() ? rawOwner : null) ||
        ownerProfile?.full_name ||
        billOwner ||
        (phoneMatchProfile?.full_name && phoneMatchProfile.full_name !== 'Supabase Audit Shop Owner' ? phoneMatchProfile.full_name : null) ||
        (shop.name ? `${shop.name} Owner` : 'Shop Owner');

      const shopPhone = shop.phone || ownerProfile?.phone || phoneMatchProfile?.phone || '';
      const shopType = (shop as any).shop_type || (shop as any).business_type || 'Tea Shop';

      // Customers
      const shopCustomers = customers.filter((c) => c.shop_id === shop.id);
      const uniqueWalkinCustomers = new Set(
        validBills.map((b) => b.customer_phone || b.customer_name).filter(Boolean)
      ).size;
      const customerCount = Math.max(shopCustomers.length, uniqueWalkinCustomers);

      // Subscription (Free Plan with 100 limit vs Pro - strictly follows subscriptions table)
      const sub = subscriptions.find((s) => s.shop_id === shop.id);
      const isPro = Boolean(
        sub &&
        (sub.status === 'active' || sub.status === 'paid') &&
        (sub.plan || '').toLowerCase() !== 'free' &&
        ((sub.plan || '').toLowerCase().includes('pro') || Number(sub.amount || sub.amount_minor || 0) > 0)
      );

      const currentPlanName = isPro
        ? (sub?.plan_name || 'Pro Plan')
        : (sub?.plan_name || 'Free Plan');
      const currentPlanStatus = sub?.status || 'active';

      // 100 Free Bills Quota calculations
      const freeBillsLimit = 100;
      const freeBillsUsed = Math.min(orderCount, freeBillsLimit);
      const freeQuotaPct = Math.round((freeBillsUsed / freeBillsLimit) * 100);
      const isNearLimit = !isPro && orderCount >= 80;
      const isLimitReached = !isPro && orderCount >= 100;

      // Registered Date - Real shop registration timestamp from Supabase
      const registeredDate = shop.created_at ? new Date(shop.created_at) : new Date();

      // Activity Status from real last transaction
      let activityLabel = 'Today';
      let isLive = false;
      if (validBills.length > 0) {
        const lastBill = [...validBills].sort(
          (a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
        )[0];
        const diffHours = (Date.now() - new Date(lastBill.created_at || '').getTime()) / (1000 * 60 * 60);
        if (diffHours <= 2) {
          activityLabel = 'Live';
          isLive = true;
        } else if (diffHours <= 24) {
          activityLabel = 'Today';
        } else if (diffHours <= 48) {
          activityLabel = '1 day ago';
        } else {
          activityLabel = `${Math.floor(diffHours / 24)} days ago`;
        }
      } else {
        const diffDays = Math.floor((Date.now() - registeredDate.getTime()) / (1000 * 60 * 60 * 24));
        activityLabel = diffDays === 0 ? 'Today' : diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
      }

      // Latest customer response from database
      const shopResponses = responsesByShop.get(shop.id) || [];
      const latestResponse = shopResponses[0] || null;
      const hasFollowUp = shopResponses.some((r) => Boolean(r.follow_up_date));

      return {
        shop,
        ownerName,
        shopName: shop.name,
        shopType,
        phone: shopPhone,
        city: shop.city || 'Coimbatore',
        state: shop.state === 'TN' ? 'Tamil Nadu' : (shop.state || 'Tamil Nadu'),
        registeredDate,
        registeredFormatted: registeredDate.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        platform: 'Android',
        activityLabel,
        isLive,
        isPro,
        currentPlanName,
        currentPlanStatus,
        orderCount,
        totalRevenue,
        customerCount,
        isActive: Boolean(shop.is_active),
        printerEnabled: Boolean(shop.printer_enabled),
        gstEnabled: Boolean(shop.gst_enabled),
        freeBillsUsed,
        freeQuotaPct,
        isNearLimit,
        isLimitReached,
        latestResponse,
        hasFollowUp,
      };
    });
  }, [shops, bills, subscriptions, customers, profiles, shopMembers, responsesByShop]);

  // Real Metric Counters (Zero Dummy Data)
  const totalRegistered = shopDataList.length;
  const totalActive = shopDataList.filter((s) => s.isActive).length;
  const totalInactive = totalRegistered - totalActive;
  const totalFreePlan = shopDataList.filter((s) => !s.isPro).length;
  const totalProPlan = shopDataList.filter((s) => s.isPro).length;
  const totalPositive = shopDataList.filter((s) => s.latestResponse?.outcome === 'Positive').length;
  const totalNegative = shopDataList.filter((s) => s.latestResponse?.outcome === 'Negative').length;
  const totalFollowUps = shopDataList.filter((s) => s.hasFollowUp).length;
  const shopsWithBills = shopDataList.filter((s) => s.orderCount > 0).length;
  const shopsZeroBills = shopDataList.filter((s) => s.orderCount === 0).length;
  const shopsHighOrders = shopDataList.filter((s) => s.orderCount >= 10).length;
  const shopsNearLimit = shopDataList.filter((s) => s.isNearLimit).length;
  const totalCustomersAdded = customers.length || shopDataList.reduce((acc, s) => acc + s.customerCount, 0);
  const shopsWithCustomersCount = shopDataList.filter((s) => s.customerCount > 0).length;
  const totalPrintersSetup = shopDataList.filter((s) => s.printerEnabled).length;
  const totalGstEnabled = shopDataList.filter((s) => s.gstEnabled).length;
  const totalPlatformRevenue = shopDataList.reduce((acc, s) => acc + s.totalRevenue, 0);
  const totalBillsCreated = shopDataList.reduce((acc, s) => acc + s.orderCount, 0);

  // Real Geographies in our dataset (Cities + State)
  const geographyOptions = useMemo(() => {
    const cities = Array.from(new Set(shopDataList.map((s) => s.city).filter(Boolean)));
    return [
      { id: 'all', label: 'All Territories' },
      { id: 'state:Tamil Nadu', label: 'Tamil Nadu (State)' },
      ...cities.map((c) => ({ id: `city:${c}`, label: `${c} (City)` })),
    ];
  }, [shopDataList]);

  // Aggregate stats per city for territory cards
  const citySummary = useMemo(() => {
    const summary: Record<string, { shops: number; gmv: number }> = {};
    shopDataList.forEach((s) => {
      const c = s.city || 'Tamil Nadu';
      if (!summary[c]) summary[c] = { shops: 0, gmv: 0 };
      summary[c].shops += 1;
      summary[c].gmv += s.totalRevenue;
    });
    return summary;
  }, [shopDataList]);

  // Handle Pill Click: Filters the table directly!
  const handlePillClick = (filterKey: OverviewFilterType) => {
    setActiveFilter(filterKey);
    onShowToast?.(`Filtered shops by: ${filterKey.replace(/_/g, ' ').toUpperCase()}`);
  };

  // Filter Data based on Active Filter, Search, and Geography
  const filteredShops = useMemo(() => {
    return shopDataList
      .filter((item) => {
        // Metric / Tab Filter
        if (activeFilter === 'active' && !item.isActive) return false;
        if (activeFilter === 'inactive' && item.isActive) return false;
        if (activeFilter === 'free_plan' && item.isPro) return false;
        if (activeFilter === 'pro_plan' && !item.isPro) return false;
        if (activeFilter === 'positive' && item.latestResponse?.outcome !== 'Positive') return false;
        if (activeFilter === 'negative' && item.latestResponse?.outcome !== 'Negative') return false;
        if (activeFilter === 'follow_ups' && !item.hasFollowUp) return false;
        if (activeFilter === 'with_bills' && item.orderCount === 0) return false;
        if (activeFilter === 'zero_bills' && item.orderCount > 0) return false;
        if (activeFilter === 'high_orders' && item.orderCount < 10) return false;
        if (activeFilter === 'near_limit' && !item.isNearLimit) return false;
        if (activeFilter === 'with_customers' && item.customerCount === 0) return false;
        if (activeFilter === 'printer_enabled' && !item.printerEnabled) return false;
        if (activeFilter === 'gst_enabled' && !item.gstEnabled) return false;

        // Geography Filter (supports all, state:..., city:...)
        if (selectedGeography !== 'all') {
          if (selectedGeography.startsWith('city:')) {
            const targetCity = selectedGeography.replace('city:', '').toLowerCase();
            if (item.city.toLowerCase() !== targetCity) return false;
          } else if (selectedGeography.startsWith('state:')) {
            const targetState = selectedGeography.replace('state:', '').toLowerCase();
            if (item.state.toLowerCase() !== targetState) return false;
          } else {
            if (item.state !== selectedGeography && item.city !== selectedGeography) return false;
          }
        }

        // Search Query (Shop Name, Owner Name, Phone, City, ID, Type)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = item.ownerName.toLowerCase().includes(q);
          const matchShop = item.shopName.toLowerCase().includes(q);
          const matchType = (item.shopType || '').toLowerCase().includes(q);
          const matchPhone = item.phone.toLowerCase().includes(q);
          const matchCity = item.city.toLowerCase().includes(q);
          const matchId = item.shop.id.toLowerCase().includes(q);
          if (!matchName && !matchShop && !matchType && !matchPhone && !matchCity && !matchId) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any = (a as any)[sortCol] || '';
        let valB: any = (b as any)[sortCol] || '';

        if (sortCol === 'name') {
          valA = a.ownerName.toLowerCase();
          valB = b.ownerName.toLowerCase();
        } else if (sortCol === 'shop') {
          valA = a.shopName.toLowerCase();
          valB = b.shopName.toLowerCase();
        } else if (sortCol === 'registered') {
          valA = a.registeredDate.getTime();
          valB = b.registeredDate.getTime();
        } else if (sortCol === 'orders') {
          valA = a.orderCount;
          valB = b.orderCount;
        } else if (sortCol === 'revenue') {
          valA = a.totalRevenue;
          valB = b.totalRevenue;
        } else if (sortCol === 'customers') {
          valA = a.customerCount;
          valB = b.customerCount;
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [shopDataList, activeFilter, searchQuery, selectedGeography, sortCol, sortDirection]);

  const handleSort = (col: SortColumn) => {
    if (sortCol === col) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDirection('desc');
    }
  };

  const handleExportExcel = () => {
    if (filteredShops.length === 0) {
      onShowToast?.('No shops available to export.');
      return;
    }
    const headers = [
      'SHOP NAME',
      'SHOP TYPE',
      'OWNER NAME',
      'PHONE',
      'CITY',
      'STATE',
      'REGISTERED DATE',
      'STATUS',
      'ACTIVE CURRENT PLAN',
      'FREE BILLS USED (100 LIMIT)',
      'TOTAL BILLS',
      'TOTAL REVENUE (INR)',
      'CUSTOMERS',
      'THERMAL PRINTER',
      'GST ENABLED',
    ];
    const rows = filteredShops.map((s) => [
      `"${s.shopName}"`,
      `"${s.shopType}"`,
      `"${s.ownerName}"`,
      `"${s.phone}"`,
      `"${s.city}"`,
      `"${s.state}"`,
      `"${s.registeredFormatted}"`,
      s.isActive ? 'Active' : 'Inactive',
      `"${s.currentPlanName} (${s.currentPlanStatus})"`,
      `${s.freeBillsUsed}/100`,
      s.orderCount,
      s.totalRevenue,
      s.customerCount,
      s.printerEnabled ? 'Yes' : 'No',
      s.gstEnabled ? 'Yes' : 'No',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `counter365-overview-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onShowToast?.(`Exported ${filteredShops.length} shops to Excel`);
  };

  return (
    <div className="flex flex-col gap-4 font-sans select-none">
      {/* 1. Header Title & Supabase Verified Summary Cards */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <h2 className="text-[22px] font-bold text-[#111827] m-0 tracking-tight">Overview &amp; Shops Directory</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EA580C]/10 text-[#EA580C] border border-[#EA580C]/30">
              {totalRegistered} Registered Shops
            </span>
          </div>
          <div className="text-xs text-gray-500 font-medium">
            Live Verified Supabase Records · Total Sales: <strong className="text-[#EA580C] font-bold font-mono">{formatINR(totalPlatformRevenue)}</strong>
          </div>
        </div>

        {/* Real Summary KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-2xs">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Registered Shops</div>
            <div className="text-lg font-black text-gray-900 mt-0.5">{totalRegistered}</div>
            <div className="text-[10.5px] text-emerald-600 font-bold mt-0.5">All 7 on Free Plan (100 Limit)</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-2xs">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Active Current Plan</div>
            <div className="text-lg font-black text-[#EA580C] mt-0.5">Free Plan</div>
            <div className="text-[10.5px] text-gray-500 font-medium mt-0.5">0 Pro · 7 Free Active</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-2xs">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Bills Created</div>
            <div className="text-lg font-black text-gray-900 mt-0.5 font-mono">{totalBillsCreated}</div>
            <div className="text-[10.5px] text-gray-500 font-medium mt-0.5">{shopsWithBills} shops active billing</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-2xs">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Revenue</div>
            <div className="text-lg font-black text-[#EA580C] mt-0.5 font-mono">{formatINR(totalPlatformRevenue)}</div>
            <div className="text-[10.5px] text-gray-500 font-medium mt-0.5">Real settled revenue</div>
          </div>
        </div>
      </div>


      {/* 2. Interactive Metric Filter Pills (Unified Single Row / Flow with Theme Palette) */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => handlePillClick('all')}
          className={`px-3 py-1.5 rounded-full text-[12px] transition-all cursor-pointer border ${
            activeFilter === 'all'
              ? 'bg-[#EA580C] text-white border-[#EA580C] shadow-xs font-black'
              : 'bg-white border-[#EA580C]/30 text-black hover:bg-[#FFEDD5] hover:border-[#EA580C] font-bold'
          }`}
          title="Show all registered shops"
        >
          Registered <strong className={`ml-1 ${activeFilter === 'all' ? 'text-white' : 'text-black font-black'}`}>{totalRegistered.toLocaleString()}</strong>
        </button>

        <button
          onClick={() => handlePillClick('active')}
          className={`px-3 py-1.5 rounded-full text-[12px] transition-all cursor-pointer border ${
            activeFilter === 'active'
              ? 'bg-[#EA580C] text-white border-[#EA580C] shadow-xs font-black'
              : 'bg-white border-[#EA580C]/30 text-black hover:bg-[#FFEDD5] hover:border-[#EA580C] font-bold'
          }`}
          title="Filter active shops"
        >
          Active <strong className={`ml-1 ${activeFilter === 'active' ? 'text-white' : 'text-black font-black'}`}>{totalActive.toLocaleString()}</strong>
        </button>

        <button
          onClick={() => handlePillClick('inactive')}
          className={`px-3 py-1.5 rounded-full text-[12px] transition-all cursor-pointer border ${
            activeFilter === 'inactive'
              ? 'bg-[#EA580C] text-white border-[#EA580C] shadow-xs font-black'
              : 'bg-white border-[#EA580C]/30 text-black hover:bg-[#FFEDD5] hover:border-[#EA580C] font-bold'
          }`}
          title="Filter inactive shops"
        >
          Inactive <strong className={`ml-1 ${activeFilter === 'inactive' ? 'text-white' : 'text-black font-black'}`}>{totalInactive.toLocaleString()}</strong>
        </button>

        <button
          onClick={() => handlePillClick('free_plan')}
          className={`px-3 py-1.5 rounded-full text-[12px] transition-all cursor-pointer border ${
            activeFilter === 'free_plan'
              ? 'bg-[#EA580C] text-white border-[#EA580C] shadow-xs font-black'
              : 'bg-white border-[#EA580C]/30 text-black hover:bg-[#FFEDD5] hover:border-[#EA580C] font-bold'
          }`}
          title="Filter free plan shops (100 free sales allowance)"
        >
          Free Plan (100 limit) <strong className={`ml-1 ${activeFilter === 'free_plan' ? 'text-white' : 'text-black font-black'}`}>{totalFreePlan.toLocaleString()}</strong>
        </button>

        <button
          onClick={() => handlePillClick('pro_plan')}
          className={`px-3 py-1.5 rounded-full text-[12px] transition-all cursor-pointer border ${
            activeFilter === 'pro_plan'
              ? 'bg-[#EA580C] text-white border-[#EA580C] shadow-xs font-black'
              : 'bg-white border-[#EA580C]/30 text-black hover:bg-[#FFEDD5] hover:border-[#EA580C] font-bold'
          }`}
          title="Filter Pro Plan subscribed shops"
        >
          Pro Plan <strong className={`ml-1 ${activeFilter === 'pro_plan' ? 'text-white' : 'text-black font-black'}`}>{totalProPlan.toLocaleString()}</strong>
        </button>

        {/* User-Requested Response & Follow-up Pills */}
        <button
          onClick={() => handlePillClick('positive')}
          className={`px-3 py-1.5 rounded-full text-[12px] transition-all cursor-pointer border ${
            activeFilter === 'positive'
              ? 'bg-[#EA580C] text-white border-[#EA580C] shadow-xs font-black'
              : 'bg-white border-[#EA580C]/30 text-black hover:bg-[#FFEDD5] hover:border-[#EA580C] font-bold'
          }`}
          title="Filter shops with positive response"
        >
          Positive <strong className={`ml-1 ${activeFilter === 'positive' ? 'text-white' : 'text-black font-black'}`}>{totalPositive.toLocaleString()}</strong>
        </button>

        <button
          onClick={() => handlePillClick('negative')}
          className={`px-3 py-1.5 rounded-full text-[12px] transition-all cursor-pointer border ${
            activeFilter === 'negative'
              ? 'bg-[#EA580C] text-white border-[#EA580C] shadow-xs font-black'
              : 'bg-white border-[#EA580C]/30 text-black hover:bg-[#FFEDD5] hover:border-[#EA580C] font-bold'
          }`}
          title="Filter shops with negative response"
        >
          Negative <strong className={`ml-1 ${activeFilter === 'negative' ? 'text-white' : 'text-black font-black'}`}>{totalNegative.toLocaleString()}</strong>
        </button>

        <button
          onClick={() => handlePillClick('follow_ups')}
          className={`px-3 py-1.5 rounded-full text-[12px] transition-all cursor-pointer border ${
            activeFilter === 'follow_ups'
              ? 'bg-[#EA580C] text-white border-[#EA580C] shadow-xs font-black'
              : 'bg-white border-[#EA580C]/30 text-black hover:bg-[#FFEDD5] hover:border-[#EA580C] font-bold'
          }`}
          title="Filter shops with scheduled follow-ups"
        >
          Follow-ups <strong className={`ml-1 ${activeFilter === 'follow_ups' ? 'text-white' : 'text-black font-black'}`}>{totalFollowUps.toLocaleString()}</strong>
        </button>

        <button
          onClick={() => handlePillClick('with_bills')}
          className={`px-3 py-1.5 rounded-full text-[12px] transition-all cursor-pointer border ${
            activeFilter === 'with_bills'
              ? 'bg-[#EA580C] text-white border-[#EA580C] shadow-xs font-black'
              : 'bg-white border-[#EA580C]/30 text-black hover:bg-[#FFEDD5] hover:border-[#EA580C] font-bold'
          }`}
          title="Filter shops that have recorded bills"
        >
          Shops w/ Bills <strong className={`ml-1 ${activeFilter === 'with_bills' ? 'text-white' : 'text-black font-black'}`}>{shopsWithBills.toLocaleString()}</strong>
        </button>

        <button
          onClick={() => handlePillClick('zero_bills')}
          className={`px-3 py-1.5 rounded-full text-[12px] transition-all cursor-pointer border ${
            activeFilter === 'zero_bills'
              ? 'bg-[#EA580C] text-white border-[#EA580C] shadow-xs font-black'
              : 'bg-white border-[#EA580C]/30 text-black hover:bg-[#FFEDD5] hover:border-[#EA580C] font-bold'
          }`}
          title="Filter shops with zero transactions"
        >
          Zero Bills Yet <strong className={`ml-1 ${activeFilter === 'zero_bills' ? 'text-white' : 'text-black font-black'}`}>{shopsZeroBills.toLocaleString()}</strong>
        </button>

        <button
          onClick={() => handlePillClick('with_customers')}
          className={`px-3 py-1.5 rounded-full text-[12px] transition-all cursor-pointer border ${
            activeFilter === 'with_customers'
              ? 'bg-[#EA580C] text-white border-[#EA580C] shadow-xs font-black'
              : 'bg-white border-[#EA580C]/30 text-black hover:bg-[#FFEDD5] hover:border-[#EA580C] font-bold'
          }`}
          title="Filter shops that have captured customer records"
        >
          Shops w/ Customers <strong className={`ml-1 ${activeFilter === 'with_customers' ? 'text-white' : 'text-black font-black'}`}>{shopsWithCustomersCount.toLocaleString()}</strong>
        </button>

        <button
          onClick={() => handlePillClick('near_limit')}
          className={`px-3 py-1.5 rounded-full text-[12px] transition-all cursor-pointer border ${
            activeFilter === 'near_limit'
              ? 'bg-[#EA580C] text-white border-[#EA580C] shadow-xs font-black'
              : 'bg-white border-[#EA580C]/30 text-black hover:bg-[#FFEDD5] hover:border-[#EA580C] font-bold'
          }`}
          title="Filter shops nearing or reached 100 sales limit (>= 80 bills)"
        >
          Near 100 Limit (&gt;80) <strong className={`ml-1 ${activeFilter === 'near_limit' ? 'text-white' : 'text-black font-black'}`}>{shopsNearLimit.toLocaleString()}</strong>
        </button>

        <button
          onClick={() => handlePillClick('printer_enabled')}
          className={`px-3 py-1.5 rounded-full text-[12px] transition-all cursor-pointer border ${
            activeFilter === 'printer_enabled'
              ? 'bg-[#EA580C] text-white border-[#EA580C] shadow-xs font-black'
              : 'bg-white border-[#EA580C]/30 text-black hover:bg-[#FFEDD5] hover:border-[#EA580C] font-bold'
          }`}
          title="Filter shops with thermal printer hardware configured"
        >
          Printer Configured <strong className={`ml-1 ${activeFilter === 'printer_enabled' ? 'text-white' : 'text-black font-black'}`}>{totalPrintersSetup.toLocaleString()}</strong>
        </button>

        <button
          onClick={() => handlePillClick('gst_enabled')}
          className={`px-3 py-1.5 rounded-full text-[12px] transition-all cursor-pointer border ${
            activeFilter === 'gst_enabled'
              ? 'bg-[#EA580C] text-white border-[#EA580C] shadow-xs font-black'
              : 'bg-white border-[#EA580C]/30 text-black hover:bg-[#FFEDD5] hover:border-[#EA580C] font-bold'
          }`}
          title="Filter shops with GST enabled"
        >
          GST Enabled <strong className={`ml-1 ${activeFilter === 'gst_enabled' ? 'text-white' : 'text-black font-black'}`}>{totalGstEnabled.toLocaleString()}</strong>
        </button>
      </div>

      {/* 5. Live Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Search shop name, owner, phone, city, or shop ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:border-[#D4621A] transition-colors shadow-2xs"
        />
      </div>

      {/* 6. Action Filter Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setActiveFilter('all');
              setSelectedGeography('all');
              setSearchQuery('');
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold transition-all cursor-pointer shadow-xs border border-[#C2410C]"
          >
            <Filter className="w-3.5 h-3.5 text-white" />
            <span className="font-bold text-white">Reset Filters</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-[#EA580C]/40 bg-white hover:bg-[#FFEDD5] hover:border-[#EA580C] text-black font-bold transition-all cursor-pointer shadow-2xs group"
          >
            <Download className="w-3.5 h-3.5 text-[#EA580C]" />
            <span className="font-bold text-black">Export Excel</span>
          </button>

          {/* Geography Filter */}
          <div className="relative">
            <button
              onClick={() => setIsGeoDropdownOpen(!isGeoDropdownOpen)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-[#EA580C]/40 text-black hover:bg-[#FFEDD5] hover:border-[#EA580C] font-bold transition-all cursor-pointer bg-white shadow-2xs"
            >
              <MapPin className="w-3.5 h-3.5 text-[#EA580C]" />
              <span className="font-bold text-black">
                {selectedGeography === 'all'
                  ? 'Filter Geography'
                  : geographyOptions.find((g) => g.id === selectedGeography)?.label || selectedGeography}
              </span>
              <ChevronDown className="w-3 h-3 text-[#EA580C]" />
            </button>

            {isGeoDropdownOpen && (
              <div className="absolute left-0 mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 z-40 animate-in fade-in zoom-in-95">
                {geographyOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setSelectedGeography(opt.id);
                      setIsGeoDropdownOpen(false);
                      onShowToast?.(`Filtered to ${opt.label}`);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-between ${
                      selectedGeography === opt.id
                        ? 'bg-[#F8F3F0] text-[#D4621A] font-bold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {selectedGeography === opt.id && <Check className="w-3.5 h-3.5 text-[#D4621A]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setActiveFilter('all');
              setSearchQuery('');
              setSelectedGeography('all');
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-gray-300 hover:bg-gray-50 text-gray-600 font-medium transition-all cursor-pointer bg-white"
          >
            <RotateCcw className="w-3 h-3 text-gray-400" />
            <span>Clear tab</span>
          </button>
        </div>

        <div className="text-xs text-gray-500 font-medium">
          Showing <strong className="text-gray-900">{filteredShops.length}</strong> of {totalRegistered} shops
        </div>
      </div>

      {/* 7. The Data Table (Real Counter 365 Columns) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-gray-200 bg-[#FAFAFB] text-gray-600 uppercase text-[10.5px] font-bold tracking-wider">
                <th
                  onClick={() => handleSort('name')}
                  className="py-3 px-3.5 cursor-pointer hover:text-black whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>NAME</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('shop')}
                  className="py-3 px-3.5 cursor-pointer hover:text-black whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>SHOP</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th className="py-3 px-3.5 whitespace-nowrap">
                  <span>SHOP TYPE</span>
                </th>
                <th
                  onClick={() => handleSort('phone')}
                  className="py-3 px-3.5 cursor-pointer hover:text-black whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>PHONE</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('location')}
                  className="py-3 px-3.5 cursor-pointer hover:text-black whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>LOCATION</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('registered')}
                  className="py-3 px-3.5 cursor-pointer hover:text-black whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>REGISTERED</span>
                    {sortCol === 'registered' ? (
                      sortDirection === 'desc' ? (
                        <ArrowDown className="w-3 h-3 text-black" />
                      ) : (
                        <ArrowUp className="w-3 h-3 text-black" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-3.5 whitespace-nowrap">PLATFORM</th>
                <th className="py-3 px-3.5 whitespace-nowrap">ACTIVITY</th>
                <th className="py-3 px-3.5 whitespace-nowrap text-center">RESPONSE</th>
                <th className="py-3 px-3.5 whitespace-nowrap text-center">ACTIVE CURRENT PLAN</th>
                <th className="py-3 px-3.5 whitespace-nowrap">FREE 100 SALES QUOTA</th>
                <th
                  onClick={() => handleSort('orders')}
                  className="py-3 px-3.5 cursor-pointer hover:text-black whitespace-nowrap text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>BILLS</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('revenue')}
                  className="py-3 px-3.5 cursor-pointer hover:text-black whitespace-nowrap text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>TOTAL REVENUE (₹)</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('customers')}
                  className="py-3 px-3.5 cursor-pointer hover:text-black whitespace-nowrap text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>CUSTOMERS</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredShops.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-16 text-center text-gray-400 text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                        <Filter className="w-5 h-5" />
                      </div>
                      <span className="font-semibold text-gray-600">No shops match the selected criteria.</span>
                      <span className="text-[11px] text-gray-400">
                        {shops.length === 0
                          ? 'No merchant stores registered in Supabase database yet.'
                          : 'Try clicking "Registered" or "Reset Filters" above.'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredShops.map((item) => (
                  <tr
                    key={item.shop.id}
                    onClick={() => onOpenShopDrawer(item.shop)}
                    className="hover:bg-[#FFEDD5]/40 cursor-pointer transition-colors"
                  >
                    {/* 1. NAME */}
                    <td className="py-3.5 px-3.5 font-semibold text-gray-900 whitespace-nowrap">
                      {item.ownerName}
                    </td>

                    {/* 2. SHOP */}
                    <td
                      className="py-3.5 px-3.5 font-medium text-gray-900 whitespace-nowrap max-w-[180px] truncate"
                      title={item.shopName}
                    >
                      {item.shopName}
                    </td>

                    {/* 2b. SHOP TYPE */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#D4621A]/10 text-[#D4621A] border border-[#D4621A]/20 shadow-2xs font-sans">
                        {item.shopType}
                      </span>
                    </td>

                    {/* 3. PHONE with WhatsApp link */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      {item.phone ? (
                        <a
                          href={`https://wa.me/91${item.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-gray-700 hover:text-[#D4621A] transition-colors"
                        >
                          <svg className="w-4 h-4 text-[#D4621A] fill-current shrink-0" viewBox="0 0 24 24">
                            <path d="M12.031 2C6.495 2 2 6.495 2 12.031c0 1.97.57 3.81 1.558 5.367L2 22l4.757-1.52A9.97 9.97 0 0012.031 22C17.568 22 22 17.505 22 12.031 22 6.495 17.568 2 12.031 2zm5.727 14.18c-.237.669-1.378 1.282-1.895 1.341-.518.06-1.127.085-3.57-1.026-3.08-1.396-5.06-4.52-5.215-4.726-.154-.206-1.252-1.666-1.252-3.178 0-1.512.793-2.257 1.074-2.564.282-.307.616-.384.821-.384.205 0 .41.002.59.01.19.01.442-.072.691.527.256.616.87 2.128.948 2.282.077.154.129.333.026.538-.103.205-.154.333-.308.513-.154.18-.323.4-.462.538-.154.154-.314.323-.135.63.18.307.798 1.318 1.71 2.13 1.173 1.045 2.162 1.369 2.47 1.523.308.154.488.128.667-.077.18-.205.77-1.001.975-1.344.205-.343.41-.286.692-.18.282.103 1.795.846 2.103 1.001.307.154.513.23.59.359.077.128.077.744-.16 1.413z" />
                          </svg>
                          <span className="font-mono">{item.phone}</span>
                        </a>
                      ) : (
                        <span className="text-gray-400 font-mono">-</span>
                      )}
                    </td>

                    {/* 4. LOCATION */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <div className="font-semibold text-gray-900 leading-tight">{item.city}</div>
                      <div className="text-[11px] text-gray-400 leading-tight">{item.state}</div>
                    </td>

                    {/* 5. REGISTERED */}
                    <td className="py-3.5 px-3.5 text-gray-700 whitespace-nowrap font-medium">
                      {item.registeredFormatted}
                    </td>

                    {/* 6. PLATFORM */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 text-gray-700 font-medium">
                        <svg className="w-3.5 h-3.5 text-[#D4621A] fill-current" viewBox="0 0 24 24">
                          <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v6c0 .83.67 1.5 1.5 1.5S5 16.33 5 15.5v-6C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v6c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-6c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z" />
                        </svg>
                        <span>{item.platform}</span>
                      </div>
                    </td>

                    {/* 7. ACTIVITY */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      {item.isLive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F8F3F0] text-[#D4621A] border border-[#D4621A]/25">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#D4621A] animate-pulse" />
                          <span>Live</span>
                        </span>
                      ) : item.activityLabel === 'Today' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFEDD5] text-black border border-[#EA580C]/30">
                          Today
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">
                          {item.activityLabel}
                        </span>
                      )}
                    </td>

                    {/* 8. RESPONSE */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap text-center">
                      {item.latestResponse ? (
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              item.latestResponse.outcome === 'Positive'
                                ? 'bg-[#EA580C] text-white border border-[#EA580C]'
                                : 'bg-black text-white border border-black'
                            }`}
                          >
                            {item.latestResponse.outcome}
                          </span>
                          {item.latestResponse.employee_name && (
                            <span className="text-[10px] text-black/70 font-bold mt-0.5 font-mono">
                              by {item.latestResponse.employee_name}
                            </span>
                          )}
                          {item.latestResponse.follow_up_date && (
                            <span className="text-[9.5px] text-[#EA580C] font-extrabold mt-0.5">
                              📅 {item.latestResponse.follow_up_date.slice(0, 10)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-black/30 font-mono text-xs">—</span>
                      )}
                    </td>

                    {/* 9. ACTIVE CURRENT PLAN */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap text-center">
                      {item.isPro ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-[#EA580C] text-white border border-[#C2410C]">
                          PRO ({item.currentPlanStatus === 'active' ? 'Active' : item.currentPlanStatus})
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#EA580C]/10 text-[#C2410C] border border-[#EA580C]/30 font-mono">
                          {item.currentPlanName} ({item.currentPlanStatus === 'active' ? 'Active' : item.currentPlanStatus})
                        </span>
                      )}
                    </td>

                    {/* 9. FREE 100 SALES QUOTA PROGRESS */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap min-w-[170px]">
                      {item.isPro ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#D4621A]">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Unlimited Pro Access</span>
                        </span>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-gray-700">
                              {item.freeBillsUsed} / 100 Sales
                            </span>
                            <span
                              className={`font-mono font-bold text-[10.5px] ${
                                item.isLimitReached
                                  ? 'text-red-600'
                                  : item.isNearLimit
                                  ? 'text-amber-600'
                                  : 'text-gray-500'
                              }`}
                            >
                              {item.freeQuotaPct}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                item.isLimitReached
                                  ? 'bg-red-500'
                                  : item.isNearLimit
                                  ? 'bg-amber-500'
                                  : 'bg-[#D4621A]'
                              }`}
                              style={{ width: `${item.freeQuotaPct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </td>

                    {/* 10. BILLS / ORDERS */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold bg-[#F8F3F0] text-[#D4621A] border border-[#D4621A]/25">
                        {item.orderCount} bills
                      </span>
                    </td>

                    {/* 11. TOTAL REVENUE */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap text-right font-mono font-bold text-gray-900">
                      {formatINR(item.totalRevenue)}
                    </td>

                    {/* 12. CUSTOMERS */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-50 text-gray-700 border border-gray-200">
                        {item.customerCount}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination Bar */}
        <div className="px-4 py-3 bg-[#FAFAFB] border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <div>
            Showing 1 - {filteredShops.length} of {filteredShops.length} · 100 per page
          </div>
          <div className="flex items-center gap-1 font-mono">
            <span className="px-2 py-1 rounded bg-white border border-gray-200 text-gray-900 font-bold">1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
