import { NextRequest, NextResponse } from 'next/server';
import { fetchProductAnalyticsData } from '../../../../lib/productAnalyticsService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Admin / Founder Role Authorization Check
    const session365 = req.cookies.get('counter365_admin_session');
    const sessionPro = req.cookies.get('counterpro_admin_session');
    const authHeader = req.headers.get('authorization');
    const secret = process.env.ADMIN_SESSION_SECRET;

    const hasCookieAuth =
      (session365 && session365.value === 'authenticated_admin_session_valid') ||
      (sessionPro && sessionPro.value === 'authenticated_admin_session_valid');

    const hasBearerAuth = authHeader && secret && authHeader === `Bearer ${secret}`;

    // Permit access if valid cookie, valid Bearer token, or local development preview
    const isAuthorized = hasCookieAuth || hasBearerAuth || process.env.NODE_ENV !== 'production';

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin or Founder role required' },
        { status: 401 }
      );
    }

    // 2. Query param for bypassing cache
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('refresh') === 'true' || searchParams.get('fresh') === '1';

    // 3. Fetch aggregated payload from service layer
    const data = await fetchProductAnalyticsData(forceRefresh);

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': forceRefresh
          ? 'no-store, no-cache, must-revalidate'
          : 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error: any) {
    console.error('Error fetching Product Analytics:', error);
    return NextResponse.json(
      {
        error: 'Failed to load product analytics data',
        message: error?.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
