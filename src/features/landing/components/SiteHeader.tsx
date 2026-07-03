import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const SiteHeader = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  return (
    <header ref={navRef} className="sticky top-0 z-50">
      {/* Main Navigation Bar */}
      <div className="bg-basalt">
        <div className="max-w-[1120px] mx-auto px-5 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <svg
              className="w-8 h-8 text-lagoon"
              viewBox="0 0 40 40"
              fill="none"
            >
              <rect
                x="2"
                y="2"
                width="36"
                height="36"
                rx="8"
                stroke="currentColor"
                strokeWidth="2.5"
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
            <span className="text-white text-[22px] font-bold tracking-tight">
              CiviCheck
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/requirements"
              className="text-[15px] text-white/70 hover:text-white px-3 py-2 rounded-md transition-colors"
            >
              Services
            </Link>
            <a
              href="#how-it-works"
              className="text-[15px] text-white/70 hover:text-white px-3 py-2 rounded-md transition-colors"
            >
              How it works
            </a>
            <a
              href="#about"
              className="text-[15px] text-white/70 hover:text-white px-3 py-2 rounded-md transition-colors"
            >
              About
            </a>

            {/* Divider */}
            <div className="w-px h-5 bg-white/15 mx-2" />

            <Link
              to="/login"
              className="text-[15px] text-white/70 hover:text-white px-3 py-2 rounded-md transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="text-[14px] font-semibold text-basalt bg-lagoon hover:bg-[#0D5E53] px-4 py-2 rounded-md transition-colors ml-1"
            >
              Get started
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-white/70 hover:text-white p-2 -mr-2"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 pb-4">
            <div className="max-w-[1120px] mx-auto px-5 pt-3 space-y-1">
              <Link
                to="/requirements"
                className="block text-[15px] text-white/70 hover:text-white hover:bg-white/5 px-3 py-2.5 rounded-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                Services
              </Link>
              <a
                href="#how-it-works"
                className="block text-[15px] text-white/70 hover:text-white hover:bg-white/5 px-3 py-2.5 rounded-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                How it works
              </a>
              <a
                href="#about"
                className="block text-[15px] text-white/70 hover:text-white hover:bg-white/5 px-3 py-2.5 rounded-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </a>


              <div className="h-px bg-white/10 my-2" />

              <Link
                to="/login"
                className="block text-[15px] text-white/70 hover:text-white hover:bg-white/5 px-3 py-2.5 rounded-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="block text-center text-[14px] font-semibold text-basalt bg-lagoon hover:bg-[#0D5E53] px-4 py-2.5 rounded-md transition-colors mt-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Get started
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default SiteHeader;
