'use client';

import React, { useMemo } from 'react';
import { Shop, Subscription, Bill, Payment } from '../../types/database';
import { formatINR } from '../../lib/adminData';
import {
  TrendingUp,
  Calendar,
  Store,
  Zap,
  Award,
} from 'lucide-react';

interface RevenueTrendViewProps {
  subscriptions: Subscription[];
  shops: Shop[];
  bills?: Bill[];
  payments?: Payment[];
  onShowToast?: (msg: string) => void;
}

export function RevenueTrendView({
  subscriptions = [],
  shops = [],
  onShowToast,
}: RevenueTrendViewProps) {
  // 1. Company Subscription Revenue Calculations
  const paidSubscriptions = useMemo(
    () => subscriptions.filter((s) => s.plan !== 'free' || Number(s.amount || 0) > 0),
    [subscriptions]
  );

  const freeSubscriptions = useMemo(
    () => subscriptions.filter((s) => s.plan === 'free' && Number(s.amount || 0) === 0),
    [subscriptions]
  );

  // Total Company Revenue from all paid subscription plans
  const totalCompanyRevenue = useMemo(
    () => subscriptions.reduce((acc, s) => acc + Number(s.amount || 0), 0),
    [subscriptions]
  );

  // Monthly Recurring Revenue (MRR) - normalized monthly run rate
  const mrr = useMemo(() => {
    return paidSubscriptions.reduce((acc, s) => {
      const amt = Number(s.amount || 0);
      const interval = (s.interval || 'monthly').toLowerCase();
      if (interval.includes('year')) return acc + Math.round(amt / 12);
      return acc + amt;
    }, 0);
  }, [paidSubscriptions]);

  // Annual Recurring Revenue (ARR)
  const arr = mrr * 12;

  // Average Revenue Per User / Salon (ARPU)
  const arpu = shops.length > 0 ? Math.round(totalCompanyRevenue / shops.length) : 0;

  // Paid conversion rate
  const conversionRate = shops.length > 0 ? Math.round((paidSubscriptions.length / shops.length) * 100) : 0;

  // 2. 14-Day Trajectory of Subscription Activations & Revenue
  const trajectory14Days = useMemo(() => {
    const days: { label: string; dateStr: string; revenue: number; activations: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

      const daySubs = subscriptions.filter((s) => {
        const sDate = (s.subscription_start_at || s.created_at || '').split('T')[0];
        return sDate === dateStr;
      });

      const dayRev = daySubs.reduce((acc, s) => acc + Number(s.amount || 0), 0);
      days.push({ label, dateStr, revenue: dayRev, activations: daySubs.length });
    }

    const maxRev = Math.max(...days.map((d) => d.revenue), 100);
    return days.map((d) => ({
      ...d,
      heightPct: d.revenue > 0 ? Math.max(Math.round((d.revenue / maxRev) * 100), 15) : 6,
    }));
  }, [subscriptions]);

  // 3. Payment Channels Breakdown (Cashfree Gateway vs Manual Admin Activation)
  const channelBreakdown = useMemo(() => {
    let onlineAmount = 0;
    let onlineCount = 0;
    let manualAmount = 0;
    let manualCount = 0;

    subscriptions.forEach((s) => {
      const amt = Number(s.amount || 0);
      const method = (s.payment_method || '').toLowerCase();
      if (method.includes('manual') || method.includes('admin') || s.activated_by_admin_id) {
        manualAmount += amt;
        manualCount++;
      } else {
        onlineAmount += amt;
        onlineCount++;
      }
    });

    const totalCount = Math.max(subscriptions.length, 1);
    return {
      onlineAmount,
      onlineCount,
      onlinePct: Math.round((onlineCount / totalCount) * 100),
      manualAmount,
      manualCount,
      manualPct: Math.round((manualCount / totalCount) * 100),
    };
  }, [subscriptions]);

  // 4. Combined Salon & Subscription List
  const salonSubList = useMemo(() => {
    return shops.map((shop) => {
      const sub = subscriptions.find((s) => s.shop_id === shop.id);
      return {
        shop,
        sub,
        plan: (sub?.plan || 'free').toUpperCase(),
        planName: sub?.plan_name || (sub?.plan === 'pro' ? 'Pro Plan' : 'Free Plan (100 Bills)'),
        amount: Number(sub?.amount || 0),
        interval: sub?.interval || 'lifetime',
        status: sub?.status || 'active',
        paymentMethod: sub?.payment_method || (sub?.activated_by_admin_id ? 'Manual Admin' : 'Cashfree'),
        startDate: sub?.current_period_start || sub?.created_at || shop.created_at,
        endDate: sub?.current_period_end || null,
      };
    });
  }, [shops, subscriptions]);

  return (
    <div className="space-y-6 font-sans select-none animate-in fade-in duration-150">
      {/* 1. Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#11141a] via-[#1c1f28] to-[#11141a] border border-[#2b303c] p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-[#FD5E03]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FD5E03] animate-pulse" />
              <span className="text-xs font-mono font-bold tracking-wider text-[#FD5E03] uppercase">
                Company Subscription Revenue
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white m-0">
              Counter<span className="text-[#FD5E03]">365</span> Subscription Velocity
            </h2>
            <p className="text-xs text-gray-400 max-w-2xl leading-relaxed m-0">
              Company revenue from merchant Pro subscriptions and plan upgrades via online payment gateways (Cashfree) or manual admin activations.
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0 bg-white/5 border border-white/10 p-3.5 rounded-xl">
            <div className="text-right">
              <div className="text-[10.5px] font-mono text-gray-400 uppercase tracking-wide">
                Total Subscription Revenue
              </div>
              <div className="text-2xl font-bold font-mono text-[#FD5E03]">
                {formatINR(totalCompanyRevenue)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top 4 KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Subscription Revenue Card */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:border-[#FD5E03]/50 transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Company Subscription Revenue</span>
            <div className="p-2 rounded-xl bg-[#FFF7ED] text-[#FD5E03]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-[#111827]">
            {formatINR(totalCompanyRevenue)}
          </div>
          <div className="mt-2 text-[11.5px] text-gray-500 flex items-center justify-between">
            <span>{paidSubscriptions.length} Pro subscriptions</span>
            <span className="text-emerald-600 font-bold">100% Real DB</span>
          </div>
        </div>

        {/* Monthly Recurring Revenue (MRR) Card */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:border-emerald-400/50 transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Monthly Run-rate (MRR)</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-[#111827]">
            {formatINR(mrr)}
          </div>
          <div className="mt-2 text-[11.5px] text-gray-500 flex items-center justify-between">
            <span>ARR: {formatINR(arr)}</span>
            <span className="text-emerald-600 font-semibold">Active Run</span>
          </div>
        </div>

        {/* Pro vs Free Salons Card */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:border-blue-400/50 transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Paid Pro Subscribers</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-[#111827]">
            {paidSubscriptions.length} <span className="text-sm font-medium text-gray-400">/ {shops.length}</span>
          </div>
          <div className="mt-2 text-[11.5px] text-gray-500 flex items-center justify-between">
            <span>{freeSubscriptions.length} on Free Tier (100 bills)</span>
            <span className="text-blue-600 font-bold">{conversionRate}% Pro</span>
          </div>
        </div>

        {/* Average Revenue Per Salon Card */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:border-purple-400/50 transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Average Revenue / Salon</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-[#111827]">
            {formatINR(arpu)}
          </div>
          <div className="mt-2 text-[11.5px] text-gray-500 flex items-center justify-between">
            <span>Across all {shops.length} registered outlets</span>
            <span className="text-purple-600 font-bold font-mono">ARPU</span>
          </div>
        </div>
      </div>

      {/* 3. Salon Subscriptions Ledger & Channels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Salon Subscriptions Ledger */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
            <div>
              <h3 className="font-bold text-sm text-[#111827] m-0">Salon Subscription Ledger</h3>
              <p className="text-[11px] text-gray-400 m-0">
                Plan tier, payment mode, and revenue collected per salon
              </p>
            </div>
            <span className="text-xs text-gray-500 font-mono">
              {salonSubList.length} Registered Salons
            </span>
          </div>

          <div className="divide-y divide-gray-100">
            {salonSubList.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs">
                No salons recorded in database.
              </div>
            ) : (
              salonSubList.map(({ shop, plan, amount, interval, status, paymentMethod, startDate }, index) => {
                const isPro = plan === 'PRO';
                return (
                  <div key={shop.id} className="py-3 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                        #{index + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-gray-900 truncate">
                            {shop.name}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9.5px] font-extrabold uppercase ${
                              isPro
                                ? 'bg-orange-100 text-[#FD5E03] border border-orange-200'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {plan}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {shop.city || 'Tamil Nadu'} &bull; {paymentMethod} &bull; {interval}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <div className="font-mono font-bold text-xs text-gray-900">
                          {formatINR(amount)}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono">
                          {startDate ? new Date(startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Revenue Channels & Subscription Tiers Breakdown */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div>
                <h3 className="font-bold text-sm text-[#111827] m-0">Subscription Channels</h3>
                <p className="text-[11px] text-gray-400 m-0">Gateway vs manual grant</p>
              </div>
              <span className="text-[11px] font-bold text-[#FD5E03] bg-orange-50 px-2 py-0.5 rounded-full">
                SaaS Revenue
              </span>
            </div>

            <div className="space-y-4">
              {/* Payment Gateway (Cashfree) */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-gray-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FD5E03]" />
                    <span>Cashfree / Online Gateway</span>
                  </div>
                  <span className="font-mono font-bold text-gray-900">
                    {formatINR(channelBreakdown.onlineAmount)} ({channelBreakdown.onlineCount})
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-[#FD5E03] rounded-full"
                    style={{ width: `${Math.max(channelBreakdown.onlinePct, 5)}%` }}
                  />
                </div>
              </div>

              {/* Manual / Admin Activation */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-gray-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                    <span>Manual Admin Activation</span>
                  </div>
                  <span className="font-mono font-bold text-gray-900">
                    {formatINR(channelBreakdown.manualAmount)} ({channelBreakdown.manualCount})
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-slate-800 rounded-full"
                    style={{ width: `${Math.max(channelBreakdown.manualPct, 5)}%` }}
                  />
                </div>
              </div>

              {/* Plan Distribution */}
              <div className="pt-3 border-t border-gray-100 space-y-2">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Plan Tier Distribution
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Free Tier (100 Free Bills)</span>
                  <span className="font-mono font-bold text-gray-900">{freeSubscriptions.length} Salons</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Pro Plan (Unlimited)</span>
                  <span className="font-mono font-bold text-[#FD5E03]">{paidSubscriptions.length} Salons</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-gray-100 text-[11px] text-gray-400 text-center">
            Synchronized directly from Supabase subscriptions ledger
          </div>
        </div>
      </div>

      {/* 4. Bottom Graph: 14-Day Subscription Revenue Velocity Chart */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-6">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#FD5E03]/10 text-[#FD5E03]">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#111827] m-0">Subscription Revenue Trajectory</h3>
              <p className="text-[11px] text-gray-400 m-0">
                Daily incoming company revenue from Pro upgrades and renewals
              </p>
            </div>
          </div>
          <span className="text-xs text-gray-500 font-mono">
            {subscriptions.length} Total Subscriptions on Record
          </span>
        </div>

        <div className="h-44 flex items-end justify-between gap-2.5 pt-6 pb-2 border-b border-gray-100">
          {trajectory14Days.map((day, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded shadow-2xs whitespace-nowrap">
                {formatINR(day.revenue)} ({day.activations} act.)
              </div>
              <div className="w-full max-w-[42px] bg-gray-100 rounded-t-lg overflow-hidden h-full flex items-end">
                <div
                  className="w-full bg-gradient-to-t from-[#ea5602] to-[#FD5E03] rounded-t-lg transition-all duration-500 group-hover:brightness-110"
                  style={{ height: `${day.heightPct}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-gray-400 group-hover:text-black">
                {day.label}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#FD5E03]" />
              <span>Subscription Inflow (Cashfree / Manual)</span>
            </span>
          </div>
          <span className="text-[11px] font-mono text-gray-400">
            Recorded in Live Supabase Subscriptions
          </span>
        </div>
      </div>
    </div>
  );
}
