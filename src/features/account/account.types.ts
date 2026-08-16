import type { AccountStatus, Role } from "~/lib/permissions";

/**
 * The signed-in user's own account, as loaded into root route context.
 * Optional profile columns are normalised to "" so form fields stay controlled.
 */
export type AccountProfile = {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  dateOfBirth: string;
  sex: "" | "male" | "female";
  phoneNumber: string;
  accountStatus: AccountStatus;
  createdAt: string;
  lastLoginAt: string | null;
};

/** Sections of the account settings dialog, in tab order. */
export type SettingsTab = "profile" | "general" | "password";

export function getDisplayName(account: AccountProfile): string {
  return (
    `${account.firstName} ${account.lastName}`.trim() ||
    account.email.split("@")[0]
  );
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials =
    parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`
      : name.slice(0, 2);
  return initials.toUpperCase();
}
