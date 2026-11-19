import { createFileRoute } from "@tanstack/react-router";
import RegisterForm from "~/features/auth/components/RegisterForm";
import { simplePageTransition } from "~/components/motion/simple-page-transition";

export const Route = createFileRoute("/signup")({
  ...simplePageTransition,
  component: SignupPage,
});

function SignupPage() {
  return <RegisterForm />;
}

