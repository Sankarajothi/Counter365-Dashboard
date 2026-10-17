import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  KeyRound,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  shops?: any[];
  staff?: any[];
  initialShop?: any;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, updateAdminPassword } = useAuth();

  const [mode, setMode] = useState<'update' | 'email'>('update');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const adminEmail = user?.email || 'stylefleet@tecstellar.com';

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccessMessage(null);
    onClose();
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    setLoading(true);
    try {
      // 1. Update in local AuthContext session
      const authResult = updateAdminPassword(newPassword, currentPassword);
      if (!authResult.success) {
        setError(authResult.error || 'Failed to update admin password.');
        setLoading(false);
        return;
      }

      // 2. Also attempt Supabase Auth updateUser if active session exists
      try {
        await supabase.auth.updateUser({ password: newPassword });
      } catch (sbErr) {
        // Fallback silently if running with local dashboard credentials
        console.warn('Supabase auth update note:', sbErr);
      }

      setSuccessMessage('Admin panel password updated successfully! Please use this new password on your next login.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to update admin password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRecoveryEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    setLoading(true);
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(adminEmail, {
        redirectTo: window.location.origin,
      });

      if (resetErr) {
        setError(`Unable to send recovery email: ${resetErr.message}`);
      } else {
        setSuccessMessage(`Password recovery instructions dispatched to ${adminEmail}. Check your inbox.`);
      }
    } catch (err: any) {
      setError(err.message || 'Error requesting reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Dialog */}
      <div
        className="relative w-full max-w-lg rounded-2xl border border-[#0D9488]/30 bg-[#F8F9FA] text-black shadow-2xl overflow-hidden z-10 my-8"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Accent Line */}
        <div className="h-1.5 w-full bg-[#0D9488]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#0D9488]/15 bg-[#0D9488]/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#0D9488] text-white shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-black">
                  Admin Panel Security
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#0D9488] text-white">
                  Admin Only
                </span>
              </div>
              <p className="text-xs text-black/70 mt-0.5">
                Reset credentials for the CounterPro Master Admin console
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-black/50 hover:text-black hover:bg-[#0D9488]/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex border-b border-[#0D9488]/15 bg-[#0D9488]/10 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setMode('update');
              setError(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'update'
                ? 'bg-[#0D9488] text-white shadow-xs'
                : 'text-black/70 hover:text-black hover:bg-[#0D9488]/15'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Change Password</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('email');
              setError(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'email'
                ? 'bg-[#0D9488] text-white shadow-xs'
                : 'text-black/70 hover:text-black hover:bg-[#0D9488]/15'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Send Email Recovery Link</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Admin Account Pill */}
          <div className="p-3 rounded-xl bg-[#0D9488]/5 border border-[#0D9488]/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#0D9488]" />
              <span className="font-semibold text-black/80">Authenticated Account:</span>
            </div>
            <span className="font-mono font-bold text-[#0D9488]">{adminEmail}</span>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="p-3.5 rounded-xl bg-[#0D9488]/10 border border-[#0D9488]/30 text-black text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#0D9488]" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-[#0D9488]/15 border border-[#0D9488]/40 text-black text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#0D9488]" />
              <div className="flex-1 font-medium">{successMessage}</div>
            </div>
          )}

          {/* Mode 1: Direct Password Change */}
          {mode === 'update' && (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-black/80 mb-1.5">
                  Current Admin Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    placeholder="Enter current admin password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-[#0D9488]/30 bg-[#F8F9FA] text-black focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488] outline-none transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black cursor-pointer"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black/80 mb-1.5">
                  New Password (min 6 characters)
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                  <input
                    type={showNew ? 'text' : 'password'}
                    placeholder="Enter new strong password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-[#0D9488]/30 bg-[#F8F9FA] text-black focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488] outline-none transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black cursor-pointer"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black/80 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-[#0D9488]/30 bg-[#F8F9FA] text-black focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488] outline-none transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black cursor-pointer"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-black/70 hover:bg-[#0D9488]/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#0D9488] hover:bg-[#0F766E] text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save New Password</span>
                </button>
              </div>
            </form>
          )}

          {/* Mode 2: Send Recovery Email */}
          {mode === 'email' && (
            <form onSubmit={handleSendRecoveryEmail} className="space-y-4">
              <p className="text-xs text-black/80 leading-relaxed">
                Click below to dispatch an official password reset email link to the registered admin email address (<strong>{adminEmail}</strong>).
              </p>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-black/70 hover:bg-[#0D9488]/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#0D9488] hover:bg-[#0F766E] text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <Mail className="w-3.5 h-3.5" />
                  <span>Send Reset Email</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
