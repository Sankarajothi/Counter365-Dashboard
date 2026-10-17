'use client';

import React from 'react';

export type ExportFormat = 'csv' | 'excel' | 'json' | 'print';

interface HeaderProps {
  title: string;
  subtitle: string;
  onRefresh?: () => void;
  isLoading?: boolean;
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
  onLogout,
  onOpenResetModal,
  onAddUserAccount,
}: HeaderProps) {
  return (
    <header className="flex items-center gap-4 px-[24px] py-[13px] bg-white border-b border-[#D4621A]/15 shadow-xs flex-wrap sticky top-0 z-20">
      <div>
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
        {/* Add user account button */}
        {onAddUserAccount && (
          <button
            onClick={onAddUserAccount}
            className="min-h-[32px] px-3.5 rounded-lg border border-[#D4621A]/25 bg-white text-slate-700 hover:bg-[#F8F3F0] transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-xs cursor-pointer"
          >
            <span>+ Add user account</span>
          </button>
        )}

        {/* Reset password button */}
        {onOpenResetModal && (
          <button
            onClick={onOpenResetModal}
            title="Reset Password"
            className="min-h-[32px] px-3.5 rounded-lg border border-[#D4621A]/25 bg-white text-slate-700 hover:bg-[#F8F3F0] transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-xs cursor-pointer"
          >
            <span>Reset password</span>
          </button>
        )}

        {/* Sign Out Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            title="Sign Out"
            className="min-h-[32px] px-3.5 rounded-lg bg-[#D4621A] hover:bg-[#bf5312] text-white transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-xs cursor-pointer"
          >
            <span>Sign out</span>
          </button>
        )}
      </div>
    </header>
  );
}
