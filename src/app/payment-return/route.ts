import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const PLAN_MONTHS: Record<string, number> = {
  '1_month': 1,
  '3_months': 3,
  '6_months': 6,
  '1_year': 12,
};

async function activateSubscriptionInDb(shopId: string, planId: string, orderId: string, amount?: number) {
  try {
    if (!shopId) return;

    const months = PLAN_MONTHS[planId] || 12;
    const now = new Date();
    const startDate = now.toISOString();
    const endDate = new Date(now.getTime() + months * 30 * 24 * 60 * 60 * 1000).toISOString();

    const payload = {
      shop_id: shopId,
      plan: 'pro',
      status: 'active',
      amount: amount || 0,
      interval: `${months} Months`,
      current_period_start: startDate,
      current_period_end: endDate,
      subscription_start_at: startDate,
      subscription_end_at: endDate,
      payment_reference: orderId,
      cashfree_order_id: orderId,
      currency: 'INR',
      duration_months: months,
      updated_at: startDate,
    };

    await (supabase.from('subscriptions') as any).upsert(payload, { onConflict: 'shop_id' });
    console.log(`[PayU Return] Successfully activated ${months} months subscription for shop ${shopId}`);
  } catch (err) {
    console.error('[PayU Return] Failed to activate subscription in DB:', err);
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get('order_id') || url.searchParams.get('txnid') || '';
  const shopId = url.searchParams.get('udf1') || '';
  const planId = url.searchParams.get('udf2') || '1_year';
  const status = (url.searchParams.get('status') || '').toLowerCase();

  if (status === 'success' && shopId) {
    await activateSubscriptionInDb(shopId, planId, orderId);
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Successful - Counter365</title>
  <style>
    body {
      background-color: #0F172A;
      color: #FFFFFF;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      text-align: center;
      padding: 24px;
    }
    .check-icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #10B981;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36px;
      margin-bottom: 20px;
    }
    .btn {
      margin-top: 24px;
      background: #10B981;
      color: #FFFFFF;
      font-size: 16px;
      font-weight: 700;
      padding: 14px 28px;
      border-radius: 10px;
      text-decoration: none;
      display: inline-block;
    }
  </style>
</head>
<body>
  <div class="check-icon">&#10003;</div>
  <h2 style="margin: 0 0 8px 0;">Payment Successful!</h2>
  <p style="color: #94A3B8; margin: 0 0 16px 0;">Your subscription is now active. Returning to Counter365 app...</p>
  <a id="app_link" class="btn" href="counter365://payment-return?order_id=${encodeURIComponent(orderId)}">Open Counter365 App</a>

  <script>
    setTimeout(function() {
      window.location.href = "counter365://payment-return?order_id=" + encodeURIComponent("${orderId}");
    }, 400);
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}

export async function POST(request: NextRequest) {
  let orderId = '';
  let status = '';
  let shopId = '';
  let planId = '';
  let amount = 0;

  try {
    const formData = await request.formData();
    orderId = (formData.get('txnid') as string) || '';
    status = ((formData.get('status') as string) || '').toLowerCase();
    shopId = (formData.get('udf1') as string) || '';
    planId = (formData.get('udf2') as string) || '1_year';
    amount = parseFloat((formData.get('amount') as string) || '0');
  } catch (_) {
    const url = new URL(request.url);
    orderId = url.searchParams.get('order_id') || url.searchParams.get('txnid') || '';
    status = (url.searchParams.get('status') || '').toLowerCase();
    shopId = url.searchParams.get('udf1') || '';
    planId = url.searchParams.get('udf2') || '1_year';
  }

  if (status === 'success' && shopId) {
    await activateSubscriptionInDb(shopId, planId, orderId, amount);
  }

  return GET(
    new NextRequest(
      new URL(
        `https://counter365.tecstellar.com/payment-return?order_id=${encodeURIComponent(orderId)}&status=${encodeURIComponent(status)}&udf1=${encodeURIComponent(shopId)}&udf2=${encodeURIComponent(planId)}`
      )
    )
  );
}
