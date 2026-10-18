'use client';

import React, { useState } from 'react';
import { Shop } from '../../types/database';
import { Radio, Bell, BellRing, Send, Sparkles, Clock, CheckCircle2, AlertCircle, Filter, Calendar, Users, Store } from 'lucide-react';

interface BroadcastNotificationsViewProps {
  type: 'broadcast' | 'scheduled' | 'push';
  shops: Shop[];
  onShowToast: (msg: string) => void;
}

interface NotificationItem {
  id: string;
  type: 'broadcast' | 'scheduled' | 'push';
  title: string;
  message: string;
  target: 'all' | 'free' | 'pro' | 'specific';
  targetShopName?: string;
  status: 'sent' | 'scheduled' | 'delivered';
  scheduledFor?: string;
  sentAt: string;
  recipientsCount: number;
}

export function BroadcastNotificationsView({
  type,
  shops,
  onShowToast,
}: BroadcastNotificationsViewProps) {
  const [activeTab, setActiveTab] = useState<'broadcast' | 'scheduled' | 'push'>(type);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<'all' | 'free' | 'pro' | 'specific'>('all');
  const [selectedShopId, setSelectedShopId] = useState<string>(shops[0]?.id || '');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high'>('high');

  const [history, setHistory] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      type: 'broadcast',
      title: 'CounterPro 365 Cloud Engine v2.4 Live',
      message: 'Thermal printer auto-reconnect and instant WhatsApp receipt sharing are now live for all shops.',
      target: 'all',
      status: 'delivered',
      sentAt: '2026-10-09 10:30 AM',
      recipientsCount: Math.max(shops.length, 1),
    },
    {
      id: 'notif-2',
      type: 'scheduled',
      title: 'Monthly Sales Limit Advisory',
      message: 'Reminder: Free Plan accounts nearing 100 sales limit will receive upgrade guidance prompt.',
      target: 'free',
      status: 'scheduled',
      scheduledFor: '2026-10-15 09:00 AM',
      sentAt: 'Scheduled',
      recipientsCount: Math.max(shops.length, 1),
    },
  ]);

  const handleSendOrSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      onShowToast('Please provide both notification title and message.');
      return;
    }

    const selectedShop = shops.find((s) => s.id === selectedShopId);
    const newItem: NotificationItem = {
      id: `notif-${Date.now()}`,
      type: activeTab,
      title: title.trim(),
      message: message.trim(),
      target,
      targetShopName: target === 'specific' ? selectedShop?.name : undefined,
      status: activeTab === 'scheduled' ? 'scheduled' : 'delivered',
      scheduledFor: activeTab === 'scheduled' ? `${scheduleDate} ${scheduleTime}` : undefined,
      sentAt: activeTab === 'scheduled' ? 'Scheduled' : 'Just now',
      recipientsCount: target === 'specific' ? 1 : Math.max(shops.length, 1),
    };

    setHistory([newItem, ...history]);
    setTitle('');
    setMessage('');
    setScheduleDate('');
    setScheduleTime('');
    onShowToast(
      activeTab === 'scheduled'
        ? 'Scheduled push queued successfully!'
        : 'Broadcast notification sent to live POS devices!'
    );
  };

  return (
    <div className="flex flex-col gap-[20px]">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl shadow-xs p-5 border border-[var(--color-divider)] flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D4621A] animate-pulse" />
            <h2 className="text-lg font-bold text-[#101318] m-0">
              Merchant Engagement & Push Dispatch Console
            </h2>
          </div>
          <p className="text-xs text-gray-500 m-0 mt-1">
            Dispatch instant system alerts, broadcasts, and automated billing notifications directly to Counter Pro POS devices.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-[#F3F4F6] p-1 rounded-lg border border-gray-200">
          <button
            onClick={() => setActiveTab('broadcast')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'broadcast'
                ? 'bg-white text-[#D4621A] shadow-xs'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Broadcasts</span>
          </button>
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'scheduled'
                ? 'bg-white text-[#D4621A] shadow-xs'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Scheduled Pushes</span>
          </button>
          <button
            onClick={() => setActiveTab('push')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'push'
                ? 'bg-white text-[#D4621A] shadow-xs'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Push Notifications</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Composer Form */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-xs border border-[var(--color-divider)] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
                {activeTab === 'broadcast'
                  ? 'Compose Broadcast'
                  : activeTab === 'scheduled'
                  ? 'Configure Scheduled Push'
                  : 'Instant Push Dispatch'}
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F8F3F0] text-[#D4621A] border border-[#FED7AA]">
                Live Dispatch
              </span>
            </div>

            <form onSubmit={handleSendOrSchedule} className="space-y-3.5">
              <div>
                <label className="block text-[11.5px] font-semibold text-gray-700 mb-1">
                  Notification Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Critical Firmware Update Available"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-gray-200 focus:border-[#D4621A] focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-gray-700 mb-1">
                  Message Content
                </label>
                <textarea
                  rows={4}
                  placeholder="Type the message that will pop up on cashier POS terminals..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-gray-200 focus:border-[#D4621A] focus:outline-hidden resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-gray-700 mb-1">
                  Target Audience
                </label>
                <select
                  value={target}
                  onChange={(e: any) => setTarget(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-gray-200 focus:border-[#D4621A] focus:outline-hidden bg-white"
                >
                  <option value="all">All Merchant Shops ({shops.length})</option>
                  <option value="free">Free Tier Shops (100 Sales Limit)</option>
                  <option value="pro">Pro Plan Subscribed Shops</option>
                  <option value="specific">Specific Shop...</option>
                </select>
              </div>

              {target === 'specific' && (
                <div>
                  <label className="block text-[11.5px] font-semibold text-gray-700 mb-1">
                    Select Target Shop
                  </label>
                  <select
                    value={selectedShopId}
                    onChange={(e) => setSelectedShopId(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-200 focus:border-[#D4621A] focus:outline-hidden bg-white"
                  >
                    {shops.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.city})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {activeTab === 'scheduled' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-gray-200 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-gray-200 bg-white"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11.5px] font-semibold text-gray-700 mb-1">
                  Delivery Priority
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPriority('high')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                      priority === 'high'
                        ? 'border-[#D4621A] bg-[#F8F3F0] text-[#D4621A]'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    High (Popup Alert)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority('normal')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                      priority === 'normal'
                        ? 'border-[#D4621A] bg-[#F8F3F0] text-[#D4621A]'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    Standard (Silent)
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 px-4 bg-[#D4621A] hover:bg-[#EA580C] text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {activeTab === 'scheduled' ? 'Schedule Push' : 'Send Push Broadcast Now'}
                </span>
              </button>
            </form>
          </div>
        </div>

        {/* History / Dispatch Ledger */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-xs border border-[var(--color-divider)] p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Dispatch & Delivery Audit Log
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">
                Real-time delivery status across POS counter devices
              </div>
            </div>
            <span className="text-xs text-gray-500 font-medium">
              {history.length} records
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[500px]">
            {history.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">
                No notification dispatches recorded yet.
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-gray-100 bg-[#FAFAFB] hover:border-orange-200 hover:bg-[#F8F3F0]/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#F8F3F0] text-[#D4621A] flex items-center justify-center shrink-0 border border-[#FED7AA]">
                        {item.type === 'broadcast' ? (
                          <Radio className="w-4 h-4" />
                        ) : item.type === 'scheduled' ? (
                          <Clock className="w-4 h-4" />
                        ) : (
                          <Bell className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-900">{item.title}</div>
                        <div className="text-[11.5px] text-gray-600 mt-0.5 line-clamp-2">
                          {item.message}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'delivered'
                            ? 'bg-[#F8F3F0] text-[#D4621A] border border-[#D4621A]/25'
                            : 'bg-[#F8F3F0] text-[#D4621A] border border-blue-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span className="uppercase">{item.status}</span>
                      </span>
                      <div className="text-[10px] text-gray-400 font-mono mt-1">
                        {item.scheduledFor || item.sentAt}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[10.5px] text-gray-500">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-gray-400" />
                        <span>
                          Target:{' '}
                          <strong className="text-gray-700 uppercase">
                            {item.target === 'specific'
                              ? item.targetShopName || 'Single Shop'
                              : item.target}
                          </strong>
                        </span>
                      </span>
                      <span>&bull;</span>
                      <span>{item.recipientsCount} Active Terminals</span>
                    </div>
                    <span className="font-mono text-gray-400">ID: {item.id}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
