import { Link } from "@tanstack/react-router";

const SiteFooter = () => {
  return (
    <footer>
      {/* Main Footer Links */}
      <div className="bg-[#f1f1f1] border-t border-gray-300">
        <div className="max-w-[1200px] mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {/* Services */}
          <div>
            <h4 className="font-bold text-[13px] text-[#1b1b1b] uppercase tracking-wider mb-4">
              Services
            </h4>
            <ul className="space-y-2">
              {[
                "Birth Certificate",
                "Marriage Certificate",
                "Death Certificate",
                "Certified True Copy (CTC)",
              ].map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-[14px] text-[#205493] hover:underline"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* For Applicants */}
          <div>
            <h4 className="font-bold text-[13px] text-[#1b1b1b] uppercase tracking-wider mb-4">
              For Applicants
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/signup"
                  className="text-[14px] text-[#205493] hover:underline"
                >
                  Check Requirements
                </Link>
              </li>
              <li>
                <Link
                  to="/signup"
                  className="text-[14px] text-[#205493] hover:underline"
                >
                  Submit a Request
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  search={{ redirect: "/dashboard" }}
                  className="text-[14px] text-[#205493] hover:underline"
                >
                  Track Your Request
                </Link>
              </li>
              <li>
                <Link
                  to="/signup"
                  className="text-[14px] text-[#205493] hover:underline"
                >
                  Create an Account
                </Link>
              </li>
              <li>
                <a
                  href="#"
                  className="text-[14px] text-[#205493] hover:underline"
                >
                  Help &amp; FAQs
                </a>
              </li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h4 className="font-bold text-[13px] text-[#1b1b1b] uppercase tracking-wider mb-4">
              About
            </h4>
            <ul className="space-y-2">
              {[
                "About CCRO",
                "About CiviCheck",
                "Privacy Policy",
                "Accessibility",
              ].map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-[14px] text-[#205493] hover:underline"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-[13px] text-[#1b1b1b] uppercase tracking-wider mb-4">
              Contact
            </h4>
            <p className="text-[14px] text-[#444] leading-relaxed mb-2">
              City Civil Registrar Office
              <br />
              City Government of Legazpi
            </p>
            <p className="text-[13px] text-[#5b616b] italic">
              Office address, hours, and contact number to be confirmed with
              CCRO.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-[#1b1b1b]">
        <div className="max-w-[1200px] mx-auto px-4 py-5 flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <svg
              className="w-7 h-7 text-white"
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
              className="text-white text-xl font-bold"
              style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
            >
              CiviCheck
            </span>
          </div>

          {/* Office info */}
          <p className="text-sm text-white/70 text-center">
            City Civil Registrar Office · City Government of Legazpi
          </p>

          {/* Legal Links */}
          <div className="flex items-center gap-3 text-sm text-white/80">
            <a href="#" className="hover:underline hover:text-white">
              Privacy Policy
            </a>
            <span className="text-white/30">|</span>
            <a href="#" className="hover:underline hover:text-white">
              Accessibility
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
