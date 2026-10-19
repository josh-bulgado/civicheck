import { createFileRoute, redirect } from "@tanstack/react-router";
import { VerifyEmailPage } from "~/features/auth/components/VerifyEmailPage";
import {
  clearPendingVerification,
  getPendingVerification,
} from "~/features/auth/pending-verification";

export const Route = createFileRoute("/verify-email")({
  // The account being confirmed is handed over in memory by the screen that
  // created it, so a reload or a direct visit arrives with nothing to verify.
  // Signing in picks the same step back up: an unconfirmed account gets a fresh
  // code and lands here again.
  beforeLoad: () => {
    if (!getPendingVerification()) {
      throw redirect({
        to: "/login",
        search: {},
      });
    }
  },
  // The handed-over details include the password, so they go as soon as the
  // applicant leaves this page — confirmed, backed out, or wandered off.
  onLeave: clearPendingVerification,
  component: VerifyEmailPage,
});
