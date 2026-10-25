import { useRouter } from "@tanstack/react-router";
import { QuietLink as Link } from "~/components/quiet-link";
import { ArrowLeft, ArrowRight, LockKeyhole, LogIn } from "lucide-react";
import {
  ErrorPageLayout,
  errorActionClass,
  errorLinkClass,
  useErrorPageUser,
} from "~/components/errors/ErrorPageLayout";
import { Button } from "~/components/ui/button";
import { roleLabels } from "~/features/system-admin/system-admin.constants";
import type { Role } from "~/lib/permissions";

/**
 * Shown when a signed-in account asks for something its role can't open, or
 * when a session has lapsed mid-visit.
 *
 * The copy deliberately doesn't name the permission that was missing — it tells
 * the person what happened and who can change it, nothing about how access is
 * wired.
 */
export function Forbidden({
  from,
  signedOut = false,
}: {
  /** Path that was refused. Shown so a support call can name it. */
  from?: string;
  /** The session is gone rather than under-privileged. */
  signedOut?: boolean;
}) {
  const router = useRouter();
  const user = useErrorPageUser();
  const needsSignIn = signedOut || !user;
  const redirectTo = from && from.startsWith("/") ? from : undefined;

  const identity = user
    ? `${user.firstName} ${user.lastName}`.trim() || user.email
    : null;
  const roleLabel = user ? roleLabels[user.role as Role] : null;

  return (
    <ErrorPageLayout
      tone="warning"
      icon={LockKeyhole}
      eyebrow={needsSignIn ? "Sign in required" : "Access restricted"}
      title={
        needsSignIn
          ? "Please sign in to continue"
          : "You don't have access to this page"
      }
      description={
        needsSignIn ? (
          "This page is only available to signed-in accounts. Sign in, and we'll bring you straight back."
        ) : (
          <>
            This page is reserved for other CCRO roles
            {identity ? (
              <>
                , and you&apos;re signed in as{" "}
                <span className="font-semibold text-body-strong">
                  {identity}
                </span>
                {roleLabel ? ` (${roleLabel})` : null}
              </>
            ) : null}
            . If you think this is a mistake, please contact your CCRO
            administrator.
          </>
        )
      }
      detail={from ? { label: "Requested address", value: from } : undefined}
      announce
      actions={
        needsSignIn ? (
          <>
            <Link to="/" className={errorLinkClass("outline")}>
              Back to home
            </Link>
            <Link
              to="/login"
              search={{ redirect: redirectTo }}
              className={errorLinkClass()}
            >
              <LogIn data-icon="inline-start" />
              Sign in
            </Link>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              className={errorActionClass}
              onClick={() => router.history.back()}
            >
              <ArrowLeft data-icon="inline-start" />
              Go back
            </Button>
            <Link to="/dashboard" className={errorLinkClass()}>
              Go to my dashboard
              <ArrowRight data-icon="inline-end" />
            </Link>
          </>
        )
      }
    />
  );
}
