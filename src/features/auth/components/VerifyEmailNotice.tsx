import { Link } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { Button } from "~/components/ui/button";
import { AuthEmblemPanel } from "./AuthSidePanel";
import {
  authButtonClass,
  authLinkClass,
  AuthFormFooter,
  AuthSplitLayout,
} from "./AuthSplitLayout";

export function VerifyEmailNotice({
  email,
  onUseDifferentEmail,
}: {
  email: string;
  onUseDifferentEmail: () => void;
}) {
  return (
    <AuthSplitLayout panel={<AuthEmblemPanel />}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <span className="flex size-12 items-center justify-center rounded-full bg-success-soft">
            <MailCheck className="size-6 text-success" aria-hidden="true" />
          </span>

          <div className="flex flex-col gap-1.5">
            <h1 className="civic-title text-[28px] leading-[1.15]">
              Check your email
            </h1>
            <p className="text-sm leading-snug text-muted-2">
              We sent a verification link to{" "}
              <span className="font-bold text-body-strong">{email}</span>. Open
              it to verify your account — the link signs you in and takes you
              straight to your dashboard.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-border-light bg-surface-subtle p-4 text-[13px] leading-snug text-muted-2">
          <p>
            Didn&apos;t get it? Check your spam or promotions folder — it can
            take a minute to arrive.
          </p>
          <p>You won&apos;t be able to sign in until your email is verified.</p>
        </div>

        <Button className={authButtonClass} render={<Link to="/login" />}>
          Go to sign in
        </Button>

        <AuthFormFooter>
          Used the wrong email?
          <button
            type="button"
            onClick={onUseDifferentEmail}
            className={authLinkClass}
          >
            Sign up again
          </button>
        </AuthFormFooter>
      </div>
    </AuthSplitLayout>
  );
}
