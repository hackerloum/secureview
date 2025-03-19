'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '../../lib/supabase';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';

export default function AccessPage() {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const trimmedCode = accessCode.trim();
      if (!trimmedCode) {
        setError('Please enter an access code');
        return;
      }

      console.log('Validating access code:', trimmedCode);

      // Test database connection first
      const { data: testData, error: testError } = await supabase
        .from('contents')
        .select('count')
        .limit(1);

      if (testError) {
        console.error('Database connection error:', testError);
        setError('Failed to connect to database. Please try again later.');
        return;
      }

      console.log('Database connection test:', testData);

      // Now try to find the specific content with more detailed error handling
      const { data, error: fetchError } = await supabase
        .from('contents')
        .select('*')
        .eq('access_code', trimmedCode)
        .maybeSingle();

      if (fetchError) {
        console.error('Error checking access code:', fetchError);
        setError('Failed to verify access code. Please try again.');
        return;
      }

      console.log('Query result:', data);

      if (!data) {
        // Double check if the content exists with a different query
        const { data: checkData, error: checkError } = await supabase
          .from('contents')
          .select('*')
          .ilike('access_code', trimmedCode)
          .maybeSingle();

        if (checkError) {
          console.error('Error in double check:', checkError);
        } else {
          console.log('Double check result:', checkData);
        }

        console.log('No content found for access code:', trimmedCode);
        setError('Invalid access code. Please check and try again.');
        return;
      }

      // If we found the content, redirect to view page
      console.log('Content found:', data);
      router.push(`/view?code=${encodeURIComponent(trimmedCode)}`);
    } catch (err) {
      console.error('Error validating access code:', err);
      setError('Failed to validate access code. Please try again.');
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
