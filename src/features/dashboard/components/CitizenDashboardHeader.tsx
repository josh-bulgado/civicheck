import { Button } from "~/components/ui/button";
import { pillButton } from "~/components/portal/styles";
import { openWelcomeTutorial } from "~/features/onboarding/welcome-tutorial.events";
import { cn } from "~/lib/utils";

export function CitizenDashboardHeader({ firstName = "" }: { firstName?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 md:gap-6">
      <h1 className="portal-title min-w-0 max-md:text-[22px] max-md:leading-tight max-xl:truncate">
        Welcome back{firstName ? <span className="hidden md:inline">, {firstName}</span> : null}
      </h1>
      <Button type="button" variant="ghost" className={cn(pillButton.light, "max-md:h-11 max-md:bg-transparent max-md:px-2.5 max-md:text-[13px] max-md:font-medium max-md:shadow-none max-md:hover:bg-primary-soft max-md:hover:text-primary")} onClick={openWelcomeTutorial}>
        How it works
      </Button>
    </div>
  );
}
