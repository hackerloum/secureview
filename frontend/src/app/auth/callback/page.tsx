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
        // Get the current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          toast.error('Authentication error');
          router.replace('/login');
          return;
        }

        if (!session?.user) {
          console.error('No session found');
          toast.error('No session found');
          router.replace('/login');
          return;
        }

        console.log('Session found:', session.user.email);

        // Check if user exists in users table
        const { data: existingUser, error: userError } = await supabase
          .from('users')
          .select('is_super_admin')
          .eq('id', session.user.id)
          .single();

        if (userError && userError.code !== 'PGRST116') { // PGRST116 is "not found"
          console.error('Error checking user:', userError);
          toast.error('Error checking user status');
          router.replace('/login');
          return;
        }

        // If user doesn't exist, create them
        if (!existingUser || userError?.code === 'PGRST116') {
          console.log('Creating new user');
          const { error: insertError } = await supabase
            .from('users')
            .insert([
              {
                id: session.user.id,
                email: session.user.email,
                is_super_admin: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
            ]);

          if (insertError) {
            console.error('Error creating user:', insertError);
            toast.error('Error creating user profile');
            router.replace('/login');
            return;
          }
          
          // Successfully created user, redirect to dashboard
          console.log('User created successfully, redirecting to dashboard');
          toast.success('Account created successfully!');
          router.replace('/dashboard');
          return;
        }

        // Redirect based on admin status
        if (existingUser?.is_super_admin) {
          console.log('Admin user, redirecting to admin panel');
          router.replace('/admin');
        } else {
          console.log('Regular user, redirecting to dashboard');
          router.replace('/dashboard');
        }
      } catch (error) {
        console.error('Error in auth callback:', error);
        toast.error('Authentication error');
        router.replace('/login');
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
