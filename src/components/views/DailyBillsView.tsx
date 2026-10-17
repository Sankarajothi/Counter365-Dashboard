'use client';

import React, { useMemo, useState } from 'react';
import {
  RotateCcw,
  Download,
  Search,
  X,
  ChevronRight,
  Phone,
  MapPin,
  Building2,
  Calendar,
} from 'lucide-react';
import { Bill, Shop, Payment, Customer } from '../../types/database';
import { formatINR } from '../../lib/adminData';

interface DailyBillsViewProps {
  bills: Bill[];
  shops: Shop[];
  payments?: Payment[];
  customers?: Customer[];
  loading?: boolean;
  onRefresh?: () => void;
  onOpenShopDrawer?: (shop: Shop) => void;
  onSelectSalon?: (shop: Shop) => void;
  onShowToast?: (msg: string) => void;
}

interface ShopDailyMetrics {
  shopId: string;
  shopName: string;
  city: string;
  phone: string;
  totalOrders: number;
  cashCount: number;
  cashAmount: number;
  upiCount: number;
  upiAmount: number;
  partialCount: number;
  dueAmount: number;
  revenue: number;
  servicesCount: number;
  servicesList: { name: string; count: number }[];
  shopObj?: Shop;
}

interface DayMetricsRow {
  rawDate: string; // YYYY-MM-DD
  friendlyDate: string; // e.g. 14 October 2026
  monthKey: string; // e.g. October 2026
  totalOrders: number;
  cashCount: number;
  cashAmount: number;
  upiCount: number;
  upiAmount: number;
  partialCount: number;
  dueAmount: number;
  revenue: number;
  servicesCount: number;
  shops: ShopDailyMetrics[];
}

export function DailyBillsView({
  bills = [],
  shops = [],
  payments = [],
  customers = [],
  loading = false,
  onRefresh,
  onOpenShopDrawer,
  onSelectSalon,
  onShowToast,
}: DailyBillsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedPopupDate, setSelectedPopupDate] = useState<DayMetricsRow | null>(null);

  const handleSelectShop = (shop: Shop) => {
    if (onSelectSalon) {
      onSelectSalon(shop);
    } else if (onOpenShopDrawer) {
      onOpenShopDrawer(shop);
    }
  };

  // Shop map for fast lookup
  const shopMap = useMemo(() => {
    const map = new Map<string, Shop>();
    shops.forEach((s) => map.set(s.id, s));
    return map;
  }, [shops]);

  // Payment mapping by bill id
  const paymentByBillId = useMemo(() => {
    const map = new Map<string, Payment>();
    payments.forEach((p) => {
      if (p.bill_id) map.set(p.bill_id, p);
    });
    return map;
  }, [payments]);

  // Build daily breakdown matrix strictly from real bills & payments
  const allDailyRows = useMemo<DayMetricsRow[]>(() => {
    const map = new Map<
      string,
      {
        totalOrders: number;
        cashCount: number;
        cashAmount: number;
        upiCount: number;
        upiAmount: number;
        partialCount: number;
        dueAmount: number;
        revenue: number;
        dayServicesSet: Set<string>;
        shopData: Map<
          string,
          {
            totalOrders: number;
            cashCount: number;
            cashAmount: number;
            upiCount: number;
            upiAmount: number;
            partialCount: number;
            dueAmount: number;
            revenue: number;
            servicesMap: Map<string, number>;
          }
        >;
      }
    >();

    bills.forEach((b) => {
      if (b.status === 'deleted' || b.status === 'cancelled') return;

      const dateField = (b as any).issued_at || b.created_at || b.completed_at || '';
      const rawD = dateField.slice(0, 10);
      if (!rawD || rawD.length < 10) return;

      if (!map.has(rawD)) {
        map.set(rawD, {
          totalOrders: 0,
          cashCount: 0,
          cashAmount: 0,
          upiCount: 0,
          upiAmount: 0,
          partialCount: 0,
          dueAmount: 0,
          revenue: 0,
          dayServicesSet: new Set(),
          shopData: new Map(),
        });
      }

      const dayEntry = map.get(rawD)!;
      dayEntry.totalOrders += 1;

      // Shop drilldown
      const sId = b.shop_id || 'unknown';
      if (!dayEntry.shopData.has(sId)) {
        dayEntry.shopData.set(sId, {
          totalOrders: 0,
          cashCount: 0,
          cashAmount: 0,
          upiCount: 0,
          upiAmount: 0,
          partialCount: 0,
          dueAmount: 0,
          revenue: 0,
          servicesMap: new Map(),
        });
      }
      const sEntry = dayEntry.shopData.get(sId)!;
      sEntry.totalOrders += 1;

      // Extract unique items/services
      const items = (b as any).bill_items || (b as any).items || [];
      if (items && items.length > 0) {
        items.forEach((item: any) => {
          const sName = (item.service_name_snapshot || item.item_name || 'General Item').trim();
          dayEntry.dayServicesSet.add(sName);
          sEntry.servicesMap.set(sName, (sEntry.servicesMap.get(sName) || 0) + (item.quantity || 1));
        });
      } else {
        const sName = 'General Checkout';
        dayEntry.dayServicesSet.add(sName);
        sEntry.servicesMap.set(sName, (sEntry.servicesMap.get(sName) || 0) + 1);
      }

      // Amounts: normalize to whole rupees
      // In CounterPro, total_amount is in Rupees. If total_minor exists, divide by 100
      let billTotal = Number(b.total_amount || 0);
      if (!billTotal && (b as any).total_minor) {
        billTotal = Math.round((b as any).total_minor / 100);
      }

      let dueAmount = Number(b.pending_amount || 0);
      if (!dueAmount && (b as any).due_amount_minor) {
        dueAmount = Math.round((b as any).due_amount_minor / 100);
      }
      if (!dueAmount && (b as any).notes && (b as any).notes.includes('due:')) {
        const matches = Array.from((b as any).notes.matchAll(/due:(\d+)/g)) as RegExpMatchArray[];
        if (matches.length > 0) {
          dueAmount = Math.round(parseInt(matches[matches.length - 1][1], 10) / 100);
        }
      }

      const isPartial = dueAmount > 0;
      const linkedPayment = paymentByBillId.get(b.id);
      const mode = (
        (linkedPayment && linkedPayment.payment_method) ||
        b.payment_mode ||
        ''
      ).toLowerCase();
      const isCash = mode.includes('cash');

      if (isPartial) {
        dayEntry.partialCount += 1;
        dayEntry.dueAmount += dueAmount;
        sEntry.partialCount += 1;
        sEntry.dueAmount += dueAmount;
      }

      if (isCash) {
        dayEntry.cashCount += 1;
        dayEntry.cashAmount += billTotal;
        sEntry.cashCount += 1;
        sEntry.cashAmount += billTotal;
      } else {
        dayEntry.upiCount += 1;
        dayEntry.upiAmount += billTotal;
        sEntry.upiCount += 1;
        sEntry.upiAmount += billTotal;
      }

      dayEntry.revenue += billTotal;
      sEntry.revenue += billTotal;
    });

    const rows: DayMetricsRow[] = [];
    const sortedDates = Array.from(map.keys()).sort().reverse();

    sortedDates.forEach((rawDate) => {
      const data = map.get(rawDate)!;
      const dateObj = new Date(`${rawDate}T00:00:00`);
      const friendlyDate = isNaN(dateObj.getTime())
        ? rawDate
        : dateObj.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });
      const monthKey = isNaN(dateObj.getTime())
        ? 'Other'
        : dateObj.toLocaleDateString('en-GB', {
            month: 'long',
            year: 'numeric',
          });

      const shopsList: ShopDailyMetrics[] = [];
      data.shopData.forEach((sData, sId) => {
        const sh = shopMap.get(sId);
        const servicesList = Array.from(sData.servicesMap.entries()).map(([name, count]) => ({
          name,
          count,
        }));
        servicesList.sort((a, b) => b.count - a.count);

        shopsList.push({
          shopId: sId,
          shopName: sh?.name || 'Unnamed Outlet',
          city: sh?.city || 'Tamil Nadu',
          phone: sh?.phone || '—',
          totalOrders: sData.totalOrders,
          cashCount: sData.cashCount,
          cashAmount: sData.cashAmount,
          upiCount: sData.upiCount,
          upiAmount: sData.upiAmount,
          partialCount: sData.partialCount,
          dueAmount: sData.dueAmount,
          revenue: sData.revenue,
          servicesCount: sData.servicesMap.size,
          servicesList,
          shopObj: sh,
        });
      });

      shopsList.sort((a, b) => b.totalOrders - a.totalOrders);

      rows.push({
        rawDate,
        friendlyDate,
        monthKey,
        totalOrders: data.totalOrders,
        cashCount: data.cashCount,
        cashAmount: data.cashAmount,
        upiCount: data.upiCount,
        upiAmount: data.upiAmount,
        partialCount: data.partialCount,
        dueAmount: data.dueAmount,
        revenue: data.revenue,
        servicesCount: data.dayServicesSet.size,
        shops: shopsList,
      });
    });

    return rows;
  }, [bills, paymentByBillId, shopMap]);

  // Unique months available for filtering
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    allDailyRows.forEach((r) => set.add(r.monthKey));
    return Array.from(set);
  }, [allDailyRows]);

  // Filtered rows by month & search
  const filteredRows = useMemo(() => {
    return allDailyRows.filter((r) => {
      if (selectedMonth !== 'all' && r.monthKey !== selectedMonth) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDate = r.friendlyDate.toLowerCase().includes(q) || r.rawDate.includes(q);
        const matchesShop = r.shops.some(
          (s) =>
            s.shopName.toLowerCase().includes(q) ||
            s.city.toLowerCase().includes(q) ||
            s.phone.includes(q)
        );
        return matchesDate || matchesShop;
      }
      return true;
    });
  }, [allDailyRows, selectedMonth, searchQuery]);

  // Overall summary KPI calculations
  const summary = useMemo(() => {
    let totalOrders = 0;
    let cashCount = 0;
    let cashAmount = 0;
    let upiCount = 0;
    let upiAmount = 0;
    let partialCount = 0;
    let dueAmount = 0;
    let revenue = 0;
    const uniqueServicesSet = new Set<string>();

    filteredRows.forEach((r) => {
      totalOrders += r.totalOrders;
      cashCount += r.cashCount;
      cashAmount += r.cashAmount;
      upiCount += r.upiCount;
      upiAmount += r.upiAmount;
      partialCount += r.partialCount;
      dueAmount += r.dueAmount;
      revenue += r.revenue;
      r.shops.forEach((s) => {
        s.servicesList.forEach((item) => uniqueServicesSet.add(item.name));
      });
    });

    return {
      totalOrders,
      cashCount,
      cashAmount,
      upiCount,
      upiAmount,
      partialCount,
      dueAmount,
      uniqueServicesCount: uniqueServicesSet.size,
      revenue,
    };
  }, [filteredRows]);

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Total Orders',
      'Cash Orders',
      'Cash (INR)',
      'UPI Orders',
      'UPI (INR)',
      'Partial / Due Orders',
      'Due Amount (INR)',
      'Services / Items Used',
      'Revenue (INR)',
    ];
    const rows = filteredRows.map((r) => [
      `"${r.friendlyDate}"`,
      r.totalOrders,
      r.cashCount,
      r.cashAmount,
      r.upiCount,
      r.upiAmount,
      r.partialCount,
      r.dueAmount,
      r.servicesCount,
      r.revenue,
    ]);
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `counterpro_daily_orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast?.('Exported Daily Orders to CSV');
  };

  return (
    <div className="space-y-6 font-sans select-none">
      {/* 1. TOP PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Daily Order Metrics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real order metrics across outlets: Total orders, Cash, UPI, and Partial payments.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => (onRefresh ? onRefresh() : window.location.reload())}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#D4621A]" />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-white" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* 2. SUMMARY KPI CARDS (TEAL & SLATE PALETTE) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* TOTAL ORDERS */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
            TOTAL ORDERS
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 font-mono">
            {summary.totalOrders.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            in selected range
          </div>
        </div>

        {/* CASH PAYMENTS */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 font-mono">
            CASH ORDERS
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 font-mono">
            {summary.cashCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">
            ₹{summary.cashAmount.toLocaleString()} collected
          </div>
        </div>

        {/* UPI PAYMENTS */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#D4621A] font-mono">
            UPI / ONLINE
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#D4621A] mt-1 font-mono">
            {summary.upiCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#D4621A]/80 font-mono mt-1">
            ₹{summary.upiAmount.toLocaleString()} received
          </div>
        </div>

        {/* PARTIAL / DUE */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 font-mono">
            PARTIAL / DUE
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-1 font-mono">
            {summary.partialCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-amber-700/80 font-mono mt-1">
            ₹{summary.dueAmount.toLocaleString()} pending due
          </div>
        </div>

        {/* SERVICES / ITEMS USED */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 font-mono">
            ITEMS / SERVICES
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 font-mono">
            {summary.uniqueServicesCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            unique (no duplicates)
          </div>
        </div>

        {/* TOTAL REVENUE */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#D4621A] font-mono">
            TOTAL REVENUE
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#D4621A] mt-1 font-mono">
            ₹{summary.revenue.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            across outlet orders
          </div>
        </div>
      </div>

      {/* 3. DAILY BREAKDOWN CONTROLS & TABLE */}
      <div className="space-y-4">
        {/* Controls row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Daily breakdown
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              {filteredRows.length} days recorded
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search shop, phone, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 shadow-2xs"
              />
            </div>

            {/* Month Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setSelectedMonth('all')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  selectedMonth === 'all'
                    ? 'bg-[#D4621A] text-white'
                    : 'bg-white text-slate-600 border border-slate-300 hover:text-slate-900'
                }`}
              >
                All dates
              </button>
              {availableMonths.map((m) => (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(m)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                    selectedMonth === m
                      ? 'bg-[#D4621A] text-white'
                      : 'bg-white text-slate-600 border border-slate-300 hover:text-slate-900'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#EA580C]/40 bg-white hover:bg-[#FFEDD5] text-black text-xs font-bold shadow-2xs transition-colors cursor-pointer hover:border-[#EA580C]"
            >
              <Download className="w-3.5 h-3.5 text-[#EA580C]" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* 4. DAILY BREAKDOWN TABLE */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/80 font-mono">
                  <th className="py-3 px-4">DATE</th>
                  <th className="py-3 px-3 text-center">TOTAL ORDERS</th>
                  <th className="py-3 px-3 text-center">CASH</th>
                  <th className="py-3 px-3 text-center">UPI / ONLINE</th>
                  <th className="py-3 px-3 text-center">PARTIAL / DUE</th>
                  <th className="py-3 px-3 text-center">SERVICES / ITEMS</th>
                  <th className="py-3 px-4 text-right">REVENUE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                      Loading daily order metrics...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                      No order records found for the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.rawDate} className="hover:bg-[#F8F3F0]/20 transition-colors">
                      {/* DATE (UNDERLINED & CLICKABLE TO OPEN DETAILS POPUP) */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setSelectedPopupDate(row)}
                          className="font-bold text-slate-900 text-xs underline decoration-teal-600/50 hover:text-[#D4621A] hover:decoration-teal-700 cursor-pointer text-left transition-colors"
                          title="Click to view shop breakdown"
                        >
                          {row.friendlyDate}
                        </button>
                      </td>

                      {/* TOTAL ORDERS */}
                      <td className="py-3 px-3 text-center font-bold text-slate-900 font-mono text-sm">
                        {row.totalOrders}
                      </td>

                      {/* CASH ORDERS */}
                      <td className="py-3 px-3 text-center font-mono">
                        <span className="font-bold text-slate-900">{row.cashCount}</span>
                        <span className="text-[11px] text-slate-500 ml-1">
                          (₹{row.cashAmount.toLocaleString()})
                        </span>
                      </td>

                      {/* UPI ORDERS */}
                      <td className="py-3 px-3 text-center font-mono">
                        <span className="font-bold text-[#D4621A]">{row.upiCount}</span>
                        <span className="text-[11px] text-[#D4621A]/80 ml-1">
                          (₹{row.upiAmount.toLocaleString()})
                        </span>
                      </td>

                      {/* PARTIAL / DUE */}
                      <td className="py-3 px-3 text-center font-mono">
                        <span className="font-bold text-amber-700">{row.partialCount}</span>
                        {row.dueAmount > 0 && (
                          <span className="text-[11px] text-amber-600 ml-1">
                            (₹{row.dueAmount.toLocaleString()})
                          </span>
                        )}
                      </td>

                      {/* SERVICES / ITEMS */}
                      <td className="py-3 px-3 text-center font-mono text-slate-700">
                        {row.servicesCount} items
                      </td>

                      {/* REVENUE */}
                      <td className="py-3 px-4 text-right font-black text-slate-900 font-mono text-sm">
                        ₹{row.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 5. POPUP MODAL: SHOP BREAKDOWN FOR SELECTED DATE */}
      {selectedPopupDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-[#F8F3F0] rounded-2xl max-w-5xl w-full max-h-[85vh] shadow-2xl border border-slate-300 p-6 flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Outlet Order Breakdown — {selectedPopupDate.friendlyDate}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detailed outlet order metrics: Total orders, Cash, UPI, Partial pay, and Items used
                </p>
              </div>
              <button
                onClick={() => setSelectedPopupDate(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Detailed Table in Centered Card */}
            <div className="overflow-x-auto flex-1 mt-4">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100/70 font-mono">
                    <th className="py-3 px-3">OUTLET NAME</th>
                    <th className="py-3 px-3">PHONE & CITY</th>
                    <th className="py-3 px-3 text-center">TOTAL ORDERS</th>
                    <th className="py-3 px-3 text-center">CASH</th>
                    <th className="py-3 px-3 text-center">UPI</th>
                    <th className="py-3 px-3 text-center">PARTIAL / DUE</th>
                    <th className="py-3 px-3">ITEMS / SERVICES</th>
                    <th className="py-3 px-3 text-right">REVENUE</th>
                    <th className="py-3 px-3 text-center">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-900">
                  {selectedPopupDate.shops.map((s) => (
                    <tr key={s.shopId} className="hover:bg-[#F8F3F0]/20 transition-colors">
                      {/* OUTLET NAME */}
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {s.shopName}
                      </td>

                      {/* PHONE & CITY */}
                      <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                        <div>{s.city}</div>
                        <div className="text-slate-400">{s.phone}</div>
                      </td>

                      {/* TOTAL ORDERS */}
                      <td className="py-3 px-3 text-center font-bold text-slate-900 font-mono">
                        {s.totalOrders}
                      </td>

                      {/* CASH */}
                      <td className="py-3 px-3 text-center font-mono text-slate-800 font-semibold">
                        <div>{s.cashCount}</div>
                        <div className="text-[10px] text-slate-500 font-normal">₹{s.cashAmount.toLocaleString()}</div>
                      </td>

                      {/* UPI */}
                      <td className="py-3 px-3 text-center font-mono text-[#D4621A] font-semibold">
                        <div>{s.upiCount}</div>
                        <div className="text-[10px] text-[#D4621A]/80 font-normal">₹{s.upiAmount.toLocaleString()}</div>
                      </td>

                      {/* PARTIAL / DUE */}
                      <td className="py-3 px-3 text-center font-mono text-amber-700">
                        <div>{s.partialCount}</div>
                        {s.dueAmount > 0 && (
                          <div className="text-[10px] text-amber-600 font-normal">₹{s.dueAmount.toLocaleString()}</div>
                        )}
                      </td>

                      {/* ITEMS USED */}
                      <td className="py-3 px-3 text-[11px]">
                        <div className="font-bold text-slate-900 font-mono">
                          {s.servicesCount} items
                        </div>
                        {s.servicesList.length > 0 && (
                          <div
                            className="text-slate-500 max-w-[200px] truncate"
                            title={s.servicesList.map((item) => `${item.name} (${item.count})`).join(', ')}
                          >
                            {s.servicesList.slice(0, 3).map((item) => item.name).join(', ')}
                            {s.servicesList.length > 3 ? '...' : ''}
                          </div>
                        )}
                      </td>

                      {/* REVENUE */}
                      <td className="py-3 px-3 text-right font-black text-slate-900 font-mono">
                        ₹{s.revenue.toLocaleString()}
                      </td>

                      {/* ACTION: VIEW OUTLET */}
                      <td className="py-3 px-3 text-center">
                        {s.shopObj ? (
                          <button
                            onClick={() => {
                              setSelectedPopupDate(null);
                              handleSelectShop(s.shopObj!);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#D4621A] hover:bg-[#bf5312] text-white text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            <span>View Outlet</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end">
              <button
                onClick={() => setSelectedPopupDate(null)}
                className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
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
