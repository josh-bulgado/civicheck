import { createRoot } from "react-dom/client";
import { useState } from "react";
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from "@tanstack/react-router";
import { CitizenBottomBar } from "~/components/sidebar-01/citizen-bottom-bar";
import { CitizenMobileHeader } from "~/components/sidebar-01/citizen-mobile-header";
import { CitizenTopBar } from "~/components/sidebar-01/citizen-top-bar";
import { CITIZEN_MAIN_CLASS, CITIZEN_PANEL_CLASS } from "~/components/sidebar-01/workspace";
import { ThemeScope } from "~/components/theme-scope";
import type { AccountProfile, SettingsTab } from "~/features/account/account.types";
import { SettingsDialog } from "~/features/account/components/SettingsDialog";
import { Button } from "~/components/ui/button";
import { ProfilePage } from "~/features/account/pages/ProfilePage";
import { ProfilePageSkeleton } from "~/features/account/pages/ProfilePageSkeleton";
import { buildNavGroups } from "~/components/sidebar-01/nav-config";
import { QuietLink } from "~/components/quiet-link";
import "~/styles/app.css";

const params = new URLSearchParams(location.search);
const account: AccountProfile = {
  id: "fixture-applicant", email: params.has("long") ? `${"long.email".repeat(8)}@example.com` : "ana.cruz@example.com", role: "applicant",
  firstName: "Ana", middleName: "", hasNoMiddleName: true, lastName: params.has("long") ? "Longsurname".repeat(8) : "Cruz", suffix: "",
  dateOfBirth: "1996-02-08", sex: "female", phoneNumber: "9171234567", accountStatus: "active",
  createdAt: "2026-11-14T00:00:00Z", lastLoginAt: null, welcomeTutorialSeen: true, avatarUrl: null,
};

function Shell() {
  const [settingsTab, setSettingsTab] = useState<SettingsTab | null>(null);
  return <><ThemeScope /><div className="citizen-portal min-h-screen bg-background md:flex">
    <aside className="hidden w-56 shrink-0 flex-col gap-2 p-5 md:flex" aria-label="Desktop navigation">
      {buildNavGroups("applicant", () => true, 2).flatMap((group) => group.items).map((item) =>
        <QuietLink key={item.id} to={item.url} className="min-h-11 px-3 py-3">{item.title}</QuietLink>)}
      <Button variant="ghost" size="touch" onClick={() => setSettingsTab("profile")}>Settings</Button>
    </aside>
    <div className={CITIZEN_PANEL_CLASS}>
      <CitizenMobileHeader userId={account.id} unreadNotifications={2} />
      <CitizenTopBar userId={account.id} unreadNotifications={2} />
      <main className={CITIZEN_MAIN_CLASS}><Outlet /></main>
    </div><CitizenBottomBar />
    <SettingsDialog account={account} open={settingsTab !== null} tab={settingsTab ?? "profile"}
      onTabChange={setSettingsTab} onOpenChange={(open) => setSettingsTab(open ? "profile" : null)} />
  </div></>;
}
const root = createRootRoute({ beforeLoad: () => ({ user: account }), component: Shell });
const dashboard = createRoute({ getParentRoute: () => root, path: "/dashboard", component: () => <h1>Dashboard</h1> });
const profile = createRoute({ getParentRoute: () => root, path: "/profile", component: () => params.has("loading") ? <ProfilePageSkeleton /> : <ProfilePage account={account} /> });
const notifications = createRoute({ getParentRoute: () => root, path: "/notifications", component: () => <h1>Notifications</h1> });
const requests = createRoute({ getParentRoute: () => root, path: "/my-requests", component: () => <h1>My requests</h1> });
const services = createRoute({ getParentRoute: () => root, path: "/services", component: () => <h1>Services</h1> });
const logout = createRoute({ getParentRoute: () => root, path: "/logout", component: () => <h1>Signing out</h1> });
const router = createRouter({ routeTree: root.addChildren([dashboard, profile, notifications, requests, services, logout]), defaultPreload: "intent", history: createMemoryHistory({ initialEntries: [params.get("start") ?? "/dashboard"] }) });
createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);
