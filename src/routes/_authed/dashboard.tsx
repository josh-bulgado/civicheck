import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/dashboard')({
  beforeLoad: ({ context }) => {
    const role = context.user?.role ?? "applicant";
    if (role === "applicant") {
      throw redirect({ to: "/services" });
    } else if (role === "admin") {
      throw redirect({ to: "/admin-dashboard" });
    } else {
      // frontdesk, staff, archive, legal, cashier
      throw redirect({ to: "/staff-dashboard" });
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Redirecting based on your role...</div>
}
