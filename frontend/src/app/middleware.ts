import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Refresh session if expired - required for Server Components
  await supabase.auth.getSession();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If there's no session and the user is trying to access a protected route
  if (!session && (
    req.nextUrl.pathname.startsWith('/dashboard') ||
    req.nextUrl.pathname.startsWith('/admin')
  )) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // If there's a session and the user is trying to access login page
  if (session && req.nextUrl.pathname === '/login') {
    // Check if user is super admin
    const { data: userData, error } = await supabase
      .from('users')
      .select('is_super_admin')
      .eq('id', session.user.id)
      .single();

    if (error || !userData?.is_super_admin) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    } else {
      return NextResponse.redirect(new URL('/admin', req.url));
    }
  }

  // If there's a session and the user is trying to access admin routes
  if (session && req.nextUrl.pathname.startsWith('/admin')) {
    // Check if user is super admin
    const { data: userData, error } = await supabase
      .from('users')
      .select('is_super_admin')
      .eq('id', session.user.id)
      .single();

    if (error || !userData?.is_super_admin) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/login'],
}; 
