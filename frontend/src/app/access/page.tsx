'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '../../lib/supabase';
import { ShieldCheckIcon, QrCodeIcon } from '@heroicons/react/24/outline';
import { QRCodeSVG } from 'qrcode.react';

export default function AccessPage() {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  const generateQRCode = () => {
    const url = `${window.location.origin}/view?code=${encodeURIComponent(accessCode)}`;
    setQrCodeUrl(url);
    setShowQRCode(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setShowQRCode(false);

    try {
      const trimmedCode = accessCode.trim();
      if (!trimmedCode) {
        setError('Please enter an access code');
        return;
      }

      console.log('Validating access code:', trimmedCode);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/content/${trimmedCode}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Content not found');
      }

      console.log('Content found:', data);
      generateQRCode();
    } catch (err: any) {
      console.error('Error validating access code:', err);
      setError(err.message || 'Failed to validate access code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A1A2F]">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <ShieldCheckIcon className="w-16 h-16 text-[#00C6B3] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Enter Access Code</h1>
          <p className="text-gray-600">
            Please enter the access code provided to view the content.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="accessCode" className="block text-sm font-medium text-gray-700 mb-2">
              Access Code
            </label>
            <input
              id="accessCode"
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00C6B3] focus:border-transparent"
              placeholder="Enter your access code"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00C6B3] text-white py-2 px-4 rounded-lg hover:bg-[#00a396] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Validating...' : 'View Content'}
          </button>
        </form>

        {showQRCode && (
          <div className="mt-8 text-center">
            <div className="bg-white p-4 rounded-lg shadow-lg inline-block">
              <QrCodeIcon className="w-8 h-8 text-[#00C6B3] mx-auto mb-2" />
              <QRCodeSVG value={qrCodeUrl} size={200} />
              <p className="mt-2 text-sm text-gray-600">
                Scan this QR code to view the content on your mobile device
              </p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => router.push(`/view?code=${encodeURIComponent(accessCode)}`)}
                className="text-sm text-[#00C6B3] hover:text-[#00a396]"
              >
                Or click here to view directly
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
} 
