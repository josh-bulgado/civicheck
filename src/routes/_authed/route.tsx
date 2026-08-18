import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "../../utils/supabase";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { AppSidebar } from "~/components/sidebar-01/app-sidebar";
import { CityGovernmentIdentity } from "~/components/brand/civic-identity";
import { getWorkspaceDetails } from "~/components/sidebar-01/workspace";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import { getUnreadNotificationCountFn } from "~/features/notifications/notifications.queries";
import type { Role } from "~/lib/permissions";

export const loginFn = createServerFn({ method: "POST" })
  .validator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      return {
        error: true,
        message: error.message,
        role: null,
      };
    }

    // Fetch the user's role from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, access_status")
      .eq("id", authData.user.id)
      .single();

    if ((profile?.access_status ?? "active") !== "active") {
      await supabase.auth.signOut();
      return { error: true, message: "This account is not active.", role: null };
    }

    return {
      error: false,
      message: "Success",
      role: profile?.role ?? "applicant",
    };
  });

export const Route = createFileRoute("/_authed")({
  component: AuthedLayout,
  beforeLoad: ({ context, location }) => {
    if (!context.user || context.user.accountStatus !== "active")
      throw redirect({ to: "/login", search: { redirect: location.href } });
  },
  loader: async ({ context }) => ({
    unreadNotifications:
      context.user?.role === "applicant" ? await getUnreadNotificationCountFn() : 0,
  }),
});

function AuthedLayout() {
  const { user } = Route.useRouteContext();
  const { unreadNotifications } = Route.useLoaderData();
  const workspace = getWorkspaceDetails((user?.role ?? "applicant") as Role);
  // Sidebar badge tracks new notifications live, from wherever the applicant
  // happens to be — not just while they're on the notifications page itself.
  useRealtimeRefresh({ tables: ["notifications"], enabled: user?.role === "applicant" });

  return (
    <SidebarProvider>
      <a
        href="#main-content"
        className="sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:not-sr-only focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-lg"
      >
        Skip to Main Content
      </a>
      <AppSidebar user={user} unreadNotifications={unreadNotifications} />
      <SidebarInset>
        <header className="flex h-[4.5rem] shrink-0 items-center justify-between border-b border-border-strong bg-white px-4 transition-[width,height] ease-linear sm:px-6">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="size-10 rounded-lg border border-border-strong bg-white shadow-xs hover:bg-surface-subtle" />
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-foreground">
                {workspace.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {workspace.description}
              </p>
            </div>
          </div>
          <CityGovernmentIdentity compact className="[&>span:first-child]:size-8" />
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="civic-workspace flex flex-1 flex-col bg-workspace p-4 text-foreground sm:p-6 lg:p-8"
        >
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
