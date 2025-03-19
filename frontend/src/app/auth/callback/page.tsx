'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '../../../lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const code = new URLSearchParams(window.location.search).get('code');
        
        if (!code) {
          console.error('No code found in URL');
          router.push('/?error=no_code');
          return;
        }

        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (exchangeError) {
          console.error('Exchange error:', exchangeError);
          router.push('/?error=exchange_error');
          return;
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          router.push('/?error=session_error');
          return;
        }

        if (!session) {
          console.error('No session found');
          router.push('/?error=no_session');
          return;
        }

        router.push('/dashboard');
      } catch (error) {
        console.error('Auth callback error:', error);
        router.push('/?error=auth_callback_error');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A1A2F]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00C6B3] mx-auto mb-4"></div>
        <p className="text-white">Completing sign in...</p>
      </div>
    </div>
  );
} 
