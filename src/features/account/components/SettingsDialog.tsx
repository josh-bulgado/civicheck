import { Lock, SlidersHorizontal, User, X, type LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "~/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useIsMobile } from "~/hooks/use-mobile";
import type { AccountProfile, SettingsTab } from "../account.types";
import { SettingsGeneralPanel } from "./SettingsGeneralPanel";
import { SettingsPasswordPanel } from "./SettingsPasswordPanel";
import { SettingsProfilePanel } from "./SettingsProfilePanel";

const sections: { value: SettingsTab; label: string; icon: LucideIcon }[] = [
  { value: "profile", label: "Profile", icon: User },
  { value: "general", label: "General", icon: SlidersHorizontal },
  { value: "password", label: "Password", icon: Lock },
];

const panelClassName = "mt-2 flex min-h-0 flex-1 flex-col";

export function SettingsDialog({
  open,
  onOpenChange,
  tab,
  onTabChange,
  account,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  account: AccountProfile;
}) {
  const isMobile = useIsMobile();
  const close = () => onOpenChange(false);
  const activeLabel = sections.find((section) => section.value === tab)?.label;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* One fixed height for every tab, so switching tabs never resizes or
          re-centres the dialog. From `md` the sections run down a left rail;
          below it the rail becomes a row of tabs above the panel. */}
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-[rgba(15,27,45,0.28)] backdrop-blur-sm"
        className="flex h-[min(40rem,calc(100dvh-2rem))] w-[min(49.5rem,calc(100%-2rem))] max-w-none flex-col gap-0 overflow-hidden rounded-panel bg-white p-0 shadow-portal-dialog ring-0 sm:max-w-none md:h-[min(30rem,calc(100dvh-2rem))]"
      >
        <DialogDescription className="sr-only">
          Manage your personal details and password.
        </DialogDescription>

        <Tabs
          value={tab}
          onValueChange={(value) => onTabChange(value as SettingsTab)}
          orientation={isMobile ? "horizontal" : "vertical"}
          className="min-h-0 flex-1 gap-0"
        >
          <div className="flex shrink-0 flex-col gap-3 bg-portal-panel px-5 pt-5 pb-4 md:w-48 md:px-3 md:pb-3">
            <DialogTitle className="font-sans text-lg leading-7 font-bold tracking-[-0.01em] text-foreground md:px-3">
              Settings
            </DialogTitle>
            <TabsList variant="sidebar" aria-label="Settings sections">
              {sections.map(({ value, label, icon: Icon }) => (
                <TabsTrigger key={value} value={value}>
                  <Icon aria-hidden="true" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col px-5 pt-3 md:px-8 md:pt-6">
            {/* The tabs already name the section below `md`. */}
            <h2 className="hidden h-8 shrink-0 items-center pr-10 font-sans text-xl leading-8 font-bold tracking-[-0.01em] text-foreground md:flex">
              {activeLabel}
            </h2>

            <TabsContent value="profile" className={panelClassName}>
              <SettingsProfilePanel account={account} onClose={close} />
            </TabsContent>

            <TabsContent value="general" className={panelClassName}>
              <SettingsGeneralPanel account={account} />
            </TabsContent>

            <TabsContent value="password" className={panelClassName}>
              <SettingsPasswordPanel onClose={close} />
            </TabsContent>
          </div>
        </Tabs>

        <DialogClose
          render={
            <button
              type="button"
              aria-label="Close"
              className="civic-press absolute top-4.5 right-4 flex size-8 items-center justify-center rounded-full text-foreground outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-4 focus-visible:ring-primary/20 md:top-6 md:right-5"
            />
          }
        >
          <X className="size-5" strokeWidth={2} aria-hidden="true" />
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
