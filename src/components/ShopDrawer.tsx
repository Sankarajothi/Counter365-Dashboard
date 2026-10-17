'use client';

import React from 'react';
import { X, Phone, MessageSquare, ExternalLink } from 'lucide-react';
import { Shop, Subscription, Bill, Profile, ShopMember, MenuItem, Expense } from '../types/database';
import { formatINR, formatLakhs, formatDate, timeAgo } from '../lib/adminData';

interface ShopDrawerProps {
  shop: Shop | null;
  subscription?: Subscription | null;
  bills: Bill[];
  members: ShopMember[];
  profiles: Profile[];
  menuItems: MenuItem[];
  expenses: Expense[];
  period: string;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export function ShopDrawer({
  shop,
  subscription,
  bills,
  members,
  profiles,
  menuItems,
  expenses,
  period,
  onClose,
  onShowToast,
}: ShopDrawerProps) {
  if (!shop) return null;

  const planName = subscription?.plan?.toUpperCase() || (shop.is_active ? 'TRIAL' : 'EXPIRED');
  const shopBills = bills.filter((b) => b.shop_id === shop.id);
  const completedBills = shopBills.filter((b) => b.status === 'completed');
  const shopGmv = completedBills.reduce((acc, b) => acc + Number(b.total_amount || 0), 0);
  const avgBill = completedBills.length > 0 ? Math.round(shopGmv / completedBills.length) : 0;
  const shopItems = menuItems.filter((i) => i.shop_id === shop.id);
  const shopExpenses = expenses.filter((e) => e.shop_id === shop.id);

  // Shop members & profiles
  const shopMembers = members.filter((m) => m.shop_id === shop.id);
  const userList = shopMembers.map((m) => {
    const p = profiles.find((prof) => prof.id === m.user_id);
    return {
      id: m.id,
      name: p?.full_name || 'Staff User',
      role: m.role?.toUpperCase() || 'MEMBER',
      phone: p?.phone || '',
      joined: m.joined_at || m.created_at,
    };
  });

  // If no explicit members in shop_members, fallback to shop's own phone / owner
  if (userList.length === 0) {
    userList.push({
      id: 'owner-default',
      name: shop.name + ' (Owner)',
      role: 'OWNER',
      phone: shop.phone || '',
      joined: shop.created_at,
    });
  }

  // Recent activity: combines bills & expenses
  const activityList = [
    ...shopBills.slice(0, 5).map((b) => ({
      at: timeAgo(b.completed_at || b.created_at),
      timestamp: new Date(b.completed_at || b.created_at).getTime(),
      msg: `Bill #${b.bill_number} completed — ${formatINR(Number(b.total_amount))} via ${b.payment_mode || 'Cash'}`,
    })),
    ...shopExpenses.slice(0, 3).map((e) => ({
      at: timeAgo(e.created_at),
      timestamp: new Date(e.created_at).getTime(),
      msg: `Expense recorded: ${e.description} (${formatINR(Number(e.amount))})`,
    })),
  ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 6);

  const cleanPhone = shop.phone?.replace(/[^0-9]/g, '') || '';

  const handleMessageOwner = () => {
    if (cleanPhone) {
      window.open(`https://wa.me/91${cleanPhone}?text=Hello%20${encodeURIComponent(shop.name)},%20regarding%20your%20Counter365%20account:`, '_blank');
      onShowToast(`Opened WhatsApp chat for ${shop.name}`);
    } else {
      onShowToast(`No phone number available for ${shop.name}`);
    }
  };

  const handleCallOwner = () => {
    if (cleanPhone) {
      window.location.href = `tel:+91${cleanPhone}`;
      onShowToast(`Calling +91 ${shop.phone}`);
    } else {
      onShowToast(`No phone number available for ${shop.name}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#101318]/50 flex justify-end z-50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="flex-1" onClick={onClose} />
      
      <div className="w-[min(480px,94vw)] bg-white h-full overflow-y-auto shadow-2xl flex flex-col border-l border-[var(--color-divider)]">
        {/* Drawer Header */}
        <div className="p-[20px] bg-[#101318] text-white flex items-start gap-3">
          <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center font-heading font-black text-[20px] flex-none text-[#D4621A]">
            {shop.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-heading text-[22px] font-bold leading-tight truncate text-white">
              {shop.name}
            </h2>
            <div className="text-[11px] text-white/70 mt-1 uppercase tracking-wider font-semibold">
              {shop.shop_type} — {shop.city} — {planName}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center border border-white/20 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="p-[20px_22px_32px] flex flex-col gap-6">
          {/* 100 Sales Limit Free Quota Box */}
          <div className="bg-[#F8F3F0] border border-[#FED7AA] rounded-[8px] p-3.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-[#C2410C] uppercase tracking-wide">
                100 Sales Limit Quota Tracker
              </span>
              <span className="tag text-[10px] font-bold bg-[#D4621A] text-white">
                {subscription?.plan?.toUpperCase() || 'FREE TIER'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-[#9A3412] font-medium mb-1.5">
              <span>{completedBills.length} / 100 sales completed</span>
              <span className="font-bold">{Math.max(0, 100 - completedBills.length)} remaining</span>
            </div>
            <div className="w-full h-2 rounded-full bg-orange-100 overflow-hidden">
              <div
                className="h-full bg-[#D4621A] rounded-full"
                style={{ width: `${Math.min(100, (completedBills.length / 100) * 100)}%` }}
              />
            </div>
            <div className="text-[10.5px] text-[#9A3412]/80 mt-1.5">
              Multi-user staff members and unlimited billing unlock upon upgrading to CounterPro Pro.
            </div>
          </div>

          {/* 4 KPIs Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#F8F3F0] rounded-[8px] p-3.5 border border-[var(--color-divider)]">
              <div className="card-kicker">GMV / {period.toUpperCase()}</div>
              <div className="font-heading text-[22px] font-bold text-[var(--color-text)] mt-1">
                {formatLakhs(shopGmv)}
              </div>
              <div className="text-[11px] text-black/50 mt-0.5">
                avg bill {formatINR(avgBill)}
              </div>
            </div>

            <div className="bg-[#F8F3F0] rounded-[8px] p-3.5 border border-[var(--color-divider)]">
              <div className="card-kicker">ORDERS / {period.toUpperCase()}</div>
              <div className="font-heading text-[22px] font-bold text-[var(--color-text)] mt-1">
                {completedBills.length}
              </div>
              <div className="text-[11px] text-black/50 mt-0.5">
                {shopBills.length} total bills
              </div>
            </div>

            <div className="bg-[#F8F3F0] rounded-[8px] p-3.5 border border-[var(--color-divider)]">
              <div className="card-kicker">CATALOG ITEMS</div>
              <div className="font-heading text-[22px] font-bold text-[var(--color-text)] mt-1">
                {shopItems.length}
              </div>
              <div className="text-[11px] text-black/50 mt-0.5">
                active in menu
              </div>
            </div>

            <div className="bg-[#F8F3F0] rounded-[8px] p-3.5 border border-[var(--color-divider)]">
              <div className="card-kicker">REGISTERED USERS</div>
              <div className="font-heading text-[22px] font-bold text-[var(--color-text)] mt-1">
                {userList.length}
              </div>
              <div className="text-[11px] text-black/50 mt-0.5">
                incl. owner & staff
              </div>
            </div>
          </div>

          {/* Registration Details */}
          <div>
            <h3 className="text-[13px] font-bold text-[var(--color-text)] uppercase tracking-wider mb-2 text-black/70">
              Registration & Config
            </h3>
            <div className="rounded-[8px] border border-[var(--color-divider)] overflow-hidden">
              <table className="w-full text-left text-[13px]">
                <tbody className="divide-y divide-[var(--color-divider)]">
                  <tr>
                    <td className="px-3 py-2 text-black/60 bg-gray-50/50 w-2/5">Shop Name</td>
                    <td className="px-3 py-2 font-medium text-right">{shop.name}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-black/60 bg-gray-50/50">Shop Type</td>
                    <td className="px-3 py-2 font-medium text-right">{shop.shop_type}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-black/60 bg-gray-50/50">City / State</td>
                    <td className="px-3 py-2 font-medium text-right">{shop.city}, {shop.state}</td>
                  </tr>
                  {shop.address && (
                    <tr>
                      <td className="px-3 py-2 text-black/60 bg-gray-50/50">Address</td>
                      <td className="px-3 py-2 text-right">{shop.address}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="px-3 py-2 text-black/60 bg-gray-50/50">Owner Phone</td>
                    <td className="px-3 py-2 font-mono font-medium text-right">+91 {shop.phone}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-black/60 bg-gray-50/50">GST Setup</td>
                    <td className="px-3 py-2 font-medium text-right">
                      {shop.gst_enabled ? `Enabled (${shop.gst_rate}%)` : 'Disabled'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-black/60 bg-gray-50/50">Thermal Printer</td>
                    <td className="px-3 py-2 text-right">
                      {shop.printer_enabled ? shop.printer_name || 'Enabled' : 'Disabled'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-black/60 bg-gray-50/50">Registered</td>
                    <td className="px-3 py-2 text-black/70 text-right">{formatDate(shop.created_at)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-black/60 bg-gray-50/50">Plan Status</td>
                    <td className="px-3 py-2 font-semibold text-right text-[#D4621A]">{planName}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-black/60 bg-gray-50/50">Last Active</td>
                    <td className="px-3 py-2 text-black/70 text-right">{timeAgo(shop.updated_at || shop.created_at)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Users on this shop */}
          <div>
            <h3 className="text-[13px] font-bold text-[var(--color-text)] uppercase tracking-wider mb-2 text-black/70">
              Users on this shop ({userList.length})
            </h3>
            <div className="flex flex-col gap-2">
              {userList.map((user) => {
                const isOwner = user.role === 'OWNER';
                return (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 bg-[#F8F3F0] rounded-[6px] p-2.5 border border-[var(--color-divider)]"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-medium text-[var(--color-text)] truncate">
                        {user.name}
                      </div>
                      <div className="text-[11px] text-black/50">
                        {user.phone ? `+91 ${user.phone}` : 'No phone specified'}
                      </div>
                    </div>
                    <span
                      className={`tag ${
                        isOwner
                          ? 'bg-[#101318] text-white'
                          : 'bg-[#F8F3F0] text-[#C2410C]'
                      }`}
                    >
                      {user.role}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent activity */}
          <div>
            <h3 className="text-[13px] font-bold text-[var(--color-text)] uppercase tracking-wider mb-2 text-black/70">
              Recent Activity
            </h3>
            {activityList.length === 0 ? (
              <div className="text-[12px] text-black/40 italic p-3 bg-gray-50 rounded-md">
                No recent activity logged for this shop yet.
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-divider)] border-t border-[var(--color-divider)]">
                {activityList.map((act, i) => (
                  <div key={i} className="flex gap-3 py-2.5 items-start">
                    <span className="text-[11px] text-black/50 w-[80px] flex-none font-mono">
                      {act.at}
                    </span>
                    <span className="text-[13px] text-[var(--color-text)] flex-1 leading-snug">
                      {act.msg}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-2 pt-3 border-t border-[var(--color-divider)]">
            <button
              onClick={handleMessageOwner}
              className="btn btn-secondary flex-1 min-h-[42px] gap-2 font-semibold"
            >
              <MessageSquare className="w-4 h-4 text-[#D4621A]" />
              WhatsApp Owner
            </button>
            <button
              onClick={handleCallOwner}
              className="btn btn-primary flex-1 min-h-[42px] gap-2 font-semibold"
            >
              <Phone className="w-4 h-4 text-white" />
              Call Owner
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
