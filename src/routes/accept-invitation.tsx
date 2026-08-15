import { createFileRoute, redirect } from "@tanstack/react-router";
import { AcceptInvitationPage } from "~/features/auth/accept-invitation/AcceptInvitationPage";

export const Route = createFileRoute("/accept-invitation")({
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: "/login" });
  },
  component: AcceptInvitationPage,
});
