import type * as React from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { DialogFooter } from "~/components/ui/dialog";
import { Separator } from "~/components/ui/separator";
import { roleLabels } from "~/features/system-admin/system-admin.constants";
import type { AccountProfile } from "../account.types";
import { SettingsPanelBody } from "./SettingsPanelBody";

const accountStatusVariants = {
  active: "success",
  suspended: "warning",
  deactivated: "destructive",
} as const;

const accountStatusLabels = {
  active: "Active",
  suspended: "Suspended",
  deactivated: "Deactivated",
} as const;

function formatDate(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="truncate text-sm font-medium text-foreground">
        {children}
      </span>
    </div>
  );
}

export function SettingsGeneralPanel({
  account,
  onClose,
}: {
  account: AccountProfile;
  onClose: () => void;
}) {
  return (
    <>
      <SettingsPanelBody>
        <section
          aria-label="Account details"
          className="rounded-lg border border-border bg-surface-subtle px-4 py-1"
        >
          <DetailRow label="Email">{account.email}</DetailRow>
          <Separator />
          <DetailRow label="Role">
            <Badge variant="info">{roleLabels[account.role]}</Badge>
          </DetailRow>
          <Separator />
          <DetailRow label="Account status">
            <Badge variant={accountStatusVariants[account.accountStatus]}>
              {accountStatusLabels[account.accountStatus]}
            </Badge>
          </DetailRow>
          <Separator />
          <DetailRow label="Member since">
            {formatDate(account.createdAt)}
          </DetailRow>
          <Separator />
          <DetailRow label="Last sign-in">
            {formatDate(account.lastLoginAt)}
          </DetailRow>
        </section>

        <p className="mt-4 text-xs text-muted-foreground">
          Your email address and role are managed by the CCRO and cannot be
          changed here. Name, birth date and contact details live under Profile.
        </p>
      </SettingsPanelBody>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </>
  );
}
