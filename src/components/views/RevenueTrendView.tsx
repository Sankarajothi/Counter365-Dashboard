'use client';

import React, { useState, useMemo } from 'react';
import { Subscription, Shop } from '../../types/database';
import { formatINR } from '../../lib/adminData';

interface RevenueTrendViewProps {
  subscriptions?: Subscription[];
  shops?: Shop[];
  onShowToast?: (msg: string) => void;
}

type Granularity = 'month' | 'week' | 'day';

export function RevenueTrendView({
  subscriptions = [],
  shops = [],
  onShowToast,
}: RevenueTrendViewProps) {
  // Tab state matching IronDrobe: Month over month | Weekly (in month) | Daily (calendar week)
  const [granularity, setGranularity] = useState<Granularity>('month');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedMonth, setSelectedMonth] = useState('10'); // October
  const [selectedWeek, setSelectedWeek] = useState('W42');
  const [compareMode, setCompareMode] = useState('previous');

  // Month labels
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  // Helper to extract date timestamp from a subscription
  const getSubDate = (s: Subscription): Date => {
    const raw = s.current_period_start || s.subscription_start_at || s.created_at;
    return raw ? new Date(raw) : new Date();
  };

  // Helper to get subscription amount
  const getSubAmount = (s: Subscription): number => {
    return Number(s.amount || 0);
  };

  // 1. Generate periods and revenue data based on selected granularity
  const periodsData = useMemo(() => {
    const yr = parseInt(selectedYear, 10);
    const mo = parseInt(selectedMonth, 10) - 1;

    if (granularity === 'month') {
      // Month over month for the selected year (Jan - Dec)
      return monthNames.map((name, idx) => {
        const monthSubs = subscriptions.filter((s) => {
          const d = getSubDate(s);
          return d.getFullYear() === yr && d.getMonth() === idx;
        });

        const rev = monthSubs.reduce((acc, s) => acc + getSubAmount(s), 0);
        return {
          id: `M${idx + 1}`,
          label: name,
          revenue: rev,
          count: monthSubs.length,
          isCurrent: idx === new Date().getMonth() && yr === new Date().getFullYear(),
        };
      });
    }

    if (granularity === 'week') {
      // Weekly in selected month (e.g., Week 1 to Week 5)
      const weeks = [
        { label: 'Week 1', startDay: 1, endDay: 7 },
        { label: 'Week 2', startDay: 8, endDay: 14 },
        { label: 'Week 3', startDay: 15, endDay: 21 },
        { label: 'Week 4', startDay: 22, endDay: 28 },
        { label: 'Week 5', startDay: 29, endDay: 31 },
      ];

      return weeks.map((w) => {
        const weekSubs = subscriptions.filter((s) => {
          const d = getSubDate(s);
          const inMonth = d.getFullYear() === yr && d.getMonth() === mo;
          const day = d.getDate();
          return inMonth && day >= w.startDay && day <= w.endDay;
        });

        const rev = weekSubs.reduce((acc, s) => acc + getSubAmount(s), 0);
        return {
          id: w.label,
          label: w.label,
          revenue: rev,
          count: weekSubs.length,
          isCurrent: false,
        };
      });
    }

    // Daily (calendar week) - Mon to Sun
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    // Build days of the current calendar week
    const now = new Date();
    const currentDayOfWeek = (now.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
    const monday = new Date(now);
    monday.setDate(now.getDate() - currentDayOfWeek);

    return dayNames.map((name, idx) => {
      const targetDate = new Date(monday);
      targetDate.setDate(monday.getDate() + idx);
      const targetStr = targetDate.toISOString().split('T')[0];

      const daySubs = subscriptions.filter((s) => {
        const dStr = getSubDate(s).toISOString().split('T')[0];
        return dStr === targetStr;
      });

      const rev = daySubs.reduce((acc, s) => acc + getSubAmount(s), 0);
      return {
        id: name,
        label: name,
        revenue: rev,
        count: daySubs.length,
        isCurrent: idx === currentDayOfWeek,
      };
    });
  }, [granularity, selectedYear, selectedMonth, subscriptions]);

  // 2. Compute Table Rows with Change and Growth %
  const tableRows = useMemo(() => {
    return periodsData.map((curr, idx) => {
      const prev = idx > 0 ? periodsData[idx - 1] : null;
      let changeVal: number | null = null;
      let growthVal: number | null = null;

      if (prev !== null) {
        changeVal = curr.revenue - prev.revenue;
        if (prev.revenue > 0) {
          growthVal = Math.round((changeVal / prev.revenue) * 100);
        } else if (curr.revenue > 0) {
          growthVal = 100;
        } else {
          growthVal = 0;
        }
      }

      return {
        ...curr,
        changeVal,
        growthVal,
      };
    });
  }, [periodsData]);

  // 3. KPI Metrics
  // Total Revenue across periods
  const totalRevenue = useMemo(
    () => periodsData.reduce((acc, p) => acc + p.revenue, 0),
    [periodsData]
  );

  // Latest Period Revenue
  const latestPeriod = useMemo(() => {
    // Pick the current period or the last one with activity
    const activePeriods = periodsData.filter((p) => p.revenue > 0);
    if (activePeriods.length > 0) {
      return activePeriods[activePeriods.length - 1];
    }
    const currentPeriod = periodsData.find((p) => p.isCurrent);
    return currentPeriod || periodsData[periodsData.length - 1];
  }, [periodsData]);

  // Growth vs Previous Period
  const growthVsPrev = useMemo(() => {
    const idx = periodsData.findIndex((p) => p.id === latestPeriod.id);
    if (idx > 0) {
      const prev = periodsData[idx - 1];
      if (prev.revenue > 0) {
        const pct = (((latestPeriod.revenue - prev.revenue) / prev.revenue) * 100).toFixed(1);
        return `${Number(pct) > 0 ? '+' : ''}${pct}%`;
      }
      if (latestPeriod.revenue > 0) return '+100%';
    }
    return '-';
  }, [periodsData, latestPeriod]);

  // Best Period
  const bestPeriod = useMemo(() => {
    const sorted = [...periodsData].sort((a, b) => b.revenue - a.revenue);
    return sorted[0]?.label || 'Oct';
  }, [periodsData]);

  // 4. Smooth SVG Chart Coordinates Generator
  const chartHeight = 240;
  const chartWidth = 900;
  const paddingLeft = 60;
  const paddingRight = 30;
  const paddingTop = 25;
  const paddingBottom = 40;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const maxRevenue = Math.max(...periodsData.map((p) => p.revenue), 10000);

  // Y-axis ticks (e.g. ₹10,000, ₹7,500, ₹5,000, ₹2,500, ₹0)
  const yTicks = [
    { value: maxRevenue, y: paddingTop },
    { value: Math.round(maxRevenue * 0.75), y: paddingTop + innerHeight * 0.25 },
    { value: Math.round(maxRevenue * 0.5), y: paddingTop + innerHeight * 0.5 },
    { value: Math.round(maxRevenue * 0.25), y: paddingTop + innerHeight * 0.75 },
    { value: 0, y: paddingTop + innerHeight },
  ];

  // Coordinates for each point
  const points = useMemo(() => {
    const n = periodsData.length;
    return periodsData.map((p, idx) => {
      const x = paddingLeft + (idx / Math.max(n - 1, 1)) * innerWidth;
      const y = paddingTop + innerHeight - (p.revenue / maxRevenue) * innerHeight;
      return { x, y, ...p };
    });
  }, [periodsData, innerWidth, innerHeight, maxRevenue]);

  // Smooth SVG Bezier Path
  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? i : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  }, [points]);

  // Area Path
  const areaPath = useMemo(() => {
    if (!linePath || points.length === 0) return '';
    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];
    const bottomY = paddingTop + innerHeight;
    return `${linePath} L ${lastPoint.x} ${bottomY} L ${firstPoint.x} ${bottomY} Z`;
  }, [linePath, points, innerHeight]);

  // Subtitle matching screenshot
  const subtitleText =
    granularity === 'month'
      ? `Month over month — ${selectedYear}`
      : granularity === 'week'
      ? `Weekly (in month) — ${monthNames[parseInt(selectedMonth, 10) - 1]} ${selectedYear}`
      : `Daily (calendar week) — ${selectedWeek} ${selectedYear}`;

  return (
    <div className="space-y-6 font-sans select-none animate-in fade-in duration-150">
      {/* Main Revenue Growth Card Wrapper Matching IronDrobe */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200/80 shadow-2xs">
        {/* Header Title & Subtitle */}
        <div className="flex flex-col gap-1 mb-6">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#101318] m-0">
            Revenue Growth
          </h1>
          <p className="text-xs text-gray-500 m-0">
            {subtitleText}
          </p>
        </div>

        {/* Controls Bar: Pill Tabs on Left, Select Dropdowns on Right */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-gray-100">
          {/* Pill Tabs */}
          <div className="inline-flex p-1 bg-gray-100 rounded-xl border border-gray-200/60 w-fit">
            <button
              onClick={() => setGranularity('month')}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                granularity === 'month'
                  ? 'bg-white text-gray-900 font-bold shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900 font-medium'
              }`}
            >
              Month over month
            </button>
            <button
              onClick={() => setGranularity('week')}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                granularity === 'week'
                  ? 'bg-white text-gray-900 font-bold shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900 font-medium'
              }`}
            >
              Weekly (in month)
            </button>
            <button
              onClick={() => setGranularity('day')}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                granularity === 'day'
                  ? 'bg-white text-gray-900 font-bold shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900 font-medium'
              }`}
            >
              Daily (calendar week)
            </button>
          </div>

          {/* Right Select Dropdowns */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Year Dropdown */}
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-medium mb-0.5">Year</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="text-xs py-1.5 px-3 rounded-lg border border-gray-200 bg-white text-gray-700 font-medium focus:border-[#D4621A] focus:outline-hidden cursor-pointer min-w-[75px]"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
              </select>
            </div>

            {/* Month Dropdown */}
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-medium mb-0.5">Month</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                disabled={granularity === 'month'}
                className={`text-xs py-1.5 px-3 rounded-lg border border-gray-200 bg-white text-gray-700 font-medium focus:border-[#D4621A] focus:outline-hidden cursor-pointer min-w-[75px] ${
                  granularity === 'month' ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''
                }`}
              >
                {monthNames.map((m, idx) => (
                  <option key={m} value={String(idx + 1).padStart(2, '0')}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Calendar Week Dropdown */}
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-medium mb-0.5">Calendar week</span>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                disabled={granularity !== 'day'}
                className={`text-xs py-1.5 px-3 rounded-lg border border-gray-200 bg-white text-gray-700 font-medium focus:border-[#D4621A] focus:outline-hidden cursor-pointer min-w-[75px] ${
                  granularity !== 'day' ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''
                }`}
              >
                <option value="W42">W42</option>
                <option value="W41">W41</option>
                <option value="W40">W40</option>
                <option value="W39">W39</option>
              </select>
            </div>

            {/* Compare Dropdown */}
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-medium mb-0.5">Compare</span>
              <select
                value={compareMode}
                onChange={(e) => setCompareMode(e.target.value)}
                className="text-xs py-1.5 px-3 rounded-lg border border-gray-200 bg-white text-gray-700 font-medium focus:border-[#D4621A] focus:outline-hidden cursor-pointer min-w-[130px]"
              >
                <option value="previous">Previous period</option>
                <option value="year">Previous year</option>
                <option value="none">None</option>
              </select>
            </div>
          </div>
        </div>

        {/* 4 Metric Cards Matching IronDrobe Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
          {/* Total Revenue */}
          <div className="bg-[#F8F3F0] rounded-xl p-4 border border-gray-200/60 shadow-2xs">
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              Total revenue
            </div>
            <div className="mt-1.5 text-2xl font-bold tracking-tight text-[#101318]">
              {formatINR(totalRevenue)}
            </div>
          </div>

          {/* Latest Period */}
          <div className="bg-[#F8F3F0] rounded-xl p-4 border border-gray-200/60 shadow-2xs">
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              Latest period
            </div>
            <div className="mt-1.5 text-2xl font-bold tracking-tight text-[#101318]">
              {formatINR(latestPeriod.revenue)}
            </div>
          </div>

          {/* Growth vs Prev */}
          <div className="bg-[#F8F3F0] rounded-xl p-4 border border-gray-200/60 shadow-2xs">
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              Growth vs prev
            </div>
            <div
              className={`mt-1.5 text-2xl font-bold tracking-tight ${
                growthVsPrev.startsWith('+')
                  ? 'text-[#D4621A]'
                  : growthVsPrev.startsWith('-')
                  ? 'text-rose-600'
                  : 'text-gray-600'
              }`}
            >
              {growthVsPrev}
            </div>
          </div>

          {/* Best Period */}
          <div className="bg-[#F8F3F0] rounded-xl p-4 border border-gray-200/60 shadow-2xs">
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              Best period
            </div>
            <div className="mt-1.5 text-2xl font-bold tracking-tight text-[#101318]">
              {bestPeriod}
            </div>
          </div>
        </div>

        {/* Detailed Table (Matching IronDrobe Table Columns: Period, Revenue, Change, Growth %) */}
        <div className="mt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-[11.5px] font-semibold text-gray-500">
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4 text-center sm:text-left">Revenue</th>
                  <th className="py-3 px-4 text-center">Change</th>
                  <th className="py-3 px-4 text-right">Growth %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tableRows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/70 transition-colors">
                    {/* Period */}
                    <td className="py-3 px-4 font-medium text-gray-800">
                      {row.label}
                    </td>

                    {/* Revenue */}
                    <td className="py-3 px-4 font-mono font-bold text-gray-900">
                      {formatINR(row.revenue)}
                    </td>

                    {/* Change */}
                    <td className="py-3 px-4 text-center font-mono text-gray-500">
                      {row.changeVal !== null ? (
                        row.changeVal === 0 ? (
                          '—'
                        ) : row.changeVal > 0 ? (
                          <span className="text-[#D4621A] font-semibold">
                            +{formatINR(row.changeVal)}
                          </span>
                        ) : (
                          <span className="text-rose-600 font-semibold">
                            -{formatINR(Math.abs(row.changeVal))}
                          </span>
                        )
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Growth % */}
                    <td className="py-3 px-4 text-right font-mono text-gray-500">
                      {row.growthVal !== null ? (
                        row.growthVal === 0 ? (
                          '—'
                        ) : row.growthVal > 0 ? (
                          <span className="text-[#D4621A] font-semibold">
                            +{row.growthVal}%
                          </span>
                        ) : (
                          <span className="text-rose-600 font-semibold">
                            {row.growthVal}%
                          </span>
                        )
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Smooth Area Line Chart Placed at the Bottom (Below all elements) */}
        <div className="w-full overflow-x-auto pt-8 border-t border-gray-100">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-auto min-w-[700px] select-none"
          >
            <defs>
              <linearGradient id="revenueAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Lines & Y-Axis Labels */}
            {yTicks.map((tick, i) => (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={tick.y}
                  x2={chartWidth - paddingRight}
                  y2={tick.y}
                  stroke="#E5E7EB"
                  strokeWidth="1"
                  strokeDasharray={i === yTicks.length - 1 ? 'none' : '3 3'}
                />
                <text
                  x={paddingLeft - 10}
                  y={tick.y + 3.5}
                  textAnchor="end"
                  className="fill-gray-400 text-[11px] font-mono"
                >
                  ₹{tick.value.toLocaleString('en-IN')}
                </text>
              </g>
            ))}

            {/* Gradient Area Fill */}
            {areaPath && (
              <path d={areaPath} fill="url(#revenueAreaGradient)" />
            )}

            {/* Blue Curved Path */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#3B82F6"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Data Point Dots & X-Axis Labels */}
            {points.map((pt, idx) => (
              <g key={idx} className="group cursor-pointer">
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="3.5"
                  fill="#3B82F6"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  className="transition-transform group-hover:scale-150"
                />
                {/* Tooltip on hover */}
                <title>{`${pt.label}: ₹${pt.revenue.toLocaleString('en-IN')}`}</title>
                {/* X-axis label */}
                <text
                  x={pt.x}
                  y={paddingTop + innerHeight + 20}
                  textAnchor="middle"
                  className="fill-gray-500 text-[11px] font-medium"
                >
                  {pt.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
