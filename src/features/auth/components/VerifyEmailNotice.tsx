import { Link } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { Button } from "~/components/ui/button";
import { AuthBrandPanel } from "./AuthBrandPanel";
import {
  AuthCardFooter,
  AuthCardLayout,
} from "./AuthCardLayout";

export function VerifyEmailNotice({
  email,
  onUseDifferentEmail,
}: {
  email: string;
  onUseDifferentEmail: () => void;
}) {
  return (
    <AuthCardLayout
      panel={
        <AuthBrandPanel
          title="One last step before you can sign in."
          description="Confirming your email keeps your request updates going to the right person."
          steps={[
            {
              title: "Open the email we just sent",
              description: "It arrives within a minute from CiviCheck.",
            },
            {
              title: "Click the confirmation link",
              description: "This activates your CiviCheck account.",
            },
            {
              title: "File your request",
              description:
                "The link signs you in, so you can start straight away.",
            },
          ]}
        />
      }
    >
      <div className="space-y-5">
        <div className="space-y-4">
          <span className="flex size-12 items-center justify-center rounded-full bg-success-soft">
            <MailCheck className="size-6 text-success" aria-hidden="true" />
          </span>

          <div className="space-y-1">
            <h1 className="civic-title text-2xl">Check your email</h1>
            <p className="text-[15px] leading-snug text-muted-2">
              We sent a verification link to{" "}
              <span className="font-bold text-body-strong">{email}</span>. Open
              it to verify your account — the link signs you in and takes you
              straight to your dashboard.
            </p>
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-border-light bg-surface-subtle p-4 text-[14px] leading-snug text-muted-2">
          <p>
            Didn&apos;t get it? Check your spam or promotions folder — it can
            take a minute to arrive.
          </p>
          <p>You won&apos;t be able to sign in until your email is verified.</p>
        </div>

        <Button
          size="lg"
          className="w-full text-[15px]"
          render={<Link to="/login" />}
        >
          Go to sign in
        </Button>

        <AuthCardFooter>
          Used the wrong email?
          <button
            type="button"
            onClick={onUseDifferentEmail}
            className="font-bold text-primary hover:text-primary-hover"
          >
            Sign up again
          </button>
        </AuthCardFooter>
      </div>
    </AuthCardLayout>
  );
}
