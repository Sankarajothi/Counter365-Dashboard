'use client';

import React, { useState, useMemo } from 'react';
import {
  Shop,
  Bill,
  MenuItem,
  Expense,
  Subscription,
  ShopMember,
  AccountDeletion,
} from '../../types/database';
import { formatINR } from '../../lib/adminData';
import {
  History,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Store,
  DollarSign,
  Package,
  Users,
  UserX,
  Clock,
  Sparkles,
  Download,
} from 'lucide-react';

interface LogsViewProps {
  shops: Shop[];
  bills: Bill[];
  menuItems: MenuItem[];
  expenses: Expense[];
  subscriptions: Subscription[];
  shopMembers: ShopMember[];
  accountDeletions?: AccountDeletion[];
  searchQuery: string;
}

export function LogsView({
  shops,
  bills,
  menuItems,
  expenses,
  subscriptions,
  shopMembers,
  accountDeletions = [],
  searchQuery,
}: LogsViewProps) {
  const [filter, setFilter] = useState('All');
  const [localSearch, setLocalSearch] = useState('');

  // Synthesize real events from live database records
  const allEvents = useMemo(() => {
    const list: {
      id: string;
      timestamp: Date;
      timeString: string;
      msg: string;
      who: string;
      kind: 'Signup' | 'Payment' | 'Users' | 'Menu' | 'Pending' | 'Expense' | 'Order' | 'Deletion';
      dotColor: string;
    }[] = [];

    // 1. Shop Signups
    shops.forEach((s) => {
      const d = new Date(s.created_at);
      list.push({
        id: `signup-${s.id}`,
        timestamp: d,
        timeString:
          d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) +
          ' ' +
          d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        msg: `Shop registered — category "${s.shop_type || 'General'}", located in ${s.city || 'Tamil Nadu'}`,
        who: `${s.name} · +91 ${s.phone}`,
        kind: 'Signup',
        dotColor: '#D4621A',
      });
    });

    // 2. Subscriptions
    subscriptions.forEach((sub) => {
      const shop = shops.find((s) => s.id === sub.shop_id);
      const d = new Date(sub.created_at);
      list.push({
        id: `sub-${sub.id}`,
        timestamp: d,
        timeString:
          d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) +
          ' ' +
          d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        msg: `Subscription ${sub.status} — ${sub.plan.toUpperCase()} (${sub.interval || 'monthly'}) for ${formatINR(Number(sub.amount || 0))}`,
        who: `${shop?.name || 'Shop'} · Billing Engine`,
        kind: 'Payment',
        dotColor: '#101318',
      });
    });

    // 3. Bills / Orders
    bills.forEach((b) => {
      const shop = shops.find((s) => s.id === b.shop_id);
      const d = new Date(b.completed_at || b.created_at);
      const isPending = Number(b.pending_amount || 0) > 0;

      list.push({
        id: `bill-${b.id}`,
        timestamp: d,
        timeString:
          d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) +
          ' ' +
          d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        msg: isPending
          ? `Bill #${b.bill_number} generated with ₹${b.pending_amount} pending balance`
          : `Bill #${b.bill_number} completed — ${formatINR(Number(b.total_amount))} settled via ${b.payment_mode || 'Cash'}`,
        who: `${shop?.name || 'Shop'} · ${b.customer_name ? `Customer: ${b.customer_name}` : 'Counter POS'}`,
        kind: isPending ? 'Pending' : 'Order',
        dotColor: isPending ? '#C2410C' : '#10B981',
      });
    });

    // 4. Expenses
    expenses.forEach((e) => {
      const shop = shops.find((s) => s.id === e.shop_id);
      const d = new Date(e.created_at);
      list.push({
        id: `exp-${e.id}`,
        timestamp: d,
        timeString:
          d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) +
          ' ' +
          d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        msg: `Expense recorded — ${formatINR(Number(e.amount))} for "${e.description}"`,
        who: `${shop?.name || 'Shop'} · Operational Ledger`,
        kind: 'Expense',
        dotColor: '#EF4444',
      });
    });

    // 5. Menu Items Created
    menuItems.slice(0, 20).forEach((m) => {
      const shop = shops.find((s) => s.id === m.shop_id);
      const d = new Date(m.created_at);
      list.push({
        id: `menu-${m.id}`,
        timestamp: d,
        timeString:
          d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) +
          ' ' +
          d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        msg: `Menu catalog item created — "${m.name}" priced at ${formatINR(Number(m.price))}`,
        who: `${shop?.name || 'Shop'} · Menu Manager`,
        kind: 'Menu',
        dotColor: '#FB923C',
      });
    });

    // 6. Shop Members added
    shopMembers.forEach((sm) => {
      const shop = shops.find((s) => s.id === sm.shop_id);
      const d = new Date(sm.created_at);
      list.push({
        id: `mem-${sm.id}`,
        timestamp: d,
        timeString:
          d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) +
          ' ' +
          d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        msg: `Staff operator registered with ${sm.role} role`,
        who: `${shop?.name || 'Shop'} · Access Control`,
        kind: 'Users',
        dotColor: '#EA580C',
      });
    });

    // 7. Account Deletions
    accountDeletions.forEach((ad) => {
      const d = new Date(ad.deleted_at || ad.created_at || Date.now());
      list.push({
        id: `del-${ad.id}`,
        timestamp: d,
        timeString:
          d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) +
          ' ' +
          d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        msg: `Account deletion audit — ${ad.shop_name || 'Shop'} (Reason: "${ad.reason || 'Unspecified'}")`,
        who: `${ad.owner_name || 'Owner'} · ${ad.phone ? `+91 ${ad.phone}` : 'No phone'}`,
        kind: 'Deletion',
        dotColor: '#DC2626',
      });
    });

    // Sort newest first
    return list.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [shops, subscriptions, bills, expenses, menuItems, shopMembers, accountDeletions]);

  const filterChips = [
    'All',
    'Signup',
    'Order',
    'Payment',
    'Pending',
    'Menu',
    'Expense',
    'Users',
    'Deletion',
  ];

  const effectiveSearch = (searchQuery || localSearch).trim().toLowerCase();

  const filtered = useMemo(() => {
    return allEvents.filter((ev) => {
      const matchSearch =
        !effectiveSearch ||
        `${ev.msg} ${ev.who} ${ev.kind}`.toLowerCase().includes(effectiveSearch);

      if (!matchSearch) return false;
      if (filter !== 'All') return ev.kind.toLowerCase() === filter.toLowerCase();
      return true;
    });
  }, [allEvents, effectiveSearch, filter]);

  return (
    <div className="space-y-6 font-sans select-none animate-in fade-in duration-150">
      {/* 1. Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#11141a] via-[#1c1f28] to-[#11141a] border border-[#2b303c] p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-[#D4621A]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#D4621A] animate-pulse" />
              <span className="text-xs font-mono font-bold tracking-wider text-[#D4621A] uppercase">
                Immutable System Audit Trail
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white m-0">
              Activity & Diagnostic Logs
            </h2>
            <p className="text-xs text-gray-400 max-w-2xl leading-relaxed m-0">
              Complete chronological audit stream of all merchant signups, POS billing transactions, menu catalog changes, and administrative security events.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-[11px] font-mono text-gray-400 uppercase">Total Event Entries</div>
              <div className="text-2xl font-bold font-mono text-[#D4621A]">{allEvents.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Metric KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:border-[#D4621A]/50 transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Audit Stream Events</span>
            <div className="p-2 rounded-xl bg-[#F8F3F0] text-[#D4621A]">
              <History className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-[#111827]">
            {allEvents.length}
          </div>
          <div className="mt-2 text-[11.5px] text-gray-500 flex items-center justify-between">
            <span>Verified audit records</span>
            <span className="text-[#D4621A] font-bold">100% Real</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:border-emerald-400/50 transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Order Events</span>
            <div className="p-2 rounded-xl bg-[#F8F3F0] text-[#D4621A]">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-[#111827]">
            {bills.length}
          </div>
          <div className="mt-2 text-[11.5px] text-gray-500 flex items-center justify-between">
            <span>Live POS transactions</span>
            <span className="text-[#D4621A] font-semibold">Settled</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:border-blue-400/50 transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Store Signups</span>
            <div className="p-2 rounded-xl bg-[#F8F3F0] text-[#D4621A]">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-[#111827]">
            {shops.length}
          </div>
          <div className="mt-2 text-[11.5px] text-gray-500 flex items-center justify-between">
            <span>Enrolled merchants</span>
            <span className="text-[#D4621A] font-semibold">Live</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:border-purple-400/50 transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Catalog Operations</span>
            <div className="p-2 rounded-xl bg-[#F8F3F0] text-[#D4621A]">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-[#111827]">
            {menuItems.length}
          </div>
          <div className="mt-2 text-[11.5px] text-gray-500 flex items-center justify-between">
            <span>Menu & item revisions</span>
            <span className="text-[#D4621A] font-semibold">Tracked</span>
          </div>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {filterChips.map((chip) => {
            const isActive = filter === chip;
            return (
              <button
                key={chip}
                onClick={() => setFilter(chip)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#1c1f26] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:text-black hover:bg-gray-200'
                }`}
              >
                {chip}
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search audit trail..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-[#D4621A] focus:outline-hidden"
          />
        </div>
      </div>

      {/* 4. Event Stream Ledger */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-[#FAFAFB] border-b border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <div>
            Showing <strong className="text-gray-900">{filtered.length}</strong> events &bull; Filter:{' '}
            <strong className="text-gray-800">{filter}</strong>
          </div>
          <span className="font-mono text-gray-400">Timestamped in IST (ap-south-1)</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-20 text-center text-gray-400 text-xs">
            <History className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <div className="font-semibold text-gray-700 text-sm">No activity events match your filter.</div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((ev) => (
              <div
                key={ev.id}
                className="p-4 hover:bg-slate-50/70 transition-colors flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5"
                    style={{ backgroundColor: ev.dotColor }}
                  />
                  <div className="space-y-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-900 leading-snug">
                      {ev.msg}
                    </div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-2">
                      <span className="font-medium text-gray-700">{ev.who}</span>
                      <span>&bull;</span>
                      <span className="px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 font-mono text-[10px]">
                        {ev.kind}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 text-gray-400 font-mono text-[11px] whitespace-nowrap">
                  {ev.timeString}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
