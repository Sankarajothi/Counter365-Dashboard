'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header, ExportFormat } from '../components/Header';
import { LoginView } from '../components/auth/LoginView';
import { ResetPasswordModal } from '../components/modals/ResetPasswordModal';
import { AddUserAccountModal } from '../components/modals/AddUserAccountModal';

// Views
import { DashboardView } from '../components/views/DashboardView';
import { DailyBillsView } from '../components/views/DailyBillsView';
import { DailyUserMetricsView } from '../components/views/DailyUserMetricsView';
import { RevenueTrendView } from '../components/views/RevenueTrendView';
import { CustomerTrackingView } from '../components/views/CustomerTrackingView';
import { SubscriptionPlansView } from '../components/views/SubscriptionPlansView';
import { IncompleteSignupsView } from '../components/views/IncompleteSignupsView';
import { UserDetailsView } from '../components/views/UserDetailsView';
import { GeographyView } from '../components/views/GeographyView';
import { OverviewView } from '../components/views/OverviewView';
import { ShopsCombinedView } from '../components/views/ShopsCombinedView';
import { StylistsView } from '../components/views/StylistsView';
import { PurchasesView } from '../components/views/PurchasesView';
import { ReportsView } from '../components/views/ReportsView';
import { SupportMessagesView } from '../components/views/SupportMessagesView';
import { AppTelemetryCombinedView } from '../components/views/AppTelemetryCombinedView';
import { AuditTrailView } from '../components/views/AuditTrailView';
import { SystemHealthView } from '../components/views/SystemHealthView';
import { AccountDeletionsView } from '../components/views/AccountDeletionsView';
import { DeleteAccountView } from '../components/views/DeleteAccountView';
import { PrivacyPolicyView } from '../components/views/PrivacyPolicyView';
import { ShopDetailPage } from '../components/views/ShopDetailPage';

// Contexts & Services
import { DateFilterProvider, useDateFilter } from '../context/DateFilterContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { fetchShops } from '../services/shopsService';
import { fetchProfiles, fetchStaff, fetchCustomers, fetchShopMembers } from '../services/usersService';
import { fetchBills, fetchPayments, fetchSubscriptions, subscribeToSubscriptions } from '../services/billingService';
import { fetchAccountDeletions, subscribeToAccountDeletions } from '../services/deletionsService';
import { fetchSupportMessages, subscribeToSupportMessages } from '../services/supportService';
import {
  fetchTelemetryRecords,
  fetchSystemHealthRecords,
  fetchSystemLogs,
  subscribeToTelemetryAndHealth,
} from '../services/telemetryAndHealthService';

import {
  Shop,
  Profile,
  Staff,
  ShopMember,
  Customer,
  Bill,
  Payment,
  AccountDeletion,
  SupportMessage,
  TelemetryRecord,
  SystemHealthRecord,
  SystemLogRecord,
} from '../types/database';
import { NavView } from '../types/dashboard';

function checkIsPrivacyUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const search = window.location.search.toLowerCase();
  return (
    path === '/privacy' ||
    path === '/privacy-policy' ||
    path === '/privacy-policies' ||
    path.startsWith('/privacy') ||
    hash.includes('privacy') ||
    search.includes('privacy')
  );
}

function checkIsDeleteAccountUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const search = window.location.search.toLowerCase();
  return (
    path === '/delete-account' ||
    path === '/delete-account/' ||
    path === '/delete' ||
    path === '/delete/' ||
    path === '/account-deletion' ||
    path.startsWith('/delete-account') ||
    hash.includes('delete-account') ||
    search.includes('delete-account')
  );
}

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

function MainDashboardContent() {
  const { user, logout } = useAuth();
  const { selectedOption, setSelectedOption } = useDateFilter();

  const [currentView, setCurrentView] = useState<NavView>('dashboard');
  const [salonsTab, setSalonsTab] = useState<'directory' | 'stylists'>('directory');
  const [viewingShopDetail, setViewingShopDetail] = useState<Shop | null>(null);
  const [originViewBeforeDetail, setOriginViewBeforeDetail] = useState<NavView | null>(null);

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isPrivacyRoute, setIsPrivacyRoute] = useState(() => checkIsPrivacyUrl());
  const [isDeleteAccountRoute, setIsDeleteAccountRoute] = useState(() => checkIsDeleteAccountUrl());
  const [toastMessage, setToastMessage] = useState<string>('');

  // Real Database Entities
  const [shops, setShops] = useState<Shop[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [shopMembers, setShopMembers] = useState<ShopMember[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [deletions, setDeletions] = useState<AccountDeletion[]>([]);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [telemetryRecords, setTelemetryRecords] = useState<TelemetryRecord[]>([]);
  const [systemHealthRecords, setSystemHealthRecords] = useState<SystemHealthRecord[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLogRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 2800);
  }, []);

  const loadAllData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [
        shopsRes,
        profilesRes,
        staffRes,
        shopMembersRes,
        customersRes,
        billsRes,
        paymentsRes,
        deletionsRes,
        supportRes,
        subsRes,
        telemetryRes,
        healthRes,
        logsRes,
      ] = await Promise.all([
        fetchShops(),
        fetchProfiles(),
        fetchStaff(),
        fetchShopMembers(),
        fetchCustomers(),
        fetchBills(),
        fetchPayments(),
        fetchAccountDeletions(),
        fetchSupportMessages(),
        fetchSubscriptions(),
        fetchTelemetryRecords(),
        fetchSystemHealthRecords(),
        fetchSystemLogs(),
      ]);

      setShops(shopsRes.data || []);
      setProfiles(profilesRes.data || []);
      setStaff(staffRes.data || []);
      setShopMembers(shopMembersRes.data || []);
      setCustomers(customersRes.data || []);
      setBills(billsRes.data || []);
      setPayments(paymentsRes.data || []);
      setDeletions(deletionsRes.data || []);
      setSupportMessages(supportRes.data || []);
      setSubscriptions(subsRes.data || []);
      setTelemetryRecords(telemetryRes.data || []);
      setSystemHealthRecords(healthRes.data || []);
      setSystemLogs(logsRes.data || []);
    } catch (err: any) {
      console.error('Data sync error:', err);
      showToast('Error syncing with Supabase');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAllData();
    const interval = setInterval(() => {
      loadAllData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [loadAllData]);

  // Realtime subscriptions
  useEffect(() => {
    const unsubDeletions = subscribeToAccountDeletions(() => {
      fetchAccountDeletions().then((res) => {
        if (res.data) setDeletions(res.data);
      });
    });

    const unsubSubscriptions = subscribeToSubscriptions(() => {
      fetchSubscriptions().then((res) => {
        if (res.data) setSubscriptions(res.data);
      });
    });

    return () => {
      unsubDeletions();
      unsubSubscriptions();
    };
  }, []);

  // Listen to popstate for public privacy/deletion URLs
  useEffect(() => {
    const handleUrlChange = () => {
      setIsPrivacyRoute(checkIsPrivacyUrl());
      setIsDeleteAccountRoute(checkIsDeleteAccountUrl());
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  const openPrivacyPage = () => {
    setIsPrivacyRoute(true);
    setIsDeleteAccountRoute(false);
    if (!window.location.pathname.includes('privacy')) {
      window.history.pushState({}, '', '/privacy');
    }
  };

  const closePrivacyPage = () => {
    setIsPrivacyRoute(false);
    window.history.pushState({}, '', '/');
  };

  const openDeleteAccountPage = () => {
    setIsDeleteAccountRoute(true);
    setIsPrivacyRoute(false);
    if (!window.location.pathname.includes('delete-account')) {
      window.history.pushState({}, '', '/delete-account');
    }
  };

  const closeDeleteAccountPage = () => {
    setIsDeleteAccountRoute(false);
    window.history.pushState({}, '', '/');
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    loadAllData();
    showToast('Refreshed data from Supabase');
  };

  // Canonical drilldown: Clicking any outlet anywhere opens SalonFreshDetailPage
  const handleSelectSalonDrilldown = (shop: Shop) => {
    setOriginViewBeforeDetail(currentView);
    setViewingShopDetail(shop);
  };

  const handleExportCurrentView = (format: ExportFormat) => {
    let exportItems: Record<string, any>[] = [];
    let name = 'counterpro';

    if (currentView === 'dashboard' || currentView === 'daily_bills') {
      exportItems = bills.map((b) => ({
        'Invoice Number': b.invoice_number || b.bill_number,
        'Outlet': b.shop?.name || b.shop_id,
        'Customer': b.customer?.name || b.customer_name || 'Walk-in',
        'Customer Phone': b.customer?.phone || b.customer_phone || 'None',
        'Issued Date': b.issued_at || b.created_at,
        'Subtotal (INR)': (b.subtotal_minor || 0) / 100,
        'Total (INR)': (b.total_minor || 0) / 100,
        'Due Amount (INR)': (b.due_amount_minor || 0) / 100,
        'Payment Mode': b.payment_mode || 'CASH',
        'Status': b.status,
      }));
      name = 'counterpro-sales-report';
    } else if (currentView === 'salons_360') {
      exportItems = shops.map((s) => ({
        'Outlet ID': s.id,
        'Outlet Name': s.name,
        'Phone': s.phone || '—',
        'City': s.city || 'Tamil Nadu',
        'Registered Date': s.created_at,
        'Free Quota Limit': s.free_sales_limit || 100,
        'Orders Count': s.bill_count || 0,
      }));
      name = 'counterpro-outlets-directory';
    } else if (currentView === 'daily_user_metrics') {
      exportItems = shops.map((s) => ({
        'Shop Name': s.name,
        'Phone': s.phone || '—',
        'City': s.city || 'Tamil Nadu',
        'Registered Date': s.created_at ? new Date(s.created_at).toLocaleDateString('en-IN') : '—',
        'Status': s.is_active ? 'Active' : 'Inactive',
      }));
      name = 'counterpro-daily-user-metrics';
    } else if (currentView === 'account_deletions') {
      exportItems = deletions.map((d) => ({
        'Shop Name': d.shop_name || '—',
        'Phone': d.phone || '—',
        'Reason': d.reason || '—',
        'Deleted Date': d.deleted_at ? new Date(d.deleted_at).toLocaleDateString('en-IN') : '—',
      }));
      name = 'counterpro-deleted-users';
    } else {
      exportItems = shops.map((s) => ({
        'Shop Name': s.name,
        'Phone': s.phone || '—',
        'City': s.city || 'Tamil Nadu',
        'Status': s.is_active ? 'Active' : 'Inactive',
      }));
      name = `counterpro-${currentView}`;
    }

    const dateStamp = new Date().toISOString().split('T')[0];
    const fileName = `${name}-${dateStamp}`;

    if (format === 'json') {
      downloadBlob(JSON.stringify(exportItems, null, 2), `${fileName}.json`, 'application/json;charset=utf-8;');
      showToast(`Exported ${exportItems.length} records to JSON`);
    } else if (format === 'excel') {
      const csvStr = convertToCSV(exportItems);
      downloadBlob('\uFEFF' + csvStr, `${fileName}.csv`, 'text/csv;charset=utf-8;');
      showToast(`Exported ${exportItems.length} records to Excel`);
    } else {
      const csvStr = convertToCSV(exportItems);
      downloadBlob('\uFEFF' + csvStr, `${fileName}.csv`, 'text/csv;charset=utf-8;');
      showToast(`Exported ${exportItems.length} records to CSV`);
    }
  };

  // Public Routes
  if (isDeleteAccountRoute) {
    return (
      <DeleteAccountView
        isPublic={!user}
        onNavigateToLogin={() => closeDeleteAccountPage()}
        onBackToDashboard={() => closeDeleteAccountPage()}
        onOpenPrivacyPolicy={openPrivacyPage}
      />
    );
  }

  if (isPrivacyRoute) {
    return (
      <PrivacyPolicyView
        isPublic={!user}
        onNavigateToLogin={() => closePrivacyPage()}
        onBackToDashboard={() => closePrivacyPage()}
        onOpenDeleteAccount={openDeleteAccountPage}
      />
    );
  }

  // Dynamic View Titles & Subtitles matching StyleFleet hierarchy
  const viewMeta: { [key: string]: [string, string] } = {
    dashboard: [
      'Founder Dashboard',
      `Live executive KPIs, today's sales & real merchant metrics`,
    ],
    daily_user_metrics: [
      'Daily User Metrics',
      'Daily signups, active users, premium conversions, churn, and totals',
    ],
    daily_bills: [
      'Daily Order Metrics',
      `${bills.length} completed transactions recorded in live database`,
    ],
    orders: [
      'Daily Order Metrics',
      `${bills.length} completed transactions recorded in live database`,
    ],
    revenue_trend: [
      'Revenue Growth',
      'Company subscription revenue trend & monthly growth breakdown',
    ],
    geography: [
      'Geographic & Territory Intelligence',
      `Regional footprint across ${shops.length} merchant POS counters in South India`,
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
      `${deletions.length} account deletion requests & regulatory audit records`,
    ],
    app_telemetry: [
      'Touch Heatmap & Telemetry',
      'Device performance, battery, hardware pairing & sync queues',
    ],
    salons_360: [
      'Outlets Directory',
      `${shops.length} merchant stores — All on Free Plan (100 Sales Limit)`,
    ],
    shops: [
      'Outlets Directory',
      `${shops.length} merchant stores — All on Free Plan (100 Sales Limit)`,
    ],
    subscription_plans: [
      'Subscription & 100 Quotas',
      `Quota tracking, free sales allowance (100 limit) & Pro upgrade status`,
    ],
    staff_access: [
      'Staff Access Control',
      `Staff accounts, permissions matrix & invitation status`,
    ],
    purchases: [
      'Payment History',
      `${payments.length} payment transactions recorded in live database`,
    ],
    system_health: [
      'System & Shop Health',
      'PostgreSQL multi-tenant RLS status, database latency & storage metrics',
    ],
    reports_bi: [
      'Analytics & Business Intelligence',
      'Downloadable intelligence logs, tax records, invoice summaries & churn audits',
    ],
    support_messages: [
      'Support Outreach',
      'Direct merchant communications, onboarding greetings & support tickets',
    ],
    platform_audit: [
      'Activity Logs',
      'Tamper-proof event logs across bills, updates & admin operations',
    ],
    user_details: [
      'User Details',
      `${profiles.length} registered profiles authenticated via Supabase`,
    ],
    privacy: [
      'Privacy Policy Documentation',
      'Official legal disclosure & statutory compliance information',
    ],
  };

  const currentMeta = viewMeta[currentView] || ['Founder Dashboard', 'CounterPro 365 System'];

  return (
    <div className="min-h-screen flex bg-[#F8F3F0] text-[#101318]">
      {/* Sticky Left Sidebar matching StyleFleet */}
      <Sidebar
        currentView={currentView}
        onSelectView={(v) => {
          setCurrentView(v as NavView);
          setViewingShopDetail(null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        shopCount={shops.length}
        staffCount={staff.length}
        billsCount={bills.length}
        deletionsCount={deletions.length}
        lastUpdated={new Date()}
        adminUser={user ? { email: user.email, role: user.role, name: user.name } : null}
        onLogout={logout}
        onOpenPrivacy={openPrivacyPage}
        onOpenDeleteAccount={openDeleteAccountPage}
      />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Sticky Top Header Bar */}
        <Header
          title={viewingShopDetail ? viewingShopDetail.name : currentMeta[0]}
          subtitle={viewingShopDetail ? `Outlet ID: ${viewingShopDetail.id} • ${viewingShopDetail.city || 'Tamil Nadu'}` : currentMeta[1]}
          onRefresh={handleManualRefresh}
          onOpenResetModal={() => setIsResetModalOpen(true)}
          onAddUserAccount={() => setIsAddUserModalOpen(true)}
          onExportFormat={handleExportCurrentView}
          isLoading={loading || isRefreshing}
          adminUser={user ? { email: user.email, role: user.role, name: user.name } : null}
          onLogout={logout}
        />

        {/* Viewport */}
        <div className="flex-1 p-[20px_24px_40px] flex flex-col gap-[20px]">
          {viewingShopDetail ? (
            <ShopDetailPage
              shop={viewingShopDetail}
              profiles={profiles}
              staff={staff}
              customers={customers}
              bills={bills}
              appointments={[]}
              payments={payments}
              subscriptions={subscriptions}
              onBack={() => {
                setViewingShopDetail(null);
                if (originViewBeforeDetail) {
                  setCurrentView(originViewBeforeDetail);
                  setOriginViewBeforeDetail(null);
                }
              }}
              onRefresh={handleManualRefresh}
            />
          ) : (
            <>
              {/* 1. Founder Dashboard */}
              {currentView === 'dashboard' && (
                <DashboardView
                  shops={shops}
                  profiles={profiles}
                  staff={staff}
                  customers={customers}
                  bills={bills}
                  payments={payments}
                  subscriptions={subscriptions}
                  deletions={deletions}
                  supportMessages={supportMessages}
                  loading={loading || isRefreshing}
                  onRefresh={handleManualRefresh}
                  initialTab="daily_ledger"
                  onNavigate={(v) => setCurrentView(v)}
                  onSelectSalon={handleSelectSalonDrilldown}
                  onNavigateToStylists={() => setCurrentView('staff_access')}
                  onOpenPrivacyPolicy={openPrivacyPage}
                  onOpenDeleteAccount={openDeleteAccountPage}
                />
              )}

              {/* 2. Daily User Metrics */}
              {currentView === 'daily_user_metrics' && (
                <DailyUserMetricsView
                  shops={shops}
                  profiles={profiles}
                  shopMembers={shopMembers}
                  subscriptions={subscriptions}
                  bills={bills}
                  accountDeletions={deletions}
                  lastFetched={new Date()}
                  onRefresh={handleManualRefresh}
                  onShowToast={showToast}
                />
              )}

              {/* 3. Daily Order Metrics */}
              {currentView === 'daily_bills' && (
                <DailyBillsView
                  bills={bills}
                  shops={shops}
                  payments={payments}
                  customers={customers}
                  onOpenShopDrawer={handleSelectSalonDrilldown}
                  onRefresh={handleManualRefresh}
                  onShowToast={showToast}
                />
              )}

              {/* 4. Revenue Trend */}
              {currentView === 'revenue_trend' && (
                <RevenueTrendView
                  subscriptions={subscriptions}
                  shops={shops}
                  onShowToast={showToast}
                />
              )}

              {/* 5. Overview */}
              {currentView === 'overview' && (
                <OverviewView
                  shops={shops}
                  bills={bills}
                  billItems={[]}
                  subscriptions={subscriptions}
                  payments={payments}
                  customers={customers}
                  profiles={profiles}
                  shopMembers={shopMembers}
                  period="Month"
                  onOpenShopDrawer={handleSelectSalonDrilldown}
                  onShowToast={showToast}
                  onNavigate={(v) => setCurrentView(v as NavView)}
                />
              )}

              {/* 6. Subscription Plans & 100 Quotas Hub */}
              {currentView === 'subscription_plans' && (
                <SubscriptionPlansView
                  shops={shops}
                  bills={bills}
                  payments={payments}
                  subscriptions={subscriptions}
                  onOpenShopDrawer={handleSelectSalonDrilldown}
                  onShowToast={showToast}
                />
              )}

              {/* 7. Outlets Directory & Combined */}
              {currentView === 'salons_360' && (
                <ShopsCombinedView
                  shops={shops}
                  profiles={profiles}
                  staff={staff}
                  customers={customers}
                  bills={bills}
                  payments={payments}
                  subscriptions={subscriptions}
                  loading={loading}
                  onRefresh={handleManualRefresh}
                  onSelectSalon={handleSelectSalonDrilldown}
                  initialTab={salonsTab}
                />
              )}

              {/* 8. User Details */}
              {currentView === 'user_details' && (
                <UserDetailsView
                  profiles={profiles}
                  shopMembers={shopMembers}
                  shops={shops}
                  bills={bills}
                  subscriptions={subscriptions}
                  onOpenShopDrawer={handleSelectSalonDrilldown}
                  onShowToast={showToast}
                />
              )}

              {/* 9. Customer Tracking */}
              {currentView === 'customer_tracking' && (
                <CustomerTrackingView
                  shops={shops}
                  bills={bills}
                  customers={customers}
                  profiles={profiles}
                  onOpenShopDrawer={handleSelectSalonDrilldown}
                  onShowToast={showToast}
                />
              )}

              {/* 10. Incomplete Signups Drop-off Recovery */}
              {currentView === 'incomplete_signups' && (
                <IncompleteSignupsView
                  shops={shops}
                  profiles={profiles}
                  shopMembers={shopMembers}
                  accountDeletions={deletions}
                  onOpenShopDrawer={handleSelectSalonDrilldown}
                  onRefresh={handleManualRefresh}
                  onShowToast={showToast}
                />
              )}

              {/* 11. Staff Access Control */}
              {currentView === 'staff_access' && (
                <StylistsView
                  staff={staff}
                  shops={shops}
                  loading={loading}
                  onRefresh={handleManualRefresh}
                  onSelectSalon={handleSelectSalonDrilldown}
                />
              )}

              {/* 12. Payment History */}
              {currentView === 'purchases' && (
                <PurchasesView
                  payments={payments}
                  shops={shops}
                  subscriptions={subscriptions}
                  loading={loading}
                  onSelectSalon={handleSelectSalonDrilldown}
                />
              )}

              {/* 13. Reports & BI */}
              {currentView === 'reports_bi' && (
                <ReportsView
                  shops={shops}
                  profiles={profiles}
                  bills={bills}
                  appointments={[]}
                  deletions={deletions}
                />
              )}

              {/* 14. Support Messages */}
              {currentView === 'support_messages' && (
                <SupportMessagesView
                  messages={supportMessages}
                  shops={shops}
                  profiles={profiles}
                  loading={loading}
                  onRefresh={handleManualRefresh}
                />
              )}

              {/* 15. Touch Heatmap & App Telemetry */}
              {currentView === 'app_telemetry' && (
                <AppTelemetryCombinedView
                  records={telemetryRecords}
                  shops={shops}
                  loading={loading}
                  onRefresh={handleManualRefresh}
                />
              )}

              {/* 16. Activity Logs */}
              {currentView === 'platform_audit' && (
                <AuditTrailView
                  payments={payments}
                  bills={bills}
                  appointments={[]}
                  deletions={deletions}
                  shops={shops}
                  loading={loading}
                />
              )}

              {/* 17. Shop & System Health */}
              {(currentView === 'system_health' || currentView === 'diagnostic_logs') && (
                <SystemHealthView
                  healthRecords={systemHealthRecords}
                  logs={systemLogs}
                  shops={shops}
                  bills={bills}
                  loading={loading}
                  onRefresh={handleManualRefresh}
                  onSelectShop={handleSelectSalonDrilldown}
                />
              )}

              {/* 18. Account Deletions */}
              {currentView === 'account_deletions' && (
                <AccountDeletionsView
                  deletions={deletions}
                  shops={shops}
                  loading={loading}
                  onRefresh={handleManualRefresh}
                  onOpenDeleteAccountInstructions={openDeleteAccountPage}
                />
              )}

              {/* 19. Privacy Policy in-app */}
              {currentView === 'privacy' && (
                <PrivacyPolicyView
                  isPublic={false}
                  onBackToDashboard={() => setCurrentView('dashboard')}
                  onOpenDeleteAccount={openDeleteAccountPage}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* Reset Account Password Modal */}
      <ResetPasswordModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
      />

      {/* Add User Account Modal */}
      <AddUserAccountModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        currentUserEmail={user?.email || 'info@tecstellar.com'}
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

function AuthGate() {
  const { isAuthenticated } = useAuth();
  const [isPrivacyRoute, setIsPrivacyRoute] = useState(false);
  const [isDeleteAccountRoute, setIsDeleteAccountRoute] = useState(false);

  useEffect(() => {
    setIsPrivacyRoute(checkIsPrivacyUrl());
    setIsDeleteAccountRoute(checkIsDeleteAccountUrl());
  }, []);

  if (isDeleteAccountRoute) {
    return (
      <DeleteAccountView
        isPublic={!isAuthenticated}
        onNavigateToLogin={() => setIsDeleteAccountRoute(false)}
        onBackToDashboard={() => setIsDeleteAccountRoute(false)}
        onOpenPrivacyPolicy={() => {
          setIsDeleteAccountRoute(false);
          setIsPrivacyRoute(true);
        }}
      />
    );
  }

  if (isPrivacyRoute) {
    return (
      <PrivacyPolicyView
        isPublic={!isAuthenticated}
        onNavigateToLogin={() => setIsPrivacyRoute(false)}
        onBackToDashboard={() => setIsPrivacyRoute(false)}
        onOpenDeleteAccount={() => {
          setIsPrivacyRoute(false);
          setIsDeleteAccountRoute(true);
        }}
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginView
        onOpenPrivacyPolicy={() => setIsPrivacyRoute(true)}
        onOpenDeleteAccount={() => setIsDeleteAccountRoute(true)}
      />
    );
  }

  return <MainDashboardContent />;
}

export default function AdminConsolePage() {
  return (
    <AuthProvider>
      <DateFilterProvider>
        <AuthGate />
      </DateFilterProvider>
    </AuthProvider>
  );
}
