'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard,
  Layers,
  Users,
  Receipt,
  TrendingUp,
  PieChart,
  UserCheck,
  UserMinus,
  UserX,
  Activity,
  MousePointer,
  Bug,
  Store,
  CreditCard,
  ShieldCheck,
  History,
  Contact,
  Wallet,
  HeartPulse,
  BarChart3,
  UserPlus,
  MessageSquare,
  Radio,
  Clock,
  Bell,
  ChevronRight,
  LogOut,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Globe,
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  shopCount: number;
  staffCount?: number;
  billsCount?: number;
  paymentAlertCount?: number;
  logCount?: number;
  deletionsCount: number;
  lastUpdated: Date | null;
  adminUser?: {
    email: string;
    role: string;
    name?: string;
    access_type?: 'full' | 'strict';
    allowed_modules?: string[];
  } | null;
  onLogout?: () => void;
  onOpenPrivacy?: () => void;
  onOpenDeleteAccount?: () => void;
}

export function Sidebar({
  currentView,
  onSelectView,
  shopCount,
  staffCount = 0,
  billsCount = 0,
  deletionsCount = 0,
  lastUpdated,
  adminUser,
  onLogout,
  onOpenPrivacy,
  onOpenDeleteAccount,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAppActivityOpen, setIsAppActivityOpen] = useState(
    currentView === 'app_telemetry' ||
      currentView === 'diagnostic_logs'
  );
  const [isShopAnalyticsOpen, setIsShopAnalyticsOpen] = useState(
    currentView === 'salons_360' ||
      currentView === 'shops' ||
      currentView === 'subscription_plans' ||
      currentView === 'staff_access' ||
      currentView === 'staff' ||
      currentView === 'platform_audit' ||
      currentView === 'logs' ||
      currentView === 'user_details' ||
      currentView === 'purchases' ||
      currentView === 'payments' ||
      currentView === 'system_health' ||
      currentView === 'health' ||
      currentView === 'reports_bi' ||
      currentView === 'reports'
  );

  const canAccess = (id: string) => {
    if (!adminUser || !adminUser.access_type || adminUser.access_type === 'full') return true;
    if (adminUser.access_type === 'strict' && Array.isArray(adminUser.allowed_modules)) {
      return adminUser.allowed_modules.includes(id);
    }
    return true;
  };

  const isCurrent = (id: string) => {
    if (currentView === id) return true;
    if (id === 'dashboard' && currentView === 'executive_kpis') return true;
    if (id === 'daily_bills' && currentView === 'orders') return true;
    if (id === 'salons_360' && currentView === 'shops') return true;
    if (id === 'staff_access' && currentView === 'staff') return true;
    if (id === 'platform_audit' && currentView === 'logs') return true;
    if (id === 'purchases' && currentView === 'payments') return true;
    if (id === 'system_health' && currentView === 'health') return true;
    if (id === 'reports_bi' && currentView === 'reports') return true;
    return false;
  };

  const isAppActivityActive =
    isCurrent('app_telemetry') || isCurrent('diagnostic_logs');

  const isShopAnalyticsActive =
    isCurrent('salons_360') ||
    isCurrent('subscription_plans') ||
    isCurrent('staff_access') ||
    isCurrent('platform_audit') ||
    isCurrent('user_details') ||
    isCurrent('purchases') ||
    isCurrent('system_health') ||
    isCurrent('reports_bi');

  const renderNavItem = (
    id: string,
    label: string,
    Icon: React.ComponentType<{ className?: string }>,
    badge?: number | string,
    hasDot?: boolean
  ) => {
    if (!canAccess(id)) return null;
    const active = isCurrent(id);
    return (
      <button
        key={id}
        onClick={() => onSelectView(id)}
        title={isCollapsed ? label : undefined}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all group relative text-left cursor-pointer ${
          active
            ? 'bg-white !text-black font-black shadow-xs'
            : 'text-white hover:bg-white hover:!text-black font-bold'
        }`}
      >
        <Icon
          className={`w-4 h-4 shrink-0 transition-colors ${
            active ? '!text-black' : 'text-white group-hover:!text-black'
          }`}
        />
        {!isCollapsed && (
          <div className="flex-1 flex items-center justify-between overflow-hidden">
            <span className={`truncate font-extrabold ${active ? '!text-black' : 'text-white group-hover:!text-black'}`}>
              {label}
            </span>
            <div className="flex items-center gap-1.5 ml-2">
              {hasDot && (
                <span className={`w-2 h-2 rounded-full ${active ? 'bg-[#EA580C]' : 'bg-white'} animate-pulse`} />
              )}
              {badge !== undefined && Number(badge) > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black shadow-2xs transition-colors ${
                    active
                      ? 'bg-[#EA580C] text-white border border-[#C2410C]/30'
                      : 'bg-white text-[#EA580C] group-hover:bg-[#EA580C] group-hover:text-white border border-white/40'
                  }`}
                >
                  {badge}
                </span>
              )}
            </div>
          </div>
        )}
      </button>
    );
  };

  const renderSubmenuItem = (
    id: string,
    label: string,
    Icon: React.ComponentType<{ className?: string }>,
    badge?: number | string
  ) => {
    if (!canAccess(id)) return null;
    const active = isCurrent(id);
    return (
      <button
        key={id}
        onClick={() => onSelectView(id)}
        title={isCollapsed ? label : undefined}
        className={`w-full flex items-center gap-2.5 ${
          isCollapsed ? 'px-3 justify-center' : 'pl-8 pr-3'
        } py-1.5 rounded-lg text-[12px] transition-all group relative text-left cursor-pointer ${
          active
            ? 'bg-white !text-black font-black shadow-xs'
            : 'text-white hover:bg-white hover:!text-black font-bold'
        }`}
      >
        <Icon
          className={`w-3.5 h-3.5 shrink-0 ${
            active ? '!text-black' : 'text-white group-hover:!text-black'
          }`}
        />
        {!isCollapsed && (
          <>
            <span className={`truncate font-extrabold ${active ? '!text-black' : 'text-white group-hover:!text-black'}`}>
              {label}
            </span>
            {badge !== undefined && Number(badge) > 0 && (
              <span
                className={`ml-auto px-2 py-0.5 rounded-full text-[9px] font-mono font-black shadow-2xs transition-colors ${
                  active
                    ? 'bg-[#EA580C] text-white border border-[#C2410C]/30'
                    : 'bg-white text-[#EA580C] group-hover:bg-[#EA580C] group-hover:text-white border border-white/40'
                }`}
              >
                {badge}
              </span>
            )}
          </>
        )}
      </button>
    );
  };

  return (
    <aside
      className={`flex flex-col h-screen bg-[#EA580C] text-white select-none sticky top-0 transition-all duration-200 z-30 shrink-0 border-r border-[#C2410C]/30 ${
        isCollapsed ? 'w-[70px]' : 'w-[270px]'
      }`}
    >
      {/* Brand Header */}
      <div className="p-3.5 border-b border-white/15 bg-[#EA580C]">
        <div className="flex items-center justify-between">
          {!isCollapsed ? (
            <div className="w-full flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-xs border border-white/20">
                  <img
                    src="/assets/counterpro-logo.png"
                    alt="CounterPro Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1 leading-tight">
                    <span className="text-[12px] font-extrabold text-white tracking-wider uppercase truncate">
                      COUNTER365 CRM
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-white/90 leading-tight mt-0.5">
                    Admin
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsCollapsed(true)}
                className="hidden lg:flex p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Collapse Sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center gap-2 py-1">
              <div className="w-10 h-10 rounded-xl bg-white p-1.5 flex items-center justify-center shadow-xs border border-white/20">
                <img
                  src="/assets/counterpro-logo.png"
                  alt="CounterPro Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <button
                onClick={() => setIsCollapsed(false)}
                className="hidden lg:flex p-1 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Expand Sidebar"
              >
                <PanelLeftOpen className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tree */}
      <nav className="flex-1 px-2.5 py-3 space-y-3 overflow-y-auto">
        {/* Section: WORKSPACE */}
        <div className="space-y-0.5">
          {!isCollapsed && (
            <div className="px-3 pb-1.5 text-[10.5px] font-bold tracking-[0.08em] text-white/75 uppercase font-mono">
              WORKSPACE
            </div>
          )}

          {renderNavItem('dashboard', 'Founder Dashboard', LayoutDashboard)}
          {renderNavItem('daily_user_metrics', 'Daily User Metrics', Users)}
          {renderNavItem('daily_bills', 'Daily Order Metrics', Receipt, billsCount)}
          {renderNavItem('revenue_trend', 'Revenue Trend', TrendingUp)}
          {renderNavItem('overview', 'Overview', PieChart)}
          {renderNavItem('customer_tracking', 'Customer Tracking', Users)}
          {renderNavItem('incomplete_signups', 'Incomplete signups', UserMinus)}
          {renderNavItem('account_deletions', 'Deleted users', UserX, deletionsCount)}

          {/* Submenu 1: App Activity */}
          <div className="pt-0.5">
            <button
              onClick={() => setIsAppActivityOpen(!isAppActivityOpen)}
              title={isCollapsed ? 'App Activity' : undefined}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] transition-all group cursor-pointer ${
                isAppActivityActive
                  ? 'text-white font-bold bg-white/10'
                  : 'text-white/85 hover:text-white hover:bg-white/10 font-medium'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Activity
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isAppActivityActive ? 'text-white' : 'text-white/75 group-hover:text-white'
                  }`}
                />
                {!isCollapsed && <span className="truncate">App Activity</span>}
              </div>
              {!isCollapsed && (
                <ChevronRight
                  className={`w-4 h-4 text-white/75 group-hover:text-white transition-transform duration-200 shrink-0 ${
                    isAppActivityOpen ? 'rotate-90 text-white' : ''
                  }`}
                />
              )}
            </button>

            {(isAppActivityOpen || isCollapsed) && (
              <div className="space-y-0.5 mt-0.5">
                {renderSubmenuItem('app_telemetry', 'Touch Heatmap', MousePointer)}
                {renderSubmenuItem('diagnostic_logs', 'App Bugs', Bug)}
                {renderSubmenuItem('user_details', 'User Details', Contact)}
              </div>
            )}
          </div>

          {/* Submenu 2: Shop Analytics */}
          <div className="pt-0.5">
            <button
              onClick={() => setIsShopAnalyticsOpen(!isShopAnalyticsOpen)}
              title={isCollapsed ? 'Shop Analytics' : undefined}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] transition-all group cursor-pointer ${
                isShopAnalyticsActive
                  ? 'text-white font-bold bg-white/10'
                  : 'text-white/85 hover:text-white hover:bg-white/10 font-medium'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Store
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isShopAnalyticsActive ? 'text-white' : 'text-white/75 group-hover:text-white'
                  }`}
                />
                {!isCollapsed && <span className="truncate">Shop Analytics</span>}
              </div>
              {!isCollapsed && (
                <ChevronRight
                  className={`w-4 h-4 text-white/75 group-hover:text-white transition-transform duration-200 shrink-0 ${
                    isShopAnalyticsOpen ? 'rotate-90 text-white' : ''
                  }`}
                />
              )}
            </button>

            {(isShopAnalyticsOpen || isCollapsed) && (
              <div className="space-y-0.5 mt-0.5">
                {renderSubmenuItem('salons_360', 'Shop Directory', Store, shopCount)}
                {renderSubmenuItem('subscription_plans', 'Subscription & 100 Quotas', CreditCard)}
                {renderSubmenuItem('staff_access', 'Staff Access Control', ShieldCheck, staffCount)}
                {renderSubmenuItem('platform_audit', 'Activity Logs', History)}
                {renderSubmenuItem('user_details', 'User Details', Contact)}
                {renderSubmenuItem('purchases', 'Payment History', Wallet)}
                {renderSubmenuItem('system_health', 'Shop Health', HeartPulse)}
                {renderSubmenuItem('reports_bi', 'Analytics', BarChart3)}
              </div>
            )}
          </div>
        </div>

        {/* Section: ENGAGEMENT */}
        <div className="pt-2">
          {!isCollapsed && (
            <div className="px-3 pb-1.5 text-[10.5px] font-bold tracking-[0.08em] text-white/75 uppercase font-mono">
              ENGAGEMENT
            </div>
          )}
          <div className="space-y-0.5">
            {renderNavItem('support_messages', 'Support', MessageSquare, undefined, true)}
          </div>
        </div>
      </nav>

      {/* Footer Area */}
      <div className="p-2.5 border-t border-white/15 bg-[#D4621A]">
        {!isCollapsed ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1 text-[11px]">
              <div className="flex items-center gap-1.5 text-white font-bold font-mono">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-[10px] tracking-wide uppercase text-white/90">
                  Live Supabase (ap-south-1)
                </span>
              </div>
              <button
                onClick={() => setIsCollapsed(true)}
                className="hidden lg:flex p-1 rounded-md hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
                title="Collapse Sidebar"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Actions Control Bar */}
            <div className="flex items-center justify-between gap-1 p-1 bg-black/10 rounded-xl border border-white/15">
              <button
                onClick={onOpenPrivacy || (() => onSelectView('privacy'))}
                className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-all cursor-pointer flex-1 flex justify-center"
                title="Privacy Policy"
              >
                <FileText className="w-4 h-4" />
              </button>
              <button
                onClick={onOpenDeleteAccount || (() => onSelectView('account_deletions'))}
                className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-all cursor-pointer flex-1 flex justify-center"
                title="Delete Account Management"
              >
                <UserX className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-white/20 mx-0.5" />
              <button
                onClick={onLogout}
                className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-all cursor-pointer flex-1 flex justify-center"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"
              title="Live Connection"
            />
            <button
              onClick={onOpenPrivacy || (() => onSelectView('privacy'))}
              className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
              title="Privacy Policy"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={onLogout}
              className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsCollapsed(false)}
              className="hidden lg:flex p-1.5 rounded-md hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer mt-1"
              title="Expand Sidebar"
            >
              <PanelLeftOpen className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
