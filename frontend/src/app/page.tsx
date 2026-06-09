'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useBranding } from '@/contexts/BrandingContext';
import { CardIcon, ReceiptIcon, SmsIcon, ShieldIcon, CertificateIcon, WalletIcon } from '@/components/Icons';

const features = [
  {
    title: 'View Your Dues',
    text: 'Check the dues assigned to your account and see what has been paid or is still outstanding.',
    icon: WalletIcon,
  },
  {
    title: 'Make Payment',
    text: 'Pay online or follow the approved manual payment process provided by your department.',
    icon: CardIcon,
  },
  {
    title: 'Download Receipts',
    text: 'Access official receipts after confirmed payments and keep them for your records.',
    icon: ReceiptIcon,
  },
  {
    title: 'Check Clearance',
    text: 'Use your payment records to know whether you are cleared or still have a balance to settle.',
    icon: CertificateIcon,
  },
  {
    title: 'Receive Updates',
    text: 'Get important payment and account updates through the official contact details on your profile.',
    icon: SmsIcon,
  },
  {
    title: 'Protected Records',
    text: 'Your payment information and receipts are handled through a secure student portal.',
    icon: ShieldIcon,
  },
];

export default function Home() {
  const { appName } = useBranding();

  return (
    <div className="min-h-screen bg-neutral">
      <Navbar />

      <section className="relative overflow-hidden bg-primary text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(242,169,0,0.22),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.1),transparent_30%)]" />
        <div className="container mx-auto px-4 py-16 sm:py-20 lg:py-24 relative z-10">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-14 items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.03] tracking-tight mb-5">
                Pay Dues. Track Receipts. Get Cleared Faster.
              </h1>
              <p className="text-base sm:text-lg text-white/80 leading-relaxed max-w-2xl mb-8">
                {appName} gives students a simple place to view assigned dues, make payments, download receipts, and check payment records.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <Link href="/login" className="btn-secondary px-6 py-3 font-extrabold">Student Login</Link>
                <Link href="/verify-receipt" className="px-6 py-3 rounded-lg bg-white/10 border border-white/15 hover:bg-white/15 font-extrabold text-center transition-colors">Verify Receipt</Link>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 bg-secondary/10 blur-3xl rounded-full" />
              <div className="relative bg-white text-primary rounded-[2rem] shadow-2xl border border-white/60 overflow-hidden">
                <div className="p-5 sm:p-6 border-b bg-gray-50 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Student Account</p>
                    <h2 className="font-extrabold text-lg">Payment Summary</h2>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center">
                    <span className="w-6 h-6"><WalletIcon /></span>
                  </div>
                </div>
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <DashCard label="Dues" value="Assigned" tone="warning" />
                    <DashCard label="Receipts" value="Available" tone="success" />
                  </div>
                  <div className="rounded-2xl border border-gray-100 p-4">
                    <div className="flex justify-between items-center mb-3 gap-4">
                      <div>
                        <p className="font-bold text-sm">Latest Payment</p>
                        <p className="text-xs text-gray-500">Receipts appear after confirmation</p>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold">Confirmed</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full w-4/5 bg-secondary rounded-full" />
                    </div>
                  </div>
                  <div className="rounded-2xl bg-primary text-white p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-white/60 text-xs font-bold uppercase tracking-wider">Receipt Check</p>
                      <p className="font-extrabold">Verify with receipt number</p>
                    </div>
                    <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><ReceiptIcon /></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-14 sm:py-18 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-primary">What students can do</h2>
            <p className="text-gray-500 mt-3">Everything on this page is focused on student payments, receipts, and clearance records.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 bg-white">
        <div className="container mx-auto px-4">
          <div className="rounded-[2rem] bg-primary text-white p-6 sm:p-10 relative overflow-hidden">
            <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-secondary/20" />
            <div className="absolute right-20 -bottom-20 w-64 h-64 rounded-full bg-white/10" />
            <div className="relative z-10 grid lg:grid-cols-[1fr_auto] gap-6 items-center">
              <div>
                <h2 className="text-2xl sm:text-4xl font-extrabold mb-3">Verify a receipt</h2>
                <p className="text-white/75 max-w-2xl">Use the receipt number from your SMS or downloaded receipt to confirm that the payment record exists in the system.</p>
              </div>
              <Link href="/verify-receipt" className="btn-secondary px-6 py-3 font-extrabold whitespace-nowrap">Verify Receipt</Link>
            </div>
          </div>
        </div>
      </section>

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
                <li><Link href="/#features" className="hover:text-secondary transition-colors">Student Features</Link></li>
                <li><Link href="/verify-receipt" className="hover:text-secondary transition-colors">Verify Receipt</Link></li>
                <li><Link href="/login" className="hover:text-secondary transition-colors">Student Login</Link></li>
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
    </div>
  );
}

function FeatureCard({ title, text, icon: Icon }: any) {
  return (
    <div className="card p-6 border border-gray-100 hover:shadow-lg transition-all group">
      <div className="w-12 h-12 rounded-2xl bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-colors flex items-center justify-center mb-5">
        <span className="w-6 h-6"><Icon /></span>
      </div>
      <h3 className="text-lg font-extrabold text-primary mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{text}</p>
    </div>
  );
}

function DashCard({ label, value, tone }: { label: string; value: string; tone: 'warning' | 'success' }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4 border border-gray-100">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`font-extrabold mt-1 ${tone === 'success' ? 'text-green-700' : 'text-secondary'}`}>{value}</p>
    </div>
  );
}
