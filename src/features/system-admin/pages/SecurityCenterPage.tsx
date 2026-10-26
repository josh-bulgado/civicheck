import { useRef, useState } from "react";
import { EyeOff } from "lucide-react";
import { QuietAnchor } from "~/components/quiet-link";
import {
  Tabs,
  TabsContent,
  TabsCount,
  TabsList,
  TabsTrigger,
} from "~/components/ui/tabs";
import { PrivilegedAccessSection } from "../components/PrivilegedAccessSection";
import { SecurityActivitySection } from "../components/SecurityActivitySection";
import { SecurityFindingsSection } from "../components/SecurityFindingsSection";
import { SecurityPolicySection } from "../components/SecurityPolicySection";
import { SecurityPostureSummary } from "../components/SecurityPostureSummary";
import { formatSecurityTimestamp } from "../security-center.utils";
import type { SecurityCenterDashboard } from "../system-admin.types";
import "../security-center.css";

type SecurityTab = "findings" | "access" | "activity" | "controls";

export function SecurityCenterPage({
  data,
}: {
  data: SecurityCenterDashboard;
}) {
  const [tab, setTab] = useState<SecurityTab>("findings");
  const tabsRef = useRef<HTMLDivElement>(null);
  const staleCount = data.privilegedAccounts.filter(
    (account) => account.isStale,
  ).length;

  // The banner's button opens the tab that holds the waiting work and brings it
  // into view, since the banner can be scrolled off by the time it is used.
  function showTab(next: "findings" | "controls") {
    setTab(next);
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    tabsRef.current?.scrollIntoView({
      block: "start",
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }

  return (
    <div className="dashboard-page security-center-page">
      <QuietAnchor
        href="#security-center-content"
        className="sr-only rounded-md bg-card px-3 py-2 text-sm font-bold text-foreground shadow-md focus:fixed focus:top-4 focus:left-4 focus:not-sr-only focus-visible:ring-2 focus-visible:ring-ring"
      >
        Skip to Security Center
      </QuietAnchor>

      <header className="security-page-header">
        <div className="security-page-heading">
          <h1>Security Center</h1>
          <p>Checked {formatSecurityTimestamp(data.checkedAt)}</p>
        </div>
        <span className="security-metadata-chip">
          <EyeOff aria-hidden="true" />
          Metadata only
        </span>
      </header>

      <SecurityPostureSummary data={data} onReview={showTab} />

      <div ref={tabsRef} className="scroll-mt-4">
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as SecurityTab)}
          className="gap-3"
        >
          <TabsList
            variant="counted"
            aria-label="Security Center sections"
            className="security-tab-list"
          >
            <TabsTrigger value="findings">
              Findings
              {data.openFindingCount > 0 ? (
                <TabsCount tone={data.urgentFindingCount > 0 ? "alert" : "default"}>
                  {data.openFindingCount}
                  <span className="sr-only"> unresolved</span>
                </TabsCount>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="access">
              Privileged access
              <TabsCount tone={staleCount > 0 ? "alert" : "default"}>
                {data.privilegedAccounts.length}
                <span className="sr-only"> accounts</span>
              </TabsCount>
            </TabsTrigger>
            <TabsTrigger value="activity">Recent activity</TabsTrigger>
            <TabsTrigger value="controls">
              Controls
              {data.overdueControlCount > 0 ? (
                <TabsCount tone="alert">{data.overdueControlCount} due</TabsCount>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="findings">
            <SecurityFindingsSection
              findings={data.findings}
              assignees={data.assignees}
            />
          </TabsContent>
          <TabsContent value="access">
            <PrivilegedAccessSection
              accounts={data.privilegedAccounts}
              checkedAt={data.checkedAt}
            />
          </TabsContent>
          <TabsContent value="activity">
            <SecurityActivitySection activities={data.activities} />
          </TabsContent>
          <TabsContent value="controls">
            <SecurityPolicySection controls={data.controls} />
          </TabsContent>
        </Tabs>
      </div>

      <p className="security-footnote">
        Security views stay metadata-only. They exclude citizen form values,
        request contents, document names and paths, credentials, raw sign-in
        identifiers and full network addresses.
      </p>
    </div>
  );
}
