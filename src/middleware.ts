import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    if (request.nextUrl.pathname.startsWith('/admin')) {
        // Exclude the login page itself and any auth APIs
        if (request.nextUrl.pathname === '/admin/login') {
            return NextResponse.next();
        }

        const authCookie = request.cookies.get('admin_auth');

        // Simple presence check. The actual value validation should be tight if we had sessions, 
        // but for a simple shared password, if the cookie exists with "true", we allow it.
        // A better approach is checking a signed token, but for this quick requirement:
        if (!authCookie || authCookie.value !== 'true') {
            const loginUrl = new URL('/admin/login', request.url);
            return NextResponse.redirect(loginUrl);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*'],
};
