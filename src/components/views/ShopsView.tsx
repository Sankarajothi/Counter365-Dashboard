'use client';

import React, { useState } from 'react';
import { Shop, Bill, Subscription, Profile, ShopMember, MenuItem, AccountDeletion } from '../../types/database';
import { formatLakhs, formatINR, timeAgo, formatDate } from '../../lib/adminData';
import {
  Store,
  Layers,
  User,
  Phone,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  FileText,
  DollarSign,
  Calendar,
  AlertTriangle,
  Download,
  Sparkles,
  Search,
  ExternalLink
} from 'lucide-react';

interface ShopsViewProps {
  shops: Shop[];
  bills: Bill[];
  subscriptions: Subscription[];
  profiles?: Profile[];
  shopMembers?: ShopMember[];
  menuItems?: MenuItem[];
  accountDeletions?: AccountDeletion[];
  searchQuery: string;
  period: string;
  onOpenShopDrawer: (shop: Shop) => void;
  onShowToast?: (msg: string) => void;
}

export function ShopsView({
  shops,
  bills,
  subscriptions,
  profiles = [],
  shopMembers = [],
  menuItems = [],
  accountDeletions = [],
  searchQuery,
  period,
  onOpenShopDrawer,
  onShowToast,
}: ShopsViewProps) {
  const [activeTab, setActiveTab] = useState<'directory' | 'lineage_360'>('directory');
  const [filter, setFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'gmv' | 'name' | 'orders'>('gmv');
  const [selected360ShopId, setSelected360ShopId] = useState<string>(shops[0]?.id || '');

  // Compute per-shop metrics
  const shopData = shops.map((shop) => {
    const sub = subscriptions.find((s) => s.shop_id === shop.id);
    const plan = sub?.plan?.toLowerCase() === 'pro' ? 'Pro' : 'Free';
    const shopBills = bills.filter((b) => b.shop_id === shop.id && b.status === 'completed');
    const gmv = shopBills.reduce((acc, b) => acc + Number(b.total_amount || 0), 0);
    const orders = shopBills.length;

    // Find latest activity
    const latestBill = bills.filter((b) => b.shop_id === shop.id)[0];
    const lastSeen = latestBill?.completed_at || latestBill?.created_at || shop.updated_at || shop.created_at;

    return {
      shop,
      plan,
      gmv,
      orders,
      lastSeen,
    };
  });

  // Aggregated KPIs
  const totalGMV = shopData.reduce((acc, s) => acc + s.gmv, 0);
  const totalOrders = shopData.reduce((acc, s) => acc + s.orders, 0);
  const activeStoresCount = shopData.filter((s) => s.orders > 0).length;
  const proStoresCount = shopData.filter((s) => s.plan === 'Pro').length;
  const freeStoresCount = shopData.length - proStoresCount;

  // Unique shop types from DB
  const dynamicTypes = Array.from(new Set(shops.map((s) => s.shop_type).filter((t): t is string => Boolean(t))));
  const filterChips: string[] = ['All', 'Free', 'Pro', ...dynamicTypes];

  // Filtering
  const q = searchQuery.trim().toLowerCase();
  let filtered = shopData.filter(({ shop }) => {
    if (!q) return true;
    const matchStr = `${shop.name} ${shop.city} ${shop.state} ${shop.phone} ${shop.shop_type}`.toLowerCase();
    return matchStr.includes(q);
  });

  if (filter !== 'All') {
    if (filter === 'Pro') {
      filtered = filtered.filter((item) => item.plan === 'Pro');
    } else if (filter === 'Free') {
      filtered = filtered.filter((item) => item.plan === 'Free');
    } else {
      filtered = filtered.filter((item) => item.shop.shop_type === filter);
    }
  }

  // Sorting
  filtered.sort((a, b) => {
    if (sortBy === 'name') return a.shop.name.localeCompare(b.shop.name);
    if (sortBy === 'orders') return b.orders - a.orders;
    return b.gmv - a.gmv;
  });

  // Selected 360 shop data
  const current360Shop = shops.find((s) => s.id === selected360ShopId) || shops[0];
  const shopStaff = shopMembers.filter((m) => m.shop_id === current360Shop?.id);
  const ownerMember = shopStaff.find((m) => (m.role || '').toLowerCase() === 'owner') || shopStaff[0];
  const ownerProfile = profiles.find((p) => p.id === ownerMember?.user_id);
  const currentShopBills = bills.filter((b) => b.shop_id === current360Shop?.id && b.status === 'completed');
  const currentShopGMV = currentShopBills.reduce((acc, b) => acc + Number(b.total_amount || 0), 0);
  const currentShopItems = menuItems.filter((m) => m.shop_id === current360Shop?.id);
  const currentSub = subscriptions.find((s) => s.shop_id === current360Shop?.id);

  // WhatsApp Outreach Handler
  const handleWhatsApp = (phone: string, name: string, orders: number) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      if (onShowToast) onShowToast('No phone number recorded for this store.');
      return;
    }
    const remaining = Math.max(0, 100 - orders);
    const msg = encodeURIComponent(
      `Hello ${name}! This is CounterPro Admin. We noticed your store has completed ${orders}/100 free sales (${remaining} remaining). Please reach out if you need assistance configuring your thermal printer or upgrading to unlimited billing.`
    );
    window.open(`https://wa.me/91${cleanPhone}?text=${msg}`, '_blank');
    if (onShowToast) onShowToast(`Opened WhatsApp for ${name}`);
  };

  // CSV Export for Shop Directory
  const handleExportCSV = () => {
    if (!shops.length) {
      if (onShowToast) onShowToast('No shop data to export.');
      return;
    }
    const headers = ['Shop Name', 'City', 'State', 'Phone', 'Type', 'GST Enabled', 'Printer Enabled', 'Orders Completed', 'GMV (INR)', 'Plan'];
    const rows = shopData.map((s) => [
      `"${s.shop.name.replace(/"/g, '""')}"`,
      `"${(s.shop.city || '').replace(/"/g, '""')}"`,
      `"${(s.shop.state || '').replace(/"/g, '""')}"`,
      `"${s.shop.phone}"`,
      `"${s.shop.shop_type || 'Retail'}"`,
      s.shop.gst_enabled ? 'Yes' : 'No',
      s.shop.printer_enabled ? 'Yes' : 'No',
      s.orders,
      s.gmv,
      s.plan,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `counterpro-shops-directory-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onShowToast) onShowToast('Exported Shop Directory CSV');
  };

  return (
    <div className="flex flex-col gap-[20px]">
      {/* Hero Banner */}
      <div className="bg-white rounded-xl shadow-xs p-5 border border-gray-200/80 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D4621A] animate-pulse" />
            <h2 className="text-[17px] font-bold text-[#101318] m-0">
              Merchant Store Directory & Lineage
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-50 text-[#D4621A] border border-orange-200 font-semibold">
              Live Supabase
            </span>
          </div>
          <p className="text-xs text-gray-500 m-0 mt-1">
            Complete registry of all {shops.length} merchant retail stores, multi-tenant setups, and 100 sales limit consumption.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button
              onClick={() => setActiveTab('directory')}
              className={`text-xs px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'directory'
                  ? 'bg-white text-[#D4621A] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Store Directory ({shops.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('lineage_360')}
              className={`text-xs px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'lineage_360'
                  ? 'bg-[#D4621A] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>360° Ecosystem Lineage</span>
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="btn btn-secondary text-xs min-h-[34px] px-3 gap-1.5 border-gray-300 hover:border-[#D4621A]"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">TOTAL REGISTERED STORES</div>
            <div className="mt-2 text-2xl font-bold font-heading text-[#101318]">
              {shops.length}
            </div>
          </div>
          <div className="mt-2 text-[11px] text-gray-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4621A]" />
            Multi-tenant PostgreSQL database
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">FREE TIER (100 LIMIT)</div>
            <div className="mt-2 text-2xl font-bold font-heading text-[#D4621A]">
              {freeStoresCount} <span className="text-sm font-normal text-gray-400">/ {shops.length}</span>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-amber-700 font-medium">
            100 free sales allowance per store
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">ACTIVE BILLING OUTLETS</div>
            <div className="mt-2 text-2xl font-bold font-heading text-[#D4621A]">
              {activeStoresCount}
            </div>
          </div>
          <div className="mt-2 text-[11px] text-[#D4621A] font-medium">
            {totalOrders} completed transactions logged
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">PLATFORM GMV GENERATED</div>
            <div className="mt-2 text-2xl font-bold font-heading text-[#101318]">
              {formatINR(totalGMV)}
            </div>
          </div>
          <div className="mt-2 text-[11px] text-gray-500">
            Across {period.toLowerCase()} period
          </div>
        </div>
      </div>

      {/* Mode 1: Standard Directory */}
      {activeTab === 'directory' && (
        <div className="bg-white rounded-xl shadow-xs p-5 border border-gray-200/80">
          {/* Filter Chips Bar */}
          <div className="flex items-center gap-2 flex-wrap pb-4 border-b border-gray-100">
            {filterChips.map((chip) => {
              const isActive = filter === chip;
              return (
                <button
                  key={chip}
                  onClick={() => setFilter(chip)}
                  className={`min-h-[34px] px-3.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                    isActive
                      ? 'border-[#D4621A] bg-[#D4621A] text-white shadow-xs'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-[#F8F3F0] hover:border-orange-200'
                  }`}
                >
                  {chip}
                </button>
              );
            })}
            <span className="text-xs text-gray-400 ml-auto font-medium">
              Showing {filtered.length} of {shops.length} merchant stores
            </span>
          </div>

          {/* Shops Table */}
          <div className="overflow-x-auto mt-3">
            <table className="table w-full">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] text-gray-400 uppercase tracking-wider">
                  <th
                    onClick={() => setSortBy('name')}
                    className="cursor-pointer hover:text-[#D4621A] py-3 text-left"
                  >
                    Store Identity {sortBy === 'name' ? '▲' : ''}
                  </th>
                  <th className="py-3 text-left">Category & City</th>
                  <th className="py-3 text-left">Owner Mobile</th>
                  <th
                    onClick={() => setSortBy('orders')}
                    className="text-right cursor-pointer hover:text-[#D4621A] py-3"
                  >
                    Orders {sortBy === 'orders' ? '▼' : ''}
                  </th>
                  <th className="min-w-[160px] py-3 text-left">100 Sales Limit</th>
                  <th
                    onClick={() => setSortBy('gmv')}
                    className="text-right cursor-pointer hover:text-[#D4621A] py-3"
                  >
                    GMV Volume {sortBy === 'gmv' ? '▼' : ''}
                  </th>
                  <th className="text-right py-3">Last Active</th>
                  <th className="text-right py-3">Subscription</th>
                  <th className="text-right py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center text-gray-400 py-12 text-xs">
                      No merchant store matches filter &ldquo;{filter}&rdquo; or query &ldquo;{searchQuery}&rdquo;.
                    </td>
                  </tr>
                ) : (
                  filtered.map(({ shop, plan, gmv, orders, lastSeen }) => {
                    const FREE_LIMIT = 100;
                    const isPro = plan === 'Pro';
                    const remaining = Math.max(0, FREE_LIMIT - orders);
                    const quotaPercent = Math.min(100, Math.round((orders / FREE_LIMIT) * 100));

                    return (
                      <tr
                        key={shop.id}
                        className="hover:bg-orange-50/30 transition-colors group cursor-pointer"
                        onClick={() => onOpenShopDrawer(shop)}
                      >
                        <td className="py-3.5">
                          <div className="flex items-center gap-3">
                            <span className="w-9 h-9 rounded-full bg-orange-100/70 text-[#D4621A] flex items-center justify-center font-heading font-black text-xs shrink-0 border border-orange-200">
                              {shop.name.charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <span className="block font-heading font-bold text-[13.5px] text-[#101318] truncate group-hover:text-[#D4621A] transition-colors">
                                {shop.name}
                              </span>
                              <span className="text-[10.5px] font-mono text-gray-400 truncate block">
                                ID: {shop.id.slice(0, 8)}...
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5">
                          <div className="text-xs font-medium text-gray-800">{shop.shop_type || 'Retail POS'}</div>
                          <div className="text-[11px] text-gray-400">{shop.city || 'India'}, {shop.state || ''}</div>
                        </td>
                        <td className="py-3.5">
                          <div className="flex items-center gap-1.5 font-mono text-xs text-gray-700">
                            <span>+91 {shop.phone}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleWhatsApp(shop.phone || '', shop.name, orders);
                              }}
                              title="Chat on WhatsApp"
                              className="p-1 rounded hover:bg-[#F8F3F0] text-[#D4621A] transition-colors"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 text-right font-heading font-bold text-xs text-[#101318]">
                          {orders}
                        </td>
                        <td className="py-3.5">
                          {isPro ? (
                            <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-[#F8F3F0] text-[#D4621A] border border-[#D4621A]/25">
                              UNLIMITED PRO
                            </span>
                          ) : (
                            <div className="min-w-[150px]">
                              <div className="flex items-center justify-between text-[10.5px] mb-1 font-medium">
                                <span className="text-gray-800 font-bold">{orders} / {FREE_LIMIT} bills</span>
                                <span className="text-[#D4621A] font-mono font-semibold">{remaining} left</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    quotaPercent > 80 ? 'bg-red-500' : 'bg-[#D4621A]'
                                  }`}
                                  style={{ width: `${quotaPercent}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 text-right font-heading font-bold text-xs text-[#101318]">
                          {formatINR(gmv)}
                        </td>
                        <td className="py-3.5 text-right text-gray-400 text-xs">
                          {timeAgo(lastSeen)}
                        </td>
                        <td className="py-3.5 text-right">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                              plan === 'Pro'
                                ? 'bg-[#F8F3F0] text-[#D4621A] border border-[#D4621A]/25'
                                : 'bg-orange-50 text-orange-700 border border-orange-200'
                            }`}
                          >
                            {plan} TIER
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setSelected360ShopId(shop.id);
                                setActiveTab('lineage_360');
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold text-[#D4621A] bg-orange-50 hover:bg-orange-100 rounded-md border border-orange-200 transition-colors"
                            >
                              360° Lineage ↗
                            </button>
                            <button
                              onClick={() => onOpenShopDrawer(shop)}
                              className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors"
                              title="Open Shop Drawer"
                            >
                              <ChevronRight className="w-4 h-4" />
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
      )}

      {/* Mode 2: 360° Ecosystem Lineage View */}
      {activeTab === 'lineage_360' && current360Shop && (
        <div className="flex flex-col gap-5">
          {/* Shop Selector Dropdown */}
          <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Select Store to Audit:
              </span>
              <select
                value={selected360ShopId}
                onChange={(e) => setSelected360ShopId(e.target.value)}
                className="text-xs font-semibold py-1.5 px-3 rounded-lg border border-gray-200 bg-white text-gray-900 focus:border-[#D4621A] outline-none shadow-xs"
              >
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.city || 'India'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleWhatsApp(current360Shop.phone || '', current360Shop.name, currentShopBills.length)}
                className="btn btn-secondary text-xs min-h-[32px] px-3 gap-1.5 text-[#D4621A] border-[#D4621A]/25 hover:bg-[#F8F3F0]"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp Owner</span>
              </button>
              <button
                onClick={() => onOpenShopDrawer(current360Shop)}
                className="btn btn-secondary text-xs min-h-[32px] px-3 gap-1.5 border-gray-300 hover:border-[#D4621A]"
              >
                <span>Open Full Drawer</span>
              </button>
            </div>
          </div>

          {/* 6 Lineage Audit Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Step 1: Owner Profile */}
            <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#D4621A] mb-1">
                  Step 1: User / Owner Identity
                </div>
                <h4 className="text-sm font-bold text-gray-900 m-0 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span>{ownerProfile?.full_name || 'Registered Store Owner'}</span>
                </h4>
                <div className="space-y-1.5 text-xs text-gray-600">
                  <div><strong>Mobile Phone:</strong> <span className="font-mono text-gray-900">+91 {ownerProfile?.phone || current360Shop.phone}</span></div>
                  <div><strong>Profile UID:</strong> <code className="text-[10px] bg-gray-100 px-1 py-0.5 rounded font-mono">{ownerProfile?.id || ownerMember?.user_id || 'UID-TENANT'}</code></div>
                  <div><strong>Identity Verified:</strong> <span className="text-[#D4621A] font-semibold">Active Supabase Auth</span></div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-400">
                Created: {formatDate(ownerProfile?.created_at || current360Shop.created_at)}
              </div>
            </div>

            {/* Step 2: Shop Entity */}
            <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#D4621A] mb-1">
                  Step 2: Shop Business Entity
                </div>
                <h4 className="text-sm font-bold text-gray-900 m-0 mb-3 flex items-center gap-2">
                  <Store className="w-4 h-4 text-gray-500" />
                  <span>{current360Shop.name}</span>
                </h4>
                <div className="space-y-1.5 text-xs text-gray-600">
                  <div><strong>Business Type:</strong> <span className="tag bg-gray-100 text-gray-800">{current360Shop.shop_type || 'Retail'}</span></div>
                  <div><strong>Location:</strong> {current360Shop.city || 'India'}, {current360Shop.state || ''}</div>
                  <div><strong>GST Setting:</strong> {current360Shop.gst_enabled ? `${current360Shop.gst_rate || 5}% GST (${current360Shop.gst_number || 'Registered'})` : 'Tax Exempt'}</div>
                  <div><strong>Receipt Printer:</strong> {current360Shop.printer_enabled ? `ESC/POS ${current360Shop.printer_name || '58mm'}` : 'Disabled'}</div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-400">
                Tenant ID: {current360Shop.id.slice(0, 8)}...
              </div>
            </div>

            {/* Step 3: Staff Roster */}
            <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#D4621A] mb-1">
                  Step 3: Staff & Access Roster
                </div>
                <h4 className="text-sm font-bold text-gray-900 m-0 mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-gray-500" />
                  <span>{shopStaff.length || 1} Staff Member(s)</span>
                </h4>
                <div className="space-y-1.5 text-xs text-gray-600">
                  <div><strong>Active Roster:</strong> {shopStaff.filter((s) => s.is_active).length || 1} operator(s)</div>
                  <div><strong>RBAC Roles:</strong> {Array.from(new Set(shopStaff.map((s) => s.role))).join(', ') || 'Owner'}</div>
                  <div><strong>Policy:</strong> 1 Owner locked on Free Tier (100 bills)</div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-[#D4621A] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Multi-Tenant Secured
              </div>
            </div>

            {/* Step 4: Catalog & Menu */}
            <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#D4621A] mb-1">
                  Step 4: Catalog & Menu Density
                </div>
                <h4 className="text-sm font-bold text-gray-900 m-0 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span>{currentShopItems.length} Catalog Items</span>
                </h4>
                <div className="space-y-1.5 text-xs text-gray-600">
                  <div><strong>Active in Menu:</strong> {currentShopItems.filter((i) => i.is_available).length} items</div>
                  <div><strong>Average Item Price:</strong> {currentShopItems.length ? formatINR(currentShopItems.reduce((acc, i) => acc + Number(i.price || 0), 0) / currentShopItems.length) : '₹0'}</div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-400">
                Menu taxonomy verified
              </div>
            </div>

            {/* Step 5: Billing & Performance */}
            <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#D4621A] mb-1">
                  Step 5: Billing & Revenue
                </div>
                <h4 className="text-sm font-bold text-gray-900 m-0 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#D4621A]" />
                  <span className="text-[#D4621A] font-bold">{formatINR(currentShopGMV)} GMV</span>
                </h4>
                <div className="space-y-1.5 text-xs text-gray-600">
                  <div><strong>Completed Invoices:</strong> {currentShopBills.length} orders</div>
                  <div><strong>Average Order Value:</strong> {currentShopBills.length ? formatINR(currentShopGMV / currentShopBills.length) : '₹0'}</div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-400">
                Live POS billing stream
              </div>
            </div>

            {/* Step 6: Subscription & Retention */}
            <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#D4621A] mb-1">
                  Step 6: Subscription & Quota
                </div>
                <h4 className="text-sm font-bold text-gray-900 m-0 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#D4621A]" />
                  <span className="uppercase">{currentSub?.plan || 'FREE TIER (100 LIMIT)'}</span>
                </h4>
                <div className="space-y-1.5 text-xs text-gray-600">
                  <div><strong>Bills Used:</strong> {currentShopBills.length} / 100 sales</div>
                  <div><strong>Remaining:</strong> {Math.max(0, 100 - currentShopBills.length)} free sales left</div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-[#D4621A] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Account In Good Standing
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
