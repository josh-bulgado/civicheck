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
});

function AuthedLayout() {
  const { user } = Route.useRouteContext();
  const workspace = getWorkspaceDetails((user?.role ?? "applicant") as Role);

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
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
        <div className="civic-workspace flex flex-1 flex-col bg-workspace p-4 text-foreground sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
