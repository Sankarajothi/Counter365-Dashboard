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
  onAddUserAccount?: () => void;
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
  onAddUserAccount,
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
    <header className="flex items-center gap-4 px-[24px] py-[13px] bg-white border-b border-[#D4621A]/15 shadow-xs flex-wrap sticky top-0 z-20">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
          Counter365 Platform
        </div>
        <h1 className="m-0 text-[18px] sm:text-[20px] font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        {subtitle && (
          <div className="text-[11px] text-slate-500 font-normal mt-0.5">
            {subtitle}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5 ml-auto flex-wrap">
        {/* User Pill with Orange Circular Avatar, ADMIN tag, and email */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-[#D4621A]/20 bg-[#F8F3F0] text-xs shadow-xs">
          <div className="w-6 h-6 rounded-full bg-[#D4621A] text-white flex items-center justify-center font-bold text-[10px]">
            {adminInitial}
          </div>
          <div className="flex items-center gap-1.5 leading-none">
            <span className="text-[9px] font-extrabold uppercase text-[#D4621A] font-mono">ADMIN</span>
            <span className="text-slate-800 font-medium truncate max-w-[140px] sm:max-w-none text-xs">
              {adminUser?.email || 'support@tecstellar.com'}
            </span>
          </div>
        </div>

        {/* Add user account button */}
        {onAddUserAccount && (
          <button
            onClick={onAddUserAccount}
            className="min-h-[32px] px-3 rounded-md border border-[#D4621A]/25 bg-white text-slate-700 hover:bg-[#F8F3F0] transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-xs cursor-pointer"
          >
            <span>+ Add user account</span>
          </button>
        )}

        {/* Reset password button */}
        {onOpenResetModal && (
          <button
            onClick={onOpenResetModal}
            title="Reset Password"
            className="min-h-[32px] px-3 rounded-md border border-[#D4621A]/25 bg-white text-slate-700 hover:bg-[#F8F3F0] transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-xs cursor-pointer"
          >
            <span>Reset password</span>
          </button>
        )}

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh Supabase Data"
          className="min-h-[32px] min-w-[32px] px-2 rounded-md border border-[#D4621A]/25 bg-white text-slate-700 hover:bg-[#F8F3F0] transition-colors flex items-center justify-center cursor-pointer shadow-xs"
        >
          <RotateCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin text-[#D4621A]' : ''}`} />
        </button>

        {/* Export Data Dropdown (Optional) */}
        {onExportFormat && (
          <div ref={exportRef} className="relative">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              title="Export View Data"
              className="min-h-[32px] px-3 rounded-md border border-[#D4621A]/25 bg-white text-slate-700 hover:bg-[#F8F3F0] transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#D4621A]" />
              <span className="hidden sm:inline">Export</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isExportOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-[#D4621A]/20 rounded-xl shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 divide-y divide-[#D4621A]/10">
                <div className="text-[10px] font-bold text-[#D4621A] px-2.5 py-1.5 uppercase tracking-wider font-mono">
                  Export Formats
                </div>
                <div className="space-y-0.5 pt-1">
                  <button
                    onClick={() => {
                      onExportFormat('csv');
                      setIsExportOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-[#F8F3F0] hover:text-slate-900 transition-colors flex items-center gap-2.5 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-[#D4621A] flex-none" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900 leading-tight">Export as CSV</span>
                      <span className="text-[10px] text-slate-500">Comma-separated (.csv)</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onExportFormat('excel');
                      setIsExportOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-[#F8F3F0] hover:text-slate-900 transition-colors flex items-center gap-2.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-[#D4621A] flex-none" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900 leading-tight">Export as Excel</span>
                      <span className="text-[10px] text-slate-500">UTF-8 Excel sheet (.csv)</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onExportFormat('json');
                      setIsExportOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-[#F8F3F0] hover:text-slate-900 transition-colors flex items-center gap-2.5 cursor-pointer"
                  >
                    <Code className="w-4 h-4 text-[#D4621A] flex-none" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900 leading-tight">Export as JSON</span>
                      <span className="text-[10px] text-slate-500">Structured data (.json)</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onExportFormat('print');
                      setIsExportOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-[#F8F3F0] hover:text-slate-900 transition-colors flex items-center gap-2.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-[#D4621A] flex-none" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900 leading-tight">Print / PDF</span>
                      <span className="text-[10px] text-slate-500">Printable document view</span>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sign Out Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            title="Sign Out"
            className="min-h-[32px] px-3.5 rounded-md bg-[#D4621A] hover:bg-[#bf5312] text-white transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-xs cursor-pointer"
          >
            <span>Sign out</span>
          </button>
        )}
      </div>
    </header>
  );
}
