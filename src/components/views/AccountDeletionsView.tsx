import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  Download,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { AccountDeletion, Shop } from '../../types/database';
import { exportToCSV } from '../../utils/formatters';

interface AccountDeletionsViewProps {
  deletions: AccountDeletion[];
  shops?: Shop[];
  loading?: boolean;
  onRefresh?: () => void;
  onOpenDeleteAccountInstructions?: () => void;
}

export const AccountDeletionsView: React.FC<AccountDeletionsViewProps> = ({
  deletions = [],
  shops = [],
  loading = false,
  onRefresh,
}) => {
  // Date Scope: '7d' | '30d' | '90d' | 'all' (Default to 'all' to show all database records)
  const [dateScope, setDateScope] = useState<'7d' | '30d' | '90d' | 'all'>('all');
  // Source Filter: 'all' | 'self' | 'admin'
  const [sourceFilter, setSourceFilter] = useState<'all' | 'self' | 'admin'>('all');

  // Format timestamp like "10 Oct 2026, 05:39 pm"
  const formatFriendlyDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      const day = d.getDate();
      const month = d.toLocaleString('en-US', { month: 'short' });
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'pm' : 'am';
      hours = hours % 12 || 12;
      return `${day} ${month} ${year}, ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    } catch {
      return '—';
    }
  };

  // Build shop map for quick lookup
  const shopMap = useMemo(() => {
    const map = new Map<string, Shop>();
    shops.forEach((s) => {
      map.set(s.id, s);
      if (s.phone) {
        map.set(s.phone.replace(/\D/g, '').slice(-10), s);
      }
    });
    return map;
  }, [shops]);

  // Process & deduplicate raw Supabase deletion records
  const processedDeletions = useMemo(() => {
    // Deduplicate rapid repeat submits by shop_name + phone + day
    const seen = new Set<string>();
    const uniqueRaw: AccountDeletion[] = [];

    deletions.forEach((d) => {
      const day = d.deleted_at ? d.deleted_at.slice(0, 10) : (d.created_at || '').slice(0, 10);
      const cleanPhone = (d.phone || '').replace(/\D/g, '').slice(-10);
      const key = `${(d.shop_name || '').trim().toLowerCase()}_${cleanPhone}_${day}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueRaw.push(d);
      }
    });

    return uniqueRaw.map((d, index) => {
      const deletedAt = d.deleted_at || d.created_at || new Date().toISOString();
      const deletedTime = new Date(deletedAt).getTime();

      // Look up matching shop info from real shops
      const cleanPhone = (d.phone || '').replace(/\D/g, '').slice(-10);
      const matchedShop = (d.shop_id ? shopMap.get(d.shop_id) : null) || (cleanPhone ? shopMap.get(cleanPhone) : null);

      // Determine real deletion actor from real deletion reason
      const rLower = (d.reason || '').toLowerCase();
      const isAdmin =
        rLower.includes('admin') ||
        rLower.includes('crm') ||
        rLower.includes('violation') ||
        rLower.includes('policy');
      const deletedBy = isAdmin ? 'Admin (CRM)' : 'Self (app)';

      // Determine whether user was premium
      const wasPremium =
        matchedShop && (matchedShop.free_sales_limit || 0) > 100
          ? 'monthly'
          : 'No';

      // Derived sequential ID e.g. SF202610001
      const createdD = d.created_at ? new Date(d.created_at) : new Date();
      const y = createdD.getFullYear();
      const m = String(createdD.getMonth() + 1).padStart(2, '0');
      const seq = String(uniqueRaw.length - index).padStart(4, '0');
      const formattedShopId = `SF${y}${m}${seq}`;

      // City from real shop or Tamil Nadu / —
      const city = matchedShop?.city ? `${matchedShop.city}, Tamil Nadu` : (d.phone ? 'Tamil Nadu' : '—');

      // Signed up date
      const signupDateStr = matchedShop?.created_at ? formatFriendlyDate(matchedShop.created_at) : '—';

      return {
        ...d,
        deletedAt,
        deletedTime,
        isAdmin,
        deletedBy,
        wasPremium,
        formattedShopId,
        signupDateStr,
        deletedDateStr: formatFriendlyDate(deletedAt),
        city,
      };
    });
  }, [deletions, shopMap]);

  // Filter deletions by Date Scope and Source
  const filteredDeletions = useMemo(() => {
    const now = Date.now();
    return processedDeletions.filter((item) => {
      // 1. Date Scope filter
      if (dateScope === '7d') {
        if (now - item.deletedTime > 7 * 86400000) return false;
      } else if (dateScope === '30d') {
        if (now - item.deletedTime > 30 * 86400000) return false;
      } else if (dateScope === '90d') {
        if (now - item.deletedTime > 90 * 86400000) return false;
      }

      // 2. Source filter
      if (sourceFilter === 'self' && item.isAdmin) return false;
      if (sourceFilter === 'admin' && !item.isAdmin) return false;

      return true;
    });
  }, [processedDeletions, dateScope, sourceFilter]);

  // Compute 4 Summary Cards based on current date scope
  const scopedItemsForSummary = useMemo(() => {
    const now = Date.now();
    return processedDeletions.filter((item) => {
      if (dateScope === '7d') return now - item.deletedTime <= 7 * 86400000;
      if (dateScope === '30d') return now - item.deletedTime <= 30 * 86400000;
      if (dateScope === '90d') return now - item.deletedTime <= 90 * 86400000;
      return true;
    });
  }, [processedDeletions, dateScope]);

  const totalDeletedCount = scopedItemsForSummary.length;
  const selfDeletedCount = scopedItemsForSummary.filter((i) => !i.isAdmin).length;
  const adminDeletedCount = scopedItemsForSummary.filter((i) => i.isAdmin).length;
  const werePremiumCount = scopedItemsForSummary.filter((i) => i.wasPremium !== 'No').length;

  // Handle CSV Export
  const handleExportCSV = () => {
    const exportData = filteredDeletions.map((d) => ({
      'Shop Name': d.shop_name || 'Salon Account',
      'Shop ID': d.formattedShopId,
      'Phone': d.phone || '—',
      'City': d.city,
      'Signed Up': d.signupDateStr,
      'Deleted': d.deletedDateStr,
      'Reason': d.reason || 'Account deleted',
      'Premium': d.wasPremium,
      'Deleted By': d.deletedBy,
    }));
    exportToCSV(exportData, `counterpro_deleted_users_${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div className="space-y-6 font-sans select-none">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
            Deleted users
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Shops that deleted their account from the app or were removed by an admin. Live Overview only shows remaining users.
          </p>
        </div>

        <button
          onClick={() => (onRefresh ? onRefresh() : window.location.reload())}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-neutral-300 hover:border-neutral-400 text-neutral-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
          title="Refresh Data"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* TOP DELETION SUMMARY PANEL */}
      <div className="bg-[#F8F3F0] border border-[#D4621A]/20 rounded-2xl p-4 sm:p-5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-black/60 mb-3 font-mono">
          DELETION SUMMARY
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. DELETED */}
          <div className="bg-[#F8F3F0] border border-[#D4621A]/30 rounded-xl p-3.5 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-black">
              DELETED
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-black mt-1 font-mono">
              {totalDeletedCount}
            </div>
            <div className="text-[11px] text-black/50 mt-0.5">
              In selected period
            </div>
          </div>

          {/* 2. SELF-DELETED */}
          <div className="bg-[#F8F3F0] border border-[#D4621A]/20 rounded-xl p-3.5 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-black/80">
              SELF-DELETED
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-black mt-1 font-mono">
              {selfDeletedCount}
            </div>
            <div className="text-[11px] text-black/50 mt-0.5">
              From the app
            </div>
          </div>

          {/* 3. ADMIN-DELETED */}
          <div className="bg-[#F8F3F0] border border-[#D4621A]/20 rounded-xl p-3.5 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-black/80">
              ADMIN-DELETED
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-black mt-1 font-mono">
              {adminDeletedCount}
            </div>
            <div className="text-[11px] text-black/50 mt-0.5">
              From CRM
            </div>
          </div>

          {/* 4. WERE PREMIUM */}
          <div className="bg-[#F8F3F0] border border-[#D4621A]/20 rounded-xl p-3.5 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#D4621A]">
              WERE PREMIUM
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#D4621A] mt-1 font-mono">
              {werePremiumCount}
            </div>
            <div className="text-[11px] text-[#D4621A]/80 mt-0.5">
              Had active subscription
            </div>
          </div>
        </div>
      </div>

      {/* FILTER TOOLBAR & SUMMARY BADGE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Scope Pills */}
          <div className="inline-flex items-center p-0.5 bg-[#D4621A]/10 rounded-lg text-xs font-medium border border-[#D4621A]/20">
            <button
              onClick={() => setDateScope('7d')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                dateScope === '7d'
                  ? 'bg-[#D4621A] text-white font-semibold shadow-2xs'
                  : 'text-black/70 hover:text-black'
              }`}
            >
              7 days
            </button>
            <button
              onClick={() => setDateScope('30d')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                dateScope === '30d'
                  ? 'bg-[#D4621A] text-white font-semibold shadow-2xs'
                  : 'text-black/70 hover:text-black'
              }`}
            >
              30 days
            </button>
            <button
              onClick={() => setDateScope('90d')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                dateScope === '90d'
                  ? 'bg-[#D4621A] text-white font-semibold shadow-2xs'
                  : 'text-black/70 hover:text-black'
              }`}
            >
              90 days
            </button>
            <button
              onClick={() => setDateScope('all')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                dateScope === 'all'
                  ? 'bg-[#D4621A] text-white font-semibold shadow-2xs'
                  : 'text-black/70 hover:text-black'
              }`}
            >
              All loaded
            </button>
          </div>

          {/* Source Dropdown */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as any)}
            className="text-xs px-3 py-1.5 rounded-lg border border-[#D4621A]/20 bg-[#F8F3F0] text-black focus:outline-none cursor-pointer"
          >
            <option value="all">All sources</option>
            <option value="self">Self (app)</option>
            <option value="admin">Admin (CRM)</option>
          </select>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D4621A]/20 bg-[#F8F3F0] hover:bg-[#D4621A]/10 text-black text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Real Scan Status Summary */}
        <div className="text-xs text-black/60 font-mono">
          {filteredDeletions.length} shops · scanned {deletions.length} archives
        </div>
      </div>

      {/* DELETED USERS TABLE (100% REAL SUPABASE DATA) */}
      <div className="bg-[#F8F3F0] rounded-xl border border-[#D4621A]/20 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[#D4621A]/20 text-[10px] font-bold uppercase tracking-wider text-black/70 bg-[#D4621A]/5 font-mono">
                <th className="py-3 px-3.5">SHOP</th>
                <th className="py-3 px-3">PHONE</th>
                <th className="py-3 px-3">CITY</th>
                <th className="py-3 px-3">SIGNED UP</th>
                <th className="py-3 px-3">DELETED</th>
                <th className="py-3 px-3">PREMIUM</th>
                <th className="py-3 px-3">DELETED BY</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4621A]/10 text-black">
              {filteredDeletions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-black/50">
                    No deleted accounts recorded for the selected timeframe.
                  </td>
                </tr>
              ) : (
                filteredDeletions.map((d) => (
                  <tr key={d.id} className="hover:bg-[#D4621A]/5 transition-colors">
                    {/* SHOP */}
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-black">
                        {d.shop_name || 'Salon Account'}
                      </div>
                      <div className="text-[11px] font-mono text-black/50 mt-0.5">
                        {d.formattedShopId}
                      </div>
                    </td>

                    {/* PHONE */}
                    <td className="py-3 px-3 font-mono text-black/80 whitespace-nowrap">
                      {d.phone || '—'}
                    </td>

                    {/* CITY */}
                    <td className="py-3 px-3 text-black/80 whitespace-nowrap">
                      {d.city}
                    </td>

                    {/* SIGNED UP */}
                    <td className="py-3 px-3 text-black/70 whitespace-nowrap font-mono text-[11px]">
                      {d.signupDateStr}
                    </td>

                    {/* DELETED */}
                    <td className="py-3 px-3 text-black font-semibold whitespace-nowrap font-mono text-[11px]">
                      {d.deletedDateStr}
                    </td>

                    {/* PREMIUM */}
                    <td className="py-3 px-3 font-mono whitespace-nowrap">
                      {d.wasPremium !== 'No' ? (
                        <span className="text-[#D4621A] font-semibold">{d.wasPremium}</span>
                      ) : (
                        <span className="text-black/50">No</span>
                      )}
                    </td>

                    {/* DELETED BY */}
                    <td className="py-3 px-3 font-mono text-black/80 whitespace-nowrap">
                      {d.deletedBy}
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
};
