'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useBranding } from '@/contexts/BrandingContext';

export default function PrivacyPolicyPage() {
  const { appName } = useBranding();
  const effectiveDate = 'May 31, 2026';

  return (
    <div className="min-h-screen bg-neutral">
      <Navbar />
      <main className="container mx-auto px-4 py-10">
        <div className="max-w-4xl mx-auto card space-y-8">
          <div className="border-b pb-6">
            <p className="text-sm font-semibold text-secondary uppercase tracking-wide">Privacy Policy</p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-primary mt-2">{appName}</h1>
            <p className="text-sm text-gray-500 mt-2">Effective date: {effectiveDate}</p>
          </div>

          <section className="space-y-3 text-gray-700 leading-relaxed">
            <h2 className="text-xl font-bold text-primary">1. Purpose of this policy</h2>
            <p>
              This Privacy Policy explains how {appName} collects, uses, stores, and protects student and administrative information used for dues management, payment tracking, receipts, notifications, and account access.
            </p>
            <p>
              The platform is intended for authorized students, administrators, and approved institutional users. It is not designed for public social networking, marketing to children, or unrelated data collection.
            </p>
          </section>

          <section className="space-y-3 text-gray-700 leading-relaxed">
            <h2 className="text-xl font-bold text-primary">2. Age and child privacy</h2>
            <p>
              Users under 13 years old should not create an account or submit personal information unless the account is created or authorized by a parent, guardian, school, department, or other authorized administrator.
            </p>
            <p>
              Where a user is a minor, the platform should only collect information needed for student identification, dues assignment, payment confirmation, receipts, and official communication. If an account for a user under 13 is discovered without proper authorization, an administrator may suspend or remove the account and related access.
            </p>
          </section>

          <section className="space-y-3 text-gray-700 leading-relaxed">
            <h2 className="text-xl font-bold text-primary">3. Information we collect</h2>
            <p>Depending on how the system is configured, the platform may collect:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Student name, index number, programme, level, academic year, phone number, and email address.</li>
              <li>Login credentials, authentication tokens, and account status.</li>
              <li>Dues assigned to a student, payment amount, balance, receipt number, and payment status.</li>
              <li>Manual payment proof uploaded by a student, where manual payment is enabled.</li>
              <li>SMS or email delivery records for payment confirmations, receipt notices, reminders, or credential resets.</li>
              <li>Administrative activity logs used for security, accountability, and audit purposes.</li>
            </ul>
          </section>

          <section className="space-y-3 text-gray-700 leading-relaxed">
            <h2 className="text-xl font-bold text-primary">4. How we use information</h2>
            <p>Information is used to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Create and manage student accounts.</li>
              <li>Assign, track, approve, and verify dues payments.</li>
              <li>Generate digital receipts and maintain payment history.</li>
              <li>Send payment confirmations, receipt notices, reminders, and login reset details.</li>
              <li>Help administrators manage reports, reconciliation, and audit logs.</li>
              <li>Protect the platform from unauthorized access, fraud, misuse, or errors.</li>
            </ul>
          </section>

          <section className="space-y-3 text-gray-700 leading-relaxed">
            <h2 className="text-xl font-bold text-primary">5. Payment information</h2>
            <p>
              Online payments may be processed through a third-party payment provider such as Paystack. The platform does not store full card details. Payment references, transaction status, amount, and receipt information may be stored for reconciliation and proof of payment.
            </p>
            <p>
              For manual payments, students may upload proof of payment. Administrators should review uploaded proof only for official payment verification.
            </p>
          </section>

          <section className="space-y-3 text-gray-700 leading-relaxed">
            <h2 className="text-xl font-bold text-primary">6. SMS and email notifications</h2>
            <p>
              The platform may send SMS or email messages for payment confirmations, receipts, reminders, account notices, and credential resets. Users are responsible for providing accurate phone numbers and email addresses.
            </p>
            <p>
              Sensitive login reset messages should be treated as confidential. Students should change temporary passwords after login.
            </p>
          </section>

          <section className="space-y-3 text-gray-700 leading-relaxed">
            <h2 className="text-xl font-bold text-primary">7. Sharing of information</h2>
            <p>
              Information may be accessible to authorized administrators, treasurers, financial secretaries, technical support personnel, payment processors, SMS/email providers, and service providers needed to operate the system. Information should not be sold or used for unrelated advertising.
            </p>
          </section>

          <section className="space-y-3 text-gray-700 leading-relaxed">
            <h2 className="text-xl font-bold text-primary">8. Data protection and security</h2>
            <p>
              The platform should use reasonable administrative, technical, and organizational safeguards to protect personal information. These include password hashing, access controls, audit logs, secure payment processing, and limited administrator access.
            </p>
            <p>
              No online system is completely risk-free. Users should keep passwords private and report suspicious account activity to an administrator.
            </p>
          </section>

          <section className="space-y-3 text-gray-700 leading-relaxed">
            <h2 className="text-xl font-bold text-primary">9. Data retention</h2>
            <p>
              Student, payment, receipt, and audit information may be kept for as long as needed for dues administration, accounting, dispute resolution, audits, compliance, and institutional records. Administrators may delete or archive information where appropriate and lawful.
            </p>
          </section>

          <section className="space-y-3 text-gray-700 leading-relaxed">
            <h2 className="text-xl font-bold text-primary">10. User rights and corrections</h2>
            <p>
              Students may request correction of inaccurate profile information, subject to administrator verification. Requests about access, correction, or deletion of personal information should be directed to the system administrator or responsible institution.
            </p>
          </section>

          <section className="space-y-3 text-gray-700 leading-relaxed">
            <h2 className="text-xl font-bold text-primary">11. Contact</h2>
            <p>
              For privacy-related requests, contact the institution, department, or administrator responsible for operating {appName}.
            </p>
          </section>

          <div className="pt-6 border-t flex flex-wrap gap-3">
            <Link href="/terms" className="btn-outline">View Terms & Conditions</Link>
            <Link href="/" className="btn-primary">Back to Home</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
