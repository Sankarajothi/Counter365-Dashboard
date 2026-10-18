import React, { useState, useMemo } from 'react';
import { Store, Eye, ShieldCheck, MapPin, Phone, User, Calendar, Receipt, Filter, X, Sparkles, Plus, Key, Gauge } from 'lucide-react';
import { DataTable, Column } from '../common/DataTable';
import { StatusBadge } from '../common/StatusBadge';
import { ExportButton } from '../common/ExportButton';
import { ShopDetailModal } from './ShopDetailModal';
import { formatDateTime, formatDate } from '../../utils/dateUtils';
import { Shop } from '../../types/database';

export interface ShopsDirectoryViewProps {
  shops: Shop[];
  subscriptions?: any[];
  loading?: boolean;
  selectedShop?: Shop | null;
  onClearSelectedShop?: () => void;
  onSelectSalon?: (shop: Shop) => void;
  onSelectShop?: (shop: Shop) => void;
  onStaffChange?: () => void;
  initialModalTab?: 'overview' | 'staff' | 'services' | 'billing' | 'settings' | 'telemetry';
}
export type SalonsViewProps = ShopsDirectoryViewProps;

export const ShopsDirectoryView: React.FC<ShopsDirectoryViewProps> = ({
  shops,
  subscriptions = [],
  loading = false,
  selectedShop: externalSelectedShop,
  onClearSelectedShop,
  onSelectSalon,
  onSelectShop,
  onStaffChange,
  initialModalTab = 'overview',
}) => {
  const handleSelect = onSelectShop || onSelectSalon;
  const [internalSelectedShop, setInternalSelectedShop] = useState<Shop | null>(null);
  const [modalTab, setModalTab] = useState<'overview' | 'staff' | 'services' | 'billing' | 'settings' | 'telemetry'>(
    initialModalTab
  );

  React.useEffect(() => {
    if (initialModalTab) {
      setModalTab(initialModalTab);
    }
  }, [initialModalTab]);

  const [exactDate, setExactDate] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'yesterday' | '7d' | '30d'>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [staffFilter, setStaffFilter] = useState<'all' | 'with_staff' | 'no_staff'>('all');

  const activeModalShop = externalSelectedShop || internalSelectedShop;

  const handleCloseModal = () => {
    setInternalSelectedShop(null);
    onClearSelectedShop?.();
  };

  const handlePreset = (preset: 'all' | 'today' | 'yesterday' | '7d' | '30d') => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'today') {
      setExactDate(now.toISOString().split('T')[0]);
    } else if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      setExactDate(y.toISOString().split('T')[0]);
    } else {
      setExactDate('');
    }
  };

  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    shops.forEach((s) => {
      if (s.city && s.city.trim()) set.add(s.city.trim());
    });
    return Array.from(set).sort();
  }, [shops]);

  const filteredShops = useMemo(() => {
    return shops.filter((s) => {
      if (exactDate) {
        if (!s.created_at) return false;
        const d = new Date(s.created_at).toISOString().split('T')[0];
        if (d !== exactDate) return false;
      }

      if (!exactDate && datePreset !== 'all') {
        if (!s.created_at) return false;
        const sTime = new Date(s.created_at).getTime();
        const now = Date.now();
        if (datePreset === '7d' && now - sTime > 7 * 86400000) return false;
        if (datePreset === '30d' && now - sTime > 30 * 86400000) return false;
      }

      if (cityFilter !== 'all' && s.city?.trim().toLowerCase() !== cityFilter.toLowerCase()) {
        return false;
      }

      if (staffFilter === 'with_staff' && (s.staff_count ?? 0) === 0) return false;
      if (staffFilter === 'no_staff' && (s.staff_count ?? 0) > 0) return false;

      return true;
    });
  }, [shops, exactDate, datePreset, cityFilter, staffFilter]);

  const resetFilters = () => {
    setExactDate('');
    setDatePreset('all');
    setCityFilter('all');
    setStaffFilter('all');
  };

  const isAnyFilterActive = exactDate !== '' || datePreset !== 'all' || cityFilter !== 'all' || staffFilter !== 'all';

  const columns: Column<Shop>[] = [
    {
      key: 'name',
      header: 'Shop Name',
      render: (shop) => (
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => {
            if (onSelectSalon) onSelectSalon(shop);
            else setInternalSelectedShop(shop);
          }}
        >
          <div className="w-8 h-8 rounded-lg bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs shrink-0 border border-slate-700 group-hover:bg-[#D4621A] transition-colors">
            {shop.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-neutral-900 group-hover:text-[#D4621A] flex items-center gap-1.5 flex-wrap transition-colors">
              <span>{shop.name}</span>
              {shop.duplicate_count && shop.duplicate_count > 0 ? (
                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-[#D4621A]/10 text-[#D4621A] border border-[#D4621A]/20 rounded">
                  Deduplicated ({shop.duplicate_count} merged)
                </span>
              ) : null}
            </div>
            <div className="text-[11px] text-neutral-500 font-mono truncate max-w-[140px]">
              ID: {shop.id.slice(0, 8)}...
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (shop) => (
        <span className="font-mono text-xs text-neutral-700">
          {shop.phone || '—'}
        </span>
      ),
    },
    {
      key: 'customers',
      header: 'Clients',
      render: (shop) => (
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-xs text-neutral-900 font-mono">
            {shop.customer_count ?? 0}
          </span>
          <span className="text-[11px] text-neutral-500">clients</span>
        </div>
      ),
    },
    {
      key: 'staff',
      header: 'Staff',
      render: (shop) => (
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-xs text-neutral-900 font-mono">
            {shop.staff_count ?? 0}
          </span>
          <span className="text-[11px] text-neutral-500">staff</span>
        </div>
      ),
    },
    {
      key: 'city',
      header: 'Location',
      render: (shop) => (
        <div>
          <div className="text-neutral-900 font-medium">
            {shop.city || '—'}
          </div>
          <div className="text-[11px] text-neutral-500 truncate max-w-[150px]">
            {shop.address || 'No address'}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: () => <StatusBadge status="active" />,
      sortable: false,
    },
    {
      key: 'bill_count',
      header: 'Free Quota',
      render: (shop) => {
        const salesDone = shop.bill_count || 0;
        const limit = shop.free_sales_limit && shop.free_sales_limit > 0 ? shop.free_sales_limit : 100;
        const remaining = Math.max(0, limit - salesDone);
        const pct = Math.min(100, Math.round((salesDone / limit) * 100));
        return (
          <div className="space-y-1 min-w-[130px]">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-mono font-bold text-neutral-900">{salesDone}/{limit}</span>
              <span className={`font-mono text-[10px] font-bold ${salesDone >= 50 ? 'text-neutral-900' : 'text-neutral-500'}`}>
                {remaining === 0 ? 'Limit Reached' : `${remaining} left`}
              </span>
            </div>
            <div className="w-full bg-[#D4621A]/15 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#D4621A] rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: 'created_at',
      header: 'Registered',
      render: (shop) => (
        <span className="text-black/80 text-xs font-mono">
          {formatDate(shop.created_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (shop) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (handleSelect) {
                handleSelect(shop);
              } else {
                setModalTab('overview');
                setInternalSelectedShop(shop);
              }
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-800 hover:bg-[#D4621A] hover:text-white shadow-xs transition-colors cursor-pointer"
            title="View shop overview & team"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Details</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setModalTab('billing');
              setInternalSelectedShop(shop);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-[#D4621A]/20 bg-[#D4621A]/10 text-[#D4621A] hover:bg-[#D4621A] hover:text-white shadow-xs transition-colors cursor-pointer"
            title="Inspect all bills and filter by date for this shop"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Bills &amp; Payments</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setModalTab('settings');
              setInternalSelectedShop(shop);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-800 hover:bg-slate-100 shadow-xs transition-colors cursor-pointer"
            title="Increase or reset this shop's free sales limit"
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>Edit limit</span>
          </button>
        </div>
      ),
      sortable: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Shops Directory
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Verified merchant business counters onboarded on CounterPro
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportButton
            data={filteredShops}
            filename="counterpro_shops"
            columns={[
              { key: 'name', label: 'Shop Name' },
              { key: 'phone', label: 'Shop Phone' },
              { key: 'city', label: 'City' },
              { key: 'address', label: 'Address' },
              { key: 'created_at', label: 'Created At' },
            ]}
          />
        </div>
      </div>

      {/* Multi-Attribute Filter Toolbar */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <Sparkles className="w-4 h-4 text-[#D4621A]" />
            <span>Filters &amp; Date Targeting</span>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Presets:</span>
            {(['all', 'today', 'yesterday', '7d', '30d'] as const).map((p) => (
              <button
                key={p}
                onClick={() => handlePreset(p)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors capitalize ${
                  datePreset === p && !exactDate
                    ? 'bg-[#D4621A] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {p === 'all' ? 'All Time' : p}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Location / City</label>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#D4621A] cursor-pointer"
            >
              <option value="all">All Cities ({uniqueCities.length})</option>
              {uniqueCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Staff Status</label>
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value as any)}
              className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#D4621A] cursor-pointer"
            >
              <option value="all">All Shops</option>
              <option value="with_staff">With Staff Members</option>
              <option value="no_staff">Zero Staff Members</option>
            </select>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-600">Exact Registration Date</label>
              {exactDate && (
                <button
                  onClick={() => setExactDate('')}
                  className="text-[10px] text-slate-500 hover:text-slate-900 font-medium cursor-pointer underline"
                >
                  Clear
                </button>
              )}
            </div>
            <input
              type="date"
              value={exactDate}
              onChange={(e) => {
                setExactDate(e.target.value);
                setDatePreset('all');
              }}
              className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#D4621A] cursor-pointer"
            />
          </div>
        </div>

        {isAnyFilterActive && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">
              Found <strong className="text-slate-900">{filteredShops.length}</strong> matching shops
            </span>
            <button
              onClick={resetFilters}
              className="text-xs font-semibold text-[#D4621A] hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Main Shops Table */}
      <DataTable
        data={filteredShops}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search shop by name, phone, city, or address..."
        emptyTitle="No shops match the selected filter criteria."
        defaultSortField="created_at"
        defaultSortOrder="desc"
        onRowClick={(shop) => {
          if (onSelectSalon) onSelectSalon(shop);
          else setInternalSelectedShop(shop);
        }}
      />

      {/* Shop Detailed Modal */}
      <ShopDetailModal
        shop={activeModalShop}
        isOpen={!!activeModalShop}
        onClose={handleCloseModal}
        onStaffChange={onStaffChange}
        initialTab={modalTab}
        subscriptions={subscriptions}
      />
    </div>
  );
};
export const SalonsView = ShopsDirectoryView;
