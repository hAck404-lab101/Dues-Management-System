'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useBranding } from '@/contexts/BrandingContext';
import { CardIcon, ReceiptIcon, SmsIcon, ShieldIcon, CertificateIcon, WalletIcon } from '@/components/Icons';

const features = [
  {
    title: 'View Your Dues',
    text: 'Check assigned dues and see what has been paid or is still outstanding.',
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
    text: 'Use payment records to know whether you are cleared or still have a balance to settle.',
    icon: CertificateIcon,
  },
  {
    title: 'Receive Updates',
    text: 'Get important account and payment updates through your registered contact details.',
    icon: SmsIcon,
  },
  {
    title: 'Protected Records',
    text: 'Your dues, payments, and receipts are handled inside a secure student portal.',
    icon: ShieldIcon,
  },
];

export default function Home() {
  const { appName } = useBranding();

  return (
    <div className="min-h-screen bg-neutral">
      <Navbar />

      <main className="container mx-auto px-4 py-8 sm:py-10">
        <section className="card overflow-hidden p-0 border border-gray-100">
          <div className="h-2 bg-secondary" />
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 lg:gap-12 items-center p-5 sm:p-8 lg:p-10">
            <div>
              <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-3">{appName}</p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight text-primary mb-4">
                Pay dues, view receipts, and check your records.
              </h1>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-2xl mb-6">
                Use your student account to view assigned dues, make payments, download official receipts, and follow your clearance status.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/login" className="btn-primary px-6 py-3 font-bold">Student Login</Link>
                <Link href="/verify-receipt" className="bg-secondary text-primary px-6 py-3 rounded-lg font-extrabold text-center hover:opacity-90 transition-opacity">Verify Receipt</Link>
              </div>
            </div>

            <div className="bg-primary text-white rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between pb-4 border-b border-white/15">
                <div>
                  <p className="text-xs font-bold text-white/60 uppercase tracking-widest">Student Account</p>
                  <h2 className="font-extrabold text-lg mt-1">Payment Summary</h2>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center">
                  <span className="w-5 h-5"><WalletIcon /></span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 py-4">
                <SummaryCard label="Dues" value="Assigned" />
                <SummaryCard label="Receipts" value="Available" />
              </div>

              <div className="bg-white/10 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-sm">Latest payment</p>
                    <p className="text-xs text-white/65 mt-1">Receipts appear after payment confirmation.</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-secondary text-primary text-xs font-bold">Confirmed</span>
                </div>
              </div>

              <div className="bg-white/10 rounded-xl p-4 mt-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-sm">Receipt verification</p>
                  <p className="text-xs text-white/65 mt-1">Confirm a receipt using its receipt number.</p>
                </div>
                <span className="w-9 h-9 rounded-lg bg-secondary text-primary flex items-center justify-center shrink-0"><ReceiptIcon /></span>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-8 sm:py-10">
          <div className="mb-5 sm:mb-6 border-l-4 border-secondary pl-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-primary">Student services</h2>
            <p className="text-sm text-gray-500 mt-2">Common actions available in the student portal.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </section>

        <section className="card overflow-hidden p-0 mb-8 border border-gray-100">
          <div className="h-2 bg-secondary" />
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
    <div className="card p-5 border border-gray-100 shadow-sm">
      <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center mb-4">
        <span className="w-5 h-5"><Icon /></span>
      </div>
      <h3 className="text-base font-extrabold text-primary mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{text}</p>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/10 rounded-xl p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-white/55">{label}</p>
      <p className="font-extrabold text-secondary mt-1">{value}</p>
    </div>
  );
}
