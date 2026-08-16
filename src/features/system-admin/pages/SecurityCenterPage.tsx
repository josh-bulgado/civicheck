import { EyeOff, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { PrivilegedAccessSection } from "../components/PrivilegedAccessSection";
import { SecurityActivitySection } from "../components/SecurityActivitySection";
import { SecurityFindingsSection } from "../components/SecurityFindingsSection";
import { SecurityPolicySection } from "../components/SecurityPolicySection";
import { SecurityPostureSummary } from "../components/SecurityPostureSummary";
import { SystemAdminPageHeader } from "../components/SystemAdminPageHeader";
import { formatSecurityTimestamp } from "../security-center.utils";
import type { SecurityCenterDashboard } from "../system-admin.types";

export function SecurityCenterPage({
  data,
}: {
  data: SecurityCenterDashboard;
}) {
  return (
    <div className="dashboard-page">
      <a
        href="#security-center-content"
        className="sr-only rounded-md bg-card px-3 py-2 text-sm font-bold text-foreground shadow-md focus:fixed focus:top-4 focus:left-4 focus:not-sr-only focus-visible:ring-2 focus-visible:ring-ring"
      >
        Skip to Security Center
      </a>
      <SystemAdminPageHeader
        icon={ShieldAlert}
        title="Security Center"
        description="Review security posture, privileged access, policy controls, and actionable findings without opening citizen submissions or documents."
        actions={
          <Badge variant="secondary">
            Checked {formatSecurityTimestamp(data.checkedAt)}
          </Badge>
        }
      />

      <SecurityPostureSummary data={data} />
      <SecurityFindingsSection
        findings={data.findings}
        assignees={data.assignees}
      />
      <div className="flex flex-col gap-6">
        <PrivilegedAccessSection
          accounts={data.privilegedAccounts}
          checkedAt={data.checkedAt}
        />
        <SecurityActivitySection activities={data.activities} />
      </div>
      <SecurityPolicySection controls={data.controls} />
      <Alert>
        <EyeOff aria-hidden="true" />
        <AlertTitle>Security Views Stay Metadata-Only</AlertTitle>
        <AlertDescription>
          This center excludes citizen form values, request contents, document
          names and paths, credentials, raw sign-in identifiers, and full
          network addresses. Sensitive workflow changes are appended to the
          Audit Center.
        </AlertDescription>
      </Alert>
    </div>
  );
}
