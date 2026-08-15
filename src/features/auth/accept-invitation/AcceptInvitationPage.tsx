import { Link } from "@tanstack/react-router";
import {
  Check,
  CheckCircle,
  KeyRound,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";
import TopoPattern from "../components/TopoPattern";
import { AcceptInvitationForm } from "./components/AcceptInvitationForm";

export function AcceptInvitationPage() {
  return (
    <div className="auth-page min-h-dvh bg-ash lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(32rem,0.95fr)]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-basalt via-[#1A3A35] to-lagoon lg:flex lg:min-h-dvh lg:flex-col lg:justify-between">
        <TopoPattern />
        <div className="absolute -left-24 top-1/3 size-80 rounded-full bg-lagoon/20 blur-3xl" />
        <div className="absolute -right-24 bottom-20 size-72 rounded-full bg-white/5 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3 px-12 pt-10 xl:px-16">
          <div className="flex size-10 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white backdrop-blur-sm">
            <CheckCircle className="size-5" />
          </div>
          <div>
            <p className="font-semibold tracking-tight text-white">CiviCheck</p>
            <p className="text-xs text-white/50">Official staff portal</p>
          </div>
        </div>

        <div className="relative z-10 max-w-2xl px-12 py-16 xl:px-16">
          <div className="mb-8 flex size-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white backdrop-blur-sm">
            <ShieldCheck className="size-7" />
          </div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/80">
            Staff account activation
          </p>
          <h1 className="max-w-xl font-display text-4xl leading-tight text-white xl:text-5xl">
            Secure access for public service.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-white/60">
            Complete your account setup to access the CiviCheck staff workspace
            and serve civil registry requests securely.
          </p>

          <ol className="mt-12 max-w-lg space-y-3" aria-label="Account setup progress">
            <li className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-300/15 text-emerald-200">
                <Check className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-white">Invitation verified</p>
                <p className="mt-0.5 text-xs text-white/45">
                  Your secure invitation link was accepted.
                </p>
              </div>
            </li>
            <li className="flex items-center gap-4 rounded-xl border border-emerald-200/25 bg-emerald-200/[0.08] px-4 py-3.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-basalt">
                <KeyRound className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-white">Create your password</p>
                <p className="mt-0.5 text-xs text-white/45">
                  You are completing this step now.
                </p>
              </div>
            </li>
            <li className="flex items-center gap-4 px-4 py-3.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/45">
                <LayoutDashboard className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-white/60">Open your dashboard</p>
                <p className="mt-0.5 text-xs text-white/35">
                  Continue directly to your assigned workspace.
                </p>
              </div>
            </li>
          </ol>
        </div>

        <div className="relative z-10 flex items-center gap-3 px-12 pb-10 text-xs text-white/35 xl:px-16">
          <span>City Civil Registrar Office</span>
          <span aria-hidden="true">•</span>
          <span>City Government of Legazpi</span>
        </div>
      </aside>

      <main className="flex min-h-dvh flex-col bg-ash">
        <header className="flex items-center justify-between border-b border-black/5 px-5 py-4 sm:px-8 lg:px-10">
          <Link to="/" className="inline-flex items-center gap-2.5 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-lg border-2 border-lagoon text-lagoon">
              <CheckCircle className="size-4.5" />
            </span>
            <span className="font-bold tracking-tight text-basalt">CiviCheck</span>
          </Link>
          <div className="ml-auto text-right">
            <p className="text-xs font-semibold text-basalt">
              City Civil Registrar Office
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              City Government of Legazpi
            </p>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <section className="w-full max-w-[460px]" aria-labelledby="accept-invitation-title">
            <div className="mb-7">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-lagoon/15 bg-lagoon-light px-3 py-1.5 text-xs font-semibold text-lagoon">
                <ShieldCheck className="size-3.5" />
                Secure staff onboarding
              </div>
              <h2
                id="accept-invitation-title"
                className="text-3xl font-semibold tracking-tight text-basalt"
              >
                Complete your account
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Create a password for your staff account. You will be taken to
                your dashboard as soon as setup is complete.
              </p>
            </div>

            <div className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_18px_50px_-32px_rgba(28,33,39,0.35)] sm:p-7">
              <AcceptInvitationForm />
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-xl border border-black/[0.06] bg-white/55 px-4 py-3.5">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-lagoon" />
              <p className="text-xs leading-5 text-muted-foreground">
                Your password is transmitted securely and is never visible to
                CiviCheck administrators or office personnel.
              </p>
            </div>
          </section>
        </div>

        <footer className="px-5 pb-6 text-center text-[11px] text-muted-foreground sm:px-8">
          Authorized access only · CiviCheck Staff Services
        </footer>
      </main>
    </div>
  );
}
