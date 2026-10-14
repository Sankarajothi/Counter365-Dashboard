'use client';

import React, { useState, useMemo } from 'react';
import { Shop, Bill, Payment, Customer } from '../../types/database';
import { formatINR, formatDate } from '../../lib/adminData';
import {
  RotateCw,
  Download,
  Search,
  ChevronDown,
  ChevronUp,
  Store,
  Calendar,
} from 'lucide-react';

interface DailyBillsViewProps {
  bills: Bill[];
  shops: Shop[];
  payments?: Payment[];
  customers?: Customer[];
  onOpenShopDrawer?: (shop: Shop) => void;
  onRefresh?: () => void;
  onShowToast?: (msg: string) => void;
}

interface DayBreakdownItem {
  dateStr: string;
  formattedDate: string;
  total: number;
  pending: number;
  completed: number;
  delivered: number;
  contacts: number;
  revenue: number;
  shopBreakdown: {
    shopId: string;
    shopName: string;
    city: string;
    total: number;
    pending: number;
    completed: number;
    delivered: number;
    revenue: number;
  }[];
}

export function DailyBillsView({
  bills = [],
  shops = [],
  customers = [],
  onOpenShopDrawer,
  onRefresh,
  onShowToast,
}: DailyBillsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  // Bucket classification: exactly one bucket per bill
  // 1. Pending: pending_amount > 0 or status === 'draft' or 'cancelled'
  // 2. Completed: status === 'completed' or 'edited' created within 24h
  // 3. Delivered: status === 'completed' or 'edited' finalized / older than 24h
  const classifyBill = (b: Bill): 'pending' | 'completed' | 'delivered' => {
    const isPending =
      Number(b.pending_amount || 0) > 0 ||
      b.status === 'draft' ||
      b.status === 'cancelled' ||
      (b.payment_mode || '').toLowerCase().includes('pending');
    if (isPending) return 'pending';

    const billDate = new Date(b.created_at || b.completed_at || 0).getTime();
    const isWithin24h = Date.now() - billDate < 24 * 60 * 60 * 1000;
    if (isWithin24h) return 'completed';

    return 'delivered';
  };

  // Group bills and customers by day
  const dailyBreakdown = useMemo(() => {
    const map: Record<string, DayBreakdownItem> = {};

    // Collect all unique date strings from bills and recent dates
    const dateSet = new Set<string>();
    bills.forEach((b) => {
      const d = (b.created_at || b.completed_at || '').split('T')[0];
      if (d) dateSet.add(d);
    });

    // Also include dates for current month up to today
    const now = new Date();
    for (let i = 0; i < 15; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      dateSet.add(d.toISOString().split('T')[0]);
    }

    const sortedDates = Array.from(dateSet).sort((a, b) => b.localeCompare(a));

    sortedDates.forEach((dateStr) => {
      const dObj = new Date(`${dateStr}T12:00:00Z`);
      const formattedDate = dObj.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      const dayBills = bills.filter((b) => {
        const bd = (b.created_at || b.completed_at || '').split('T')[0];
        return bd === dateStr;
      });

      let pending = 0;
      let completed = 0;
      let delivered = 0;
      let revenue = 0;

      const shopMap: Record<
        string,
        {
          shopId: string;
          shopName: string;
          city: string;
          total: number;
          pending: number;
          completed: number;
          delivered: number;
          revenue: number;
        }
      > = {};

      dayBills.forEach((b) => {
        const bucket = classifyBill(b);
        const amt = Number(b.total_amount || 0);

        if (bucket === 'pending') pending++;
        else if (bucket === 'completed') completed++;
        else delivered++;

        if (b.status === 'completed' || b.status === 'edited') {
          revenue += amt;
        }

        const sId = b.shop_id || 'unknown';
        if (!shopMap[sId]) {
          const shop = shops.find((s) => s.id === sId);
          shopMap[sId] = {
            shopId: sId,
            shopName: shop?.name || 'CounterPro Store',
            city: shop?.city || 'Tamil Nadu',
            total: 0,
            pending: 0,
            completed: 0,
            delivered: 0,
            revenue: 0,
          };
        }

        shopMap[sId].total++;
        if (bucket === 'pending') shopMap[sId].pending++;
        else if (bucket === 'completed') shopMap[sId].completed++;
        else shopMap[sId].delivered++;

        if (b.status === 'completed' || b.status === 'edited') {
          shopMap[sId].revenue += amt;
        }
      });

      const dayCustomers = customers.filter((c) => {
        const cd = (c.created_at || '').split('T')[0];
        return cd === dateStr;
      });

      map[dateStr] = {
        dateStr,
        formattedDate,
        total: dayBills.length,
        pending,
        completed,
        delivered,
        contacts: dayCustomers.length,
        revenue,
        shopBreakdown: Object.values(shopMap),
      };
    });

    return Object.values(map).sort((a, b) => b.dateStr.localeCompare(a.dateStr));
  }, [bills, shops, customers]);

  // Month filter tabs
  const monthOptions = useMemo(() => {
    return [
      { id: 'all', label: 'All dates' },
      { id: '2026-10', label: 'October 2026' },
      { id: '2026-09', label: 'September 2026' },
      { id: '2026-08', label: 'August 2026' },
      { id: '2026-07', label: 'July 2026' },
      { id: '2026-06', label: 'June 2026' },
    ];
  }, []);

  // Filtered rows by month and search
  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return dailyBreakdown.filter((row) => {
      if (selectedMonth !== 'all' && !row.dateStr.startsWith(selectedMonth)) {
        return false;
      }
      if (!q) return true;
      const matchesDate =
        row.formattedDate.toLowerCase().includes(q) || row.dateStr.includes(q);
      const matchesShop = row.shopBreakdown.some(
        (s) =>
          s.shopName.toLowerCase().includes(q) ||
          s.city.toLowerCase().includes(q)
      );
      return matchesDate || matchesShop;
    });
  }, [dailyBreakdown, selectedMonth, searchQuery]);

  // Overall totals across filtered range
  const {
    totalOrders,
    pendingTotal,
    completedTotal,
    deliveredTotal,
    contactsTotal,
    revenueTotal,
  } = useMemo(() => {
    let t = 0;
    let p = 0;
    let c = 0;
    let d = 0;
    let ct = 0;
    let r = 0;

    filteredRows.forEach((row) => {
      t += row.total;
      p += row.pending;
      c += row.completed;
      d += row.delivered;
      ct += row.contacts;
      r += row.revenue;
    });

    return {
      totalOrders: t,
      pendingTotal: p,
      completedTotal: c,
      deliveredTotal: d,
      contactsTotal: ct,
      revenueTotal: r,
    };
  }, [filteredRows]);

  const toggleExpand = (dateStr: string) => {
    setExpandedDates((prev) => ({
      ...prev,
      [dateStr]: !prev[dateStr],
    }));
  };

  const handleExportExcel = () => {
    const headers = [
      'DATE',
      'TOTAL ORDERS',
      'PENDING',
      'COMPLETED',
      'DELIVERED',
      'CONTACTS ADDED',
      'REVENUE (INR)',
    ];
    const rows = filteredRows.map((r) => [
      `"${r.formattedDate}"`,
      r.total,
      r.pending,
      r.completed,
      r.delivered,
      r.contacts,
      r.revenue,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `daily-order-metrics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast?.(`Exported ${filteredRows.length} daily order metrics to Excel`);
  };

  const handleExportCSV = () => {
    handleExportExcel();
  };

  return (
    <div className="space-y-6 font-sans select-none animate-in fade-in duration-150">
      {/* 1. Header with Title & Action Buttons (Matching IronDrobe Operations Console) */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#101318] m-0">
            Daily Order Metrics
          </h1>
          <p className="text-xs text-gray-500 m-0 mt-1 max-w-2xl leading-relaxed">
            Current order status only. Pending &rarr; Completed &rarr; Delivered. Each order counts in exactly one bucket.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-3.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5 text-gray-500" />
              <span>Refresh</span>
            </button>
          )}
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-1.5 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-semibold transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Timestamp and Balanced Badge */}
      <div className="flex items-center justify-between text-xs flex-wrap gap-2 pt-1">
        <div className="text-gray-400 font-mono text-[11px]">
          Updated 14 Oct, 06:18 pm
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Balanced &bull; {pendingTotal.toLocaleString()} + {completedTotal.toLocaleString()} + {deliveredTotal.toLocaleString()} = {totalOrders.toLocaleString()}
        </div>
      </div>

      {/* 2. 6 KPI Cards Grid (Matching IronDrobe 6-Card Layout) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: TOTAL ORDERS */}
        <div className="bg-white rounded-xl p-4 border border-gray-200/80 border-t-4 border-t-amber-500 shadow-2xs">
          <div className="text-[10px] font-bold tracking-wider uppercase text-gray-500 font-mono">
            TOTAL ORDERS
          </div>
          <div className="mt-1.5 text-2xl font-extrabold tracking-tight text-[#101318]">
            {totalOrders.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-gray-400">
            created in selected range
          </div>
        </div>

        {/* Card 2: PENDING */}
        <div className="bg-white rounded-xl p-4 border border-gray-200/80 border-t-4 border-t-amber-500 shadow-2xs">
          <div className="text-[10px] font-bold tracking-wider uppercase text-gray-500 font-mono">
            PENDING
          </div>
          <div className="mt-1.5 text-2xl font-extrabold tracking-tight text-[#101318]">
            {pendingTotal.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-gray-400">
            {totalOrders > 0 ? Math.round((pendingTotal / totalOrders) * 100) : 0}% of total &bull; not yet completed
          </div>
        </div>

        {/* Card 3: COMPLETED */}
        <div className="bg-white rounded-xl p-4 border border-gray-200/80 border-t-4 border-t-blue-500 shadow-2xs">
          <div className="text-[10px] font-bold tracking-wider uppercase text-gray-500 font-mono">
            COMPLETED
          </div>
          <div className="mt-1.5 text-2xl font-extrabold tracking-tight text-[#101318]">
            {completedTotal.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-gray-400">
            {totalOrders > 0 ? Math.round((completedTotal / totalOrders) * 100) : 0}% of total &bull; not delivered
          </div>
        </div>

        {/* Card 4: DELIVERED */}
        <div className="bg-white rounded-xl p-4 border border-gray-200/80 border-t-4 border-t-emerald-500 shadow-2xs">
          <div className="text-[10px] font-bold tracking-wider uppercase text-gray-500 font-mono">
            DELIVERED
          </div>
          <div className="mt-1.5 text-2xl font-extrabold tracking-tight text-[#101318]">
            {deliveredTotal.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-gray-400">
            {totalOrders > 0 ? Math.round((deliveredTotal / totalOrders) * 100) : 0}% of total &bull; final status
          </div>
        </div>

        {/* Card 5: CONTACTS ADDED */}
        <div className="bg-white rounded-xl p-4 border border-gray-200/80 border-t-4 border-t-purple-500 shadow-2xs">
          <div className="text-[10px] font-bold tracking-wider uppercase text-gray-500 font-mono">
            CONTACTS ADDED
          </div>
          <div className="mt-1.5 text-2xl font-extrabold tracking-tight text-[#101318]">
            {contactsTotal.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-gray-400">
            new contacts in range
          </div>
        </div>

        {/* Card 6: REVENUE EARNED */}
        <div className="bg-white rounded-xl p-4 border border-gray-200/80 border-t-4 border-t-emerald-500 shadow-2xs">
          <div className="text-[10px] font-bold tracking-wider uppercase text-gray-500 font-mono">
            REVENUE EARNED
          </div>
          <div className="mt-1.5 text-2xl font-extrabold tracking-tight text-[#101318]">
            {formatINR(revenueTotal)}
          </div>
          <div className="mt-1 text-[11px] text-gray-400">
            from currently delivered orders
          </div>
        </div>
      </div>

      {/* 3. Workflow Pipeline Strip (Matching IronDrobe Process Steps) */}
      <div className="bg-[#FAF5F5]/60 rounded-xl p-3 border border-gray-100 flex items-center gap-6 sm:gap-8 flex-wrap text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="font-bold text-gray-900">Pending</span>
          <span className="text-gray-500 ml-1">Created, waiting to complete</span>
        </div>
        <span className="text-gray-300 font-bold">&rarr;</span>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span className="font-bold text-gray-900">Completed</span>
          <span className="text-gray-500 ml-1">Done work, not delivered yet</span>
        </div>
        <span className="text-gray-300 font-bold">&rarr;</span>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="font-bold text-gray-900">Delivered</span>
          <span className="text-gray-500 ml-1">Leaves completed permanently</span>
        </div>
      </div>

      {/* 4. Daily Breakdown Container */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs overflow-hidden">
        {/* Header Controls */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 m-0">
              Daily breakdown
            </h2>
            <p className="text-xs text-gray-400 m-0 mt-0.5">
              {filteredRows.length} days
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <input
                type="text"
                placeholder="Search shop, phone, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs py-1.5 px-3 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:border-[#FD5E03] focus:outline-hidden"
              />
            </div>

            {/* Month Filter Tabs */}
            <div className="inline-flex p-0.5 bg-gray-100 rounded-lg border border-gray-200/60 overflow-x-auto max-w-full">
              {monthOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedMonth(opt.id)}
                  className={`px-3 py-1 rounded-md text-xs whitespace-nowrap transition-all cursor-pointer ${
                    selectedMonth === opt.id
                      ? 'bg-black text-white font-bold shadow-2xs'
                      : 'text-gray-600 hover:text-black font-medium'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-2xs cursor-pointer"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] font-bold tracking-wider uppercase text-gray-500 bg-white">
                <th className="py-3.5 px-4">DATE</th>
                <th className="py-3.5 px-4 text-center">TOTAL</th>
                <th className="py-3.5 px-4 text-center">PENDING</th>
                <th className="py-3.5 px-4 text-center">COMPLETED</th>
                <th className="py-3.5 px-4 text-center">DELIVERED</th>
                <th className="py-3.5 px-4 text-center">CONTACTS</th>
                <th className="py-3.5 px-4 text-right">REVENUE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400 text-xs">
                    No orders recorded in selected period.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const isExpanded = Boolean(expandedDates[row.dateStr]);
                  return (
                    <React.Fragment key={row.dateStr}>
                      <tr className="hover:bg-gray-50/70 transition-colors">
                        {/* DATE */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-gray-900">
                            {row.formattedDate}
                          </div>
                          {row.shopBreakdown.length > 0 && (
                            <button
                              onClick={() => toggleExpand(row.dateStr)}
                              className="text-[11px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer mt-0.5 inline-flex items-center gap-1"
                            >
                              <span>View shop breakdown</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </td>

                        {/* TOTAL */}
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-gray-900">
                          {row.total}
                        </td>

                        {/* PENDING */}
                        <td className="py-3.5 px-4 text-center font-mono font-semibold text-amber-600">
                          {row.pending}
                        </td>

                        {/* COMPLETED */}
                        <td className="py-3.5 px-4 text-center font-mono font-semibold text-blue-600">
                          {row.completed}
                        </td>

                        {/* DELIVERED */}
                        <td className="py-3.5 px-4 text-center font-mono font-semibold text-emerald-600">
                          {row.delivered}
                        </td>

                        {/* CONTACTS */}
                        <td className="py-3.5 px-4 text-center font-mono font-semibold text-purple-600">
                          {row.contacts}
                        </td>

                        {/* REVENUE */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-gray-900">
                          {row.revenue > 0 ? row.revenue.toLocaleString('en-IN') : '0'}
                        </td>
                      </tr>

                      {/* Expanded Shop Breakdown Sub-table */}
                      {isExpanded && row.shopBreakdown.length > 0 && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={7} className="p-4 pl-8">
                            <div className="bg-white rounded-lg border border-gray-200/80 p-3 shadow-2xs">
                              <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2 font-mono flex items-center gap-2">
                                <Store className="w-3.5 h-3.5 text-[#FD5E03]" />
                                <span>Shop Breakdown &bull; {row.formattedDate}</span>
                              </div>
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="border-b border-gray-100 text-[10px] text-gray-400 font-mono uppercase">
                                    <th className="py-2 px-3">SHOP</th>
                                    <th className="py-2 px-3">CITY</th>
                                    <th className="py-2 px-3 text-center">TOTAL</th>
                                    <th className="py-2 px-3 text-center">PENDING</th>
                                    <th className="py-2 px-3 text-center">COMPLETED</th>
                                    <th className="py-2 px-3 text-center">DELIVERED</th>
                                    <th className="py-2 px-3 text-right">REVENUE</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {row.shopBreakdown.map((s) => (
                                    <tr key={s.shopId} className="hover:bg-gray-50/50">
                                      <td className="py-2 px-3 font-semibold text-gray-900">
                                        {s.shopName}
                                      </td>
                                      <td className="py-2 px-3 text-gray-600">
                                        {s.city}
                                      </td>
                                      <td className="py-2 px-3 text-center font-mono font-bold">
                                        {s.total}
                                      </td>
                                      <td className="py-2 px-3 text-center font-mono text-amber-600">
                                        {s.pending}
                                      </td>
                                      <td className="py-2 px-3 text-center font-mono text-blue-600">
                                        {s.completed}
                                      </td>
                                      <td className="py-2 px-3 text-center font-mono text-emerald-600">
                                        {s.delivered}
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">
                                        {formatINR(s.revenue)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
