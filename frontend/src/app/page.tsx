'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useBranding } from '@/contexts/BrandingContext';
import { CardIcon, ChartIcon, ReceiptIcon, SmsIcon, ClockIcon, ShieldIcon, CertificateIcon, WalletIcon } from '@/components/Icons';

const portalFeatures = [
  { title: 'View Your Dues', text: 'Check assigned dues and see what has been paid or is still outstanding.', icon: WalletIcon },
  { title: 'Make Payment', text: 'Pay online or follow the approved manual payment process provided by your department.', icon: CardIcon },
  { title: 'Download Receipts', text: 'Access official receipts after confirmed payments and keep them for your records.', icon: ReceiptIcon },
  { title: 'Check Clearance', text: 'Use payment records to know whether you are cleared or still have a balance to settle.', icon: CertificateIcon },
  { title: 'Receive Updates', text: 'Get important account and payment updates through your registered contact details.', icon: SmsIcon },
  { title: 'Protected Records', text: 'Your dues, payments, and receipts are handled inside a secure student portal.', icon: ShieldIcon },
];

const classicFeatures = [
  { title: 'Secure Payments', text: 'Make secure online payments using supported mobile money and card options.', icon: CardIcon },
  { title: 'Track Dues', text: 'View assigned dues, payment history, and outstanding balances in one dashboard.', icon: ChartIcon },
  { title: 'Digital Receipts', text: 'Automatic receipt generation. Download and verify receipts anytime.', icon: ReceiptIcon },
  { title: 'Mobile Friendly', text: 'Access the portal on desktop, tablet, or mobile devices.', icon: SmsIcon },
  { title: 'Payment Updates', text: 'Receive updates about payment confirmations, dues, and account activity.', icon: ClockIcon },
  { title: 'Secure Records', text: 'Transactions are recorded securely for proper accountability.', icon: ShieldIcon },
];

export default function Home() {
  const { homepageVariant, loading } = useBranding();

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral">
        <Navbar />
        <main className="container mx-auto px-4 py-10">
          <div className="card p-8 min-h-[280px] flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-bold text-primary">Loading homepage...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return homepageVariant === 'classic' ? <ClassicHomepage /> : <PortalHomepage />;
}

function PortalHomepage() {
  const { appName } = useBranding();

  return (
    <div className="min-h-screen bg-neutral">
      <Navbar />

      <main className="container mx-auto px-0 sm:px-4 py-0 sm:py-10">
        <section className="bg-white sm:rounded-2xl sm:shadow-sm sm:border sm:border-gray-100 overflow-hidden">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-7 lg:gap-12 items-center p-5 sm:p-8 lg:p-10">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{appName}</p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight text-primary mb-4">
                Pay dues, view receipts, and check your records.
              </h1>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-2xl mb-6">
                Use your student account to view assigned dues, make payments, download official receipts, and follow your clearance status.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/login" className="btn-primary px-6 py-3 font-bold text-center">Student Login</Link>
                <Link href="/verify-receipt" className="btn-secondary px-6 py-3 font-bold text-center">Verify Receipt</Link>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Student Account</p>
                  <h2 className="font-extrabold text-primary text-lg mt-1">Payment Summary</h2>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center">
                  <span className="w-5 h-5"><WalletIcon /></span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 py-4">
                <SummaryCard label="Dues" value="Assigned" />
                <SummaryCard label="Receipts" value="Available" />
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-primary text-sm">Latest payment</p>
                    <p className="text-xs text-gray-500 mt-1">Receipts appear after payment confirmation.</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold">Confirmed</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-4 mt-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-primary text-sm">Receipt verification</p>
                  <p className="text-xs text-gray-500 mt-1">Confirm a receipt using its receipt number.</p>
                </div>
                <span className="w-9 h-9 rounded-lg bg-primary/5 text-primary flex items-center justify-center shrink-0"><ReceiptIcon /></span>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="px-4 sm:px-0 py-8 sm:py-10">
          <div className="mb-5 sm:mb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-primary">Student services</h2>
            <p className="text-sm text-gray-500 mt-2">Common actions available in the student portal.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {portalFeatures.map((feature) => <FeatureCard key={feature.title} {...feature} />)}
          </div>
        </section>

        <section className="mx-4 sm:mx-0 bg-white sm:rounded-2xl sm:border sm:border-gray-100 sm:shadow-sm overflow-hidden mb-8">
          <div className="grid lg:grid-cols-[1fr_auto] gap-5 items-center p-5 sm:p-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-primary">Verify a receipt</h2>
              <p className="text-sm text-gray-500 mt-2 max-w-2xl">
                Use the receipt number from your SMS or downloaded receipt to confirm that the payment record exists in the system.
              </p>
            </div>
            <Link href="/verify-receipt" className="btn-primary px-6 py-3 font-bold text-center">Verify Receipt</Link>
          </div>
        </section>
      </main>

      <StudentFooter appName={appName} />
    </div>
  );
}

function ClassicHomepage() {
  const { appName } = useBranding();

  return (
    <div className="min-h-screen bg-neutral">
      <Navbar />

      <section className="bg-primary text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">{appName}</h1>
          <p className="text-xl md:text-2xl mb-2">Management System</p>
          <p className="text-lg opacity-90 mb-8">A secure student dues payment and records portal</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="btn-secondary text-lg px-8 py-3">Get Started</Link>
            <Link href="/login" className="bg-white text-primary hover:bg-gray-50 text-lg px-8 py-3 rounded-lg font-bold transition-colors">Student Login</Link>
          </div>
        </div>
      </section>

      <section id="features" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-primary text-center mb-12">Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {classicFeatures.map((feature) => <ClassicFeatureCard key={feature.title} {...feature} />)}
          </div>
        </div>
      </section>

      <section className="py-16 bg-neutral">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-primary text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            <Step number="1" title="Register" text="Create your account with your student details" />
            <Step number="2" title="View Dues" text="Check assigned dues and outstanding balances" />
            <Step number="3" title="Make Payment" text="Pay online or submit approved manual proof" />
            <Step number="4" title="Get Receipt" text="Receive and verify your official receipt" />
          </div>
        </div>
      </section>

      <section className="py-16 bg-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8 opacity-90">Manage your dues, payments, and receipts efficiently</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="btn-secondary text-lg px-8 py-3">Create Account</Link>
            <Link href="/login" className="bg-white text-primary hover:bg-gray-50 text-lg px-8 py-3 rounded-lg font-bold transition-colors">Student Login</Link>
          </div>
        </div>
      </section>

      <StudentFooter appName={appName} />
    </div>
  );
}

function FeatureCard({ title, text, icon: Icon }: any) {
  return (
    <div className="card p-5 border border-gray-100 shadow-sm">
      <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center mb-4">
        <span className="w-5 h-5"><Icon /></span>
      </div>
      <h3 className="text-base font-extrabold text-primary mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{text}</p>
    </div>
  );
}

function ClassicFeatureCard({ title, text, icon: Icon }: any) {
  return (
    <div className="card text-center hover:shadow-lg transition-shadow flex flex-col items-center">
      <div className="w-12 h-12 text-primary mb-4"><Icon /></div>
      <h3 className="text-2xl font-bold text-primary mb-3">{title}</h3>
      <p className="text-gray-600">{text}</p>
    </div>
  );
}

function Step({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="text-center">
      <div className="bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">{number}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{text}</p>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="font-extrabold text-primary mt-1">{value}</p>
    </div>
  );
}

function StudentFooter({ appName }: { appName: string }) {
  return (
    <footer className="bg-primary-dark text-white py-8">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-bold mb-4">{appName}</h3>
            <p className="text-sm opacity-90">A student portal for dues, receipts, and clearance records.</p>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/#features" className="hover:text-secondary transition-colors">Student Services</Link></li>
              <li><Link href="/verify-receipt" className="hover:text-secondary transition-colors">Verify Receipt</Link></li>
              <li><Link href="/login" className="hover:text-secondary transition-colors">Student Login</Link></li>
              <li><Link href="/admin/login" className="hover:text-secondary transition-colors">Admin Login</Link></li>
              <li><Link href="/privacy" className="hover:text-secondary transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-secondary transition-colors">Terms & Conditions</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4">Support</h3>
            <p className="text-sm opacity-90">For help with dues or payment records, contact the official department representative.</p>
          </div>
        </div>
        <div className="border-t border-primary-light pt-8 text-center text-sm opacity-75">
          <p>© {new Date().getFullYear()} {appName}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
