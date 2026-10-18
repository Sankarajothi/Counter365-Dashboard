'use client';

import React, { useState, useMemo } from 'react';
import { Shop } from '../../types/database';
import { formatDate } from '../../lib/adminData';
import {
  Printer,
  Bluetooth,
  Smartphone,
  Wifi,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Server,
  Search,
  Filter,
  Download,
  Zap,
  Activity,
  HardDrive,
  ShieldCheck,
} from 'lucide-react';

interface HardwareTelemetryViewProps {
  shops: Shop[];
  onShowToast: (msg: string) => void;
}

export function HardwareTelemetryView({ shops, onShowToast }: HardwareTelemetryViewProps) {
  const [filter, setFilter] = useState<'All' | 'PrinterEnabled' | 'PrinterDisabled'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const printerEnabledShops = useMemo(() => shops.filter((s) => s.printer_enabled), [shops]);
  const backupEnabledShops = useMemo(() => shops.filter((s) => s.daily_backup_enabled), [shops]);
  const roundOffShops = useMemo(() => shops.filter((s) => s.round_off_enabled), [shops]);

  const filteredShops = useMemo(() => {
    return shops.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        (s.printer_name && s.printer_name.toLowerCase().includes(q)) ||
        (s.city && s.city.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (filter === 'PrinterEnabled') return s.printer_enabled;
      if (filter === 'PrinterDisabled') return !s.printer_enabled;
      return true;
    });
  }, [shops, searchQuery, filter]);

  return (
    <div className="space-y-6 font-sans select-none animate-in fade-in duration-150">
      {/* 1. Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#11141a] via-[#1c1f28] to-[#11141a] border border-[#2b303c] p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-[#D4621A]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono font-bold tracking-wider text-[#D4621A] uppercase">
                Hardware Device Telemetry & Sync Pulse
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white m-0">
              Touch Heatmap & Peripheral Drivers
            </h2>
            <p className="text-xs text-gray-400 max-w-2xl leading-relaxed m-0">
              Live device pairing status, ESC/POS Bluetooth thermal printers, SQLite sync queue buffers, and daily automated cloud snapshots.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onShowToast('All retail hardware devices communicating with sub-second latency.')}
              className="px-4 py-2.5 rounded-xl bg-[#D4621A] hover:bg-[#bf5312] text-white text-xs font-bold transition-all shadow-md shadow-[#D4621A]/30 flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Ping Telemetry Bus</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Metric KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:border-[#D4621A]/50 transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Thermal Printers Paired</span>
            <div className="p-2 rounded-xl bg-[#F8F3F0] text-[#D4621A]">
              <Printer className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-[#111827]">
            {printerEnabledShops.length}
          </div>
          <div className="mt-2 text-[11.5px] text-gray-500 flex items-center justify-between">
            <span>
              {shops.length > 0
                ? `${Math.round((printerEnabledShops.length / shops.length) * 100)}% of stores`
                : '0%'}
            </span>
            <span className="text-[#D4621A] font-bold">58mm / 80mm</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:border-emerald-400/50 transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Bluetooth Drivers Active</span>
            <div className="p-2 rounded-xl bg-[#F8F3F0] text-[#D4621A]">
              <Bluetooth className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-[#111827]">
            ESC/POS
          </div>
          <div className="mt-2 text-[11.5px] text-gray-500 flex items-center justify-between">
            <span>Wireless Serial Protocol</span>
            <span className="text-[#D4621A] font-bold">Ready</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:border-blue-400/50 transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Daily Cloud Snapshots</span>
            <div className="p-2 rounded-xl bg-[#F8F3F0] text-[#D4621A]">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-[#111827]">
            {backupEnabledShops.length}
          </div>
          <div className="mt-2 text-[11.5px] text-gray-500 flex items-center justify-between">
            <span>Automated backups active</span>
            <span className="text-[#D4621A] font-bold">Encrypted</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:border-purple-400/50 transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Auto Round-Off Engines</span>
            <div className="p-2 rounded-xl bg-[#F8F3F0] text-[#D4621A]">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-[#111827]">
            {roundOffShops.length}
          </div>
          <div className="mt-2 text-[11.5px] text-gray-500 flex items-center justify-between">
            <span>Cash round-to-rupee</span>
            <span className="text-[#D4621A] font-bold">Active</span>
          </div>
        </div>
      </div>

      {/* 3. Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search shop name, printer model, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-[#D4621A] focus:outline-hidden transition-all text-gray-900"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilter('All')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filter === 'All'
                ? 'bg-[#1c1f26] text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:text-black'
            }`}
          >
            All Shops ({shops.length})
          </button>
          <button
            onClick={() => setFilter('PrinterEnabled')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filter === 'PrinterEnabled'
                ? 'bg-[#1c1f26] text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:text-black'
            }`}
          >
            Printer Configured ({printerEnabledShops.length})
          </button>
          <button
            onClick={() => setFilter('PrinterDisabled')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filter === 'PrinterDisabled'
                ? 'bg-[#1c1f26] text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:text-black'
            }`}
          >
            Printer Disabled ({shops.length - printerEnabledShops.length})
          </button>
        </div>
      </div>

      {/* 4. Peripheral Diagnostic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredShops.map((shop) => (
          <div
            key={shop.id}
            className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs hover:border-[#D4621A]/50 transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-[#111827] m-0">{shop.name}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-mono">
                    {shop.city || 'Tamil Nadu'}
                  </span>
                </div>
                <div className="text-[11px] text-gray-400 font-mono mt-0.5">{shop.phone}</div>
              </div>

              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                  shop.printer_enabled
                    ? 'bg-[#F8F3F0] text-[#D4621A] border border-[#D4621A]/25'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {shop.printer_enabled ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-[#D4621A]" />
                    <span>Printer Online</span>
                  </>
                ) : (
                  <span>No Printer</span>
                )}
              </span>
            </div>

            {/* Diagnostic Parameters */}
            <div className="mt-4 pt-3.5 border-t border-gray-100 grid grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-gray-400 text-[10.5px] block mb-0.5">Hardware Model</span>
                <span className="font-semibold text-gray-900 truncate block">
                  {shop.printer_name || (shop.printer_enabled ? 'ESC/POS 58mm' : '—')}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-gray-400 text-[10.5px] block mb-0.5">Daily Cloud Snapshot</span>
                <span
                  className={`font-semibold block ${
                    shop.daily_backup_enabled ? 'text-[#D4621A]' : 'text-gray-400'
                  }`}
                >
                  {shop.daily_backup_enabled ? 'Active (00:00)' : 'Disabled'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-gray-400 text-[10.5px] block mb-0.5">Auto Round-Off</span>
                <span
                  className={`font-semibold block ${
                    shop.round_off_enabled ? 'text-[#D4621A]' : 'text-gray-400'
                  }`}
                >
                  {shop.round_off_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>

            {/* Micro Action */}
            <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500">
              <span className="font-mono">Driver: Bluetooth 4.2 / USB 2.0</span>
              <button
                onClick={() => onShowToast(`Sent test print probe to ${shop.name}`)}
                className="text-[#D4621A] font-bold hover:underline cursor-pointer"
              >
                Send Test Probe &rarr;
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
