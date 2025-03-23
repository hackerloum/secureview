'use client';

import { useRouter } from 'next/navigation';
import { FaLock, FaEye, FaTachometerAlt, FaEnvelope, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';
import { FiGithub, FiTwitter, FiLinkedin } from 'react-icons/fi';
import { useEffect, useState } from 'react';
import Image from 'next/image';

const companies = [
  'Microsoft', 'Google', 'Amazon', 'Apple', 'Meta',
  'Netflix', 'Adobe', 'Salesforce', 'Oracle', 'IBM',
  'Intel', 'Cisco', 'Samsung', 'Sony', 'Dell',
  'HP', 'NVIDIA', 'Qualcomm', 'VMware', 'Autodesk'
];

const securityPhrases = [
  'Secure Content Sharing',
  'Protected Data Access',
  'Encrypted Communication',
  'Safe File Transfer',
  'Private Information Exchange',
  'Secure Collaboration',
  'Protected Digital Assets',
  'Safe Content Delivery',
  'Secure Information Flow',
  'Protected Data Exchange',
];

export default function Home() {
  const router = useRouter();
  const [currentPhrase, setCurrentPhrase] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const typeSpeed = isDeleting ? 50 : 100;
    const timeout = setTimeout(() => {
      if (isDeleting) {
        setDisplayedText(securityPhrases[currentPhrase].substring(0, charIndex - 1));
        setCharIndex(charIndex - 1);
        if (charIndex === 0) {
          setIsDeleting(false);
          setCurrentPhrase((prev) => (prev + 1) % securityPhrases.length);
        }
      } else {
        setDisplayedText(securityPhrases[currentPhrase].substring(0, charIndex + 1));
        setCharIndex(charIndex + 1);
        if (charIndex === securityPhrases[currentPhrase].length) {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      }
    }, typeSpeed);

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, currentPhrase]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible((prev) => !prev);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1A2F] to-[#1A2B4F]">
      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0A1A2F]/50 to-[#0A1A2F]"></div>
        <div className="text-center space-y-6 max-w-4xl mx-auto relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 min-h-[120px]">
            {displayedText}
            <span className="text-[#00C6B3]"> Made Simple</span>
            <span className={`inline-block w-1 h-8 bg-white ml-1 ${isVisible ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}></span>
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Share your content securely with unique access codes. Perfect for businesses and creators who value privacy and control.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/login')}
              className="bg-[#00C6B3] text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-[#00a396] transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
            >
              Get Started
            </button>
            <button
              onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-white/10 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-white/20 transition-all duration-300 backdrop-blur-sm hover:scale-105"
            >
              Learn More
            </button>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0A1A2F] to-transparent"></div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 px-4 bg-white/5 backdrop-blur-sm relative">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5"></div>
        <div className="max-w-6xl mx-auto relative">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">Our Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm hover:bg-white/20 transition-all duration-300 hover:scale-105 group">
              <div className="w-12 h-12 bg-[#00C6B3] rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <FaLock className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Secure Access Codes</h3>
              <p className="text-gray-300">Generate unique, one-time access codes for your content. Control who sees what and when.</p>
            </div>
            <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm hover:bg-white/20 transition-all duration-300 hover:scale-105 group">
              <div className="w-12 h-12 bg-[#00C6B3] rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <FaEye className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Content Control</h3>
              <p className="text-gray-300">Monitor views, set expiration dates, and revoke access at any time.</p>
            </div>
            <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm hover:bg-white/20 transition-all duration-300 hover:scale-105 group">
              <div className="w-12 h-12 bg-[#00C6B3] rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <FaTachometerAlt className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Analytics Dashboard</h3>
              <p className="text-gray-300">Track views, manage content, and control access from one intuitive dashboard.</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 px-4 relative">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5"></div>
        <div className="max-w-6xl mx-auto relative">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">About Us</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-4">
              <p className="text-gray-300 text-lg">
                SecureView was founded with a simple mission: to make secure content sharing accessible to everyone. We understand that in today's digital world, protecting your content is more important than ever.
              </p>
              <p className="text-gray-300 text-lg">
                Our platform combines powerful security features with an intuitive interface, making it the perfect solution for businesses and creators who need to share sensitive content with confidence.
              </p>
            </div>
            <div className="bg-white/10 p-8 rounded-xl backdrop-blur-sm hover:bg-white/20 transition-all duration-300">
              <h3 className="text-2xl font-semibold text-white mb-4">Why Choose Us?</h3>
              <ul className="space-y-3">
                {[
                  'Enterprise-grade security',
                  'Easy-to-use interface',
                  'Real-time analytics',
                  '24/7 customer support',
                  'Customizable access controls'
                ].map((item, index) => (
                  <li key={index} className="flex items-center text-gray-300 group">
                    <span className="w-2 h-2 bg-[#00C6B3] rounded-full mr-3 group-hover:scale-150 transition-transform duration-300"></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="py-20 px-4 bg-white/5 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5"></div>
        <div className="max-w-6xl mx-auto relative">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">Trusted By</h2>
          <div className="relative h-[100px] overflow-hidden">
            <div className="absolute inset-0 flex animate-scroll">
              <div className="flex space-x-8 items-center">
                {[...companies, ...companies].map((company, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-center px-6 py-3 bg-white/10 rounded-xl backdrop-blur-sm hover:bg-white/20 transition-all duration-300 group"
                  >
                    <span className="text-white font-medium group-hover:text-[#00C6B3] transition-colors">
                      {company}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-4 relative">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5"></div>
        <div className="max-w-6xl mx-auto relative">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">Contact Us</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <div className="flex items-start space-x-4 group">
                <div className="w-12 h-12 bg-[#00C6B3] rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <FaEnvelope className="text-white text-xl" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-1">Email</h3>
                  <p className="text-gray-300">support@secureview.com</p>
                </div>
              </div>
              <div className="flex items-start space-x-4 group">
                <div className="w-12 h-12 bg-[#00C6B3] rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <FaPhone className="text-white text-xl" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-1">Phone</h3>
                  <p className="text-gray-300">+1 (555) 123-4567</p>
                </div>
              </div>
              <div className="flex items-start space-x-4 group">
                <div className="w-12 h-12 bg-[#00C6B3] rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <FaMapMarkerAlt className="text-white text-xl" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-1">Address</h3>
                  <p className="text-gray-300">123 Business Street, Suite 100<br />New York, NY 10001</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 p-8 rounded-xl backdrop-blur-sm hover:bg-white/20 transition-all duration-300">
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                  <input
                    type="text"
                    className="w-full bg-white/5 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#00C6B3] transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full bg-white/5 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#00C6B3] transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Message</label>
                  <textarea
                    className="w-full bg-white/5 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#00C6B3] h-32 transition-all duration-300"
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#00C6B3] text-white py-2 px-4 rounded-lg hover:bg-[#00a396] transition-all duration-300 hover:scale-105"
                >
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white/5 py-12 px-4 relative">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5"></div>
        <div className="max-w-6xl mx-auto relative">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold text-white mb-4">SecureView</h3>
              <p className="text-gray-300">Secure content sharing made simple.</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Quick Links</h4>
              <ul className="space-y-2">
                {['Home', 'Services', 'About', 'Contact'].map((item) => (
                  <li key={item}>
                    <a href={`#${item.toLowerCase()}`} className="text-gray-300 hover:text-white transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2">
                {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-gray-300 hover:text-white transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Connect</h4>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-300 hover:text-white transition-colors hover:scale-110">
                  <FiGithub className="w-6 h-6" />
                </a>
                <a href="#" className="text-gray-300 hover:text-white transition-colors hover:scale-110">
                  <FiTwitter className="w-6 h-6" />
                </a>
                <a href="#" className="text-gray-300 hover:text-white transition-colors hover:scale-110">
                  <FiLinkedin className="w-6 h-6" />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-300">
            <p>&copy; {new Date().getFullYear()} SecureView. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
