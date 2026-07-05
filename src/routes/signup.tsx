import { createFileRoute } from "@tanstack/react-router";
import RegisterForm from "~/features/auth/components/RegisterForm";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  return <RegisterForm />;
}

