'use client';

import React, { useState, useMemo } from 'react';
import { Shop, Subscription, Bill } from '../../types/database';
import { formatINR, formatDate } from '../../lib/adminData';
import {
  CreditCard,
  Download,
  Printer,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  Award,
  Store,
  Copy,
  ExternalLink,
} from 'lucide-react';

interface PaymentsViewProps {
  shops: Shop[];
  subscriptions: Subscription[];
  bills?: Bill[];
  payments?: any[];
  period?: string;
  searchQuery?: string;
  onOpenShopDrawer: (shop: Shop) => void;
  onShowToast?: (msg: string) => void;
}

export function PaymentsView({
  shops = [],
  subscriptions = [],
  searchQuery = '',
  onOpenShopDrawer,
  onShowToast,
}: PaymentsViewProps) {
  const [filter, setFilter] = useState<'All' | 'Pro' | 'Free' | 'Active'>('All');
  const [localSearch, setLocalSearch] = useState('');

  // 1. Subscription Revenue Metrics
  const paidSubs = useMemo(
    () => subscriptions.filter((s) => s.plan?.toLowerCase() === 'pro' || Number(s.amount || 0) > 0),
    [subscriptions]
  );

  const freeSubs = useMemo(
    () => subscriptions.filter((s) => s.plan?.toLowerCase() === 'free' && Number(s.amount || 0) === 0),
    [subscriptions]
  );

  const totalSubscriptionRevenue = useMemo(
    () => subscriptions.reduce((acc, s) => acc + Number(s.amount || 0), 0),
    [subscriptions]
  );

  // MRR
  const mrr = useMemo(() => {
    return paidSubs.reduce((acc, s) => {
      const amt = Number(s.amount || 0);
      const interval = (s.interval || 'monthly').toLowerCase();
      if (interval.includes('year')) return acc + Math.round(amt / 12);
      return acc + amt;
    }, 0);
  }, [paidSubs]);

  // 2. Subscription Payment Ledger Rows
  const subscriptionRows = useMemo(() => {
    return subscriptions.map((sub) => {
      const shop = shops.find((s) => s.id === sub.shop_id) || null;
      const isPro = sub.plan?.toLowerCase() === 'pro' || Number(sub.amount || 0) > 0;
      const method = sub.payment_method || (sub.activated_by_admin_id ? 'Manual Admin Activation' : 'Cashfree / Online Gateway');
      const planLabel = isPro ? 'Pro Plan (Unlimited)' : 'Free Tier (100 Free Bills)';
      const status = (sub.status || 'active').toUpperCase();

      return {
        id: sub.id,
        ref: sub.payment_reference || sub.cashfree_order_id || sub.id,
        shop,
        shopName: shop?.name || 'Registered Shop',
        phone: shop?.phone || '-',
        city: shop?.city || '-',
        plan: planLabel,
        isPro,
        mode: method,
        amount: Number(sub.amount || 0),
        interval: sub.interval || 'lifetime',
        startDate: sub.current_period_start || sub.created_at,
        endDate: sub.current_period_end || null,
        status,
      };
    });
  }, [subscriptions, shops]);

  // Filtering
  const effectiveQuery = (searchQuery || localSearch).trim().toLowerCase();
  const filteredRows = useMemo(() => {
    return subscriptionRows.filter((r) => {
      const matchesSearch =
        !effectiveQuery ||
        r.shopName.toLowerCase().includes(effectiveQuery) ||
        r.ref.toLowerCase().includes(effectiveQuery) ||
        r.phone.includes(effectiveQuery) ||
        r.city.toLowerCase().includes(effectiveQuery) ||
        r.mode.toLowerCase().includes(effectiveQuery);

      if (!matchesSearch) return false;

      if (filter === 'Pro') return r.isPro;
      if (filter === 'Free') return !r.isPro;
      if (filter === 'Active') return r.status === 'ACTIVE';
      return true;
    });
  }, [subscriptionRows, effectiveQuery, filter]);

  const handleCopyId = (id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(id);
      onShowToast?.(`Copied ID: ${id}`);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!subscriptionRows.length) {
      onShowToast?.('No subscription transactions to export.');
      return;
    }
    const headers = [
      'Subscription ID',
      'Transaction Ref',
      'Shop Name',
      'Phone',
      'City',
      'Plan Tier',
      'Payment Method',
      'Amount (INR)',
      'Billing Interval',
      'Activation Date',
      'Status',
    ];
    const rows = subscriptionRows.map((r) => [
      `"${r.id}"`,
      `"${r.ref}"`,
      `"${r.shopName.replace(/"/g, '""')}"`,
      `"${r.phone}"`,
      `"${r.city}"`,
      `"${r.plan}"`,
      `"${r.mode}"`,
      r.amount,
      `"${r.interval}"`,
      `"${r.startDate ? formatDate(r.startDate) : '-'}"`,
      r.status,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `subscription_payments_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast?.('Exported Subscription Payment Ledger CSV');
  };

  return (
    <div className="flex flex-col gap-6 font-sans select-none animate-in fade-in duration-150">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-xl shadow-xs p-5 border border-gray-200/80 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D4621A] animate-pulse" />
            <h2 className="text-[17px] font-bold text-[#101318] m-0">
              Subscription Payment History
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-50 text-[#D4621A] border border-orange-200 font-semibold">
              SaaS Billing Ledger
            </span>
          </div>
          <p className="text-xs text-gray-500 m-0 mt-1">
            Verified company subscription payments, Pro plan upgrades via Cashfree online gateway, and manual admin activations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-gray-500" />
            <span>Print Ledger</span>
          </button>
        </div>
      </div>

      {/* 2. Top 4 Subscription Payment KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Subscription Revenue */}
        <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              TOTAL SUBSCRIPTION REVENUE
            </div>
            <div className="mt-2 text-2xl font-bold font-heading text-[#101318]">
              {formatINR(totalSubscriptionRevenue)}
            </div>
          </div>
          <div className="mt-2 text-[11px] text-[#D4621A] font-medium">
            100% Real Database Subscriptions
          </div>
        </div>

        {/* Monthly Run Rate (MRR) */}
        <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              MONTHLY RUN-RATE (MRR)
            </div>
            <div className="mt-2 text-2xl font-bold font-heading text-[#D4621A]">
              {formatINR(mrr)}
            </div>
          </div>
          <div className="mt-2 text-[11px] text-gray-500">
            ARR: {formatINR(mrr * 12)}
          </div>
        </div>

        {/* Paid Pro Subscribers */}
        <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              PAID PRO SUBSCRIBERS
            </div>
            <div className="mt-2 text-2xl font-bold font-heading text-[#D4621A]">
              {paidSubs.length} <span className="text-sm font-medium text-gray-400">/ {shops.length}</span>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-[#D4621A] font-medium">
            Active Pro plan subscriptions
          </div>
        </div>

        {/* Free Tier Shops */}
        <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              FREE TIER SHOPS
            </div>
            <div className="mt-2 text-2xl font-bold font-heading text-gray-700">
              {freeSubs.length}
            </div>
          </div>
          <div className="mt-2 text-[11px] text-amber-700 font-medium">
            Stores on 100 free sales cap
          </div>
        </div>
      </div>

      {/* 3. Subscription Payment Ledger Table */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden">
        {/* Table Filters & Search */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['All', 'Pro', 'Free', 'Active'] as const).map((chip) => (
              <button
                key={chip}
                onClick={() => setFilter(chip)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filter === chip
                    ? 'bg-[#D4621A] text-white shadow-2xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {chip === 'All' ? 'All Subscriptions' : chip === 'Pro' ? 'Pro Plans' : chip === 'Free' ? 'Free Tier' : 'Active Status'}
              </button>
            ))}
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search shop, ref, city..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-[#D4621A] focus:outline-hidden"
            />
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] font-bold tracking-wider uppercase text-gray-500 bg-gray-50/50">
                <th className="py-3.5 px-4">TRANSACTION / REF</th>
                <th className="py-3.5 px-4">SHOP</th>
                <th className="py-3.5 px-4">PLAN TIER</th>
                <th className="py-3.5 px-4">PAYMENT CHANNEL</th>
                <th className="py-3.5 px-4">AMOUNT</th>
                <th className="py-3.5 px-4">BILLING CYCLE</th>
                <th className="py-3.5 px-4">ACTIVATION DATE</th>
                <th className="py-3.5 px-4">STATUS</th>
                <th className="py-3.5 px-4 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400 text-xs">
                    No subscription payment records found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/70 transition-colors">
                    {/* Reference with copy */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div
                        onClick={() => handleCopyId(row.id)}
                        title={`Click to copy: ${row.id}`}
                        className="flex items-center gap-1.5 cursor-pointer group"
                      >
                        <span className="font-mono text-xs font-bold text-gray-900 group-hover:text-[#D4621A] transition-colors">
                          {row.id}
                        </span>
                        <Copy className="w-3 h-3 text-gray-400 group-hover:text-[#D4621A] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </td>

                    {/* Shop */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">{row.shopName}</div>
                      <div className="text-[10.5px] text-gray-400">{row.city} &bull; {row.phone}</div>
                    </td>

                    {/* Plan */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                          row.isPro
                            ? 'bg-orange-100 text-[#D4621A] border border-orange-200'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {row.plan}
                      </span>
                    </td>

                    {/* Payment Mode */}
                    <td className="py-3.5 px-4 text-gray-700 whitespace-nowrap font-medium">
                      {row.mode}
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-gray-900">
                      {formatINR(row.amount)}
                    </td>

                    {/* Interval */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-gray-600 capitalize">
                      {row.interval}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-gray-600 font-mono text-[11px]">
                      {row.startDate ? formatDate(row.startDate) : '-'}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          row.status === 'ACTIVE'
                            ? 'bg-[#F8F3F0] text-[#D4621A] border border-[#D4621A]/25'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-center">
                      {row.shop && (
                        <button
                          onClick={() => onOpenShopDrawer(row.shop!)}
                          title="View Shop Details"
                          className="px-2.5 py-1 rounded-md border border-gray-200 hover:border-[#D4621A] hover:text-[#D4621A] text-gray-600 text-xs font-semibold transition-colors bg-white cursor-pointer shadow-2xs"
                        >
                          View Shop
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
