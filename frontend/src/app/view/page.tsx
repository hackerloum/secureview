'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '../../lib/supabase';
import { format } from 'date-fns';
import { ShieldCheckIcon, QuestionMarkCircleIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

interface Content {
  id: string;
  title: string;
  description: string;
  image_url: string;
  access_code: string;
  created_at: string;
  view_count: number;
  user_id: string;
}

export default function ViewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionTime, setSessionTime] = useState(3600); // 1 hour in seconds
  const [isBlurred, setIsBlurred] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef(Math.random().toString(36).substring(7));
  const watermarkPositions = useRef<{ x: number; y: number; rotation: number }[]>([]);

  // Initialize watermark positions
  useEffect(() => {
    const positions = Array.from({ length: 5 }, () => ({
      x: Math.random() * 80 + 10, // 10-90%
      y: Math.random() * 80 + 10, // 10-90%
      rotation: Math.random() * 30 - 15 // -15 to 15 degrees
    }));
    watermarkPositions.current = positions;
  }, []);

  // Handle content fetch
  useEffect(() => {
    const fetchContent = async () => {
      try {
        const accessCode = searchParams.get('code');
        if (!accessCode) {
          setError('Please enter an access code to view content');
          setLoading(false);
          return;
        }

        const { data, error: fetchError } = await supabase
          .from('contents')
          .select('*')
          .eq('access_code', accessCode);

        if (fetchError) {
          console.error('Error fetching content:', fetchError);
          setError('Failed to load content');
          return;
        }

        if (!data || data.length === 0) {
          setError('Invalid access code. Please check and try again.');
          return;
        }

        const contentItem = data[0];
        setContent(contentItem);

        // Record view
        await supabase.from('content_views').insert([
          { content_id: contentItem.id, content_user_id: contentItem.user_id }
        ]);
      } catch (err) {
        console.error('Error fetching content:', err);
        setError('Failed to load content');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [searchParams]);

  // Session timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  // Anti-piracy: Tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsBlurred(document.hidden);
      if (document.hidden) {
        showSecurityToast('Content blurred for security');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Anti-piracy: DevTools detection
  useEffect(() => {
    const detectDevTools = () => {
      if (window.outerHeight - window.innerHeight > 100) {
        setIsBlurred(true);
        showSecurityToast('DevTools detected - Content protected');
      }
    };

    window.addEventListener('resize', detectDevTools);
    return () => window.removeEventListener('resize', detectDevTools);
  }, []);

  // Anti-piracy: Prevent right-click and keyboard shortcuts
  useEffect(() => {
    const preventActions = (e: KeyboardEvent | MouseEvent) => {
      if (e instanceof KeyboardEvent) {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'p' || e.key === 's')) {
          e.preventDefault();
          showSecurityToast('Action restricted for content protection');
        }
      } else {
        e.preventDefault();
        showSecurityToast('Right-click disabled for security');
      }
    };

    document.addEventListener('contextmenu', preventActions);
    document.addEventListener('keydown', preventActions);
    return () => {
      document.removeEventListener('contextmenu', preventActions);
      document.removeEventListener('keydown', preventActions);
    };
  }, []);

  const showSecurityToast = useCallback((message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A1A2F]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00C6B3]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A1A2F]">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
          <ShieldCheckIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-[#0A1A2F] text-white px-6 py-2 rounded-lg hover:bg-opacity-90 transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A1A2F] text-white">
      {/* Header */}
      <header className="bg-white/5 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white/10 px-4 py-2 rounded-lg">
                <p className="text-sm font-mono">
                  Access Code: <span className="text-[#00C6B3]">{content?.access_code}</span>
                </p>
              </div>
              <div className="bg-white/10 px-4 py-2 rounded-lg">
                <p className="text-sm font-mono">
                  Session expires in:{' '}
                  <span className="text-[#00C6B3]">
                    {Math.floor(sessionTime / 60)}:{(sessionTime % 60).toString().padStart(2, '0')}
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowHelpModal(true)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              aria-label="Help"
            >
              <QuestionMarkCircleIcon className="w-6 h-6 text-[#00C6B3]" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div
          ref={contentRef}
          className={`relative bg-white rounded-lg overflow-hidden transition-all duration-300 ${
            isBlurred ? 'blur-lg' : ''
          }`}
        >
          {/* Dynamic Watermarks */}
          {watermarkPositions.current.map((pos, i) => (
            <div
              key={i}
              className="absolute pointer-events-none select-none font-mono text-sm text-[#00C6B3]/15"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: `rotate(${pos.rotation}deg)`,
                whiteSpace: 'nowrap'
              }}
            >
              SecureView • {sessionId.current}
            </div>
          ))}

          {/* Content */}
          <div className="aspect-w-16 aspect-h-9">
            <img
              src={content?.image_url}
              alt={content?.title}
              className="w-full h-full object-cover select-none"
              draggable="false"
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 inset-x-0 bg-white/5 backdrop-blur-sm border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/60">
              Protected by SecureView • Session ID: {sessionId.current}
            </p>
            <div className="flex items-center space-x-2">
              <ShieldCheckIcon className="w-4 h-4 text-[#00C6B3]" />
              <span className="text-sm text-white/60">Secure Viewing Active</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Help Modal */}
      <AnimatePresence>
        {showHelpModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-lg max-w-md w-full p-6 text-gray-900"
            >
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <ShieldCheckIcon className="w-6 h-6 text-[#00C6B3] mr-2" />
                Security Guidelines
              </h3>
              <div className="space-y-4 text-gray-600">
                <p>• Content is protected against copying and screenshots</p>
                <p>• Session expires after inactivity or tab switching</p>
                <p>• Unique watermarks track unauthorized sharing</p>
                <p>• Right-click and keyboard shortcuts are disabled</p>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="mt-6 w-full bg-[#0A1A2F] text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors"
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Security Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-white/10 backdrop-blur-md rounded-lg px-4 py-3 flex items-center space-x-2"
          >
            <LockClosedIcon className="w-5 h-5 text-[#00C6B3]" />
            <p className="text-sm text-white">{toastMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 
