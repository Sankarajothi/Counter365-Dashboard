'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Printer, Download, CheckCircle, Clock, Receipt, Store, Phone, MapPin, AlertCircle, ArrowLeft } from 'lucide-react';

interface BillItem {
  name: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface BillData {
  id: string;
  billNumber: string;
  createdAt: string;
  shopName: string;
  shopAddress?: string;
  shopCity?: string;
  shopPhone?: string;
  shopGst?: string;
  customerName?: string;
  customerPhone?: string;
  tableNumber?: string;
  paymentMode: string;
  subtotal: number;
  gstAmount: number;
  gstRate: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  items: BillItem[];
}

export default function BillViewerPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const [bill, setBill] = useState<BillData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const billParam = params?.id ? decodeURIComponent(params.id) : '';
  const fallbackPayload = (searchParams?.d || searchParams?.data || searchParams?.b) as string | undefined;

  useEffect(() => {
    async function loadBill() {
      setIsLoading(true);
      setErrorMsg(null);

      try {
        // 1. Try fetching authoritative bill from Supabase
        let query = supabase.from('bills').select('*');
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(billParam);

        if (isUuid) {
          query = query.eq('id', billParam);
        } else if (billParam) {
          const formattedNo = billParam.startsWith('#') ? billParam : `#${billParam}`;
          query = query.or(`bill_number.eq.${formattedNo},bill_number.eq.${billParam},id.eq.${billParam}`);
        }

        const { data: billRows, error: billErr } = await query.limit(1);

        if (billRows && billRows.length > 0) {
          const b = billRows[0];

          // Fetch items
          const { data: itemRows } = await supabase
            .from('bill_items')
            .select('*')
            .eq('bill_id', b.id);

          // Fetch shop
          let shopData: any = null;
          if (b.shop_id) {
            const { data: sData } = await supabase
              .from('shops')
              .select('*')
              .eq('id', b.shop_id)
              .maybeSingle();
            shopData = sData;
          }

          const parsedItems: BillItem[] = (itemRows || []).map((it: any) => ({
            name: it.item_name || 'Item',
            quantity: it.quantity || 1,
            rate: it.unit_price || 0,
            amount: it.line_total || (it.unit_price * it.quantity) || 0,
          }));

          setBill({
            id: b.id,
            billNumber: b.bill_number || '#0001',
            createdAt: b.completed_at || b.created_at || new Date().toISOString(),
            shopName: shopData?.name || 'Counter365 Merchant',
            shopAddress: shopData?.address || '',
            shopCity: shopData?.city || '',
            shopPhone: shopData?.phone || '',
            shopGst: shopData?.gst_number || '',
            customerName: b.customer_name || '',
            customerPhone: b.customer_phone || '',
            tableNumber: b.table_number || '',
            paymentMode: b.payment_mode || 'Cash',
            subtotal: b.subtotal || b.total_amount || 0,
            gstAmount: b.gst_amount || 0,
            gstRate: b.gst_rate || 0,
            totalAmount: b.total_amount || 0,
            paidAmount: b.paid_amount ?? b.total_amount,
            pendingAmount: b.pending_amount || 0,
            items: parsedItems,
          });
          setIsLoading(false);
          return;
        }

        // 2. Fallback: Parse compact payload if passed in URL
        if (fallbackPayload) {
          try {
            const jsonStr = decodeURIComponent(escape(atob(fallbackPayload)));
            const p = JSON.parse(jsonStr);

            const parsedItems: BillItem[] = (p.i || []).map((it: any) => ({
              name: it[0] || 'Item',
              quantity: it[1] || 1,
              rate: it[2] || 0,
              amount: it[3] || 0,
            }));

            setBill({
              id: billParam || 'bill-fallback',
              billNumber: p.n || billParam || '#0001',
              createdAt: p.d ? `${p.d} ${p.tm || ''}` : new Date().toISOString(),
              shopName: p.s || 'Counter365 Merchant',
              shopAddress: p.a || '',
              shopCity: p.ci || '',
              shopPhone: p.ph || '',
              shopGst: p.g || '',
              customerName: p.c || '',
              customerPhone: p.cp || '',
              tableNumber: p.tb || '',
              paymentMode: p.m || 'Paid',
              subtotal: p.sub || p.t || 0,
              gstAmount: p.gst || 0,
              gstRate: p.gr || 0,
              totalAmount: p.t || 0,
              paidAmount: p.p ?? p.t,
              pendingAmount: p.due || 0,
              items: parsedItems,
            });
            setIsLoading(false);
            return;
          } catch (decodeErr) {
            console.warn('Failed to parse fallback payload:', decodeErr);
          }
        }

        // Not found
        setErrorMsg('This bill is currently syncing or could not be found. Please check with the shop counter.');
      } catch (err: any) {
        console.error('Error loading bill:', err);
        setErrorMsg('An unexpected error occurred while loading this bill receipt.');
      } finally {
        setIsLoading(false);
      }
    }

    loadBill();
  }, [billParam, fallbackPayload]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const formatRupee = (amt: number) => {
    return '₹' + Number(amt || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <h2 className="text-lg font-bold text-slate-800">Loading Bill Receipt...</h2>
          <p className="text-sm text-slate-500">Fetching verified transaction details from Counter365.</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !bill) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center flex flex-col items-center gap-4">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Receipt Not Available</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            {errorMsg || 'The requested bill record is not available yet.'}
          </p>
          <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-500 w-full text-left space-y-1">
            <p><strong>Bill Reference:</strong> {billParam || 'N/A'}</p>
            <p><strong>Platform:</strong> Counter365 Point of Sale</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2.5 px-4 rounded-xl transition"
          >
            Retry Loading Receipt
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 sm:px-6 print:p-0 print:bg-white text-slate-900 font-sans">
      {/* Print stylesheet */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .receipt-paper {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            max-width: 100% !important;
            margin: 0 !important;
          }
          @page {
            size: auto;
            margin: 8mm;
          }
        }
      `}</style>

      {/* Top Action Bar (hidden on print) */}
      <div className="max-w-md mx-auto mb-4 flex items-center justify-between no-print">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-[#D4621A] rounded-full animate-pulse"></span>
          <span className="text-xs font-semibold text-slate-600 tracking-wide uppercase">
            Counter365 Digital Receipt
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-[#D4621A] hover:bg-[#bf5312] text-white text-xs font-bold py-2 px-3.5 rounded-xl shadow-sm transition active:scale-95"
            title="Download or Print PDF Copy"
          >
            <Download size={14} />
            <span>Download PDF</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold py-2 px-3 rounded-xl shadow-sm transition"
            title="Print Receipt"
          >
            <Printer size={14} />
          </button>
        </div>
      </div>

      {/* Main Thermal / Digital Invoice Card */}
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden receipt-paper">
        {/* Top Header Banner */}
        <div className="bg-slate-900 text-white p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-white/10 rounded-2xl mb-3">
            <Store className="text-orange-400" size={26} />
          </div>
          <h1 className="text-2xl font-black tracking-tight">{bill.shopName}</h1>
          {(bill.shopAddress || bill.shopCity) && (
            <p className="text-xs text-slate-300 mt-1 flex items-center justify-center gap-1">
              <MapPin size={12} className="inline opacity-70" />
              {bill.shopAddress}{bill.shopCity ? `, ${bill.shopCity}` : ''}
            </p>
          )}
          {bill.shopPhone && (
            <p className="text-xs text-slate-400 mt-0.5">Phone: +91 {bill.shopPhone}</p>
          )}
          {bill.shopGst && (
            <p className="text-[11px] text-amber-300 font-mono mt-1">GSTIN: {bill.shopGst}</p>
          )}
        </div>

        {/* Bill Metadata Grid */}
        <div className="p-5 border-b border-dashed border-slate-200 bg-slate-50/50">
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 uppercase font-semibold text-[10px] block">Bill Number</span>
              <span className="text-slate-900 font-extrabold text-base">{bill.billNumber}</span>
              {bill.tableNumber && (
                <span className="inline-block bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1">
                  Table: {bill.tableNumber}
                </span>
              )}
            </div>
            <div className="text-right">
              <span className="text-slate-400 uppercase font-semibold text-[10px] block">Date & Time</span>
              <span className="text-slate-800 font-semibold block">{bill.createdAt}</span>
            </div>
          </div>

          {(bill.customerName || bill.customerPhone) && (
            <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Billed To:</span>
              <span className="text-slate-900 font-bold">
                {bill.customerName || 'Customer'} {bill.customerPhone ? `(+91 ${bill.customerPhone})` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="p-5">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                <th className="text-left pb-2">Item</th>
                <th className="text-center pb-2 w-12">Qty</th>
                <th className="text-right pb-2 w-16">Price</th>
                <th className="text-right pb-2 w-16">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bill.items.length > 0 ? (
                bill.items.map((item, idx) => (
                  <tr key={idx} className="py-2.5">
                    <td className="py-2 text-slate-800 font-medium">{item.name}</td>
                    <td className="py-2 text-center text-slate-600">{item.quantity}</td>
                    <td className="py-2 text-right text-slate-600 font-mono">{formatRupee(item.rate)}</td>
                    <td className="py-2 text-right text-slate-900 font-bold font-mono">{formatRupee(item.amount)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-400 italic">
                    All items summary included in total
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Subtotals & Grand Total */}
          <div className="mt-4 pt-4 border-t-2 border-slate-900 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-mono font-medium">{formatRupee(bill.subtotal)}</span>
            </div>

            {bill.gstAmount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>GST {bill.gstRate ? `(${bill.gstRate}%)` : ''}</span>
                <span className="font-mono font-medium">{formatRupee(bill.gstAmount)}</span>
              </div>
            )}

            <div className="flex justify-between items-baseline pt-2 border-t border-dashed border-slate-300">
              <span className="text-sm font-black text-slate-900 uppercase tracking-tight">Grand Total</span>
              <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                {formatRupee(bill.totalAmount)}
              </span>
            </div>
          </div>

          {/* Payment Status Card */}
          <div className="mt-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Payment Status
              </span>
              <span className="text-xs font-bold text-slate-800">
                {bill.paymentMode === 'Pending' ? '🔴 Unpaid / Due Balance' : `✓ Paid via ${bill.paymentMode}`}
              </span>
            </div>
            <div className="text-right font-mono">
              <span className="text-sm font-extrabold text-[#D4621A] block">
                {formatRupee(bill.paidAmount)}
              </span>
              {bill.pendingAmount > 0 && (
                <span className="text-[10px] font-bold text-red-600 block">
                  Due: {formatRupee(bill.pendingAmount)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50/80 border-t border-dashed border-slate-200 text-center">
          <p className="text-xs font-semibold text-slate-700">Thank you for dining with us!</p>
          <p className="text-[10px] text-slate-400 mt-1">
            Generated via <strong>Counter365 Point of Sale</strong> · Official Receipt Copy
          </p>

          <div className="mt-4 no-print flex flex-col gap-2">
            <button
              onClick={handlePrint}
              className="w-full bg-slate-900 hover:bg-black text-white text-xs font-bold py-3 px-4 rounded-xl shadow-md transition flex items-center justify-center gap-2"
            >
              <Download size={15} />
              <span>Download / Save as PDF Copy</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto mt-6 text-center text-xs text-slate-400 no-print">
        <p>© 2026 Counter365. Built for fast retail & restaurant billing.</p>
      </div>
    </div>
  );
}
