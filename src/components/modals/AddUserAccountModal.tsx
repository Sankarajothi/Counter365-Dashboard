'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  Users,
  Shield,
  Lock,
  Mail,
  User,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  CrmUserAccount,
  ALL_AVAILABLE_MODULES,
  fetchCrmUserAccounts,
  createCrmUserAccount,
  deleteCrmUserAccount,
} from '../../services/crmUserService';

interface AddUserAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string;
}

export const AddUserAccountModal: React.FC<AddUserAccountModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail = 'info@tecstellar.com',
}) => {
  const [accounts, setAccounts] = useState<CrmUserAccount[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [crmRole, setCrmRole] = useState<'admin' | 'staff'>('staff');
  const [accessType, setAccessType] = useState<'full' | 'strict'>('full');
  const [selectedModules, setSelectedModules] = useState<string[]>(
    ALL_AVAILABLE_MODULES.map((m) => m.id)
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
    }
  }, [isOpen]);

  const loadAccounts = async () => {
    setLoading(true);
    const data = await fetchCrmUserAccounts();
    setAccounts(data);
    setLoading(false);
  };

  if (!isOpen) return null;

  const handleToggleModule = (modId: string) => {
    setSelectedModules((prev) =>
      prev.includes(modId) ? prev.filter((id) => id !== modId) : [...prev, modId]
    );
  };

  const handleSelectAllModules = () => {
    setSelectedModules(ALL_AVAILABLE_MODULES.map((m) => m.id));
  };

  const handleClearAllModules = () => {
    setSelectedModules([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setError('Please provide staff or admin name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!password.trim() || password.trim().length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (accessType === 'strict' && selectedModules.length === 0) {
      setError('Please select at least one permitted module for strict access.');
      return;
    }

    setSaving(true);
    const result = await createCrmUserAccount({
      name: name.trim(),
      email: email.trim(),
      password: password.trim(),
      crm_role: crmRole,
      access_type: accessType,
      allowed_modules: accessType === 'full' ? ALL_AVAILABLE_MODULES.map((m) => m.id) : selectedModules,
      created_by: currentUserEmail,
    });
    setSaving(false);

    if (!result.success) {
      setError(result.error || 'Failed to create user account.');
      return;
    }

    setSuccessMsg(`User account for ${name} (${email}) created successfully!`);
    setName('');
    setEmail('');
    setPassword('');
    setAccessType('full');
    setSelectedModules(ALL_AVAILABLE_MODULES.map((m) => m.id));
    loadAccounts();
  };

  const handleDelete = async (id: string, userEmail: string) => {
    if (window.confirm(`Are you sure you want to delete access for ${userEmail}?`)) {
      await deleteCrmUserAccount(id);
      loadAccounts();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-[#F8F3F0] rounded-2xl max-w-2xl w-full max-h-[90vh] shadow-2xl border border-slate-300 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-black px-6 py-4 flex items-center justify-between text-white shrink-0 border-b border-black">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EA580C]/20 text-[#EA580C] flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Add User Account
              </h3>
              <p className="text-xs text-gray-300">
                Created by <strong>{currentUserEmail}</strong> • Staff credentials &amp; permissions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-gray-900">
          {/* Notifications */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-[#FFEDD5] border border-[#EA580C]/30 text-black font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#EA580C] shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-1">
                <label className="font-bold text-gray-900 uppercase tracking-wider block text-[11px]">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-xs focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="font-bold text-gray-900 uppercase tracking-wider block text-[11px]">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. ramesh@tecstellar.com"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-xs focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Password */}
              <div className="space-y-1">
                <label className="font-bold text-gray-900 uppercase tracking-wider block text-[11px]">
                  Login Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full pl-9 pr-9 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-xs focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* CRM Role */}
              <div className="space-y-1">
                <label className="font-bold text-gray-900 uppercase tracking-wider block text-[11px]">
                  CRM Role *
                </label>
                <select
                  value={crmRole}
                  onChange={(e) => setCrmRole(e.target.value as 'admin' | 'staff')}
                  className="w-full p-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-xs focus:outline-none focus:border-[#EA580C] cursor-pointer"
                >
                  <option value="staff">Staff (Operational)</option>
                  <option value="admin">Admin (Manager)</option>
                </select>
              </div>

              {/* Access Limits Dropdown */}
              <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                <label className="font-bold text-gray-900 uppercase tracking-wider block text-[11px]">
                  Access Limits *
                </label>
                <select
                  value={accessType}
                  onChange={(e) => setAccessType(e.target.value as 'full' | 'strict')}
                  className="w-full p-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-xs focus:outline-none focus:border-[#EA580C] cursor-pointer"
                >
                  <option value="full">Full Role Access (All Pages)</option>
                  <option value="strict">Strict Access Limits (Selected Only)</option>
                </select>
              </div>
            </div>

            {/* Strict Access Limits: Module Checkbox Matrix */}
            {accessType === 'strict' && (
              <div className="rounded-xl border border-gray-300 bg-white p-4 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <div>
                    <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-[#EA580C]" />
                      <span>Select Permitted Sidebar Modules</span>
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      Tick only the specific modules this user is allowed to access
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllModules}
                      className="px-2 py-1 rounded bg-[#FFEDD5] hover:bg-[#EA580C]/20 text-black font-bold text-[10px] cursor-pointer border border-[#EA580C]/30"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllModules}
                      className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-[10px] cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                  {ALL_AVAILABLE_MODULES.map((mod) => {
                    const isChecked = selectedModules.includes(mod.id);
                    return (
                      <label
                        key={mod.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer select-none transition-colors ${
                          isChecked
                            ? 'bg-[#FFEDD5] border-[#EA580C] text-black font-bold'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleModule(mod.id)}
                          className="w-3.5 h-3.5 rounded text-[#EA580C] accent-[#EA580C] cursor-pointer"
                        />
                        <span className="text-[11px] leading-tight truncate" title={mod.label}>
                          {mod.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Submit button */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving ? (
                  <span>Saving to Database...</span>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Create User Account</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Existing User Accounts List */}
          <div className="pt-4 border-t border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#EA580C]" />
                <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                  Active Staff &amp; Admin Accounts ({accounts.length})
                </h4>
              </div>
              <span className="text-[10px] text-gray-500">
                Master: {currentUserEmail}
              </span>
            </div>

            {loading ? (
              <div className="py-4 text-center text-gray-400">Loading accounts...</div>
            ) : accounts.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-gray-300 bg-white/50 text-center text-gray-500">
                No extra staff accounts created yet. Use the form above to add your team members.
              </div>
            ) : (
              <div className="space-y-2">
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-3 rounded-xl border border-gray-200 bg-white flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 text-xs">{acc.name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-black text-white">
                          {acc.crm_role}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            acc.access_type === 'full'
                              ? 'bg-[#EA580C] text-white'
                              : 'bg-black text-white'
                          }`}
                        >
                          {acc.access_type === 'full' ? 'Full Access' : `${acc.allowed_modules.length} Modules`}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 font-mono truncate">{acc.email}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(acc.id, acc.email)}
                      className="p-1.5 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                      title="Remove access"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
