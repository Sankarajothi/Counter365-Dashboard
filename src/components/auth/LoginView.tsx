'use client';

import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LoginViewProps {
  onOpenPrivacyPolicy?: () => void;
  onOpenDeleteAccount?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onOpenPrivacyPolicy,
  onOpenDeleteAccount,
}) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 2FA OTP verification step
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtpHint, setGeneratedOtpHint] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login(email, password, isOtpStep ? otpCode : undefined);
      setLoading(false);

      if (res.requireOtp) {
        setIsOtpStep(true);
        if (res.generatedOtp) {
          setGeneratedOtpHint(res.generatedOtp);
        }
        if (res.error) {
          setError(res.error);
        }
        return;
      }

      if (!res.success) {
        setError(res.error || 'Invalid credentials');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Authentication error occurred');
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative selection:bg-[#0D9488] selection:text-white"
      style={{
        backgroundColor: '#F8F9FA',
        backgroundImage: 'radial-gradient(circle at 85% 15%, rgba(13, 148, 136, 0.08) 0%, rgba(255, 255, 255, 0) 55%)',
      }}
    >
      <div className="w-full max-w-[420px] relative z-10">
        {/* White Card Container */}
        <div className="bg-white rounded-[28px] border border-slate-100/80 shadow-[0_20px_50px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] px-8 py-9 sm:px-10 sm:py-10">
          {/* Logo & Brand Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0D9488] flex items-center justify-center shadow-sm">
                <span className="font-heading font-black text-white text-base tracking-tighter">CP</span>
              </div>
              <div className="text-left">
                <span className="text-2xl font-bold tracking-tight text-slate-900 block leading-tight">
                  COUNTER<span className="text-[#0D9488]">365</span>
                </span>
                <span className="text-[9px] font-bold text-slate-400 tracking-[0.22em] uppercase block mt-0.5">
                  ADMIN CONSOLE
                </span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3 rounded-xl border border-red-200/80 bg-red-50 text-red-700 text-xs flex items-center gap-2.5 font-medium animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            {!isOtpStep ? (
              <>
                {/* Email Field */}
                <div className="space-y-1.5">
                  <label className="block text-[13px] font-semibold text-slate-800">
                    Username or Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="email"
                      required
                      autoComplete="off"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="info@tecstellar.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm font-normal placeholder:text-slate-400 focus:outline-none focus:border-[#0D9488] transition-colors shadow-2xs"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <label className="block text-[13px] font-semibold text-slate-800">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm font-normal placeholder:text-slate-400 focus:outline-none focus:border-[#0D9488] transition-colors shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || !email.trim() || !password.trim()}
                    className="w-full py-3.5 px-4 rounded-xl text-[13px] font-bold uppercase tracking-wider text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#0D9488]/20 disabled:opacity-40 disabled:cursor-not-allowed bg-[#0D9488] hover:bg-[#0f766e]"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>CHECKING CREDENTIALS...</span>
                      </>
                    ) : (
                      <>
                        <span>CONTINUE</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              /* 2FA OTP STEP */
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-150">
                <div className="p-3.5 rounded-2xl bg-[#0D9488]/5 border border-[#0D9488]/15 text-center space-y-1">
                  <div className="w-10 h-10 rounded-full bg-[#0D9488] text-white flex items-center justify-center mx-auto shadow-sm">
                    <ShieldCheck className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="text-sm font-bold text-[#0D9488] pt-1">
                    Two-Factor Verification
                  </h4>
                  <p className="text-xs text-slate-600">
                    A secure 6-digit login OTP was generated for <strong className="text-slate-900">{email}</strong>
                  </p>
                </div>

                {/* Live OTP Demo / Dispatch Helper */}
                <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-xs flex items-center justify-between text-teal-900">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>OTP Code: <strong className="font-mono text-sm tracking-wider">{generatedOtpHint || '849201'}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOtpCode(generatedOtpHint || '849201')}
                    className="px-2 py-0.5 rounded bg-teal-200/80 hover:bg-teal-300 text-teal-950 font-bold text-[11px] cursor-pointer"
                  >
                    Auto-Fill
                  </button>
                </div>

                {/* OTP Input */}
                <div className="space-y-1.5">
                  <label className="block text-[13px] font-semibold text-slate-800 text-center">
                    Enter 6-Digit OTP Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    className="w-full py-3.5 px-4 rounded-xl border-2 border-[#0D9488]/30 bg-white text-slate-900 text-center font-mono text-xl tracking-[0.4em] font-bold focus:outline-none focus:border-[#0D9488] shadow-2xs"
                  />
                </div>

                {/* Verify Button */}
                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    disabled={loading || otpCode.length < 6}
                    className="w-full py-3.5 px-4 rounded-xl text-[13px] font-bold uppercase tracking-wider text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md bg-[#0D9488] hover:bg-[#0f766e] disabled:opacity-40"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>VERIFYING OTP...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>VERIFY &amp; SIGN IN</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsOtpStep(false);
                      setOtpCode('');
                      setError(null);
                    }}
                    className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to credentials</span>
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Legal / Policy Links */}
          <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-center gap-4 text-xs font-medium text-slate-500">
            {onOpenPrivacyPolicy && (
              <button
                type="button"
                onClick={onOpenPrivacyPolicy}
                className="hover:text-slate-900 underline transition-colors cursor-pointer"
              >
                Privacy Policy
              </button>
            )}
            <span className="text-slate-300">•</span>
            {onOpenDeleteAccount && (
              <button
                type="button"
                onClick={onOpenDeleteAccount}
                className="hover:text-slate-900 underline transition-colors cursor-pointer"
              >
                Delete Account
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
