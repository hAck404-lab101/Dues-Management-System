'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useBranding } from '@/contexts/BrandingContext';
import { CardIcon, ChartIcon, ReceiptIcon, SmsIcon, ClockIcon, ShieldIcon, CertificateIcon, WalletIcon, CheckCircleIcon, XCircleIcon, ExclamationIcon } from '@/components/Icons';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Script from 'next/script';
import Loader from '@/components/Loader';

export default function Home() {
  const { appName, loading } = useBranding();
  const [showMatrix, setShowMatrix] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  // Pay Dues Modal states
  const [showPayModal, setShowPayModal] = useState(false);
  const [payStep, setPayStep] = useState(1); // 1 = Lookup, 2 = Dues/Payment, 3 = Redirecting, 4 = OTP verification, 5 = Enter OTP
  const [studentIdOrCard, setStudentIdOrCard] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Student and Dues data
  const [student, setStudent] = useState<any | null>(null);
  const [dues, setDues] = useState<any[]>([]);
  const [selectedDueId, setSelectedDueId] = useState<string>('');
  const [payAmount, setPayAmount] = useState<string>('');
  
  // Payer Contact Info
  const [payerEmail, setPayerEmail] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  // OTP Verification states
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpMethod, setOtpMethod] = useState<'email'>('email');

  // Fetch settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await api.get('/settings/public');
        if (res.data?.success) {
          setSettings(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load public settings:', err);
      } finally {
        setLoadingSettings(false);
      }
    }
    loadSettings();
  }, []);

  // Turnstile Callback Setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).onTurnstileVerify = (token: string) => {
        setTurnstileToken(token);
      };
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).onTurnstileVerify;
      }
    };
  }, []);

  const openPaymentModal = (e: React.MouseEvent) => {
    e.preventDefault();
    setPayStep(1);
    setStudentIdOrCard('');
    setStudent(null);
    setDues([]);
    setOtpSent(false);
    setOtpCode('');
    setShowPayModal(true);
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentIdOrCard.trim()) {
      toast.error('Please enter your Student ID or Card Number');
      return;
    }

    if (settings?.turnstile_enabled === 'true' && !turnstileToken) {
      toast.error('Please complete the captcha verification');
      return;
    }

    setLookupLoading(true);
    try {
      const res = await api.post('/public/lookup', {
        student_id_or_card: studentIdOrCard.trim(),
        turnstile_token: turnstileToken
      });

      if (res.data?.success) {
        setStudent(res.data.student);
        setPayStep(4); // Move to OTP verification screen
        setOtpSent(false);
        setOtpCode('');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Lookup failed. Student not found.');
      
      // Reset turnstile widget on failure
      if (typeof window !== 'undefined' && (window as any).turnstile) {
        try {
          (window as any).turnstile.reset();
        } catch (e) {}
        setTurnstileToken('');
      }
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!student) return;
    setSendingOtp(true);
    try {
      const res = await api.post('/public/send-otp', {
        student_id_or_card: studentIdOrCard.trim()
      });
      if (res.data?.success) {
        setOtpSent(true);
        toast.success('Verification code sent to your registered email!');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to send verification code.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !otpCode || otpCode.trim().length !== 6) {
      toast.error('Please enter a valid 6-digit verification code');
      return;
    }

    setVerifyingOtp(true);
    try {
      const res = await api.post('/public/verify-otp', {
        student_id_or_card: studentIdOrCard.trim(),
        otp_code: otpCode.trim()
      });

      if (res.data?.success) {
        setStudent(res.data.student);
        setDues(res.data.dues);
        
        // Pre-fill email and phone if roster data exists
        setPayerEmail(res.data.student.email || '');
        setPayerPhone(res.data.student.phone_number || '');

        if (res.data.dues.length > 0) {
          const firstDue = res.data.dues[0];
          setSelectedDueId(firstDue.due_id);
          setPayAmount(firstDue.balance.toFixed(2));
          toast.success('Identity verified! Checkout unlocked.');
          setPayStep(2);
        } else {
          toast.success('Identity verified! All assigned dues are fully paid.');
          setShowPayModal(false);
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Verification failed. Incorrect or expired code.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleDueSelect = (dueId: string) => {
    setSelectedDueId(dueId);
    const chosen = dues.find(d => d.due_id === dueId);
    if (chosen) {
      setPayAmount(chosen.balance.toFixed(2));
    }
  };

  // Service Fee & Total calculations
  const calculateTotal = () => {
    const amount = parseFloat(payAmount) || 0;
    if (amount <= 0 || !settings) return { fee: 0, total: 0 };

    const chargeEnabled = settings.service_charge_enabled !== 'false';
    if (!chargeEnabled) return { fee: 0, total: amount };

    const type = settings.service_charge_type || 'fixed';
    const rate = parseFloat(settings.payment_service_fee || '0') || 0;

    let fee = 0;
    if (type === 'percentage') {
      fee = Math.round(((amount * rate) / 100) * 100) / 100;
    } else {
      fee = Math.round(rate * 100) / 100;
    }

    return {
      fee,
      total: Math.round((amount + fee) * 100) / 100
    };
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !selectedDueId) return;

    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount < 10) {
      toast.error('Minimum payment amount is GHS 10.00');
      return;
    }

    const chosenDue = dues.find(d => d.due_id === selectedDueId);
    if (chosenDue && amount > chosenDue.balance) {
      toast.error(`Amount exceeds outstanding balance of GHS ${chosenDue.balance.toFixed(2)}`);
      return;
    }

    if (!payerEmail.trim()) {
      toast.error('Payer email is required');
      return;
    }

    setPaymentLoading(true);
    try {
      const res = await api.post('/public/initiate-payment', {
        student_id: student.id,
        due_id: selectedDueId,
        amount: amount,
        payer_email: payerEmail.trim(),
        payer_phone: payerPhone.trim() || null
      });

      if (res.data?.success && res.data?.paystack?.authorization_url) {
        setPayStep(3);
        window.location.href = res.data.paystack.authorization_url;
      } else {
        toast.error('Failed to initiate Paystack checkout.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Payment initiation failed.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const { fee, total } = calculateTotal();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Helper List Check Icon (pure SVG, no emojis)
  const ListCheck = ({ isWhite = false }: { isWhite?: boolean }) => (
    <span className={`w-4 h-4 rounded-full flex items-center justify-center ${isWhite ? 'bg-white/20 text-white' : 'bg-[#0020B2]/15 text-[#0020B2]'}`}>
      <svg className="w-2.5 h-2.5 stroke-[3.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </span>
  );

  // Helper Table Check Component
  const TableCheck = ({ label = "Yes" }: { label?: string }) => (
    <span className="inline-flex items-center gap-1.5 text-[#0020B2] font-bold">
      <span className="w-4 h-4"><CheckCircleIcon /></span>
      <span>{label}</span>
    </span>
  );

  // Helper Table Cross Component
  const TableCross = ({ label = "No" }: { label?: string }) => (
    <span className="inline-flex items-center gap-1.5 text-gray-400 font-semibold">
      <span className="w-4 h-4 text-gray-300"><XCircleIcon /></span>
      <span>{label}</span>
    </span>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#000B33] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0020B2]/20 border-t-[#0020B2] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold text-[#0020B2]">Loading DuesPay...</p>
        </div>
      </div>
    );
  }

  // Helper custom badges with elegant icon
  const Badge = ({ text }: { text: string }) => (
    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#0020B2]/20 bg-[#F0F4FF] text-xs font-bold text-[#001780] shadow-sm select-none">
      <svg className="w-3.5 h-3.5 text-[#0020B2] fill-current animate-pulse" viewBox="0 0 24 24">
        <path d="M12 2l2.4 7.4h7.6l-6.2 4.5 2.4 7.4-6.2-4.5-6.2 4.5 2.4-7.4-6.2-4.5h7.6z"/>
      </svg>
      <span className="uppercase tracking-wider text-[10px]">{text}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-gray-800 antialiased overflow-x-hidden">
      
      {/* 1. STICKY GLASSMORPHIC NAVIGATION */}
      <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4">
        <header className={`w-full max-w-5xl rounded-full border py-2.5 px-3 flex justify-between items-center transition-all duration-300 ${
          scrolled
            ? 'bg-[#000B33]/35 backdrop-blur-2xl border-white/10 shadow-[0_12px_45px_-8px_rgba(0,0,0,0.5)]'
            : 'bg-[#000B33]/20 backdrop-blur-md border-white/5 shadow-none'
        }`}>
          <div className="flex items-center gap-3">
            <Link href="/" className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-black shadow-md hover:scale-105 transition-transform">
              <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" fill="currentColor" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 14.5c4-2.5 13-7.5 17-5" />
              </svg>
            </Link>
            <span className="font-display font-black text-lg text-white tracking-tight hidden sm:inline">{appName}</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-white/80">
            <a href="#features" className="hover:text-[#93C5FD] transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-[#93C5FD] transition-colors">How it Works</a>
            <a href="#blog" className="hover:text-[#93C5FD] transition-colors">Articles</a>
            <a href="#pricing" className="hover:text-[#93C5FD] transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/admin/login" className="px-4 py-2 text-sm font-bold text-white hover:text-[#93C5FD] transition-colors">
              Staff Login
            </Link>
            <button onClick={openPaymentModal} className="px-6 py-2.5 bg-white hover:bg-gray-100 text-black text-sm font-bold rounded-full shadow-md transition-all hover:scale-105 active:scale-95">
              Pay Dues
            </button>
          </div>
        </header>
      </div>

      {/* 2. HERO SECTION */}
      <section className="relative bg-[#000B33] text-white min-h-screen flex items-center justify-center py-20 px-6 sm:px-12 lg:px-24 grid-bg-dark overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl pointer-events-none radial-glow animate-pulse-glow" />
        
        <div className="max-w-4xl mx-auto text-center space-y-10 relative z-10 w-full">

          <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl xl:text-9xl font-black leading-[1.05] tracking-tight text-white uppercase">
            <span className="text-[#93C5FD]">SAVE</span> YOUR TIME & <br className="hidden sm:inline" />
            <span className="text-[#93C5FD]">LESS EXPENSE</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/70 leading-relaxed max-w-3xl mx-auto">
            DuesPay bridges the gap between administrators and members. Pay securely via Mobile Money, automate receipt generation, and track clearances in real-time.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-2">
            <button onClick={openPaymentModal} className="px-8 py-4 bg-[#DBEAFE] hover:bg-[#BFDBFE] text-[#001150] font-bold rounded-full shadow-xl shadow-[#0020B2]/10 transition-all hover:scale-105 active:scale-95 text-center min-w-[200px]">
              Pay Dues Now
            </button>
            <a href="#how-it-works" className="inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 font-bold rounded-full backdrop-blur-sm transition-all hover:scale-105 active:scale-95 min-w-[200px]">
              <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
              <span>See How it works</span>
            </a>
          </div>
        </div>
      </section>

      {/* 3. BENEFITS SECTION */}
      <section id="features" className="py-24 px-6 sm:px-12 bg-white relative z-10">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="font-display text-3xl sm:text-5xl font-black text-gray-950 tracking-tight">
              Experience the Future of Dues - <span className="text-[#0020B2]">DuesPay</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-full bg-gray-50 text-gray-700 flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-black text-gray-950 mb-3">Fast and Secure Transactions</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Pay instantly using MTN MoMo, Telecel Cash, or cards with immediate status reflection.
                </p>
              </div>
            </div>

            {/* Card 2 (Vibrant highlight card) */}
            <div className="bg-[#0020B2] rounded-[2rem] p-8 shadow-lg shadow-[#0020B2]/25 text-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>
                </div>
                <h3 className="text-lg font-black text-white mb-3">24/7 Customer Support</h3>
                <p className="text-sm text-white/90 leading-relaxed">
                  Receive instant confirmation SMS alerts, transaction details, and dedicated support anytime.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-full bg-gray-50 text-gray-700 flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-black text-gray-950 mb-3">Easy Financial Management</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Track payments, check expected revenue, and export files instantly from the admin panels.
                </p>
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-full bg-gray-50 text-gray-700 flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-black text-gray-950 mb-3">Instant Clearance Generation</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Generate secure digital clearance certificates immediately once assigned dues are paid in full.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. SHOWCASE SECTION 1 (Transactions Showcase) */}
      <section className="py-24 px-6 sm:px-12 bg-[#F9FAFB] border-t border-gray-100 relative z-10 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-16 items-center">
          
          {/* Left Side: Mockup Frame inside a colored circle */}
          <div className="lg:col-span-6 flex justify-center relative">
            <div className="absolute w-[360px] h-[360px] rounded-full bg-[#93C5FD]/20 blur-2xl pointer-events-none" />
            <div className="w-[360px] h-[360px] rounded-full bg-[#0020B2] flex items-center justify-center relative shadow-xl">
              
              {/* Floating Phone Mockup */}
              <div className="absolute w-[220px] h-[400px] rounded-[30px] border-[6px] border-[#0a1628] bg-white shadow-2xl overflow-hidden animate-float">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-4 bg-[#0a1628] rounded-b-xl z-20 flex items-center justify-center">
                  <div className="w-6 h-0.5 bg-white/20 rounded-full mb-0.5"></div>
                </div>
                
                <div className="h-full pt-5 pb-8 flex flex-col justify-between bg-gray-50 p-3 text-xs overflow-y-auto">
                  <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                    <p className="text-[7px] font-bold text-gray-400 uppercase">Current Balance</p>
                    <p className="text-sm font-black text-gray-900 mt-0.5">GHS 200.00</p>
                    <div className="mt-3 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#0020B2] w-[71%]" />
                    </div>
                  </div>

                  {/* Transaction Bar Chart graphic inside mockup */}
                  <div className="bg-white p-2.5 rounded-xl border border-gray-100 space-y-2">
                    <p className="text-[7px] font-bold text-gray-400 uppercase">Analysis</p>
                    <div className="flex justify-around items-end h-16 pt-2">
                      <div className="w-3 bg-[#0020B2] rounded-t-sm h-8"></div>
                      <div className="w-3 bg-gray-200 rounded-t-sm h-12"></div>
                      <div className="w-3 bg-[#0020B2] rounded-t-sm h-6"></div>
                      <div className="w-3 bg-[#93C5FD] rounded-t-sm h-14"></div>
                      <div className="w-3 bg-gray-200 rounded-t-sm h-9"></div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button className="flex-1 py-1 text-center bg-[#0020B2] text-white rounded-md text-[8px] font-bold">Pay</button>
                    <button className="flex-1 py-1 text-center bg-gray-100 text-gray-700 rounded-md text-[8px] font-bold">Receipt</button>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Right Side: Text details */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <h2 className="font-display text-3xl sm:text-5xl font-black text-gray-950 tracking-tight leading-tight">
              All <span className="text-[#0020B2]">Transactions</span> Easily on Your Mobile
            </h2>
            <p className="text-base text-gray-500 leading-relaxed">
              Paying for dues is as easy as a tap. With DuesPay, you can effortlessly handle a wide range of transactions, from bill payments and online receipts to barcoded clearances in commerce.
            </p>
            <div className="pt-2">
              <button onClick={openPaymentModal} className="inline-block px-8 py-3.5 bg-[#000B33] hover:bg-black text-[#93C5FD] font-bold rounded-full transition-colors">
                Pay Dues Now
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* 5. SHOWCASE SECTION 2 (Empowering Journey) */}
      <section className="py-24 px-6 sm:px-12 bg-white border-t border-gray-100 relative z-10 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-16 items-center">
          
          {/* Left Side: Text details and metrics */}
          <div className="lg:col-span-6 space-y-6 text-left order-2 lg:order-1">
            <h2 className="font-display text-3xl sm:text-5xl font-black text-gray-950 tracking-tight leading-tight">
              Empowering Your <span className="text-[#0020B2]">Financial</span> Journey
            </h2>
            <p className="text-base text-gray-500 leading-relaxed">
              Transforming collection experiences, empower your finances with DuesPay, where security meets simplicity for seamless online administration.
            </p>
            
            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-100">
              <div className="space-y-1">
                <div className="text-3xl font-black text-gray-900">10,000+</div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Members</p>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-black text-gray-900">GHS 250k+</div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Collections</p>
              </div>
            </div>
          </div>

          {/* Right Side: Mockup Frame inside a colored circle */}
          <div className="lg:col-span-6 flex justify-center relative order-1 lg:order-2">
            <div className="absolute w-[360px] h-[360px] rounded-full bg-[#0020B2]/10 blur-2xl pointer-events-none" />
            <div className="w-[360px] h-[360px] rounded-full bg-[#DBEAFE] flex items-center justify-center relative shadow-xl">
              
              {/* Floating Phone Mockup */}
              <div className="absolute w-[220px] h-[400px] rounded-[30px] border-[6px] border-[#0a1628] bg-white shadow-2xl overflow-hidden animate-float" style={{ animationDelay: '1.5s' }}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-4 bg-[#0a1628] rounded-b-xl z-20 flex items-center justify-center">
                  <div className="w-6 h-0.5 bg-white/20 rounded-full mb-0.5"></div>
                </div>
                
                <div className="h-full pt-6 bg-gray-50 p-3 text-xs overflow-y-auto">
                  <div className="bg-[#000B33] text-white p-3.5 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[7px] font-bold text-white/50 tracking-wider">CLEARANCE CARD</span>
                      <span className="text-[7px] font-bold text-[#93C5FD]">ACTIVE</span>
                    </div>
                    <div>
                      <p className="text-[6px] text-white/60 uppercase">Student Name</p>
                      <p className="text-[10px] font-bold mt-0.5">KWAME MENSAH</p>
                    </div>
                    <div>
                      <p className="text-[6px] text-white/60 uppercase">Clearance Status</p>
                      <p className="text-xs font-extrabold text-[#93C5FD] mt-0.5">GHS 0.00 Outstanding</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-white border border-gray-100 rounded-lg text-center space-y-2">
                    <p className="text-[8px] font-bold text-gray-500">Official Receipt QR</p>
                    <div className="w-16 h-16 bg-gray-100 mx-auto flex items-center justify-center rounded">
                      <div className="grid grid-cols-4 gap-1 p-2 bg-white rounded">
                        <div className="w-2.5 h-2.5 bg-gray-900"></div>
                        <div className="w-2.5 h-2.5 bg-gray-900"></div>
                        <div className="w-2.5 h-2.5 bg-white"></div>
                        <div className="w-2.5 h-2.5 bg-gray-900"></div>
                        
                        <div className="w-2.5 h-2.5 bg-white"></div>
                        <div className="w-2.5 h-2.5 bg-gray-900"></div>
                        <div className="w-2.5 h-2.5 bg-gray-900"></div>
                        <div className="w-2.5 h-2.5 bg-white"></div>

                        <div className="w-2.5 h-2.5 bg-gray-900"></div>
                        <div className="w-2.5 h-2.5 bg-white"></div>
                        <div className="w-2.5 h-2.5 bg-gray-900"></div>
                        <div className="w-2.5 h-2.5 bg-gray-900"></div>

                        <div className="w-2.5 h-2.5 bg-gray-900"></div>
                        <div className="w-2.5 h-2.5 bg-gray-900"></div>
                        <div className="w-2.5 h-2.5 bg-white"></div>
                        <div className="w-2.5 h-2.5 bg-gray-900"></div>
                      </div>
                    </div>
                    <p className="text-[7px] text-gray-400">Scan to Verify Receipt</p>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 6. HOW IT WORKS */}
      <section id="how-it-works" className="bg-[#000B33] text-white py-24 px-6 sm:px-12 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
            <h2 className="font-display text-3xl sm:text-5xl font-black text-white tracking-tight">How DuesPay Works</h2>
            <p className="text-base text-white/60">Simple, automated dues management from setup to clearance.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center bg-[#0020B2]/5 border border-white/5 p-8 rounded-[2rem] relative">
              <div className="w-12 h-12 rounded-full bg-[#0020B2] flex items-center justify-center text-white font-extrabold text-lg mx-auto mb-6 shadow-md shadow-[#0020B2]/25">1</div>
              <h3 className="text-xl font-bold text-white mb-3">Import Members</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                Admins upload a member spreadsheet or manually add students. Only authorised staff can add or manage member records.
              </p>
            </div>

            <div className="text-center bg-[#0020B2]/5 border border-white/5 p-8 rounded-[2rem] relative">
              <div className="w-12 h-12 rounded-full bg-[#0020B2] flex items-center justify-center text-white font-extrabold text-lg mx-auto mb-6 shadow-md shadow-[#0020B2]/25">2</div>
              <h3 className="text-xl font-bold text-white mb-3">Submit Payments</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                Members login to their dashboard, review assigned dues, and complete payments via MoMo or card.
              </p>
            </div>

            <div className="text-center bg-[#0020B2]/5 border border-white/5 p-8 rounded-[2rem] relative">
              <div className="w-12 h-12 rounded-full bg-[#0020B2] flex items-center justify-center text-white font-extrabold text-lg mx-auto mb-6 shadow-md shadow-[#0020B2]/25">3</div>
              <h3 className="text-xl font-bold text-white mb-3">Download Verification</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                Digital receipts verify collections immediately. Defaulter listings clear automatic clearances online.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. TESTIMONIALS */}
      <section className="py-24 px-6 sm:px-12 max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <h2 className="font-display text-3xl sm:text-5xl font-black text-gray-900 tracking-tight">
            What Our <span className="text-[#0020B2]">Happy User</span> Says
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-500 italic leading-relaxed">
              &ldquo;Managing departmental dues was a nightmare of paper receipts. DuesPay changed everything. Now our students pay via MoMo and are cleared instantly.&rdquo;
            </p>
            <div className="mt-8 border-t border-gray-50 pt-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-[#0020B2] font-bold text-sm">EM</div>
              <div>
                <p className="font-bold text-gray-900 text-sm">Ebenezer Mensah</p>
                <p className="text-[10px] text-gray-400 font-semibold">Department President · KNUST CS</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-500 italic leading-relaxed">
              &ldquo;The SMS notifications are excellent. I knew my payment was approved the second the transaction went through. No more queues at the department office.&rdquo;
            </p>
            <div className="mt-8 border-t border-gray-50 pt-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-[#0020B2] font-bold text-sm">AO</div>
              <div>
                <p className="font-bold text-gray-900 text-sm">Abigail Osei</p>
                <p className="text-[10px] text-gray-400 font-semibold">Student · HTU</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-500 italic leading-relaxed">
              &ldquo;For audit purposes, the automated clearance logs and downloadable CSV reports have saved our treasury team countless hours. Highly recommend DuesPay.&rdquo;
            </p>
            <div className="mt-8 border-t border-gray-50 pt-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-[#0020B2] font-bold text-sm">CA</div>
              <div>
                <p className="font-bold text-gray-900 text-sm">Clement Appiah</p>
                <p className="text-[10px] text-gray-400 font-semibold">Treasurer · GhACCA Student Chapter</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. ARTICLES & RESOURCES SECTION [NEW] */}
      <section id="blog" className="py-24 px-6 sm:px-12 bg-[#F9FAFB] border-t border-b border-gray-100 relative z-10">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="font-display text-3xl sm:text-5xl font-black text-gray-950 tracking-tight">
              Take a look at our <span className="text-[#0020B2]">articles & resources</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Blog Card 1 */}
            <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
              <div className="p-4 bg-gray-50 border-b border-gray-100 h-48 flex items-center justify-center relative overflow-hidden">
                {/* Visual HTML mockup of receipt generation */}
                <div className="w-32 h-36 bg-white rounded-lg border border-gray-200 shadow-md p-2.5 space-y-2">
                  <div className="flex justify-between items-center text-[7px] text-gray-400 font-bold border-b pb-1">
                    <span>Receipt No: DP-98741</span>
                    <span className="text-[#0020B2]">PAID</span>
                  </div>
                  <div className="space-y-1 text-[6px] text-gray-500">
                    <p>Student Name: <span className="text-gray-900 font-bold">D. Student</span></p>
                    <p>Amount Paid: <span className="text-gray-900 font-bold">GHS 120.00</span></p>
                  </div>
                  <div className="h-10 bg-gray-50 rounded flex items-center justify-center border border-dashed text-[6px] text-[#0020B2] font-bold">
                    Email Delivered Successfully
                  </div>
                </div>
              </div>
              <div className="p-8 space-y-4">
                <span className="text-[10px] font-bold text-[#0020B2] bg-[#0020B2]/10 px-3 py-1 rounded-full uppercase tracking-wider">Automation</span>
                <h3 className="text-lg font-black text-gray-950">Automatic receipt generation & email delivery</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  How DuesPay automates the generation and delivery of digital receipts to students' registered emails immediately after payment.
                </p>
              </div>
            </div>

            {/* Blog Card 2 */}
            <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
              <div className="p-4 bg-gray-50 border-b border-gray-100 h-48 flex items-center justify-center relative overflow-hidden">
                {/* Phone screenshot mockup in HTML */}
                <div className="w-36 h-36 rounded-2xl bg-white border border-gray-200 shadow-md p-2 space-y-2">
                  <div className="flex justify-between items-center text-[7px] text-gray-400 font-bold border-b pb-1">
                    <span>MTN MoMo Integration</span>
                    <span className="text-blue-500">Active</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[6px] text-gray-400 font-semibold">Callback URL</p>
                    <p className="text-[6px] font-mono bg-gray-50 p-1 rounded border overflow-x-auto whitespace-nowrap">https://api.duespay.org/momo-callback</p>
                  </div>
                  <div className="text-[8px] font-bold text-gray-900">GHS 250,000 Volume</div>
                </div>
              </div>
              <div className="p-8 space-y-4">
                <span className="text-[10px] font-bold text-[#0020B2] bg-[#0020B2]/10 px-3 py-1 rounded-full uppercase tracking-wider">Payments</span>
                <h3 className="text-lg font-black text-gray-950">MTN Mobile Money & Card payment integration guide</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Step-by-step setup overview for securing organization bank accounts and enabling card/Momo payment channels.
                </p>
              </div>
            </div>

            {/* Blog Card 3 */}
            <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
              <div className="p-4 bg-gray-50 border-b border-gray-100 h-48 flex items-center justify-center relative overflow-hidden">
                {/* Visual mockup of terminal key/shield */}
                <div className="w-24 h-24 rounded-full bg-[#0020B2]/10 flex items-center justify-center relative shadow-inner">
                  <div className="w-16 h-16 rounded-full bg-[#0020B2] flex items-center justify-center text-white font-extrabold text-2xl shadow">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="p-8 space-y-4">
                <span className="text-[10px] font-bold text-[#0020B2] bg-[#0020B2]/10 px-3 py-1 rounded-full uppercase tracking-wider">Security</span>
                <h3 className="text-lg font-black text-gray-950">Ensuring audit trails and security logs in accounts</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Understand how audit log tracking logs settings modifications and manual proof approvals to secure member funds.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. PRICING SECTION (Saasplex X Inspired Layout) */}
      <section id="pricing" className="py-24 px-6 sm:px-12 bg-white relative z-10">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <h2 className="font-display text-4xl sm:text-5xl font-black text-gray-950 tracking-tight">Pricing</h2>
            <p className="text-base text-gray-500 max-w-lg mx-auto">
              Select the plan that fits your organization's collection needs. No hidden charges.
            </p>
          </div>

          {/* Pricing cards wrapper */}
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch">
            
            {/* Startup Plan */}
            <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between relative">
              <div className="space-y-6">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-[#0020B2]">
                    <span className="w-6 h-6"><WalletIcon /></span>
                  </div>
                  <h3 className="text-xl font-black text-gray-950">Startup</h3>
                </div>
                
                <div className="flex items-baseline gap-1 pt-2">
                  <span className="text-4xl font-black text-gray-950 font-display">GHS 0</span>
                  <span className="text-sm text-gray-400">/ month</span>
                </div>
                
                <p className="text-sm text-gray-500 leading-relaxed">
                  Perfect for small student groups, clubs, and individual classes.
                </p>

                <ul className="space-y-4 text-xs text-gray-500 border-t border-gray-100 pt-6">
                  <li className="flex items-center gap-3">
                    <ListCheck />
                    <span>All member portal actions</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <ListCheck />
                    <span>Standard payment integration</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <ListCheck />
                    <span>Manual payment approvals</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <ListCheck />
                    <span>Normal support</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8 space-y-3">
                <Link href="/login" className="block w-full py-3.5 text-center text-sm font-bold bg-[#0020B2] hover:bg-[#001780] text-white rounded-full transition-colors shadow-sm">
                  Get started
                </Link>
                <p className="text-[10px] text-gray-400 text-center font-bold">No credit card required</p>
              </div>
            </div>

            {/* Growth Plan (Highlighted center card) */}
            <div className="bg-[#0020B2] rounded-[2rem] p-8 shadow-xl shadow-[#0020B2]/25 text-white hover:shadow-2xl transition-all duration-300 flex flex-col justify-between relative scale-105 z-10 border border-[#0020B2]">
              <div className="absolute top-0 right-8 -translate-y-1/2 bg-[#DBEAFE] text-[#001150] text-[9px] font-black uppercase tracking-widest px-3.5 py-1.5 rounded-full shadow-md">Popular</div>
              
              <div className="space-y-6">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white">
                    <span className="w-6 h-6"><ChartIcon /></span>
                  </div>
                  <h3 className="text-xl font-black text-white">Growth</h3>
                </div>
                
                <div className="flex items-baseline gap-1 pt-2">
                  <span className="text-4xl font-black text-white font-display">GHS 149</span>
                  <span className="text-sm text-white/70">/ month</span>
                </div>
                
                <p className="text-sm text-white/80 leading-relaxed">
                  Ideal for department associations, large student unions, and teams.
                </p>

                <ul className="space-y-4 text-xs text-white/80 border-t border-white/20 pt-6">
                  <li className="flex items-center gap-3">
                    <ListCheck isWhite />
                    <span>Everything on Startup plan</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <ListCheck isWhite />
                    <span>Unlimited members</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <ListCheck isWhite />
                    <span>Automated SMS & Email alerts</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <ListCheck isWhite />
                    <span>Premium Support</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8 space-y-3">
                <Link href="/login" className="block w-full py-3.5 text-center text-sm font-bold bg-white text-[#0020B2] hover:bg-gray-50 rounded-full transition-colors shadow-md">
                  Get started
                </Link>
                <p className="text-[10px] text-white/70 text-center font-bold">No credit card required</p>
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between relative">
              <div className="space-y-6">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-[#0020B2]">
                    <span className="w-6 h-6"><ShieldIcon /></span>
                  </div>
                  <h3 className="text-xl font-black text-gray-950">Enterprise</h3>
                </div>
                
                <div className="flex items-baseline gap-1 pt-2">
                  <span className="text-4xl font-black text-gray-950 font-display">Custom</span>
                </div>
                
                <p className="text-sm text-gray-500 leading-relaxed">
                  For large institutions, multiple departments, or college-wide setups.
                </p>

                <ul className="space-y-4 text-xs text-gray-500 border-t border-gray-100 pt-6">
                  <li className="flex items-center gap-3">
                    <ListCheck />
                    <span>Everything on Growth plan</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <ListCheck />
                    <span>Multiple departments</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <ListCheck />
                    <span>Custom institutional domains</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <ListCheck />
                    <span>Dedicated Support</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8 space-y-3">
                <Link href="/login" className="block w-full py-3.5 text-center text-sm font-bold bg-[#0020B2] hover:bg-[#001780] text-white rounded-full transition-colors shadow-sm">
                  Get started
                </Link>
                <p className="text-[10px] text-gray-400 text-center font-bold">Contact our team</p>
              </div>
            </div>

          </div>

          {/* Toggle comparison matrix button */}
          <div className="text-center pt-8">
            <button 
              type="button" 
              onClick={() => setShowMatrix(!showMatrix)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gray-50 hover:bg-gray-100 text-sm font-bold text-[#0020B2] transition-all"
            >
              <span>{showMatrix ? 'Hide plans comparison' : 'View plans comparison'}</span>
              <svg className={`w-4 h-4 transform transition-transform ${showMatrix ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Comparison Matrix Table */}
          {showMatrix && (
            <div className="max-w-5xl mx-auto border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm bg-white pt-6 pb-2 transition-all">
              <div className="px-8 pb-6 border-b border-gray-100">
                <h3 className="text-2xl font-black text-gray-950">Plans comparison</h3>
                <p className="text-sm text-gray-500">Compare details of our core dues management features side-by-side.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-gray-50/50 text-[10px] uppercase tracking-wider font-bold text-gray-400">
                      <th className="p-6 pl-8">Features</th>
                      <th className="p-6">Startup</th>
                      <th className="p-6 text-[#0020B2]">Growth</th>
                      <th className="p-6">Enterprise</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-sm text-gray-600 font-semibold">
                    <tr>
                      <td className="p-6 pl-8 font-bold text-gray-900">Monthly Cost</td>
                      <td className="p-6">GHS 0</td>
                      <td className="p-6 text-[#0020B2] font-bold">GHS 149</td>
                      <td className="p-6">Custom Quote</td>
                    </tr>
                    <tr>
                      <td className="p-6 pl-8 font-bold text-gray-900">Member Limit</td>
                      <td className="p-6">Up to 100</td>
                      <td className="p-6 text-[#0020B2]">Unlimited</td>
                      <td className="p-6">Unlimited</td>
                    </tr>
                    <tr>
                      <td className="p-6 pl-8 font-bold text-gray-900">MoMo Online Integration</td>
                      <td className="p-6"><TableCheck /></td>
                      <td className="p-6"><TableCheck /></td>
                      <td className="p-6"><TableCheck /></td>
                    </tr>
                    <tr>
                      <td className="p-6 pl-8 font-bold text-gray-900">Manual Payment Verification</td>
                      <td className="p-6"><TableCheck /></td>
                      <td className="p-6"><TableCheck /></td>
                      <td className="p-6"><TableCheck /></td>
                    </tr>
                    <tr>
                      <td className="p-6 pl-8 font-bold text-gray-900">SMS / Email Notification Alerts</td>
                      <td className="p-6 text-gray-400">Standard limit</td>
                      <td className="p-6"><TableCheck label="Unlimited" /></td>
                      <td className="p-6"><TableCheck label="Unlimited" /></td>
                    </tr>
                    <tr>
                      <td className="p-6 pl-8 font-bold text-gray-900">Clearance Reports & Logs</td>
                      <td className="p-6 text-gray-500 font-medium">Basic</td>
                      <td className="p-6"><TableCheck label="Advanced" /></td>
                      <td className="p-6"><TableCheck label="Custom" /></td>
                    </tr>
                    <tr>
                      <td className="p-6 pl-8 font-bold text-gray-900">Multiple Department Portals</td>
                      <td className="p-6"><TableCross /></td>
                      <td className="p-6"><TableCross /></td>
                      <td className="p-6"><TableCheck /></td>
                    </tr>
                    <tr>
                      <td className="p-6 pl-8 font-bold text-gray-900">Custom Domains</td>
                      <td className="p-6"><TableCross /></td>
                      <td className="p-6"><TableCross /></td>
                      <td className="p-6"><TableCheck /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </section>

      {/* 10. FINAL CTA BANNER */}
      <section className="bg-gradient-to-r from-[#000B33] to-[#0B1F17] text-white py-24 px-6 sm:px-12 text-center border-t border-white/5 relative z-10">
        <div className="max-w-4xl mx-auto space-y-6">
          <h2 className="font-display text-3xl sm:text-5xl font-black text-white tracking-tight">
            Ready to modernize your organizational dues?
          </h2>
          <p className="text-base sm:text-lg text-white/70 max-w-2xl mx-auto leading-relaxed">
            Set up your organization's portal in under 5 minutes. Start accepting secure payments and issue official clearance records today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/login" className="px-8 py-4 bg-[#DBEAFE] hover:bg-[#BFDBFE] text-[#001150] font-bold rounded-xl shadow-xl shadow-[#0020B2]/10 transition-all hover:scale-105 active:scale-95">
              Create Organization Portal
            </Link>

          </div>
        </div>
      </section>

      {/* 11. FOOTER */}
      <footer className="bg-[#000B33] text-white/65 py-16 px-6 sm:px-12 border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto grid md:grid-cols-12 gap-10">
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#0020B2] flex items-center justify-center text-white font-extrabold text-sm shadow-md">
                D
              </div>
              <span className="font-display font-black text-lg text-white tracking-tight">{appName}</span>
            </div>
            <p className="text-xs text-white/50 leading-relaxed max-w-sm">
              DuesPay is a modern dues collection and clearance platform designed for departments, student associations, and clubs.
            </p>
          </div>
          
          <div className="md:col-span-3 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest">Quick Links</h4>
            <ul className="space-y-2.5 text-xs text-white/60">
              <li><a href="#features" className="hover:text-[#93C5FD] transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="hover:text-[#93C5FD] transition-colors">How it Works</a></li>
              <li><Link href="/login" className="hover:text-[#93C5FD] transition-colors">Member Login</Link></li>
              <li><Link href="/admin/login" className="hover:text-[#93C5FD] transition-colors">Admin Login</Link></li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest">Legal & Privacy</h4>
            <ul className="space-y-2.5 text-xs text-white/60">
              <li><Link href="/privacy" className="hover:text-[#93C5FD] transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-[#93C5FD] transition-colors">Terms & Conditions</Link></li>
            </ul>
            <p className="text-[10px] text-white/40 leading-relaxed pt-2">
              Payment processing services are powered securely by licensed payment providers.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto border-t border-white/5 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-white/45">
          <p>&copy; {new Date().getFullYear()} {appName}. All rights reserved.</p>
          <p className="text-[10px]">Simple · Secure · Automated</p>
        </div>
      </footer>

      {showPayModal && settings?.turnstile_enabled === 'true' && (
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
      )}

      {/* Modal for Public Pay Dues (Popup Card) */}
      {showPayModal && (
        <div className="fixed inset-0 bg-[#000B33]/60 backdrop-blur-md flex items-center justify-center z-[150] p-4 overflow-y-auto animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            {/* Header Banner */}
            <div className="bg-primary text-white p-6 relative overflow-hidden flex justify-between items-start">
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                  <span className="w-6 h-6"><WalletIcon /></span>
                </div>
                <div>
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider">Public Checkout</p>
                  <h3 className="text-lg font-black mt-0.5">Pay Departmental Dues</h3>
                </div>
              </div>
              <button 
                onClick={() => setShowPayModal(false)}
                className="relative z-20 text-white/70 hover:text-white transition-colors font-black text-2xl leading-none"
              >
                &times;
              </button>
              <div className="absolute -right-12 -top-12 w-28 h-28 rounded-full bg-white/10" />
              <div className="absolute right-12 -bottom-16 w-32 h-32 rounded-full bg-secondary/20" />
            </div>

            {/* STEP 1: Student Lookup */}
            {payStep === 1 && (
              <div className="p-6 space-y-6">
                <form onSubmit={handleLookup} className="space-y-4">
                  <div>
                    <label className="label text-xs">Student ID or Card Number</label>
                    <input
                      className="input-field"
                      placeholder="e.g. 20261002 or ID Card Number"
                      value={studentIdOrCard}
                      onChange={e => setStudentIdOrCard(e.target.value)}
                      required
                    />
                  </div>

                  {settings?.turnstile_enabled === 'true' && settings?.turnstile_site_key && (
                    <div className="flex justify-center p-2 bg-gray-50/50 rounded-2xl border border-gray-100">
                      <div 
                        className="cf-turnstile" 
                        data-sitekey={settings.turnstile_site_key} 
                        data-callback="onTurnstileVerify"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={lookupLoading}
                    className="btn-primary w-full py-3 text-xs font-bold uppercase tracking-wider"
                  >
                    {lookupLoading ? 'Locating student...' : 'Find My Account'}
                  </button>
                </form>
              </div>
            )}

            {/* STEP 4: Identity Verification Screen */}
            {payStep === 4 && student && (
              <div className="p-6 space-y-6">
                <div className="bg-gray-50/70 rounded-2xl p-4 border border-gray-100/60 space-y-2.5">
                  <h4 className="font-extrabold text-gray-900 text-xs uppercase tracking-wider">Account Located</h4>
                  <div className="border-t border-gray-100 pt-2 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-medium">Student Name:</span>
                      <span className="text-gray-950 font-bold">{student.full_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-medium">Index Number:</span>
                      <span className="text-gray-950 font-bold">{student.student_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-medium">Registered Email:</span>
                      <span className="text-gray-950 font-bold font-mono">{student.email}</span>
                    </div>
                  </div>
                </div>

                {!otpSent ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-1.5 text-xs text-blue-800 leading-relaxed">
                      <p className="font-bold">Identity Verification Required</p>
                      <p>
                        To protect your privacy, we require verification before displaying assigned dues or allowing payment.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="label text-xs">Choose Verification Method</label>
                      <label className="flex items-center gap-3 p-3 rounded-2xl border border-primary bg-[#F0F4FF] cursor-pointer transition-all">
                        <input
                          type="radio"
                          name="otp_method"
                          checked={otpMethod === 'email'}
                          onChange={() => setOtpMethod('email')}
                          className="text-primary focus:ring-primary"
                        />
                        <div className="text-xs">
                          <span className="font-bold text-gray-800 block">Email One-Time Password (OTP)</span>
                          <span className="text-gray-400 font-semibold block mt-0.5">Send code to {student.email}</span>
                        </div>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setPayStep(1)}
                        className="btn-outline w-full py-3 text-xs font-bold uppercase tracking-wider"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleSendOtp}
                        disabled={sendingOtp}
                        className="btn-primary w-full py-3 text-xs font-bold uppercase tracking-wider"
                      >
                        {sendingOtp ? 'Sending code...' : 'Send Code'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-1.5 text-xs text-emerald-800 leading-relaxed">
                      <p className="font-bold">Verification Code Sent!</p>
                      <p>
                        We have sent a 6-digit verification code to <span className="font-bold font-mono">{student.email}</span>.
                      </p>
                    </div>

                    <div>
                      <label className="label text-xs">Enter 6-Digit Code</label>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        placeholder="e.g. 123456"
                        className="input-field text-center font-mono font-bold text-2xl tracking-[0.4em] py-3"
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setOtpSent(false)}
                        className="btn-outline w-full py-3 text-xs font-bold uppercase tracking-wider"
                      >
                        Resend / Back
                      </button>
                      <button
                        type="submit"
                        disabled={verifyingOtp || otpCode.length !== 6}
                        className="btn-primary w-full py-3 text-xs font-bold uppercase tracking-wider"
                      >
                        {verifyingOtp ? 'Verifying...' : 'Verify & Continue'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* STEP 2: Checkout Form */}
            {payStep === 2 && student && (
              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                <div className="bg-gray-50/70 rounded-2xl p-4 border border-gray-100/60 space-y-2">
                  <div className="flex justify-between items-start border-b border-gray-100 pb-2">
                    <div>
                      <h4 className="font-extrabold text-gray-900 text-sm">{student.full_name}</h4>
                      <p className="text-[10px] text-gray-400 font-semibold">Index: {student.student_id}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-[9px] font-bold uppercase">
                      {student.level}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-gray-500">
                    <div>Prog: <span className="text-gray-800">{student.programme}</span></div>
                    <div className="text-right">Year: <span className="text-gray-800">{student.academic_year}</span></div>
                  </div>
                </div>

                <form onSubmit={handlePay} className="space-y-4">
                  <div>
                    <label className="label text-xs">Select Due to Pay</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {dues.map(due => (
                        <label
                          key={due.due_id}
                          className={`flex items-start justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                            selectedDueId === due.due_id
                              ? 'border-primary bg-[#F0F4FF] shadow-sm'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <input
                              type="radio"
                              name="selected_due"
                              className="mt-0.5 text-primary focus:ring-primary"
                              checked={selectedDueId === due.due_id}
                              onChange={() => handleDueSelect(due.due_id)}
                            />
                            <div>
                              <span className="font-bold text-xs text-gray-800 block leading-tight">{due.due_name}</span>
                              {due.deadline && (
                                <span className={`text-[9px] font-semibold mt-0.5 inline-block ${due.is_overdue ? 'text-red-500' : 'text-gray-400'}`}>
                                  {due.is_overdue ? 'Overdue' : 'Deadline'}: {new Date(due.deadline).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-extrabold text-xs text-gray-900 block">GHS {due.balance.toFixed(2)}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="label text-xs">Amount to Pay (GHS)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-gray-400">GHS</span>
                      <input
                        type="number"
                        step="0.01"
                        min="10.00"
                        className="input-field pl-12 font-mono font-bold text-base py-2.5"
                        value={payAmount}
                        onChange={e => setPayAmount(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label text-xs">Payer Email</label>
                      <input
                        type="email"
                        className="input-field py-2 text-xs"
                        placeholder="payer@example.com"
                        value={payerEmail}
                        onChange={e => setPayerEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Payer Phone (Optional)</label>
                      <input
                        type="tel"
                        className="input-field py-2 text-xs"
                        placeholder="054XXXXXXX"
                        value={payerPhone}
                        onChange={e => setPayerPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  {parseFloat(payAmount) >= 10 && (
                    <div className="bg-gray-50/80 rounded-2xl p-3 border border-dashed border-gray-200 text-[10px] space-y-1.5">
                      <div className="flex justify-between font-bold text-gray-500">
                        <span>Payment Subtotal</span>
                        <span className="font-mono">GHS {parseFloat(payAmount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-gray-500">
                        <span>Processing Fee</span>
                        <span className="font-mono">GHS {fee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-extrabold text-gray-900 border-t border-gray-200/60 pt-1.5 text-xs">
                        <span>Total Charge</span>
                        <span className="font-mono">GHS {total.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setPayStep(4)}
                      className="btn-outline w-full py-3 text-xs font-bold uppercase tracking-wider"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={paymentLoading || parseFloat(payAmount) < 10}
                      className="btn-primary w-full py-3 text-xs font-bold uppercase tracking-wider"
                    >
                      {paymentLoading ? 'Preparing...' : `Pay GHS ${total.toFixed(2)}`}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 3: Redirecting */}
            {payStep === 3 && (
              <div className="p-10 text-center space-y-5">
                <div className="w-12 h-12 mx-auto rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <div>
                  <h4 className="text-base font-extrabold text-primary uppercase tracking-wide">Redirecting to Paystack</h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">Please complete your payment securely on the Paystack screen. Do not close this popup.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
