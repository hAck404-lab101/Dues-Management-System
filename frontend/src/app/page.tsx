'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useBranding } from '@/contexts/BrandingContext';
import { CardIcon, ChartIcon, ReceiptIcon, SmsIcon, ClockIcon, ShieldIcon, CertificateIcon, WalletIcon } from '@/components/Icons';

export default function Home() {
  const { appName, loading } = useBranding();

  // Target Counter: Starting collection amounts
  const [collectionRaised, setCollectionRaised] = useState(12450);
  const collectionTarget = 15000;

  // Slowly increment total raised over time to keep page active
  useEffect(() => {
    const amounts = [50, 80, 100, 120, 150];
    const interval = setInterval(() => {
      const randomAmount = amounts[Math.floor(Math.random() * amounts.length)];
      setCollectionRaised(prev => {
        const next = prev + randomAmount;
        return next >= collectionTarget ? 12000 : next; // Reset loop if exceeds target
      });
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F4FF] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#2563EB]/20 border-t-[#2563EB] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold text-[#1E3A5F]">Loading portal...</p>
        </div>
      </div>
    );
  }

  const progressPercentage = Math.min(Math.round((collectionRaised / collectionTarget) * 100), 100);

  return (
    <div className="min-h-screen bg-[#F0F4FF] text-[#1E3A5F]">
      
      {/* 1. STICKY NAV */}
      <header className="sticky top-0 z-50 bg-[#0A1628]/95 backdrop-blur-md border-b border-[#1E3A5F]/40 py-4 px-6 sm:px-12 flex justify-between items-center transition-all">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2563EB] to-[#3B82F6] flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-[#2563EB]/25">
            D
          </div>
          <span className="font-display font-black text-xl text-white tracking-tight">{appName}</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-white/80">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <Link href="/verify-receipt" className="hover:text-white transition-colors">Verify Receipt</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="px-4 py-2 text-sm font-bold text-white hover:text-white/80 transition-colors">
            Login
          </Link>
          <Link href="/register" className="px-5 py-2.5 text-sm font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl shadow-lg shadow-[#2563EB]/20 transition-all active:scale-95">
            Get Started
          </Link>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="bg-gradient-to-b from-[#0A1628] to-[#1E3A5F] text-white pt-16 pb-20 px-6 sm:px-12 lg:px-24">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Heading and CTA */}
          <div className="lg:col-span-7 space-y-8">
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-tight text-white">
              The simplest way to collect <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3B82F6] to-[#60A5FA]">departmental & organization</span> dues.
            </h1>
            
            <p className="text-base sm:text-lg text-white/70 leading-relaxed max-w-2xl">
              DuesPay bridges the gap between administrators and members. Pay securely via Mobile Money or cards, automate receipt generation, and track clearances in real-time.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link href="/register" className="px-8 py-4 bg-[#2563EB] hover:bg-[#1D4ED8] font-bold rounded-xl shadow-xl shadow-[#2563EB]/30 transition-all active:scale-95 text-center">
                Create Organization Portal
              </Link>
              <Link href="/login" className="px-8 py-4 bg-white/10 hover:bg-white/15 border border-white/20 font-bold rounded-xl text-center backdrop-blur-sm transition-all active:scale-95">
                Member Login
              </Link>
            </div>
          </div>

          {/* Right Column: Mobile Phone Dashboard Mockup & Live Progress */}
          <div className="lg:col-span-5 space-y-6 flex flex-col items-center">
            
            {/* Live Progress Widget */}
            <div className="w-full max-w-sm bg-[#1E3A5F]/90 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h4 className="text-xs font-bold text-white/60 tracking-wider uppercase">Academic Year Target</h4>
                  <p className="font-display font-extrabold text-white mt-0.5">2024/2025 General Collection</p>
                </div>
              </div>
              
              <div className="flex justify-between items-baseline mb-2">
                <div className="text-2xl font-black text-white">GHS {collectionRaised.toLocaleString()}</div>
                <div className="text-sm text-white/50">of GHS {collectionTarget.toLocaleString()}</div>
              </div>

              <div className="w-full h-3 bg-black/20 rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-gradient-to-r from-[#2563EB] to-[#10B981] rounded-full transition-all duration-1000"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <p className="text-[11px] text-white/40 font-semibold tracking-wider uppercase text-right">Updates Live Every 8 Seconds</p>
            </div>

            {/* Mobile View Mockup (High-fidelity HTML/CSS phone) */}
            <div className="relative w-[280px] h-[540px] rounded-[40px] border-[8px] border-[#0A1628] bg-white shadow-2xl overflow-hidden shrink-0">
              
              {/* Phone Speaker & Camera Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-[#0A1628] rounded-b-2xl z-20 flex items-center justify-center">
                <div className="w-10 h-1 bg-white/20 rounded-full mb-1"></div>
              </div>

              {/* Mobile Screen Content */}
              <div className="h-full pt-6 pb-12 flex flex-col justify-between overflow-y-auto bg-gray-50 text-[#1E3A5F]">
                
                {/* Dashboard Header */}
                <div className="px-4 py-3 flex justify-between items-center bg-white border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-extrabold text-xs">D</div>
                    <div>
                      <h5 className="text-[10px] font-black tracking-tight text-[#0A1628]">{appName}</h5>
                      <p className="text-[8px] text-[#64748B] font-semibold">Level 300 · CS Dept</p>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-[#F0F4FF] flex items-center justify-center text-[9px] font-bold text-[#2563EB]">
                    KM
                  </div>
                </div>

                {/* Mobile Dashboard Body */}
                <div className="flex-1 p-3 space-y-3">
                  
                  {/* Greeting */}
                  <div className="text-left">
                    <h6 className="text-xs font-black text-[#0A1628]">Hello, Kwame 👋</h6>
                    <p className="text-[9px] text-[#64748B] mt-0.5">Academic Year: 2024/2025</p>
                  </div>

                  {/* Active Due Alert Card */}
                  <div className="bg-gradient-to-tr from-[#0A1628] to-[#1E3A5F] text-white p-3 rounded-xl shadow-sm space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] font-bold tracking-widest text-white/50 uppercase">Active Due</span>
                      <span className="text-[8px] font-extrabold text-amber-400">UNPAID</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-black">Welfare Fund Levy</p>
                      <p className="text-base font-extrabold mt-0.5">GHS 80.00</p>
                    </div>
                    <Link href="/login" className="block w-full py-1.5 text-center text-[9px] font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg transition-colors shadow-md shadow-[#2563EB]/25">
                      Pay via MoMo
                    </Link>
                  </div>

                  {/* Quick summary grids */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                      <p className="text-[8px] font-bold text-[#64748B] uppercase">Total Dues</p>
                      <p className="text-xs font-black text-[#0A1628] mt-0.5">GHS 280.00</p>
                    </div>
                    <div className="bg-[#E6FDF5] p-2.5 rounded-xl border border-emerald-100">
                      <p className="text-[8px] font-bold text-emerald-700 uppercase">Paid Dues</p>
                      <p className="text-xs font-black text-[#09261C] mt-0.5">GHS 200.00</p>
                    </div>
                  </div>

                  {/* Recent Payments log list */}
                  <div className="space-y-1.5">
                    <p className="text-[8px] font-bold text-[#64748B] uppercase tracking-wider">Recent Payments</p>
                    
                    <div className="flex justify-between items-center p-2 bg-white border border-gray-100 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center text-[10px]">
                          <WalletIcon />
                        </span>
                        <div>
                          <p className="text-[9px] font-bold text-[#0A1628]">Dept Dues</p>
                          <p className="text-[7px] text-[#64748B]">Approved</p>
                        </div>
                      </div>
                      <p className="text-[9px] font-black text-[#0A1628]">GHS 150.00</p>
                    </div>

                    <div className="flex justify-between items-center p-2 bg-white border border-gray-100 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center text-[10px]">
                          <WalletIcon />
                        </span>
                        <div>
                          <p className="text-[9px] font-bold text-[#0A1628]">SRC Levy</p>
                          <p className="text-[7px] text-[#64748B]">Approved</p>
                        </div>
                      </div>
                      <p className="text-[9px] font-black text-[#0A1628]">GHS 50.00</p>
                    </div>
                  </div>

                </div>

                {/* Mobile Bottom Navigation Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-11 bg-white border-t border-gray-100 flex justify-around items-center px-2">
                  <div className="flex flex-col items-center text-[#2563EB]">
                    <span className="w-4 h-4"><WalletIcon /></span>
                    <span className="text-[7px] font-bold mt-0.5">Home</span>
                  </div>
                  <div className="flex flex-col items-center text-gray-400 hover:text-[#2563EB] transition-colors cursor-pointer">
                    <span className="w-4 h-4"><CardIcon /></span>
                    <span className="text-[7px] font-semibold mt-0.5">Payments</span>
                  </div>
                  <div className="flex flex-col items-center text-gray-400 hover:text-[#2563EB] transition-colors cursor-pointer">
                    <span className="w-4 h-4"><ReceiptIcon /></span>
                    <span className="text-[7px] font-semibold mt-0.5">Receipts</span>
                  </div>
                  <div className="flex flex-col items-center text-gray-400 hover:text-[#2563EB] transition-colors cursor-pointer">
                    <span className="w-4 h-4"><SmsIcon /></span>
                    <span className="text-[7px] font-semibold mt-0.5">Clearance</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. SOCIAL PROOF STATS BAR */}
      <section className="bg-[#0A1628] text-white py-12 px-6 sm:px-12 border-y border-[#1E3A5F]/40">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-[#2563EB] font-display">10,000+</div>
            <p className="text-xs font-bold text-white/50 uppercase tracking-widest">Active Members</p>
          </div>
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-[#2563EB] font-display">GHS 250k+</div>
            <p className="text-xs font-bold text-white/50 uppercase tracking-widest">Secured Collections</p>
          </div>
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-[#2563EB] font-display">99.9%</div>
            <p className="text-xs font-bold text-white/50 uppercase tracking-widest">Instant Verification</p>
          </div>
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-[#2563EB] font-display">100+</div>
            <p className="text-xs font-bold text-white/50 uppercase tracking-widest">Organizations</p>
          </div>
        </div>
      </section>

      {/* 4. FEATURES GRID */}
      <section id="features" className="py-24 px-6 sm:px-12 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="font-display text-3xl sm:text-4xl font-black text-[#0A1628] tracking-tight">
            Designed for secure collection and easy accountability
          </h2>
          <p className="text-base text-[#64748B]">
            DuesPay replaces chaotic bank spreadsheets, paper booklets, and manual tracking queues with an all-in-one digital platform.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm shadow-[#2563EB]/5 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-[#F0F4FF] text-[#2563EB] flex items-center justify-center mb-6">
              <span className="w-5 h-5"><CardIcon /></span>
            </div>
            <h3 className="text-lg font-bold text-[#0A1628] mb-2">Instant MoMo & Card Payments</h3>
            <p className="text-sm text-[#64748B] leading-relaxed">
              Pay quickly using MTN Mobile Money, Telecel Cash, AirtelTigo Money, or credit cards via local gateways.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm shadow-[#2563EB]/5 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-[#F0F4FF] text-[#2563EB] flex items-center justify-center mb-6">
              <span className="w-5 h-5"><ReceiptIcon /></span>
            </div>
            <h3 className="text-lg font-bold text-[#0A1628] mb-2">Automated Digital Receipts</h3>
            <p className="text-sm text-[#64748B] leading-relaxed">
              Download PDF receipts and view your balance instantly. Admin review verifies manual transaction proofs immediately.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm shadow-[#2563EB]/5 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-[#F0F4FF] text-[#2563EB] flex items-center justify-center mb-6">
              <span className="w-5 h-5"><SmsIcon /></span>
            </div>
            <h3 className="text-lg font-bold text-[#0A1628] mb-2">SMS & Email Notifications</h3>
            <p className="text-sm text-[#64748B] leading-relaxed">
              Receive automatic alerts when your payments are approved, credentials are reset, or deadline reminders are sent.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm shadow-[#2563EB]/5 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-[#F0F4FF] text-[#2563EB] flex items-center justify-center mb-6">
              <span className="w-5 h-5"><CertificateIcon /></span>
            </div>
            <h3 className="text-lg font-bold text-[#0A1628] mb-2">Real-Time Clearance Logs</h3>
            <p className="text-sm text-[#64748B] leading-relaxed">
              Clear members instantly. Our system logs payments against specific classes, departments, and academic years.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm shadow-[#2563EB]/5 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-[#F0F4FF] text-[#2563EB] flex items-center justify-center mb-6">
              <span className="w-5 h-5"><ShieldIcon /></span>
            </div>
            <h3 className="text-lg font-bold text-[#0A1628] mb-2">Audit-Safe Action Logs</h3>
            <p className="text-sm text-[#64748B] leading-relaxed">
              All admin actions (approval of manual proofs, settings updates, imports) require automatic secure audit trails.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm shadow-[#2563EB]/5 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-[#F0F4FF] text-[#2563EB] flex items-center justify-center mb-6">
              <span className="w-5 h-5"><ChartIcon /></span>
            </div>
            <h3 className="text-lg font-bold text-[#0A1628] mb-2">Financial Dashboards</h3>
            <p className="text-sm text-[#64748B] leading-relaxed">
              Generate monthly graphs, track expected revenue, list active defaulters, and export data directly to CSV.
            </p>
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS */}
      <section id="how-it-works" className="bg-[#0A1628] text-white py-24 px-6 sm:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="font-display text-3xl sm:text-4xl font-black text-white tracking-tight">How DuesPay Works</h2>
            <p className="text-sm text-white/60">Simple and direct onboarding for both members and administration.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center bg-[#1E3A5F]/40 border border-white/5 p-8 rounded-2xl relative">
              <div className="w-12 h-12 rounded-full bg-[#2563EB] flex items-center justify-center text-white font-extrabold text-lg mx-auto mb-6">1</div>
              <h3 className="text-lg font-bold text-white mb-3">Register Members</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                Admins upload a student spreadsheet or allow students to register directly using their indices.
              </p>
            </div>

            <div className="text-center bg-[#1E3A5F]/40 border border-white/5 p-8 rounded-2xl relative">
              <div className="w-12 h-12 rounded-full bg-[#2563EB] flex items-center justify-center text-white font-extrabold text-lg mx-auto mb-6">2</div>
              <h3 className="text-lg font-bold text-white mb-3">Members Submit Payments</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                Members login to their portal, view assigned dues, and complete payments via MoMo or card.
              </p>
            </div>

            <div className="text-center bg-[#1E3A5F]/40 border border-white/5 p-8 rounded-2xl relative">
              <div className="w-12 h-12 rounded-full bg-[#2563EB] flex items-center justify-center text-white font-extrabold text-lg mx-auto mb-6">3</div>
              <h3 className="text-lg font-bold text-white mb-3">Download Verification</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                Digital receipts are generated immediately. Admins view, reconcile, and verify clearance certificates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. TESTIMONIALS */}
      <section className="py-24 px-6 sm:px-12 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <h2 className="font-display text-3xl sm:text-4xl font-black text-[#0A1628] tracking-tight">Trust by Organization Treasurers</h2>
          <p className="text-sm text-[#64748B]">Real reviews from student leaders and department administrators in West Africa.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm relative flex flex-col justify-between">
            <p className="text-sm text-[#64748B] italic leading-relaxed">
              &ldquo;Managing departmental dues was a nightmare of paper receipts. DuesPay changed everything. Now our students pay via MoMo and are cleared instantly.&rdquo;
            </p>
            <div className="mt-6 border-t border-gray-50 pt-4">
              <p className="font-bold text-[#0A1628] text-sm">Ebenezer Mensah</p>
              <p className="text-[10px] text-[#64748B] font-semibold">Department President · KNUST CS</p>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm relative flex flex-col justify-between">
            <p className="text-sm text-[#64748B] italic leading-relaxed">
              &ldquo;The SMS notifications are excellent. I knew my payment was approved the second the transaction went through. No more queues at the department office.&rdquo;
            </p>
            <div className="mt-6 border-t border-gray-50 pt-4">
              <p className="font-bold text-[#0A1628] text-sm">Abigail Osei</p>
              <p className="text-[10px] text-[#64748B] font-semibold">Student · HTU</p>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm relative flex flex-col justify-between">
            <p className="text-sm text-[#64748B] italic leading-relaxed">
              &ldquo;For audit purposes, the automated clearance logs and downloadable CSV reports have saved our treasury team countless hours. Highly recommend DuesPay.&rdquo;
            </p>
            <div className="mt-6 border-t border-gray-50 pt-4">
              <p className="font-bold text-[#0A1628] text-sm">Clement Appiah</p>
              <p className="text-[10px] text-[#64748B] font-semibold">Treasurer · GhACCA Student Chapter</p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. PRICING TEASER */}
      <section id="pricing" className="bg-[#F0F4FF] py-24 px-6 sm:px-12 border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="font-display text-3xl sm:text-4xl font-black text-[#0A1628] tracking-tight">Simple, Transparent Pricing</h2>
            <p className="text-sm text-[#64748B]">Start small, and scale up as your department or college grows.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            
            {/* Free Plan */}
            <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm flex flex-col justify-between relative">
              <div>
                <h3 className="text-lg font-bold text-[#0A1628] mb-1">Free</h3>
                <p className="text-xs text-[#64748B] mb-6">Perfect for small student associations</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-extrabold text-[#0A1628] font-display">GHS 0</span>
                  <span className="text-xs text-[#64748B]">/month</span>
                </div>
                <ul className="space-y-3.5 text-xs text-[#64748B] border-t border-gray-50 pt-6">
                  <li className="flex items-center gap-2">✔ Up to 100 students</li>
                  <li className="flex items-center gap-2">Log in and view details</li>
                  <li className="flex items-center gap-2">✔ Standard payment integration</li>
                  <li className="flex items-center gap-2">✔ Manual payment approvals</li>
                </ul>
              </div>
              <Link href="/register" className="mt-8 block w-full py-3 text-center text-xs font-bold bg-[#F0F4FF] hover:bg-[#E0EBFF] text-[#2563EB] rounded-xl transition-colors">
                Get Started
              </Link>
            </div>

            {/* Growth Plan */}
            <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm flex flex-col justify-between relative">
              <div>
                <h3 className="text-lg font-bold text-[#0A1628] mb-1">Growth</h3>
                <p className="text-xs text-[#64748B] mb-6">Ideal for departments & colleges</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-extrabold text-[#0A1628] font-display">GHS 149</span>
                  <span className="text-xs text-[#64748B]">/month</span>
                </div>
                <ul className="space-y-3.5 text-xs text-[#64748B] border-t border-gray-50 pt-6">
                  <li className="flex items-center gap-2">✔ Unlimited students</li>
                  <li className="flex items-center gap-2">✔ Automated SMS & Email alerts</li>
                  <li className="flex items-center gap-2">✔ Financial clearance reports</li>
                  <li className="flex items-center gap-2">✔ Dedicated support representative</li>
                </ul>
              </div>
              <Link href="/register" className="mt-8 block w-full py-3 text-center text-xs font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl shadow-lg shadow-[#2563EB]/20 transition-all">
                Start Growth Plan
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm flex flex-col justify-between relative">
              <div>
                <h3 className="text-lg font-bold text-[#0A1628] mb-1">Enterprise</h3>
                <p className="text-xs text-[#64748B] mb-6">For institutions and large associations</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-extrabold text-[#0A1628] font-display">Custom</span>
                </div>
                <ul className="space-y-3.5 text-xs text-[#64748B] border-t border-gray-50 pt-6">
                  <li className="flex items-center gap-2">✔ Multiple departments</li>
                  <li className="flex items-center gap-2">✔ Custom institutional domain</li>
                  <li className="flex items-center gap-2">✔ Full API integration access</li>
                  <li className="flex items-center gap-2">✔ Dedicated SLA support</li>
                </ul>
              </div>
              <Link href="/register" className="mt-8 block w-full py-3 text-center text-xs font-bold bg-[#F0F4FF] hover:bg-[#E0EBFF] text-[#2563EB] rounded-xl transition-colors">
                Contact Sales
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* 8. FINAL CTA BANNER */}
      <section className="bg-gradient-to-r from-[#0A1628] to-[#1E3A5F] text-white py-20 px-6 sm:px-12 text-center border-t border-[#1E3A5F]/40">
        <div className="max-w-4xl mx-auto space-y-6">
          <h2 className="font-display text-3xl sm:text-4xl font-black text-white tracking-tight">Ready to modernize your organizational dues?</h2>
          <p className="text-base text-white/70 max-w-2xl mx-auto">
            Set up your organization's portal in under 5 minutes. Start accepting secure payments and issue official clearance records today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/register" className="px-8 py-4 bg-[#2563EB] hover:bg-[#1D4ED8] font-bold rounded-xl shadow-xl shadow-[#2563EB]/30 transition-all active:scale-95">
              Create Organization Portal
            </Link>
            <Link href="/verify-receipt" className="px-8 py-4 bg-white/10 hover:bg-white/15 border border-white/20 font-bold rounded-xl backdrop-blur-sm transition-all active:scale-95">
              Verify Clearance Receipt
            </Link>
          </div>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className="bg-[#0A1628] text-white/65 py-16 px-6 sm:px-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto grid md:grid-cols-12 gap-10">
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-extrabold text-sm shadow-md">
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
              <li><a href="#features" className="hover:text-[#2563EB] transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="hover:text-[#2563EB] transition-colors">How it Works</a></li>
              <li><Link href="/login" className="hover:text-[#2563EB] transition-colors">Member Login</Link></li>
              <li><Link href="/admin/login" className="hover:text-[#2563EB] transition-colors">Admin Login</Link></li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest">Legal & Privacy</h4>
            <ul className="space-y-2.5 text-xs text-white/60">
              <li><Link href="/privacy" className="hover:text-[#2563EB] transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-[#2563EB] transition-colors">Terms & Conditions</Link></li>
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

    </div>
  );
}
