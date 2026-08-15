import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { CiviCheckIdentity } from "~/components/brand/civic-identity";
import { AuthBrandPanel } from "../components/AuthBrandPanel";
import { AcceptInvitationForm } from "./components/AcceptInvitationForm";

export function AcceptInvitationPage() {
  return (
    <div className="auth-page flex min-h-dvh bg-background">
      <AuthBrandPanel
        title="Secure access for public service."
        description="Complete your account setup to access the CiviCheck staff workspace and serve civil registry requests securely."
        benefits={[
          "Your invitation has been verified",
          "Create a password for protected access",
          "Continue to your assigned workspace",
        ]}
      />

      <main className="flex min-h-dvh flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-white px-5 py-4 sm:px-8 lg:hidden">
          <Link to="/"><CiviCheckIdentity /></Link>
        </header>

        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <section className="w-full max-w-[460px]" aria-labelledby="accept-invitation-title">
            <div className="mb-7">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary">
                <ShieldCheck className="size-3.5" />
                Secure staff onboarding
              </div>
              <h1 id="accept-invitation-title" className="civic-title text-3xl">
                Complete your account
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Create a password for your staff account. You will be taken to
                your dashboard as soon as setup is complete.
              </p>
            </div>

            <div className="civic-card p-5 sm:p-7">
              <AcceptInvitationForm />
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-lg border border-border bg-white px-4 py-3.5">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <p className="text-xs leading-5 text-muted-foreground">
                Your password is transmitted securely and is never visible to
                CiviCheck administrators or office personnel.
              </p>
            </div>
          </section>
        </div>

        <footer className="px-5 pb-6 text-center text-[11px] text-muted-foreground">
          Authorized access only · CiviCheck Staff Services
        </footer>
      </main>
    </div>
  );
}
