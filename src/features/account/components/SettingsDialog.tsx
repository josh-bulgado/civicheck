import { Lock, SlidersHorizontal, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import type { AccountProfile, SettingsTab } from "../account.types";
import { SettingsGeneralPanel } from "./SettingsGeneralPanel";
import { SettingsPasswordPanel } from "./SettingsPasswordPanel";
import { SettingsProfilePanel } from "./SettingsProfilePanel";

const panelClassName = "mt-3 flex min-h-0 flex-col gap-4";

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
  const close = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Square frame: equal width and height until the viewport is too short. */}
      <DialogContent className="flex h-[min(44rem,88vh)] flex-col gap-4 overflow-hidden sm:max-w-176">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your personal details, account information, and password.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(value) => onTabChange(value as SettingsTab)}
          className="min-h-0 flex-1"
        >
          <TabsList aria-label="Settings sections" className="w-full">
            <TabsTrigger value="profile">
              <User aria-hidden="true" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="general">
              <SlidersHorizontal aria-hidden="true" />
              General
            </TabsTrigger>
            <TabsTrigger value="password">
              <Lock aria-hidden="true" />
              Password
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className={panelClassName}>
            <SettingsProfilePanel account={account} onClose={close} />
          </TabsContent>

          <TabsContent value="general" className={panelClassName}>
            <SettingsGeneralPanel account={account} onClose={close} />
          </TabsContent>

          <TabsContent value="password" className={panelClassName}>
            <SettingsPasswordPanel onClose={close} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
