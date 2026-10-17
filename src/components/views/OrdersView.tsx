'use client';

import React from 'react';
import { Shop, Bill, BillItem, MenuItem, MenuCategory } from '../../types/database';
import { formatINR, formatLakhs, timeAgo } from '../../lib/adminData';

interface OrdersViewProps {
  shops: Shop[];
  bills: Bill[];
  billItems: BillItem[];
  menuItems: MenuItem[];
  menuCategories: MenuCategory[];
  period: string;
  onOpenShopDrawer: (shop: Shop) => void;
}

export function OrdersView({
  shops,
  bills,
  billItems,
  menuItems,
  menuCategories,
  period,
  onOpenShopDrawer,
}: OrdersViewProps) {
  const completedBills = bills.filter((b) => b.status === 'completed');
  const gmvTotal = completedBills.reduce((acc, b) => acc + Number(b.total_amount || 0), 0);
  const ordersCount = completedBills.length;
  const avgBill = ordersCount > 0 ? Math.round(gmvTotal / ordersCount) : 0;

  // Payment mode split
  let cashGmv = 0;
  let upiGmv = 0;
  let pendingGmv = 0;

  bills.forEach((b) => {
    const amt = Number(b.total_amount || 0);
    const mode = (b.payment_mode || '').toLowerCase();
    const pend = Number(b.pending_amount || 0);

    if (pend > 0) {
      pendingGmv += pend;
    }
    if (mode.includes('cash')) {
      cashGmv += amt - pend;
    } else if (mode.includes('gpay') || mode.includes('upi') || mode.includes('online')) {
      upiGmv += amt - pend;
    } else {
      cashGmv += amt - pend;
    }
  });

  const totalSplitGmv = Math.max(cashGmv + upiGmv + pendingGmv, 1);
  const cashPct = Math.round((cashGmv / totalSplitGmv) * 100);
  const upiPct = Math.round((upiGmv / totalSplitGmv) * 100);
  const pendingPct = Math.max(100 - cashPct - upiPct, 0);

  const pendingShopsCount = new Set(
    bills.filter((b) => Number(b.pending_amount || 0) > 0).map((b) => b.shop_id)
  ).size;

  // Catalog breakdown by shop type
  const typeMap: { [key: string]: { items: number; cats: Set<string>; gmv: number; bills: number } } = {};
  shops.forEach((s) => {
    const t = s.shop_type || 'Other';
    if (!typeMap[t]) {
      typeMap[t] = { items: 0, cats: new Set(), gmv: 0, bills: 0 };
    }
  });

  menuItems.forEach((item) => {
    const shop = shops.find((s) => s.id === item.shop_id);
    const t = shop?.shop_type || 'Other';
    if (typeMap[t]) {
      typeMap[t].items += 1;
      if (item.category_id) typeMap[t].cats.add(item.category_id);
    }
  });

  completedBills.forEach((b) => {
    const shop = shops.find((s) => s.id === b.shop_id);
    const t = shop?.shop_type || 'Other';
    if (typeMap[t]) {
      typeMap[t].gmv += Number(b.total_amount || 0);
      typeMap[t].bills += 1;
    }
  });

  const catalogRows = Object.entries(typeMap).map(([type, data]) => ({
    type,
    items: data.items,
    cats: data.cats.size || 1,
    avg: data.bills > 0 ? Math.round(data.gmv / data.bills) : 0,
  }));

  // Recent Orders List (from bills, with joined items snapshot)
  const recentOrders = bills.slice(0, 15).map((b) => {
    const shop = shops.find((s) => s.id === b.shop_id);
    const items = billItems.filter((bi) => bi.bill_id === b.id);
    const itemSummary =
      items.length > 0
        ? items.map((bi) => `${bi.item_name} x${bi.quantity}`).join(', ')
        : b.customer_name
        ? `Customer: ${b.customer_name}`
        : 'Standard Order';

    const mode = (b.payment_mode || 'Cash').toUpperCase();

    return {
      id: b.id,
      billNumber: b.bill_number || `#${b.id.substring(0, 4)}`,
      shop,
      shopName: shop?.name || 'Counter365 Shop',
      items: itemSummary,
      mode,
      amount: Number(b.total_amount || 0),
      time: timeAgo(b.completed_at || b.created_at),
    };
  });

  return (
    <div className="flex flex-col gap-[18px]">
      {/* 4 Order KPIs */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-[14px]">
        <div className="bg-white rounded-[8px] shadow-sm p-[14px_16px] flex flex-col gap-1 border border-[var(--color-divider)]">
          <div className="card-kicker">ORDERS — {period.toUpperCase()}</div>
          <div className="font-heading text-[30px] font-bold leading-none text-[#101318]">
            {ordersCount.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-black/50">
            across {shops.length} active shops
          </div>
        </div>

        <div className="bg-white rounded-[8px] shadow-sm p-[14px_16px] flex flex-col gap-1 border border-[var(--color-divider)]">
          <div className="card-kicker">AVERAGE BILL</div>
          <div className="font-heading text-[30px] font-bold leading-none text-[#101318]">
            {formatINR(avgBill)}
          </div>
          <div className="text-[11px] text-black/50">
            platform-wide
          </div>
        </div>

        <div className="bg-white rounded-[8px] shadow-sm p-[14px_16px] flex flex-col gap-1 border border-[var(--color-divider)]">
          <div className="card-kicker">ITEMS IN CATALOGS</div>
          <div className="font-heading text-[30px] font-bold leading-none text-[#101318]">
            {menuItems.length}
          </div>
          <div className="text-[11px] text-black/50">
            avg {Math.round(menuItems.length / Math.max(shops.length, 1))} per shop
          </div>
        </div>

        <div className="bg-white rounded-[8px] shadow-sm p-[14px_16px] flex flex-col gap-1 border border-[var(--color-divider)]">
          <div className="card-kicker">GMV — {period.toUpperCase()}</div>
          <div className="font-heading text-[30px] font-bold leading-none text-[#D4621A]">
            {formatLakhs(gmvTotal)}
          </div>
          <div className="text-[11px] text-black/50">
            total gross merchandise value
          </div>
        </div>
      </div>

      {/* Payment Mode Split & Catalog Distribution */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(330px,1fr))] gap-[18px] items-start">
        {/* Payment mode split */}
        <div className="bg-white rounded-[8px] shadow-sm p-[18px] border border-[var(--color-divider)]">
          <h3 className="m-0 mb-3 text-[15px] font-bold text-[#101318]">
            Payment mode split — all orders
          </h3>

          {/* Segmented Progress Bar */}
          <div className="flex h-[22px] rounded-[3px] overflow-hidden bg-gray-100">
            <div style={{ width: `${cashPct}%` }} className="bg-[#101318]" title={`Cash: ${cashPct}%`} />
            <div style={{ width: `${upiPct}%` }} className="bg-[#D4621A]" title={`UPI/GPay: ${upiPct}%`} />
            <div style={{ width: `${pendingPct}%` }} className="bg-[#FDBA74]" title={`Pending: ${pendingPct}%`} />
          </div>

          <div className="flex flex-col gap-2 mt-3.5">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#101318] flex-none" />
              <span className="text-[13px] font-medium flex-1">Cash</span>
              <span className="text-[11px] text-black/50">{cashPct}%</span>
              <span className="font-heading text-[13px] font-bold w-20 text-right">
                {formatINR(cashGmv)}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4621A] flex-none" />
              <span className="text-[13px] font-medium flex-1">GPay / UPI</span>
              <span className="text-[11px] text-black/50">{upiPct}%</span>
              <span className="font-heading text-[13px] font-bold w-20 text-right">
                {formatINR(upiGmv)}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FDBA74] flex-none" />
              <span className="text-[13px] font-medium flex-1">Payment pending</span>
              <span className="text-[11px] text-black/50">{pendingPct}%</span>
              <span className="font-heading text-[13px] font-bold w-20 text-right">
                {formatINR(pendingGmv)}
              </span>
            </div>
          </div>

          {/* Pending Outstanding Banner */}
          <div className="border-t border-[var(--color-divider)] mt-3.5 pt-3 flex items-baseline">
            <div>
              <div className="font-heading text-[12px] font-bold tracking-wider uppercase text-[#101318]">
                PENDING OUTSTANDING
              </div>
              <div className="text-[11px] text-black/50">
                across {pendingShopsCount} shops
              </div>
            </div>
            <div className="ml-auto font-heading text-[24px] font-bold text-[#D4621A]">
              {formatINR(pendingGmv)}
            </div>
          </div>
        </div>

        {/* Catalog Across Platform */}
        <div className="bg-white rounded-[8px] shadow-sm p-[18px] border border-[var(--color-divider)]">
          <h3 className="m-0 mb-3 text-[15px] font-bold text-[#101318]">
            Catalog across the platform
          </h3>

          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Shop type</th>
                  <th className="text-right">Items</th>
                  <th className="text-right">Categories</th>
                  <th className="text-right">Avg bill</th>
                </tr>
              </thead>
              <tbody>
                {catalogRows.map((c) => (
                  <tr key={c.type}>
                    <td className="font-medium text-[#101318]">{c.type}</td>
                    <td className="text-right font-heading font-semibold text-[#101318]">
                      {c.items}
                    </td>
                    <td className="text-right text-black/50 text-[12px]">
                      {c.cats} {c.cats === 1 ? 'cat' : 'cats'}
                    </td>
                    <td className="text-right font-heading font-semibold text-[#101318]">
                      {formatINR(c.avg)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-[11px] text-black/50 mt-3 italic">
            Tea shops keep smaller fast-moving menus; restaurants feature extended menus with higher average bill value.
          </div>
        </div>
      </div>

      {/* Live Recent Orders Table */}
      <div className="bg-white rounded-[8px] shadow-sm p-[18px] border border-[var(--color-divider)]">
        <div className="flex items-baseline">
          <h3 className="m-0 text-[15px] font-bold text-[#101318]">
            Recent orders
          </h3>
          <span className="text-[11px] text-black/50 ml-auto">
            newest first — sampled live from Supabase
          </span>
        </div>

        <div className="overflow-x-auto mt-2.5">
          <table className="table">
            <thead>
              <tr>
                <th>Bill #</th>
                <th>Shop</th>
                <th>Items Snapshot</th>
                <th>Payment Mode</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Time</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-black/40 py-8">
                    No orders recorded yet.
                  </td>
                </tr>
              ) : (
                recentOrders.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => r.shop && onOpenShopDrawer(r.shop)}
                    className={r.shop ? 'cursor-pointer hover:bg-[#F8F3F0]/50 transition-colors' : ''}
                  >
                    <td className="font-heading font-bold text-[13.5px] text-[#101318]">
                      {r.billNumber}
                    </td>
                    <td className="font-medium text-[#101318]">{r.shopName}</td>
                    <td className="text-black/60 text-[12px] max-w-[260px] truncate">
                      {r.items}
                    </td>
                    <td>
                      <span
                        className={`tag ${
                          r.mode === 'PENDING'
                            ? 'bg-[#F8F3F0] text-[#C2410C] border border-[#FED7AA]'
                            : r.mode === 'CASH'
                            ? 'bg-[#101318] text-white'
                            : 'bg-[#F8F3F0] text-[#D4621A] border border-[#FED7AA]'
                        }`}
                      >
                        {r.mode}
                      </span>
                    </td>
                    <td className="text-right font-heading font-semibold text-[#101318]">
                      {formatINR(r.amount)}
                    </td>
                    <td className="text-right text-black/50 text-[12px]">
                      {r.time}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
