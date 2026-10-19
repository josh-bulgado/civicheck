/// <reference types="vite/client" />
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { createServerFn } from "@tanstack/react-start";
import * as React from "react";
import { DefaultCatchBoundary } from "../components/DefaultCatchBoundary";
import { NotFound } from "../components/NotFound";
import { ThemeScope } from "~/components/theme-scope";
import { OfflineBanner } from "~/components/errors/OfflineBanner";
import appCss from "../styles/app.css?url";
import { seo } from "../utils/seo";
import {
  clearSessionScope,
  getSupabaseServerClient,
  limitSessionToBrowser,
} from "../utils/supabase";
import { BackendActivityIndicator } from "~/components/feedback/BackendActivityIndicator";
import { Toaster } from "~/components/ui/sonner";
import { TooltipProvider } from "~/components/ui/tooltip";
import type { AccountProfile } from "~/features/account/account.types";
import { ApplyTransitionLoader } from "~/features/services/components/ApplyTransitionLoader";
import { isInternalRole, type AccountStatus, type Role } from "~/lib/permissions";
import { getVerifiedSessionUser, isSessionRevoked } from "~/server/auth";
import { getAvatarUrl } from "~/server/avatar";
import { loadCurrentUser } from "~/features/auth/current-user";

const PUBLIC_ROUTES = new Set([
  "/",
  "/apply",
  "/apply/",
  "/auth/callback",
  "/forgot-password",
  "/login",
  "/logout",
  "/requirements",
  "/reset-password",
  "/signup",
  "/track",
]);

const fetchUser = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  const user = await getVerifiedSessionUser(supabase);

  if (!user?.email) {
    return null;
  }

  // Fetch role and personal details from profiles table
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "role, first_name, middle_name, has_no_middle_name, last_name, suffix, date_of_birth, sex, phone_number, access_status, sessions_revoked_at, created_at, last_login_at, welcome_tutorial_seen, avatar_path",
    )
    .eq("id", user.id)
    .single();

  // An administrator signed this account out: treat it as signed out here and
  // drop the cookies so the next page load lands on the login screen.
  if (isSessionRevoked(user, profile?.sessions_revoked_at)) {
    await supabase.auth.signOut({ scope: "local" });
    clearSessionScope();
    return null;
  }

  // Every way into the app lands here, so this is where a session that belongs
  // to an internal role is held to the browser's lifetime — including sessions
  // issued before the rule existed. If that can't be done the session is ended
  // rather than left long-lived.
  if (profile?.role && isInternalRole(profile.role as Role)) {
    const restricted = await limitSessionToBrowser(
      supabase,
      user.sessionId ?? user.id,
    );
    if (!restricted) return null;
  }

  return {
    id: user.id,
    email: user.email,
    role: (profile?.role ?? "applicant") as Role,
    firstName: profile?.first_name ?? "",
    middleName: profile?.middle_name ?? "",
    hasNoMiddleName: profile?.has_no_middle_name ?? false,
    lastName: profile?.last_name ?? "",
    suffix: profile?.suffix ?? "",
    dateOfBirth: profile?.date_of_birth ?? "",
    sex: (profile?.sex ?? "") as AccountProfile["sex"],
    phoneNumber: profile?.phone_number ?? "",
    accountStatus: (profile?.access_status ?? "active") as AccountStatus,
    createdAt: profile?.created_at ?? "",
    lastLoginAt: profile?.last_login_at ?? null,
    welcomeTutorialSeen: profile?.welcome_tutorial_seen ?? false,
    avatarUrl: await getAvatarUrl(supabase, user.id, profile?.avatar_path),
  } satisfies AccountProfile;
});

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    if (PUBLIC_ROUTES.has(location.pathname)) {
      return { user: null };
    }

    // Reads through the identity cache so navigating between pages doesn't
    // re-verify the session and re-read the profile every time.
    const user = await loadCurrentUser(fetchUser);

    return {
      user,
    };
  },
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      ...seo({
        title: "CiviCheck — City Civil Registrar Office, Legazpi City",
        description:
          "Check your requirements, submit your request, and track it from submission to release — all online.",
      }),
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/favicon-32x32.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/favicon-16x16.png",
      },
      { rel: "manifest", href: "/site.webmanifest" },
      { rel: "icon", href: "/favicon.ico" },
    ],
  }),
  errorComponent: (props) => {
    return (
      <RootDocument>
        <DefaultCatchBoundary {...props} />
      </RootDocument>
    );
  },
  notFoundComponent: () => <NotFound />,
  component: RootComponent,
});

function RootComponent() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <RootDocument>
      <Outlet />
      <ApplyTransitionLoader />
      <BackendActivityIndicator />
      <Toaster />
      {mounted && import.meta.env.DEV && (
        <TanStackDevtools
          config={{ position: "bottom-left", inspectHotkey: ["Alt"] }}
          plugins={[
            {
              name: "TanStack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
      )}
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    // The `dark` class on <html> is owned by ThemeScope below, for every page.
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        <ThemeScope />
        <TooltipProvider>{children}</TooltipProvider>
        <OfflineBanner />
        <Scripts />
      </body>
    </html>
  );
}
