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
  adminUser?: { email: string; role: string; name?: string } | null;
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
    currentView === 'app_telemetry' || currentView === 'diagnostic_logs'
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

  const isCurrent = (view: string) => {
    if (view === 'salons_360') return currentView === 'salons_360' || currentView === 'shops';
    if (view === 'staff_access') return currentView === 'staff_access' || currentView === 'staff';
    if (view === 'platform_audit') return currentView === 'platform_audit' || currentView === 'logs';
    if (view === 'purchases') return currentView === 'purchases' || currentView === 'payments';
    if (view === 'system_health') return currentView === 'system_health' || currentView === 'health';
    if (view === 'reports_bi') return currentView === 'reports_bi' || currentView === 'reports';
    if (view === 'daily_bills') return currentView === 'daily_bills' || currentView === 'orders';
    if (view === 'app_telemetry') return currentView === 'app_telemetry' || currentView === 'hardware';
    if (view === 'support_messages') return currentView === 'support_messages' || currentView === 'support';
    if (view === 'account_deletions') return currentView === 'account_deletions' || currentView === 'deletions';
    return currentView === view;
  };

  const isAppActivityActive = isCurrent('app_telemetry') || isCurrent('diagnostic_logs');
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
    const active = isCurrent(id);
    return (
      <button
        key={id}
        onClick={() => onSelectView(id)}
        title={isCollapsed ? label : undefined}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all group relative text-left cursor-pointer ${
          active
            ? 'bg-[#FD5E03] text-white font-bold shadow-sm shadow-[#FD5E03]/30'
            : 'text-neutral-400 hover:text-white hover:bg-[#252932] font-medium'
        }`}
      >
        <Icon
          className={`w-4 h-4 shrink-0 transition-colors ${
            active ? 'text-white' : 'text-neutral-400 group-hover:text-white'
          }`}
        />
        {!isCollapsed && (
          <div className="flex-1 flex items-center justify-between overflow-hidden">
            <span className="truncate">{label}</span>
            <div className="flex items-center gap-1.5 ml-2">
              {hasDot && (
                <span className="w-2 h-2 rounded-full bg-[#FD5E03] animate-pulse" />
              )}
              {badge !== undefined && Number(badge) > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    active ? 'bg-white/25 text-white' : 'bg-[#252932] text-neutral-300 border border-[#2d3139]'
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
            ? 'bg-[#FD5E03] text-white font-bold shadow-xs'
            : 'text-neutral-400 hover:text-white hover:bg-[#252932] font-medium'
        }`}
      >
        <Icon
          className={`w-3.5 h-3.5 shrink-0 ${
            active ? 'text-white' : 'text-neutral-400 group-hover:text-white'
          }`}
        />
        {!isCollapsed && (
          <>
            <span className="truncate">{label}</span>
            {badge !== undefined && Number(badge) > 0 && (
              <span
                className={`ml-auto px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${
                  active ? 'bg-white/25 text-white' : 'bg-[#252932] text-neutral-300 border border-[#2d3139]'
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
      className={`flex flex-col h-screen bg-[#1c1f26] text-neutral-400 border-r border-[#2d3139] select-none sticky top-0 transition-all duration-200 z-30 shrink-0 ${
        isCollapsed ? 'w-[70px]' : 'w-[270px]'
      }`}
    >
      {/* Brand Header */}
      <div className="p-3.5 border-b border-[#2d3139]">
        <div className="flex items-center justify-between">
            {!isCollapsed ? (
            <div className="w-full flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shrink-0 shadow-sm bg-black border border-[#2d3139]">
                  <img
                    src="/assets/counterpro-logo.png"
                    alt="CounterPro Logo"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1 leading-tight">
                    <span className="text-[13px] font-extrabold text-white tracking-wider uppercase truncate">
                      COUNTER<span className="text-[#FD5E03]">365</span>
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-neutral-400 leading-tight mt-0.5">
                    Admin / Operations Console
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsCollapsed(true)}
                className="hidden lg:flex p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#252932] transition-colors cursor-pointer"
                title="Collapse Sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center gap-2 py-1">
              <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shadow-sm bg-black border border-[#2d3139]">
                <img
                  src="/assets/counterpro-logo.png"
                  alt="CounterPro Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                onClick={() => setIsCollapsed(false)}
                className="hidden lg:flex p-1 rounded-md text-neutral-400 hover:text-white hover:bg-[#252932] transition-colors cursor-pointer"
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
            <div className="px-3 pb-1.5 text-[10.5px] font-bold tracking-[0.08em] text-neutral-500 uppercase font-mono">
              WORKSPACE
            </div>
          )}

          {renderNavItem('dashboard', 'Founder Dashboard', LayoutDashboard)}
          {renderNavItem('daily_user_metrics', 'Daily User Metrics', Users)}
          {renderNavItem('daily_bills', 'Daily Order Metrics', Receipt, billsCount)}
          {renderNavItem('revenue_trend', 'Revenue Trend', TrendingUp)}
          {renderNavItem('geography', 'Geography & Territory', Globe, 3)}
          {renderNavItem('overview', 'Overview', PieChart)}
          {renderNavItem('incomplete_signups', 'Incomplete signups', UserMinus)}
          {renderNavItem('account_deletions', 'Deleted users', UserX, deletionsCount)}

          {/* Submenu 1: App Activity */}
          <div className="pt-0.5">
            <button
              onClick={() => setIsAppActivityOpen(!isAppActivityOpen)}
              title={isCollapsed ? 'App Activity' : undefined}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] transition-all group cursor-pointer ${
                isAppActivityActive
                  ? 'text-white font-semibold'
                  : 'text-neutral-400 hover:text-white hover:bg-[#252932] font-medium'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Activity
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isAppActivityActive ? 'text-[#FD5E03]' : 'text-neutral-400 group-hover:text-white'
                  }`}
                />
                {!isCollapsed && <span className="truncate">App Activity</span>}
              </div>
              {!isCollapsed && (
                <ChevronRight
                  className={`w-4 h-4 text-neutral-400 group-hover:text-white transition-transform duration-200 shrink-0 ${
                    isAppActivityOpen ? 'rotate-90 text-[#FD5E03]' : ''
                  }`}
                />
              )}
            </button>

            {(isAppActivityOpen || isCollapsed) && (
              <div className="space-y-0.5 mt-0.5">
                {renderSubmenuItem('app_telemetry', 'Touch Heatmap', MousePointer)}
                {renderSubmenuItem('diagnostic_logs', 'App Bugs', Bug)}
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
                  ? 'text-white font-semibold'
                  : 'text-neutral-400 hover:text-white hover:bg-[#252932] font-medium'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Store
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isShopAnalyticsActive ? 'text-[#FD5E03]' : 'text-neutral-400 group-hover:text-white'
                  }`}
                />
                {!isCollapsed && <span className="truncate">Shop Analytics</span>}
              </div>
              {!isCollapsed && (
                <ChevronRight
                  className={`w-4 h-4 text-neutral-400 group-hover:text-white transition-transform duration-200 shrink-0 ${
                    isShopAnalyticsOpen ? 'rotate-90 text-[#FD5E03]' : ''
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
            <div className="px-3 pb-1.5 text-[10.5px] font-bold tracking-[0.08em] text-neutral-500 uppercase font-mono">
              ENGAGEMENT
            </div>
          )}
          <div className="space-y-0.5">
            {renderNavItem('support_messages', 'Support', MessageSquare, undefined, true)}
          </div>
        </div>
      </nav>

      {/* Footer Area Matching IronDrobe Platform */}
      <div className="p-2.5 border-t border-[#2d3139] bg-[#1c1f26]">
        {!isCollapsed ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1 text-[11px]">
              <div className="flex items-center gap-1.5 text-neutral-300 font-bold font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] tracking-wide uppercase text-neutral-400">
                  Live Supabase (ap-south-1)
                </span>
              </div>
              <button
                onClick={() => setIsCollapsed(true)}
                className="hidden lg:flex p-1 rounded-md hover:bg-[#252932] text-neutral-400 hover:text-white transition-colors cursor-pointer"
                title="Collapse Sidebar"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Actions Control Bar */}
            <div className="flex items-center justify-between gap-1 p-1 bg-[#15171d] rounded-xl border border-[#2d3139]">
              <button
                onClick={onOpenPrivacy || (() => onSelectView('privacy'))}
                className="p-2 rounded-lg text-neutral-400 hover:text-[#FD5E03] hover:bg-[#252932] transition-all cursor-pointer flex-1 flex justify-center"
                title="Privacy Policy"
              >
                <FileText className="w-4 h-4" />
              </button>
              <button
                onClick={onOpenDeleteAccount || (() => onSelectView('account_deletions'))}
                className="p-2 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-[#252932] transition-all cursor-pointer flex-1 flex justify-center"
                title="Delete Account Management"
              >
                <UserX className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-[#2d3139] mx-0.5" />
              <button
                onClick={onLogout}
                className="p-2 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-[#252932] transition-all cursor-pointer flex-1 flex justify-center"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"
              title="Live Connection"
            />
            <button
              onClick={onOpenPrivacy || (() => onSelectView('privacy'))}
              className="p-2 rounded-lg hover:bg-[#252932] text-neutral-400 hover:text-[#FD5E03] transition-colors cursor-pointer"
              title="Privacy Policy"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={onLogout}
              className="p-2 rounded-lg hover:bg-[#252932] text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsCollapsed(false)}
              className="hidden lg:flex p-1.5 rounded-md hover:bg-[#252932] text-neutral-400 hover:text-white transition-colors cursor-pointer mt-1"
              title="Expand Sidebar"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
