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

  // Public paths that don't require authentication
  const publicPaths = ['/login', '/auth/callback', '/', '/access'];
  const isPublicPath = publicPaths.some(path => 
    req.nextUrl.pathname === path || req.nextUrl.pathname.startsWith('/view')
  );

  // If user is not signed in and trying to access a protected path
  if (!session && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // If user is signed in and trying to access login page
  if (session && req.nextUrl.pathname === '/login') {
    // For signed-in users, redirect to dashboard from login page
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // For protected routes (dashboard, admin)
  if (session && (req.nextUrl.pathname.startsWith('/dashboard') || req.nextUrl.pathname.startsWith('/admin'))) {
    try {
      // Check if user exists in users table
      const { data: userData, error } = await supabase
        .from('users')
        .select('is_super_admin')
        .eq('id', session.user.id)
        .single();

      // If user not found in users table, we'll create it later in the route handler
      if (error && error.code === 'PGRST116') {
        // If accessing admin routes without being in users table
        if (req.nextUrl.pathname.startsWith('/admin')) {
          return NextResponse.redirect(new URL('/dashboard', req.url));
        }
        // Let them through to dashboard where user will be created
        return res;
      }

      // If there's a different error
      if (error && error.code !== 'PGRST116') {
        console.error('Error in middleware:', error);
        return res;
      }

      // If user is trying to access admin route but is not admin
      if (req.nextUrl.pathname.startsWith('/admin') && !userData?.is_super_admin) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }

      // If user is trying to access dashboard but is admin
      if (req.nextUrl.pathname.startsWith('/dashboard') && userData?.is_super_admin) {
        return NextResponse.redirect(new URL('/admin', req.url));
      }
    } catch (error) {
      console.error('Middleware error:', error);
      // If there's an error, still allow access rather than blocking
      return res;
    }
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}; 
