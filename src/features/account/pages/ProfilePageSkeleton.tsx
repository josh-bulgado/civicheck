import { Bug, ChevronRight, LogOut, Moon, Settings, Sun } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";

export function ProfilePageSkeleton() {
  return (
    <div className="portal-page w-full min-w-0 max-w-2xl gap-5 md:hidden" aria-busy="true" aria-label="Loading profile">
      <h1 className="portal-title">Profile</h1>
      <Card variant="quiet" className="@container/profile-card gap-5">
        <CardHeader className="grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-1 @max-[16rem]/profile-card:grid-cols-1 @max-[16rem]/profile-card:gap-y-2 @max-[16rem]/profile-card:px-4">
          <Skeleton className="row-span-2 size-14 rounded-full @max-[16rem]/profile-card:row-span-1" />
          <Skeleton className="h-5 w-32 max-w-full" /><Skeleton className="h-4 w-44 max-w-full" />
        </CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-5 @max-[16rem]/profile-card:px-4">
          <Button disabled variant="ghost" size="touch" shape="soft" className="h-auto min-h-14 w-full justify-start gap-3 whitespace-normal text-left @max-[16rem]/profile-card:px-0">
            <Settings data-icon="inline-start" className="@max-[16rem]/profile-card:hidden" /><span className="flex min-w-0 flex-1 flex-col gap-0.5"><span>Settings</span><span className="text-xs font-normal text-body-2">Personal details and password</span></span><ChevronRight data-icon="inline-end" />
          </Button>
          <Separator />
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">Appearance</h2>
            <ToggleGroup disabled aria-label="Appearance" variant="segmented" size="touch" className="w-full @max-[16rem]/profile-card:flex-wrap">
              <ToggleGroupItem value="light" className="min-h-11 flex-1 @max-[16rem]/profile-card:w-full @max-[16rem]/profile-card:flex-none"><Sun aria-hidden="true" />Light</ToggleGroupItem>
              <ToggleGroupItem value="dark" className="min-h-11 flex-1 @max-[16rem]/profile-card:w-full @max-[16rem]/profile-card:flex-none"><Moon aria-hidden="true" />Dark</ToggleGroupItem>
            </ToggleGroup>
          </section>
          <Separator />
          <div className="flex flex-col gap-1">
            <Button disabled variant="ghost" size="touch" shape="soft" className="justify-start gap-3 whitespace-normal @max-[16rem]/profile-card:h-auto @max-[16rem]/profile-card:min-h-11 @max-[16rem]/profile-card:gap-2 @max-[16rem]/profile-card:px-0 @max-[16rem]/profile-card:py-3"><Bug data-icon="inline-start" className="@max-[16rem]/profile-card:hidden" /><span className="min-w-0 wrap-anywhere">Report a problem</span></Button>
            <Button disabled variant="ghost" size="touch" shape="soft" className="justify-start gap-3 whitespace-normal text-destructive @max-[16rem]/profile-card:h-auto @max-[16rem]/profile-card:min-h-11 @max-[16rem]/profile-card:gap-2 @max-[16rem]/profile-card:px-0 @max-[16rem]/profile-card:py-3"><LogOut data-icon="inline-start" className="@max-[16rem]/profile-card:hidden" /><span className="min-w-0 wrap-anywhere">Log out</span></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
