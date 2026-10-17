import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Activity,
  Wifi,
  Server,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Terminal,
  Layers,
  Search,
  Eye,
  Store,
  Filter,
  Building2,
  MapPin,
  Users,
  Receipt,
  MessageCircle,
  Phone,
  Sparkles,
  X,
  Calendar,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { DataTable, Column } from '../common/DataTable';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { ExportButton } from '../common/ExportButton';
import { KPICard } from '../common/KPICard';
import { checkSupabaseConnection, SUPABASE_URL } from '../../services/supabase';
import { formatDateTime } from '../../utils/dateUtils';
import { SystemHealthRecord, SystemLogRecord, Shop, Bill } from '../../types/database';

export interface SalonHealthMetric {
  shop: Shop;
  id: string;
  name: string;
  city: string;
  phone: string;
  staffCount: number;
  billCount: number;
  customerCount: number;
  appointmentCount: number;
  healthScore: number;
  status: 'thriving' | 'attention' | 'at_risk';
  healthLabel: string;
  insights: string;
  created_at: string;
}

interface SystemHealthViewProps {
  healthRecords?: SystemHealthRecord[];
  logs?: SystemLogRecord[];
  shops?: Shop[];
  bills?: Bill[];
  loading?: boolean;
  onRefresh?: () => void;
  onSelectSalon?: (shop: Shop) => void;
}

export const SystemHealthView: React.FC<SystemHealthViewProps> = ({
  healthRecords = [],
  logs = [],
  shops = [],
  bills = [],
  loading = false,
  onRefresh,
  onSelectSalon,
}) => {
  const [latency, setLatency] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<string>(new Date().toLocaleTimeString());
  const [connectionStatus, setConnectionStatus] = useState<'healthy' | 'degraded' | 'down'>('healthy');

  // Tabs: salon_health is the primary default tab
  const [activeTab, setActiveTab] = useState<'salon_health' | 'components' | 'logs'>('salon_health');
  
  // Salon Health Filter States
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [healthStatusFilter, setHealthStatusFilter] = useState<'all' | 'thriving' | 'attention' | 'at_risk'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [exactDate, setExactDate] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'yesterday' | '7d' | '30d'>('all');

  // Infrastructure log filters
  const [logLevelFilter, setLogLevelFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const [selectedLog, setSelectedLog] = useState<SystemLogRecord | null>(null);
  const [selectedHealth, setSelectedHealth] = useState<SystemHealthRecord | null>(null);

  // Connection ping
  const runPing = async () => {
    setIsChecking(true);
    const res = await checkSupabaseConnection();
    setLatency(res.latencyMs);
    setConnectionStatus(res.ok ? (res.latencyMs < 600 ? 'healthy' : 'degraded') : 'down');
    setLastCheckTime(new Date().toLocaleTimeString());
    setIsChecking(false);
  };

  useEffect(() => {
    runPing();
    const interval = setInterval(runPing, 30000);
    return () => clearInterval(interval);
  }, []);

  // Deduplicate shops first
  const deduplicatedShops = useMemo(() => {
    const seen = new Set<string>();
    return shops.filter((s) => {
      const norm = s.name.trim().toLowerCase();
      if (seen.has(norm)) return false;
      seen.add(norm);
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [shops]);

  // Unique Cities
  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    shops.forEach((s) => {
      if (s.city && s.city.trim()) set.add(s.city.trim());
    });
    return Array.from(set).sort();
  }, [shops]);

  // Calculate algorithmic Health Metrics for each Salon Shop
  const salonHealthMetrics: SalonHealthMetric[] = useMemo(() => {
    return deduplicatedShops.map((shop) => {
      const staffCount = shop.staff_count ?? 0;
      const billCount = shop.bill_count ?? 0;
      const customerCount = shop.customer_count ?? 0;
      const appointmentCount = shop.appointment_count ?? 0;

      // Score algorithm: 0 to 100
      let score = 0;
      if (staffCount >= 1) score += 25;
      if (staffCount >= 3) score += 5;
      if (billCount >= 1) score += 25;
      if (billCount >= 5) score += 15;
      if (billCount >= 20) score += 5;
      if (customerCount >= 1) score += 15;
      if (customerCount >= 10) score += 5;
      if (appointmentCount >= 1) score += 5;

      // Clamp score
      score = Math.min(100, Math.max(0, score));

      let status: 'thriving' | 'attention' | 'at_risk' = 'at_risk';
      let healthLabel = 'At Risk / Stalled';
      let insights = 'Requires onboarding intervention';

      if (score >= 65) {
        status = 'thriving';
        healthLabel = 'Thriving & Active';
        insights = 'Active team and billing cadence';
      } else if (score >= 35) {
        status = 'attention';
        healthLabel = 'Needs Attention';
        insights = staffCount === 0 ? 'Team not added yet' : 'Low invoice frequency';
      } else {
        status = 'at_risk';
        healthLabel = 'At Risk / Incomplete';
        insights = 'Zero staff and zero bills generated';
      }

      return {
        shop,
        id: shop.id,
        name: shop.name,
        city: shop.city || 'Tamil Nadu',
        phone: shop.phone || shop.owner_profile?.phone || '',
        staffCount,
        billCount,
        customerCount,
        appointmentCount,
        healthScore: score,
        status,
        healthLabel,
        insights,
        created_at: shop.created_at,
      };
    });
  }, [deduplicatedShops]);

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

  // Filtered Salon Health Items
  const filteredSalonHealth = useMemo(() => {
    return salonHealthMetrics.filter((item) => {
      // 1. City Filter
      if (cityFilter !== 'all' && item.city.toLowerCase() !== cityFilter.toLowerCase()) {
        return false;
      }

      // 2. Health Status
      if (healthStatusFilter !== 'all' && item.status !== healthStatusFilter) {
        return false;
      }

      // 3. Exact Date
      if (exactDate) {
        if (!item.created_at) return false;
        const d = new Date(item.created_at).toISOString().split('T')[0];
        if (d !== exactDate) return false;
      }

      // 4. Presets
      if (!exactDate && datePreset !== 'all') {
        if (!item.created_at) return false;
        const t = new Date(item.created_at).getTime();
        const now = Date.now();
        if (datePreset === '7d' && now - t > 7 * 86400000) return false;
        if (datePreset === '30d' && now - t > 30 * 86400000) return false;
      }

      // 5. Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = item.name.toLowerCase().includes(q);
        const cityMatch = item.city.toLowerCase().includes(q);
        const phoneMatch = item.phone.includes(q);
        if (!nameMatch && !cityMatch && !phoneMatch) return false;
      }

      return true;
    });
  }, [salonHealthMetrics, cityFilter, healthStatusFilter, exactDate, datePreset, searchQuery]);

  const resetFilters = () => {
    setCityFilter('all');
    setHealthStatusFilter('all');
    setExactDate('');
    setDatePreset('all');
    setSearchQuery('');
  };

  const isAnyFilterActive =
    cityFilter !== 'all' ||
    healthStatusFilter !== 'all' ||
    exactDate !== '' ||
    datePreset !== 'all' ||
    searchQuery.trim() !== '';

  // Stats
  const totalSalons = salonHealthMetrics.length;
  const thrivingCount = salonHealthMetrics.filter((s) => s.status === 'thriving').length;
  const attentionCount = salonHealthMetrics.filter((s) => s.status === 'attention').length;
  const atRiskCount = salonHealthMetrics.filter((s) => s.status === 'at_risk').length;
  const avgHealthScore =
    totalSalons > 0 ? Math.round(salonHealthMetrics.reduce((acc, s) => acc + s.healthScore, 0) / totalSalons) : 0;

  // Columns for Salon Health Table
  const salonHealthColumns: Column<SalonHealthMetric>[] = [
    {
      key: 'name',
      header: 'Salon Business & City',
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-black text-white font-bold text-xs flex items-center justify-center shrink-0">
            {item.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-neutral-900">{item.name}</div>
            <div className="text-[11px] text-neutral-500 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-neutral-400" />
              <span>{item.city}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'healthScore',
      header: 'Health Score & Vitality',
      render: (item) => {
        let barColor = 'bg-black';
        let badgeClass = 'bg-neutral-100 text-neutral-900 border-neutral-300';
        if (item.status === 'thriving') {
          badgeClass = 'bg-black text-white border-black';
        } else if (item.status === 'attention') {
          badgeClass = 'bg-neutral-200 text-neutral-900 border-neutral-400';
        } else {
          badgeClass = 'bg-neutral-100 text-neutral-600 border-neutral-200';
        }

        return (
          <div className="space-y-1.5 min-w-[150px]">
            <div className="flex items-center justify-between text-xs">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}`}>
                {item.healthLabel}
              </span>
              <span className="font-mono font-bold text-neutral-900">{item.healthScore}%</span>
            </div>
            <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden border border-neutral-200">
              <div
                className={`h-full ${barColor} transition-all duration-500`}
                style={{ width: `${item.healthScore}%` }}
              />
            </div>
            <p className="text-[10px] text-neutral-400 truncate">{item.insights}</p>
          </div>
        );
      },
    },
    {
      key: 'metrics',
      header: 'Operational Metrics',
      render: (item) => (
        <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
          <div className="p-1.5 rounded-lg bg-neutral-50 border border-neutral-200">
            <span className="text-[10px] text-neutral-500 block">Staff</span>
            <span className="font-bold text-neutral-900">{item.staffCount}</span>
          </div>
          <div className="p-1.5 rounded-lg bg-neutral-50 border border-neutral-200">
            <span className="text-[10px] text-neutral-500 block">Bills</span>
            <span className="font-bold text-neutral-900">{item.billCount}</span>
          </div>
          <div className="p-1.5 rounded-lg bg-neutral-50 border border-neutral-200">
            <span className="text-[10px] text-neutral-500 block">Clients</span>
            <span className="font-bold text-neutral-900">{item.customerCount}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Owner Contact & Outreach',
      render: (item) => {
        const cleanPhone = (item.phone || '').replace(/\D/g, '');
        const waNumber = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        const waMessage = `Hi ${item.name} team, this is CounterPro Admin. We noticed your salon's onboarding health score is ${item.healthScore}%. Would you like any assistance optimizing your staff roster or billing setup?`;

        return (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-neutral-800">
              {item.phone || 'No phone'}
            </span>
            {cleanPhone.length >= 10 && (
              <a
                href={`https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-black text-white text-[11px] font-semibold hover:bg-neutral-800 transition-colors shadow-xs"
                title="Send WhatsApp Health & Support Message"
              >
                <MessageCircle className="w-3 h-3" />
                <span>Nudge</span>
              </a>
            )}
            {cleanPhone.length >= 10 && (
              <a
                href={`tel:${cleanPhone}`}
                className="p-1 rounded-md bg-neutral-100 hover:bg-black hover:text-white text-neutral-700 transition-colors"
                title="Call Salon"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Tracking Action',
      render: (item) => (
        <button
          onClick={() => onSelectSalon && onSelectSalon(item.shop)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-neutral-100 text-neutral-900 hover:bg-black hover:text-white transition-colors"
        >
          <span>Inspect</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      ),
    },
  ];

  // Infrastructure log stats
  const filteredLogs = useMemo(() => {
    if (logLevelFilter === 'all') return logs;
    return logs.filter((l) => l.level?.toLowerCase() === logLevelFilter);
  }, [logs, logLevelFilter]);

  const errorLogsCount = useMemo(() => {
    return logs.filter((l) => l.level?.toLowerCase() === 'error' || l.level?.toLowerCase() === 'fatal').length;
  }, [logs]);

  // Infrastructure Columns
  const healthColumns: Column<SystemHealthRecord>[] = [
    {
      key: 'component',
      header: 'Component / Service',
      render: (r) => (
        <div className="font-semibold text-neutral-900 flex items-center gap-2">
          <Server className="w-3.5 h-3.5 text-neutral-800" />
          <span>{r.component}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => {
        const isOp = r.status?.toLowerCase() === 'operational' || r.status?.toLowerCase() === 'healthy';
        const isDegraded = r.status?.toLowerCase() === 'degraded' || r.status?.toLowerCase() === 'warn';
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider border ${
              isOp
                ? 'bg-neutral-100 text-neutral-900 border-neutral-300'
                : isDegraded
                ? 'bg-neutral-200 text-neutral-900 border-neutral-400'
                : 'bg-black text-white border-black'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isOp ? 'bg-[#0D9488]' : isDegraded ? 'bg-black/50' : 'bg-black'
              }`}
            />
            <span>{r.status || 'unknown'}</span>
          </span>
        );
      },
    },
    {
      key: 'salon',
      header: 'Salon / Scope',
      render: (r) => {
        const shop = r.shop_id ? shops.find((s) => s.id === r.shop_id) : null;
        return (
          <span className="text-xs text-neutral-700">
            {shop ? shop.name : r.shop_id ? `Shop #${r.shop_id.slice(0, 8)}` : 'Platform Global'}
          </span>
        );
      },
    },
    {
      key: 'latency_ms',
      header: 'Latency',
      render: (r) => (
        <span className="font-mono text-xs text-neutral-600">
          {r.latency_ms != null ? `${r.latency_ms} ms` : '—'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Timestamp',
      render: (r) => (
        <span className="font-mono text-xs text-neutral-500">
          {formatDateTime(r.created_at || r.timestamp || '')}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#0D9488] text-white shadow-xs">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Salon Shop Health &amp; Diagnostics
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live tracking matrix measuring performance across {totalSalons} registered salon locations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Button for Salon Health */}
          <ExportButton
            data={filteredSalonHealth}
            filename={`counterpro_salon_health_report${cityFilter !== 'all' ? `_${cityFilter.toLowerCase()}` : ''}`}
            label={`Download Health Report ${cityFilter !== 'all' ? `(${cityFilter})` : ''}`}
            columns={[
              { key: 'name', label: 'Salon Name' },
              { key: 'city', label: 'City' },
              { key: 'phone', label: 'Phone' },
              { key: 'healthScore', label: 'Health Score (%)' },
              { key: 'healthLabel', label: 'Health Status' },
              { key: 'staffCount', label: 'Staff Count' },
              { key: 'billCount', label: 'Bill Count' },
              { key: 'customerCount', label: 'Customer Count' },
              { key: 'created_at', label: 'Registered Date' },
            ]}
          />

          <button
            onClick={() => {
              runPing();
              onRefresh?.();
            }}
            disabled={isChecking}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:text-slate-900 hover:border-slate-300 transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>Re-evaluate</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Cards for Salon Shops Health */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPICard
          title="Total Salon Shops"
          value={totalSalons}
          subtitle="Active connected locations"
          icon={Building2}
          tone="brand"
        />
        <KPICard
          title="Thriving & Active"
          value={thrivingCount}
          subtitle="Staff & billing cadence active"
          icon={CheckCircle2}
          tone="signup"
        />
        <KPICard
          title="Needs Attention"
          value={attentionCount}
          subtitle="Missing staff or low bills"
          icon={AlertTriangle}
          tone="order-warn"
        />
        <KPICard
          title="Avg Health Score"
          value={`${avgHealthScore}%`}
          subtitle="Network vitality index"
          icon={TrendingUp}
          tone="revenue"
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('salon_health')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'salon_health'
              ? 'bg-[#0D9488] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Salon Shops Health Matrix ({filteredSalonHealth.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('components')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'components'
              ? 'bg-[#0D9488] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>Cloud &amp; Database Health ({healthRecords.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-[#0D9488] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Diagnostic System Logs ({logs.length})</span>
        </button>
      </div>

      {/* TAB 1: SALON SHOPS HEALTH MATRIX */}
      {activeTab === 'salon_health' && (
        <div className="space-y-4">
          {/* Filter Toolbar: City, Health Level, Exact Date, Presets */}
          <div className="panel space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                <Filter className="w-3.5 h-3.5 text-[#0D9488]" />
                <span>Filter Salon Shops by Region &amp; Performance</span>
              </div>

              {/* Quick Date Presets */}
              <div className="segmented-control">
                {(['all', 'today', 'yesterday', '7d', '30d'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePreset(p)}
                    className={`segment capitalize ${datePreset === p && !exactDate ? 'active' : ''}`}
                  >
                    {p === '7d' ? 'Last 7 Days' : p === '30d' ? 'Last 30 Days' : p}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* 1. Search */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Search Salon
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Name, city, phone..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/70 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0D9488] focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* 2. City Filter (e.g. Coimbatore) */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#0D9488]" />
                  <span>City / Region (e.g. Coimbatore)</span>
                </label>
                <select
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/70 text-slate-900 focus:outline-none focus:border-[#0D9488] transition-all"
                >
                  <option value="all">All Cities ({uniqueCities.length})</option>
                  {uniqueCities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Health Level Filter */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-[#0D9488]" />
                  <span>Health Classification</span>
                </label>
                <select
                  value={healthStatusFilter}
                  onChange={(e) => setHealthStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/70 text-slate-900 focus:outline-none focus:border-[#0D9488] transition-all"
                >
                  <option value="all">All Health Tiers</option>
                  <option value="thriving">Thriving &amp; Active (&gt;65%)</option>
                  <option value="attention">Needs Attention (35% - 65%)</option>
                  <option value="at_risk">At Risk / Stalled (&lt;35%)</option>
                </select>
              </div>

              {/* 4. Exact Registration Date */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#0D9488]" />
                  <span>Exact Registration Date</span>
                </label>
                <input
                  type="date"
                  value={exactDate}
                  onChange={(e) => {
                    setExactDate(e.target.value);
                    setDatePreset('all');
                  }}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/70 text-slate-900 focus:outline-none focus:border-[#0D9488] transition-all"
                />
              </div>
            </div>

            {/* Clear Filters */}
            {isAnyFilterActive && (
              <div className="flex items-center justify-between pt-2 text-xs border-t border-slate-100">
                <span className="text-slate-500 font-medium">
                  Showing <span className="font-semibold text-slate-900">{filteredSalonHealth.length}</span> matching salon health entries
                </span>
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear All Filters</span>
                </button>
              </div>
            )}
          </div>

          {/* Salon Health Data Table */}
          <DataTable
            columns={salonHealthColumns}
            data={filteredSalonHealth}
            loading={loading}
            emptyTitle="No salon shops match the filters"
            emptyDescription="Try selecting All Cities or clearing the date filter."
            searchPlaceholder="Search salon shops..."
            searchFields={['name', 'city', 'phone']}
            defaultSortField="healthScore"
            defaultSortOrder="desc"
          />
        </div>
      )}

      {/* TAB 2: CLOUD & DATABASE NODES */}
      {activeTab === 'components' && (
        <div className="space-y-4">
          {/* Infrastructure Banner */}
          <div className="p-4 rounded-2xl border border-neutral-200 bg-white shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-black text-white">
                <Wifi className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-neutral-500">Live API Round-Trip Latency</div>
                <div className="text-2xl font-black font-mono text-neutral-900">
                  {latency !== null ? `${latency} ms` : 'Measuring...'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500">Last Verified:</span>
              <span className="font-mono text-xs font-bold text-neutral-800">{lastCheckTime}</span>
            </div>
          </div>

          <DataTable
            columns={healthColumns}
            data={healthRecords}
            loading={loading}
            emptyTitle="No component records found"
            emptyDescription="All system component health checks are operational."
            searchPlaceholder="Search component or node..."
            searchFields={['component', 'status']}
          />
        </div>
      )}

      {/* TAB 3: DIAGNOSTIC LOGS */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <select
              value={logLevelFilter}
              onChange={(e) => setLogLevelFilter(e.target.value as any)}
              className="px-3 py-1.5 text-xs rounded-xl border border-neutral-200 bg-white font-semibold text-neutral-800"
            >
              <option value="all">All Log Levels</option>
              <option value="error">Errors Only</option>
              <option value="warn">Warnings Only</option>
              <option value="info">Info Only</option>
            </select>
            <span className="text-xs text-neutral-500">
              {errorLogsCount} critical issues captured
            </span>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-xs">
            <div className="divide-y divide-neutral-100 font-mono text-xs">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="p-3 hover:bg-neutral-50 flex items-center justify-between gap-4 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        log.level === 'error'
                          ? 'bg-[#0D9488] text-white border border-[#0D9488]'
                          : log.level === 'warn'
                          ? 'bg-[#0D9488]/15 text-[#0D9488] border border-[#0D9488]/30'
                          : 'bg-[#0D9488]/10 text-black'
                      }`}
                    >
                      {log.level}
                    </span>
                    <span className="font-semibold text-neutral-900 truncate">{log.message}</span>
                  </div>
                  <span className="text-neutral-400 text-[11px] shrink-0">
                    {formatDateTime(log.created_at)}
                  </span>
                </div>
              ))}
              {filteredLogs.length === 0 && (
                <div className="p-8 text-center text-neutral-400">No diagnostic logs found matching the filter.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Diagnostic Log Detail Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title="Diagnostic Log Details"
        >
          <div className="space-y-4 text-xs font-mono">
            <div>
              <span className="text-neutral-400 block mb-1">Message</span>
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 font-semibold">
                {selectedLog.message}
              </div>
            </div>
            {selectedLog.stack_trace && (
              <div>
                <span className="text-neutral-400 block mb-1">Stack Trace</span>
                <pre className="p-3 rounded-xl bg-black text-white overflow-x-auto text-[11px]">
                  {selectedLog.stack_trace}
                </pre>
              </div>
            )}
            {selectedLog.context && (
              <div>
                <span className="text-neutral-400 block mb-1">Context</span>
                <pre className="p-3 rounded-xl bg-neutral-100 text-neutral-900 overflow-x-auto text-[11px]">
                  {JSON.stringify(selectedLog.context, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
