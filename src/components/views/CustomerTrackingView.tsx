'use client';

import React, { useState, useMemo } from 'react';
import { Customer, Bill, Shop } from '../../types/database';
import { formatINR, formatDate, timeAgo } from '../../lib/adminData';
import {
  UserCheck,
  Search,
  Users,
  Phone,
  Calendar,
  ShoppingBag,
  Download,
  Star,
  Sparkles,
  ExternalLink,
  Store,
  DollarSign,
  TrendingUp,
} from 'lucide-react';

interface CustomerTrackingViewProps {
  customers: Customer[];
  bills: Bill[];
  shops: Shop[];
  title?: string;
  subtitle?: string;
  onShowToast?: (msg: string) => void;
}

export function CustomerTrackingView({
  customers,
  bills,
  shops,
  title = 'Customer Tracking & CRM',
  subtitle = 'Verified customer database from Counter Pro POS billing',
  onShowToast,
}: CustomerTrackingViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShop, setSelectedShop] = useState('all');
  const [filterType, setFilterType] = useState<'all' | 'repeat' | 'single'>('all');

  // Consolidate customers from `customers` table and `bills` table
  const allCustomers = useMemo(() => {
    const map: Record<
      string,
      {
        id: string;
        name: string;
        phone: string;
        visitCount: number;
        totalSpent: number;
        lastVisit: string;
        shopId: string;
        shopName: string;
      }
    > = {};

    customers.forEach((c) => {
      const key = c.phone || c.id;
      const shop = shops.find((s) => s.id === c.shop_id);
      map[key] = {
        id: c.id,
        name: c.name || 'Shopper',
        phone: c.phone || '',
        visitCount: 0,
        totalSpent: 0,
        lastVisit: c.created_at || new Date().toISOString(),
        shopId: c.shop_id || '',
        shopName: shop?.name || 'General Outlet',
      };
    });

    bills.forEach((b) => {
      if (b.customer_phone || (b.customer_name && b.customer_name.toLowerCase() !== 'walk-in')) {
        const key = b.customer_phone || b.customer_name || b.id;
        const shop = shops.find((s) => s.id === b.shop_id);
        if (!map[key]) {
          map[key] = {
            id: b.id,
            name: b.customer_name || 'Counter Shopper',
            phone: b.customer_phone || '',
            visitCount: 0,
            totalSpent: 0,
            lastVisit: b.created_at || new Date().toISOString(),
            shopId: b.shop_id || '',
            shopName: shop?.name || 'General Outlet',
          };
        }
        map[key].visitCount += 1;
        map[key].totalSpent += Number(b.total_amount || 0);
        if (new Date(b.created_at || '').getTime() > new Date(map[key].lastVisit || '').getTime()) {
          map[key].lastVisit = b.created_at;
        }
      }
    });

    return Object.values(map);
  }, [customers, bills, shops]);

  // Aggregate Metrics
  const totalCustomersCount = allCustomers.length;
  const repeatCustomers = allCustomers.filter((c) => c.visitCount > 1);
  const totalCustomerSpend = allCustomers.reduce((acc, c) => acc + c.totalSpent, 0);
  const avgCustomerSpend =
    totalCustomersCount > 0 ? Math.round(totalCustomerSpend / totalCustomersCount) : 0;
  const topSpender = [...allCustomers].sort((a, b) => b.totalSpent - a.totalSpent)[0];

  // Filtered
  const filteredCustomers = useMemo(() => {
    return allCustomers.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.shopName.toLowerCase().includes(q);

      const matchesShop = selectedShop === 'all' || c.shopId === selectedShop;

      let matchesType = true;
      if (filterType === 'repeat') matchesType = c.visitCount > 1;
      else if (filterType === 'single') matchesType = c.visitCount <= 1;

      return matchesSearch && matchesShop && matchesType;
    });
  }, [allCustomers, searchQuery, selectedShop, filterType]);

  const handleExportCSV = () => {
    if (filteredCustomers.length === 0) {
      onShowToast?.('No customer records to export.');
      return;
    }

    const headers = [
      'CUSTOMER NAME',
      'PHONE NUMBER',
      'OUTLET',
      'TOTAL VISITS',
      'LIFETIME SPEND (INR)',
      'LAST VISIT DATE',
    ];

    const rows = filteredCustomers.map((c) => [
      `"${c.name}"`,
      `"${c.phone}"`,
      `"${c.shopName}"`,
      c.visitCount,
      c.totalSpent,
      `"${formatDate(c.lastVisit)}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customers-ledger-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onShowToast?.(`Exported ${filteredCustomers.length} customers to CSV`);
  };

  return (
    <div className="space-y-6 font-sans select-none animate-in fade-in duration-150">
      {/* 1. Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#11141a] via-[#1c1f28] to-[#11141a] border border-[#2b303c] p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-[#0D9488]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0D9488] animate-pulse" />
              <span className="text-xs font-mono font-bold tracking-wider text-[#0D9488] uppercase">
                Shopper Lineage & Retention Center
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white m-0">
              {title}
            </h2>
            <p className="text-xs text-gray-400 max-w-2xl leading-relaxed m-0">
              {subtitle}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0f766e] text-white text-xs font-bold transition-all shadow-md shadow-[#0D9488]/30 flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Shopper Ledger</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Metric KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:border-[#0D9488]/50 transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Total Shoppers</span>
            <div className="p-2 rounded-xl bg-teal-50 text-[#0D9488]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-[#111827]">
            {totalCustomersCount.toLocaleString()}
          </div>
          <div className="mt-2 text-[11.5px] text-gray-500 flex items-center justify-between">
            <span>Across all POS registers</span>
            <span className="text-emerald-600 font-bold">100% Real</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:border-emerald-400/50 transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Repeat Visitors</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-[#111827]">
            {repeatCustomers.length}
          </div>
          <div className="mt-2 text-[11.5px] text-gray-500 flex items-center justify-between">
            <span>
              {totalCustomersCount > 0
                ? `${Math.round((repeatCustomers.length / totalCustomersCount) * 100)}% retention rate`
                : '0%'}
            </span>
            <span className="text-emerald-700 font-semibold">Loyalty</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:border-blue-400/50 transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Average Lifetime Spend</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-[#111827]">
            {formatINR(avgCustomerSpend)}
          </div>
          <div className="mt-2 text-[11.5px] text-gray-500 flex items-center justify-between">
            <span>Total: {formatINR(totalCustomerSpend)}</span>
            <span className="text-blue-600 font-semibold">Per Shopper</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:border-purple-400/50 transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Top Spender</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Star className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-[#111827] truncate">
            {topSpender ? formatINR(topSpender.totalSpent) : '₹0'}
          </div>
          <div className="mt-2 text-[11.5px] text-gray-500 flex items-center justify-between">
            <span className="truncate">{topSpender?.name || 'Walk-in'}</span>
            <span className="text-purple-600 font-bold font-mono">VIP</span>
          </div>
        </div>
      </div>

      {/* 3. Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search customer name, phone number, or outlet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-[#0D9488] focus:outline-hidden transition-all text-gray-900"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedShop}
            onChange={(e) => setSelectedShop(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 focus:outline-hidden focus:border-[#0D9488]"
          >
            <option value="all">All Outlets ({shops.length})</option>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={(e: any) => setFilterType(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 focus:outline-hidden focus:border-[#0D9488]"
          >
            <option value="all">All Shoppers</option>
            <option value="repeat">Repeat Visitors (Loyal)</option>
            <option value="single">First-time / Walk-in</option>
          </select>

          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedShop('all');
              setFilterType('all');
            }}
            className="text-xs px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>

      {/* 4. Customer Directory Ledger Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-[#FAFAFB] border-b border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <div>
            Showing <strong className="text-gray-900">{filteredCustomers.length}</strong> of {allCustomers.length} customer profiles
          </div>
          <div className="font-mono text-gray-400">
            WhatsApp messaging & loyalty spend
          </div>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="py-20 text-center text-gray-400 text-xs">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <div className="font-semibold text-gray-700 text-sm">No customer records found.</div>
            <div className="text-[11px] text-gray-400 mt-1 max-w-sm mx-auto">
              {allCustomers.length === 0
                ? 'Customers entered during checkout on Counter Pro will be listed here.'
                : 'Try adjusting your search query or filter selection.'}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-[#FAFAFB] text-gray-500 uppercase text-[10.5px] font-bold tracking-wider">
                  <th className="py-3 px-4">Shopper</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Associated Outlet</th>
                  <th className="py-3 px-4 text-center">Visit Count</th>
                  <th className="py-3 px-4 text-center">Loyalty Tier</th>
                  <th className="py-3 px-4 text-right">Lifetime Spend</th>
                  <th className="py-3 px-4 text-right">Last Visit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCustomers.map((cust) => {
                  const isVip = cust.totalSpent >= 2000;
                  const isRepeat = cust.visitCount > 1;

                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name */}
                      <td className="py-3.5 px-4 font-semibold text-gray-900 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#0D9488]/10 text-[#0D9488] font-bold flex items-center justify-center text-xs">
                          {(cust.name[0] || 'C').toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900">{cust.name}</div>
                          <div className="text-[10.5px] text-gray-400 font-mono">ID: {cust.id.slice(0, 8)}</div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {cust.phone ? (
                          <a
                            href={`https://wa.me/91${cust.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-gray-700 hover:text-emerald-600 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5 text-emerald-500 fill-current shrink-0" viewBox="0 0 24 24">
                              <path d="M12.031 2C6.495 2 2 6.495 2 12.031c0 1.97.57 3.81 1.558 5.367L2 22l4.757-1.52A9.97 9.97 0 0012.031 22C17.568 22 22 17.505 22 12.031 22 6.495 17.568 2 12.031 2zm5.727 14.18c-.237.669-1.378 1.282-1.895 1.341-.518.06-1.127.085-3.57-1.026-3.08-1.396-5.06-4.52-5.215-4.726-.154-.206-1.252-1.666-1.252-3.178 0-1.512.793-2.257 1.074-2.564.282-.307.616-.384.821-.384.205 0 .41.002.59.01.19.01.442-.072.691.527.256.616.87 2.128.948 2.282.077.154.129.333.026.538-.103.205-.154.333-.308.513-.154.18-.323.4-.462.538-.154.154-.314.323-.135.63.18.307.798 1.318 1.71 2.13 1.173 1.045 2.162 1.369 2.47 1.523.308.154.488.128.667-.077.18-.205.77-1.001.975-1.344.205-.343.41-.286.692-.18.282.103 1.795.846 2.103 1.001.307.154.513.23.59.359.077.128.077.744-.16 1.413z" />
                            </svg>
                            <span className="font-mono">{cust.phone}</span>
                          </a>
                        ) : (
                          <span className="text-gray-400 font-mono">-</span>
                        )}
                      </td>

                      {/* Associated Outlet */}
                      <td className="py-3.5 px-4 font-medium text-gray-800 whitespace-nowrap">
                        {cust.shopName}
                      </td>

                      {/* Visit Count */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-gray-800 text-[11px]">
                          {cust.visitCount} visits
                        </span>
                      </td>

                      {/* Loyalty Tier */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isVip ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            👑 VIP Shopper
                          </span>
                        ) : isRepeat ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            🔁 Repeat Visitor
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                            Walk-in
                          </span>
                        )}
                      </td>

                      {/* Lifetime Spend */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                        {formatINR(cust.totalSpent)}
                      </td>

                      {/* Last Visit */}
                      <td className="py-3.5 px-4 text-right text-gray-500 font-mono text-[11px] whitespace-nowrap">
                        {timeAgo(cust.lastVisit)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
