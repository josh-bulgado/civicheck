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
import appCss from "../styles/app.css?url";
import { seo } from "../utils/seo";
import { getSupabaseServerClient } from "../utils/supabase";
import { Toaster } from "~/components/ui/sonner";
import { TooltipProvider } from "~/components/ui/tooltip";
import type { AccountProfile } from "~/features/account/account.types";
import type { AccountStatus, Role } from "~/lib/permissions";
import { getVerifiedSessionUser } from "~/server/auth";
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
      "role, first_name, middle_name, last_name, suffix, date_of_birth, sex, phone_number, access_status, created_at, last_login_at",
    )
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email,
    role: (profile?.role ?? "applicant") as Role,
    firstName: profile?.first_name ?? "",
    middleName: profile?.middle_name ?? "",
    lastName: profile?.last_name ?? "",
    suffix: profile?.suffix ?? "",
    dateOfBirth: profile?.date_of_birth ?? "",
    sex: (profile?.sex ?? "") as AccountProfile["sex"],
    phoneNumber: profile?.phone_number ?? "",
    accountStatus: (profile?.access_status ?? "active") as AccountStatus,
    createdAt: profile?.created_at ?? "",
    lastLoginAt: profile?.last_login_at ?? null,
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
  const { user } = Route.useRouteContext();

  React.useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
  }, []);

  // Add in-page console (Eruda) for debugging when the real console is hidden
  React.useEffect(() => {
    if (import.meta.env.DEV) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/eruda";
      script.onload = () => {
        if ((window as any).eruda) {
          (window as any).eruda.init();
        }
      };
      document.head.appendChild(script);
    }
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light'}catch(e){}})()`,
          }}
        />
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        <TooltipProvider>{children}</TooltipProvider>
        <Scripts />
      </body>
    </html>
  );
}
