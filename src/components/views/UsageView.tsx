'use client';

import React from 'react';
import { Shop, Bill, Profile, ShopMember, MenuItem, Expense } from '../../types/database';
import { timeAgo, formatINR } from '../../lib/adminData';

interface UsageViewProps {
  shops: Shop[];
  bills: Bill[];
  profiles: Profile[];
  shopMembers: ShopMember[];
  menuItems: MenuItem[];
  expenses: Expense[];
  period: string;
  onOpenShopDrawer: (shop: Shop) => void;
}

export function UsageView({
  shops,
  bills,
  profiles,
  shopMembers,
  menuItems,
  expenses,
  period,
  onOpenShopDrawer,
}: UsageViewProps) {
  const activeShops = shops.filter((s) => s.is_active);
  const totalCompletedBills = bills.filter((b) => b.status === 'completed').length;
  const billsPerActiveShop = activeShops.length > 0 ? Math.round(totalCompletedBills / activeShops.length) : 0;
  const totalUsers = Math.max(profiles.length, shops.length);

  // Real feature adoption calculation across shops
  const totalShopCount = Math.max(shops.length, 1);
  const shopsWithExpenses = new Set(expenses.map((e) => e.shop_id)).size;
  const shopsWithPending = new Set(
    bills.filter((b) => Number(b.pending_amount || 0) > 0).map((b) => b.shop_id)
  ).size;
  const shopsWithGst = shops.filter((s) => s.gst_enabled).length;
  const shopsWithMenu = new Set(menuItems.map((m) => m.shop_id)).size;
  const shopsWithMultiUsers = new Set(
    Object.entries(
      shopMembers.reduce<{ [key: string]: number }>((acc, m) => {
        acc[m.shop_id] = (acc[m.shop_id] || 0) + 1;
        return acc;
      }, {})
    )
      .filter(([_, count]) => count > 1)
      .map(([shopId]) => shopId)
  ).size;
  const shopsWithPrinter = shops.filter((s) => s.printer_enabled).length;

  const adoptionFeatures = [
    { name: 'Billing (Core POS)', pct: 100, color: '#101318' },
    { name: 'Menu & Category Editing', pct: Math.round((shopsWithMenu / totalShopCount) * 100), color: '#D4621A' },
    { name: 'Pending Balance Tracking', pct: Math.round((shopsWithPending / totalShopCount) * 100), color: '#D4621A' },
    { name: 'Expense Logging', pct: Math.round((shopsWithExpenses / totalShopCount) * 100), color: '#D4621A' },
    { name: 'GST Tax Invoicing', pct: Math.round((shopsWithGst / totalShopCount) * 100), color: '#FB923C' },
    { name: 'Multiple User Roles', pct: Math.round((shopsWithMultiUsers / totalShopCount) * 100), color: '#FB923C' },
    { name: 'Bluetooth Thermal Printer', pct: Math.round((shopsWithPrinter / totalShopCount) * 100), color: '#FDBA74' },
  ];

  // Real Billing Hours Distribution (6am to 10pm)
  const hourBuckets = [
    { label: '6a', hours: [5, 6, 7], count: 0 },
    { label: '8a', hours: [8, 9], count: 0 },
    { label: '10a', hours: [10, 11], count: 0 },
    { label: '12p', hours: [12, 13], count: 0 },
    { label: '2p', hours: [14, 15], count: 0 },
    { label: '4p', hours: [16, 17], count: 0 },
    { label: '6p', hours: [18, 19], count: 0 },
    { label: '8p', hours: [20, 21], count: 0 },
    { label: '10p', hours: [22, 23, 0], count: 0 },
  ];

  bills.forEach((b) => {
    const d = new Date(b.completed_at || b.created_at);
    // Convert to IST hour
    const istHour = (d.getUTCHours() + 5 + Math.floor((d.getUTCMinutes() + 30) / 60)) % 24;
    hourBuckets.forEach((bucket) => {
      if (bucket.hours.includes(istHour)) {
        bucket.count += 1;
      }
    });
  });

  const maxHourCount = Math.max(...hourBuckets.map((h) => h.count), 1);
  const hourBars = hourBuckets.map((h) => ({
    label: h.label,
    count: h.count,
    pct: Math.max(Math.round((h.count / maxHourCount) * 100), h.count > 0 ? 15 : 6),
  }));

  // Engagement by Shop Table
  const engagementRows = shops.map((s) => {
    const sBills = bills.filter((b) => b.shop_id === s.id);
    const sUsers = shopMembers.filter((m) => m.shop_id === s.id).length || 1;
    const sItems = menuItems.filter((m) => m.shop_id === s.id).length;
    const latestBill = sBills[0];
    const firstBill = sBills[sBills.length - 1];
    
    // Days active calculated from created_at
    const createdDate = new Date(s.created_at);
    const daysActive = Math.max(1, Math.floor((new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      shop: s,
      users: sUsers,
      billsCount: sBills.length,
      daysActive,
      itemsCount: sItems,
      lastSeen: latestBill?.completed_at || latestBill?.created_at || s.created_at,
    };
  });

  return (
    <div className="flex flex-col gap-[18px]">
      {/* 4 Usage KPIs */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-[14px]">
        <div className="bg-white rounded-[8px] shadow-sm p-[14px_16px] flex flex-col gap-1 border border-[var(--color-divider)]">
          <div className="card-kicker">DAILY ACTIVE SHOPS</div>
          <div className="font-heading text-[30px] font-bold leading-none text-[#101318]">
            {activeShops.length}
          </div>
          <div className="text-[11px] text-black/50">
            {Math.round((activeShops.length / totalShopCount) * 100)}% of registered
          </div>
        </div>

        <div className="bg-white rounded-[8px] shadow-sm p-[14px_16px] flex flex-col gap-1 border border-[var(--color-divider)]">
          <div className="card-kicker">BILLS PER SHOP / PERIOD</div>
          <div className="font-heading text-[30px] font-bold leading-none text-[#101318]">
            {billsPerActiveShop}
          </div>
          <div className="text-[11px] text-black/50">
            {totalCompletedBills} total orders taken
          </div>
        </div>

        <div className="bg-white rounded-[8px] shadow-sm p-[14px_16px] flex flex-col gap-1 border border-[var(--color-divider)]">
          <div className="card-kicker">USERS ON PLATFORM</div>
          <div className="font-heading text-[30px] font-bold leading-none text-[#101318]">
            {totalUsers}
          </div>
          <div className="text-[11px] text-black/50">
            owners, supervisors, billers
          </div>
        </div>

        <div className="bg-white rounded-[8px] shadow-sm p-[14px_16px] flex flex-col gap-1 border border-[var(--color-divider)]">
          <div className="card-kicker">REGISTERED CATALOG ITEMS</div>
          <div className="font-heading text-[30px] font-bold leading-none text-[#D4621A]">
            {menuItems.length}
          </div>
          <div className="text-[11px] text-black/50">
            across all shops
          </div>
        </div>
      </div>

      {/* Feature Adoption & Billing Hours */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(330px,1fr))] gap-[18px] items-start">
        {/* Feature Adoption */}
        <div className="bg-white rounded-[8px] shadow-sm p-[18px] border border-[var(--color-divider)]">
          <h3 className="m-0 mb-1 text-[15px] font-bold text-[#101318]">
            Feature adoption
          </h3>
          <div className="text-[11px] text-black/50 mb-3">
            Share of active shops utilizing each feature this {period.toLowerCase()}
          </div>

          <div className="flex flex-col gap-3">
            {adoptionFeatures.map((feat) => (
              <div key={feat.name}>
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] font-medium text-[#101318]">
                    {feat.name}
                  </span>
                  <span className="font-heading text-[13px] font-bold ml-auto text-[#101318]">
                    {feat.pct}%
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-[3px] overflow-hidden mt-1.5">
                  <div
                    style={{ width: `${feat.pct}%`, backgroundColor: feat.color }}
                    className="h-full rounded-[3px] transition-all duration-300"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Billing Hours Distribution */}
        <div className="bg-white rounded-[8px] shadow-sm p-[18px] border border-[var(--color-divider)]">
          <h3 className="m-0 mb-1 text-[15px] font-bold text-[#101318]">
            Billing hours across all shops
          </h3>
          <div className="text-[11px] text-black/50 mb-3.5">
            When bills are actually generated in IST — drives support staffing
          </div>

          <div className="flex items-end gap-1.5 h-[155px] pt-4 border-b border-[var(--color-divider)]">
            {hourBars.map((h) => {
              const isPeak = h.count === maxHourCount && h.count > 0;
              return (
                <div
                  key={h.label}
                  className="flex-1 h-full flex flex-col justify-end items-center gap-1.5 group relative"
                >
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-[#101318] text-white text-[10px] px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap z-20">
                    {h.count} bills
                  </div>
                  <div
                    style={{ height: `${h.pct}%` }}
                    className={`w-full rounded-t-[3px] transition-all duration-300 ${
                      isPeak
                        ? 'bg-[#101318]'
                        : h.count > 0
                        ? 'bg-[#D4621A]'
                        : 'bg-gray-100'
                    }`}
                  />
                  <div className="text-[10px] text-black/50 font-medium">
                    {h.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Engagement by Shop Table */}
      <div className="bg-white rounded-[8px] shadow-sm p-[18px] border border-[var(--color-divider)]">
        <div className="flex items-baseline">
          <h3 className="m-0 text-[15px] font-bold text-[#101318]">
            Engagement by shop
          </h3>
          <span className="text-[11px] text-black/50 ml-auto">
            activity & team metrics
          </span>
        </div>

        <div className="overflow-x-auto mt-2.5">
          <table className="table">
            <thead>
              <tr>
                <th>Shop</th>
                <th>Users</th>
                <th className="text-right">Total Bills</th>
                <th className="text-right">Days Registered</th>
                <th className="text-right">Catalog Items</th>
                <th className="text-right">Last Bill</th>
              </tr>
            </thead>
            <tbody>
              {engagementRows.map((r) => (
                <tr
                  key={r.shop.id}
                  onClick={() => onOpenShopDrawer(r.shop)}
                  className="cursor-pointer hover:bg-[#F8F3F0]/50 transition-colors"
                >
                  <td className="font-heading font-bold text-[#101318]">
                    {r.shop.name}
                  </td>
                  <td className="text-black/60 text-[12.5px]">
                    {r.users} {r.users === 1 ? 'user' : 'users'}
                  </td>
                  <td className="text-right font-heading font-semibold text-[#101318]">
                    {r.billsCount}
                  </td>
                  <td className="text-right text-black/60 text-[12px]">
                    {r.daysActive} days
                  </td>
                  <td className="text-right text-black/60 text-[12px]">
                    {r.itemsCount}
                  </td>
                  <td className="text-right text-black/60 text-[12px]">
                    {timeAgo(r.lastSeen)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
