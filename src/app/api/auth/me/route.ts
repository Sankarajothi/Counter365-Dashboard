import { NextRequest, NextResponse } from 'next/server';
import { getAdminCredentials } from '../../../../lib/adminAuthStore';

export async function GET(req: NextRequest) {
  const session365 = req.cookies.get('counter365_admin_session');
  const sessionPro = req.cookies.get('counterpro_admin_session');
  const session = session365 || sessionPro;

  if (session && session.value === 'authenticated_admin_session_valid') {
    const creds = getAdminCredentials();
    return NextResponse.json({
      authenticated: true,
      user: {
        email: creds.email,
        role: 'Super Admin',
        name: creds.name || 'Counter365 Admin',
      },
    });
  }

  return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
}
