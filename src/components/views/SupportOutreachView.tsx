'use client';

import React, { useState } from 'react';
import { Shop, Subscription } from '../../types/database';
import {
  MessageSquare,
  Phone,
  Send,
  Sparkles,
  Search,
  Store,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Copy
} from 'lucide-react';

interface SupportOutreachViewProps {
  shops: Shop[];
  subscriptions: Subscription[];
  onShowToast: (msg: string) => void;
}

export function SupportOutreachView({
  shops,
  subscriptions,
  onShowToast,
}: SupportOutreachViewProps) {
  const [search, setSearch] = useState('');
  const [selectedShop, setSelectedShop] = useState<Shop | null>(shops[0] || null);
  const [templateType, setTemplateType] = useState<'welcome' | 'quota' | 'printer' | 'tips'>('welcome');
  const [customText, setCustomText] = useState('');

  const templates = {
    welcome: (shopName: string) =>
      `Hello ${shopName}! Welcome to CounterPro 365. We are here to support your retail counter operations. Let us know if you need any assistance setting up your product menu catalog or pairing your thermal bill printer.`,
    quota: (shopName: string) =>
      `Hello ${shopName}! This is CounterPro Admin. Your store is currently on the Free Tier with a 100 sales limit. To ensure uninterrupted checkout and unlock multi-staff access for your team, you can upgrade to CounterPro Pro at any time.`,
    printer: (shopName: string) =>
      `Hello ${shopName}! Regarding your 58mm / 80mm ESC/POS thermal printer setup with CounterPro: Our engineering support team can help you pair Bluetooth or USB printers for instant receipt printing.`,
    tips: (shopName: string) =>
      `Hello ${shopName}! Operational Tip from CounterPro: You can track daily expense records, udhaar (credit), and customer payment modes directly from your billing counter to streamline daily closing.`,
  };

  const currentMessage = customText || (selectedShop ? templates[templateType](selectedShop.name) : '');

  const handleSendWhatsApp = () => {
    if (!selectedShop) return;
    const cleanPhone = selectedShop.phone?.replace(/[^0-9]/g, '') || '';
    if (!cleanPhone) {
      onShowToast('Selected store does not have a valid phone number recorded.');
      return;
    }
    const encoded = encodeURIComponent(currentMessage);
    window.open(`https://wa.me/91${cleanPhone}?text=${encoded}`, '_blank');
    onShowToast(`Opened WhatsApp chat for ${selectedShop.name}`);
  };

  const handleDirectCall = () => {
    if (!selectedShop) return;
    const cleanPhone = selectedShop.phone?.replace(/[^0-9]/g, '') || '';
    if (!cleanPhone) {
      onShowToast('Selected store does not have a valid phone number recorded.');
      return;
    }
    window.location.href = `tel:+91${cleanPhone}`;
    onShowToast(`Calling +91 ${cleanPhone}`);
  };

  const handleCopyMessage = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentMessage);
      onShowToast('Message copied to clipboard');
    }
  };

  const filteredShops = shops.filter((s) => {
    const q = search.trim().toLowerCase();
    return !q || s.name.toLowerCase().includes(q) || (s.phone || '').includes(q) || (s.city || '').toLowerCase().includes(q);
  });

  const reachableCount = shops.filter((s) => s.phone && s.phone.replace(/[^0-9]/g, '').length >= 10).length;

  return (
    <div className="flex flex-col gap-[20px]">
      {/* Hero Banner */}
      <div className="bg-white rounded-xl shadow-xs p-5 border border-gray-200/80 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D4621A] animate-pulse" />
            <h2 className="text-[17px] font-bold text-[#101318] m-0">
              Customer Support & WhatsApp Outreach Center
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F8F3F0] text-[#D4621A] border border-[#D4621A]/25 font-semibold">
              Live Gateway Active
            </span>
          </div>
          <p className="text-xs text-gray-500 m-0 mt-1">
            Direct merchant engagement, proactive onboarding assistance, printer setup, and 100-sales quota alerts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">
            {reachableCount} of {shops.length} merchants reachable via WhatsApp
          </span>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">TOTAL MERCHANTS</div>
            <div className="mt-2 text-2xl font-bold font-heading text-[#101318]">
              {shops.length}
            </div>
          </div>
          <div className="mt-2 text-[11px] text-gray-500">Registered store owners</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">VERIFIED MOBILE NUMBERS</div>
            <div className="mt-2 text-2xl font-bold font-heading text-[#D4621A]">
              {reachableCount}
            </div>
          </div>
          <div className="mt-2 text-[11px] text-[#D4621A] font-medium">Direct WhatsApp enabled</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">FREE TIER (100 LIMIT)</div>
            <div className="mt-2 text-2xl font-bold font-heading text-[#D4621A]">
              {shops.length}
            </div>
          </div>
          <div className="mt-2 text-[11px] text-amber-700 font-medium">100 free sales allowance</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">PRESET TEMPLATES</div>
            <div className="mt-2 text-2xl font-bold font-heading text-[#101318]">
              4 Templates
            </div>
          </div>
          <div className="mt-2 text-[11px] text-gray-500">One-click customer messaging</div>
        </div>
      </div>

      {/* Main Dual-Column Workspace */}
      <div className="grid lg:grid-cols-12 gap-5">
        {/* Left Column: Shop Directory (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl shadow-xs p-5 border border-gray-200/80 flex flex-col h-[640px]">
          <div className="relative mb-3.5">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search store by name, phone, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-gray-200 bg-[#FAFAFB] focus:bg-white focus:border-[#D4621A] outline-none shadow-xs"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400 font-bold mb-2.5 uppercase tracking-wider">
            <span>Store Directory</span>
            <span>{filteredShops.length} Stores</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredShops.map((shop) => {
              const isSelected = selectedShop?.id === shop.id;
              const sub = subscriptions.find((s) => s.shop_id === shop.id);
              return (
                <div
                  key={shop.id}
                  onClick={() => {
                    setSelectedShop(shop);
                    setCustomText('');
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-[#D4621A] bg-orange-50/50 shadow-xs'
                      : 'border-gray-200/80 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-[#101318] truncate">
                      {shop.name}
                    </div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                      <span>{shop.city || 'India'}</span>
                      <span>&bull;</span>
                      <span className="font-mono text-gray-700">+91 {shop.phone}</span>
                    </div>
                  </div>

                  <span
                    className={`text-[9.5px] px-2 py-0.5 rounded font-bold uppercase shrink-0 ${
                      sub?.plan === 'pro'
                        ? 'bg-[#F8F3F0] text-[#D4621A] border border-[#D4621A]/25'
                        : 'bg-orange-50 text-[#D4621A] border border-orange-200'
                    }`}
                  >
                    {sub?.plan || 'FREE 100'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Message Composer & Quick Trigger (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl shadow-xs p-6 border border-gray-200/80 flex flex-col justify-between h-[640px]">
          {selectedShop ? (
            <div className="flex flex-col h-full">
              {/* Selected Shop Header */}
              <div className="pb-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#D4621A]">
                    Active Contact
                  </div>
                  <h3 className="text-base font-bold text-[#101318] m-0">
                    {selectedShop.name}
                  </h3>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Phone: <span className="font-mono font-bold text-gray-800">+91 {selectedShop.phone}</span> &bull; Location: {selectedShop.city || 'India'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDirectCall}
                    className="btn btn-secondary text-xs min-h-[34px] px-3 gap-1.5 text-[#D4621A] border-blue-200 hover:bg-[#F8F3F0]"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#D4621A]" />
                    <span>Call Store</span>
                  </button>
                  <button
                    onClick={handleCopyMessage}
                    className="btn btn-secondary text-xs min-h-[34px] px-3 gap-1.5 border-gray-200"
                    title="Copy message to clipboard"
                  >
                    <Copy className="w-3.5 h-3.5 text-gray-500" />
                    <span>Copy</span>
                  </button>
                </div>
              </div>

              {/* Template Selectors */}
              <div className="my-3.5">
                <div className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#D4621A]" />
                  <span>Choose Communication Template:</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'welcome', label: 'Welcome Onboard', icon: Store },
                    { id: 'quota', label: '100-Quota Alert', icon: AlertTriangle },
                    { id: 'printer', label: 'Printer Setup', icon: Printer },
                    { id: 'tips', label: 'Daily Tips', icon: Sparkles },
                  ].map((tpl) => {
                    const Icon = tpl.icon;
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => {
                          setTemplateType(tpl.id as any);
                          setCustomText('');
                        }}
                        className={`text-xs p-2.5 rounded-lg border font-bold transition-all text-center flex flex-col items-center justify-center gap-1 cursor-pointer ${
                          templateType === tpl.id && !customText
                            ? 'bg-[#D4621A] text-white border-[#D4621A] shadow-xs'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-orange-50 hover:border-orange-200'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tpl.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message Composer Box */}
              <div className="flex-1 flex flex-col mb-4">
                <label className="text-xs font-semibold text-gray-700 mb-1.5">
                  Message Content Preview / Custom Draft:
                </label>
                <textarea
                  value={currentMessage}
                  onChange={(e) => setCustomText(e.target.value)}
                  rows={6}
                  className="w-full flex-1 p-3.5 text-xs rounded-lg border border-gray-200 bg-[#FAFAFB] focus:bg-white focus:border-[#D4621A] outline-none resize-none leading-relaxed text-gray-800 shadow-xs"
                  placeholder="Type a customized outreach message..."
                />
              </div>

              {/* Send Button */}
              <button
                onClick={handleSendWhatsApp}
                className="w-full btn text-xs min-h-[44px] gap-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold rounded-lg shadow-sm border-none cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Open WhatsApp Chat & Send Message</span>
              </button>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-xs">
              Select a store from the directory to compose an outreach message.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
