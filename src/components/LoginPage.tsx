'use client';

import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: { email: string; role: string; name: string }) => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  // Empty initial states - ZERO prefill
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Please enter both your username and password.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem('counter365_admin_logged_in', 'true');
        onLoginSuccess(data.user);
      } else {
        setError(data.message || 'Invalid username or password.');
      }
    } catch (err: any) {
      setError('Network connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F3F4F6] p-4 select-none">
      {/* Login Card */}
      <div className="w-full max-w-[400px] bg-white rounded-[10px] shadow-lg border border-[#E2E8F0] overflow-hidden">
        {/* Header Section */}
        <div className="pt-8 pb-6 px-8 text-center flex flex-col items-center border-b border-[#F1F5F9] bg-white">
          <div className="w-16 h-16 rounded-full bg-[#EA580C] overflow-hidden shadow-md flex items-center justify-center mb-3.5 border border-[#C2410C]/20 p-2.5">
            <img
              src="/assets/counter365-logo.png"
              alt="Counter365 Brand Logo"
              className="w-full h-full object-contain"
            />
          </div>
          
          <h1 className="font-heading font-black text-[22px] tracking-wide text-[#101318] flex items-center justify-center leading-tight m-0">
            COUNTER<span className="text-[#EA580C]">365</span>
          </h1>
          
          <div className="text-[11px] font-bold tracking-[0.16em] uppercase text-[#101318]/70 mt-1">
            ADMIN CONSOLE
          </div>
          
          <p className="text-[12.5px] text-[#64748B] mt-1 m-0">
            Sign in to manage shops, revenue, and platform operations
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8 pt-6 bg-white">
          {error && (
            <div className="mb-4 p-3 rounded-[6px] bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-[12.5px] flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-none text-[#DC2626] mt-0.5" />
              <span className="font-medium leading-snug">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Username / Email */}
            <div>
              <label className="block text-[12.5px] font-bold text-[#1E293B] mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                <input
                  type="email"
                  required
                  autoFocus
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter admin email"
                  className="w-full min-h-[42px] pl-10 pr-3.5 text-[13.5px] font-normal text-[#101318] bg-white rounded-[6px] border border-[#CBD5E1] focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15 outline-none transition-all placeholder:text-[#94A3B8]"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[12.5px] font-bold text-[#1E293B] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full min-h-[42px] pl-10 pr-11 text-[13.5px] font-normal text-[#101318] bg-white rounded-[6px] border border-[#CBD5E1] focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15 outline-none transition-all placeholder:text-[#94A3B8]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#101318] p-1 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 min-h-[44px] w-full bg-[#EA580C] hover:bg-[#C2410C] active:bg-[#EA580C] text-white font-bold text-[14px] rounded-[6px] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sign In to Admin Console</span>
                </>
              )}
            </button>
          </form>

          {/* Clean Security Info */}
          <div className="mt-6 pt-4 border-t border-[#F1F5F9] text-center">
            <div className="flex items-center justify-center gap-1.5 text-[11.5px] text-[#64748B] font-medium">
              <span className="w-2 h-2 rounded-full bg-[#EA580C] inline-block" />
              <span>India Region (ap-south-1)</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-[11px] text-[#94A3B8] mt-2">
              <a
                href="/privacy-policy"
                target="_blank"
                rel="noreferrer"
                className="text-[#64748B] hover:text-[#EA580C] hover:underline font-semibold"
              >
                Privacy Policy
              </a>
              <span>&bull;</span>
              <a
                href="/delete-account"
                target="_blank"
                rel="noreferrer"
                className="text-[#EA580C] hover:underline font-semibold"
              >
                Delete Account
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
