import * as React from "react";
import { ArrowRight, Menu, X } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Link } from "@tanstack/react-router";

const navItems = ["Blocks", "Pricing", "Docs", "Changelog"];

export default function Hero01() {
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <section className="relative isolate overflow-hidden bg-background pb-32 sm:pb-40">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-12rem] -z-10 h-[40rem] w-[64rem] max-w-[140%] -translate-x-1/2 opacity-60"
        style={{
          background:
            "radial-gradient(closest-side, rgba(99,102,241,0.18), transparent 72%)",
        }}
      />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5 sm:px-8">
        <a
          href="#"
          className="flex items-center gap-2 font-semibold tracking-tight text-foreground"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://blockus.lndevui.com/brand/logo.svg"
            alt="blockus"
            className="size-6"
          />
          blockus
        </a>
        <nav className="hidden items-center gap-7 md:flex">
          {navItems.map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="hidden rounded-full sm:inline-flex"
          >
            <Link to="/login">Sign in</Link>
          </Button>
          <Button size="sm" className="rounded-full px-4">
            <Link to="/signup">Get started</Link>
          </Button>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="grid size-9 place-items-center rounded-full border border-border text-foreground md:hidden"
          >
            <Menu className="size-4" />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-x-4 top-4 rounded-2xl border border-border bg-card p-5 shadow-2xl shadow-black/30">
            <div className="flex items-center justify-between">
              <span className="font-semibold tracking-tight">blockus</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <ul className="mt-5 flex flex-col">
              {navItems.map((item) => (
                <li key={item}>
                  <a
                    href={`#${item.toLowerCase()}`}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-7 px-6 pt-24 text-center sm:pt-32">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          <span className="size-1 rounded-full bg-foreground" />A new block
          every week
        </span>

        <h1
          className="text-balance font-semibold tracking-tight text-foreground"
          style={{
            fontSize: "clamp(2.75rem, 6vw, 5rem)",
            lineHeight: 1.02,
            letterSpacing: "-0.035em",
          }}
        >
          The library every dev wishes they had on day one.
        </h1>

        <p className="max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
          Production-ready React sections, hand-built on shadcn/ui and Tailwind
          v4. Drop them in. Ship the page.
        </p>

        <Button size="lg" className="mt-2 rounded-full px-7">
          Browse the catalog
          <ArrowRight />
        </Button>
      </div>
    </section>
  );
}
