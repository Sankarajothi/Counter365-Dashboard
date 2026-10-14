'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  RotateCw,
  Download,
  FileSpreadsheet,
  FileText,
  Code,
  Printer,
  ChevronDown,
  KeyRound,
  LogOut,
} from 'lucide-react';

export type ExportFormat = 'csv' | 'excel' | 'json' | 'print';

interface HeaderProps {
  title: string;
  subtitle: string;
  onRefresh: () => void;
  isLoading: boolean;
  onExportFormat?: (format: ExportFormat) => void;
  adminUser?: { email: string; role: string; name?: string } | null;
  onLogout?: () => void;
  onOpenResetModal?: () => void;
  // Legacy optional props retained for seamless compatibility
  dateFilter?: string;
  onDateFilterChange?: (filter: string, customStart?: string, customEnd?: string) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  searchResults?: any;
  onSelectSearchResult?: (type: string, id: string) => void;
  onAddUser?: (user: { name: string; email: string; phone: string; role: string }) => void;
  onResetPassword?: (email: string) => void;
  onShowToast?: (msg: string) => void;
  shopsList?: { id: string; name: string }[];
}

export function Header({
  title,
  subtitle,
  onRefresh,
  isLoading,
  onExportFormat,
  adminUser,
  onLogout,
  onOpenResetModal,
}: HeaderProps) {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const adminInitial = (adminUser?.name || adminUser?.email || 'A')[0].toUpperCase();

  return (
    <header className="flex items-center gap-4 px-[24px] py-[13px] bg-white border-b border-[var(--color-divider)] shadow-xs flex-wrap sticky top-0 z-20">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#FD5E03]">
          Counter 365 Platform
        </div>
        <h1 className="m-0 text-[18px] sm:text-[20px] font-bold tracking-tight text-[#101318]">
          {title}
        </h1>
        <div className="text-[11px] text-gray-500 font-normal mt-0.5">
          {subtitle}
        </div>
      </div>

      <div className="flex items-center gap-2.5 ml-auto flex-wrap">
        {/* Export Data Dropdown (Optional) */}
        {onExportFormat && (
          <div ref={exportRef} className="relative">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              title="Export View Data"
              className="min-h-[36px] px-3 rounded-lg border border-[var(--color-divider)] bg-white text-gray-700 hover:border-[#FD5E03] hover:text-[#FD5E03] transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#FD5E03]" />
              <span className="hidden sm:inline">Export</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>

            {isExportOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-[var(--color-divider)] rounded-xl shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 divide-y divide-gray-100">
                <div className="text-[10px] font-bold text-gray-400 px-2.5 py-1.5 uppercase tracking-wider">
                  Export Formats
                </div>
                <div className="space-y-0.5 pt-1">
                  <button
                    onClick={() => {
                      onExportFormat('csv');
                      setIsExportOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-gray-700 hover:bg-[#FFF7ED] hover:text-[#FD5E03] transition-colors flex items-center gap-2.5 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-[#FD5E03] flex-none" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-900 leading-tight">Export as CSV</span>
                      <span className="text-[10px] text-gray-500">Comma-separated (.csv)</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onExportFormat('excel');
                      setIsExportOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-gray-700 hover:bg-[#FFF7ED] hover:text-[#FD5E03] transition-colors flex items-center gap-2.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 flex-none" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-900 leading-tight">Export as Excel</span>
                      <span className="text-[10px] text-gray-500">UTF-8 Excel sheet (.csv)</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onExportFormat('json');
                      setIsExportOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-gray-700 hover:bg-[#FFF7ED] hover:text-[#FD5E03] transition-colors flex items-center gap-2.5 cursor-pointer"
                  >
                    <Code className="w-4 h-4 text-blue-600 flex-none" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-900 leading-tight">Export as JSON</span>
                      <span className="text-[10px] text-gray-500">Structured data (.json)</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onExportFormat('print');
                      setIsExportOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-gray-700 hover:bg-[#FFF7ED] hover:text-[#FD5E03] transition-colors flex items-center gap-2.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-purple-600 flex-none" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-900 leading-tight">Print / PDF</span>
                      <span className="text-[10px] text-gray-500">Printable document view</span>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh Supabase Data"
          className="min-h-[36px] min-w-[36px] px-2.5 rounded-lg border border-[var(--color-divider)] bg-white text-gray-700 hover:border-[#FD5E03] hover:text-[#FD5E03] transition-colors flex items-center justify-center cursor-pointer shadow-xs"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#FD5E03]' : ''}`} />
        </button>

        {/* Reset Admin Credentials Button */}
        {onOpenResetModal && (
          <button
            onClick={onOpenResetModal}
            title="Reset Admin Credentials"
            className="min-h-[36px] px-3 rounded-lg border border-[var(--color-divider)] bg-white text-gray-700 hover:border-[#FD5E03] hover:text-[#FD5E03] transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-xs cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-[#FD5E03]" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        )}

        {/* User Small Circle Avatar & Sign Out in Corner */}
        <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
          {/* Small Circle Avatar (Domain & email text removed) */}
          <div
            title={adminUser?.email || adminUser?.name || 'Administrator'}
            className="w-8 h-8 rounded-full bg-[#FD5E03] text-white flex items-center justify-center font-bold text-xs shadow-xs select-none cursor-default"
          >
            {adminInitial}
          </div>

          {/* Sign Out Button in the Corner */}
          {onLogout && (
            <button
              onClick={onLogout}
              title="Sign Out"
              className="min-h-[36px] min-w-[36px] px-2 rounded-lg border border-[var(--color-divider)] bg-white text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50/50 transition-colors flex items-center justify-center cursor-pointer shadow-xs"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
