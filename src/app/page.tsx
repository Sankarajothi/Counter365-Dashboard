'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header, ExportFormat } from '../components/Header';
import { ShopDrawer } from '../components/ShopDrawer';

function convertToCSV(data: Record<string, any>[]): string {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((header) => {
        const val = row[header] === null || row[header] === undefined ? '' : String(row[header]);
        const escaped = val.replace(/"/g, '""');
        return `"${escaped}"`;
      })
      .join(',')
  );
  return [headers.join(','), ...rows].join('\r\n');
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
import { LoginPage } from '../components/LoginPage';
import { ResetCredentialsModal } from '../components/ResetCredentialsModal';
import { FounderDashboardView } from '../components/views/FounderDashboardView';
import { ProductAnalyticsView } from '../components/views/ProductAnalyticsView';
import { DailyUserMetricsView } from '../components/views/DailyUserMetricsView';
import { DailyBillsView } from '../components/views/DailyBillsView';
import { RevenueTrendView } from '../components/views/RevenueTrendView';
import { IncompleteSignupsView } from '../components/views/IncompleteSignupsView';
import { UserDetailsView } from '../components/views/UserDetailsView';
import { GeographyView } from '../components/views/GeographyView';
import { OverviewView } from '../components/views/OverviewView';
import { ShopsView } from '../components/views/ShopsView';
import { StaffAccessView } from '../components/views/StaffAccessView';
import { ReportsBIView } from '../components/views/ReportsBIView';
import { HardwareTelemetryView } from '../components/views/HardwareTelemetryView';
import { SystemHealthView } from '../components/views/SystemHealthView';
import { SupportOutreachView } from '../components/views/SupportOutreachView';
import { UsageView } from '../components/views/UsageView';
import { PaymentsView } from '../components/views/PaymentsView';
import { OrdersView } from '../components/views/OrdersView';
import { LogsView } from '../components/views/LogsView';
import { DeletionsView } from '../components/views/DeletionsView';
import { PrivacyView } from '../components/views/PrivacyView';
import { BroadcastNotificationsView } from '../components/views/BroadcastNotificationsView';
import { fetchAdminData, AdminDataState, formatINR } from '../lib/adminData';
import { Shop } from '../types/database';

export default function AdminConsolePage() {
  const [adminUser, setAdminUser] = useState<{ email: string; role: string; name: string } | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [dateFilter, setDateFilter] = useState('all');
  const [customRange, setCustomRange] = useState<{ start?: string; end?: string }>({});
  const [period, setPeriod] = useState('Month');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<AdminDataState>({
    shops: [],
    profiles: [],
    shopMembers: [],
    bills: [],
    billItems: [],
    payments: [],
    menuItems: [],
    menuCategories: [],
    expenses: [],
    subscriptions: [],
    customers: [],
    accountDeletions: [],
    lastFetched: new Date(),
  });

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 2800);
  }, []);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const result = await fetchAdminData();
      setData(result);
    } catch (err) {
      console.error('Error fetching admin data:', err);
      showToast('Error syncing with Supabase');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    // Check existing auth session
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const json = await res.json();
          if (json.authenticated && json.user) {
            setAdminUser(json.user);
          }
        }
      } catch (e) {
        console.error('Session check failed:', e);
      } finally {
        setIsAuthChecking(false);
      }
    };

    checkSession();
  }, []);

  useEffect(() => {
    if (!adminUser) return;
    loadData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [adminUser, loadData]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem('counter365_admin_logged_in');
    localStorage.removeItem('counterpro_admin_logged_in');
    setAdminUser(null);
    showToast('Logged out of Admin Console');
  };

  // Date Filter Logic
  const filteredData = useMemo(() => {
    if (dateFilter === 'all') return data;

    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (dateFilter === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (dateFilter === 'yesterday') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    } else if (dateFilter === 'this_week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      startDate = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
      endDate = now;
    } else if (dateFilter === 'last_week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1) - 7; // Last Monday
      startDate = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), diff + 6, 23, 59, 59, 999);
    } else if (dateFilter === '7days') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = now;
    } else if (dateFilter === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = now;
    } else if (dateFilter === 'last_month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (dateFilter === '30days') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      endDate = now;
    } else if (dateFilter === '90days') {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      endDate = now;
    } else if (dateFilter === 'this_year') {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      endDate = now;
    } else if (dateFilter === 'custom' && customRange.start && customRange.end) {
      startDate = new Date(`${customRange.start}T00:00:00`);
      endDate = new Date(`${customRange.end}T23:59:59.999`);
    }

    if (!startDate) return data;

    const startTs = startDate.getTime();
    const endTs = (endDate || now).getTime();

    const isWithin = (dStr?: string | null) => {
      if (!dStr) return false;
      const t = new Date(dStr).getTime();
      return t >= startTs && t <= endTs;
    };

    return {
      ...data,
      bills: data.bills.filter((b) => isWithin(b.created_at || b.completed_at)),
      payments: data.payments.filter((p) => isWithin(p.paid_at || p.created_at)),
      expenses: data.expenses.filter((e) => isWithin(e.expense_date || e.created_at)),
    };
  }, [data, dateFilter, customRange]);

  // Universal Search Results Generator
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return undefined;

    const matchingShops = data.shops
      .filter((s) => s.name.toLowerCase().includes(q) || s.phone.includes(q) || s.city.toLowerCase().includes(q))
      .slice(0, 4)
      .map((s) => ({ id: s.id, name: s.name, city: s.city, phone: s.phone }));

    const matchingBills = data.bills
      .filter((b) => (b.bill_number && b.bill_number.toLowerCase().includes(q)) || (b.customer_name && b.customer_name.toLowerCase().includes(q)))
      .slice(0, 4)
      .map((b) => {
        const s = data.shops.find((sh) => sh.id === b.shop_id);
        return {
          id: b.id,
          billNumber: b.bill_number,
          amount: Number(b.total_amount || 0),
          shopName: s?.name || 'Shop',
        };
      });

    const matchingStaff = data.shopMembers
      .map((m) => {
        const prof = data.profiles.find((p) => p.id === m.user_id);
        const sh = data.shops.find((s) => s.id === m.shop_id);
        return {
          id: m.id,
          name: prof?.full_name || 'Staff',
          role: m.role,
          shopName: sh?.name || 'Shop',
        };
      })
      .filter((st) => st.name.toLowerCase().includes(q) || st.role.toLowerCase().includes(q))
      .slice(0, 4);

    const matchingDeletions = data.accountDeletions
      .filter((d) => (d.shop_name && d.shop_name.toLowerCase().includes(q)) || (d.reason && d.reason.toLowerCase().includes(q)))
      .slice(0, 3)
      .map((d) => ({
        id: d.id,
        shopName: d.shop_name || 'Shop',
        reason: d.reason || 'Account Deleted',
      }));

    return {
      shops: matchingShops,
      bills: matchingBills,
      staff: matchingStaff,
      deletions: matchingDeletions,
    };
  }, [searchQuery, data]);

  const handleSelectSearchResult = (type: string, id: string) => {
    if (type === 'shop') {
      const sh = data.shops.find((s) => s.id === id);
      if (sh) {
        setSelectedShop(sh);
        setCurrentView('salons_360');
      }
    } else if (type === 'bill') {
      setCurrentView('daily_bills');
    } else if (type === 'staff') {
      setCurrentView('staff_access');
    } else if (type === 'deletion') {
      setCurrentView('account_deletions');
    }
    setSearchQuery('');
  };

  // Multi-format Export handler
  const handleExportCurrentView = (format: ExportFormat = 'csv') => {
    if (format === 'print') {
      window.print();
      showToast('Opened print preview');
      return;
    }

    let exportItems: Record<string, any>[] = [];
    let name = currentView;

    if (currentView === 'overview' || currentView === 'shops') {
      exportItems = data.shops.map((s) => {
        const shopBills = filteredData.bills.filter((b) => b.shop_id === s.id && b.status === 'completed');
        const totalGmv = shopBills.reduce((acc, b) => acc + Number(b.total_amount || 0), 0);
        const sub = data.subscriptions.find((sub) => sub.shop_id === s.id);
        return {
          'Shop ID': s.id,
          'Shop Name': s.name,
          'Shop Type': s.shop_type || 'General',
          'City': s.city || '-',
          'Phone': s.phone || '-',
          'Status': s.is_active ? 'Active' : 'Inactive',
          'Orders (Date Range)': shopBills.length,
          'Revenue (INR)': totalGmv,
          'Free Limit Usage': `${shopBills.length}/100 Sales Used`,
          'Subscription Plan': (sub?.plan || 'free').toUpperCase(),
          'Subscription Status': (sub?.status || 'trialing').toUpperCase(),
          'Created Date': s.created_at ? new Date(s.created_at).toLocaleDateString() : '-',
        };
      });
      name = 'counter365-shops';
    } else if (currentView === 'orders') {
      exportItems = filteredData.bills.map((b) => {
        const s = data.shops.find((sh) => sh.id === b.shop_id);
        return {
          'Bill ID': b.id,
          'Bill Number': b.bill_number || '-',
          'Shop Name': s?.name || 'Shop',
          'Customer Name': b.customer_name || 'Walk-in Customer',
          'Customer Phone': b.customer_phone || '-',
          'Payment Mode': (b.payment_mode || 'Cash').toUpperCase(),
          'Status': (b.status || 'completed').toUpperCase(),
          'Subtotal (INR)': b.subtotal || b.total_amount || 0,
          'GST Amount (INR)': b.gst_amount || 0,
          'Paid Amount (INR)': b.paid_amount || 0,
          'Total Amount (INR)': b.total_amount || 0,
          'Pending Amount (INR)': b.pending_amount || 0,
          'Date & Time': b.created_at ? new Date(b.created_at).toLocaleString() : '-',
        };
      });
      name = 'counter365-orders-bills';
    } else if (currentView === 'payments') {
      exportItems = filteredData.payments.map((p) => {
        const s = data.shops.find((sh) => sh.id === p.shop_id);
        return {
          'Payment ID': p.id,
          'Bill ID': p.bill_id || '-',
          'Shop Name': s?.name || '-',
          'Amount (INR)': p.amount || 0,
          'Payment Method': (p.payment_method || 'Cash').toUpperCase(),
          'Status': (p.status || 'successful').toUpperCase(),
          'Operation ID': p.client_operation_id || '-',
          'Payment Date': p.paid_at || p.created_at ? new Date(p.paid_at || p.created_at).toLocaleString() : '-',
        };
      });
      name = 'counter365-payments';
    } else if (currentView === 'subscriptions') {
      exportItems = data.subscriptions.map((s) => {
        const shop = data.shops.find((sh) => sh.id === s.shop_id);
        const shopBills = data.bills.filter((b) => b.shop_id === s.shop_id && b.status === 'completed');
        return {
          'Subscription ID': s.id,
          'Shop Name': shop?.name || '-',
          'Plan': (s.plan || 'free').toUpperCase(),
          'Status': (s.status || 'trialing').toUpperCase(),
          'Price (INR)': s.amount || 0,
          'Billing Cycle': s.interval || 'monthly',
          'Sales Limit Progress': `${shopBills.length}/100 Free Sales`,
          'Team Access': '0/0 Members (Pro Feature)',
          'Created Date': s.created_at ? new Date(s.created_at).toLocaleDateString() : '-',
        };
      });
      name = 'counter365-subscriptions';
    } else if (currentView === 'staff') {
      exportItems = data.shopMembers.map((m) => {
        const p = data.profiles.find((pr) => pr.id === m.user_id);
        const s = data.shops.find((sh) => sh.id === m.shop_id);
        return {
          'Member ID': m.id,
          'Staff Name': p?.full_name || 'Staff Member',
          'Phone': p?.phone || '-',
          'Shop Name': s?.name || '-',
          'Role': (m.role || 'cashier').toUpperCase(),
          'Status': m.is_active ? 'Active' : 'Inactive',
          'Joined At': m.created_at ? new Date(m.created_at).toLocaleDateString() : '-',
        };
      });
      name = 'counter365-staff-access';
    } else if (currentView === 'deletions') {
      exportItems = data.accountDeletions.map((d) => ({
        'Request ID': d.id,
        'Shop Name': d.shop_name || '-',
        'Owner Name': d.owner_name || '-',
        'Phone': d.phone || '-',
        'Reason': d.reason || '-',
        'Feedback': d.feedback || '-',
        'Deleted At': d.deleted_at ? new Date(d.deleted_at).toLocaleString() : '-',
      }));
      name = 'counter365-account-deletions';
    } else if (currentView === 'reports') {
      const completedBills = filteredData.bills.filter((b) => b.status === 'completed');
      const totalRev = completedBills.reduce((acc, b) => acc + Number(b.total_amount || 0), 0);
      exportItems = [{
        'Report Scope': 'Platform Summary',
        'Date Preset': dateFilter,
        'Total Shops': data.shops.length,
        'Completed Orders': completedBills.length,
        'Total Revenue (INR)': totalRev,
        'Average Order Value (INR)': completedBills.length > 0 ? Math.round(totalRev / completedBills.length) : 0,
        'Export Date': new Date().toLocaleString(),
      }];
      name = 'counter365-reports-summary';
    } else {
      exportItems = [
        {
          'View': currentView,
          'Active Date Filter': dateFilter,
          'Timestamp': new Date().toISOString(),
          'Total System Shops': data.shops.length,
          'Total System Bills': data.bills.length,
        }
      ];
      name = `counter365-${currentView}`;
    }

    if (exportItems.length === 0) {
      showToast('No records available to export for current view');
      return;
    }

    const dateStamp = new Date().toISOString().split('T')[0];
    const fileName = `${name}-${dateFilter}-${dateStamp}`;

    if (format === 'json') {
      const jsonStr = JSON.stringify(exportItems, null, 2);
      downloadBlob(jsonStr, `${fileName}.json`, 'application/json;charset=utf-8;');
      showToast(`Exported ${exportItems.length} records to JSON`);
    } else if (format === 'excel') {
      const csvStr = convertToCSV(exportItems);
      // Prepend UTF-8 BOM so Excel opens Hindi/Rupee/special chars properly
      downloadBlob('\uFEFF' + csvStr, `${fileName}.csv`, 'text/csv;charset=utf-8;');
      showToast(`Exported ${exportItems.length} records to Excel`);
    } else {
      // Standard CSV
      const csvStr = convertToCSV(exportItems);
      downloadBlob(csvStr, `${fileName}.csv`, 'text/csv;charset=utf-8;');
      showToast(`Exported ${exportItems.length} records to CSV`);
    }
  };

  // Derived counts
  const activeShops = data.shops.filter((s) => s.is_active);
  const trialShops = data.subscriptions.filter((s) => s.status === 'trialing');
  const expiredShops = data.subscriptions.filter((s) => s.status === 'expired');
  const proSubs = data.subscriptions.filter((s) => s.plan?.toLowerCase() === 'pro');
  const arr = proSubs.reduce((acc, s) => acc + Number(s.amount || 0), 0);
  const completedBills = filteredData.bills.filter((b) => b.status === 'completed');

  // Dynamic View Titles & Subtitles matching StyleFleet hierarchy
  const viewMeta: { [key: string]: [string, string] } = {
    dashboard: [
      'Founder Dashboard',
      `Live executive KPIs, today's sales & real merchant metrics (${dateFilter === 'all' ? 'All Time' : dateFilter})`,
    ],
    product_analytics: [
      'Product Analytics',
      'Complete product analytics engine: user journeys, funnels, engagement scores, screen analytics, interaction heat intelligence, founder insights, and Customer Success opportunities.',
    ],
    daily_user_metrics: [
      'Daily User Metrics',
      'Daily signups, active users, premium conversions, churn, and totals',
    ],
    daily_bills: [
      'Daily Order Metrics',
      `${completedBills.length} completed transactions recorded in live database`,
    ],
    revenue_trend: [
      'Revenue Trend',
      `Cumulative gross volume & payment collection breakdown`,
    ],
    geography: [
      'Geographic & Territory Intelligence',
      `Regional footprint across ${data.shops.length} merchant POS counters in South India`,
    ],
    overview: [
      'Platform Overview',
      `Executive 360 platform summary and performance metrics`,
    ],
    incomplete_signups: [
      'Incomplete signups',
      `Shop onboarding completeness, hardware readiness & missing setup audit`,
    ],
    account_deletions: [
      'Deleted users',
      `${data.accountDeletions.length} account deletion requests & regulatory audit records`,
    ],
    app_telemetry: [
      'Touch Heatmap & Telemetry',
      'Wireless ESC/POS thermal printer pairing, Bluetooth drivers & sync queues',
    ],
    diagnostic_logs: [
      'App Bugs & Diagnostics',
      'Realtime system audit trail, error events & operational logs',
    ],
    salons_360: [
      'Shop Directory',
      `${data.shops.length} merchant stores — All on Free Plan (100 Sales Limit)`,
    ],
    shops: [
      'Shop Directory',
      `${data.shops.length} merchant stores — All on Free Plan (100 Sales Limit)`,
    ],
    subscription_plans: [
      'Subscription & 100 Quotas',
      `Quota tracking, free sales allowance (100 limit) & Pro upgrade status`,
    ],
    staff_access: [
      'Staff Access Control',
      `1 Owner per shop on Free Tier — 0 Pro staff until upgrade`,
    ],
    staff: [
      'Staff Access Control',
      `1 Owner per shop on Free Tier — 0 Pro staff until upgrade`,
    ],
    platform_audit: [
      'Activity Logs',
      'Tamper-proof event logs across bills, updates & admin operations',
    ],
    logs: [
      'Activity Logs',
      'Tamper-proof event logs across bills, updates & admin operations',
    ],
    user_details: [
      'User Details',
      `${data.profiles.length} registered profiles authenticated via Supabase`,
    ],
    purchases: [
      'Payment History',
      `${data.payments.length} payment transactions recorded in live database`,
    ],
    payments: [
      'Payment History',
      `${data.payments.length} payment transactions recorded in live database`,
    ],
    system_health: [
      'Shop Health',
      'PostgreSQL multi-tenant RLS status, database latency & storage metrics',
    ],
    health: [
      'Shop Health',
      'PostgreSQL multi-tenant RLS status, database latency & storage metrics',
    ],
    reports_bi: [
      'Analytics & Business Intelligence',
      'Downloadable intelligence logs, tax records, invoice summaries & churn audits',
    ],
    reports: [
      'Analytics & Business Intelligence',
      'Downloadable intelligence logs, tax records, invoice summaries & churn audits',
    ],
    support_messages: [
      'Support & WhatsApp Outreach',
      'Direct merchant communications, onboarding greetings & subscription notices',
    ],
    support: [
      'Support & WhatsApp Outreach',
      'Direct merchant communications, onboarding greetings & subscription notices',
    ],
    broadcast: [
      'Broadcast Announcements',
      'Global system announcements dispatched live to POS billing counters',
    ],
    scheduled_notifications: [
      'Scheduled Pushes',
      'Automated timer notifications, quota alerts & upgrade reminders',
    ],
    push_notifications: [
      'Push Notifications',
      'Instant real-time alerts & high-priority push notices',
    ],
    privacy: [
      'Privacy Policy Documentation',
      'Official legal disclosure & statutory compliance information',
    ],
    orders: [
      'Daily Order Metrics',
      `${completedBills.length} completed transactions recorded in live database`,
    ],
  };

  const currentMeta = viewMeta[currentView] || ['Admin Console', 'CounterPro 365 System'];

  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#FD5E03] border-t-transparent rounded-full animate-spin" />
          <div className="text-[13px] font-semibold text-[#101318]">Checking Admin Session...</div>
        </div>
      </div>
    );
  }

  if (!adminUser) {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          setAdminUser(user);
          showToast(`Welcome back, ${user.name}`);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex bg-[#F8F9FA] text-[#101318]">
      {/* Sticky Left Sidebar */}
      <Sidebar
        currentView={currentView}
        onSelectView={(v) => {
          setCurrentView(v);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        shopCount={data.shops.length}
        staffCount={data.shopMembers.length}
        billsCount={completedBills.length}
        deletionsCount={data.accountDeletions.length}
        lastUpdated={data.lastFetched}
        adminUser={adminUser}
        onLogout={handleLogout}
        onOpenPrivacy={() => setCurrentView('privacy')}
        onOpenDeleteAccount={() => setCurrentView('account_deletions')}
      />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Sticky Top Header Bar */}
        <Header
          title={currentMeta[0]}
          subtitle={currentMeta[1]}
          onRefresh={() => {
            loadData();
            showToast('Refreshed data from Supabase');
          }}
          onOpenResetModal={() => setIsResetModalOpen(true)}
          onExportFormat={handleExportCurrentView}
          isLoading={isLoading}
          adminUser={adminUser}
          onLogout={handleLogout}
        />

        {/* View Container */}
        <div className="flex-1 p-[20px_24px_40px] flex flex-col gap-[20px]">
          {/* 1. Founder Dashboard */}
          {currentView === 'dashboard' && (
            <FounderDashboardView
              shops={data.shops}
              bills={filteredData.bills}
              payments={filteredData.payments}
              subscriptions={data.subscriptions}
              profiles={data.profiles}
              shopMembers={data.shopMembers}
              customers={data.customers}
              adminUser={adminUser}
              onUpdateAdminUser={(user) => setAdminUser(user)}
              onOpenShopDrawer={setSelectedShop}
              onNavigate={(v) => {
                setCurrentView(v);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onShowToast={showToast}
            />
          )}

          {/* 2. Product Analytics */}
          {currentView === 'product_analytics' && (
            <ProductAnalyticsView
              onShowToast={showToast}
              onNavigateToPush={(phone, shopName) => {
                setCurrentView('scheduled_pushes');
                showToast(`Directing notification outreach for ${shopName || phone}`);
              }}
            />
          )}

          {/* 3. Daily User Metrics */}
          {currentView === 'daily_user_metrics' && (
            <DailyUserMetricsView
              shops={data.shops}
              profiles={data.profiles}
              shopMembers={data.shopMembers}
              subscriptions={data.subscriptions}
              bills={data.bills}
              accountDeletions={data.accountDeletions}
              lastFetched={data.lastFetched}
              onRefresh={() => {
                loadData();
                showToast('Refreshed user metrics from Supabase');
              }}
              onShowToast={showToast}
            />
          )}

          {/* 4. Daily Order Metrics */}
          {(currentView === 'daily_bills' || currentView === 'orders') && (
            <DailyBillsView
              bills={filteredData.bills}
              shops={data.shops}
              payments={filteredData.payments}
              onOpenShopDrawer={setSelectedShop}
              onShowToast={showToast}
            />
          )}

          {/* 5. Revenue Trend */}
          {currentView === 'revenue_trend' && (
            <RevenueTrendView
              subscriptions={data.subscriptions}
              shops={data.shops}
              bills={filteredData.bills}
              payments={filteredData.payments}
              onShowToast={showToast}
            />
          )}

          {/* Geography & Territory Intelligence */}
          {currentView === 'geography' && (
            <GeographyView
              shops={data.shops}
              bills={filteredData.bills}
              payments={filteredData.payments}
              subscriptions={data.subscriptions}
              profiles={data.profiles}
              shopMembers={data.shopMembers}
              onOpenShopDrawer={setSelectedShop}
              onShowToast={showToast}
              onNavigate={(v) => {
                setCurrentView(v);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}

          {/* 6. Overview */}
          {currentView === 'overview' && (
            <OverviewView
              shops={filteredData.shops}
              bills={filteredData.bills}
              billItems={filteredData.billItems}
              subscriptions={filteredData.subscriptions}
              payments={filteredData.payments}
              customers={data.customers}
              profiles={data.profiles}
              shopMembers={data.shopMembers}
              period={period}
              onOpenShopDrawer={setSelectedShop}
              onShowToast={showToast}
              onNavigate={(v) => {
                setCurrentView(v);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}

          {/* Incomplete signups */}
          {currentView === 'incomplete_signups' && (
            <IncompleteSignupsView
              shops={data.shops}
              onOpenShopDrawer={setSelectedShop}
              onShowToast={showToast}
            />
          )}

          {/* 9. Deleted users / Account Deletions */}
          {(currentView === 'account_deletions' || currentView === 'deletions') && (
            <DeletionsView
              deletions={data.accountDeletions}
              searchQuery={searchQuery}
              onShowToast={showToast}
            />
          )}

          {/* 10. App Activity: Touch Heatmap / Telemetry */}
          {(currentView === 'app_telemetry' || currentView === 'hardware') && (
            <HardwareTelemetryView
              shops={data.shops}
              onShowToast={showToast}
            />
          )}

          {/* 11. App Activity: App Bugs / Diagnostics & Audit Logs */}
          {(currentView === 'diagnostic_logs' || currentView === 'platform_audit' || currentView === 'logs') && (
            <LogsView
              shops={filteredData.shops}
              bills={filteredData.bills}
              menuItems={filteredData.menuItems}
              expenses={filteredData.expenses}
              subscriptions={filteredData.subscriptions}
              shopMembers={filteredData.shopMembers}
              accountDeletions={filteredData.accountDeletions}
              searchQuery={searchQuery}
            />
          )}

          {/* 12. Shop Analytics: Shop Directory (salons_360 / shops) */}
          {(currentView === 'salons_360' || currentView === 'shops') && (
            <ShopsView
              shops={data.shops}
              bills={filteredData.bills}
              subscriptions={data.subscriptions}
              profiles={data.profiles}
              shopMembers={data.shopMembers}
              menuItems={data.menuItems}
              accountDeletions={data.accountDeletions}
              searchQuery={searchQuery}
              period={period}
              onOpenShopDrawer={setSelectedShop}
              onShowToast={showToast}
            />
          )}

          {/* 13. Shop Analytics: Subscription & 100 Quotas */}
          {(currentView === 'subscription_plans' || currentView === 'payments' || currentView === 'purchases') && (
            <PaymentsView
              shops={filteredData.shops}
              subscriptions={filteredData.subscriptions}
              payments={filteredData.payments}
              bills={filteredData.bills}
              period={period}
              searchQuery={searchQuery}
              onOpenShopDrawer={setSelectedShop}
              onShowToast={showToast}
            />
          )}

          {/* 14. Shop Analytics: Staff Access Control */}
          {(currentView === 'staff_access' || currentView === 'staff') && (
            <StaffAccessView
              shops={data.shops}
              profiles={data.profiles}
              shopMembers={data.shopMembers}
              bills={data.bills}
              subscriptions={data.subscriptions}
              onShowToast={showToast}
            />
          )}

          {/* 15. Shop Analytics: User Details */}
          {currentView === 'user_details' && (
            <UserDetailsView
              profiles={data.profiles}
              shopMembers={data.shopMembers}
              shops={data.shops}
              bills={data.bills}
              subscriptions={data.subscriptions}
              onOpenShopDrawer={setSelectedShop}
              onShowToast={showToast}
            />
          )}

          {/* 16. Shop Analytics: Shop Health */}
          {(currentView === 'system_health' || currentView === 'health') && (
            <SystemHealthView
              data={data}
              onShowToast={showToast}
            />
          )}

          {/* 17. Shop Analytics: Analytics / Reports BI */}
          {(currentView === 'reports_bi' || currentView === 'reports') && (
            <ReportsBIView
              shops={data.shops}
              bills={data.bills}
              billItems={data.billItems}
              payments={data.payments}
              subscriptions={data.subscriptions}
              accountDeletions={data.accountDeletions}
              menuItems={data.menuItems}
              onShowToast={showToast}
            />
          )}

          {/* Engagement: Support */}
          {(currentView === 'support_messages' || currentView === 'support') && (
            <SupportOutreachView
              shops={data.shops}
              subscriptions={data.subscriptions}
              onShowToast={showToast}
            />
          )}

          {/* 20. Usage View */}
          {currentView === 'usage' && (
            <UsageView
              shops={filteredData.shops}
              bills={filteredData.bills}
              profiles={filteredData.profiles}
              shopMembers={filteredData.shopMembers}
              menuItems={filteredData.menuItems}
              expenses={filteredData.expenses}
              period={period}
              onOpenShopDrawer={setSelectedShop}
            />
          )}

          {/* 21. Privacy Policy */}
          {currentView === 'privacy' && (
            <PrivacyView onShowToast={showToast} />
          )}
        </div>
      </main>

      {/* Slide-out Shop Drawer */}
      {selectedShop && (
        <ShopDrawer
          shop={selectedShop}
          subscription={data.subscriptions.find((s) => s.shop_id === selectedShop.id)}
          bills={data.bills}
          members={data.shopMembers}
          profiles={data.profiles}
          menuItems={data.menuItems}
          expenses={data.expenses}
          period={period}
          onClose={() => setSelectedShop(null)}
          onShowToast={showToast}
        />
      )}

      {/* Reset Admin Credentials Modal */}
      <ResetCredentialsModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        currentEmail={adminUser?.email}
        onSuccess={(user) => setAdminUser(user)}
        onShowToast={showToast}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-[26px] bg-[#101318] text-white px-5 py-3 text-[13px] font-semibold rounded-[6px] shadow-xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 border border-white/10">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
