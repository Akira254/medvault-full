import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const getAdminSecret = () =>
  new TextEncoder().encode(process.env.ADMIN_JWT_SECRET || 'dev-admin-secret-change-in-production-32chars');

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect all /admin routes except /admin/login and /api/admin/auth/login
  const isAdminPage = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const isAdminApi = pathname.startsWith('/api/admin') && pathname !== '/api/admin/auth/login';

  if (isAdminPage || isAdminApi) {
    const token = req.cookies.get('mv_admin_session')?.value;
    if (!token) {
      if (isAdminApi) {
        return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/admin/login?reason=session_required', req.url));
    }

    try {
      await jwtVerify(token, getAdminSecret());
    } catch {
      const res = isAdminApi
        ? NextResponse.json({ error: 'Admin session expired' }, { status: 401 })
        : NextResponse.redirect(new URL('/admin/login?reason=expired', req.url));
      res.cookies.delete('mv_admin_session');
      return res;
    }

    // Strict Preview Mode Read-Only Enforcement (Section 7B)
    const isPreviewActive = req.cookies.get('mv_admin_preview')?.value === '1';
    if (isPreviewActive) {
      // Allow exiting preview
      if (pathname === '/api/admin/preview/exit') {
        return NextResponse.next();
      }
      // Reject ANY mutating HTTP request in Preview Mode
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        return NextResponse.json(
          { error: 'PREVIEW MODE: READ ONLY — mutations are blocked until you exit preview.' },
          { status: 403 }
        );
      }
      // Lock navigation inside /admin/preview/* until Exit Preview is clicked
      if (isAdminPage && !pathname.startsWith('/admin/preview')) {
        return NextResponse.redirect(new URL('/admin/preview?locked=1', req.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
