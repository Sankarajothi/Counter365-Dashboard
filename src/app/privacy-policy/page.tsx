import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield, ArrowLeft, Lock, FileText, Smartphone, Database, UserCheck, Trash2, Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy — Counter365',
  description: 'Privacy Policy and Data Protection Information for Counter365 Billing & Retail System',
};

export default function PrivacyPolicyPage() {
  const lastUpdated = 'September 26, 2026';

  return (
    <div className="min-h-screen bg-[#F8F3F0] text-[#101318] flex flex-col font-sans selection:bg-[#D4621A]/20 selection:text-[#D4621A]">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#E2E8F0] shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white p-1 border border-[#E2E8F0] shadow-xs flex items-center justify-center">
              <img
                src="/assets/counterpro-logo.png"
                alt="Counter365"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="font-heading font-black text-[17px] tracking-wide text-[#101318] flex items-center leading-none">
                COUNTER<span className="text-[#D4621A]">365</span>
              </div>
              <div className="text-[9.5px] font-bold tracking-[0.18em] uppercase text-[#64748B] mt-0.5">
                LEGAL & PRIVACY
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/delete-account"
              className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#DC2626] hover:text-[#B91C1C] transition-colors py-1.5 px-3 rounded-md border border-red-200 hover:border-red-300 bg-red-50/50 shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Account</span>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#101318] hover:text-[#D4621A] transition-colors py-1.5 px-3 rounded-md border border-[#E2E8F0] hover:border-[#D4621A] bg-white shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Admin Portal</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <section className="bg-[#101318] text-white py-12 px-4 sm:px-6 border-b border-[#1E2430]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-[12px] font-semibold mb-4 border border-white/10">
            <Shield className="w-3.5 h-3.5 text-[#D4621A]" />
            <span>Official Legal Documentation</span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            Counter365 Privacy Policy
          </h1>
          <p className="text-white/70 text-[14px] sm:text-[15px] max-w-2xl mx-auto leading-relaxed">
            Your privacy and operational data sovereignty are fundamental to us. This policy outlines how Counter365 collects, processes, protects, and handles your business and customer information.
          </p>
          <div className="text-[12px] text-white/50 mt-4">
            Last Updated: <span className="text-[#D4621A] font-semibold">{lastUpdated}</span> &bull; Region: India
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 sm:p-10 space-y-10 leading-relaxed text-[14.5px] text-[#334155]">

          {/* 1. Introduction */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#101318] flex items-center gap-2.5 pb-2 border-b border-[#F1F5F9]">
              <FileText className="w-5 h-5 text-[#D4621A]" />
              1. Introduction & Overview
            </h2>
            <p>
              Welcome to <strong>Counter365</strong>, a point-of-sale (POS) billing and counter management application provided by <strong>Tecstellar</strong> (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;). This Privacy Policy applies to the Counter365 mobile applications (available on Android and iOS), the web-based Admin Console, and any associated services (collectively referred to as the &quot;Service&quot;).
            </p>
            <p>
              By installing, accessing, or using Counter365, you consent to the collection and use of information in accordance with this Privacy Policy. If you do not agree with any terms of this policy, please discontinue use of the application.
            </p>
          </section>

          {/* 2. Information We Collect */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#101318] flex items-center gap-2.5 pb-2 border-b border-[#F1F5F9]">
              <Database className="w-5 h-5 text-[#D4621A]" />
              2. Information We Collect
            </h2>
            <p>
              We collect information that is strictly necessary to provide retail billing, receipt printing, inventory tracking, financial analytics, and synchronization services:
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mt-3">
              <div className="p-4 rounded-lg bg-[#F8F3F0] border border-[#E2E8F0]">
                <h3 className="font-bold text-[#101318] text-[15px] mb-1.5">Business & Account Information</h3>
                <ul className="list-disc list-inside text-[13.5px] text-[#475569] space-y-1">
                  <li>Shop Name and Business Category (e.g. Tea Shop, Restaurant)</li>
                  <li>Owner / Administrator full name and mobile phone number</li>
                  <li>Business address, city, state, and pincode</li>
                  <li>Optional GST registration number and tax rates</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-[#F8F3F0] border border-[#E2E8F0]">
                <h3 className="font-bold text-[#101318] text-[15px] mb-1.5">Transaction & Operational Data</h3>
                <ul className="list-disc list-inside text-[13.5px] text-[#475569] space-y-1">
                  <li>Bills generated, bill numbers, and sales line items</li>
                  <li>Payment methods (Cash, UPI / GPay, Pending credit)</li>
                  <li>Catalog menu items, categories, and pricing</li>
                  <li>Customer names and phone numbers entered for credit tracking</li>
                  <li>Recorded business operational expenses</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 3. Device Permissions */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#101318] flex items-center gap-2.5 pb-2 border-b border-[#F1F5F9]">
              <Smartphone className="w-5 h-5 text-[#D4621A]" />
              3. Device Permissions & Usage
            </h2>
            <p>
              Counter365 requests only essential device permissions required for counter operation:
            </p>
            <div className="space-y-2.5 text-[13.5px]">
              <div className="p-3 bg-white border border-[#E2E8F0] rounded-md">
                <strong className="text-[#101318]">Bluetooth & Nearby Devices (BLUETOOTH_CONNECT, BLUETOOTH_SCAN):</strong> Required solely to discover and connect with 58mm/80mm wireless thermal ESC/POS receipt printers for printing bills.
              </div>
              <div className="p-3 bg-white border border-[#E2E8F0] rounded-md">
                <strong className="text-[#101318]">Internet & Network State:</strong> Used to synchronize billing transactions, backup menu items, and process cloud operations with our secure cloud servers. Counter365 supports offline billing; transactions are queued locally and synchronized automatically when an active connection is restored.
              </div>
              <div className="p-3 bg-white border border-[#E2E8F0] rounded-md">
                <strong className="text-[#101318]">Storage / Documents:</strong> Used when exporting PDF reports, daily total summaries, or sharing digital bills via messaging applications upon customer request.
              </div>
            </div>
          </section>

          {/* 4. Data Security & Storage */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#101318] flex items-center gap-2.5 pb-2 border-b border-[#F1F5F9]">
              <Lock className="w-5 h-5 text-[#D4621A]" />
              4. Data Security & Cloud Storage
            </h2>
            <p>
              We implement industry-standard administrative, physical, and technical safeguards to protect your business records:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-[13.5px] pl-2 text-[#475569]">
              <li>All communications between client devices and cloud services are encrypted using Transport Layer Security (TLS 1.3 / HTTPS).</li>
              <li>Data is stored in high-security, compliant infrastructure hosted in the <strong>India (ap-south-1)</strong> region.</li>
              <li>PostgreSQL <strong>Row Level Security (RLS)</strong> is strictly enforced at the database level to ensure complete tenant data isolation—no shop can access, query, or mutate another shop&apos;s financial records.</li>
              <li>Authentication tokens are securely stored on device keychains and encrypted app sandboxes.</li>
            </ul>
          </section>

          {/* 5. Account Deletion & Data Retention */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#101318] flex items-center gap-2.5 pb-2 border-b border-[#F1F5F9]">
              <Trash2 className="w-5 h-5 text-[#DC2626]" />
              5. Account Deletion & Right to Erasure
            </h2>
            <div className="p-4 rounded-lg bg-red-50/70 border border-red-200 text-red-950">
              <h3 className="font-bold text-[15px] text-red-900 mb-1 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-red-600" />
                User-Initiated Account Deletion
              </h3>
              <p className="text-[13.5px] leading-relaxed text-red-900/90">
                You have the full right to delete your Counter365 account at any time. When an account deletion is initiated:
              </p>
              <ul className="list-disc list-inside text-[13px] text-red-900/85 mt-2 space-y-1 pl-1">
                <li>Your profile and active session credentials will be permanently deactivated.</li>
                <li>Your shop and active subscription will be marked as offboarded.</li>
                <li>An audit record is created in the <code>account_deletions</code> register documenting the date, user identifier, and feedback to ensure compliance with financial accounting standards.</li>
              </ul>
            </div>
            <p className="text-[13.5px]">
              <strong>How to request deletion:</strong> You can delete your account directly inside the Counter365 Mobile Application by navigating to <em>Account Settings &rarr; Delete Account</em>, visit our dedicated public <Link href="/delete-account" className="text-[#D4621A] font-semibold underline">Account Deletion Page</Link>, or submit an email request to <a href="mailto:counter365@tecstellar.com" className="text-[#D4621A] font-semibold underline">counter365@tecstellar.com</a> with your registered phone number.
            </p>
          </section>

          {/* 6. Third-Party Services */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#101318] flex items-center gap-2.5 pb-2 border-b border-[#F1F5F9]">
              <Shield className="w-5 h-5 text-[#D4621A]" />
              6. Third-Party Services & Providers
            </h2>
            <p>
              We do not sell, rent, or trade your personal or business data to any third-party advertisers. We work solely with trusted service providers strictly necessary to deliver Counter365 features:
            </p>
            <ul className="list-disc list-inside space-y-1 text-[13.5px] text-[#475569] pl-2">
              <li><strong>Supabase:</strong> For relational PostgreSQL database hosting, authentication, and secure data synchronization.</li>
              <li><strong>UPI / Payment Gateway Services:</strong> For processing subscription payments where applicable. We do not store credit card or bank credentials on our servers.</li>
            </ul>
          </section>

          {/* 7. Children's Privacy */}
          <section className="space-y-2">
            <h2 className="text-xl font-bold text-[#101318] pb-2 border-b border-[#F1F5F9]">
              7. Children&apos;s Privacy
            </h2>
            <p className="text-[13.5px]">
              Counter365 is intended for commercial business use by shop owners, supervisors, and billers. We do not knowingly collect personal information from individuals under the age of 18.
            </p>
          </section>

          {/* 8. Changes to this Policy */}
          <section className="space-y-2">
            <h2 className="text-xl font-bold text-[#101318] pb-2 border-b border-[#F1F5F9]">
              8. Changes to this Privacy Policy
            </h2>
            <p className="text-[13.5px]">
              We may update our Privacy Policy periodically to reflect technological advancements, operational changes, or statutory regulations. Any updates will be published on this page with an updated &quot;Last Updated&quot; date.
            </p>
          </section>

          {/* 9. Contact Us */}
          <section className="space-y-3 pt-4 border-t border-[#E2E8F0]">
            <h2 className="text-xl font-bold text-[#101318] flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#D4621A]" />
              9. Contact & Support Information
            </h2>
            <p className="text-[13.5px]">
              For any questions, concerns, or requests regarding this Privacy Policy or your data, please contact our Data Governance & Support team:
            </p>
            <div className="p-4 rounded-lg bg-[#F8F3F0] border border-[#E2E8F0] space-y-1.5 text-[13.5px]">
              <div><strong>Application:</strong> Counter365 Counter App & Admin Console</div>
              <div><strong>Entity:</strong> Tecstellar</div>
              <div><strong>Email:</strong> <a href="mailto:counter365@tecstellar.com" className="text-[#D4621A] font-semibold underline">counter365@tecstellar.com</a></div>
              <div><strong>Alternative Support:</strong> <a href="mailto:support@tecstellar.com" className="text-[#D4621A] font-semibold underline">support@tecstellar.com</a></div>
              <div><strong>Operational Region:</strong> India</div>
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#E2E8F0] py-6 px-4 text-center text-[12px] text-[#64748B]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            &copy; {new Date().getFullYear()} Counter365 &bull; Tecstellar. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-[#D4621A] transition-colors">
              Admin Portal
            </Link>
            <Link href="/privacy-policy" className="text-[#D4621A] font-semibold">
              Privacy Policy
            </Link>
            <Link href="/delete-account" className="text-[#DC2626] hover:underline font-semibold">
              Delete Account
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
