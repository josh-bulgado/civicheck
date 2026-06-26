import { useState } from 'react';
import {
  Search,
  FileText,
  ClipboardCheck,
  Bell,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Monitor,
  Users,
  ShieldCheck,
  ExternalLink,
  Menu,
  X,
  Heart,
  ScrollText,
  Baby,
  Gem,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';

/* ──────────────────── HEADER ──────────────────── */
function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header>
      {/* Top Utility Bar */}
      <div className="bg-[#112e51]">
        <div className="max-w-[1200px] mx-auto px-4 py-[6px] flex justify-end items-center gap-1 text-[13px] text-white">
          <a href="#" className="px-2 py-1 hover:underline">Help</a>
          <span className="text-white/30">|</span>
          <a href="#" className="px-2 py-1 hover:underline">Contact</a>
          <span className="text-white/30">|</span>
          <button className="flex items-center gap-1 px-2 py-1 hover:underline">
            Filipino <ChevronDown className="w-3 h-3" />
          </button>
          <span className="text-white/30">|</span>
          <Link to="/login" className="px-2 py-1 hover:underline">CCRO Staff</Link>
          <span className="text-white/30">|</span>
          <Link to="/login" className="flex items-center gap-1 px-2 py-1 hover:underline font-semibold">
            Sign in
          </Link>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="bg-[#003366]">
        <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link to="/" className="flex items-center gap-2">
              {/* Logo */}
              <div className="flex items-center">
                <svg className="w-9 h-9 text-white" viewBox="0 0 40 40" fill="currentColor">
                  <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path d="M12 20 L18 26 L28 14" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-white text-[26px] font-bold tracking-tight ml-2" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                  CiviCheck
                </span>
              </div>
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              {['Services', 'Requirements', 'Track Request', 'About', 'Contact'].map((item) => (
                <a
                  key={item}
                  href="#"
                  className="text-white text-[15px] font-medium px-3 py-2 rounded hover:bg-white/10 transition-colors"
                >
                  {item}
                </a>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="hidden md:flex items-center">
              <input
                type="text"
                placeholder="Search"
                className="w-[200px] h-[34px] px-3 text-sm text-gray-800 bg-white border-none rounded-l-sm outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <button className="h-[34px] w-[34px] bg-white flex items-center justify-center rounded-r-sm border-l border-gray-300">
                <Search className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden text-white p-2"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#002d56] border-t border-white/10 pb-4">
            <div className="max-w-[1200px] mx-auto px-4">
              {['Services', 'Requirements', 'Track Request', 'About', 'Contact'].map((item) => (
                <a
                  key={item}
                  href="#"
                  className="block text-white text-sm py-3 border-b border-white/10 hover:bg-white/5"
                >
                  {item}
                </a>
              ))}
              <div className="mt-3 flex items-center">
                <input
                  type="text"
                  placeholder="Search"
                  className="flex-1 h-[34px] px-3 text-sm text-gray-800 bg-white rounded-l-sm outline-none"
                />
                <button className="h-[34px] w-[34px] bg-white flex items-center justify-center rounded-r-sm border-l border-gray-300">
                  <Search className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Eyebrow Banner */}
      <div className="bg-[#f0f0f0] border-b border-gray-300">
        <div className="max-w-[1200px] mx-auto px-4 py-2 flex items-center gap-3 text-sm">
          <div className="w-10 h-10 rounded-full bg-[#003366]/10 flex items-center justify-center flex-shrink-0">
            <span className="text-lg">🏛️</span>
          </div>
          <p className="text-gray-700 font-medium">
            City Civil Registrar Office · City Government of Legazpi
          </p>
        </div>
      </div>
    </header>
  );
}

/* ──────────────────── HERO ──────────────────── */
function HeroSection() {
  return (
    <section className="bg-white">
      <div className="max-w-[1200px] mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Left: Value Proposition */}
          <div className="md:col-span-5 space-y-6">
            <h1 className="text-[2.5rem] md:text-[2.85rem] leading-[1.1] font-bold text-[#1b1b1b]">
              Know What You Need.<br />Before You Need It.
            </h1>
            <p className="text-[17px] text-[#444] leading-relaxed">
              CiviCheck shows you the exact requirements for your birth, marriage, or death certificate,
              or certified true copy request — then tracks it from submission to release, so you're not
              making repeat trips to the CCRO just to find out you forgot a document.
            </p>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {['Requirement checklists', 'Status tracking', 'Online or walk-in', 'Email notifications'].map((item) => (
                <div key={item} className="flex items-center gap-2 text-[15px] font-semibold text-[#1b1b1b]">
                  <CheckCircle2 className="w-[18px] h-[18px] text-[#1b1b1b] flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/signup"
                className="inline-block bg-[#005ea2] hover:bg-[#1a4480] text-white font-bold text-base px-6 py-3 rounded transition-colors"
              >
                Check My Requirements
              </Link>
              <Link
                to="/login"
                search={{ redirect: '/dashboard' }}
                className="inline-block border-2 border-[#005ea2] text-[#005ea2] font-bold text-base px-6 py-3 rounded hover:bg-[#005ea2] hover:text-white transition-colors"
              >
                Track an Existing Request
              </Link>
            </div>
          </div>

          {/* Center: Illustration */}
          <div className="md:col-span-3 flex justify-center items-center">
            <div className="relative w-full max-w-[280px]">
              {/* Simple SVG illustration of person with documents */}
              <svg viewBox="0 0 300 300" className="w-full h-auto" fill="none">
                {/* Desk */}
                <rect x="60" y="200" width="180" height="8" rx="4" fill="#5b616b" />
                <rect x="80" y="208" width="8" height="60" rx="2" fill="#5b616b" />
                <rect x="212" y="208" width="8" height="60" rx="2" fill="#5b616b" />
                {/* Laptop */}
                <rect x="100" y="160" width="100" height="40" rx="3" fill="#205493" />
                <rect x="105" y="165" width="90" height="28" rx="2" fill="#e8f5ff" />
                <rect x="80" y="200" width="140" height="5" rx="2" fill="#aeb0b5" />
                {/* Person body */}
                <circle cx="150" cy="100" r="28" fill="#d4aa00" />
                <circle cx="150" cy="95" r="22" fill="#8B6914" />
                <circle cx="150" cy="85" r="18" fill="#f5d5c8" />
                {/* Hair */}
                <ellipse cx="150" cy="75" rx="20" ry="14" fill="#3e2723" />
                {/* Glasses */}
                <circle cx="143" cy="84" r="5" fill="none" stroke="#333" strokeWidth="1.5" />
                <circle cx="157" cy="84" r="5" fill="none" stroke="#333" strokeWidth="1.5" />
                <line x1="148" y1="84" x2="152" y2="84" stroke="#333" strokeWidth="1.5" />
                {/* Body */}
                <path d="M125 110 Q150 135 175 110 L175 165 Q150 175 125 165 Z" fill="#205493" />
                {/* Arms */}
                <path d="M125 120 Q100 140 105 170" stroke="#f5d5c8" strokeWidth="8" strokeLinecap="round" fill="none" />
                <path d="M175 120 Q200 140 195 170" stroke="#f5d5c8" strokeWidth="8" strokeLinecap="round" fill="none" />
                {/* Chair */}
                <rect x="120" y="170" width="60" height="35" rx="5" fill="#112e51" />
                <rect x="145" y="205" width="10" height="40" rx="3" fill="#5b616b" />
              </svg>
            </div>
          </div>

          {/* Right: Quick Actions Card */}
          <div className="md:col-span-4">
            <div className="border border-gray-300 rounded shadow-sm overflow-hidden">
              {/* Card header */}
              <div className="bg-white px-6 pt-6 pb-4">
                <h2 className="text-xl font-bold text-[#1b1b1b] mb-1">Track Your Request</h2>
                <p className="text-[15px] text-[#5b616b]">Two ways to check your status</p>
              </div>

              <div className="px-6 pb-6 space-y-5">
                {/* Option 1 */}
                <div>
                  <h3 className="font-bold text-[15px] text-[#1b1b1b] mb-1">CiviCheck account</h3>
                  <p className="text-sm text-[#5b616b] mb-3 leading-relaxed">
                    Sign in to view your requests, get status updates, and receive email notifications.
                  </p>
                  <Link
                    to="/login"
                    search={{ redirect: '/dashboard' }}
                    className="inline-block border-2 border-[#005ea2] text-[#005ea2] font-bold text-sm px-5 py-2 rounded hover:bg-[#005ea2] hover:text-white transition-colors"
                  >
                    Sign in
                  </Link>
                </div>

                <hr className="border-gray-200" />

                {/* Option 2 */}
                <div>
                  <h3 className="font-bold text-[15px] text-[#1b1b1b] mb-1">Tracking number lookup</h3>
                  <p className="text-sm text-[#5b616b] mb-3 leading-relaxed">
                    Enter your tracking number to check where your request stands. No sign-in needed.
                  </p>
                  <a
                    href="#"
                    className="inline-block border-2 border-[#005ea2] text-[#005ea2] font-bold text-sm px-5 py-2 rounded hover:bg-[#005ea2] hover:text-white transition-colors"
                  >
                    Track my request
                  </a>
                </div>
              </div>

              <div className="px-6 pb-5">
                <a href="#" className="text-sm text-[#205493] hover:underline">
                  Need help tracking?
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────── FIND HELP BANNER ──────────────────── */
function AboutBanner() {
  return (
    <div className="bg-white border-t border-b border-gray-200">
      <div className="max-w-[1200px] mx-auto px-4 py-6">
        <div className="border-l-[6px] border-l-[#e59700] bg-[#fef2e4] p-5 md:flex md:items-center md:gap-8">
          <h2 className="text-[22px] font-bold text-[#1b1b1b] mb-2 md:mb-0 md:min-w-[220px]">
            About CiviCheck
          </h2>
          <div className="text-[15px] text-[#444]">
            The City Civil Registrar Office (CCRO) of Legazpi City registers and issues official birth, marriage, death, and other civil registry records. CiviCheck was built to make that process clearer and faster for residents and staff alike, without changing how the office legally operates.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────── WHY CIVICHECK ──────────────────── */
function WhyCiviCheck() {
  const features = [
    {
      icon: <ClipboardCheck className="w-7 h-7" />,
      title: 'Clear Requirement Checklists',
      desc: 'Stop guessing. See exactly what to bring, before you leave the house.',
    },
    {
      icon: <Monitor className="w-7 h-7" />,
      title: 'Real-Time Status Tracking',
      desc: 'Check where your request stands, anytime, online.',
    },
    {
      icon: <Users className="w-7 h-7" />,
      title: 'Online or Walk-In',
      desc: 'Submit digitally, or have CCRO staff encode your request in person. Either way works.',
    },
    {
      icon: <CheckCircle2 className="w-7 h-7" />,
      title: 'Fewer Repeat Trips',
      desc: 'Pre-validation catches missing documents early, so you\'re not turned away at the counter.',
    },
    {
      icon: <Bell className="w-7 h-7" />,
      title: 'Timely Notifications',
      desc: 'Get updates by email and in-system as your request moves forward.',
    },
    {
      icon: <ShieldCheck className="w-7 h-7" />,
      title: 'Role-Based Access',
      desc: 'Your information is only visible to authorized CCRO personnel.',
    },
  ];

  return (
    <section className="bg-[#f1f1f1]">
      <div className="max-w-[1200px] mx-auto px-4 py-14">
        <div className="text-center mb-10">
          <h2 className="text-[28px] font-bold text-[#1b1b1b] inline-block relative pb-3">
            Why CiviCheck
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-[3px] bg-[#d4a017]" />
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature) => (
            <a
              key={feature.title}
              href="#"
              className="bg-white p-6 rounded border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all group block"
            >
              <div className="text-[#205493] mb-4">{feature.icon}</div>
              <h3 className="text-lg font-bold text-[#1b1b1b] mb-2 group-hover:text-[#205493] transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm text-[#5b616b] leading-relaxed">{feature.desc}</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────── HOW IT WORKS ──────────────────── */
function HowItWorks() {
  const steps = [
    {
      number: '1',
      title: 'Select Your Document',
      desc: 'Choose the civil registry document you need.',
    },
    {
      number: '2',
      title: 'Review Your Checklist',
      desc: 'See exactly what\'s required, including anything you need from another office first.',
    },
    {
      number: '3',
      title: 'Submit & Get a Tracking Number',
      desc: 'Submit online or at the CCRO window, and get a tracking number to follow your request.',
    },
    {
      number: '4',
      title: 'Track, Get Notified, Claim',
      desc: 'Watch your request move through validation, processing, and approval, get notified when it\'s ready, then claim it at the CCRO.',
    },
  ];

  return (
    <section className="bg-white">
      <div className="max-w-[1200px] mx-auto px-4 py-14">
        <div className="text-center mb-10">
          <h2 className="text-[28px] font-bold text-[#1b1b1b] inline-block relative pb-3">
            How it works
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-[3px] bg-[#d4a017]" />
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-[900px] mx-auto">
          {steps.map((step, i) => (
            <div key={step.number} className="relative text-center">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-6 left-[60%] w-[80%] h-[2px] bg-gray-200" />
              )}
              <div className="w-12 h-12 rounded-full bg-[#005ea2] text-white text-lg font-bold flex items-center justify-center mx-auto mb-4 relative z-10">
                {step.number}
              </div>
              <h3 className="font-bold text-[15px] text-[#1b1b1b] mb-2">{step.title}</h3>
              <p className="text-sm text-[#5b616b] leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────── SERVICES OFFERED ──────────────────── */
function ServicesSection() {
  const services = [
    {
      icon: <Baby className="w-8 h-8" />,
      title: 'Birth Certificate',
      desc: 'Request a copy of a birth certificate registered with the CCRO.',
      bgColor: '#e8f5ff',
    },
    {
      icon: <Gem className="w-8 h-8" />,
      title: 'Marriage Certificate',
      desc: 'Request a copy of a marriage certificate registered with the CCRO.',
      bgColor: '#fff3e0',
    },
    {
      icon: <Heart className="w-8 h-8" />,
      title: 'Death Certificate',
      desc: 'Request a copy of a death certificate registered with the CCRO.',
      bgColor: '#f1f1f1',
    },
    {
      icon: <ScrollText className="w-8 h-8" />,
      title: 'Certified True Copy (CTC)',
      desc: 'Request a certified true copy of a civil registry document on file.',
      bgColor: '#e8f5e9',
    },
  ];

  return (
    <section className="bg-[#f1f1f1] border-t border-gray-200">
      <div className="max-w-[1200px] mx-auto px-4 py-14">
        <div className="text-center mb-10">
          <h2 className="text-[28px] font-bold text-[#1b1b1b] inline-block relative pb-3">
            Services offered
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-[3px] bg-[#d4a017]" />
          </h2>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 px-4">
          {services.map((service) => (
            <a key={service.title} href="#" className="bg-white border border-gray-200 rounded overflow-hidden hover:shadow-md transition-shadow block group">
              {/* Icon area */}
              <div className="h-[140px] flex items-center justify-center" style={{ backgroundColor: service.bgColor }}>
                <div className="text-center p-4">
                  <div className="w-14 h-14 mx-auto bg-[#003366]/10 rounded-lg flex items-center justify-center">
                    <div className="text-[#003366]">{service.icon}</div>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-[15px] text-[#1b1b1b] mb-2 leading-snug group-hover:text-[#205493] transition-colors">
                  {service.title}
                </h3>
                <p className="text-[13px] text-[#5b616b] mb-3 leading-relaxed">{service.desc}</p>
                <span className="text-sm text-[#205493] hover:underline">Check requirements →</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────── FOOTER ──────────────────── */
function SiteFooter() {
  return (
    <footer>
      {/* Main Footer Links */}
      <div className="bg-[#f1f1f1] border-t border-gray-300">
        <div className="max-w-[1200px] mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {/* Services */}
          <div>
            <h4 className="font-bold text-[13px] text-[#1b1b1b] uppercase tracking-wider mb-4">Services</h4>
            <ul className="space-y-2">
              {['Birth Certificate', 'Marriage Certificate', 'Death Certificate', 'Certified True Copy (CTC)'].map((link) => (
                <li key={link}>
                  <a href="#" className="text-[14px] text-[#205493] hover:underline">{link}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* For Applicants */}
          <div>
            <h4 className="font-bold text-[13px] text-[#1b1b1b] uppercase tracking-wider mb-4">For Applicants</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/signup" className="text-[14px] text-[#205493] hover:underline">Check Requirements</Link>
              </li>
              <li>
                <Link to="/signup" className="text-[14px] text-[#205493] hover:underline">Submit a Request</Link>
              </li>
              <li>
                <Link to="/login" search={{ redirect: '/dashboard' }} className="text-[14px] text-[#205493] hover:underline">Track Your Request</Link>
              </li>
              <li>
                <Link to="/signup" className="text-[14px] text-[#205493] hover:underline">Create an Account</Link>
              </li>
              <li>
                <a href="#" className="text-[14px] text-[#205493] hover:underline">Help &amp; FAQs</a>
              </li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h4 className="font-bold text-[13px] text-[#1b1b1b] uppercase tracking-wider mb-4">About</h4>
            <ul className="space-y-2">
              {['About CCRO', 'About CiviCheck', 'Privacy Policy', 'Accessibility'].map((link) => (
                <li key={link}>
                  <a href="#" className="text-[14px] text-[#205493] hover:underline">{link}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-[13px] text-[#1b1b1b] uppercase tracking-wider mb-4">Contact</h4>
            <p className="text-[14px] text-[#444] leading-relaxed mb-2">
              City Civil Registrar Office<br />
              City Government of Legazpi
            </p>
            <p className="text-[13px] text-[#5b616b] italic">
              Office address, hours, and contact number to be confirmed with CCRO.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-[#1b1b1b]">
        <div className="max-w-[1200px] mx-auto px-4 py-5 flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <svg className="w-7 h-7 text-white" viewBox="0 0 40 40" fill="currentColor">
              <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M12 20 L18 26 L28 14" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-white text-xl font-bold" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
              CiviCheck
            </span>
          </div>

          {/* Office info */}
          <p className="text-sm text-white/70 text-center">
            City Civil Registrar Office · City Government of Legazpi
          </p>

          {/* Legal Links */}
          <div className="flex items-center gap-3 text-sm text-white/80">
            <a href="#" className="hover:underline hover:text-white">Privacy Policy</a>
            <span className="text-white/30">|</span>
            <a href="#" className="hover:underline hover:text-white">Accessibility</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ──────────────────── MAIN PAGE ──────────────────── */
export default function CivicheckHome() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Source Sans Pro', 'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <SiteHeader />
      <main>
        <HeroSection />
        <AboutBanner />
        <HowItWorks />
        <ServicesSection />
        <WhyCiviCheck />
      </main>
      <SiteFooter />
    </div>
  );
}
