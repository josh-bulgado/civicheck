import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { roleLabels } from "../system-admin.constants";
import {
  formatRelativeSecurityTime,
  formatSecurityTimestamp,
} from "../security-center.utils";
import { countLabel } from "../system-health.utils";
import type { PrivilegedAccountSecurity } from "../system-admin.types";

const statusTones = {
  active: "success",
  suspended: "danger",
  deactivated: "neutral",
} as const;

function initialsOf(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? (parts.at(-1)?.charAt(0) ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

export function PrivilegedAccessSection({
  accounts,
  checkedAt,
}: {
  accounts: PrivilegedAccountSecurity[];
  checkedAt: string;
}) {
  const staleCount = accounts.filter((account) => account.isStale).length;

  return (
    <section
      className="security-card"
      aria-labelledby="privileged-access-title"
    >
      <div className="security-card-header">
        <h2 id="privileged-access-title">Privileged access review</h2>
        <div className="security-card-chips">
          <Badge variant="neutral">{countLabel(accounts.length, "account")}</Badge>
          <Badge variant={staleCount > 0 ? "destructive" : "success"}>
            {staleCount} stale
          </Badge>
        </div>
      </div>
      {accounts.length > 0 ? (
        <Table className="security-table">
          <TableCaption className="sr-only">
            Privileged account roles, access status, and sign-in recency. Active
            and inactive administrator assignments with sign-in recency only.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last sign-in</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell>
                  <div className="security-account">
                    <Avatar>
                      <AvatarFallback>{initialsOf(account.name)}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 wrap-break-word whitespace-normal">
                      {account.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{roleLabels[account.role]}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="security-status capitalize"
                      data-tone={statusTones[account.status]}
                    >
                      {account.status}
                    </span>
                    {account.isStale ? (
                      <Badge variant="destructive">Review access</Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <p className="security-cell-title">
                    {formatRelativeSecurityTime(account.lastSignInAt, checkedAt)}
                  </p>
                  {account.lastSignInAt ? (
                    <time
                      dateTime={account.lastSignInAt}
                      className="security-cell-sub block"
                    >
                      {formatSecurityTimestamp(account.lastSignInAt)}
                    </time>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="security-empty">No privileged accounts were returned.</p>
      )}
    </section>
  );
}
