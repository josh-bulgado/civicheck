import { Link } from "@tanstack/react-router";
import { ChevronDown, Search, X, Menu } from "lucide-react";
import { useState } from "react";

const SiteHeader = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header>
      {/* Top Utility Bar */}
      <div className="bg-[#112e51]">
        <div className="max-w-[1200px] mx-auto px-4 py-[6px] flex justify-end items-center gap-1 text-[13px] text-white">
          <a href="#" className="px-2 py-1 hover:underline">
            Help
          </a>
          <span className="text-white/30">|</span>
          <a href="#" className="px-2 py-1 hover:underline">
            Contact
          </a>
          <span className="text-white/30">|</span>
          <button className="flex items-center gap-1 px-2 py-1 hover:underline">
            Filipino <ChevronDown className="w-3 h-3" />
          </button>
          <span className="text-white/30">|</span>
          <Link to="/login" className="px-2 py-1 hover:underline">
            CCRO Staff
          </Link>
          <span className="text-white/30">|</span>
          <Link
            to="/login"
            className="flex items-center gap-1 px-2 py-1 hover:underline font-semibold"
          >
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
                <svg
                  className="w-9 h-9 text-white"
                  viewBox="0 0 40 40"
                  fill="currentColor"
                >
                  <circle
                    cx="20"
                    cy="20"
                    r="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M12 20 L18 26 L28 14"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span
                  className="text-white text-[26px] font-bold tracking-tight ml-2"
                  style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                >
                  CiviCheck
                </span>
              </div>
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              {[
                "Services",
                "Requirements",
                "Track Request",
                "About",
                "Contact",
              ].map((item) => (
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
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#002d56] border-t border-white/10 pb-4">
            <div className="max-w-[1200px] mx-auto px-4">
              {[
                "Services",
                "Requirements",
                "Track Request",
                "About",
                "Contact",
              ].map((item) => (
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
};

export default SiteHeader;
