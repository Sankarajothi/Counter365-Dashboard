'use client';

import React, { useState } from 'react';
import { Shop, Profile, ShopMember, Bill, Subscription } from '../../types/database';
import { formatDate } from '../../lib/adminData';
import {
  Users,
  Shield,
  Phone,
  MessageSquare,
  Search,
  Lock,
  AlertCircle,
  CheckCircle2,
  Store,
  Sparkles,
  TrendingUp,
  Download
} from 'lucide-react';

interface StaffAccessViewProps {
  shops: Shop[];
  profiles: Profile[];
  shopMembers: ShopMember[];
  bills?: Bill[];
  subscriptions?: Subscription[];
  onShowToast: (msg: string) => void;
}

export function StaffAccessView({
  shops,
  profiles,
  shopMembers,
  bills = [],
  subscriptions = [],
  onShowToast,
}: StaffAccessViewProps) {
  const [search, setSearch] = useState('');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<'All' | 'Free' | 'Pro'>('All');

  const FREE_SALES_LIMIT = 100;

  // Build real shop-by-shop member and 100-sales quota data
  const shopQuotaList = shops.map((shop) => {
    const sub = subscriptions.find((s) => s.shop_id === shop.id);
    const isPro = sub?.plan?.toLowerCase() === 'pro';
    const shopBills = bills.filter((b) => b.shop_id === shop.id && b.status === 'completed');
    const completedSales = shopBills.length;
    const quotaUsedPercent = Math.min(100, Math.round((completedSales / FREE_SALES_LIMIT) * 100));
    const remainingSales = Math.max(0, FREE_SALES_LIMIT - completedSales);

    // Members for this shop
    const members = shopMembers.filter((m) => m.shop_id === shop.id);
    const ownerMember = members.find((m) => (m.role || '').toLowerCase() === 'owner') || members[0];
    const ownerProfile = profiles.find((p) => p.id === ownerMember?.user_id);
    const additionalStaff = members.filter((m) => (m.role || '').toLowerCase() !== 'owner');

    return {
      shop,
      sub,
      isPro,
      completedSales,
      quotaUsedPercent,
      remainingSales,
      ownerName: ownerProfile?.full_name || 'Registered Owner',
      ownerPhone: ownerProfile?.phone || shop.phone,
      totalMembers: members.length,
      additionalStaffCount: isPro ? additionalStaff.length : 0,
      canAddMembers: isPro,
    };
  });

  const proShopsCount = shopQuotaList.filter((s) => s.isPro).length;
  const freeShopsCount = shopQuotaList.filter((s) => !s.isPro).length;
  const totalCompletedSales = shopQuotaList.reduce((acc, s) => acc + s.completedSales, 0);

  const filteredShops = shopQuotaList.filter((item) => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      (item.shop.name || '').toLowerCase().includes(q) ||
      (item.ownerName || '').toLowerCase().includes(q) ||
      (item.ownerPhone && item.ownerPhone.includes(q)) ||
      (item.shop.city || '').toLowerCase().includes(q);

    const matchPlan =
      selectedPlanFilter === 'All' ||
      (selectedPlanFilter === 'Pro' && item.isPro) ||
      (selectedPlanFilter === 'Free' && !item.isPro);

    return matchSearch && matchPlan;
  });

  const handleWhatsApp = (phone: string, name: string, shop: string, sales: number) => {
    const clean = phone.replace(/[^0-9]/g, '');
    if (clean) {
      const remaining = Math.max(0, FREE_SALES_LIMIT - sales);
      const msg = encodeURIComponent(
        `Hello ${name}! This is CounterPro Admin. Your shop ${shop} has completed ${sales}/${FREE_SALES_LIMIT} free sales (${remaining} remaining). To unlock additional team members (Supervisors & Billers) and unlimited billing, upgrade to CounterPro Pro.`
      );
      window.open(`https://wa.me/91${clean}?text=${msg}`, '_blank');
      onShowToast(`Opened WhatsApp for ${shop}`);
    } else {
      onShowToast('No phone number recorded');
    }
  };

  const handleCall = (phone: string) => {
    const clean = phone.replace(/[^0-9]/g, '');
    if (clean) {
      window.location.href = `tel:+91${clean}`;
      onShowToast(`Calling +91 ${clean}`);
    } else {
      onShowToast('No phone number recorded');
    }
  };

  const handleExportCSV = () => {
    if (!shopQuotaList.length) {
      onShowToast('No staff records to export.');
      return;
    }
    const headers = ['Shop Name', 'Owner Name', 'Owner Phone', 'Plan', 'Completed Sales', 'Quota Left', 'Multi-User Status'];
    const rows = shopQuotaList.map((s) => [
      `"${s.shop.name.replace(/"/g, '""')}"`,
      `"${s.ownerName.replace(/"/g, '""')}"`,
      `"${s.ownerPhone}"`,
      s.isPro ? 'Pro' : 'Free (100 Cap)',
      s.completedSales,
      s.remainingSales,
      s.canAddMembers ? 'Unlocked' : 'Locked to 1 Owner',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `counterpro-staff-access-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('Exported Staff Access Registry CSV');
  };

  return (
    <div className="flex flex-col gap-[20px]">
      {/* Hero Banner */}
      <div className="bg-white rounded-xl shadow-xs p-5 border border-gray-200/80 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FD5E03] animate-pulse" />
            <h2 className="text-[17px] font-bold text-[#101318] m-0">
              Staff Access Governance & RBAC
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-50 text-[#FD5E03] border border-orange-200 font-semibold">
              Owner Restrictions
            </span>
          </div>
          <p className="text-xs text-gray-500 m-0 mt-1">
            Free tier stores operate under a 1-Owner policy with a 100 bill limit. Multi-staff roles require CounterPro Pro.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="btn btn-secondary text-xs min-h-[34px] px-3 gap-1.5 border-gray-300 hover:border-[#FD5E03]"
        >
          <Download className="w-3.5 h-3.5 text-gray-500" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Subscription Architecture Alert Card */}
      <div className="bg-orange-50/70 border border-orange-200 rounded-xl p-4 flex items-start gap-3 shadow-xs">
        <Lock className="w-5 h-5 text-[#FD5E03] shrink-0 mt-0.5" />
        <div className="text-xs text-[#9A3412] leading-relaxed">
          <div className="font-bold text-[13px] text-[#C2410C] mb-0.5">
            Role-Based Access Control: Multi-User Access Tied to CounterPro Pro
          </div>
          <div>
            Multi-user staff members (Supervisors, Billers, and Cashiers) are exclusively available on the <strong>CounterPro Pro Plan</strong>. Free tier shops have a strict cap of <strong>100 sales limit</strong> and are restricted to a single Owner account.
          </div>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">REGISTERED OWNERS</div>
            <div className="mt-2 text-2xl font-bold font-heading text-[#101318]">
              {shops.length}
            </div>
          </div>
          <div className="mt-2 text-[11px] text-gray-500">1 registered owner per store</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">FREE PLAN ACCOUNTS</div>
            <div className="mt-2 text-2xl font-bold font-heading text-[#FD5E03]">
              {freeShopsCount}
            </div>
          </div>
          <div className="mt-2 text-[11px] text-amber-700 font-medium">100 sales limit applied</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">UNLOCKED PRO STAFF</div>
            <div className="mt-2 text-2xl font-bold font-heading text-gray-400">
              0
            </div>
          </div>
          <div className="mt-2 text-[11px] text-gray-400">Locked until shops upgrade to Pro</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">TOTAL BILLS RECORDED</div>
            <div className="mt-2 text-2xl font-bold font-heading text-emerald-700">
              {totalCompletedSales}
            </div>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 font-medium">Across all free quotas</div>
        </div>
      </div>

      {/* Main Quota & Member Roster Table Card */}
      <div className="bg-white rounded-xl shadow-xs p-5 border border-gray-200/80">
        {/* Filter Bar */}
        <div className="flex items-center gap-3 flex-wrap pb-4 border-b border-gray-100">
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search store, owner, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 bg-[#FAFAFB] focus:bg-white focus:border-[#FD5E03] outline-none shadow-xs"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-500">Plan:</span>
            {(['All', 'Free', 'Pro'] as const).map((plan) => (
              <button
                key={plan}
                onClick={() => setSelectedPlanFilter(plan)}
                className={`text-xs px-3 py-1 rounded-lg font-semibold border transition-all ${
                  selectedPlanFilter === plan
                    ? 'bg-[#FD5E03] text-white border-[#FD5E03] shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-orange-50 hover:border-orange-200'
                }`}
              >
                {plan === 'All' ? 'All Stores' : plan === 'Free' ? 'Free (100 Cap)' : 'Pro (Unlimited)'}
              </button>
            ))}
          </div>

          <span className="text-xs text-gray-400 ml-auto font-medium">
            Showing {filteredShops.length} of {shops.length} merchant accounts
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto mt-3">
          <table className="table w-full">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] text-gray-400 uppercase tracking-wider">
                <th className="py-3 text-left">Store & City</th>
                <th className="py-3 text-left">Registered Owner</th>
                <th className="py-3 text-left">Subscription Tier</th>
                <th className="min-w-[180px] py-3 text-left">100 Sales Limit Progress</th>
                <th className="py-3 text-left">Additional Staff</th>
                <th className="text-right py-3">Pro Upgrade Outreach</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredShops.map((item) => (
                <tr key={item.shop.id} className="hover:bg-orange-50/30 transition-colors">
                  <td className="py-3.5">
                    <div className="font-bold text-xs text-gray-900">{item.shop.name}</div>
                    <div className="text-[11px] text-gray-400">{item.shop.city || 'India'} &bull; {item.shop.shop_type || 'Retail'}</div>
                  </td>
                  <td className="py-3.5">
                    <div className="font-medium text-xs text-gray-900">{item.ownerName}</div>
                    <div className="text-[11px] text-gray-400 font-mono">+91 {item.ownerPhone}</div>
                  </td>
                  <td className="py-3.5">
                    {item.isPro ? (
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                        PRO (UNLIMITED)
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-orange-50 text-[#FD5E03] border border-orange-200">
                        FREE (100 LIMIT)
                      </span>
                    )}
                  </td>
                  <td className="py-3.5">
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-medium mb-1">
                        <span className="text-gray-900 font-bold">
                          {item.completedSales} / {FREE_SALES_LIMIT} bills
                        </span>
                        <span className="text-[#FD5E03] font-mono text-[11px] font-semibold">
                          {item.remainingSales} remaining
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            item.quotaUsedPercent > 80
                              ? 'bg-red-500'
                              : item.quotaUsedPercent > 50
                              ? 'bg-amber-500'
                              : 'bg-[#FD5E03]'
                          }`}
                          style={{ width: `${item.quotaUsedPercent}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5">
                    {item.canAddMembers ? (
                      <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Unlocked ({item.additionalStaffCount})
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-gray-400" /> Locked to Owner
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() =>
                          handleWhatsApp(
                            item.ownerPhone || '',
                            item.ownerName,
                            item.shop.name,
                            item.completedSales
                          )
                        }
                        className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors flex items-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        onClick={() => handleCall(item.ownerPhone || '')}
                        className="px-2.5 py-1 text-[11px] font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md transition-colors flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        <span>Call</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
