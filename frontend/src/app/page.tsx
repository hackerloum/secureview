'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import supabase from '../lib/supabase';
import { FaEye, FaTachometerAlt, FaBars, FaTimes, FaLock } from 'react-icons/fa';
import { FiGithub, FiTwitter, FiLinkedin } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import './styles/landing.css';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [accessCode, setAccessCode] = useState('');

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('Failed to check authentication status');
          return;
        }

        if (session) {
          router.push('/dashboard');
          return;
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setError('Failed to check authentication status');
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Check for error parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const errorMessage = urlParams.get('error');
    if (errorMessage) {
      setError(
        errorMessage === 'auth_callback_error' 
          ? 'Authentication failed. Please try again.' 
          : 'An error occurred during sign in.'
      );
    }

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.push('/dashboard');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('Google sign in error:', error);
        setError(error.message);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Error during Google sign in:', error);
      setError(error.message || 'An error occurred during sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = () => {
    router.push('/auth/signin');
  };

  const handleAccessCode = () => {
    if (!accessCode.trim()) {
      setError('Please enter an access code');
      return;
    }
    router.push(`/view?code=${encodeURIComponent(accessCode.trim())}`);
  };

  const handleAccessCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAccessCode();
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
          <button
            onClick={handleAccessCode}
            className="nav-link access-button"
          >
            Enter Access Code
          </button>
        </div>
        <div className="nav-right">
          <button 
            className="mobile-menu"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </nav>

      <section className="hero">
        <h1>Share Your Content Securely</h1>
        <p>
          Control who sees your content with unique access codes. Simple, secure, and
          professional content sharing for businesses and creators.
        </p>
        <div className="access-code-form">
          <form onSubmit={handleAccessCodeSubmit} className="w-full flex gap-4">
            <input
              type="text"
              placeholder="Enter access code"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              className="access-code-input"
            />
            <button 
              type="submit"
              className="access-code-submit"
            >
              View Content
            </button>
          </form>
        </div>
        <div className="cta-buttons">
          <button 
            className="cta-button primary-button"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <FcGoogle /> {loading ? 'Signing in...' : 'Sign In with Google'}
          </button>
          <button 
            className="cta-button secondary-button"
            onClick={handleEmailSignIn}
            disabled={loading}
          >
            Sign In with Email
          </button>
        </div>
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
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
    </div>
  );
}
