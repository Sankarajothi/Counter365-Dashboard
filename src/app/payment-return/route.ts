import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get('order_id') || url.searchParams.get('txnid') || '';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Completed - Returning to Counter365</title>
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
    .btn {
      margin-top: 20px;
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
  <h2>Payment Processed!</h2>
  <p style="color: #94A3B8;">Returning back to Counter365 app...</p>
  <a id="app_link" class="btn" href="counter365://payment-return?order_id=${encodeURIComponent(orderId)}">Return to Counter365</a>

  <script>
    setTimeout(function() {
      window.location.href = "counter365://payment-return?order_id=" + encodeURIComponent("${orderId}");
    }, 500);
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
  // PayU form post return
  let orderId = '';
  try {
    const formData = await request.formData();
    orderId = (formData.get('txnid') as string) || '';
  } catch (_) {
    const url = new URL(request.url);
    orderId = url.searchParams.get('order_id') || '';
  }

  return GET(new NextRequest(new URL(`https://counter365.tecstellar.com/payment-return?order_id=${encodeURIComponent(orderId)}`)));
}
