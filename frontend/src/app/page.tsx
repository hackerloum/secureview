'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true
    }
  }
);

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showLoginForm, setShowLoginForm] = useState(false);

  useEffect(() => {
    const handleAuthStateChange = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('Session found:', session.user);
          setUser(session.user);
          router.push('/dashboard');
          return;
        }

        // Check URL for auth callback
        const params = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = params.get('access_token');
        if (accessToken) {
          console.log('Access token found in URL');
          const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(accessToken);
          if (authUser) {
            console.log('User authenticated:', authUser);
            setUser(authUser);
            router.push('/dashboard');
            return;
          }
          if (authError) {
            console.error('Auth error:', authError);
            setError(authError.message);
          }
        }
      } catch (error) {
        console.error('Auth state change error:', error);
      } finally {
        setLoading(false);
      }
    };

    handleAuthStateChange();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        window.location.href = '/dashboard';
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        window.location.href = '/';
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const handleGoogleLogin = async () => {
    try {
      setError(null);
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      if (error) {
        console.error('Google login error:', error);
        throw error;
      }

      if (data?.url) {
        console.log('Redirecting to:', data.url);
        window.location.href = data.url;
        return;
      }
    } catch (error: any) {
      console.error('Error logging in with Google:', error);
      setError(error.message || 'Failed to login with Google');
      setShowLoginForm(true);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error('Error logging in with email:', error);
      setError(error.message);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;

      setError('Please check your email for verification link');
    } catch (error: any) {
      console.error('Error signing up:', error);
      setError(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary">SecureView</h1>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <button
                  onClick={() => router.push('/dashboard')}
                  className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Dashboard
                </button>
              ) : (
                <button
                  onClick={handleGoogleLogin}
                  className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Sign In
                </button>
              )}
              <button
                onClick={() => router.push('/user')}
                className="bg-white text-gray-700 px-6 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                View Content
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Auth Modal */}
      {showLoginForm && !user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">Sign In / Sign Up</h3>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">
                {error}
              </div>
            )}
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={handleEmailSignUp}
                  className="flex-1 bg-white text-gray-700 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Sign Up
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowLoginForm(false)}
                className="w-full text-gray-600 text-sm"
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Share Your Content Securely
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            SecureView allows you to share your content with access codes, ensuring your content reaches only the intended audience.
          </p>
          <div className="flex justify-center gap-4">
            {!user && (
              <>
                <button
                  onClick={handleGoogleLogin}
                  className="bg-primary text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Sign in with Google
                </button>
                <button
                  onClick={() => setShowLoginForm(true)}
                  className="bg-white text-gray-700 px-8 py-3 rounded-lg text-lg font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Email Sign In
                </button>
              </>
            )}
          </div>
          {error && (
            <div className="mt-4 text-red-600">
              {error}
            </div>
          )}
        </div>

        {/* Features Section */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="text-primary text-2xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold mb-2">Secure Sharing</h3>
            <p className="text-gray-600">Share your content securely with unique access codes.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="text-primary text-2xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold mb-2">Targeted Access</h3>
            <p className="text-gray-600">Control who can view your content with precision.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="text-primary text-2xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">Easy Management</h3>
            <p className="text-gray-600">Manage all your shared content from a simple dashboard.</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white mt-24 py-12 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2024 SecureView. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
