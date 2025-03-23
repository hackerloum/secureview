'use client';

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0A1A2F] to-[#1A2B4F]">
      <div className="text-center space-y-6">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Welcome to SecureView
        </h1>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          Share your content securely with unique access codes. Simple, secure, and professional content sharing for businesses and creators.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="bg-[#00C6B3] text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-[#00a396] transition-colors shadow-lg hover:shadow-xl"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
