import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { CityGovernmentIdentity, CiviCheckIdentity } from "~/components/brand/civic-identity";

const publicLinks = [
  { label: "Requirements", to: "/requirements" as const },
  { label: "Apply online", to: "/apply" as const },
  { label: "Book a visit", to: "/appointments" as const },
  { label: "Track request", to: "/track" as const },
];

const SiteHeader = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur-md">
      <div className="hidden border-b border-border-light bg-background sm:block">
        <div className="civic-container flex h-9 items-center justify-between">
          <p className="text-[13px] font-bold uppercase tracking-[0.09em] text-muted-2">
            Official civil registry service
          </p>
          <CityGovernmentIdentity compact className="[&>span:first-child]:size-5.5" />
        </div>
      </div>

      <div className="civic-container flex h-16 items-center justify-between">
        <Link to="/" aria-label="CiviCheck home">
          <CiviCheckIdentity />
        </Link>

        <nav className="hidden items-center gap-5 md:flex" aria-label="Primary navigation">
          {publicLinks.map((item) => (
            <Link key={item.label} to={item.to} className="text-base font-medium text-body-strong transition-colors hover:text-primary">
              {item.label}
            </Link>
          ))}
          <span className="h-6 w-px bg-border-light" aria-hidden="true" />
          <Link to="/login" className="text-base font-bold text-primary hover:text-primary-hover">
            Sign in
          </Link>
          <Link to="/signup" className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover">
            Get started
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="flex size-11 items-center justify-center rounded-lg text-foreground hover:bg-muted md:hidden"
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {mobileMenuOpen ? (
        <nav id="mobile-navigation" className="border-t border-border bg-white px-5 py-4 md:hidden" aria-label="Mobile navigation">
          <div className="mx-auto flex max-w-6xl flex-col gap-1">
            {publicLinks.map((item) => (
              <Link key={item.label} to={item.to} className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-primary-soft hover:text-primary" onClick={() => setMobileMenuOpen(false)}>
                {item.label}
              </Link>
            ))}
            <div className="my-2 h-px bg-border" />
            <Link to="/login" className="rounded-lg px-3 py-3 text-center text-sm font-semibold text-primary" onClick={() => setMobileMenuOpen(false)}>Sign in</Link>
            <Link to="/signup" className="rounded-lg bg-primary px-3 py-3 text-center text-sm font-semibold text-white" onClick={() => setMobileMenuOpen(false)}>Get started</Link>
          </div>
        </nav>
      ) : null}
    </header>
  );
};

export default SiteHeader;
