import React, { useMemo, useState } from 'react';
import {
  History,
  Shield,
  CreditCard,
  CalendarCheck,
  UserX,
  Store,
  Filter,
  Building2,
  MapPin,
  Calendar,
  X,
  Sparkles,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { DataTable, Column } from '../common/DataTable';
import { StatusBadge } from '../common/StatusBadge';
import { ExportButton } from '../common/ExportButton';
import { KPICard } from '../common/KPICard';
import { useDateFilter } from '../../context/DateFilterContext';
import { filterByDateRange, formatDateTime } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/formatters';
import { Payment, Bill, Appointment, AccountDeletion, Shop } from '../../types/database';

interface AuditTrailItem {
  id: string;
  type: 'Payment' | 'Invoice' | 'Booking' | 'Deletion' | 'Shop Registration';
  entity: string;
  description: string;
  timestamp: string;
  status: string;
  shopId?: string;
  cityName?: string;
  amountMinor?: number;
  raw: any;
}

interface AuditTrailViewProps {
  payments: Payment[];
  bills: Bill[];
  appointments: Appointment[];
  deletions: AccountDeletion[];
  shops: Shop[];
  loading?: boolean;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({
  payments,
  bills,
  appointments,
  deletions,
  shops,
  loading = false,
}) => {
  const { dateRange } = useDateFilter();

  // Multi-Attribute Filter States
  const [shopFilter, setShopFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [exactDate, setExactDate] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'yesterday' | '7d' | '30d'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Map of shopId -> Shop
  const shopMap = useMemo(() => {
    const map = new Map<string, Shop>();
    shops.forEach((s) => map.set(s.id, s));
    return map;
  }, [shops]);

  // Unique deduplicated shops for selector
  const deduplicatedShops = useMemo(() => {
    const seen = new Set<string>();
    return shops
      .filter((s) => {
        const norm = s.name.trim().toLowerCase();
        if (seen.has(norm)) return false;
        seen.add(norm);
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [shops]);

  // Unique cities from shops
  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    shops.forEach((s) => {
      if (s.city && s.city.trim()) set.add(s.city.trim());
    });
    return Array.from(set).sort();
  }, [shops]);

  // Combine real database records into unified immutable chronological audit trail
  const combinedAuditItems: AuditTrailItem[] = useMemo(() => {
    const items: AuditTrailItem[] = [];

    // 1. Payments
    payments.forEach((p) => {
      const s = shopMap.get(p.shop_id);
      items.push({
        id: p.id,
        type: 'Payment',
        entity: p.shop?.name || s?.name || `Shop #${p.shop_id.slice(0, 8)}`,
        description: `Settled payment of ${formatCurrency(p.amount ?? (p.amount_minor ? p.amount_minor / 100 : 0))} via ${p.method} (Ref: ${p.reference || 'Billing'})`,
        timestamp: p.paid_at || p.created_at || '',
        status: p.status || 'completed',
        shopId: p.shop_id,
        cityName: s?.city || undefined,
        amountMinor: p.amount_minor,
        raw: p,
      });
    });

    // 2. Bills
    bills.forEach((b) => {
      const s = shopMap.get(b.shop_id);
      items.push({
        id: b.id,
        type: 'Invoice',
        entity: b.shop?.name || s?.name || `Shop #${b.shop_id.slice(0, 8)}`,
        description: `Invoice ${b.invoice_number} generated for ${formatCurrency(Number(b.total_amount ?? (b.total_minor ? b.total_minor / 100 : 0)))}`,
        timestamp: b.issued_at || b.created_at || '',
        status: b.status || 'completed',
        shopId: b.shop_id,
        cityName: s?.city || undefined,
        amountMinor: b.total_minor,
        raw: b,
      });
    });

    // 3. Appointments
    appointments.forEach((a) => {
      const s = shopMap.get(a.shop_id);
      items.push({
        id: a.id,
        type: 'Booking',
        entity: a.shop?.name || s?.name || `Shop #${a.shop_id.slice(0, 8)}`,
        description: `Appointment scheduled for ${a.customer?.name || 'Walk-in'} (${a.duration_minutes} mins)`,
        timestamp: a.created_at || a.starts_at || '',
        status: a.status || 'scheduled',
        shopId: a.shop_id,
        cityName: s?.city || undefined,
        raw: a,
      });
    });

    // 4. Account Deletions
    deletions.forEach((d) => {
      items.push({
        id: d.id,
        type: 'Deletion',
        entity: d.shop_name || `Phone: ${d.phone}`,
        description: `Account deletion executed. Reason: "${d.reason}"`,
        timestamp: d.deleted_at || d.created_at || '',
        status: d.status || 'completed',
        raw: d,
      });
    });

    // 5. Shop Registrations
    shops.forEach((s) => {
      items.push({
        id: s.id,
        type: 'Shop Registration',
        entity: s.name,
        description: `New shop registered in ${s.city || 'Tamil Nadu'} with contact phone ${s.phone || 'N/A'}`,
        timestamp: s.created_at || '',
        status: 'active',
        shopId: s.id,
        cityName: s.city || undefined,
        raw: s,
      });
    });

    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [payments, bills, appointments, deletions, shops, shopMap]);

  // Handle Preset Click
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

  // Base range filter
  const baseRangeFiltered = useMemo(() => {
    return filterByDateRange(combinedAuditItems, 'timestamp', dateRange);
  }, [combinedAuditItems, dateRange]);

  // Multi-Attribute Filtered Items
  const filteredItems = useMemo(() => {
    return baseRangeFiltered.filter((item) => {
      // 1. Shop filter
      if (shopFilter !== 'all') {
        const selectedShop = shops.find((s) => s.id === shopFilter);
        const allowedIds = selectedShop?.duplicate_ids ? selectedShop.duplicate_ids : [shopFilter];
        if (!item.shopId || !allowedIds.includes(item.shopId)) return false;
      }

      // 2. City filter (e.g. Coimbatore, Chennai, Bengaluru)
      if (cityFilter !== 'all') {
        if (!item.cityName || item.cityName.toLowerCase() !== cityFilter.toLowerCase()) {
          return false;
        }
      }

      // 3. Operation Type filter
      if (typeFilter !== 'all') {
        if (item.type !== typeFilter) return false;
      }

      // 4. Exact Date
      if (exactDate) {
        if (!item.timestamp) return false;
        const iDate = new Date(item.timestamp).toISOString().split('T')[0];
        if (iDate !== exactDate) return false;
      }

      // 5. Presets (7d, 30d) if no exact single date
      if (!exactDate && datePreset !== 'all') {
        if (!item.timestamp) return false;
        const iTime = new Date(item.timestamp).getTime();
        const now = Date.now();
        if (datePreset === '7d' && now - iTime > 7 * 86400000) return false;
        if (datePreset === '30d' && now - iTime > 30 * 86400000) return false;
      }

      // 6. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const entityMatch = item.entity.toLowerCase().includes(q);
        const descMatch = item.description.toLowerCase().includes(q);
        const typeMatch = item.type.toLowerCase().includes(q);
        const cityMatch = item.cityName?.toLowerCase().includes(q) || false;
        if (!entityMatch && !descMatch && !typeMatch && !cityMatch) return false;
      }

      return true;
    });
  }, [baseRangeFiltered, shopFilter, cityFilter, typeFilter, exactDate, datePreset, searchQuery]);

  const resetFilters = () => {
    setShopFilter('all');
    setCityFilter('all');
    setTypeFilter('all');
    setExactDate('');
    setDatePreset('all');
    setSearchQuery('');
  };

  const isAnyFilterActive =
    shopFilter !== 'all' ||
    cityFilter !== 'all' ||
    typeFilter !== 'all' ||
    exactDate !== '' ||
    datePreset !== 'all' ||
    searchQuery.trim() !== '';

  // Dynamic Filename and Label based on user selection
  const exportFilename = useMemo(() => {
    if (shopFilter !== 'all') {
      const s = shopMap.get(shopFilter);
      const safeName = (s?.name || 'shop').toLowerCase().replace(/[^a-z0-9]/g, '_');
      return `counterpro_activity_${safeName}`;
    }
    if (cityFilter !== 'all') {
      return `counterpro_activity_${cityFilter.toLowerCase()}`;
    }
    return 'counterpro_activity_logs';
  }, [shopFilter, cityFilter, shopMap]);

  const exportLabel = useMemo(() => {
    if (shopFilter !== 'all') {
      const s = shopMap.get(shopFilter);
      return `Download ${s?.name || 'Shop'} Report`;
    }
    if (cityFilter !== 'all') {
      return `Download ${cityFilter} Report`;
    }
    return 'Download Activity Report';
  }, [shopFilter, cityFilter, shopMap]);

  const columns: Column<AuditTrailItem>[] = [
    {
      key: 'type',
      header: 'Operation Type',
      render: (item) => {
        let colorClass = 'bg-[#D4621A]/10 text-black border-[#D4621A]/20';
        if (item.type === 'Payment') colorClass = 'bg-[#D4621A] text-white border-[#D4621A]';
        if (item.type === 'Deletion') colorClass = 'bg-[#D4621A]/20 text-black border-[#D4621A]/40';
        if (item.type === 'Booking') colorClass = 'bg-[#D4621A] text-white border-[#D4621A]';
        if (item.type === 'Invoice') colorClass = 'bg-[#D4621A] text-white border-[#D4621A]';

        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono border font-semibold ${colorClass}`}>
            {item.type}
          </span>
        );
      },
    },
    {
      key: 'entity',
      header: 'Associated Entity & City',
      render: (item) => (
        <div>
          <div className="font-semibold text-neutral-900">{item.entity}</div>
          {item.cityName && (
            <div className="text-[11px] text-neutral-500 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-neutral-400" />
              <span>{item.cityName}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Activity Description',
      render: (item) => (
        <span className="text-neutral-700 text-xs">{item.description}</span>
      ),
    },
    {
      key: 'status',
      header: 'State',
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: 'timestamp',
      header: 'Timestamp',
      render: (item) => (
        <span className="font-mono text-xs text-neutral-500">
          {formatDateTime(item.timestamp)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#EA580C] text-white shadow-xs">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">
              Activity Logs
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Verified chronological log of transactional mutations, registrations, payments, and account deletions.
            </p>
          </div>
        </div>

        {/* Dynamic Single-Shop / City Report Download */}
        <ExportButton
          data={filteredItems}
          filename={exportFilename}
          label={exportLabel}
          columns={[
            { key: 'type', label: 'Operation Type' },
            { key: 'entity', label: 'Entity / Shop' },
            { key: 'cityName', label: 'City' },
            { key: 'description', label: 'Activity Description' },
            { key: 'status', label: 'Status' },
            { key: 'timestamp', label: 'Timestamp' },
          ]}
        />
      </div>

      {/* Snapshot Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPICard
          title="Activity Records"
          value={filteredItems.length}
          subtitle="Events in filter"
          icon={History}
          tone="revenue"
        />
        <KPICard
          title="Active Scope"
          value={
            shopFilter !== 'all'
              ? shopMap.get(shopFilter)?.name || '1 Shop'
              : cityFilter !== 'all'
              ? `${cityFilter}`
              : 'All Shops'
          }
          subtitle={exactDate ? `${exactDate}` : 'All window'}
          icon={Building2}
          tone="usage"
        />
        <KPICard
          title="Payments"
          value={filteredItems.filter((i) => i.type === 'Payment').length}
          subtitle="Settled txns"
          icon={CreditCard}
          tone="conversion"
        />
        <KPICard
          title="Invoices"
          value={filteredItems.filter((i) => i.type === 'Invoice').length}
          subtitle="Issued bills"
          icon={FileSpreadsheet}
          tone="signup"
        />
      </div>

      {/* Multi-Attribute Filter Toolbar: City, Shop, Date, Presets, Search */}
      <div className="p-4 rounded-2xl border border-neutral-200 bg-white shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-900">
            <Sparkles className="w-4 h-4 text-[#EA580C]" />
            <span>Multi-Attribute Activity Filters (Single Shop &amp; City Targeting)</span>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-neutral-400 mr-1">Presets:</span>
            {(['all', 'today', 'yesterday', '7d', '30d'] as const).map((p) => (
              <button
                key={p}
                onClick={() => handlePreset(p)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors capitalize ${
                  datePreset === p && !exactDate
                    ? 'bg-[#EA580C] text-white shadow-xs font-bold'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                {p === '7d' ? 'Last 7 Days' : p === '30d' ? 'Last 30 Days' : p}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* 1. Omni Search */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
              Search Event
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Entity, keyword, ref..."
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#EA580C] focus:bg-white transition-all"
            />
          </div>

          {/* 2. City Filter (e.g. Coimbatore, Chennai, Bengaluru) */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-neutral-400" />
              <span>City / Region</span>
            </label>
            <select
              value={cityFilter}
              onChange={(e) => {
                setCityFilter(e.target.value);
                if (e.target.value !== 'all') {
                  // If city selected, reset shop filter if shop not in city
                  setShopFilter('all');
                }
              }}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 focus:outline-none focus:border-[#EA580C] transition-all"
            >
              <option value="all">All Cities ({uniqueCities.length})</option>
              {uniqueCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Single Shop Selector */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-neutral-400" />
              <span>Target Single Shop</span>
            </label>
            <select
              value={shopFilter}
              onChange={(e) => setShopFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 focus:outline-none focus:border-[#EA580C] transition-all"
            >
              <option value="all">All Shops ({deduplicatedShops.length})</option>
              {deduplicatedShops
                .filter((s) => (cityFilter === 'all' ? true : s.city?.toLowerCase() === cityFilter.toLowerCase()))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.city || 'Tamil Nadu'})
                  </option>
                ))}
            </select>
          </div>

          {/* 4. Operation Type */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
              Operation Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 focus:outline-none focus:border-[#EA580C] transition-all"
            >
              <option value="all">All Operations</option>
              <option value="Payment">Payments Only</option>
              <option value="Invoice">Invoices / Bills Only</option>
              <option value="Booking">Bookings / Appointments</option>
              <option value="Shop Registration">Shop Registrations</option>
              <option value="Deletion">Account Deletions</option>
            </select>
          </div>

          {/* 5. Exact Single Date Picker */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-neutral-400" />
              <span>Exact Date</span>
            </label>
            <input
              type="date"
              value={exactDate}
              onChange={(e) => {
                setExactDate(e.target.value);
                setDatePreset('all');
              }}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 focus:outline-none focus:border-[#EA580C] transition-all"
            />
          </div>
        </div>

        {/* Clear Filters & Current Scope Display */}
        {isAnyFilterActive && (
          <div className="flex items-center justify-between pt-2 text-xs border-t border-neutral-100">
            <span className="text-neutral-500 font-medium">
              Showing <span className="font-bold text-[#EA580C]">{filteredItems.length}</span> activity events
              {cityFilter !== 'all' && ` in ${cityFilter}`}
              {shopFilter !== 'all' && ` for ${shopMap.get(shopFilter)?.name}`}
            </span>
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-lg bg-neutral-100 text-black hover:bg-neutral-200 font-semibold transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear All Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Activity Table */}
      <DataTable
        columns={columns}
        data={filteredItems}
        loading={loading}
        emptyTitle="No activity logs found"
        emptyDescription="No database events found matching the active single shop, city, or date criteria."
        searchPlaceholder="Filter activity logs..."
        searchFields={['type', 'entity', 'description']}
        defaultSortField="timestamp"
        defaultSortOrder="desc"
      />
    </div>
  );
};
