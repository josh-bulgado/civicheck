import { createFileRoute } from "@tanstack/react-router";
import ForgotPasswordForm from "~/features/auth/components/ForgotPasswordForm";
import { simplePageTransition } from "~/components/motion/simple-page-transition";

export const Route = createFileRoute("/forgot-password")({
  ...simplePageTransition,
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
