import { Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="bg-white">
      <div className="max-w-[1200px] mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Left: Value Proposition */}
          <div className="md:col-span-5 space-y-6">
            <h1 className="text-[2.5rem] md:text-[2.85rem] leading-[1.1] font-bold text-[#1b1b1b]">
              Know What You Need.
              <br />
              Before You Need It.
            </h1>
            <p className="text-[17px] text-[#444] leading-relaxed">
              CiviCheck shows you the exact requirements for your birth,
              marriage, or death certificate, or certified true copy request —
              then tracks it from submission to release, so you're not making
              repeat trips to the CCRO just to find out you forgot a document.
            </p>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {[
                "Requirement checklists",
                "Status tracking",
                "Online or walk-in",
                "Email notifications",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 text-[15px] font-semibold text-[#1b1b1b]"
                >
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
                search={{ redirect: "/dashboard" }}
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
                <rect
                  x="60"
                  y="200"
                  width="180"
                  height="8"
                  rx="4"
                  fill="#5b616b"
                />
                <rect
                  x="80"
                  y="208"
                  width="8"
                  height="60"
                  rx="2"
                  fill="#5b616b"
                />
                <rect
                  x="212"
                  y="208"
                  width="8"
                  height="60"
                  rx="2"
                  fill="#5b616b"
                />
                {/* Laptop */}
                <rect
                  x="100"
                  y="160"
                  width="100"
                  height="40"
                  rx="3"
                  fill="#205493"
                />
                <rect
                  x="105"
                  y="165"
                  width="90"
                  height="28"
                  rx="2"
                  fill="#e8f5ff"
                />
                <rect
                  x="80"
                  y="200"
                  width="140"
                  height="5"
                  rx="2"
                  fill="#aeb0b5"
                />
                {/* Person body */}
                <circle cx="150" cy="100" r="28" fill="#d4aa00" />
                <circle cx="150" cy="95" r="22" fill="#8B6914" />
                <circle cx="150" cy="85" r="18" fill="#f5d5c8" />
                {/* Hair */}
                <ellipse cx="150" cy="75" rx="20" ry="14" fill="#3e2723" />
                {/* Glasses */}
                <circle
                  cx="143"
                  cy="84"
                  r="5"
                  fill="none"
                  stroke="#333"
                  strokeWidth="1.5"
                />
                <circle
                  cx="157"
                  cy="84"
                  r="5"
                  fill="none"
                  stroke="#333"
                  strokeWidth="1.5"
                />
                <line
                  x1="148"
                  y1="84"
                  x2="152"
                  y2="84"
                  stroke="#333"
                  strokeWidth="1.5"
                />
                {/* Body */}
                <path
                  d="M125 110 Q150 135 175 110 L175 165 Q150 175 125 165 Z"
                  fill="#205493"
                />
                {/* Arms */}
                <path
                  d="M125 120 Q100 140 105 170"
                  stroke="#f5d5c8"
                  strokeWidth="8"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M175 120 Q200 140 195 170"
                  stroke="#f5d5c8"
                  strokeWidth="8"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Chair */}
                <rect
                  x="120"
                  y="170"
                  width="60"
                  height="35"
                  rx="5"
                  fill="#112e51"
                />
                <rect
                  x="145"
                  y="205"
                  width="10"
                  height="40"
                  rx="3"
                  fill="#5b616b"
                />
              </svg>
            </div>
          </div>

          {/* Right: Quick Actions Card */}
          <div className="md:col-span-4">
            <div className="border border-gray-300 rounded shadow-sm overflow-hidden">
              {/* Card header */}
              <div className="bg-white px-6 pt-6 pb-4">
                <h2 className="text-xl font-bold text-[#1b1b1b] mb-1">
                  Track Your Request
                </h2>
                <p className="text-[15px] text-[#5b616b]">
                  Two ways to check your status
                </p>
              </div>

              <div className="px-6 pb-6 space-y-5">
                {/* Option 1 */}
                <div>
                  <h3 className="font-bold text-[15px] text-[#1b1b1b] mb-1">
                    CiviCheck account
                  </h3>
                  <p className="text-sm text-[#5b616b] mb-3 leading-relaxed">
                    Sign in to view your requests, get status updates, and
                    receive email notifications.
                  </p>
                  <Link
                    to="/login"
                    search={{ redirect: "/dashboard" }}
                    className="inline-block border-2 border-[#005ea2] text-[#005ea2] font-bold text-sm px-5 py-2 rounded hover:bg-[#005ea2] hover:text-white transition-colors"
                  >
                    Sign in
                  </Link>
                </div>

                <hr className="border-gray-200" />

                {/* Option 2 */}
                <div>
                  <h3 className="font-bold text-[15px] text-[#1b1b1b] mb-1">
                    Tracking number lookup
                  </h3>
                  <p className="text-sm text-[#5b616b] mb-3 leading-relaxed">
                    Enter your tracking number to check where your request
                    stands. No sign-in needed.
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
};

export default HeroSection;
