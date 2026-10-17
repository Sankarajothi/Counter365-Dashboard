'use client';

import React, { useState } from 'react';
import { KeyRound, Mail, Lock, ShieldCheck, CheckCircle2, X } from 'lucide-react';

interface ResetCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEmail?: string;
  onSuccess?: (user: { email: string; role: string; name: string }) => void;
  onShowToast?: (msg: string) => void;
}

export function ResetCredentialsModal({
  isOpen,
  onClose,
  currentEmail = 'counter365@tecstellar.com',
  onSuccess,
  onShowToast,
}: ResetCredentialsModalProps) {
  const [adminEmail, setAdminEmail] = useState(currentEmail);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail.trim() || !adminEmail.includes('@')) {
      onShowToast?.('Please enter a valid email address.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      onShowToast?.('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      onShowToast?.('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail.trim(), password: newPassword }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onShowToast?.('Admin email and password updated successfully.');
        if (data.user && onSuccess) {
          onSuccess(data.user);
        }
        onClose();
        setNewPassword('');
        setConfirmPassword('');
      } else {
        onShowToast?.(data.message || 'Failed to update credentials.');
      }
    } catch {
      onShowToast?.('Network error updating credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95"
      >
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-teal-50/50 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 text-[#0D9488]">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#111827] m-0">Reset Admin Credentials</h3>
              <p className="text-[11px] text-gray-500 m-0">Update founder login credentials in local storage</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>Admin Email</span>
            </label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:border-[#0D9488] focus:outline-hidden bg-gray-50 focus:bg-white text-gray-900 font-medium"
              placeholder="admin@counter365.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>New Password</span>
            </label>
            <input
              type="password"
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:border-[#0D9488] focus:outline-hidden bg-gray-50 focus:bg-white text-gray-900"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>Confirm New Password</span>
            </label>
            <input
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:border-[#0D9488] focus:outline-hidden bg-gray-50 focus:bg-white text-gray-900"
              required
            />
          </div>

          <div className="pt-2 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 text-xs font-bold text-white bg-[#0D9488] hover:bg-[#0f766e] rounded-xl shadow-md shadow-[#0D9488]/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Credentials</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
