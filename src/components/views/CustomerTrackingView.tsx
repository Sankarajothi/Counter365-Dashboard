'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  Phone,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  Search,
  ExternalLink,
  Calendar,
  User,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Shop, Customer, Bill, Profile } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { fetchCrmUserAccounts, CrmUserAccount } from '../../services/crmUserService';

interface CustomerTrackingViewProps {
  customers?: Customer[];
  shops?: Shop[];
  bills?: Bill[];
  profiles?: Profile[];
  loading?: boolean;
  onOpenShopDrawer?: (shop: Shop) => void;
  onSelectSalon?: (shop: Shop) => void;
  onShowToast?: (msg: string) => void;
}

export interface CallLog {
  id: string;
  shopId?: string;
  dateStr: string; // YYYY-MM-DD
  dateDisplay: string; // DD-MM-YYYY
  timeDisplay: string; // 10:29 am
  employee: string;
  employeeEmail: string;
  customer: string;
  phone: string;
  callStatus: string;
  response: 'Positive' | 'Negative' | '—';
  demo: string;
  source: string;
  duration: string;
  durationSeconds: number;
  feedback: string;
  notes: string;
  rawDate: string;
}

export interface EmployeeStat {
  name: string;
  email: string;
  totalCalls: number;
  positive: number;
  negative: number;
  answered: number;
  noAnswer: number;
  notReachable: number;
  totalDurationSeconds: number;
  avgDuration: string;
}

function parseDurationToSeconds(str: string): number {
  if (!str || str === '—') return 0;
  const parts = str.split(':').map((p) => parseInt(p.trim(), 10) || 0);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

function formatDurationSeconds(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '00m 00s';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  }
  return `${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
}

function formatAvgDuration(totalSeconds: number, count: number): string {
  if (!count || count <= 0 || !totalSeconds || totalSeconds <= 0) return '—';
  const avg = Math.round(totalSeconds / count);
  const m = Math.floor(avg / 60);
  const s = avg % 60;
  return `${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
}

export function CustomerTrackingView({
  shops = [],
  bills = [],
  customers = [],
  profiles = [],
  loading: externalLoading = false,
  onOpenShopDrawer,
  onSelectSalon,
  onShowToast,
}: CustomerTrackingViewProps) {
  const [dateFilter, setDateFilter] = useState<string>('');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [crmUsers, setCrmUsers] = useState<CrmUserAccount[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const handleSelectShop = (shop: Shop) => {
    if (onSelectSalon) onSelectSalon(shop);
    else if (onOpenShopDrawer) onOpenShopDrawer(shop);
  };

  // Shop lookup map
  const shopMap = useMemo(() => {
    const map = new Map<string, Shop>();
    shops.forEach((s) => map.set(s.id, s));
    return map;
  }, [shops]);

  // Load CRM Users
  useEffect(() => {
    let isMounted = true;
    async function loadUsers() {
      try {
        const users = await fetchCrmUserAccounts();
        if (isMounted) setCrmUsers(users);
      } catch (e) {
        console.warn('Failed to load CRM users:', e);
      }
    }
    loadUsers();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch real calls from Supabase admin_responses and local storage
  useEffect(() => {
    let isMounted = true;
    async function loadCallData() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('admin_responses')
          .select('*')
          .order('date', { ascending: false });

        const loadedCalls: CallLog[] = [];
        const seenIds = new Set<string>();

        if (!error && data && data.length > 0) {
          data.forEach((row: any) => {
            if (seenIds.has(row.id)) return;
            seenIds.add(row.id);

            const shop = row.shop_id ? shopMap.get(row.shop_id) : undefined;
            const rawDate = row.date || row.created_at || new Date().toISOString();
            const d = new Date(rawDate);

            const dateStr = !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : '';
            const dateDisplay = !isNaN(d.getTime())
              ? `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
              : '—';
            const timeDisplay = !isNaN(d.getTime())
              ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()
              : '—';

            const notesStr = row.notes || '';
            const empMatch = notesStr.match(/Employee:\s*([^|]+)/i);
            const emailMatch = notesStr.match(/Email:\s*([^\s|]+)/i);
            const employeeName = (empMatch ? empMatch[1].trim() : (row.recorded_by || 'Support')).trim();

            let employeeEmail = emailMatch ? emailMatch[1].trim() : '';
            if (!employeeEmail) {
              const matchedCrm = crmUsers.find(
                (u) => u.name.toLowerCase() === employeeName.toLowerCase()
              );
              if (matchedCrm) {
                employeeEmail = matchedCrm.email;
              } else {
                employeeEmail = 'support@tecstellar.com';
              }
            }

            const customerName = shop?.name || row.contact_person || 'Customer';
            const phoneStr = (shop?.phone || '').replace(/\D/g, '').slice(-10);

            const callStatus = row.type || 'Answered';
            const isAns = callStatus.toLowerCase().includes('answer') && !callStatus.toLowerCase().includes('no');

            const rawOutcome = (row.outcome || '').trim();
            let responseSentiment: 'Positive' | 'Negative' | '—' = '—';
            if (rawOutcome.toLowerCase().includes('pos')) {
              responseSentiment = 'Positive';
            } else if (rawOutcome.toLowerCase().includes('neg')) {
              responseSentiment = 'Negative';
            } else if (isAns) {
              responseSentiment = 'Positive';
            } else {
              responseSentiment = '—';
            }

            const demoMatch = notesStr.match(/Demo:\s*([^|]+)/i);
            const srcMatch = notesStr.match(/Source:\s*([^|]+)/i);
            const timerMatch = notesStr.match(/Timer:\s*([0-9:]+)/i);
            const fbMatch = notesStr.match(/Feedback:\s*"([^"]+)"/i);
            const notesMatch = notesStr.match(/Notes:\s*([^|]+)/i);

            const duration = timerMatch ? timerMatch[1].trim() : '—';
            const durationSeconds = parseDurationToSeconds(duration);

            loadedCalls.push({
              id: row.id,
              shopId: row.shop_id,
              dateStr,
              dateDisplay,
              timeDisplay,
              employee: employeeName,
              employeeEmail,
              customer: customerName,
              phone: phoneStr,
              callStatus,
              response: responseSentiment,
              demo: demoMatch ? demoMatch[1].trim() : '—',
              source: srcMatch ? srcMatch[1].trim() : '—',
              duration,
              durationSeconds,
              feedback: fbMatch ? fbMatch[1].trim() : '—',
              notes: notesMatch ? notesMatch[1].trim() : '—',
              rawDate,
            });
          });
        }

        // Also merge local responses
        shops.forEach((s) => {
          try {
            const raw = localStorage.getItem(`counterpro_call_responses_${s.id}`);
            if (raw) {
              const list = JSON.parse(raw);
              if (Array.isArray(list)) {
                list.forEach((cr: any) => {
                  if (cr.id && !seenIds.has(cr.id)) {
                    seenIds.add(cr.id);
                    const d = new Date(cr.date);
                    const dateStr = !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : '';
                    const dateDisplay = !isNaN(d.getTime())
                      ? `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
                      : '—';
                    const timeDisplay = !isNaN(d.getTime())
                      ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()
                      : '—';

                    const notesStr = cr.notes || '';
                    const empMatch = notesStr.match(/Employee:\s*([^|]+)/i);
                    const emailMatch = notesStr.match(/Email:\s*([^\s|]+)/i);
                    const employeeName = (empMatch ? empMatch[1].trim() : (cr.recordedBy || 'Support')).trim();

                    let employeeEmail = emailMatch ? emailMatch[1].trim() : 'support@tecstellar.com';
                    const phoneStr = (s.phone || '').replace(/\D/g, '').slice(-10);
                    const callStatus = cr.type || 'Answered';
                    const isAns = callStatus.toLowerCase().includes('answer') && !callStatus.toLowerCase().includes('no');
                    const rawOutcome = (cr.outcome || '').trim();
                    let responseSentiment: 'Positive' | 'Negative' | '—' = '—';
                    if (rawOutcome.toLowerCase().includes('pos')) responseSentiment = 'Positive';
                    else if (rawOutcome.toLowerCase().includes('neg')) responseSentiment = 'Negative';
                    else if (isAns) responseSentiment = 'Positive';

                    const timerMatch = notesStr.match(/Timer:\s*([0-9:]+)/i);
                    const duration = timerMatch ? timerMatch[1].trim() : '—';

                    loadedCalls.push({
                      id: cr.id,
                      shopId: s.id,
                      dateStr,
                      dateDisplay,
                      timeDisplay,
                      employee: employeeName,
                      employeeEmail,
                      customer: s.name,
                      phone: phoneStr,
                      callStatus,
                      response: responseSentiment,
                      demo: cr.demoStatus || '—',
                      source: cr.leadSource || '—',
                      duration,
                      durationSeconds: parseDurationToSeconds(duration),
                      feedback: cr.customerFeedback || '—',
                      notes: cr.notes || '—',
                      rawDate: cr.date || new Date().toISOString(),
                    });
                  }
                });
              }
            }
          } catch (e) {
            // ignore
          }
        });

        if (isMounted) {
          setCalls(loadedCalls);
        }
      } catch (err) {
        console.warn('Error loading admin call logs:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadCallData();
    return () => {
      isMounted = false;
    };
  }, [refreshKey, shopMap, shops, crmUsers]);

  // Unique employees for filter dropdown
  const uniqueEmployees = useMemo(() => {
    const set = new Set<string>();
    crmUsers.forEach((u) => {
      if (u.name) set.add(u.name);
    });
    calls.forEach((c) => {
      if (c.employee) set.add(c.employee);
    });
    return Array.from(set).sort();
  }, [calls, crmUsers]);

  // Filtered Calls based on Date and Employee
  const filteredCalls = useMemo(() => {
    return calls.filter((c) => {
      if (dateFilter && c.dateStr !== dateFilter) return false;
      if (employeeFilter !== 'all' && c.employee.toLowerCase() !== employeeFilter.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [calls, dateFilter, employeeFilter]);

  // Metric calculation for top 7 cards
  const metrics = useMemo(() => {
    const totalCalls = filteredCalls.length;
    let positive = 0;
    let negative = 0;
    let answered = 0;
    let noAnswer = 0;
    let notReachable = 0;
    let totalDurationSeconds = 0;

    filteredCalls.forEach((c) => {
      if (c.response === 'Positive') positive += 1;
      if (c.response === 'Negative') negative += 1;

      const isAns = c.callStatus.toLowerCase().includes('answer') && !c.callStatus.toLowerCase().includes('no');
      if (isAns) answered += 1;
      if (c.callStatus.toLowerCase().includes('no answer')) noAnswer += 1;
      if (c.callStatus.toLowerCase().includes('reachable')) notReachable += 1;

      totalDurationSeconds += c.durationSeconds || 0;
    });

    return {
      totalCalls,
      positive,
      negative,
      answered,
      noAnswer,
      notReachable,
      totalDuration: formatDurationSeconds(totalDurationSeconds),
    };
  }, [filteredCalls]);

  // Employee Performance aggregation
  const employeePerformance = useMemo<EmployeeStat[]>(() => {
    const map = new Map<string, EmployeeStat>();

    filteredCalls.forEach((c) => {
      const empKey = c.employee || 'Support';
      const existing = map.get(empKey) || {
        name: empKey,
        email: c.employeeEmail || '—',
        totalCalls: 0,
        positive: 0,
        negative: 0,
        answered: 0,
        noAnswer: 0,
        notReachable: 0,
        totalDurationSeconds: 0,
        avgDuration: '—',
      };

      existing.totalCalls += 1;
      if (c.response === 'Positive') existing.positive += 1;
      if (c.response === 'Negative') existing.negative += 1;

      const isAns = c.callStatus.toLowerCase().includes('answer') && !c.callStatus.toLowerCase().includes('no');
      if (isAns) existing.answered += 1;
      if (c.callStatus.toLowerCase().includes('no answer')) existing.noAnswer += 1;
      if (c.callStatus.toLowerCase().includes('reachable')) existing.notReachable += 1;

      existing.totalDurationSeconds += c.durationSeconds || 0;
      map.set(empKey, existing);
    });

    const list = Array.from(map.values());
    list.forEach((e) => {
      e.avgDuration = formatAvgDuration(e.totalDurationSeconds, e.answered);
    });

    return list.sort((a, b) => b.totalCalls - a.totalCalls);
  }, [filteredCalls]);

  // Totals for employee performance footer
  const employeeTotals = useMemo(() => {
    const totalCalls = employeePerformance.reduce((s, e) => s + e.totalCalls, 0);
    const positive = employeePerformance.reduce((s, e) => s + e.positive, 0);
    const negative = employeePerformance.reduce((s, e) => s + e.negative, 0);
    const answered = employeePerformance.reduce((s, e) => s + e.answered, 0);
    const noAnswer = employeePerformance.reduce((s, e) => s + e.noAnswer, 0);
    const notReachable = employeePerformance.reduce((s, e) => s + e.notReachable, 0);
    const totalDurationSeconds = employeePerformance.reduce((s, e) => s + e.totalDurationSeconds, 0);
    const avgDuration = formatAvgDuration(totalDurationSeconds, answered);

    return {
      totalCalls,
      positive,
      negative,
      answered,
      noAnswer,
      notReachable,
      avgDuration,
    };
  }, [employeePerformance]);

  // Export to Excel / CSV
  const handleExportCSV = () => {
    const headers = [
      'DATE',
      'TIME',
      'EMPLOYEE',
      'EMPLOYEE_EMAIL',
      'CUSTOMER',
      'PHONE',
      'CALL_STATUS',
      'RESPONSE',
      'DEMO',
      'SOURCE',
      'DURATION',
      'FEEDBACK',
      'NOTES',
    ];

    const rows = filteredCalls.map((c) => [
      `"${c.dateDisplay}"`,
      `"${c.timeDisplay}"`,
      `"${c.employee.replace(/"/g, '""')}"`,
      `"${c.employeeEmail.replace(/"/g, '""')}"`,
      `"${c.customer.replace(/"/g, '""')}"`,
      `"${c.phone}"`,
      `"${c.callStatus}"`,
      `"${c.response}"`,
      `"${c.demo}"`,
      `"${c.source.replace(/"/g, '""')}"`,
      `"${c.duration}"`,
      `"${c.feedback.replace(/"/g, '""')}"`,
      `"${c.notes.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `customer_tracking_${dateFilter || 'all'}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast?.('Exported Customer Tracking to CSV');
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6 font-sans text-slate-900 select-none pb-16">
      {/* 1. TOP HEADER & SUBTITLE */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customer Tracking</h1>
        <p className="text-xs text-slate-500 mt-1">
          Comprehensive call tracking history, employee performance metrics, and call logs.
        </p>
      </div>

      {/* 2. FILTERS & ACTION CONTROLS */}
      <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-4 bg-transparent pt-1">
        <div className="flex items-center gap-4 flex-wrap">
          {/* DATE PICKER */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              DATE
            </label>
            <div className="relative">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-48 py-1.5 px-3 text-xs bg-white text-slate-900 border border-slate-300 rounded-md focus:outline-none focus:border-[#D4621A] shadow-2xs font-mono cursor-pointer"
                placeholder="mm/dd/yyyy"
              />
              {dateFilter && (
                <button
                  type="button"
                  onClick={() => setDateFilter('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 text-xs font-bold"
                  title="Clear date"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* EMPLOYEE DROPDOWN */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              EMPLOYEE
            </label>
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="min-w-44 py-1.5 px-3 text-xs bg-white text-slate-900 border border-slate-300 rounded-md focus:outline-none focus:border-[#D4621A] shadow-2xs cursor-pointer font-medium"
            >
              <option value="all">All Employees</option>
              {uniqueEmployees.map((emp) => (
                <option key={emp} value={emp}>
                  {emp}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ACTION BUTTONS (View Report, Download Excel, Download PDF) */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setRefreshKey((prev) => prev + 1)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#D4621A] ${isLoading ? 'animate-spin' : ''}`} />
            <span>View Report</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#D4621A]" />
            <span>Download Excel</span>
          </button>

          <button
            type="button"
            onClick={handlePrintPDF}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#D4621A]" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* 3. TOP 7 METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* TOTAL CALLS */}
        <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            TOTAL CALLS
          </span>
          <div className="text-xl font-extrabold text-slate-900 mt-1 font-mono">{metrics.totalCalls}</div>
        </div>

        {/* POSITIVE */}
        <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4621A] block">
            POSITIVE
          </span>
          <div className="text-xl font-extrabold text-[#D4621A] mt-1 font-mono">{metrics.positive}</div>
        </div>

        {/* NEGATIVE */}
        <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            NEGATIVE
          </span>
          <div className="text-xl font-extrabold text-slate-900 mt-1 font-mono">{metrics.negative}</div>
        </div>

        {/* ANSWERED */}
        <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            ANSWERED
          </span>
          <div className="text-xl font-extrabold text-slate-900 mt-1 font-mono">{metrics.answered}</div>
        </div>

        {/* NO ANSWER */}
        <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            NO ANSWER
          </span>
          <div className="text-xl font-extrabold text-slate-900 mt-1 font-mono">{metrics.noAnswer}</div>
        </div>

        {/* NOT REACHABLE */}
        <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            NOT REACHABLE
          </span>
          <div className="text-xl font-extrabold text-slate-900 mt-1 font-mono">{metrics.notReachable}</div>
        </div>

        {/* TOTAL DURATION */}
        <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            TOTAL DURATION
          </span>
          <div className="text-xl font-extrabold text-slate-900 mt-1 font-mono whitespace-nowrap">
            {metrics.totalDuration}
          </div>
        </div>
      </div>

      {/* 4. EMPLOYEE PERFORMANCE TABLE */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-slate-900 tracking-tight">Employee Performance</h2>
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10.5px]">
                <tr>
                  <th className="px-4 py-2.5">EMPLOYEE</th>
                  <th className="px-4 py-2.5">EMAIL</th>
                  <th className="px-4 py-2.5 text-center">TOTAL CALLS</th>
                  <th className="px-4 py-2.5 text-center">POSITIVE</th>
                  <th className="px-4 py-2.5 text-center">NEGATIVE</th>
                  <th className="px-4 py-2.5 text-center">ANSWERED</th>
                  <th className="px-4 py-2.5 text-center">NO ANSWER</th>
                  <th className="px-4 py-2.5 text-center">NOT REACHABLE</th>
                  <th className="px-4 py-2.5 text-right">AVG DURATION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employeePerformance.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-slate-400">
                      No employee performance records logged yet.
                    </td>
                  </tr>
                ) : (
                  employeePerformance.map((emp) => (
                    <tr key={emp.name} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-2.5 font-semibold text-slate-900 whitespace-nowrap">{emp.name}</td>
                      <td className="px-4 py-2.5 text-slate-600 font-mono whitespace-nowrap">{emp.email}</td>
                      <td className="px-4 py-2.5 text-center font-mono font-medium">{emp.totalCalls}</td>
                      <td className="px-4 py-2.5 text-center font-mono font-medium">{emp.positive}</td>
                      <td className="px-4 py-2.5 text-center font-mono font-medium">{emp.negative}</td>
                      <td className="px-4 py-2.5 text-center font-mono font-medium">{emp.answered}</td>
                      <td className="px-4 py-2.5 text-center font-mono font-medium">{emp.noAnswer}</td>
                      <td className="px-4 py-2.5 text-center font-mono font-medium">{emp.notReachable}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-medium whitespace-nowrap">
                        {emp.avgDuration}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {employeePerformance.length > 0 && (
                <tfoot className="bg-slate-50/80 border-t border-slate-200 font-bold text-slate-900 text-xs">
                  <tr>
                    <td className="px-4 py-2.5">TOTAL</td>
                    <td className="px-4 py-2.5 text-slate-400 font-mono">—</td>
                    <td className="px-4 py-2.5 text-center font-mono">{employeeTotals.totalCalls}</td>
                    <td className="px-4 py-2.5 text-center font-mono">{employeeTotals.positive}</td>
                    <td className="px-4 py-2.5 text-center font-mono">{employeeTotals.negative}</td>
                    <td className="px-4 py-2.5 text-center font-mono">{employeeTotals.answered}</td>
                    <td className="px-4 py-2.5 text-center font-mono">{employeeTotals.noAnswer}</td>
                    <td className="px-4 py-2.5 text-center font-mono">{employeeTotals.notReachable}</td>
                    <td className="px-4 py-2.5 text-right font-mono whitespace-nowrap">
                      {employeeTotals.avgDuration}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* 5. CALL DETAILS TABLE */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-slate-900 tracking-tight">Call Details</h2>
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10.5px]">
                <tr>
                  <th className="px-3.5 py-2.5 whitespace-nowrap">DATE</th>
                  <th className="px-3.5 py-2.5 whitespace-nowrap">TIME</th>
                  <th className="px-3.5 py-2.5 whitespace-nowrap">EMPLOYEE</th>
                  <th className="px-3.5 py-2.5 whitespace-nowrap">OUTLET / CONTACT</th>
                  <th className="px-3.5 py-2.5 whitespace-nowrap">PHONE</th>
                  <th className="px-3.5 py-2.5 whitespace-nowrap">CALL STATUS</th>
                  <th className="px-3.5 py-2.5 whitespace-nowrap text-center">RESPONSE</th>
                  <th className="px-3.5 py-2.5 whitespace-nowrap">DEMO</th>
                  <th className="px-3.5 py-2.5 whitespace-nowrap">SOURCE</th>
                  <th className="px-3.5 py-2.5 whitespace-nowrap">DURATION</th>
                  <th className="px-3.5 py-2.5">FEEDBACK</th>
                  <th className="px-3.5 py-2.5">NOTES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCalls.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-slate-400">
                      No call details logged yet.
                    </td>
                  </tr>
                ) : (
                  filteredCalls.map((c) => {
                    const shop = c.shopId ? shopMap.get(c.shopId) : undefined;
                    return (
                      <tr key={c.id} className="hover:bg-[#F8F3F0]/20 transition-colors">
                        {/* DATE */}
                        <td className="px-3.5 py-2.5 font-mono whitespace-nowrap text-slate-800">
                          {c.dateDisplay}
                        </td>

                        {/* TIME */}
                        <td className="px-3.5 py-2.5 font-mono whitespace-nowrap text-slate-600">
                          {c.timeDisplay}
                        </td>

                        {/* EMPLOYEE */}
                        <td className="px-3.5 py-2.5 whitespace-nowrap font-medium text-slate-900">
                          {c.employee}
                        </td>

                        {/* CUSTOMER / SHOP */}
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          {shop ? (
                            <button
                              type="button"
                              onClick={() => handleSelectShop(shop)}
                              className="text-left font-semibold text-slate-900 hover:text-[#D4621A] hover:underline cursor-pointer"
                            >
                              {c.customer}
                            </button>
                          ) : (
                            <span className="font-semibold text-slate-900">{c.customer}</span>
                          )}
                        </td>

                        {/* PHONE */}
                        <td className="px-3.5 py-2.5 whitespace-nowrap font-mono">
                          {c.phone ? (
                            <span className="inline-flex items-center gap-1 text-slate-900 font-semibold">
                              <Phone className="w-3 h-3 text-[#D4621A]" />
                              <span>{c.phone}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* CALL STATUS */}
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-900 font-medium">
                          {c.callStatus}
                        </td>

                        {/* RESPONSE PILL */}
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-center">
                          {c.response === 'Positive' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D4621A] text-white font-mono shadow-2xs">
                              Positive
                            </span>
                          ) : c.response === 'Negative' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300 font-mono shadow-2xs">
                              Negative
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">—</span>
                          )}
                        </td>

                        {/* DEMO */}
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-700">
                          {c.demo}
                        </td>

                        {/* SOURCE */}
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-700">
                          {c.source}
                        </td>

                        {/* DURATION */}
                        <td className="px-3.5 py-2.5 whitespace-nowrap font-mono font-medium text-slate-800">
                          {c.duration}
                        </td>

                        {/* FEEDBACK */}
                        <td className="px-3.5 py-2.5 max-w-xs truncate text-slate-700" title={c.feedback !== '—' ? c.feedback : undefined}>
                          {c.feedback}
                        </td>

                        {/* NOTES */}
                        <td className="px-3.5 py-2.5 max-w-xs truncate text-slate-600" title={c.notes !== '—' ? c.notes : undefined}>
                          {c.notes}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
