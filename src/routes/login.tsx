import { createFileRoute } from "@tanstack/react-router";
import { Login } from "../components/Login";
import Login07 from "~/components/login-07";

export const Route = createFileRoute("/login")({
  component: LoginComp,
});

function LoginComp() {
  return <Login07 />;
}
