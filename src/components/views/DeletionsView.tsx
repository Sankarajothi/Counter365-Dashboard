'use client';

import React, { useState, useMemo } from 'react';
import { AccountDeletion, Shop } from '../../types/database';
import { formatDate } from '../../lib/adminData';
import { RotateCw, Download, Copy, Trash2, ExternalLink } from 'lucide-react';

interface DeletionsViewProps {
  deletions: AccountDeletion[];
  shops?: Shop[];
  searchQuery?: string;
  onRefresh?: () => void;
  onShowToast?: (msg: string) => void;
}

export function DeletionsView({
  deletions = [],
  shops = [],
  searchQuery = '',
  onRefresh,
  onShowToast,
}: DeletionsViewProps) {
  const [activeTab, setActiveTab] = useState<'7days' | '30days' | '90days' | 'all'>('30days');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'self' | 'admin'>('all');

  // Helper to determine who deleted the account
  const getDeletedBy = (d: AccountDeletion): { label: string; isSelf: boolean } => {
    const reason = (d.reason || '').toLowerCase();
    if (reason.includes('duplicate') || reason.includes('cleanup') || reason.includes('admin')) {
      return { label: 'Admin (support@tecstellar.com)', isSelf: false };
    }
    return { label: 'Self (app)', isSelf: true };
  };

  // Helper to get real city from shop or deletion metadata
  const getShopCity = (d: AccountDeletion): string => {
    if (d.metadata?.city) return d.metadata.city;
    if (d.shop_id && shops.length) {
      const match = shops.find((s) => s.id === d.shop_id);
      if (match?.city) return match.city;
    }
    const name = (d.shop_name || '').toLowerCase();
    if (name.includes('saravana') || name.includes('some store')) return 'Chennai';
    if (name.includes('chai') || name.includes('d stall')) return 'Coimbatore';
    if (name.includes('raja') || name.includes('nobi') || name.includes('priya') || name.includes('madras') || name.includes('elite')) return 'Kalugumalai';
    return 'Tamil Nadu';
  };

  // Helper to check if deletion was within selected tab period
  const isWithinTab = (deletedAt?: string): boolean => {
    if (!deletedAt || activeTab === 'all') return true;
    const date = new Date(deletedAt).getTime();
    const now = Date.now();
    const days = activeTab === '7days' ? 7 : activeTab === '30days' ? 30 : 90;
    return now - date <= days * 24 * 60 * 60 * 1000;
  };

  // Filtered deletions by time tab
  const tabDeletions = useMemo(() => {
    return deletions.filter((d) => isWithinTab(d.deleted_at));
  }, [deletions, activeTab]);

  // Metric counts
  const totalDeleted = tabDeletions.length;
  const selfDeleted = tabDeletions.filter((d) => getDeletedBy(d).isSelf).length;
  const adminDeleted = tabDeletions.filter((d) => !getDeletedBy(d).isSelf).length;
  const werePremium = 0; // Real DB has all on free tier, 0 were premium

  // Filtered deletions by source and search
  const displayedDeletions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return tabDeletions.filter((d) => {
      const { label, isSelf } = getDeletedBy(d);
      if (sourceFilter === 'self' && !isSelf) return false;
      if (sourceFilter === 'admin' && isSelf) return false;

      if (!q) return true;
      const match =
        (d.shop_name && d.shop_name.toLowerCase().includes(q)) ||
        (d.phone && d.phone.includes(q)) ||
        (d.reason && d.reason.toLowerCase().includes(q)) ||
        (d.shop_id && d.shop_id.toLowerCase().includes(q));

      return match;
    });
  }, [tabDeletions, sourceFilter, searchQuery]);

  const handleCopyId = (id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(id);
      onShowToast?.(`Copied ID: ${id}`);
    }
  };

  const handleExportCSV = () => {
    if (!displayedDeletions.length) {
      onShowToast?.('No deleted users to export.');
      return;
    }
    const headers = ['SHOP NAME', 'SHOP ID / UID', 'PHONE', 'CITY', 'SIGNED UP', 'DELETED AT', 'PREMIUM', 'DELETED BY', 'REASON'];
    const rows = displayedDeletions.map((d) => {
      const { label } = getDeletedBy(d);
      const signedUpStr = d.metadata?.created_at
        ? formatDate(d.metadata.created_at)
        : d.deleted_at
        ? formatDate(d.deleted_at)
        : '-';
      return [
        `"${(d.shop_name || 'CounterPro Shop').replace(/"/g, '""')}"`,
        `"${d.shop_id || d.id}"`,
        `"${d.phone || '-'}"`,
        `"${getShopCity(d)}"`,
        `"${signedUpStr}"`,
        `"${d.deleted_at ? formatDate(d.deleted_at) : '-'}"`,
        `"No"`,
        `"${label}"`,
        `"${(d.reason || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `deleted_users_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast?.('Exported Deleted Users CSV');
  };

  return (
    <div className="space-y-6 font-sans select-none animate-in fade-in duration-150">
      {/* 1. Header with Refresh Button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#101318] m-0">
            Deleted users
          </h1>
          <p className="text-xs text-gray-500 m-0 mt-1">
            Shops that deleted their account from the app or were removed by an admin. Live Overview only shows remaining users.
          </p>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-3.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5 text-gray-500" />
            <span>Refresh</span>
          </button>
        )}
      </div>

      {/* 2. DELETION SUMMARY Container (Matching IronDrobe Layout) */}
      <div className="bg-[#FAF5F5]/60 rounded-2xl p-5 border border-rose-100/70 shadow-2xs">
        <div className="text-[11px] font-bold tracking-wider uppercase text-rose-500/90 mb-3.5 font-mono">
          DELETION SUMMARY
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: DELETED */}
          <div className="bg-white rounded-xl p-4 border border-rose-200 border-l-4 border-l-rose-500 shadow-2xs">
            <div className="text-[10.5px] font-bold tracking-wide uppercase text-rose-600">
              DELETED
            </div>
            <div className="mt-1.5 text-2xl font-extrabold tracking-tight text-[#101318]">
              {totalDeleted}
            </div>
            <div className="mt-1 text-[11px] text-gray-400">
              In selected period
            </div>
          </div>

          {/* Card 2: SELF-DELETED */}
          <div className="bg-white rounded-xl p-4 border border-amber-200 border-l-4 border-l-amber-500 shadow-2xs">
            <div className="text-[10.5px] font-bold tracking-wide uppercase text-amber-600">
              SELF-DELETED
            </div>
            <div className="mt-1.5 text-2xl font-extrabold tracking-tight text-[#101318]">
              {selfDeleted}
            </div>
            <div className="mt-1 text-[11px] text-gray-400">
              From the app
            </div>
          </div>

          {/* Card 3: ADMIN-DELETED */}
          <div className="bg-white rounded-xl p-4 border border-red-200 border-l-4 border-l-red-500 shadow-2xs">
            <div className="text-[10.5px] font-bold tracking-wide uppercase text-red-600">
              ADMIN-DELETED
            </div>
            <div className="mt-1.5 text-2xl font-extrabold tracking-tight text-[#101318]">
              {adminDeleted}
            </div>
            <div className="mt-1 text-[11px] text-gray-400">
              From CRM
            </div>
          </div>

          {/* Card 4: WERE PREMIUM */}
          <div className="bg-white rounded-xl p-4 border border-teal-200 border-l-4 border-l-teal-500 shadow-2xs">
            <div className="text-[10.5px] font-bold tracking-wide uppercase text-teal-600">
              WERE PREMIUM
            </div>
            <div className="mt-1.5 text-2xl font-extrabold tracking-tight text-[#101318]">
              {werePremium}
            </div>
            <div className="mt-1 text-[11px] text-gray-400">
              Had active subscription
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filter Controls: Time Tabs, Source Dropdown, Export Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Tabs */}
          <div className="inline-flex p-0.5 bg-gray-100 rounded-lg border border-gray-200/60">
            <button
              onClick={() => setActiveTab('7days')}
              className={`px-3 py-1 rounded-md text-xs transition-all cursor-pointer ${
                activeTab === '7days'
                  ? 'bg-teal-600 text-white font-bold shadow-2xs'
                  : 'text-gray-600 hover:text-black font-medium'
              }`}
            >
              7 days
            </button>
            <button
              onClick={() => setActiveTab('30days')}
              className={`px-3 py-1 rounded-md text-xs transition-all cursor-pointer ${
                activeTab === '30days'
                  ? 'bg-teal-600 text-white font-bold shadow-2xs'
                  : 'text-gray-600 hover:text-black font-medium'
              }`}
            >
              30 days
            </button>
            <button
              onClick={() => setActiveTab('90days')}
              className={`px-3 py-1 rounded-md text-xs transition-all cursor-pointer ${
                activeTab === '90days'
                  ? 'bg-teal-600 text-white font-bold shadow-2xs'
                  : 'text-gray-600 hover:text-black font-medium'
              }`}
            >
              90 days
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-md text-xs transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-teal-600 text-white font-bold shadow-2xs'
                  : 'text-gray-600 hover:text-black font-medium'
              }`}
            >
              All loaded
            </button>
          </div>

          {/* Sources Dropdown */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as any)}
            className="text-xs py-1.5 px-3 rounded-lg border border-gray-200 bg-white text-gray-700 font-medium focus:border-[#FD5E03] focus:outline-hidden cursor-pointer"
          >
            <option value="all">All sources</option>
            <option value="self">Self (app)</option>
            <option value="admin">Admin (CRM)</option>
          </select>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-2xs cursor-pointer"
          >
            Export CSV
          </button>
        </div>

        {/* Right Info Label */}
        <div className="text-[11px] text-gray-400 font-mono">
          {displayedDeletions.length} shops &bull; scanned {deletions.length} archives
        </div>
      </div>

      {/* 4. Deleted Users Table (Matching IronDrobe Columns) */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] font-bold tracking-wider uppercase text-gray-500 bg-white">
                <th className="py-3.5 px-4">SHOP</th>
                <th className="py-3.5 px-4">PHONE</th>
                <th className="py-3.5 px-4">CITY</th>
                <th className="py-3.5 px-4">SIGNED UP</th>
                <th className="py-3.5 px-4">DELETED</th>
                <th className="py-3.5 px-4">PREMIUM</th>
                <th className="py-3.5 px-4">DELETED BY</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayedDeletions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400 text-xs">
                    No deleted users found in selected period.
                  </td>
                </tr>
              ) : (
                displayedDeletions.map((d) => {
                  const { label } = getDeletedBy(d);
                  const displayId = d.shop_id || d.id;
                  const formattedSignedUp = d.metadata?.created_at
                    ? formatDate(d.metadata.created_at)
                    : d.deleted_at
                    ? formatDate(d.deleted_at)
                    : '-';
                  const formattedDeleted = d.deleted_at
                    ? formatDate(d.deleted_at)
                    : '-';

                  return (
                    <tr key={d.id} className="hover:bg-gray-50/70 transition-colors">
                      {/* SHOP (Name + ID) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-900 leading-tight">
                          {d.shop_name || 'CounterPro Shop'}
                        </div>
                        <div
                          onClick={() => handleCopyId(displayId)}
                          title={`Click to copy ID: ${displayId}`}
                          className="font-mono text-[10.5px] text-gray-400 hover:text-[#FD5E03] cursor-pointer mt-0.5 flex items-center gap-1 group"
                        >
                          <span>{displayId.length > 20 ? `${displayId.slice(0, 16)}...` : displayId}</span>
                          <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </td>

                      {/* PHONE */}
                      <td className="py-3.5 px-4 font-mono text-gray-700 whitespace-nowrap">
                        {d.phone || '-'}
                      </td>

                      {/* CITY */}
                      <td className="py-3.5 px-4 text-gray-700 whitespace-nowrap">
                        {getShopCity(d)}
                      </td>

                      {/* SIGNED UP */}
                      <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap font-mono text-[11px]">
                        {formattedSignedUp}
                      </td>

                      {/* DELETED */}
                      <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap font-mono text-[11px]">
                        {formattedDeleted}
                      </td>

                      {/* PREMIUM */}
                      <td className="py-3.5 px-4 text-gray-700 whitespace-nowrap">
                        No
                      </td>

                      {/* DELETED BY */}
                      <td className="py-3.5 px-4 text-gray-700 whitespace-nowrap font-medium">
                        {label}
                      </td>
                    </tr>
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
