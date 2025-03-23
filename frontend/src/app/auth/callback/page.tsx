'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { toast } from 'react-hot-toast';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (session?.user) {
          // Check if user is super admin
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('is_super_admin')
            .eq('id', session.user.id)
            .single();

          if (userError) {
            console.error('Error checking admin status:', userError);
            toast.error('Error checking admin status');
            router.push('/login');
            return;
          }

          // Redirect based on admin status
          if (userData?.is_super_admin) {
            router.push('/admin');
          } else {
            router.push('/dashboard');
          }
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Error in auth callback:', error);
        toast.error('Authentication error');
        router.push('/login');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0A1A2F] to-[#1A2B4F]">
      <div className="text-white text-center">
        <h1 className="text-2xl font-bold mb-4">Completing authentication...</h1>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
      </div>
    </div>
  );
} 
