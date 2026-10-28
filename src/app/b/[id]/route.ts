import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const rawId = params?.id ? decodeURIComponent(params.id).trim() : '';
  const cleanId = rawId.replace(/[^a-zA-Z0-9_-]/g, '');

  if (!cleanId) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tziqjkklqtmjlncoraba.supabase.co';
  const getStorageUrl = (filename: string) =>
    `${supabaseUrl}/storage/v1/object/public/receipts/${filename}.pdf`;

  // 1. Try fetching PDF directly by cleanId
  try {
    const directUrl = getStorageUrl(cleanId);
    const res = await fetch(directUrl, { cache: 'no-store' });
    if (res.ok) {
      const pdfBuffer = await res.arrayBuffer();
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="receipt-${cleanId}.pdf"`,
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        },
      });
    }
  } catch (err) {
    console.warn('Direct PDF proxy notice for', cleanId, err);
  }

  // 2. If cleanId might be a bill number (not a standard UUID), resolve its UUID from the DB
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
  if (!isUuid) {
    try {
      const formattedNo = cleanId.startsWith('#') ? cleanId : `#${cleanId}`;
      const { data: billRows } = await supabase
        .from('bills')
        .select('id')
        .or(`bill_number.eq.${formattedNo},bill_number.eq.${cleanId}`)
        .limit(1);

      if (billRows && billRows.length > 0 && billRows[0].id) {
        const resolvedId = billRows[0].id;
        const resolvedUrl = getStorageUrl(resolvedId);
        const resResolved = await fetch(resolvedUrl, { cache: 'no-store' });
        if (resResolved.ok) {
          const pdfBuffer = await resResolved.arrayBuffer();
          return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `inline; filename="receipt-${cleanId}.pdf"`,
              'Cache-Control': 'public, max-age=86400, s-maxage=86400',
            },
          });
        }
      }
    } catch (dbErr) {
      console.warn('Failed to resolve bill number to UUID:', dbErr);
    }
  }

  // 3. Fallback: ALWAYS redirect to the interactive digital web bill viewer (/bill/[id])
  // NEVER redirect to the raw Supabase Storage URL, which emits a JSON 404 NoSuchKey error
  const webBillUrl = new URL(`/bill/${cleanId}`, request.url);
  webBillUrl.search = request.nextUrl.search;
  return NextResponse.redirect(webBillUrl, { status: 307 });
}

