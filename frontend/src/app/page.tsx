'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';
import { FaGoogle, FaShieldAlt, FaLock, FaChartLine, FaGithub, FaTwitter, FaLinkedin } from 'react-icons/fa';
import { HiMenuAlt3, HiX } from 'react-icons/hi';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

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

      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (error: any) {
      console.error('Error logging in with Google:', error);
      setError(error.message);
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
      if (data.user) router.push('/dashboard');
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
      <div className="min-h-screen flex items-center justify-center bg-[#0A1A2F]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00C6B3]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A1A2F] text-white">
      {/* Navigation */}
      <nav className="relative bg-[#0A1A2F]/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-[#00C6B3]">SecureView</h1>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              {user ? (
                <button
                  onClick={() => router.push('/dashboard')}
                  className="bg-[#00C6B3] text-white px-6 py-2 rounded-lg hover:bg-[#00C6B3]/90 transition-colors"
                >
                  Dashboard
                </button>
              ) : (
                <>
                  <button
                    onClick={handleGoogleLogin}
                    className="bg-[#00C6B3] text-white px-6 py-2 rounded-lg hover:bg-[#00C6B3]/90 transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => router.push('/user')}
                    className="bg-white/10 text-white px-6 py-2 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    View Content
                  </button>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-white hover:text-[#00C6B3] transition-colors"
              >
                {mobileMenuOpen ? (
                  <HiX className="h-6 w-6" />
                ) : (
                  <HiMenuAlt3 className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {user ? (
                <button
                  onClick={() => router.push('/dashboard')}
                  className="block w-full text-left px-3 py-2 rounded-md text-white hover:bg-white/10 transition-colors"
                >
                  Dashboard
                </button>
              ) : (
                <>
                  <button
                    onClick={handleGoogleLogin}
                    className="block w-full text-left px-3 py-2 rounded-md text-white hover:bg-white/10 transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => router.push('/user')}
                    className="block w-full text-left px-3 py-2 rounded-md text-white hover:bg-white/10 transition-colors"
                  >
                    View Content
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#0A1A2F] to-[#0A1A2F]/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="text-center relative z-10">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-[#00C6B3] bg-clip-text text-transparent">
              Share Your Content Securely
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto">
              Protect your digital content with unique access codes. Simple, secure, and professional content sharing for businesses and individuals.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={handleGoogleLogin}
                className="flex items-center justify-center gap-2 bg-white text-[#0A1A2F] px-8 py-3 rounded-lg text-lg font-medium hover:bg-gray-100 transition-colors"
              >
                <FaGoogle className="h-5 w-5" />
                Sign in with Google
              </button>
              <button
                onClick={() => setShowLoginForm(true)}
                className="flex items-center justify-center gap-2 bg-[#00C6B3] text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-[#00C6B3]/90 transition-colors"
              >
                Email Sign In
              </button>
            </div>
            {error && (
              <div className="mt-4 text-red-400">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Abstract background elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-7xl">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[#00C6B3]/20 rounded-full filter blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full filter blur-3xl"></div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-[#0A1A2F]/95 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Why Choose SecureView?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/5 p-8 rounded-xl hover:bg-white/10 transition-colors">
              <div className="text-[#00C6B3] text-4xl mb-4">
                <FaLock />
              </div>
              <h3 className="text-xl font-semibold mb-4">Unique Access Codes</h3>
              <p className="text-gray-300">
                Generate secure access codes for each piece of content. Control who sees what with precision.
              </p>
            </div>
            <div className="bg-white/5 p-8 rounded-xl hover:bg-white/10 transition-colors">
              <div className="text-[#00C6B3] text-4xl mb-4">
                <FaShieldAlt />
              </div>
              <h3 className="text-xl font-semibold mb-4">Content Control</h3>
              <p className="text-gray-300">
                Monitor views, manage access, and revoke permissions at any time. Your content, your rules.
              </p>
            </div>
            <div className="bg-white/5 p-8 rounded-xl hover:bg-white/10 transition-colors">
              <div className="text-[#00C6B3] text-4xl mb-4">
                <FaChartLine />
              </div>
              <h3 className="text-xl font-semibold mb-4">Simple Dashboard</h3>
              <p className="text-gray-300">
                Intuitive analytics and content management. Track engagement and manage everything in one place.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Demo Section */}
      <div className="bg-[#0A1A2F] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Powerful Yet Simple
            </h2>
            <p className="text-xl text-gray-300">
              See how easy it is to manage and share your content securely
            </p>
          </div>
          <div className="relative rounded-xl overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A1A2F] via-transparent to-transparent z-10"></div>
            <Image
              src="/dashboard-preview.jpg"
              alt="SecureView Dashboard Preview"
              width={1920}
              height={1080}
              className="w-full filter blur-sm hover:blur-none transition-all duration-500"
            />
          </div>
        </div>
      </div>

      {/* Trust Section */}
      <div className="bg-[#0A1A2F]/95 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-lg text-gray-400 mb-8">Trusted by 500+ Companies</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center opacity-50">
              {/* Replace with actual company logos */}
              <div className="h-12 w-32 bg-white/10 rounded"></div>
              <div className="h-12 w-32 bg-white/10 rounded"></div>
              <div className="h-12 w-32 bg-white/10 rounded"></div>
              <div className="h-12 w-32 bg-white/10 rounded"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#0A1A2F] border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 mb-4 md:mb-0">
              &copy; 2024 SecureView. All rights reserved.
            </div>
            <div className="flex items-center space-x-6">
              <a href="#" className="text-gray-400 hover:text-[#00C6B3] transition-colors">
                <FaTwitter className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-[#00C6B3] transition-colors">
                <FaGithub className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-[#00C6B3] transition-colors">
                <FaLinkedin className="h-6 w-6" />
              </a>
            </div>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Terms
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Privacy
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      {showLoginForm && !user && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0A1A2F] border border-white/10 rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4 text-white">Sign In / Sign Up</h3>
            {error && (
              <div className="bg-red-500/10 text-red-400 p-3 rounded-lg mb-4">
                {error}
              </div>
            )}
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-lg bg-white/5 border border-white/10 text-white px-4 py-2 focus:ring-[#00C6B3] focus:border-[#00C6B3]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-lg bg-white/5 border border-white/10 text-white px-4 py-2 focus:ring-[#00C6B3] focus:border-[#00C6B3]"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-[#00C6B3] text-white px-4 py-2 rounded-lg hover:bg-[#00C6B3]/90 transition-colors"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={handleEmailSignUp}
                  className="flex-1 bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-colors"
                >
                  Sign Up
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowLoginForm(false)}
                className="w-full text-gray-400 text-sm hover:text-white transition-colors"
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
