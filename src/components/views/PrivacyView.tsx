'use client';

import React from 'react';
import { Shield, ExternalLink, Copy, Check, FileText, Smartphone, Database, Lock, Trash2, Mail } from 'lucide-react';

interface PrivacyViewProps {
  onShowToast: (msg: string) => void;
}

export function PrivacyView({ onShowToast }: PrivacyViewProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopyLink = () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/privacy-policy` : '/privacy-policy';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      onShowToast('Public Privacy Policy URL copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleOpenPublic = () => {
    window.open('/privacy-policy', '_blank');
  };

  const handleOpenDelete = () => {
    window.open('/delete-account', '_blank');
  };

  return (
    <div className="flex flex-col gap-[18px]">
      {/* Top Banner with Public Link Information */}
      <div className="bg-white rounded-[8px] shadow-sm p-[18px_20px] border border-[var(--color-divider)] flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D4621A] animate-pulse" />
            <h3 className="text-[16px] font-bold text-[#101318] m-0 flex items-center gap-2">
              Public Privacy Policy URL
            </h3>
            <span className="tag bg-[#F8F3F0] text-[#D4621A] border border-[#D4621A]/25 text-[10.5px]">
              No Login Required
            </span>
          </div>
          <p className="text-[12.5px] text-[#64748B] mt-1 m-0">
            This page is publicly reachable for Google Play Store, Apple App Store, and customer review without entering any username or password.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleCopyLink}
            className="btn btn-secondary text-[12.5px] min-h-[38px] px-3.5 gap-2 border-gray-300 hover:border-[#D4621A]"
          >
            {copied ? <Check className="w-4 h-4 text-[#D4621A]" /> : <Copy className="w-4 h-4 text-[#64748B]" />}
            <span>{copied ? 'Copied URL' : 'Copy Public Link'}</span>
          </button>
          
          <button
            onClick={handleOpenPublic}
            className="btn btn-primary text-[12.5px] min-h-[38px] px-3.5 gap-2 bg-[#D4621A] hover:bg-[#EA580C]"
          >
            <ExternalLink className="w-4 h-4 text-white" />
            <span>Open Public Policy</span>
          </button>

          <button
            onClick={handleOpenDelete}
            className="btn btn-secondary text-[12.5px] min-h-[38px] px-3.5 gap-2 border-red-200 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
            <span>Open Delete Page</span>
          </button>
        </div>
      </div>

      {/* Policy Content Card */}
      <div className="bg-white rounded-[8px] shadow-sm p-[24px_28px] border border-[var(--color-divider)] space-y-8 text-[14px] text-[#334155] leading-relaxed">
        {/* Document Header */}
        <div className="pb-6 border-b border-[var(--color-divider)] flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#D4621A] mb-1">
              <Shield className="w-4 h-4" />
              Official Compliance Document
            </div>
            <h2 className="text-2xl font-bold text-[#101318] m-0">
              Counter365 Privacy Policy
            </h2>
            <div className="text-[12px] text-black/50 mt-1">
              Published by <strong>Tecstellar</strong> &bull; Point of Sale & Retail Billing System
            </div>
          </div>

          <div className="text-right text-[12px] text-black/60 bg-[#F8F3F0] p-2.5 rounded-[6px] border border-[var(--color-divider)]">
            <div><strong>Last Updated:</strong> September 26, 2026</div>
            <div><strong>Hosting Region:</strong> India (ap-south-1)</div>
          </div>
        </div>

        {/* 1. Introduction */}
        <section className="space-y-2">
          <h3 className="text-[16px] font-bold text-[#101318] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#D4621A]" />
            1. Introduction & Overview
          </h3>
          <p>
            This Privacy Policy governs the manner in which <strong>Counter365</strong>, operated by <strong>Tecstellar</strong>, collects, utilizes, stores, and protects information gathered from users of the Counter365 mobile application (Android/iOS) and web administration portal.
          </p>
        </section>

        {/* 2. Data Collection */}
        <section className="space-y-3">
          <h3 className="text-[16px] font-bold text-[#101318] flex items-center gap-2">
            <Database className="w-4 h-4 text-[#D4621A]" />
            2. Information We Collect
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-[6px] bg-[#F8F3F0] border border-[var(--color-divider)]">
              <h4 className="font-bold text-[#101318] text-[13.5px] mb-1">Shop & Account Profile</h4>
              <ul className="list-disc list-inside text-[13px] text-[#475569] space-y-1">
                <li>Shop name and business category (Tea shop, Restaurant, Cafe, Fast Food)</li>
                <li>Owner name, phone number, and city/state</li>
                <li>Optional GST details and thermal printer settings</li>
              </ul>
            </div>
            <div className="p-3.5 rounded-[6px] bg-[#F8F3F0] border border-[var(--color-divider)]">
              <h4 className="font-bold text-[#101318] text-[13.5px] mb-1">Billing & Transactions</h4>
              <ul className="list-disc list-inside text-[13px] text-[#475569] space-y-1">
                <li>Bill records, totals, and item snapshots</li>
                <li>Settlement modes (Cash, UPI/GPay, and Pending balances)</li>
                <li>Menu catalogs, items, categories, and recorded expenses</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 3. Hardware & Bluetooth */}
        <section className="space-y-2">
          <h3 className="text-[16px] font-bold text-[#101318] flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-[#D4621A]" />
            3. Device Permissions & Bluetooth Printing
          </h3>
          <p className="text-[13px]">
            Counter365 requests Bluetooth permissions (<code>BLUETOOTH_CONNECT</code> / <code>BLUETOOTH_SCAN</code>) strictly to connect with 58mm/80mm ESC/POS thermal receipt printers. Location or Bluetooth data is never used for advertising, location tracking, or third-party behavioral profiling.
          </p>
        </section>

        {/* 4. Security & Storage */}
        <section className="space-y-2">
          <h3 className="text-[16px] font-bold text-[#101318] flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#D4621A]" />
            4. Cloud Security & PostgreSQL Row Level Security (RLS)
          </h3>
          <p className="text-[13px]">
            Data is stored securely in compliant Supabase infrastructure located in India. We enforce database Row Level Security (RLS) policies ensuring complete multi-tenant isolation. No shop or user can access or view another merchant&apos;s financial bills or catalogs.
          </p>
        </section>

        {/* 5. Account Deletions */}
        <section className="space-y-3">
          <h3 className="text-[16px] font-bold text-[#101318] flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-[#DC2626]" />
            5. User Account Deletions & Retention Policy
          </h3>
          <div className="p-3.5 rounded-[6px] bg-red-50/60 border border-red-200 text-red-950 text-[13px]">
            Users can permanently delete their accounts from the Counter365 mobile app via <em>Account &rarr; Delete Account</em> or through our public web form at <a href="/delete-account" target="_blank" className="text-[#D4621A] font-semibold underline">/delete-account</a>. Once submitted, authentication credentials are removed and an audit entry is archived in the <code>account_deletions</code> table for regulatory accounting compliance.
          </div>
        </section>

        {/* 6. Contact */}
        <section className="pt-4 border-t border-[var(--color-divider)]">
          <h3 className="text-[16px] font-bold text-[#101318] flex items-center gap-2 mb-2">
            <Mail className="w-4 h-4 text-[#D4621A]" />
            6. Support & Contact
          </h3>
          <div className="text-[13px] text-[#475569]">
            Inquiries regarding this policy may be directed to <a href="mailto:counter365@tecstellar.com" className="text-[#D4621A] font-semibold underline">counter365@tecstellar.com</a> or <a href="mailto:support@tecstellar.com" className="text-[#D4621A] font-semibold underline">support@tecstellar.com</a>.
          </div>
        </section>
      </div>
    </div>
  );
}
