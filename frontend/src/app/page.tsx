'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error logging in:', error);
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
                  onClick={handleLogin}
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
              <button
                onClick={handleLogin}
                className="bg-primary text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Get Started
              </button>
            )}
            <button
              onClick={() => router.push('/user')}
              className="bg-white text-gray-700 px-8 py-3 rounded-lg text-lg font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Enter Access Code
            </button>
          </div>
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
