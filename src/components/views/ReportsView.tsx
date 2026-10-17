import React, { useState, useMemo } from 'react';
import {
  FileBarChart,
  Store,
  Users,
  UserX,
  Calendar,
  CreditCard,
  Download,
  Building2,
  MapPin,
  Filter,
  X,
  Sparkles,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ExportButton } from '../common/ExportButton';
import { UnavailableBanner } from '../common/UnavailableBanner';
import { useDateFilter } from '../../context/DateFilterContext';
import { filterByDateRange, formatDateTime, formatDate } from '../../utils/dateUtils';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { Shop, Profile, Bill, Appointment, AccountDeletion } from '../../types/database';

interface ReportsViewProps {
  shops: Shop[];
  profiles: Profile[];
  bills: Bill[];
  appointments: Appointment[];
  deletions: AccountDeletion[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  shops,
  profiles,
  bills,
  appointments,
  deletions,
}) => {
  const { dateRange } = useDateFilter();
  const [reportType, setReportType] = useState<'salons' | 'financial' | 'appointments' | 'deletions' | 'unavailable'>('salons');

  // Multi-Attribute Filter States for Reports
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [salonFilter, setSalonFilter] = useState<string>('all');
  const [exactDate, setExactDate] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'yesterday' | '7d' | '30d'>('all');

  // Shop Map
  const shopMap = useMemo(() => {
    const map = new Map<string, Shop>();
    shops.forEach((s) => {
      map.set(s.id, s);
      if (s.duplicate_ids) {
        s.duplicate_ids.forEach((dupId) => map.set(dupId, s));
      }
    });
    return map;
  }, [shops]);

  // Unique deduplicated salons
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

  // Unique Cities
  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    shops.forEach((s) => {
      if (s.city && s.city.trim()) set.add(s.city.trim());
    });
    return Array.from(set).sort();
  }, [shops]);

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

  // Base date filtered lists
  const baseShops = useMemo(() => filterByDateRange(shops, 'created_at', dateRange), [shops, dateRange]);
  const baseBills = useMemo(() => filterByDateRange(bills, 'issued_at', dateRange), [bills, dateRange]);
  const baseAppts = useMemo(() => filterByDateRange(appointments, 'starts_at', dateRange), [appointments, dateRange]);
  const baseDeletions = useMemo(() => filterByDateRange(deletions, 'created_at', dateRange), [deletions, dateRange]);

  // Allowed IDs for selected salon filter (including duplicate IDs)
  const allowedSalonIds = useMemo(() => {
    if (salonFilter === 'all') return [];
    const selected = shops.find((s) => s.id === salonFilter);
    return selected?.duplicate_ids && selected.duplicate_ids.length > 0
      ? selected.duplicate_ids
      : [salonFilter];
  }, [salonFilter, shops]);

  // Scoped lists with City, Salon, Exact Date filters
  const filteredShops = useMemo(() => {
    return baseShops.filter((s) => {
      if (cityFilter !== 'all' && s.city?.toLowerCase() !== cityFilter.toLowerCase()) return false;
      if (salonFilter !== 'all' && !allowedSalonIds.includes(s.id)) return false;
      if (exactDate) {
        const d = new Date(s.created_at).toISOString().split('T')[0];
        if (d !== exactDate) return false;
      }
      return true;
    });
  }, [baseShops, cityFilter, salonFilter, allowedSalonIds, exactDate]);

  const filteredBills = useMemo(() => {
    return baseBills.filter((b) => {
      const shop = shopMap.get(b.shop_id);
      if (cityFilter !== 'all' && shop?.city?.toLowerCase() !== cityFilter.toLowerCase()) return false;
      if (salonFilter !== 'all' && !allowedSalonIds.includes(b.shop_id)) return false;
      if (exactDate) {
        const d = new Date(b.issued_at || b.created_at).toISOString().split('T')[0];
        if (d !== exactDate) return false;
      }
      return true;
    });
  }, [baseBills, shopMap, cityFilter, salonFilter, allowedSalonIds, exactDate]);

  const filteredAppts = useMemo(() => {
    return baseAppts.filter((a) => {
      const shop = shopMap.get(a.shop_id);
      if (cityFilter !== 'all' && shop?.city?.toLowerCase() !== cityFilter.toLowerCase()) return false;
      if (salonFilter !== 'all' && !allowedSalonIds.includes(a.shop_id)) return false;
      if (exactDate) {
        const d = new Date(a.starts_at || a.created_at).toISOString().split('T')[0];
        if (d !== exactDate) return false;
      }
      return true;
    });
  }, [baseAppts, shopMap, cityFilter, salonFilter, allowedSalonIds, exactDate]);

  const filteredDeletions = useMemo(() => {
    return baseDeletions.filter((d) => {
      if (exactDate) {
        const dateStr = d.created_at || d.deleted_at || '';
        if (!dateStr) return false;
        const day = new Date(dateStr).toISOString().split('T')[0];
        if (day !== exactDate) return false;
      }
      return true;
    });
  }, [baseDeletions, exactDate]);

  // Reset Filters
  const resetFilters = () => {
    setCityFilter('all');
    setSalonFilter('all');
    setExactDate('');
    setDatePreset('all');
  };

  const isAnyFilterActive = cityFilter !== 'all' || salonFilter !== 'all' || exactDate !== '' || datePreset !== 'all';

  // Dynamic Filename suffix
  const scopeSuffix = useMemo(() => {
    if (salonFilter !== 'all') {
      const s = shopMap.get(salonFilter);
      return `_${(s?.name || 'salon').toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    }
    if (cityFilter !== 'all') {
      return `_${cityFilter.toLowerCase()}`;
    }
    return '';
  }, [salonFilter, cityFilter, shopMap]);

  const scopeLabel = useMemo(() => {
    if (salonFilter !== 'all') {
      const s = shopMap.get(salonFilter);
      return `for ${s?.name || 'Salon'}`;
    }
    if (cityFilter !== 'all') {
      return `for ${cityFilter}`;
    }
    return '';
  }, [salonFilter, cityFilter, shopMap]);

  // Aggregate monthly/daily salons report
  const salonReportRows = useMemo(() => {
    return filteredShops.map((s) => ({
      id: s.id,
      name: s.name,
      phone: s.phone || '—',
      city: s.city || '—',
      address: s.address || '—',
      staff_count: s.staff_count ?? 0,
      customer_count: s.customer_count ?? 0,
      bill_count: s.bill_count ?? 0,
      created_at: formatDateTime(s.created_at),
    }));
  }, [filteredShops]);

  // Aggregate billing report
  const billingReportRows = useMemo(() => {
    return filteredBills.map((b) => {
      const shop = shopMap.get(b.shop_id);
      return {
        invoice_number: b.invoice_number,
        salon: b.shop?.name || shop?.name || b.shop_id,
        city: shop?.city || '—',
        amount: formatCurrency(b.total_minor),
        status: b.status,
        issued_at: formatDateTime(b.issued_at),
      };
    });
  }, [filteredBills, shopMap]);

  // Aggregate appointments report
  const appointmentReportRows = useMemo(() => {
    return filteredAppts.map((a) => {
      const shop = shopMap.get(a.shop_id);
      return {
        id: a.id,
        salon: shop?.name || a.shop_id,
        city: shop?.city || '—',
        customer: a.customer?.name || 'Walk-in',
        duration_minutes: a.duration_minutes,
        status: a.status,
        starts_at: formatDateTime(a.starts_at),
      };
    });
  }, [filteredAppts, shopMap]);

  // Aggregate deletions report
  const deletionReportRows = useMemo(() => {
    return filteredDeletions.map((d) => ({
      id: d.id,
      salon: d.shop_name || '—',
      phone: d.phone || '—',
      reason: d.reason || 'Unspecified',
      status: d.status,
      deleted_at: formatDateTime(d.deleted_at),
    }));
  }, [filteredDeletions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-black text-white shadow-xs">
            <FileBarChart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">
              Audit &amp; Intelligence Reports
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Generate and download scoped analytical reports for a single salon, specific city, or platform-wide.
            </p>
          </div>
        </div>

        {/* Dynamic Export Button for current report */}
        <div className="flex items-center gap-2">
          {reportType === 'salons' && (
            <ExportButton
              data={salonReportRows}
              filename={`counterpro_salons_report${scopeSuffix}`}
              label={`Download Salons Report ${scopeLabel}`}
            />
          )}
          {reportType === 'financial' && (
            <ExportButton
              data={billingReportRows}
              filename={`counterpro_financial_report${scopeSuffix}`}
              label={`Download Financial Report ${scopeLabel}`}
            />
          )}
          {reportType === 'appointments' && (
            <ExportButton
              data={appointmentReportRows}
              filename={`counterpro_appointments_report${scopeSuffix}`}
              label={`Download Bookings Report ${scopeLabel}`}
            />
          )}
          {reportType === 'deletions' && (
            <ExportButton
              data={deletionReportRows}
              filename={`counterpro_deletions_report${scopeSuffix}`}
              label={`Download Deletions Report ${scopeLabel}`}
            />
          )}
        </div>
      </div>

      {/* Filter Toolbar: City, Single Salon, Date, Presets */}
      <div className="p-4 rounded-2xl border border-neutral-200 bg-white shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-900">
            <Sparkles className="w-4 h-4 text-black" />
            <span>Scope Targeting (Filter by City, Special Salon, or Exact Date)</span>
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
                    ? 'bg-black text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                {p === '7d' ? 'Last 7 Days' : p === '30d' ? 'Last 30 Days' : p}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. City Filter (e.g. Coimbatore) */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-neutral-400" />
              <span>City / Region (e.g. Coimbatore)</span>
            </label>
            <select
              value={cityFilter}
              onChange={(e) => {
                setCityFilter(e.target.value);
                if (e.target.value !== 'all') setSalonFilter('all');
              }}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 focus:outline-none focus:border-black transition-all"
            >
              <option value="all">All Cities ({uniqueCities.length})</option>
              {uniqueCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Target Single Salon */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-neutral-400" />
              <span>Target Single Salon</span>
            </label>
            <select
              value={salonFilter}
              onChange={(e) => setSalonFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 focus:outline-none focus:border-black transition-all"
            >
              <option value="all">All Salons ({deduplicatedShops.length})</option>
              {deduplicatedShops
                .filter((s) => (cityFilter === 'all' ? true : s.city?.toLowerCase() === cityFilter.toLowerCase()))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.city || 'Tamil Nadu'})
                  </option>
                ))}
            </select>
          </div>

          {/* 3. Exact Date */}
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
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 focus:outline-none focus:border-black transition-all"
            />
          </div>
        </div>

        {/* Clear Filters */}
        {isAnyFilterActive && (
          <div className="flex items-center justify-between pt-2 text-xs border-t border-neutral-100">
            <span className="text-neutral-500 font-medium">
              Filtered Scope: <span className="font-bold text-black">{scopeLabel || 'Custom Selection'}</span>
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

      {/* Report Categories Navigation */}
      <div className="flex items-center gap-2 border-b border-neutral-200 pb-3 overflow-x-auto text-xs">
        {[
          { id: 'salons', label: `Salon Registrations (${filteredShops.length})`, icon: Store },
          { id: 'financial', label: `Billing & Revenue (${filteredBills.length})`, icon: CreditCard },
          { id: 'appointments', label: `Appointments Volume (${filteredAppts.length})`, icon: Calendar },
          { id: 'deletions', label: `Account Deletions (${filteredDeletions.length})`, icon: UserX },
          { id: 'unavailable', label: 'App / Telemetry / Trials Reports', icon: FileBarChart },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = reportType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id as any)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-black text-white shadow-xs'
                  : 'bg-white text-neutral-600 hover:text-black border border-neutral-200 hover:border-black'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Salon Registrations Report */}
      {reportType === 'salons' && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900">
              Salon Registrations &amp; Density Report {scopeLabel}
            </h3>
            <span className="text-xs font-mono font-bold text-neutral-900">
              {filteredShops.length} Registered Salons
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-50 text-neutral-500 font-mono uppercase tracking-wider text-[11px] border-y border-neutral-200">
                <tr>
                  <th className="px-4 py-3">Salon Name</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Staff</th>
                  <th className="px-4 py-3">Clients</th>
                  <th className="px-4 py-3">Bills</th>
                  <th className="px-4 py-3">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-sans">
                {salonReportRows.map((row) => (
                  <tr key={row.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="px-4 py-3 font-bold text-neutral-900">{row.name}</td>
                    <td className="px-4 py-3 text-neutral-700">{row.city}</td>
                    <td className="px-4 py-3 font-mono text-neutral-700">{row.phone}</td>
                    <td className="px-4 py-3 font-mono font-bold text-neutral-900">{row.staff_count}</td>
                    <td className="px-4 py-3 font-mono font-bold text-neutral-900">{row.customer_count}</td>
                    <td className="px-4 py-3 font-mono font-bold text-neutral-900">{row.bill_count}</td>
                    <td className="px-4 py-3 font-mono text-neutral-500">{row.created_at}</td>
                  </tr>
                ))}
                {salonReportRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-neutral-400">
                      No salons match the selected city, salon, or date criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Billing & Financial Report */}
      {reportType === 'financial' && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900">
              Financial &amp; Invoiced Revenue Report {scopeLabel}
            </h3>
            <span className="text-xs font-mono font-bold text-neutral-900">
              {filteredBills.length} Invoiced Bills
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-50 text-neutral-500 font-mono uppercase tracking-wider text-[11px] border-y border-neutral-200">
                <tr>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Salon Business</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Billed Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Issued Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-sans">
                {billingReportRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-neutral-900">{row.invoice_number}</td>
                    <td className="px-4 py-3 font-semibold text-neutral-900">{row.salon}</td>
                    <td className="px-4 py-3 text-neutral-700">{row.city}</td>
                    <td className="px-4 py-3 font-mono font-bold text-neutral-900">{row.amount}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-neutral-100 text-neutral-800 border border-neutral-200">
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-neutral-500">{row.issued_at}</td>
                  </tr>
                ))}
                {billingReportRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                      No invoices recorded for the selected city or salon.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Appointments Volume Report */}
      {reportType === 'appointments' && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900">
              Appointments &amp; Booking Volume {scopeLabel}
            </h3>
            <span className="text-xs font-mono font-bold text-neutral-900">
              {filteredAppts.length} Booking Entries
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-50 text-neutral-500 font-mono uppercase tracking-wider text-[11px] border-y border-neutral-200">
                <tr>
                  <th className="px-4 py-3">Salon</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Appointment Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-sans">
                {appointmentReportRows.map((row) => (
                  <tr key={row.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="px-4 py-3 font-semibold text-neutral-900">{row.salon}</td>
                    <td className="px-4 py-3 text-neutral-700">{row.city}</td>
                    <td className="px-4 py-3 font-bold text-neutral-900">{row.customer}</td>
                    <td className="px-4 py-3 font-mono text-neutral-700">{row.duration_minutes} mins</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-neutral-100 text-neutral-800 border border-neutral-200">
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-neutral-500">{row.starts_at}</td>
                  </tr>
                ))}
                {appointmentReportRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                      No appointment records found matching the active scope.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Account Deletions Report */}
      {reportType === 'deletions' && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900">
              Platform Account Deletions Compliance Log
            </h3>
            <span className="text-xs font-mono font-bold text-neutral-900">
              {filteredDeletions.length} Records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-50 text-neutral-500 font-mono uppercase tracking-wider text-[11px] border-y border-neutral-200">
                <tr>
                  <th className="px-4 py-3">Salon / User</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Executed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-sans">
                {deletionReportRows.map((row) => (
                  <tr key={row.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="px-4 py-3 font-bold text-neutral-900">{row.salon}</td>
                    <td className="px-4 py-3 font-mono text-neutral-700">{row.phone}</td>
                    <td className="px-4 py-3 text-neutral-700">{row.reason}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#0D9488]/10 text-black border border-[#0D9488]/20">
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-neutral-500">{row.deleted_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Unavailable Tables */}
      {reportType === 'unavailable' && (
        <UnavailableBanner
          title="SaaS Subscriptions & Mobile Crash BI Not Yet Formatted"
          sourceTable="App Versions & Device Telemetry"
          message="CounterPro app crash dumps and direct Google Play subscription receipts are not aggregated in a separate report table. Live billing and transaction logs are available in the financial report."
        />
      )}
    </div>
  );
};
