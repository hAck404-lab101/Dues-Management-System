'use client';

import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { useBranding } from '@/contexts/BrandingContext'

export default function Home() {
  const { appName } = useBranding();

  return (
    <div className="min-h-screen bg-neutral">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-primary-dark text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">{appName}</h1>
          <p className="text-xl md:text-2xl mb-2">Management System</p>
          <p className="text-lg opacity-90 mb-8">{appName.includes('UCC') ? 'University of Cape Coast' : ''}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <button className="btn-secondary text-lg px-8 py-3">Get Started</button>
            </Link>
            <Link href="/login">
              <button className="btn-outline text-white border-white hover:bg-white hover:text-primary text-lg px-8 py-3">
                Student Login
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-primary text-center mb-12">Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card text-center hover:shadow-lg transition-shadow">
              <div className="text-5xl mb-4">💳</div>
              <h3 className="text-2xl font-bold text-primary mb-3">Secure Payments</h3>
              <p className="text-gray-600">
                Make secure online payments using Paystack. Support for MTN MoMo, Vodafone Cash, AirtelTigo, and Bank Cards.
              </p>
            </div>

            <div className="card text-center hover:shadow-lg transition-shadow">
              <div className="text-5xl mb-4">📊</div>
              <h3 className="text-2xl font-bold text-primary mb-3">Track Dues</h3>
              <p className="text-gray-600">
                View all your assigned dues, payment history, and outstanding balances in one convenient dashboard.
              </p>
            </div>

            <div className="card text-center hover:shadow-lg transition-shadow">
              <div className="text-5xl mb-4">🧾</div>
              <h3 className="text-2xl font-bold text-primary mb-3">Digital Receipts</h3>
              <p className="text-gray-600">
                Automatic receipt generation with QR codes. Download and print your receipts anytime.
              </p>
            </div>

            <div className="card text-center hover:shadow-lg transition-shadow">
              <div className="text-5xl mb-4">📱</div>
              <h3 className="text-2xl font-bold text-primary mb-3">Mobile Friendly</h3>
              <p className="text-gray-600">
                Responsive design that works seamlessly on all devices - desktop, tablet, and mobile.
              </p>
            </div>

            <div className="card text-center hover:shadow-lg transition-shadow">
              <div className="text-5xl mb-4">⏱️</div>
              <h3 className="text-2xl font-bold text-primary mb-3">Real-time Updates</h3>
              <p className="text-gray-600">
                Get instant notifications about payment confirmations, new dues, and payment reminders.
              </p>
            </div>

            <div className="card text-center hover:shadow-lg transition-shadow">
              <div className="text-5xl mb-4">🔒</div>
              <h3 className="text-2xl font-bold text-primary mb-3">Secure & Transparent</h3>
              <p className="text-gray-600">
                All transactions are securely processed and recorded. Complete audit trail for all activities.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-neutral">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-primary text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">1</div>
              <h3 className="text-xl font-semibold mb-2">Register</h3>
              <p className="text-gray-600">Create your account with your index number, name, phone, and email</p>
            </div>
            <div className="text-center">
              <div className="bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">2</div>
              <h3 className="text-xl font-semibold mb-2">View Dues</h3>
              <p className="text-gray-600">Check your assigned departmental dues and outstanding balances</p>
            </div>
            <div className="text-center">
              <div className="bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">3</div>
              <h3 className="text-xl font-semibold mb-2">Make Payment</h3>
              <p className="text-gray-600">Pay online securely or upload proof of manual payment</p>
            </div>
            <div className="text-center">
              <div className="bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">4</div>
              <h3 className="text-xl font-semibold mb-2">Get Receipt</h3>
              <p className="text-gray-600">Receive automatic receipt and track your payment history</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-primary text-center mb-12">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="card">
              <h3 className="text-xl font-bold text-primary mb-2">How do I register?</h3>
              <p className="text-gray-600">
                Click on "Register" and provide your index number, full name, phone number, and email address.
                You'll also need to create a secure password.
              </p>
            </div>

            <div className="card">
              <h3 className="text-xl font-bold text-primary mb-2">What payment methods are accepted?</h3>
              <p className="text-gray-600">
                We accept payments through Paystack, which supports MTN MoMo, Vodafone Cash, AirtelTigo,
                and Bank Cards. You can also submit proof of manual payments for admin approval.
              </p>
            </div>

            <div className="card">
              <h3 className="text-xl font-bold text-primary mb-2">How do I view my receipts?</h3>
              <p className="text-gray-600">
                Once a payment is approved, you'll receive an automatic receipt. You can download and print
                receipts from your dashboard under the "Receipts" section.
              </p>
            </div>

            <div className="card">
              <h3 className="text-xl font-bold text-primary mb-2">What if I forget my password?</h3>
              <p className="text-gray-600">
                On the login page, click "Forgot password?" and enter your email address.
                You'll receive a password reset link via email.
              </p>
            </div>

            <div className="card">
              <h3 className="text-xl font-bold text-primary mb-2">How long does manual payment approval take?</h3>
              <p className="text-gray-600">
                Manual payments are typically reviewed and approved within 24-48 hours by the department administrators.
                You'll receive an email notification once your payment is approved.
              </p>
            </div>

            <div className="card">
              <h3 className="text-xl font-bold text-primary mb-2">Can I make partial payments?</h3>
              <p className="text-gray-600">
                Yes, you can make partial payments. The system will track your balance and show how much you still owe
                until the full amount is paid.
              </p>
            </div>

            <div className="card">
              <h3 className="text-xl font-bold text-primary mb-2">Is my payment information secure?</h3>
              <p className="text-gray-600">
                Absolutely! All payments are processed through Paystack, a PCI DSS compliant payment processor.
                We don't store your card details, and all transactions are encrypted.
              </p>
            </div>

            <div className="card">
              <h3 className="text-xl font-bold text-primary mb-2">Who can I contact for support?</h3>
              <p className="text-gray-600">
                For any issues or questions, please contact your department's treasurer or financial secretary.
                You can also reach out through your department's official channels.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-primary to-primary-dark text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8 opacity-90">Join thousands of students managing their dues efficiently</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <button className="btn-secondary text-lg px-8 py-3">Create Account</button>
            </Link>
            <Link href="/login">
              <button className="btn-outline text-white border-white hover:bg-white hover:text-primary text-lg px-8 py-3">
                Login to Dashboard
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary-dark text-white py-8">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-bold mb-4">{appName}</h3>
              <p className="text-sm opacity-90">
                A secure, transparent digital system for managing departmental dues.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/#features" className="hover:text-secondary transition-colors">Features</Link></li>
                <li><Link href="/#faq" className="hover:text-secondary transition-colors">FAQ</Link></li>
                <li><Link href="/login" className="hover:text-secondary transition-colors">Login</Link></li>
                <li><Link href="/register" className="hover:text-secondary transition-colors">Register</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Contact</h3>
              <p className="text-sm opacity-90">
                {appName}<br />
                Management Portal<br />
                <a href="mailto:support@ucc.edu.gh" className="hover:text-secondary transition-colors">
                  support@ucc.edu.gh
                </a>
              </p>
            </div>
          </div>
          <div className="border-t border-primary-light pt-8 text-center text-sm opacity-75">
            <p>© {new Date().getFullYear()} {appName}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
