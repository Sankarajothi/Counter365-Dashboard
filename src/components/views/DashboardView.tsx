import React, { useState, useMemo } from 'react';
import {
  Store,
  Users,
  Scissors,
  CreditCard,
  CalendarCheck,
  UserX,
  MessageSquare,
  ChevronRight,
  TrendingUp,
  Shield,
  Filter,
  Search,
  RotateCcw,
  Building2,
  Activity,
  Layers,
  Calendar,
  DollarSign,
  Receipt,
  Clock,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Check,
  Sliders,
  Wallet,
  MapPin,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { KPICard } from '../common/KPICard';
import { StatusBadge } from '../common/StatusBadge';
import { ExportButton } from '../common/ExportButton';
import { useDateFilter } from '../../context/DateFilterContext';
import { filterByDateRange, formatDateTime, formatDate } from '../../utils/dateUtils';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import {
  Shop,
  Profile,
  Staff,
  Customer,
  Bill,
  Payment,
  Appointment,
  AccountDeletion,
  SupportMessage,
} from '../../types/database';
import { DateFilterOption, NavView } from '../../types/dashboard';

interface DashboardViewProps {
  shops: Shop[];
  profiles: Profile[];
  staff: Staff[];
  customers: Customer[];
  bills: Bill[];
  payments: Payment[];
  appointments?: Appointment[];
  deletions?: AccountDeletion[];
  supportMessages?: SupportMessage[];
  subscriptions?: any[];
  loading?: boolean;
  onNavigate: (view: NavView) => void;
  onSelectSalon?: (shop: Shop) => void;
  onNavigateToStylists?: () => void;
  onOpenPrivacyPolicy?: () => void;
  onOpenDeleteAccount?: () => void;
  initialTab?: 'overview' | 'daily_ledger' | 'all_bills' | 'salon_breakdown' | 'subscription_revenue';
}

// Brand Design System Palette: Classic Teal & Slate
const CHART_PALETTE = ['#0D9488', '#0F766E', '#14B8A6', '#2DD4BF', '#99F6E4', '#0F172A'];

const Metric: React.FC<{ label: string; value: string; sub?: string; onClick?: () => void }> = ({
  label,
  value,
  sub,
  onClick,
}) => (
  <div
    onClick={onClick}
    className={`px-4 py-3 min-w-0 ${onClick ? 'cursor-pointer hover:bg-slate-50 transition-colors' : ''}`}
  >
    <div className="text-[11px] text-slate-500 truncate">{label}</div>
    <div className="text-lg font-semibold text-slate-900 tabular-nums truncate">{value}</div>
    {sub && <div className="text-[11px] text-slate-400 truncate">{sub}</div>}
  </div>
);

export const DashboardView: React.FC<DashboardViewProps> = ({
  shops,
  profiles,
  staff,
  customers,
  bills,
  payments,
  appointments = [],
  deletions = [],
  supportMessages = [],
  subscriptions = [],
  loading = false,
  onNavigate,
  onSelectSalon,
  onNavigateToStylists,
  onOpenPrivacyPolicy,
  onOpenDeleteAccount,
  initialTab = 'daily_ledger',
}) => {
  const { dateRange, selectedOption, setSelectedOption, setCustomRange } = useDateFilter();

  // Multi-Attribute Filter State
  const [selectedSalonFilter, setSelectedSalonFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [segmentFilter, setSegmentFilter] = useState<'all' | 'with_staff' | 'with_appts' | 'deduplicated'>('all');
  const [exactDateInput, setExactDateInput] = useState<string>('');
  const [billStatusFilter, setBillStatusFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'daily_ledger' | 'all_bills' | 'salon_breakdown' | 'subscription_revenue'>(initialTab);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [billsPageSize, setBillsPageSize] = useState<number>(10);
  const [billsPage, setBillsPage] = useState<number>(1);

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Determine Effective Date Range
  const effectiveDateRange = useMemo(() => {
    if (exactDateInput.trim()) {
      const parts = exactDateInput.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const start = new Date(year, month, day, 0, 0, 0, 0);
        const end = new Date(year, month, day, 23, 59, 59, 999);
        return {
          startDate: start,
          endDate: end,
          label: `Exact Date: ${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
        };
      }
    }
    return dateRange;
  }, [exactDateInput, dateRange]);

  // Unique Payment Methods from Database
  const availablePaymentMethods = useMemo(() => {
    const set = new Set<string>();
    payments.forEach((p) => {
      const m = p.method || p.payment_method;
      if (m) set.add(m.toUpperCase());
    });
    return Array.from(set);
  }, [payments]);

  // Map of bill_id -> Payment
  const paymentByBillId = useMemo(() => {
    const map = new Map<string, Payment>();
    payments.forEach((p) => {
      if (p.bill_id) {
        map.set(p.bill_id, p);
      }
    });
    return map;
  }, [payments]);

  // Base Filtered Salons
  const baseFilteredShops = useMemo(() => {
    return shops.filter((s) => {
      if (selectedSalonFilter !== 'all' && s.id !== selectedSalonFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesCity = (s.city || '').toLowerCase().includes(q);
        const matchesPhone = (s.phone || '').includes(q);
        if (!matchesName && !matchesCity && !matchesPhone) return false;
      }
      if (segmentFilter === 'with_staff' && (!s.staff_count || s.staff_count === 0)) return false;
      if (segmentFilter === 'with_appts') {
        const hasAppts = (s.appointment_count && s.appointment_count > 0) || appointments.some((a) => a.shop_id === s.id);
        if (!hasAppts) return false;
      }
      if (segmentFilter === 'deduplicated' && (!s.duplicate_count || s.duplicate_count === 0)) return false;
      return true;
    });
  }, [shops, selectedSalonFilter, searchQuery, segmentFilter, appointments]);

  const filteredShops = useMemo(
    () => filterByDateRange(baseFilteredShops, 'created_at', effectiveDateRange),
    [baseFilteredShops, effectiveDateRange]
  );

  const matchingShopIds = useMemo(() => {
    if (selectedSalonFilter === 'all') return null;
    const selectedShopObj = shops.find((s) => s.id === selectedSalonFilter);
    return new Set(selectedShopObj?.duplicate_ids ? selectedShopObj.duplicate_ids : [selectedSalonFilter]);
  }, [selectedSalonFilter, shops]);

  // Scoped Bills
  const scopedBills = useMemo(() => {
    let list = bills;

    if (matchingShopIds) {
      list = list.filter((b) => matchingShopIds.has(b.shop_id));
    }

    if (billStatusFilter !== 'all') {
      list = list.filter((b) => (b.status || '').toLowerCase() === billStatusFilter.toLowerCase());
    }

    if (paymentMethodFilter !== 'all') {
      list = list.filter((b) => {
        const linkedPayment = paymentByBillId.get(b.id);
        const method = (linkedPayment?.method || b.payment_mode || '').toUpperCase();
        return method === paymentMethodFilter.toUpperCase();
      });
    }

    list = filterByDateRange(list, 'issued_at', effectiveDateRange);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((b) => {
        const invMatch = (b.invoice_number || b.bill_number || '').toLowerCase().includes(q);
        const shopMatch = (b.shop?.name || '').toLowerCase().includes(q);
        const custNameMatch = (b.customer?.name || b.customer_name || '').toLowerCase().includes(q);
        const custPhoneMatch = (b.customer?.phone || b.customer_phone || '').includes(q);
        const notesMatch = (b.notes || '').toLowerCase().includes(q);
        return invMatch || shopMatch || custNameMatch || custPhoneMatch || notesMatch;
      });
    }

    return list;
  }, [bills, matchingShopIds, billStatusFilter, paymentMethodFilter, effectiveDateRange, searchQuery, paymentByBillId]);

  const scopedPayments = useMemo(() => {
    let list = payments;
    if (matchingShopIds) list = list.filter((p) => matchingShopIds.has(p.shop_id));
    if (paymentMethodFilter !== 'all') {
      list = list.filter((p) => (p.method || p.payment_method || '').toUpperCase() === paymentMethodFilter.toUpperCase());
    }
    return filterByDateRange(list, 'paid_at', effectiveDateRange);
  }, [payments, matchingShopIds, paymentMethodFilter, effectiveDateRange]);

  const scopedStaff = useMemo(() => {
    if (matchingShopIds) return staff.filter((st) => matchingShopIds.has(st.shop_id));
    return staff;
  }, [staff, matchingShopIds]);

  const totalBilledMinor = scopedBills.reduce((acc, b) => (b.status === 'deleted' ? acc : acc + (b.total_minor || 0)), 0);
  const totalPaidMinor = scopedPayments.reduce((acc, p) => acc + (p.amount_minor || 0), 0);
  const activeScopedBills = scopedBills.filter((b) => b.status !== 'deleted');
  const avgTicketMinor = activeScopedBills.length > 0 ? Math.round(totalBilledMinor / activeScopedBills.length) : 0;

  // -------------------------------------------------------------
  // DAILY BILLING & REVENUE AGGREGATION
  // -------------------------------------------------------------
  interface DailyMetric {
    rawDate: string; // YYYY-MM-DD
    displayDate: string;
    billsCount: number;
    totalAmountMinor: number;
    avgBillMinor: number;
    paidBillsCount: number;
    pendingBillsCount: number;
    uniqueSalonsCount: number;
    topSalonName: string;
    topSalonBills: number;
  }

  const dailyBillingBreakdown = useMemo(() => {
    const map = new Map<string, { bills: Bill[]; totalMinor: number }>();

    let sourceBills = bills;
    if (selectedSalonFilter !== 'all') {
      sourceBills = sourceBills.filter((b) => b.shop_id === selectedSalonFilter);
    }
    if (paymentMethodFilter !== 'all') {
      sourceBills = sourceBills.filter((b) => {
        const p = paymentByBillId.get(b.id);
        const m = (p?.method || b.payment_mode || '').toUpperCase();
        return m === paymentMethodFilter.toUpperCase();
      });
    }

    sourceBills.forEach((b) => {
      const dateObj = new Date(b.issued_at || b.created_at);
      if (isNaN(dateObj.getTime())) return;
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;

      const entry = map.get(key) || { bills: [], totalMinor: 0 };
      entry.bills.push(b);
      entry.totalMinor += b.total_minor || 0;
      map.set(key, entry);
    });

    const result: DailyMetric[] = [];
    map.forEach((data, key) => {
      const parts = key.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      const displayDate = d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      const salonCounts: Record<string, { count: number; name: string }> = {};
      const uniqueSalons = new Set<string>();
      let paidCount = 0;
      let pendingCount = 0;

      data.bills.forEach((b) => {
        if (b.status === 'deleted') return;
        uniqueSalons.add(b.shop_id);
        const due = b.due_amount_minor || 0;
        if (due > 0) pendingCount++;
        else paidCount++;

        const sName = b.shop?.name || 'Shop';
        if (!salonCounts[b.shop_id]) {
          salonCounts[b.shop_id] = { count: 0, name: sName };
        }
        salonCounts[b.shop_id].count++;
      });

      let topSalonName = 'None';
      let topSalonBills = 0;
      Object.values(salonCounts).forEach((sc) => {
        if (sc.count > topSalonBills) {
          topSalonBills = sc.count;
          topSalonName = sc.name;
        }
      });

      result.push({
        rawDate: key,
        displayDate,
        billsCount: data.bills.length,
        totalAmountMinor: data.totalMinor,
        avgBillMinor: data.bills.length > 0 ? Math.round(data.totalMinor / data.bills.length) : 0,
        paidBillsCount: paidCount,
        pendingBillsCount: pendingCount,
        uniqueSalonsCount: uniqueSalons.size,
        topSalonName,
        topSalonBills,
      });
    });

    return result.sort((a, b) => b.rawDate.localeCompare(a.rawDate));
  }, [bills, selectedSalonFilter, paymentMethodFilter, paymentByBillId]);

  // Salon Contributions
  interface SalonContribution {
    id: string;
    name: string;
    city: string;
    billsCount: number;
    totalAmountMinor: number;
    avgBillMinor: number;
    percentShare: number;
  }

  const salonContributions = useMemo(() => {
    const map = new Map<string, { name: string; city: string; count: number; totalMinor: number }>();

    scopedBills.forEach((b) => {
      const shop = b.shop || shops.find((s) => s.id === b.shop_id);
      const name = shop?.name || 'Unknown Outlet';
      const city = shop?.city || 'Tamil Nadu';

      const entry = map.get(b.shop_id) || { name, city, count: 0, totalMinor: 0 };
      entry.count++;
      entry.totalMinor += b.total_minor || 0;
      map.set(b.shop_id, entry);
    });

    const list: SalonContribution[] = [];
    map.forEach((data, id) => {
      list.push({
        id,
        name: data.name,
        city: data.city,
        billsCount: data.count,
        totalAmountMinor: data.totalMinor,
        avgBillMinor: data.count > 0 ? Math.round(data.totalMinor / data.count) : 0,
        percentShare: totalBilledMinor > 0 ? Math.round((data.totalMinor / totalBilledMinor) * 100) : 0,
      });
    });

    return list.sort((a, b) => b.totalAmountMinor - a.totalAmountMinor);
  }, [scopedBills, shops, totalBilledMinor]);

  const paginatedBills = useMemo(() => {
    const startIndex = (billsPage - 1) * billsPageSize;
    return scopedBills.slice(startIndex, startIndex + billsPageSize);
  }, [scopedBills, billsPage, billsPageSize]);

  const totalBillPages = Math.ceil(scopedBills.length / billsPageSize) || 1;

  const dailyChartData = useMemo(() => {
    return dailyBillingBreakdown
      .slice(0, 14)
      .reverse()
      .map((d) => ({
        date: d.displayDate.replace(/, 20\d\d/, ''),
        revenue: Math.round(d.totalAmountMinor / 100),
        bills: d.billsCount,
      }));
  }, [dailyBillingBreakdown]);

  const monthlyRevenueTrend = useMemo(() => {
    const map = new Map<string, { month: string; invoiced: number; collected: number; txnCount: number }>();

    scopedBills.forEach((b) => {
      const d = new Date(b.issued_at || b.created_at);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      const entry = map.get(key) || { month: monthLabel, invoiced: 0, collected: 0, txnCount: 0 };
      entry.invoiced += Math.round((b.total_minor || 0) / 100);
      map.set(key, entry);
    });

    scopedPayments.forEach((p) => {
      const d = new Date(p.paid_at || p.created_at);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      const entry = map.get(key) || { month: monthLabel, invoiced: 0, collected: 0, txnCount: 0 };
      entry.collected += Math.round((p.amount_minor || 0) / 100);
      entry.txnCount += 1;
      map.set(key, entry);
    });

    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, v]) => v);
  }, [scopedBills, scopedPayments]);

  // Founder Dashboard: Platform SaaS Subscription Metrics & Real Tier Classification
  const { companySubMetrics, salonTierLedger } = useMemo(() => {
    let totalSubRevMinor = 0;
    let proSubCount = 0;

    const ledger = shops.map((s) => {
      const sub = (subscriptions || []).find((subItem: any) => subItem.shop_id === s.id);
      const isSub = Boolean(sub || (s.free_sales_limit || 0) > 100 || sub?.status === 'active');

      let subAmtINR = 0;
      let planName = 'Free Plan (100 Quota)';
      let tier: 'Pro Plan (3M)' | 'Free Quota' = 'Free Quota';
      let tierBadge = 'bg-[#0D9488]/10 text-[#0D9488] border-[#0D9488]/20';

      if (isSub) {
        const raw = typeof sub?.amount_minor === 'number' && sub.amount_minor > 0
          ? (sub.amount_minor >= 10000 ? Math.round(sub.amount_minor / 100) : sub.amount_minor)
          : (typeof sub?.amount === 'number' && sub.amount > 0 ? sub.amount : 2999);
        subAmtINR = raw;
        totalSubRevMinor += subAmtINR * 100;
        proSubCount += 1;
        planName = sub?.plan_name || 'Pro Plan (3 Months)';
        tier = 'Pro Plan (3M)';
        tierBadge = 'bg-[#0D9488] text-white border-[#0D9488]';
      }

      const sBills = bills.filter((b) => b.shop_id === s.id);
      const lastPmt = sub?.created_at || sub?.subscription_start_date || s.created_at;

      return {
        shop: s,
        id: s.id,
        name: s.name,
        city: s.city || 'Tamil Nadu',
        tier,
        planName,
        tierBadge,
        subAmtINR,
        billedMinor: sBills.reduce((acc, b) => acc + (b.total_minor || 0), 0),
        collectedMinor: subAmtINR * 100,
        txnCount: isSub ? 1 : 0,
        billsCount: sBills.length,
        lastActive: lastPmt,
      };
    }).sort((a, b) => b.subAmtINR - a.subAmtINR);

    const freeQuotaCount = Math.max(0, shops.length - proSubCount);

    return {
      companySubMetrics: {
        totalRevenueMinor: totalSubRevMinor,
        proSubCount,
        freeQuotaCount,
        subPaymentsCount: proSubCount,
        pendingDuesMinor: 0,
      },
      salonTierLedger: ledger,
    };
  }, [shops, subscriptions, bills]);

  const deletionReasonsBreakdown = useMemo(() => {
    if (deletions.length === 0) return [];
    const map = new Map<string, number>();
    deletions.forEach((d) => {
      const reason = d.reason?.trim() || 'No reason provided';
      map.set(reason, (map.get(reason) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [deletions]);

  const handleResetFilters = () => {
    setSelectedSalonFilter('all');
    setSearchQuery('');
    setSegmentFilter('all');
    setExactDateInput('');
    setBillStatusFilter('all');
    setPaymentMethodFilter('all');
    setSelectedOption('all_time');
    setBillsPage(1);
  };

  const hasActiveFilters =
    selectedSalonFilter !== 'all' ||
    searchQuery.trim() !== '' ||
    segmentFilter !== 'all' ||
    exactDateInput.trim() !== '' ||
    billStatusFilter !== 'all' ||
    paymentMethodFilter !== 'all' ||
    !!effectiveDateRange.startDate;

  const handleSelectDayDrilldown = (rawDate: string) => {
    setExactDateInput(rawDate);
    setActiveTab('all_bills');
    setBillsPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Header bar: Title, exact date chip, export */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900">Founder Dashboard</h1>
          {exactDateInput && (
            <button
              type="button"
              onClick={() => {
                setExactDateInput('');
                setBillsPage(1);
              }}
              title="Clear date"
              className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 cursor-pointer"
            >
              {effectiveDateRange.label} ✕
            </button>
          )}
        </div>

        <ExportButton
          data={scopedBills.map((b) => ({
            'Invoice Number': b.invoice_number || b.bill_number,
            Outlet: b.shop?.name || b.shop_id,
            Customer: b.customer?.name || b.customer_name || 'Walk-in',
            Phone: b.customer?.phone || b.customer_phone || 'None',
            'Issued Date': formatDateTime(b.issued_at || b.created_at),
            'Subtotal (INR)': (b.subtotal_minor || 0) / 100,
            'Total (INR)': (b.total_minor || 0) / 100,
            Status: b.status,
          }))}
          filename={`counterpro_sales_report_${exactDateInput || 'all'}`}
          label="Export CSV"
        />
      </div>

      {/* Summary: Platform SaaS Subscription Metrics (Founder Dashboard) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 border-y border-slate-200 divide-x divide-slate-100 [&>*:nth-child(n+3)]:border-t [&>*:nth-child(n+3)]:border-slate-100 sm:[&>*:nth-child(n+3)]:border-t-0 sm:[&>*:nth-child(n+5)]:border-t bg-white rounded-xl shadow-xs">
        <Metric
          label="Subscription Rev"
          value={formatCurrency(companySubMetrics.totalRevenueMinor)}
          sub="Our Collected Revenue"
          onClick={() => setActiveTab('subscription_revenue')}
        />
        <Metric
          label="Paid Subscriptions"
          value={formatNumber(companySubMetrics.proSubCount)}
          sub="Active Pro Merchants"
          onClick={() => setActiveTab('subscription_revenue')}
        />
        <Metric
          label="Free Quota Outlets"
          value={formatNumber(companySubMetrics.freeQuotaCount)}
          sub="100 Free Sales Limit"
          onClick={() => onNavigate('salons_360')}
        />
        <Metric
          label="Pending Sub Dues"
          value="₹0"
          sub="All plans prepaid"
        />
        <Metric
          label="Sub Payments"
          value={formatNumber(companySubMetrics.subPaymentsCount)}
          sub="Verified receipts"
          onClick={() => setActiveTab('subscription_revenue')}
        />
        <Metric
          label="Total Outlets"
          value={formatNumber(shops.length)}
          sub="Onboarded partners"
          onClick={() => onNavigate('salons_360')}
        />
        <Metric
          label="Staff Accounts"
          value={formatNumber(scopedStaff.length)}
          sub={`${scopedStaff.filter((s) => s.invitation_status === 'active' || s.is_active).length} active`}
          onClick={() => onNavigate('staff_access')}
        />
      </div>

      {/* Filter Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 text-xs">
          <div className="text-slate-600">
            <span className="font-medium text-slate-900">{effectiveDateRange.label}</span>
            <span className="mx-1.5 text-slate-300">|</span>
            {scopedBills.length} orders · {formatCurrency(totalBilledMinor)}
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="ml-3 text-[#0D9488] hover:text-[#0F766E] underline cursor-pointer"
                title="Reset all active filters"
              >
                Reset
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="px-2.5 py-1 rounded-md border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 cursor-pointer"
          >
            {showFilters ? 'Hide filters' : 'Filters'}
          </button>
        </div>

        {showFilters && (
          <div className="space-y-3 border border-slate-200 rounded-lg bg-white p-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Outlet</label>
                <select
                  value={selectedSalonFilter}
                  onChange={(e) => {
                    setSelectedSalonFilter(e.target.value);
                    setBillsPage(1);
                  }}
                  className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#0D9488] cursor-pointer"
                >
                  <option value="all">All Outlets ({shops.length})</option>
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} • {s.city || 'Tamil Nadu'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-600">Date</label>
                  {exactDateInput && (
                    <button
                      onClick={() => setExactDateInput('')}
                      className="text-[10px] text-slate-500 hover:text-slate-900 font-medium cursor-pointer underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  type="date"
                  value={exactDateInput}
                  onChange={(e) => {
                    setExactDateInput(e.target.value);
                    setBillsPage(1);
                  }}
                  className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#0D9488] cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Payment</label>
                <select
                  value={paymentMethodFilter}
                  onChange={(e) => {
                    setPaymentMethodFilter(e.target.value);
                    setBillsPage(1);
                  }}
                  className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#0D9488] cursor-pointer"
                >
                  <option value="all">All Methods</option>
                  <option value="CASH">CASH</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">CARD</option>
                  {availablePaymentMethods.filter((m) => !['CASH', 'UPI', 'CARD'].includes(m)).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Status</label>
                <select
                  value={billStatusFilter}
                  onChange={(e) => {
                    setBillStatusFilter(e.target.value);
                    setBillsPage(1);
                  }}
                  className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#0D9488] cursor-pointer"
                >
                  <option value="all">All</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search invoice, outlet, customer, phone"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setBillsPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#0D9488]"
                />
              </div>

              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
                {(
                  [
                    ['all', 'All'],
                    ['with_staff', 'With Staff'],
                    ['with_appts', 'With Active Orders'],
                    ['deduplicated', 'Unique'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setSegmentFilter(id)}
                    className={`px-3 py-1 rounded-md font-medium transition-all ${
                      segmentFilter === id
                        ? 'bg-[#0D9488] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5 Tabs matching StyleFleet */}
      <div className="flex items-center gap-5 border-b border-slate-200 overflow-x-auto">
        {[
          { id: 'daily_ledger', label: `Daily (${dailyBillingBreakdown.length})` },
          { id: 'all_bills', label: `Orders (${scopedBills.length})` },
          { id: 'salon_breakdown', label: `Outlets (${salonContributions.length})` },
          { id: 'overview', label: 'Charts' },
          { id: 'subscription_revenue', label: 'Subscription Rev' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-0.5 pb-2.5 -mb-px border-b-2 text-xs transition-colors cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'border-[#0D9488] text-[#0D9488] font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-900 font-medium'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: VISUAL OVERVIEW & CHARTS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Daily Sales</h3>
                </div>
                <span className="text-xs font-mono font-bold text-slate-800">
                  {dailyChartData.length} days
                </span>
              </div>

              <div className="h-64 w-full">
                {dailyChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#eef0f3" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08)',
                          fontSize: '12px',
                          color: '#0f172a',
                        }}
                      />
                      <Bar dataKey="revenue" fill="#0D9488" radius={[3, 3, 0, 0]} name="Sales (₹)" maxBarSize={28} />
                      <Bar dataKey="bills" fill="rgba(13, 148, 136, 0.25)" radius={[3, 3, 0, 0]} name="Orders Count" maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-slate-400">
                    No sales for the current filters.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Account Deletions</h3>
                </div>
                <span className="text-xs font-mono font-medium text-slate-600">
                  {deletions.length} requests
                </span>
              </div>

              {deletionReasonsBreakdown.length > 0 ? (
                <div className="space-y-4">
                  <div className="h-44 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={deletionReasonsBreakdown}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={3}
                        >
                          {deletionReasonsBreakdown.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            borderColor: '#e2e8f0',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08)',
                            fontSize: '11px',
                            color: '#0f172a',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Total Requests</span>
                      <span className="font-semibold text-slate-900">{deletions.length}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 text-xs text-neutral-400">
                  No account deletion requests.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DAILY SALES MATRIX */}
      {activeTab === 'daily_ledger' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Daily Order Matrix</h3>
            </div>
            <div className="text-xs text-slate-500 font-medium">
              {dailyBillingBreakdown.length} active dates
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[10.5px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Orders</th>
                  <th className="px-4 py-2.5">Revenue</th>
                  <th className="px-4 py-2.5">Avg Order</th>
                  <th className="px-4 py-2.5">Paid / Pending</th>
                  <th className="px-4 py-2.5">Top Merchant</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {dailyBillingBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-400">
                      No orders match the current filters.
                    </td>
                  </tr>
                ) : (
                  dailyBillingBreakdown.map((row) => (
                    <tr
                      key={row.rawDate}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => handleSelectDayDrilldown(row.rawDate)}
                    >
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-slate-900">{row.displayDate}</div>
                        <span className="text-[10px] text-slate-400">{row.rawDate}</span>
                      </td>

                      <td className="px-4 py-2.5">
                        <span className="text-slate-800 font-medium">{row.billsCount}</span>
                      </td>

                      <td className="px-4 py-2.5 font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(row.totalAmountMinor)}
                      </td>

                      <td className="px-4 py-2.5 text-slate-600 tabular-nums">
                        {formatCurrency(row.avgBillMinor)}
                      </td>

                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <span className="text-[#0D9488] font-medium">{row.paidBillsCount} paid</span>
                          <span className="text-slate-300">•</span>
                          <span>{row.pendingBillsCount} pending</span>
                        </div>
                      </td>

                      <td className="px-4 py-2.5">
                        <div className="font-medium text-slate-800">{row.topSalonName}</div>
                        <span className="text-[11px] text-slate-400">
                          {row.topSalonBills} orders
                        </span>
                      </td>

                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectDayDrilldown(row.rawDate);
                          }}
                          className="text-xs font-semibold text-[#0D9488] hover:underline cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: LIVE ORDERS & INVOICES LEDGER */}
      {activeTab === 'all_bills' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Orders &amp; Invoices</h3>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Rows:</span>
              <select
                value={billsPageSize}
                onChange={(e) => {
                  setBillsPageSize(Number(e.target.value));
                  setBillsPage(1);
                }}
                className="text-xs font-medium px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Outlet</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {paginatedBills.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-xs text-slate-400">
                      No orders match the current filters.
                    </td>
                  </tr>
                ) : (
                  paginatedBills.map((b) => {
                    const shop = b.shop || shops.find((s) => s.id === b.shop_id);
                    const payment = paymentByBillId.get(b.id);
                    return (
                      <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3.5">
                          <span className="font-mono font-bold text-slate-900 block">{b.invoice_number || b.bill_number}</span>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="font-semibold text-slate-900 block">{shop?.name || 'Outlet'}</span>
                          <span className="text-[11px] text-slate-500">{shop?.city || 'Tamil Nadu'}</span>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="font-medium text-slate-900 block">{b.customer?.name || b.customer_name || 'Walk-in Client'}</span>
                          <span className="text-[11px] font-mono text-slate-500">{b.customer?.phone || b.customer_phone || 'None'}</span>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="text-slate-900 block">{formatDate(b.issued_at || b.created_at)}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(b.issued_at || b.created_at).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-900 border border-slate-300">
                            {payment?.method ? payment.method.toUpperCase() : (b.payment_mode ? b.payment_mode.toUpperCase() : 'CASH')}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {formatCurrency(b.total_minor)}
                          </span>
                          {b.tax_minor && b.tax_minor > 0 ? (
                            <span className="text-[10px] text-slate-500 block">
                              Tax: {formatCurrency(b.tax_minor)}
                            </span>
                          ) : null}
                        </td>

                        <td className="px-4 py-3.5">
                          <StatusBadge status={b.status} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalBillPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-xs">
              <span className="text-slate-500">
                Showing {(billsPage - 1) * billsPageSize + 1} to{' '}
                {Math.min(billsPage * billsPageSize, scopedBills.length)} of {scopedBills.length} orders
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={billsPage === 1}
                  onClick={() => setBillsPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Previous
                </button>
                <span className="font-mono font-bold text-slate-900 px-2">
                  Page {billsPage} of {totalBillPages}
                </span>
                <button
                  disabled={billsPage === totalBillPages}
                  onClick={() => setBillsPage((p) => Math.min(totalBillPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: OUTLET SALES CONTRIBUTION */}
      {activeTab === 'salon_breakdown' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Outlets by Revenue</h3>
            </div>
            <div className="text-xs font-mono text-slate-600 font-semibold">
              {salonContributions.length} merchants
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[10.5px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Outlet</th>
                  <th className="px-4 py-2.5">Location</th>
                  <th className="px-4 py-2.5">Orders</th>
                  <th className="px-4 py-2.5">Revenue</th>
                  <th className="px-4 py-2.5">Avg Order</th>
                  <th className="px-4 py-2.5">Share</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {salonContributions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-400">
                      No outlets match the current filters.
                    </td>
                  </tr>
                ) : (
                  salonContributions.map((sc, idx) => (
                    <tr key={sc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="text-slate-400 font-medium w-4">{idx + 1}</span>
                          <div>
                            <span className="font-semibold text-slate-900 block">{sc.name}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-2.5 text-slate-600">{sc.city}</td>

                      <td className="px-4 py-2.5 font-medium text-slate-800">
                        {sc.billsCount}
                      </td>

                      <td className="px-4 py-2.5 font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(sc.totalAmountMinor)}
                      </td>

                      <td className="px-4 py-2.5 text-slate-600 tabular-nums">
                        {formatCurrency(sc.avgBillMinor)}
                      </td>

                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-[#0D9488] rounded-full"
                              style={{ width: `${Math.min(100, sc.percentShare)}%` }}
                            />
                          </div>
                          <span className="font-medium text-slate-700 text-[11px] tabular-nums">
                            {sc.percentShare}%
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => {
                            setSelectedSalonFilter(sc.id);
                            setActiveTab('all_bills');
                            setBillsPage(1);
                          }}
                          className="px-2.5 py-1 rounded-md border border-slate-200 text-[#0D9488] text-xs font-semibold hover:border-[#0D9488] hover:bg-[#0D9488]/10 transition-colors cursor-pointer"
                        >
                          View Orders
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: 100 QUOTA & PRO UPGRADE TRACKER */}
      {activeTab === 'subscription_revenue' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KPICard
              title="Subscription Revenue"
              value={formatCurrency(companySubMetrics.totalRevenueMinor)}
              subtitle="Our collected SaaS revenue"
            />
            <KPICard
              title="Pro Subscriptions"
              value={formatNumber(companySubMetrics.proSubCount)}
              subtitle="Active Pro outlets"
            />
            <KPICard
              title="Free Quota Outlets"
              value={formatNumber(companySubMetrics.freeQuotaCount)}
              subtitle="100 sales free tier"
            />
            <KPICard
              title="Pending Sub Dues"
              value="₹0"
              subtitle="All subscriptions prepaid"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Monthly Revenue</h3>
                </div>
                <div className="flex items-center gap-3 text-xs font-medium">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0D9488] inline-block" />
                    <span>Collected INR</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E] inline-block" />
                    <span>Invoiced INR</span>
                  </div>
                </div>
              </div>

              <div className="h-64 w-full">
                {monthlyRevenueTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyRevenueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#eef0f3" />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08)',
                          fontSize: '11px',
                          color: '#0f172a',
                        }}
                        formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Amount']}
                      />
                      <Area
                        type="monotone"
                        dataKey="collected"
                        name="Collected Revenue"
                        stroke="#0D9488"
                        strokeWidth={2}
                        fill="#0D9488"
                        fillOpacity={0.15}
                      />
                      <Area
                        type="monotone"
                        dataKey="invoiced"
                        name="Invoiced Total"
                        stroke="#0F766E"
                        strokeWidth={1.75}
                        strokeDasharray="4 4"
                        fill="#0F766E"
                        fillOpacity={0.06}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No revenue in the selected period.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Subscription Plans</h3>
              </div>

              <div className="space-y-2.5 pt-1">
                {[
                  {
                    name: 'Pro Plan (3 Months)',
                    desc: 'Paid SaaS subscription (₹2,999 / 3 months)',
                    count: companySubMetrics.proSubCount,
                    badge: 'bg-[#0D9488] text-white border-[#0D9488]',
                  },
                  {
                    name: 'Free Plan (100 Sales Quota)',
                    desc: 'Onboarding tier with 100 free sales limit',
                    count: companySubMetrics.freeQuotaCount,
                    badge: 'bg-[#0D9488]/10 text-[#0D9488] border-[#0D9488]/20',
                  },
                ].map((tier, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-900">{tier.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${tier.badge}`}>
                        {tier.count} Outlets
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">{tier.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 overflow-hidden space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Outlet Subscriptions ({salonTierLedger.length})</h3>
              </div>

              <ExportButton
                data={salonTierLedger.map((s) => ({
                  name: s.name,
                  city: s.city,
                  'Subscription Plan': s.planName,
                  'Our Collected Rev (INR)': s.subAmtINR,
                  'Invoiced (INR)': Number(((s.billedMinor || 0) / 100).toFixed(2)),
                  billsCount: s.billsCount,
                  lastActive: formatDateTime(s.lastActive),
                }))}
                filename="counterpro_subscription_revenue_report"
                label="Export CSV"
              />
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[10.5px] border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Outlet</th>
                    <th className="px-4 py-2.5">Subscription Plan</th>
                    <th className="px-4 py-2.5">Our Collected Rev</th>
                    <th className="px-4 py-2.5">Invoiced (Orders)</th>
                    <th className="px-4 py-2.5">Transactions</th>
                    <th className="px-4 py-2.5">Last Active</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {salonTierLedger.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{item.city}</span>
                        </div>
                      </td>

                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${item.tierBadge}`}>
                          {item.tier}
                        </span>
                      </td>

                      <td className="px-4 py-2.5 font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(item.collectedMinor)}
                      </td>

                      <td className="px-4 py-2.5 text-slate-600 tabular-nums">
                        {formatCurrency(item.billedMinor)}
                      </td>

                      <td className="px-4 py-2.5 text-slate-600">
                        {item.txnCount}
                      </td>

                      <td className="px-4 py-2.5 text-slate-500">
                        {formatDateTime(item.lastActive)}
                      </td>

                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => {
                            setSelectedSalonFilter(item.id);
                            setActiveTab('all_bills');
                            setBillsPage(1);
                          }}
                          className="text-xs font-semibold text-[#0D9488] hover:underline cursor-pointer"
                        >
                          View Orders
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Footer bar */}
      <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span>CounterPro Admin Console</span>
        </div>
        <div className="flex items-center gap-3">
          {onOpenPrivacyPolicy && (
            <button
              onClick={onOpenPrivacyPolicy}
              className="p-1.5 rounded-lg text-slate-600 hover:text-black hover:bg-slate-100 transition-colors cursor-pointer"
              title="Privacy Policy"
            >
              <Shield className="w-4 h-4" />
            </button>
          )}
          {onOpenDeleteAccount && (
            <button
              onClick={onOpenDeleteAccount}
              className="p-1.5 rounded-lg text-slate-600 hover:text-black hover:bg-slate-100 transition-colors cursor-pointer"
              title="Account Deletion Info"
            >
              <UserX className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
