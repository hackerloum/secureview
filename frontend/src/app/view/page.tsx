'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '../../lib/supabase';
import { format } from 'date-fns';
import { ShieldCheckIcon, QuestionMarkCircleIcon, LockClosedIcon, EyeIcon, ClockIcon } from '@heroicons/react/24/outline';
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

// Add device fingerprint interface
interface DeviceFingerprint {
  browser: string;
  os: string;
  screenResolution: string;
  timezone: string;
  timestamp: number;
}

export default function ViewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionTime, setSessionTime] = useState(600); // 10 minutes in seconds
  const [isBlurred, setIsBlurred] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef(Math.random().toString(36).substring(7));
  const watermarkPositions = useRef<{ x: number; y: number; rotation: number; opacity: number; scale?: number; isSpecial?: boolean }[]>([]);
  const [remainingViews, setRemainingViews] = useState(3); // Limit views per session
  const [showWarning, setShowWarning] = useState(false);
  const lastActivityTime = useRef(Date.now());
  const [deviceFingerprint, setDeviceFingerprint] = useState<DeviceFingerprint | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recordingCheckInterval = useRef<NodeJS.Timeout>();
  const lastScreenshotAttempt = useRef(Date.now());

  // Initialize device fingerprint
  useEffect(() => {
    const generateFingerprint = () => {
      const fingerprint: DeviceFingerprint = {
        browser: navigator.userAgent,
        os: navigator.platform,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timestamp: Date.now()
      };
      setDeviceFingerprint(fingerprint);
      
      // Store fingerprint in sessionStorage
      sessionStorage.setItem('deviceFingerprint', JSON.stringify(fingerprint));
    };

    generateFingerprint();
  }, []);

  // Enhanced watermark positions with dynamic patterns
  useEffect(() => {
    const positions = [];
    const density = window.innerWidth <= 768 ? 35 : 25; // Adjust density based on screen size
    
    // Create dynamic grid pattern
    for (let y = 5; y <= 95; y += density) {
      for (let x = 5; x <= 95; x += density) {
        const randomOffset = Math.random() * 10 - 5;
        positions.push({
          x: x + randomOffset,
          y: y + randomOffset,
          rotation: Math.random() * 360,
          opacity: Math.random() * 0.3 + 0.2, // Vary opacity between 0.2 and 0.5
          scale: Math.random() * 0.4 + 0.8 // Vary size between 0.8 and 1.2
        });
      }
    }

    // Add IP-based watermarks (placeholder)
    if (deviceFingerprint) {
      positions.push({
        x: 50,
        y: 50,
        rotation: 45,
        opacity: 0.3,
        scale: 1,
        isSpecial: true
      });
    }

    watermarkPositions.current = positions;
  }, [deviceFingerprint]);

  // Advanced screen recording detection
  useEffect(() => {
    const checkScreenRecording = () => {
      // Check for screen recording APIs
      const mediaDevices = navigator.mediaDevices as any;
      if (mediaDevices && mediaDevices.getDisplayMedia) {
        setIsRecording(true);
        setIsBlurred(true);
        showSecurityToast('Screen recording detected - Content protected');
      }
    };

    recordingCheckInterval.current = setInterval(checkScreenRecording, 1000);
    return () => {
      if (recordingCheckInterval.current) {
        clearInterval(recordingCheckInterval.current);
      }
    };
  }, []);

  // Enhanced screenshot prevention
  useEffect(() => {
    const handleScreenshotAttempt = () => {
      const now = Date.now();
      if (now - lastScreenshotAttempt.current < 1000) {
        return; // Prevent multiple triggers
      }
      lastScreenshotAttempt.current = now;

      setIsBlurred(true);
      showSecurityToast('Screenshot attempt detected');

      // Temporarily increase watermark density
      const positions = [...watermarkPositions.current];
      for (let i = 0; i < 10; i++) {
        positions.push({
          x: Math.random() * 90 + 5,
          y: Math.random() * 90 + 5,
          rotation: Math.random() * 360,
          opacity: 0.5,
          scale: 1.2
        });
      }
      watermarkPositions.current = positions;

      // Reset after delay
      setTimeout(() => {
        setIsBlurred(false);
      }, 3000);
    };

    // Enhanced keyboard shortcut detection
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isScreenshotCombo = (
        (isMac && e.metaKey && e.shiftKey && e.key === '4') || // Mac screenshot
        (isMac && e.metaKey && e.shiftKey && e.key === '3') || // Mac screenshot
        (!isMac && e.getModifierState('PrintScreen')) || // Windows screenshot
        (e.altKey && e.key === 'PrintScreen') // Alt + PrintScreen
      );

      if (isScreenshotCombo) {
        e.preventDefault();
        handleScreenshotAttempt();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
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

        const cleanCode = decodeURIComponent(accessCode).trim();
        console.log('Attempting to fetch content with code:', cleanCode);

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/content/${cleanCode}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Content not found');
        }

        console.log('Content found:', data);
        setContent(data);

        // Record view
        const { error: viewError } = await supabase
          .from('content_views')
          .insert([
            { 
              content_id: data.id, 
              content_user_id: data.user_id,
              viewed_at: new Date().toISOString()
            }
          ]);

        if (viewError) {
          console.error('Error recording view:', viewError);
        }

      } catch (err) {
        console.error('Error in fetchContent:', err);
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

  // Enhanced screenshot prevention for mobile
  useEffect(() => {
    let blurTimeout: NodeJS.Timeout;
    const preventScreenshotMobile = () => {
      setIsBlurred(true);
      showSecurityToast('Screenshots not allowed');
      
      // Clear any existing timeout
      if (blurTimeout) clearTimeout(blurTimeout);
      
      // Keep content blurred for longer
      blurTimeout = setTimeout(() => {
        setIsBlurred(false);
      }, 2000);
    };

    // Continuous check for screenshot attempts
    const checkInterval = setInterval(() => {
      if (document.hidden) {
        preventScreenshotMobile();
      }
    }, 500);

    // iOS screenshot detection
    const handleTouchStart = () => {
      preventScreenshotMobile();
    };

    // Android screenshot detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        preventScreenshotMobile();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('touchstart', handleTouchStart, { passive: false });
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      if (blurTimeout) clearTimeout(blurTimeout);
      clearInterval(checkInterval);
      window.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Browser-specific screenshot prevention
  useEffect(() => {
    // Prevent Safari screenshot
    const preventSafariScreenshot = `
      (function() {
        if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
          document.addEventListener('keydown', function(e) {
            if ((e.key === 'c' && (e.metaKey || e.ctrlKey)) || 
                (e.key === 'k' && e.metaKey) ||
                (e.key === 's' && (e.metaKey || e.ctrlKey))) {
              e.preventDefault();
              return false;
            }
          });
        }
      })();
    `;
    
    // Prevent Chrome/Opera screenshot
    const preventChromeScreenshot = `
      (function() {
        if (navigator.userAgent.includes('Chrome') || navigator.userAgent.includes('Opera')) {
          document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.shiftKey && 
                (e.key === 'I' || e.key === 'i' || e.key === 'C' || e.key === 'c')) {
              e.preventDefault();
              return false;
            }
          });
          
          // Disable developer tools
          document.addEventListener('contextmenu', function(e) {
            if (e.shiftKey) e.preventDefault();
          });
        }
      })();
    `;

    // Inject browser-specific protections
    const script = document.createElement('script');
    script.textContent = preventSafariScreenshot + preventChromeScreenshot;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // Inactivity detection
  useEffect(() => {
    const checkInactivity = () => {
      const currentTime = Date.now();
      if (currentTime - lastActivityTime.current > 60000) { // 1 minute of inactivity
        setIsBlurred(true);
        showSecurityToast('Content blurred due to inactivity');
      }
    };

    const resetActivity = () => {
      lastActivityTime.current = Date.now();
      setIsBlurred(false);
    };

    const interval = setInterval(checkInactivity, 10000); // Check every 10 seconds
    
    document.addEventListener('mousemove', resetActivity);
    document.addEventListener('keydown', resetActivity);
    document.addEventListener('touchstart', resetActivity);

    return () => {
      clearInterval(interval);
      document.removeEventListener('mousemove', resetActivity);
      document.removeEventListener('keydown', resetActivity);
      document.removeEventListener('touchstart', resetActivity);
    };
  }, []);

  // View limit warning
  useEffect(() => {
    if (remainingViews <= 1) {
      setShowWarning(true);
      showSecurityToast('Last viewing attempt remaining');
    }
  }, [remainingViews]);

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
                <p className="text-sm font-mono flex items-center">
                  <ClockIcon className="w-4 h-4 mr-1" />
                  <span>
                    {Math.floor(sessionTime / 60)}:{(sessionTime % 60).toString().padStart(2, '0')}
                  </span>
                </p>
              </div>
              <div className="bg-white/10 px-4 py-2 rounded-lg">
                <p className="text-sm font-mono flex items-center">
                  <EyeIcon className="w-4 h-4 mr-1" />
                  <span>{remainingViews} views left</span>
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
          style={{ 
            userSelect: 'none', 
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
            msUserSelect: 'none',
            touchAction: 'none',
            filter: isRecording ? 'blur(20px)' : ''
          }}
        >
          {/* Dynamic Watermarks */}
          {watermarkPositions.current.map((pos, i) => (
            <div
              key={i}
              className="absolute pointer-events-none select-none z-10"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: `rotate(${pos.rotation}deg) scale(${pos.scale || 1})`,
                opacity: pos.opacity,
                whiteSpace: 'nowrap',
                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                fontSize: pos.isSpecial ? '1rem' : '0.8rem',
                fontWeight: 'bold',
                color: pos.isSpecial ? '#ff0000' : '#00C6B3',
                mixBlendMode: 'difference'
              }}
            >
              {pos.isSpecial 
                ? `SecureView • ${deviceFingerprint?.timezone}`
                : `SecureView • ${sessionId.current} • ${content?.access_code}`
              }
            </div>
          ))}

          {/* Content with additional protection */}
          <div className="aspect-w-16 aspect-h-9 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/20 z-[5]" />
            <img
              src={content?.image_url}
              alt={content?.title}
              className="w-full h-full object-cover select-none"
              draggable="false"
              onContextMenu={(e) => e.preventDefault()}
              style={{
                pointerEvents: 'none',
                WebkitTouchCallout: 'none',
                position: 'relative',
                zIndex: 1,
                filter: 'contrast(1.05)',
                mixBlendMode: 'normal'
              }}
            />
            <div 
              className="absolute inset-0 z-[2]" 
              style={{ 
                background: 'radial-gradient(circle at center, transparent 30%, rgba(0,198,179,0.03) 70%)',
                mixBlendMode: 'overlay',
                pointerEvents: 'none'
              }} 
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

      {/* Warning Modal */}
      <AnimatePresence>
        {showWarning && (
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
              <h3 className="text-xl font-semibold mb-4 flex items-center text-red-600">
                <ShieldCheckIcon className="w-6 h-6 mr-2" />
                Warning: Last View
              </h3>
              <p className="text-gray-600">
                This is your last viewing attempt for this session. The content will be locked after this view.
              </p>
              <button
                onClick={() => setShowWarning(false)}
                className="mt-6 w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                I Understand
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 
