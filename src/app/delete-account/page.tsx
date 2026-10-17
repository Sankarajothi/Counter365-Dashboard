'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Smartphone,
  ShieldAlert,
  Info,
  Phone,
  Store,
  User,
  MessageSquare,
  HelpCircle,
  Lock,
} from 'lucide-react';

export default function DeleteAccountPage() {
  const [phone, setPhone] = useState('');
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [reason, setReason] = useState('Bug issues / Technical glitches');
  const [feedback, setFeedback] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<{ id: string } | null>(null);

  const reasons = [
    'Bug issues / Technical glitches',
    'Closing business / Store shut down',
    'Switching to another billing software',
    'Pricing / Subscription costs',
    'Missing required features',
    'Temporary hiatus / Not needed anymore',
    'Other reason',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phone.trim()) {
      setError('Please provide your registered mobile phone number.');
      return;
    }

    if (!shopName.trim()) {
      setError('Please provide your registered shop name.');
      return;
    }

    if (!confirmed) {
      setError('Please check the confirmation box acknowledging permanent deletion.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/account-deletions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          shop_name: shopName,
          owner_name: ownerName,
          reason,
          feedback,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessData({ id: data.id || 'REQ-' + Math.floor(100000 + Math.random() * 900000) });
      } else {
        setError(data.message || 'Failed to submit account deletion request. Please try again.');
      }
    } catch (err: any) {
      setError('Connection error. Please check your internet connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F3F0] text-[#101318] flex flex-col font-sans selection:bg-[#D4621A]/20 selection:text-[#D4621A]">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#E2E8F0] shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
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
                ACCOUNT SERVICES
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/privacy-policy"
              className="text-[12.5px] font-semibold text-[#64748B] hover:text-[#101318] transition-colors hidden sm:inline"
            >
              Privacy Policy
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#101318] hover:text-[#D4621A] transition-colors py-1.5 px-3 rounded-md border border-[#E2E8F0] hover:border-[#D4621A] bg-white shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Admin Portal</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="bg-[#101318] text-white py-10 sm:py-12 px-4 sm:px-6 border-b border-[#1E2430]">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/15 text-red-400 text-[12px] font-semibold mb-3 border border-red-500/20">
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            <span>Account Deletion & Data Erasure</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
            Delete Your Counter365 Account
          </h1>
          <p className="text-white/70 text-[14px] sm:text-[15px] max-w-xl mx-auto leading-relaxed">
            We are sorry to see you go. Learn what happens to your data and submit your permanent account deletion request below.
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {successData ? (
          /* Success Screen */
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-8 sm:p-10 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-[#D4621A]/10 text-[#D4621A] flex items-center justify-center mx-auto mb-4 border border-[#D4621A]/25">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h2 className="font-heading text-2xl font-bold text-[#101318] mb-2">
              Deletion Request Received
            </h2>
            <p className="text-[14px] text-[#475569] max-w-md mx-auto mb-6 leading-relaxed">
              Your account deletion request has been recorded. Our automated compliance system will complete account deactivation and offboarding within <strong>48 business hours</strong>.
            </p>

            <div className="p-4 bg-[#F8F3F0] rounded-lg border border-[#E2E8F0] max-w-sm mx-auto text-left text-[13px] space-y-2 mb-6">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Request ID:</span>
                <span className="font-mono font-bold text-[#101318]">{successData.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Shop Name:</span>
                <span className="font-semibold text-[#101318]">{shopName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Phone:</span>
                <span className="font-mono text-[#101318]">+91 {phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Status:</span>
                <span className="tag bg-amber-50 text-amber-700 border border-amber-200 text-[10.5px]">Queued for Deletion</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/"
                className="w-full sm:w-auto btn btn-secondary min-h-[42px] px-6 text-[13px]"
              >
                Return to Admin Console
              </Link>
              <a
                href="mailto:counter365@tecstellar.com"
                className="w-full sm:w-auto btn btn-primary min-h-[42px] px-6 text-[13px] bg-[#D4621A] hover:bg-[#EA580C]"
              >
                Contact Support
              </a>
            </div>
          </div>
        ) : (
          /* Form and Info Cards */
          <div className="space-y-6">
            {/* Policy & Explanation Cards */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg border border-[#E2E8F0] p-5 shadow-xs">
                <div className="flex items-center gap-2 text-red-600 font-bold text-[14px] mb-2">
                  <Trash2 className="w-4 h-4" />
                  What Will Be Deleted
                </div>
                <ul className="text-[12.5px] text-[#475569] space-y-1.5 list-disc list-inside">
                  <li>User login credentials and auth sessions</li>
                  <li>Device synchronization associations</li>
                  <li>Active subscription and renewal profiles</li>
                  <li>Merchant account access across mobile apps</li>
                </ul>
              </div>

              <div className="bg-white rounded-lg border border-[#E2E8F0] p-5 shadow-xs">
                <div className="flex items-center gap-2 text-amber-600 font-bold text-[14px] mb-2">
                  <Info className="w-4 h-4" />
                  Statutory Accounting Retention
                </div>
                <p className="text-[12.5px] text-[#475569] leading-relaxed">
                  In compliance with Indian statutory financial, taxation (GST), and audit regulations, historical invoices created prior to deletion are securely archived in an anonymized format for auditing.
                </p>
              </div>
            </div>

            {/* Quick In-App Deletion Step Notice */}
            <div className="p-4 bg-white rounded-lg border border-[#E2E8F0] shadow-xs flex items-start gap-3 text-[13px] text-[#334155]">
              <Smartphone className="w-5 h-5 text-[#D4621A] flex-none mt-0.5" />
              <div>
                <strong>Prefer deleting directly from your phone?</strong>
                <p className="text-[12.5px] text-[#64748B] mt-0.5 m-0">
                  Open the Counter365 mobile app, navigate to <em>Account Settings &rarr; Delete Account</em>, and confirm your passcode. Otherwise, you can complete the online request below.
                </p>
              </div>
            </div>

            {/* Deletion Request Form */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8">
              <h2 className="font-heading text-lg font-bold text-[#101318] mb-1">
                Account Deletion Form
              </h2>
              <p className="text-[12.5px] text-[#64748B] mb-5">
                Please provide your registered details to verify and process your account termination.
              </p>

              {error && (
                <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[13px] flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-none mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Phone */}
                  <div>
                    <label className="block text-[12.5px] font-bold text-[#1E293B] mb-1">
                      Registered Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 98404 12345"
                        className="w-full min-h-[42px] pl-10 pr-3.5 text-[13.5px] text-[#101318] bg-white rounded-md border border-[#CBD5E1] focus:border-[#D4621A] focus:ring-1 focus:ring-[#D4621A] outline-none transition-all placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  {/* Shop Name */}
                  <div>
                    <label className="block text-[12.5px] font-bold text-[#1E293B] mb-1">
                      Shop / Business Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Store className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        placeholder="e.g. Anandha Tea Stall"
                        className="w-full min-h-[42px] pl-10 pr-3.5 text-[13.5px] text-[#101318] bg-white rounded-md border border-[#CBD5E1] focus:border-[#D4621A] focus:ring-1 focus:ring-[#D4621A] outline-none transition-all placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Owner Name */}
                <div>
                  <label className="block text-[12.5px] font-bold text-[#1E293B] mb-1">
                    Owner / Contact Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g. Saravanan M"
                      className="w-full min-h-[42px] pl-10 pr-3.5 text-[13.5px] text-[#101318] bg-white rounded-md border border-[#CBD5E1] focus:border-[#D4621A] focus:ring-1 focus:ring-[#D4621A] outline-none transition-all placeholder:text-gray-400"
                    />
                  </div>
                </div>

                {/* Reason Dropdown */}
                <div>
                  <label className="block text-[12.5px] font-bold text-[#1E293B] mb-1">
                    Primary Reason for Leaving <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full min-h-[42px] px-3.5 text-[13.5px] text-[#101318] bg-white rounded-md border border-[#CBD5E1] focus:border-[#D4621A] focus:ring-1 focus:ring-[#D4621A] outline-none transition-all"
                  >
                    {reasons.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Feedback Textarea */}
                <div>
                  <label className="block text-[12.5px] font-bold text-[#1E293B] mb-1">
                    Additional Feedback or Suggestions (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Tell us what went wrong or how we can improve Counter365..."
                    className="w-full p-3 text-[13.5px] text-[#101318] bg-white rounded-md border border-[#CBD5E1] focus:border-[#D4621A] focus:ring-1 focus:ring-[#D4621A] outline-none transition-all placeholder:text-gray-400"
                  />
                </div>

                {/* Irreversible Confirmation Checkbox */}
                <div className="pt-2">
                  <label className="flex items-start gap-3 p-3.5 bg-red-50/60 rounded-lg border border-red-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="w-4 h-4 mt-0.5 accent-[#DC2626] rounded text-[#DC2626] cursor-pointer"
                    />
                    <span className="text-[12.5px] text-red-950 leading-snug">
                      I understand that account deletion is <strong>permanent and irreversible</strong>. My shop profile and mobile login will be deactivated, and active subscription benefits will be surrendered.
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="min-h-[44px] w-full bg-[#DC2626] hover:bg-[#B91C1C] active:bg-[#991B1B] text-white font-bold text-[14px] rounded-md shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Submitting Deletion Request...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>Confirm & Submit Account Deletion</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
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
            <Link href="/privacy-policy" className="hover:text-[#D4621A] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/delete-account" className="text-[#DC2626] font-semibold">
              Delete Account
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
