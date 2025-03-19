'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';
import { FaGoogle, FaShieldAlt, FaLock, FaChartLine, FaGithub, FaTwitter, FaLinkedin } from 'react-icons/fa';
import { HiMenuAlt3, HiX } from 'react-icons/hi';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { FaEye, FaTachometerAlt, FaBars, FaTimes } from 'react-icons/fa';
import { FiGithub, FiTwitter, FiLinkedin } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import './styles/landing.css';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const supabaseAuth = createClientComponentClient();

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

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabaseAuth.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  const handleEmailSignIn = () => {
    window.location.href = '/auth/signin';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A1A2F]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00C6B3]"></div>
      </div>
    );
  }

  return (
    <div className="landing-container">
      <nav className="nav">
        <div className="logo">SecureView</div>
        <div className={`nav-links ${isMobileMenuOpen ? 'mobile-active' : ''}`}>
          <a href="#features" className="nav-link">Features</a>
          <a href="#demo" className="nav-link">Demo</a>
          <a href="#trust" className="nav-link">Trust</a>
        </div>
        <button 
          className="mobile-menu"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>
      </nav>

      <section className="hero">
        <h1>Share Your Content Securely</h1>
        <p>
          Control who sees your content with unique access codes. Simple, secure, and
          professional content sharing for businesses and creators.
        </p>
        <div className="cta-buttons">
          <button 
            className="cta-button primary-button"
            onClick={handleGoogleSignIn}
          >
            <FcGoogle /> Sign In with Google
          </button>
          <button 
            className="cta-button secondary-button"
            onClick={handleEmailSignIn}
          >
            Sign In with Email
          </button>
        </div>
      </section>

      <section id="features" className="features">
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <FaLock />
            </div>
            <h3 className="feature-title">Unique Access Codes</h3>
            <p className="feature-description">
              Generate secure, one-time access codes for your content. Control who sees what
              and when they see it.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <FaEye />
            </div>
            <h3 className="feature-title">Content Control</h3>
            <p className="feature-description">
              Monitor views, set expiration dates, and revoke access at any time. Full
              control over your shared content.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <FaTachometerAlt />
            </div>
            <h3 className="feature-title">Simple Dashboard</h3>
            <p className="feature-description">
              Manage all your content from one intuitive dashboard. Track analytics and
              control access effortlessly.
            </p>
          </div>
        </div>
      </section>

      <section id="demo" className="demo">
        <Image
          src="/dashboard-preview.svg"
          alt="SecureView Dashboard Preview"
          width={800}
          height={450}
          className="demo-image"
        />
      </section>

      <section id="trust" className="trust">
        <h3>Trusted by 500+ Companies</h3>
        <div className="trust-logos">
          {/* Replace with actual company logos */}
          <div className="trust-logo">Company 1</div>
          <div className="trust-logo">Company 2</div>
          <div className="trust-logo">Company 3</div>
          <div className="trust-logo">Company 4</div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-links">
            <a href="/terms" className="footer-link">Terms of Service</a>
            <a href="/privacy" className="footer-link">Privacy Policy</a>
          </div>
          <div className="social-icons">
            <a href="https://github.com" className="social-icon" target="_blank" rel="noopener noreferrer">
              <FiGithub />
            </a>
            <a href="https://twitter.com" className="social-icon" target="_blank" rel="noopener noreferrer">
              <FiTwitter />
            </a>
            <a href="https://linkedin.com" className="social-icon" target="_blank" rel="noopener noreferrer">
              <FiLinkedin />
            </a>
          </div>
          <div className="copyright">
            © {new Date().getFullYear()} SecureView. All rights reserved.
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
