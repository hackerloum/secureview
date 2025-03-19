'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Try to get the code from the URL
        const code = new URLSearchParams(window.location.search).get('code');
        
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }

        // Get the session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth error:', error.message);
          router.push('/?error=auth_callback_error');
          return;
        }

        if (session) {
          console.log('Session established, redirecting to dashboard...');
          router.push('/dashboard');
        } else {
          console.error('No session found');
          router.push('/?error=no_session');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        router.push('/?error=auth_callback_error');
      }
    };

    handleAuthCallback();
  }, [router, supabase.auth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A1A2F]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00C6B3] mx-auto mb-4"></div>
        <p className="text-white">Completing sign in...</p>
      </div>
    </div>
  );
} 
