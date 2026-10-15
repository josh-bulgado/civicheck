import type * as React from "react";
import type { AccountProfile } from "../account.types";
import { SettingsPanelBody } from "./SettingsPanelBody";

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
    <div className="flex items-center justify-between gap-4 border-b border-border-lighter py-3 last:border-b-0">
      <dt className="shrink-0 text-[13px] leading-5 font-medium text-foreground">
        {label}
      </dt>
      <dd className="min-w-0 truncate text-[13px] leading-5 text-body-2">
        {children}
      </dd>
    </div>
  );
}

export function SettingsGeneralPanel({ account }: { account: AccountProfile }) {
  return (
    <SettingsPanelBody>
      <dl aria-label="Account details">
        <DetailRow label="Email">{account.email}</DetailRow>
        <DetailRow label="Member since">
          {formatDate(account.createdAt)}
        </DetailRow>
      </dl>
    </SettingsPanelBody>
  );
}
