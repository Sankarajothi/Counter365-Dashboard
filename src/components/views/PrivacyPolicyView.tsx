import React from 'react';
import {
  ShieldCheck,
  Lock,
  Eye,
  Database,
  Smartphone,
  UserX,
  FileText,
  Mail,
  ArrowLeft,
  Printer,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Clock,
  Building,
} from 'lucide-react';

interface PrivacyPolicyViewProps {
  isPublic?: boolean;
  onNavigateToLogin?: () => void;
  onBackToDashboard?: () => void;
  onOpenDeleteAccount?: () => void;
}

export const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({
  isPublic = false,
  onNavigateToLogin,
  onBackToDashboard,
  onOpenDeleteAccount,
}) => {
  const lastUpdated = 'September 26, 2026';
  const effectiveDate = 'September 1, 2026';
  const contactEmail = 'Stylefleet@tecstellar.com';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#F8F3F0] text-slate-900 selection:bg-[#D4621A] selection:text-white font-sans transition-colors">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-[#D4621A] text-white border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-sm border border-white/20">
            <img
              src="/counterpro-logo.png"
              alt="CounterPro Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-wide text-white">STYLEFLEET</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white border border-white/20 uppercase">
                Legal
              </span>
            </div>
            <p className="text-[11px] text-[#F8F3F0]/80">Privacy Policy &amp; Data Governance</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors cursor-pointer shadow-xs"
            title="Print or Save as PDF"
          >
            <Printer className="w-3.5 h-3.5 text-white" />
            <span className="hidden sm:inline">Print / Save PDF</span>
          </button>

          {isPublic && onNavigateToLogin && (
            <button
              onClick={onNavigateToLogin}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#F8F3F0] text-[#D4621A] hover:bg-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <span>Admin Login</span>
              <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
            </button>
          )}

          {!isPublic && onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#F8F3F0] text-[#D4621A] hover:bg-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Hero Section */}
        <div className="p-6 sm:p-8 rounded-3xl border border-[#D4621A]/15 border-l-4 border-l-[#D4621A] bg-white shadow-xs space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4621A]/10 border border-[#D4621A]/20 text-[#D4621A] text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-[#D4621A]" />
            <span>Official CounterPro Policy</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Privacy Policy &amp; Data Protection Statement
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
            This Privacy Policy describes how <strong className="text-slate-900">CounterPro</strong> (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;), developed and operated by <strong className="text-slate-900">TECSTELLAR SOLUTIONS LLP</strong>, collects, processes, stores, and protects information when you use the CounterPro Mobile Application (Android and iOS), salon point-of-sale terminals, and the CounterPro Master Administration Portal.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500 border-t border-[#D4621A]/15">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#D4621A]" />
              <span>Effective Date: <strong className="text-slate-900 font-medium">{effectiveDate}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#D4621A]" />
              <span>Last Updated: <strong className="text-slate-900 font-medium">{lastUpdated}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-[#D4621A]" />
              <span>Operating Legal Entity: <strong className="text-slate-900 font-medium">TECSTELLAR SOLUTIONS LLP</strong></span>
            </div>
          </div>
        </div>

        {/* Quick Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-5 rounded-2xl border border-[#D4621A]/15 bg-white shadow-xs space-y-2">
            <div className="w-8 h-8 rounded-xl bg-[#D4621A]/10 text-[#D4621A] flex items-center justify-center border border-[#D4621A]/20">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">256-Bit SSL/TLS Encryption</h3>
            <p className="text-slate-600 leading-relaxed">
              All transactions, appointments, and telemetry data are encrypted in transit and at rest with Supabase Row Level Security.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-[#D4621A]/15 bg-white shadow-xs space-y-2">
            <div className="w-8 h-8 rounded-xl bg-[#D4621A]/10 text-[#D4621A] flex items-center justify-center border border-[#D4621A]/20">
              <UserX className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Right to Erasure</h3>
            <p className="text-slate-600 leading-relaxed">
              Complete account and salon deletion requests are processed transparently via the built-in deletion lifecycle protocol.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-[#D4621A]/15 bg-white shadow-xs space-y-2">
            <div className="w-8 h-8 rounded-xl bg-[#D4621A]/10 text-[#D4621A] flex items-center justify-center border border-[#D4621A]/20">
              <Eye className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Zero Data Brokering</h3>
            <p className="text-slate-600 leading-relaxed">
              We never sell, rent, or trade salon business records, customer phone numbers, or revenue statistics to third-party advertisers.
            </p>
          </div>
        </div>

        {/* Policy Sections */}
        <div className="space-y-6 text-slate-600 text-xs sm:text-sm leading-relaxed">
          {/* Section 1 */}
          <section className="p-6 rounded-2xl border border-[#D4621A]/15 bg-white shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <span className="w-6 h-6 rounded-full bg-[#D4621A] text-white flex items-center justify-center text-xs font-mono">1</span>
              <h2>Information We Collect</h2>
            </div>
            <p>
              When salon owners, managers, staff stylists, or clients interact with the CounterPro ecosystem, we collect information necessary to deliver appointment booking, point-of-sale invoicing, and salon management services:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li>
                <strong className="text-slate-900">Salon Business Profiles:</strong> Salon/shop name, contact email, telephone number, business address, GSTIN/tax identifier, service catalog, and operational working hours.
              </li>
              <li>
                <strong className="text-slate-900">User Account Credentials:</strong> Mobile phone number, full name, role assignment (Owner, Manager, Stylist), and authentication identifiers.
              </li>
              <li>
                <strong className="text-slate-900">Appointments &amp; Customer Bookings:</strong> Customer full name, contact number, scheduled date/time, requested stylist, service selections, and appointment status.
              </li>
              <li>
                <strong className="text-slate-900">Billing &amp; Transaction Invoices:</strong> Invoice sequence numbers, subtotal amounts, discounts applied, taxes, total billed, payment method (Cash, UPI, Card), and payment fulfillment status. <span className="text-slate-900 font-medium">CounterPro does not process or retain raw credit card numbers or banking PINs.</span>
              </li>
              <li>
                <strong className="text-slate-900">Device Hardware &amp; Telemetry Data:</strong> As recorded in our telemetry system, we collect anonymous hardware identifiers, mobile platform (Android/iOS), OS build version, app build version, battery charging status, and network connection type to ensure reliable offline-first bill synchronization.
              </li>
              <li>
                <strong className="text-slate-900">System Logs &amp; Error Diagnostics:</strong> Crash dumps, unhandled exception stack traces, and API latency measurements to diagnose and resolve software bugs.
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="p-6 rounded-2xl border border-[#D4621A]/15 bg-white shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <span className="w-6 h-6 rounded-full bg-[#D4621A] text-white flex items-center justify-center text-xs font-mono">2</span>
              <h2>How We Use Collected Information</h2>
            </div>
            <p>
              CounterPro processes data strictly for legitimate operational, security, and contractual requirements:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li>Facilitating appointment scheduling, reminders, and calendar coordination for salon teams.</li>
              <li>Generating point-of-sale invoices, customer receipts, and daily salon closing reports.</li>
              <li>Providing multi-device synchronization so salon managers can access real-time metrics across tablet, phone, and web.</li>
              <li>Monitoring platform uptime, endpoint latency, and software exception alerts via the Master Admin Dashboard.</li>
              <li>Responding to support tickets submitted through the in-app support desk.</li>
              <li>Executing account deletion and privacy purge requests in compliance with statutory requirements.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="p-6 rounded-2xl border border-[#D4621A]/15 bg-white shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <span className="w-6 h-6 rounded-full bg-[#D4621A] text-white flex items-center justify-center text-xs font-mono">3</span>
              <h2>Data Storage, Architecture &amp; Security</h2>
            </div>
            <p>
              We enforce strict technical and organizational safeguards to protect your personal and commercial data:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li>
                <strong className="text-slate-900">PostgreSQL Row Level Security (RLS):</strong> Our database implements granular RLS policies ensuring that each salon can only read and write their own data records.
              </li>
              <li>
                <strong className="text-slate-900">Encryption in Transit &amp; at Rest:</strong> All client-to-server traffic is encrypted using TLS 1.3/HTTPS. Underlying database volumes are encrypted using industry-standard AES-256 encryption.
              </li>
              <li>
                <strong className="text-slate-900">Role-Based Access Control:</strong> Super Administrator access to internal dashboards requires multi-factor authentication and strict IP/session auditing.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="p-6 rounded-2xl border border-[#D4621A]/15 bg-white shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <span className="w-6 h-6 rounded-full bg-[#D4621A] text-white flex items-center justify-center text-xs font-mono">4</span>
              <h2>Account Deletion &amp; Right to be Forgotten (GDPR / Indian DPDP Compliance)</h2>
            </div>
            <p>
              CounterPro upholds your absolute right to account deletion and permanent data erasure:
            </p>
            <div className="p-4 rounded-xl bg-[#F8F3F0] border border-[#D4621A]/15 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <UserX className="w-4 h-4 text-[#D4621A]" />
                <span>How to Request Account Deletion</span>
              </div>
              <p className="text-slate-700 text-xs leading-relaxed">
                Salons and registered users can initiate account deletion at any time through:
              </p>
              <ol className="list-decimal pl-5 space-y-1 text-xs text-slate-600">
                <li>The in-app settings menu: <strong className="text-slate-900">Settings &rarr; Account &rarr; Delete Account</strong>.</li>
                <li>Direct email submission to <strong className="text-slate-900 font-mono">{contactEmail}</strong> with the subject line <em>&ldquo;Account Deletion Request&rdquo;</em> from your registered salon email address.</li>
              </ol>
              <p className="text-slate-600 text-xs">
                Upon verified submission, your account enters the <strong className="text-slate-900">Account Deletions Lifecycle</strong> (monitored in the Master Admin Dashboard), where personal identity records, profiles, and salon identifiers are permanently redacted and purged within 30 days, subject only to statutory tax record retention obligations.
              </p>
              {onOpenDeleteAccount && (
                <div className="pt-2">
                  <button
                    onClick={onOpenDeleteAccount}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#D4621A] hover:bg-[#bf5312] text-white text-xs font-semibold cursor-pointer transition-colors shadow-xs"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>View Standalone Account Deletion Instructions &rarr;</span>
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Section 5 */}
          <section className="p-6 rounded-2xl border border-[#D4621A]/15 bg-white shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <span className="w-6 h-6 rounded-full bg-[#D4621A] text-white flex items-center justify-center text-xs font-mono">5</span>
              <h2>Third-Party Service Providers</h2>
            </div>
            <p>
              We engage select third-party service providers solely to host, maintain, and support our application infrastructure:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li>
                <strong className="text-slate-900">Supabase (PostgreSQL &amp; Auth Engine):</strong> Cloud database hosting, realtime WebSocket synchronization, and secure data storage.
              </li>
              <li>
                <strong className="text-slate-900">Expo / React Native:</strong> Mobile application runtime and over-the-air update delivery.
              </li>
              <li>
                <strong className="text-slate-900">Vercel:</strong> Web application hosting for the CounterPro administrative console.
              </li>
            </ul>
            <p className="text-xs text-slate-500">
              Each vendor maintains independent SOC-2, ISO-27001, or GDPR compliance standards and is bound by data processing agreements prohibiting secondary use of salon data.
            </p>
          </section>

          {/* Section 6 */}
          <section className="p-6 rounded-2xl border border-[#D4621A]/15 bg-white shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <span className="w-6 h-6 rounded-full bg-[#D4621A] text-white flex items-center justify-center text-xs font-mono">6</span>
              <h2>Children&rsquo;s Privacy Protection</h2>
            </div>
            <p>
              Our application and services are strictly targeted at commercial salon establishments and individuals aged 18 and older. We do not knowingly collect or solicit personal data from children under 13 years of age. If we learn that personal data of a minor has been inadvertently collected without verifiable parental consent, we take immediate steps to delete that information.
            </p>
          </section>

          {/* Section 7 */}
          <section className="p-6 rounded-2xl border border-[#D4621A]/15 bg-white shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <span className="w-6 h-6 rounded-full bg-[#D4621A] text-white flex items-center justify-center text-xs font-mono">7</span>
              <h2>Contact Us &amp; Grievance Redressal</h2>
            </div>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data handling practices, please contact our Data Protection and Grievance Officer:
            </p>
            <div className="p-4 rounded-xl bg-[#F8F3F0] border border-[#D4621A]/15 space-y-1.5 text-xs">
              <div className="font-bold text-slate-900 text-sm">CounterPro Data Protection Officer</div>
              <div className="text-slate-700">Legal Entity: <strong className="text-slate-900">TECSTELLAR SOLUTIONS LLP</strong></div>
              <div className="flex items-center gap-1.5 text-[#D4621A] font-mono font-bold">
                <Mail className="w-3.5 h-3.5" />
                <span>{contactEmail}</span>
              </div>
              <div className="text-slate-600">Registered Office: 60, Subramaniam Rd, R.S. Puram, Coimbatore, Tamil Nadu 641002, India</div>
            </div>
          </section>
        </div>

        {/* Footer Notice */}
        <div className="pt-6 border-t border-[#D4621A]/15 text-center text-xs text-slate-500 space-y-1">
          <p>&copy; {new Date().getFullYear()} CounterPro. Owned &amp; Operated by <strong className="text-slate-800">TECSTELLAR SOLUTIONS LLP</strong>. All rights reserved.</p>
          <p className="text-[11px] text-slate-400">
            This policy applies to the CounterPro Mobile Application, Web Dashboard, and POS Services.
          </p>
        </div>
      </main>
    </div>
  );
};
