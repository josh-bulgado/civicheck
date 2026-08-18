import { ClockAlert, UserRoundCheck, UserRoundCog } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
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
import type { PrivilegedAccountSecurity } from "../system-admin.types";

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
      className="h-full min-w-0"
      aria-labelledby="privileged-access-title"
    >
      <Card className="h-full gap-0 pb-0 [--card-spacing:--spacing(5)]">
        <CardHeader className="border-b">
          <div className="flex items-start gap-3">
            <UserRoundCog
              className="mt-0.5 size-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div className="min-w-0">
                <CardTitle>
                  <h2 id="privileged-access-title" className="text-balance">
                    Privileged Access Review
                  </h2>
                </CardTitle>
                <CardDescription className="text-pretty">
                  Active and inactive administrator assignments with sign-in
                  recency only.
                </CardDescription>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Badge variant="outline">
                  {accounts.length} account{accounts.length === 1 ? "" : "s"}
                </Badge>
                <Badge variant={staleCount > 0 ? "destructive" : "secondary"}>
                  {staleCount > 0 ? (
                    <ClockAlert data-icon="inline-start" aria-hidden="true" />
                  ) : (
                    <UserRoundCheck
                      data-icon="inline-start"
                      aria-hidden="true"
                    />
                  )}
                  {staleCount} stale
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 p-0">
          <Table className="min-w-176">
            <TableCaption className="sr-only">
              Privileged account roles, access status, and sign-in recency
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="px-6">Account</TableHead>
                <TableHead className="px-4">Role</TableHead>
                <TableHead className="px-4">Status</TableHead>
                <TableHead className="px-6 text-right">
                  Last Sign-In
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="civic-stagger-auto">
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="max-w-56 whitespace-normal px-6 py-4 break-words font-medium">
                    {account.name}
                  </TableCell>
                  <TableCell className="px-4 py-4">
                    {roleLabels[account.role]}
                  </TableCell>
                  <TableCell className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant={
                          account.status === "active" ? "outline" : "secondary"
                        }
                      >
                        <span className="capitalize">{account.status}</span>
                      </Badge>
                      {account.isStale ? (
                        <Badge variant="destructive">Review access</Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <p className="font-mono text-xs tabular-nums">
                      {formatRelativeSecurityTime(
                        account.lastSignInAt,
                        checkedAt,
                      )}
                    </p>
                    {account.lastSignInAt ? (
                      <time
                        dateTime={account.lastSignInAt}
                        className="text-xs text-muted-foreground"
                      >
                        {formatSecurityTimestamp(account.lastSignInAt)}
                      </time>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              {accounts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-36 text-center text-muted-foreground"
                  >
                    No privileged accounts were returned.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
