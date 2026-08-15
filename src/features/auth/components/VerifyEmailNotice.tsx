import { Link } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { CiviCheckIdentity } from "~/components/brand/civic-identity";
import { AuthBrandPanel } from "./AuthBrandPanel";

export function VerifyEmailNotice({
  email,
  onUseDifferentEmail,
}: {
  email: string;
  onUseDifferentEmail: () => void;
}) {
  return (
    <div className="flex min-h-dvh">
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

      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-113 space-y-6">
          <Link to="/" className="mb-2 inline-flex lg:hidden">
            <CiviCheckIdentity />
          </Link>

          <div className="flex size-14 items-center justify-center rounded-full bg-success-soft">
            <MailCheck className="size-7 text-success" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <h1 className="civic-title text-[32px]">Check your email</h1>
            <p className="text-[17px] leading-normal text-muted-2">
              We sent a verification link to{" "}
              <span className="font-bold text-body-strong">{email}</span>. Open
              it to verify your account — the link signs you in and takes you
              straight to your dashboard.
            </p>
          </div>

          <div className="civic-card space-y-2 p-4 text-[15px] leading-snug text-muted-2">
            <p>
              Didn&apos;t get it? Check your spam or promotions folder — it can
              take a minute to arrive.
            </p>
            <p>
              You won&apos;t be able to sign in until your email is verified.
            </p>
          </div>

          <Button
            size="lg"
            className="w-full text-base"
            render={<Link to="/login" />}
          >
            Go to sign in
          </Button>

          <Separator />

          <p className="text-[17px] text-body">
            Used the wrong email?{" "}
            <button
              type="button"
              onClick={onUseDifferentEmail}
              className="font-bold text-primary hover:text-primary-hover"
            >
              Sign up again
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
