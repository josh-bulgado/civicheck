import { useState } from "react";
import { Navigate } from "@tanstack/react-router";
import { Bug, ChevronRight, LogOut, Moon, Settings, Sun } from "lucide-react";
import { QuietLink } from "~/components/quiet-link";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button, buttonVariants } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { openProblemReport } from "~/features/feedback/problem-report-events";
import { useTheme } from "~/hooks/use-theme";
import { useMediaQuery } from "~/hooks/use-media-query";
import { cn } from "~/lib/utils";
import { getDisplayName, getInitials, type AccountProfile, type SettingsTab } from "../account.types";
import { SettingsDialog } from "../components/SettingsDialog";

export function ProfilePage({ account }: { account: AccountProfile }) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  return isDesktop ? <Navigate to="/dashboard" replace /> : <ProfileContent account={account} />;
}

function ProfileContent({ account }: { account: AccountProfile }) {
  const [settingsTab, setSettingsTab] = useState<SettingsTab | null>(null);
  const { theme, setTheme } = useTheme();
  const name = getDisplayName(account);

  return (
    <div className="portal-page w-full min-w-0 max-w-2xl gap-5 md:hidden">
      <h1 className="portal-title civic-enter-sm">Profile</h1>

      <Card variant="quiet" className="@container/profile-card civic-enter-sm gap-5">
        <CardHeader className="grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-1 @max-[16rem]/profile-card:grid-cols-1 @max-[16rem]/profile-card:gap-y-2 @max-[16rem]/profile-card:px-4">
          <Avatar className="row-span-2 size-14 @max-[16rem]/profile-card:row-span-1" aria-hidden="true">
            {account.avatarUrl ? <AvatarImage src={account.avatarUrl} alt="" /> : null}
            <AvatarFallback>{getInitials(name)}</AvatarFallback>
          </Avatar>
          <CardTitle className="wrap-anywhere">{name}</CardTitle>
          <CardDescription className="wrap-anywhere">{account.email}</CardDescription>
        </CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-5 @max-[16rem]/profile-card:px-4">
          <Button variant="ghost" size="touch" shape="soft" onClick={() => setSettingsTab("profile")}
            className="h-auto min-h-14 w-full justify-start gap-3 whitespace-normal text-left @max-[16rem]/profile-card:px-0">
            <Settings data-icon="inline-start" className="@max-[16rem]/profile-card:hidden" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span>Settings</span>
              <span className="text-xs font-normal text-body-2">Personal details and password</span>
            </span>
            <ChevronRight data-icon="inline-end" />
          </Button>

          <Separator />

          <section aria-labelledby="profile-appearance" className="flex flex-col gap-3">
            <h2 id="profile-appearance" className="text-sm font-semibold">Appearance</h2>
            <ToggleGroup aria-label="Appearance" variant="segmented" size="touch" value={[theme]}
              onValueChange={(values) => {
                const next = values[0];
                if (next === "light" || next === "dark") setTheme(next);
              }} className="w-full @max-[16rem]/profile-card:flex-wrap">
              <ToggleGroupItem value="light" className="min-h-11 flex-1 @max-[16rem]/profile-card:w-full @max-[16rem]/profile-card:flex-none"><Sun aria-hidden="true" />Light</ToggleGroupItem>
              <ToggleGroupItem value="dark" className="min-h-11 flex-1 @max-[16rem]/profile-card:w-full @max-[16rem]/profile-card:flex-none"><Moon aria-hidden="true" />Dark</ToggleGroupItem>
            </ToggleGroup>
          </section>

          <Separator />

          <div className="flex flex-col gap-1">
            <Button variant="ghost" size="touch" shape="soft" onClick={openProblemReport} className="w-full justify-start gap-3 whitespace-normal text-left @max-[16rem]/profile-card:h-auto @max-[16rem]/profile-card:min-h-11 @max-[16rem]/profile-card:gap-2 @max-[16rem]/profile-card:px-0 @max-[16rem]/profile-card:py-3">
              <Bug data-icon="inline-start" className="@max-[16rem]/profile-card:hidden" /><span className="min-w-0 wrap-anywhere">Report a problem</span>
            </Button>
            <QuietLink to="/logout" preload={false} className={cn(
              buttonVariants({ variant: "ghost", size: "touch", shape: "soft" }),
              "w-full justify-start gap-3 whitespace-normal text-destructive hover:text-destructive @max-[16rem]/profile-card:h-auto @max-[16rem]/profile-card:min-h-11 @max-[16rem]/profile-card:gap-2 @max-[16rem]/profile-card:px-0 @max-[16rem]/profile-card:py-3",
            )}>
              <LogOut data-icon="inline-start" className="@max-[16rem]/profile-card:hidden" /><span className="min-w-0 wrap-anywhere">Log out</span>
            </QuietLink>
          </div>
        </CardContent>
      </Card>

      <SettingsDialog account={account} open={settingsTab !== null} tab={settingsTab ?? "profile"}
        onTabChange={setSettingsTab} onOpenChange={(open) => setSettingsTab(open ? "profile" : null)} />
    </div>
  );
}
