import { Link } from "@tanstack/react-router";

const SiteFooter = () => {
  return (
    <footer className="bg-basalt">
      {/* Main Footer Links */}
      <div className="border-b border-white/8">
        <div className="max-w-[1120px] mx-auto px-5 py-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {/* Services */}
          <div>
            <h4 className="font-semibold text-[12px] text-white/40 uppercase tracking-wider mb-5">
              Services
            </h4>
            <ul className="space-y-2.5">
              {[
                "Birth Certificate",
                "Marriage Certificate",
                "Death Certificate",
                "Certified True Copy (CTC)",
              ].map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-[14px] text-white/60 hover:text-white transition-colors"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* For Applicants */}
          <div>
            <h4 className="font-semibold text-[12px] text-white/40 uppercase tracking-wider mb-5">
              For Applicants
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  to="/signup"
                  className="text-[14px] text-white/60 hover:text-white transition-colors"
                >
                  Check Requirements
                </Link>
              </li>
              <li>
                <Link
                  to="/signup"
                  className="text-[14px] text-white/60 hover:text-white transition-colors"
                >
                  Submit a Request
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  search={{ redirect: "/dashboard" }}
                  className="text-[14px] text-white/60 hover:text-white transition-colors"
                >
                  Track Your Request
                </Link>
              </li>
              <li>
                <Link
                  to="/signup"
                  className="text-[14px] text-white/60 hover:text-white transition-colors"
                >
                  Create an Account
                </Link>
              </li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h4 className="font-semibold text-[12px] text-white/40 uppercase tracking-wider mb-5">
              About
            </h4>
            <ul className="space-y-2.5">
              {[
                "About CCRO",
                "About CiviCheck",
                "Privacy Policy",
                "Accessibility",
              ].map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-[14px] text-white/60 hover:text-white transition-colors"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-[12px] text-white/40 uppercase tracking-wider mb-5">
              Contact
            </h4>
            <p className="text-[14px] text-white/60 leading-relaxed mb-2">
              City Civil Registrar Office
              <br />
              City Government of Legazpi
            </p>
            <p className="text-[13px] text-white/35 italic">
              Office address, hours, and contact number to be confirmed with
              CCRO.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-[1120px] mx-auto px-5 py-5 flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <svg
            className="w-6 h-6 text-lagoon"
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
          <span className="text-white/70 text-[15px] font-bold tracking-tight">
            CiviCheck
          </span>
        </div>

        {/* Office info */}
        <p className="text-[13px] text-white/35 text-center">
          City Civil Registrar Office · City Government of Legazpi
        </p>

        {/* Legal Links */}
        <div className="flex items-center gap-4 text-[13px] text-white/40">
          <a href="#" className="hover:text-white/70 transition-colors">
            Privacy
          </a>
          <a href="#" className="hover:text-white/70 transition-colors">
            Accessibility
          </a>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
