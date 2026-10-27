import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const PAYU_KEY = process.env.PAYU_KEY || 'pb2hmj';
const PAYU_SALT = process.env.PAYU_SALT || 'LluTPRmL5rsyPyjyqouIotZIR8JbyCWy';
const PAYU_BASE_URL = 'https://secure.payu.in/_payment';

const PLAN_PRICES: Record<string, { price: number; name: string }> = {
  '1_month': { price: 588.82, name: '1Month' },
  '3_months': { price: 3538.82, name: '3Months' },
  '6_months': { price: 6488.82, name: '6Months' },
  '1_year': { price: 11798.82, name: '12Months' },
};

function calculateSha512(text: string): string {
  return crypto.createHash('sha512').update(text).digest('hex').toLowerCase();
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const planId = url.searchParams.get('planId') || '1_year';
  const shopId = url.searchParams.get('shopId') || 'shop';
  const shopName = url.searchParams.get('shopName') || 'Counter365';
  const customerPhone = url.searchParams.get('phone') || '9999999999';
  const customerEmail = url.searchParams.get('email') || 'billing@counterpro.app';
  const customAmount = url.searchParams.get('amount');

  const plan = PLAN_PRICES[planId] || PLAN_PRICES['1_year'];
  const timestamp = Date.now();
  const cleanPhone = customerPhone.replace(/[^0-9]/g, '').slice(-10) || '9999999999';
  const shopPrefix = shopId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
  const safeTxnId = `cpro_${shopPrefix}_${timestamp}`;

  const formattedAmount = customAmount
    ? Number(customAmount).toFixed(2)
    : plan.price.toFixed(2);

  const email = customerEmail.includes('@') ? customerEmail.trim() : 'billing@counterpro.app';
  const cleanName = shopName.replace(/[^a-zA-Z0-9 ]/g, '').trim().slice(0, 50) || 'Counter365 Customer';
  const productInfo = `Counter365_${plan.name}_Subscription`;
  const returnUrl = `https://counter365.tecstellar.com/payment-return?order_id=${safeTxnId}`;

  const udf1 = shopId;
  const udf2 = planId;
  const udf3 = 'subscription';
  const udf4 = 'Counter365';
  const udf5 = '';

  // Standard PayU Hash sequence:
  // sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
  const hashString = [
    PAYU_KEY,
    safeTxnId,
    formattedAmount,
    productInfo,
    cleanName,
    email,
    udf1,
    udf2,
    udf3,
    udf4,
    udf5,
    '', '', '', '', '',
    PAYU_SALT,
  ].join('|');

  const hash = calculateSha512(hashString);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PayU Checkout - Counter365</title>
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
    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid rgba(255, 255, 255, 0.2);
      border-top-color: #F97316;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 20px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .btn {
      margin-top: 20px;
      background: #F97316;
      color: #FFFFFF;
      font-size: 15px;
      font-weight: 700;
      padding: 12px 24px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <h2 style="margin: 0 0 8px 0;">Connecting to PayU...</h2>
  <p style="color: #94A3B8; margin: 0 0 16px 0;">Opening secure checkout for &#8377;${formattedAmount}</p>

  <form id="payu_checkout_form" method="POST" action="${PAYU_BASE_URL}">
    <input type="hidden" name="key" value="${PAYU_KEY}" />
    <input type="hidden" name="txnid" value="${safeTxnId}" />
    <input type="hidden" name="amount" value="${formattedAmount}" />
    <input type="hidden" name="productinfo" value="${productInfo}" />
    <input type="hidden" name="firstname" value="${cleanName}" />
    <input type="hidden" name="email" value="${email}" />
    <input type="hidden" name="phone" value="${cleanPhone}" />
    <input type="hidden" name="surl" value="${returnUrl}" />
    <input type="hidden" name="furl" value="${returnUrl}" />
    <input type="hidden" name="service_provider" value="payu_paisa" />
    <input type="hidden" name="hash" value="${hash}" />
    <input type="hidden" name="udf1" value="${udf1}" />
    <input type="hidden" name="udf2" value="${udf2}" />
    <input type="hidden" name="udf3" value="${udf3}" />
    <input type="hidden" name="udf4" value="${udf4}" />
    <input type="hidden" name="udf5" value="${udf5}" />
    <noscript>
      <button type="submit" class="btn">Proceed to Pay</button>
    </noscript>
  </form>

  <script>
    document.getElementById('payu_checkout_form').submit();
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
