import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Refresh session if expired
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If user is not signed in and the current path is not /login,
  // redirect the user to /login
  if (!session && req.nextUrl.pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // If user is signed in and the current path is /login,
  // redirect the user to /dashboard
  if (session && req.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // For protected routes (dashboard, admin)
  if (session && (req.nextUrl.pathname.startsWith('/dashboard') || req.nextUrl.pathname.startsWith('/admin'))) {
    // Check if user exists in users table
    const { data: userData } = await supabase
      .from('users')
      .select('is_super_admin')
      .eq('id', session.user.id)
      .single();

    // If user is trying to access admin route but is not admin
    if (req.nextUrl.pathname.startsWith('/admin') && !userData?.is_super_admin) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // If user is trying to access dashboard but is admin
    if (req.nextUrl.pathname.startsWith('/dashboard') && userData?.is_super_admin) {
      return NextResponse.redirect(new URL('/admin', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}; 
