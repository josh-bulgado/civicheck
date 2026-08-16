import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import type { AccountStatus, Role } from "~/lib/permissions";
import { requireActiveSession } from "~/server/auth";
import { getSupabaseAdminClient } from "~/utils/supabase";
import type {
  PrivilegedAccountSecurity,
  SecurityActivity,
  SecurityCenterDashboard,
  SecurityControlStatus,
  SecurityFinding,
  SecurityFindingCategory,
  SecurityFindingSeverity,
  SecurityFindingStatus,
  SecurityPolicyControl,
} from "./system-admin.types";

const privilegedRoles = new Set<Role>(["system_admin", "admin", "supervisor"]);
const staleAfterMs = 90 * 24 * 60 * 60 * 1_000;
const neverSignedInGraceMs = 7 * 24 * 60 * 60 * 1_000;

type SecurityFindingRow = {
  id: string;
  finding_key: string;
  category: string;
  severity: string;
  title: string;
  summary: string;
  status: string;
  subject_profile_id: string | null;
  assigned_to: string | null;
  last_seen_at: string;
  resolution_note: string | null;
};

const findingActionSchema = z.object({
  findingId: z.string().uuid(),
  action: z.enum(["acknowledge", "assign", "resolve"]),
  assigneeId: z.string().uuid().nullable().optional(),
  resolution: z.string().trim().min(10).max(500).nullable().optional(),
});

const controlReviewSchema = z.object({
  controlKey: z.string().trim().min(1).max(80),
});

function normalizeRole(value: unknown): Role {
  return value === "applicant" ||
    value === "frontdesk" ||
    value === "staff" ||
    value === "supervisor" ||
    value === "cashier" ||
    value === "admin" ||
    value === "system_admin"
    ? value
    : "applicant";
}

function normalizeAccountStatus(value: unknown): AccountStatus {
  return value === "suspended" || value === "deactivated" ? value : "active";
}

function normalizeSeverity(value: unknown): SecurityFindingSeverity {
  return value === "critical" ||
    value === "high" ||
    value === "medium"
    ? value
    : "low";
}

function normalizeFindingStatus(value: unknown): SecurityFindingStatus {
  return value === "acknowledged" || value === "resolved" ? value : "open";
}

function normalizeFindingCategory(value: unknown): SecurityFindingCategory {
  return value === "authentication" || value === "policy"
    ? value
    : "privileged_access";
}

function normalizeControlStatus(value: unknown): SecurityControlStatus {
  return value === "monitoring" ||
    value === "review_due" ||
    value === "action_required"
    ? value
    : "enforced";
}

function nameOf(profile: {
  id: string;
  first_name: string | null;
  last_name: string | null;
}) {
  return (
    `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() ||
    profile.id
  );
}

function isPrivilegedAccountStale(
  createdAt: string,
  lastSignInAt: string | null,
  now: number,
) {
  if (lastSignInAt) {
    return now - new Date(lastSignInAt).getTime() >= staleAfterMs;
  }
  return now - new Date(createdAt).getTime() >= neverSignedInGraceMs;
}

function findingRowToModel(
  row: SecurityFindingRow,
  profileNames: Map<string, string>,
): SecurityFinding {
  return {
    id: row.id,
    category: normalizeFindingCategory(row.category),
    severity: normalizeSeverity(row.severity),
    title: row.title,
    summary: row.summary,
    status: normalizeFindingStatus(row.status),
    subjectLabel: row.subject_profile_id
      ? (profileNames.get(row.subject_profile_id) ?? "Restricted account")
      : null,
    assignedToId: row.assigned_to,
    assignedToLabel: row.assigned_to
      ? (profileNames.get(row.assigned_to) ?? "System Administrator")
      : null,
    lastSeenAt: row.last_seen_at,
    resolutionNote: row.resolution_note,
  };
}

export const getSecurityCenter = createServerFn({ method: "GET" }).handler(
  async (): Promise<SecurityCenterDashboard> => {
    await requireActiveSession("security:view");
    setResponseHeader("Cache-Control", "no-store");

    const admin = getSupabaseAdminClient();
    const now = Date.now();
    const checkedAt = new Date(now).toISOString();
    const activityCutoff = new Date(now - 24 * 60 * 60 * 1_000).toISOString();

    const [
      profilesResult,
      findingsResult,
      controlsResult,
      securityEventsResult,
      auditEventsResult,
    ] = await Promise.all([
      admin
        .from("profiles")
        .select("id, first_name, last_name, role, access_status")
        .neq("role", "applicant"),
      admin
        .from("system_security_findings")
        .select(
          "id, finding_key, category, severity, title, summary, status, subject_profile_id, assigned_to, last_seen_at, resolution_note",
        )
        .order("last_seen_at", { ascending: false })
        .limit(100),
      admin
        .from("system_security_controls")
        .select(
          "control_key, category, name, description, status, evidence_summary, review_interval_days, last_reviewed_at, next_review_due_at",
        )
        .order("name"),
      admin
        .from("system_security_events")
        .select(
          "id, event_type, risk_level, actor_profile_id, subject_fingerprint, summary, occurred_at",
        )
        .gte("occurred_at", activityCutoff)
        .order("occurred_at", { ascending: false })
        .limit(200),
      admin
        .from("system_audit_events")
        .select("id, event_type, actor_profile_id, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    if (profilesResult.error) throw new Error(profilesResult.error.message);
    if (findingsResult.error) throw new Error(findingsResult.error.message);
    if (controlsResult.error) throw new Error(controlsResult.error.message);
    if (securityEventsResult.error) {
      throw new Error(securityEventsResult.error.message);
    }
    if (auditEventsResult.error) throw new Error(auditEventsResult.error.message);

    const profiles = profilesResult.data ?? [];
    const profileNames = new Map(
      profiles.map((profile) => [profile.id, nameOf(profile)]),
    );
    const privilegedProfiles = profiles.filter((profile) =>
      privilegedRoles.has(normalizeRole(profile.role)),
    );
    const privilegedUsers = await Promise.all(
      privilegedProfiles.map(async (profile) => {
        const { data, error } = await admin.auth.admin.getUserById(profile.id);
        return error || !data.user ? null : { profile, user: data.user };
      }),
    );

    const privilegedAccounts: PrivilegedAccountSecurity[] = privilegedUsers
      .filter((entry) => entry !== null)
      .map(({ profile, user }) => ({
        id: profile.id,
        name: nameOf(profile),
        role: normalizeRole(profile.role),
        status: normalizeAccountStatus(profile.access_status),
        lastSignInAt: user.last_sign_in_at ?? null,
        isStale:
          normalizeAccountStatus(profile.access_status) === "active" &&
          isPrivilegedAccountStale(
            user.created_at,
            user.last_sign_in_at ?? null,
            now,
          ),
      }))
      .sort((left, right) => {
        if (left.isStale !== right.isStale) return left.isStale ? -1 : 1;
        return left.name.localeCompare(right.name);
      });

    const controls: SecurityPolicyControl[] = (controlsResult.data ?? []).map(
      (control) => ({
        key: control.control_key,
        category:
          control.category === "access" ||
          control.category === "credentials" ||
          control.category === "audit"
            ? control.category
            : "identity",
        name: control.name,
        description: control.description,
        status: normalizeControlStatus(control.status),
        evidenceSummary: control.evidence_summary,
        lastReviewedAt: control.last_reviewed_at,
        nextReviewDueAt: control.next_review_due_at,
        reviewIntervalDays: control.review_interval_days,
      }),
    );

    const securityEvents = securityEventsResult.data ?? [];
    const failedEvents = securityEvents.filter(
      (event) => event.event_type === "sign_in_failed",
    );
    const lastHourCutoff = now - 60 * 60 * 1_000;
    const failedGroups = new Map<string, number>();
    for (const event of failedEvents) {
      if (new Date(event.occurred_at).getTime() < lastHourCutoff) continue;
      const groupKey = event.subject_fingerprint ?? "aggregate";
      failedGroups.set(groupKey, (failedGroups.get(groupKey) ?? 0) + 1);
    }

    const existingRows = findingsResult.data ?? [];
    const existingKeys = new Set(existingRows.map((row) => row.finding_key));
    const pendingFindingRows: Array<Record<string, unknown>> = [];

    for (const account of privilegedAccounts) {
      const findingKey = `stale-privileged-access:${account.id}:${checkedAt.slice(0, 7)}`;
      if (!account.isStale || existingKeys.has(findingKey)) continue;
      pendingFindingRows.push({
        finding_key: findingKey,
        category: "privileged_access",
        severity: account.role === "system_admin" ? "high" : "medium",
        title: "Stale privileged access assignment",
        summary:
          "An active privileged account has not signed in within the approved review window.",
        subject_profile_id: account.id,
        detected_at: checkedAt,
        last_seen_at: checkedAt,
      });
      existingKeys.add(findingKey);
    }

    for (const [groupKey, count] of failedGroups) {
      if (count < 5) continue;
      const findingKey = `failed-sign-in-burst:${groupKey}:${checkedAt.slice(0, 10)}`;
      if (existingKeys.has(findingKey)) continue;
      pendingFindingRows.push({
        finding_key: findingKey,
        category: "authentication",
        severity: count >= 10 ? "high" : "medium",
        title: "Repeated rejected sign-ins",
        summary:
          groupKey === "aggregate"
            ? `${count} rejected password sign-ins were recorded in the last hour.`
            : "At least five rejected password sign-ins targeted the same pseudonymous account fingerprint within one hour.",
        detected_at: checkedAt,
        last_seen_at: checkedAt,
      });
      existingKeys.add(findingKey);
    }

    for (const control of controls) {
      const isDue =
        control.status === "review_due" ||
        control.status === "action_required" ||
        (control.nextReviewDueAt !== null &&
          new Date(control.nextReviewDueAt).getTime() <= now);
      const dueDateKey = (control.nextReviewDueAt ?? checkedAt).slice(0, 10);
      const findingKey = `security-control-review:${control.key}:${dueDateKey}`;
      if (!isDue || existingKeys.has(findingKey)) continue;
      pendingFindingRows.push({
        finding_key: findingKey,
        category: "policy",
        severity: control.status === "action_required" ? "high" : "medium",
        title: `${control.name} requires review`,
        summary:
          "The configured security-control review date is due. Review evidence without recording credential values.",
        detected_at: checkedAt,
        last_seen_at: checkedAt,
      });
      existingKeys.add(findingKey);
    }

    let findingRows = existingRows;
    if (pendingFindingRows.length > 0) {
      const { data: insertedRows, error } = await admin
        .from("system_security_findings")
        .upsert(pendingFindingRows, {
          onConflict: "finding_key",
          ignoreDuplicates: true,
        })
        .select(
          "id, finding_key, category, severity, title, summary, status, subject_profile_id, assigned_to, last_seen_at, resolution_note",
        );
      if (error) {
        console.warn("Derived security findings could not be recorded.");
      } else {
        findingRows = [...findingRows, ...(insertedRows ?? [])];
      }
    }

    const findings = findingRows
      .map((row) => findingRowToModel(row, profileNames))
      .sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt));
    const openFindings = findings.filter(
      (finding) => finding.status !== "resolved",
    );
    const urgentFindingCount = openFindings.filter(
      (finding) =>
        finding.severity === "critical" || finding.severity === "high",
    ).length;
    const overdueControlCount = controls.filter(
      (control) =>
        control.status === "review_due" ||
        control.status === "action_required" ||
        (control.nextReviewDueAt !== null &&
          new Date(control.nextReviewDueAt).getTime() <= now),
    ).length;

    const securityActivities: SecurityActivity[] = securityEvents.map(
      (event) => ({
        id: event.id,
        type:
          event.event_type === "admin_session_started"
            ? "admin_session_started"
            : "sign_in_failed",
        risk: normalizeSeverity(event.risk_level),
        actor: event.actor_profile_id
          ? (profileNames.get(event.actor_profile_id) ?? "Restricted account")
          : "Unidentified sign-in target",
        summary: event.summary,
        timestamp: event.occurred_at,
      }),
    );
    const auditActivities: SecurityActivity[] = (auditEventsResult.data ?? []).map(
      (event) => ({
        id: `audit-${event.id}`,
        type: "privileged_action",
        risk: "low",
        actor: event.actor_profile_id
          ? (profileNames.get(event.actor_profile_id) ?? "System Administrator")
          : "System",
        summary: `Privileged action recorded: ${event.event_type.replaceAll("_", " ")}.`,
        timestamp: event.created_at,
      }),
    );
    const activities = [...securityActivities, ...auditActivities]
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
      .slice(0, 12);

    const assignees = profiles
      .filter(
        (profile) =>
          normalizeRole(profile.role) === "system_admin" &&
          normalizeAccountStatus(profile.access_status) === "active",
      )
      .map((profile) => ({ id: profile.id, name: nameOf(profile) }))
      .sort((left, right) => left.name.localeCompare(right.name));

    return {
      posture:
        urgentFindingCount > 0
          ? "attention"
          : openFindings.length > 0 || overdueControlCount > 0
            ? "watch"
            : "protected",
      checkedAt,
      openFindingCount: openFindings.length,
      urgentFindingCount,
      failedSignIns24h: failedEvents.length,
      privilegedAccountCount: privilegedAccounts.length,
      overdueControlCount,
      findings,
      privilegedAccounts,
      controls,
      activities,
      assignees,
    };
  },
);

export const manageSecurityFinding = createServerFn({ method: "POST" })
  .validator(findingActionSchema)
  .handler(async ({ data }) => {
    const { supabase } = await requireActiveSession("security:manage");
    if (data.action === "assign" && !data.assigneeId) {
      throw new Error("Select an active System Administrator.");
    }
    if (data.action === "resolve" && !data.resolution) {
      throw new Error("Add a resolution note of at least 10 characters.");
    }

    const { error } = await supabase.rpc("manage_system_security_finding", {
      finding_id: data.findingId,
      finding_action: data.action,
      assignee_id: data.assigneeId ?? null,
      resolution: data.resolution ?? null,
    });
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const reviewSecurityControl = createServerFn({ method: "POST" })
  .validator(controlReviewSchema)
  .handler(async ({ data }) => {
    const { supabase } = await requireActiveSession("security:manage");
    const { error } = await supabase.rpc("review_system_security_control", {
      requested_control_key: data.controlKey,
    });
    if (error) throw new Error(error.message);
    return { success: true };
  });
