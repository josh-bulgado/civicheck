import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "~/features/account/pages/ProfilePage";
import { ProfilePageSkeleton } from "~/features/account/pages/ProfilePageSkeleton";
import { denyAccess } from "~/lib/access";

export const Route = createFileRoute("/_authed/_dashboard/profile")({
  beforeLoad: ({ context, location }) => {
    if (context.user?.role !== "applicant") denyAccess(location);
  },
  pendingComponent: ProfilePageSkeleton,
  component: ProfileRoute,
});

function ProfileRoute() {
  const { user } = Route.useRouteContext();
  return user ? <ProfilePage account={user} /> : null;
}
