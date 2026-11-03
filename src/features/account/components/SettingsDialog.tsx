import { Lock, User, X, type LucideIcon } from "lucide-react";
import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "~/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useIsMobile } from "~/hooks/use-mobile";
import {
  getDisplayName,
  getInitials,
  type AccountProfile,
  type SettingsTab,
} from "../account.types";
import { SettingsProfilePanel } from "./SettingsProfilePanel";
import { SettingsSecurityPanel } from "./SettingsSecurityPanel";

const sections: {
  value: SettingsTab;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    value: "profile",
    label: "Profile",
    description: "Your name and contact details, as they appear on your requests.",
    icon: User,
  },
  {
    value: "security",
    label: "Security",
    description: "Change your password and see when you last signed in.",
    icon: Lock,
  },
];

const panelClassName = "flex min-h-0 flex-1 flex-col";

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
  // Each tab reports whether it holds edits that haven't been saved.
  const [profileDirty, setProfileDirty] = React.useState(false);
  const [securityDirty, setSecurityDirty] = React.useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = React.useState(false);
  const dirty = profileDirty || securityDirty;

  // The tabs unmount with the dialog and can't say they're clean any more.
  React.useEffect(() => {
    if (open) return;
    setProfileDirty(false);
    setSecurityDirty(false);
    setConfirmingDiscard(false);
  }, [open]);

  // Saving and Cancel close directly; the X, Esc and a click outside ask first.
  const close = () => onOpenChange(false);
  const requestOpenChange = (next: boolean) => {
    if (!next && dirty) {
      setConfirmingDiscard(true);
      return;
    }
    onOpenChange(next);
  };

  const name = getDisplayName(account);
  const active = sections.find((section) => section.value === tab);

  return (
    <Dialog open={open} onOpenChange={requestOpenChange}>
      {/* One fixed height for every tab, so switching tabs never resizes or
          re-centres the dialog. From `md` the sections run down a left rail
          that starts with who is signed in; below it the dialog is a tall
          sheet with the sections as underlined tabs across the top. The
          `--settings-*` variables are the field colours settings-form.tsx
          reads: the dialog portals outside the shell's tokens. */}
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-[rgba(15,27,45,0.28)] backdrop-blur-sm"
        className="[--settings-disabled-bg:#e4e9f1] [--settings-disabled-ink:#566377] [--settings-line:#8d98a9] [--settings-placeholder:#667085] dark:[--settings-disabled-bg:#22262d] dark:[--settings-disabled-ink:#9aa1ad] dark:[--settings-line:#4b525e] dark:[--settings-placeholder:#858e9c] flex h-[min(47.5rem,calc(100dvh-1.5rem))] w-[calc(100%-1.5rem)] max-w-none flex-col gap-0 overflow-hidden rounded-panel bg-card p-0 shadow-portal-dialog ring-0 sm:max-w-none md:h-[min(43.75rem,calc(100dvh-2rem))] md:w-[min(55rem,calc(100%-2rem))] md:rounded-3xl"
      >
        <DialogDescription className="sr-only">
          Manage your profile photo and personal details, and change your password.
        </DialogDescription>

        <Tabs
          value={tab}
          onValueChange={(value) => onTabChange(value as SettingsTab)}
          orientation={isMobile ? "horizontal" : "vertical"}
          className="min-h-0 flex-1 gap-0"
        >
          <div className="flex shrink-0 flex-col md:w-62 md:gap-7 md:bg-portal-panel md:px-4 md:py-7">
            <div className="hidden min-w-0 items-center gap-3 px-2 md:flex">
              <Avatar className="size-11">
                {account.avatarUrl ? (
                  <AvatarImage src={account.avatarUrl} alt="" />
                ) : null}
                <AvatarFallback className="bg-primary-soft text-sm font-bold text-primary">
                  {getInitials(name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-[15px] leading-5 font-semibold text-foreground">
                  {name}
                </p>
                <p className="truncate text-[13px] leading-[18px] text-body-2">
                  {account.email}
                </p>
              </div>
            </div>

            <DialogTitle className="px-5 pt-3 pr-16 font-sans text-xl leading-11 font-bold tracking-[-0.01em] text-foreground md:sr-only">
              Settings
            </DialogTitle>

            <div className="max-md:px-5 max-md:pt-1">
              <TabsList
                variant={isMobile ? "underline" : "sidebar"}
                aria-label="Settings sections"
              >
                {sections.map(({ value, label, icon: Icon }) => (
                  <TabsTrigger key={value} value={value}>
                    <Icon className="size-4.5 max-md:hidden" aria-hidden="true" />
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col pt-4 md:pt-7">
            {/* The tabs already name the section below `md`. */}
            <div className="mb-4 hidden shrink-0 px-8 pr-20 md:block">
              <h3 className="font-sans text-[22px] leading-7 font-bold tracking-[-0.01em] text-foreground">
                {active?.label}
              </h3>
              <p className="mt-1 text-sm leading-5 text-body-2">
                {active?.description}
              </p>
            </div>

            {/* Kept mounted so edits on one tab survive a look at the other. */}
            <TabsContent
              value="profile"
              keepMounted
              className={panelClassName}
            >
              <SettingsProfilePanel
                account={account}
                onClose={close}
                onDirtyChange={setProfileDirty}
              />
            </TabsContent>

            <TabsContent
              value="security"
              keepMounted
              className={panelClassName}
            >
              <SettingsSecurityPanel
                account={account}
                onClose={close}
                onDirtyChange={setSecurityDirty}
              />
            </TabsContent>
          </div>
        </Tabs>

        <DialogClose
          render={
            <button
              type="button"
              aria-label="Close"
              className="civic-press absolute top-3 right-2 flex size-11 items-center justify-center rounded-full text-foreground outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-4 focus-visible:ring-primary/20 md:top-5 md:right-5"
            />
          }
        >
          <X className="size-5.5" strokeWidth={2} aria-hidden="true" />
        </DialogClose>

        <AlertDialog
          open={confirmingDiscard}
          onOpenChange={setConfirmingDiscard}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
              <AlertDialogDescription>
                If you close Settings now, your unsaved changes will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep editing</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={close}>
                Discard and close
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
