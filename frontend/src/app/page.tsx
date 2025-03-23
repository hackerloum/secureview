'use client';

import { useRouter } from 'next/navigation';
import { FaLock, FaEye, FaTachometerAlt, FaEnvelope, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';
import { FiGithub, FiTwitter, FiLinkedin } from 'react-icons/fi';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1A2F] to-[#1A2B4F]">
      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            Secure Content Sharing
            <span className="text-[#00C6B3]"> Made Simple</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Share your content securely with unique access codes. Perfect for businesses and creators who value privacy and control.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/login')}
              className="bg-[#00C6B3] text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-[#00a396] transition-colors shadow-lg hover:shadow-xl"
            >
              Get Started
            </button>
            <button
              onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-white/10 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-white/20 transition-colors backdrop-blur-sm"
            >
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 px-4 bg-white/5 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">Our Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm hover:bg-white/20 transition-colors">
              <div className="w-12 h-12 bg-[#00C6B3] rounded-lg flex items-center justify-center mb-4">
                <FaLock className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Secure Access Codes</h3>
              <p className="text-gray-300">Generate unique, one-time access codes for your content. Control who sees what and when.</p>
            </div>
            <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm hover:bg-white/20 transition-colors">
              <div className="w-12 h-12 bg-[#00C6B3] rounded-lg flex items-center justify-center mb-4">
                <FaEye className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Content Control</h3>
              <p className="text-gray-300">Monitor views, set expiration dates, and revoke access at any time.</p>
            </div>
            <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm hover:bg-white/20 transition-colors">
              <div className="w-12 h-12 bg-[#00C6B3] rounded-lg flex items-center justify-center mb-4">
                <FaTachometerAlt className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Analytics Dashboard</h3>
              <p className="text-gray-300">Track views, manage content, and control access from one intuitive dashboard.</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
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
            <div className="bg-white/10 p-8 rounded-xl backdrop-blur-sm">
              <h3 className="text-2xl font-semibold text-white mb-4">Why Choose Us?</h3>
              <ul className="space-y-3">
                {[
                  'Enterprise-grade security',
                  'Easy-to-use interface',
                  'Real-time analytics',
                  '24/7 customer support',
                  'Customizable access controls'
                ].map((item, index) => (
                  <li key={index} className="flex items-center text-gray-300">
                    <span className="w-2 h-2 bg-[#00C6B3] rounded-full mr-3"></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="py-20 px-4 bg-white/5 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">Trusted By</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {['Company 1', 'Company 2', 'Company 3', 'Company 4'].map((company, index) => (
              <div key={index} className="bg-white/10 p-6 rounded-xl backdrop-blur-sm text-center">
                <div className="text-white text-xl font-semibold">{company}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">Contact Us</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-[#00C6B3] rounded-lg flex items-center justify-center flex-shrink-0">
                  <FaEnvelope className="text-white text-xl" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-1">Email</h3>
                  <p className="text-gray-300">support@secureview.com</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-[#00C6B3] rounded-lg flex items-center justify-center flex-shrink-0">
                  <FaPhone className="text-white text-xl" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-1">Phone</h3>
                  <p className="text-gray-300">+1 (555) 123-4567</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-[#00C6B3] rounded-lg flex items-center justify-center flex-shrink-0">
                  <FaMapMarkerAlt className="text-white text-xl" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-1">Address</h3>
                  <p className="text-gray-300">123 Business Street, Suite 100<br />New York, NY 10001</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 p-8 rounded-xl backdrop-blur-sm">
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                  <input
                    type="text"
                    className="w-full bg-white/5 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#00C6B3]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full bg-white/5 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#00C6B3]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Message</label>
                  <textarea
                    className="w-full bg-white/5 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#00C6B3] h-32"
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#00C6B3] text-white py-2 px-4 rounded-lg hover:bg-[#00a396] transition-colors"
                >
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white/5 py-12 px-4">
        <div className="max-w-6xl mx-auto">
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
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  <FiGithub className="w-6 h-6" />
                </a>
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  <FiTwitter className="w-6 h-6" />
                </a>
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
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
