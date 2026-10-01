import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseAdminClient } from "~/utils/supabase";
import { requireActiveSession } from "~/server/auth";
import { getAppUrl } from "~/utils/app-url";
import { renderLinkEmail } from "~/utils/email-template";
import { sendEmail } from "~/utils/resend";
import {
  describeUserAgent,
  getRequestNetworkSignal,
} from "./network-signal.server";
import type {
  AccountCategory,
  AccountEmploymentType,
  AccountHistoryEvent,
  AccountSex,
  AccountSummary,
  AdminCandidate,
  AuditFilters,
  NormalizedAuditEvent,
} from "./system-admin.types";
import type { AccountStatus, Role } from "~/lib/permissions";
import { accountCategoryRoles } from "./system-admin.constants";

const pageSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});
const accountPageSchema = pageSchema.extend({
  category: z
    .enum(["personnel", "citizens", "platform-admins"])
    .default("personnel"),
  q: z.string().trim().max(100).optional(),
  role: z
    .enum(["applicant", "staff", "supervisor", "cashier", "admin", "system_admin"])
    .optional(),
  status: z.enum(["active", "suspended", "deactivated"]).optional(),
  departmentId: z.string().min(1).max(100).optional(),
  signIn: z.literal("never").optional(),
});
const accountActionSchema = z.object({ targetId: z.string().uuid() });
const suspendSchema = accountActionSchema.extend({
  reason: z.string().trim().min(10).max(500),
});
const accountDetailsSchema = accountActionSchema.extend({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  middleName: z.string().trim().max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  suffix: z.string().trim().max(20),
  dateOfBirth: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
          !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
          Date.parse(`${value}T00:00:00Z`) <= Date.now()),
      "Enter a valid date of birth that is not in the future.",
    ),
  sex: z.enum(["", "male", "female"]),
  phoneNumber: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^9\d{9}$/.test(value),
      "Enter a valid 10-digit mobile number, e.g. 9171234567.",
    ),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});
const verificationSchema = accountActionSchema.extend({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});
const replacementSchema = z.object({
  candidateId: z.string().uuid(),
  // Absent when there is no active CCRO Administrator to demote — the
  // candidate is appointed outright instead of replacing anyone.
  outgoingRole: z.enum(["staff", "supervisor", "cashier"]).nullable().optional(),
  outgoingDepartmentId: z.string().min(1).nullable().optional(),
});
const auditSchema = pageSchema.extend({
  actor: z.string().trim().max(100).optional(),
  event: z.string().trim().max(100).optional(),
  source: z.enum(["all", "system", "request", "sign-in"]).default("all"),
  from: z.string().optional(),
  to: z.string().optional(),
  account: z.string().uuid().optional(),
});

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function writeAudit(
  actorId: string,
  eventType: string,
  targetId: string,
  metadata: Record<string, string> = {},
) {
  const { maskedIpAddress, userAgent } = getRequestNetworkSignal();
  const { error } = await getSupabaseAdminClient()
    .from("system_audit_events")
    .insert({
      actor_profile_id: actorId,
      event_type: eventType,
      target_profile_id: targetId,
      metadata,
      masked_ip_address: maskedIpAddress,
      user_agent: userAgent,
    });
  if (error) throw new Error(`Audit event could not be recorded: ${error.message}`);
}

/**
 * Loads the profile an account action targets and rejects the ones System
 * Administrators may never act on: platform admins (including themselves).
 */
async function loadManageableTarget(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  targetId: string,
  actorId: string,
) {
  if (targetId === actorId) throw new Error("You cannot modify your own account.");
  const { data: target, error } = await admin
    .from("profiles")
    .select("role, access_status, first_name")
    .eq("id", targetId)
    .single();
  if (error || !target) throw new Error("Account not found.");
  if (target.role === "system_admin") {
    throw new Error("System Administrator accounts cannot be modified here.");
  }
  return target;
}

/** Signs an account out everywhere. Returns whether the sessions were removed. */
async function revokeSessions(targetId: string) {
  const { error } = await getSupabaseAdminClient().rpc("revoke_user_sessions", {
    target_user_id: targetId,
  });
  if (error) {
    console.error("Session revocation failed:", error.message);
    return false;
  }
  return true;
}

/** Single-use link that lands on /auth/callback, which verifies the token. */
function buildAuthCallbackUrl(
  hashedToken: string,
  type: "recovery" | "email",
  next?: string,
) {
  const url = new URL("/auth/callback", getAppUrl());
  url.searchParams.set("token_hash", hashedToken);
  url.searchParams.set("type", type);
  if (next) url.searchParams.set("next", next);
  return url.toString();
}

export const getAccounts = createServerFn({ method: "GET" })
  .validator(accountPageSchema)
  .handler(async ({ data }) => {
    await requireActiveSession("accounts:view_all");
    const admin = getSupabaseAdminClient();
    const category = data.category as AccountCategory;
    const start = (data.page - 1) * data.pageSize;
    // Candidates only feed the personnel-only "Replace CCRO Administrator"
    // flow. Departments load on every category, because the edit dialog can
    // move any account — a citizen included — into a department-scoped role.
    const candidatesPromise =
      category === "personnel"
        ? admin
            .from("profiles")
            .select("id, first_name, last_name, role")
            .in("role", ["staff", "supervisor", "cashier"])
            .eq("access_status", "active")
            .order("last_name")
        : Promise.resolve(null);
    // Drives whether "Replace CCRO Administrator" replaces an incumbent or
    // appoints the first/a recovery administrator outright.
    const activeAdminPromise =
      category === "personnel"
        ? admin
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("role", "admin")
            .eq("access_status", "active")
        : Promise.resolve(null);
    const usersPromise = admin.auth.admin.listUsers({ page: 1, perPage: 1_000 });
    // Email and last sign-in live in auth, not profiles, so searching by
    // email or "never signed in" has to resolve matching ids from the auth
    // users first and hand them to the profiles query.
    const authUsers =
      data.q || data.signIn ? (await usersPromise).data.users : [];

    const categoryRoles = accountCategoryRoles[category];
    let profilesQuery = admin
      .from("profiles")
      .select(
        "id, first_name, middle_name, last_name, suffix, date_of_birth, sex, phone_number, role, access_status, suspension_reason, department_id, employment_type",
        { count: "exact" },
      )
      .in("role", categoryRoles);
    if (data.role && categoryRoles.includes(data.role)) {
      profilesQuery = profilesQuery.eq("role", data.role);
    }
    if (data.status) {
      profilesQuery = profilesQuery.eq("access_status", data.status);
    }
    if (data.departmentId) {
      profilesQuery = profilesQuery.eq("department_id", data.departmentId);
    }
    if (data.signIn === "never") {
      profilesQuery = profilesQuery.in(
        "id",
        authUsers.filter((user) => !user.last_sign_in_at).map((user) => user.id),
      );
    }
    // Every word must match the first name, last name, or email, so
    // "juan cruz" finds Juan Dela Cruz. Characters PostgREST treats as filter
    // syntax are stripped from the term before it is interpolated.
    for (const word of (data.q ?? "")
      .replace(/[,()%*\\"']/g, " ")
      .split(/\s+/)
      .filter(Boolean)) {
      const emailIds = authUsers
        .filter((user) => (user.email ?? "").toLowerCase().includes(word.toLowerCase()))
        .map((user) => user.id);
      profilesQuery = profilesQuery.or(
        [
          `first_name.ilike.%${word}%`,
          `last_name.ilike.%${word}%`,
          ...(emailIds.length ? [`id.in.(${emailIds.join(",")})`] : []),
        ].join(","),
      );
    }

    const [
      { data: profiles, error: profilesError, count },
      departmentsResult,
      candidatesResult,
      usersResult,
      activeAdminResult,
    ] = await Promise.all([
      profilesQuery
        .order("last_name", { ascending: true, nullsFirst: false })
        .order("first_name", { ascending: true, nullsFirst: false })
        .range(start, start + data.pageSize - 1),
      admin
        .from("departments")
        .select("id, name")
        .eq("is_active", true)
        .order("name"),
      candidatesPromise,
      usersPromise,
      activeAdminPromise,
    ]);
    if (profilesError) throw new Error(profilesError.message);
    if (usersResult.error) throw new Error(usersResult.error.message);

    const usersById = new Map(
      usersResult.data.users.map((user) => [user.id, user]),
    );
    const accounts: AccountSummary[] = (profiles ?? []).map((profile) => {
      const user = usersById.get(profile.id);
      if (!user) throw new Error(`Auth user ${profile.id} is missing.`);

      const invitePending =
        profile.role !== "applicant" &&
        Boolean(user.user_metadata?.invited_role) &&
        !user.user_metadata?.invitation_accepted_at;

      return {
        id: user.id,
        email: user.email ?? "",
        firstName:
          profile.first_name ?? String(user.user_metadata?.first_name ?? ""),
        middleName: profile.middle_name ?? "",
        lastName:
          profile.last_name ?? String(user.user_metadata?.last_name ?? ""),
        suffix: profile.suffix ?? "",
        dateOfBirth: profile.date_of_birth ?? "",
        sex: (profile.sex === "male" || profile.sex === "female"
          ? profile.sex
          : "") as AccountSex,
        phoneNumber: profile.phone_number ?? "",
        role: profile.role as Role,
        status: (profile.access_status ?? "active") as AccountStatus,
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at ?? null,
        suspensionReason: profile.suspension_reason ?? null,
        departmentId: profile.department_id ?? null,
        employmentType: (profile.employment_type ??
          "regular") as AccountEmploymentType,
        emailConfirmed: Boolean(user.email_confirmed_at),
        invitePending,
        invitedAt: invitePending ? user.created_at : null,
      };
    });

    if (departmentsResult.error) {
      throw new Error(departmentsResult.error.message);
    }
    if (candidatesResult?.error) {
      throw new Error(candidatesResult.error.message);
    }
    if (activeAdminResult?.error) {
      throw new Error(activeAdminResult.error.message);
    }
    const total = count ?? 0;
    return {
      accounts,
      adminCandidates: (candidatesResult?.data ?? []).map(
        (candidate): AdminCandidate => ({
          id: candidate.id,
          firstName: candidate.first_name ?? "",
          lastName: candidate.last_name ?? "",
          role: candidate.role as Role,
        }),
      ),
      departments: departmentsResult.data ?? [],
      hasActiveAdmin: (activeAdminResult?.count ?? 0) > 0,
      category,
      page: data.page,
      pageSize: data.pageSize,
      total,
      hasNextPage: data.page * data.pageSize < total,
    };
  });

export const suspendAccount = createServerFn({ method: "POST" })
  .validator(suspendSchema)
  .handler(async ({ data }) => {
    const session = await requireActiveSession("accounts:suspend");
    if (data.targetId === session.user.id) throw new Error("You cannot suspend your own account.");
    const admin = getSupabaseAdminClient();
    const { data: target, error: targetError } = await admin
      .from("profiles")
      .select("role, access_status")
      .eq("id", data.targetId)
      .single();
    if (targetError || !target) throw new Error("Account not found.");
    if (target.role === "system_admin") throw new Error("System Administrator accounts cannot be modified here.");
    if (target.access_status !== "active") throw new Error("This account is already inactive.");

    const now = new Date().toISOString();
    const { error: profileError } = await admin.from("profiles").update({
      access_status: "suspended",
      suspended_at: now,
      suspended_by: session.user.id,
      suspension_reason: data.reason,
    }).eq("id", data.targetId);
    if (profileError) throw new Error(profileError.message);

    const { error: banError } = await admin.auth.admin.updateUserById(data.targetId, {
      ban_duration: "876000h",
    });
    if (banError) {
      await admin.from("profiles").update({
        access_status: "active", suspended_at: null, suspended_by: null, suspension_reason: null,
      }).eq("id", data.targetId);
      throw new Error(banError.message);
    }
    // The ban stops token refresh; deleting the sessions also ends any that are
    // open right now. A failure here does not undo the suspension — the ban
    // already blocks the account — but it is recorded on the audit event.
    const sessionsRevoked = await revokeSessions(data.targetId);
    await writeAudit(session.user.id, "account_suspended", data.targetId, {
      reason: data.reason,
      sessions_revoked: String(sessionsRevoked),
    });
    return { success: true };
  });

export const reactivateAccount = createServerFn({ method: "POST" })
  .validator(accountActionSchema)
  .handler(async ({ data }) => {
    const session = await requireActiveSession("accounts:suspend");
    if (data.targetId === session.user.id) throw new Error("You cannot modify your own account.");
    const admin = getSupabaseAdminClient();
    const { data: target } = await admin.from("profiles").select("role, access_status").eq("id", data.targetId).single();
    if (!target) throw new Error("Account not found.");
    if (target.role === "system_admin") throw new Error("System Administrator accounts cannot be modified here.");

    const { error: banError } = await admin.auth.admin.updateUserById(data.targetId, { ban_duration: "none" });
    if (banError) throw new Error(banError.message);
    const { error } = await admin.from("profiles").update({
      access_status: "active", suspended_at: null, suspended_by: null, suspension_reason: null,
    }).eq("id", data.targetId);
    if (error) throw new Error(error.message);
    await writeAudit(session.user.id, "account_reactivated", data.targetId);
    return { success: true };
  });

export const updateAccountDetails = createServerFn({ method: "POST" })
  .validator(accountDetailsSchema)
  .handler(async ({ data }) => {
    const session = await requireActiveSession("accounts:edit_details");
    const admin = getSupabaseAdminClient();

    const { data: target, error: targetError } = await admin
      .from("profiles")
      .select("role")
      .eq("id", data.targetId)
      .single();
    if (targetError || !target) throw new Error("Account not found.");
    // Covers the editor's own account too: only system administrators hold
    // this permission, so self-edits always land on this branch.
    if (target.role === "system_admin") {
      throw new Error("System Administrator accounts cannot be modified here.");
    }
    // Citizens are fully self-service (their own profile edit and password
    // reset flows), so this dialog is personnel-only. Suspend/reactivate is
    // the only lever System Admin has over a citizen account.
    if (target.role === "applicant") {
      throw new Error("Citizen accounts can only be suspended or reactivated here.");
    }

    const { data: authUser, error: authUserError } =
      await admin.auth.admin.getUserById(data.targetId);
    if (authUserError || !authUser.user) {
      throw new Error("The sign-in record for this account is missing.");
    }

    const emailChanged =
      data.email !== (authUser.user.email ?? "").toLowerCase();

    // The email goes first: a duplicate is the likeliest failure here, and
    // rejecting it before the profile write keeps the account untouched.
    // Passwords are never set from here — use sendAccountPasswordReset so only
    // the account's owner ever knows it.
    if (emailChanged) {
      const { error: credentialError } = await admin.auth.admin.updateUserById(
        data.targetId,
        { email: data.email, email_confirm: true },
      );
      if (credentialError) {
        throw new Error(
          credentialError.message.toLowerCase().includes("already")
            ? "That email address is already used by another account."
            : errorMessage(credentialError, "The sign-in details could not be updated."),
        );
      }
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update({
        first_name: data.firstName,
        middle_name: data.middleName || null,
        last_name: data.lastName,
        suffix: data.suffix || null,
        date_of_birth: data.dateOfBirth || null,
        sex: data.sex || null,
        phone_number: data.phoneNumber || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.targetId);
    if (profileError) throw new Error(profileError.message);

    await writeAudit(session.user.id, "account_details_updated", data.targetId, {
      email_changed: String(emailChanged),
    });
    return { success: true };
  });

export const sendAccountPasswordReset = createServerFn({ method: "POST" })
  .validator(accountActionSchema)
  .handler(async ({ data }) => {
    const session = await requireActiveSession("accounts:edit_details");
    const admin = getSupabaseAdminClient();
    const target = await loadManageableTarget(admin, data.targetId, session.user.id);
    if (target.access_status !== "active") {
      throw new Error("Reactivate this account before sending a password reset link.");
    }

    const { data: authUser, error: authUserError } =
      await admin.auth.admin.getUserById(data.targetId);
    const user = authUser?.user;
    if (authUserError || !user?.email) {
      throw new Error("The sign-in record for this account is missing.");
    }
    if (user.user_metadata?.invited_role && !user.user_metadata?.invitation_accepted_at) {
      throw new Error(
        "This person has not accepted their invitation yet. The CCRO Administrator can resend it.",
      );
    }

    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({ type: "recovery", email: user.email });
    const hashedToken = linkData?.properties?.hashed_token;
    if (linkError || !hashedToken) {
      throw new Error(errorMessage(linkError, "The reset link could not be generated."));
    }

    await sendEmail({
      to: user.email,
      subject: "Reset your CiviCheck password",
      html: renderLinkEmail({
        preheader: "Choose a new password for your CiviCheck account.",
        label: "Password reset",
        heading: "Reset your password",
        greeting: target.first_name ? `Hello ${target.first_name},` : undefined,
        paragraphs: [
          "A CiviCheck system administrator sent you this link so you can choose a new password for your account.",
        ],
        actionLabel: "Choose a new password",
        actionUrl: buildAuthCallbackUrl(hashedToken, "recovery", "/reset-password"),
        noteLines: ["This link expires in 1 hour and can only be used once."],
        footerNote:
          "If you were not expecting this, you can ignore this email — your password stays the same.",
      }),
    });

    await writeAudit(session.user.id, "password_reset_sent", data.targetId);
    return { success: true };
  });

export const revokeAccountSessions = createServerFn({ method: "POST" })
  .validator(accountActionSchema)
  .handler(async ({ data }) => {
    const session = await requireActiveSession("accounts:suspend");
    const admin = getSupabaseAdminClient();
    await loadManageableTarget(admin, data.targetId, session.user.id);

    if (!(await revokeSessions(data.targetId))) {
      throw new Error("The sessions could not be revoked. Try again.");
    }
    await writeAudit(session.user.id, "sessions_revoked", data.targetId);
    return { success: true };
  });

export const resendAccountVerification = createServerFn({ method: "POST" })
  .validator(verificationSchema)
  .handler(async ({ data }) => {
    const session = await requireActiveSession("accounts:edit_details");
    const admin = getSupabaseAdminClient();
    const target = await loadManageableTarget(admin, data.targetId, session.user.id);
    if (target.access_status !== "active") {
      throw new Error("Reactivate this account before resending verification.");
    }

    const { data: authUser, error: authUserError } =
      await admin.auth.admin.getUserById(data.targetId);
    const user = authUser?.user;
    if (authUserError || !user) {
      throw new Error("The sign-in record for this account is missing.");
    }
    if (user.email_confirmed_at) {
      throw new Error("This email address is already verified.");
    }
    if (user.user_metadata?.invited_role) {
      throw new Error(
        "This is a pending staff invitation. The CCRO Administrator can resend it.",
      );
    }

    // Only an unverified address can be corrected here, so this can never move
    // a working account to a different mailbox.
    const emailChanged = data.email !== (user.email ?? "").toLowerCase();
    if (emailChanged) {
      const { error: emailError } = await admin.auth.admin.updateUserById(
        data.targetId,
        { email: data.email, email_confirm: false },
      );
      if (emailError) {
        throw new Error(
          emailError.message.toLowerCase().includes("already")
            ? "That email address is already used by another account."
            : errorMessage(emailError, "The email address could not be updated."),
        );
      }
    }

    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({ type: "magiclink", email: data.email });
    const hashedToken = linkData?.properties?.hashed_token;
    if (linkError || !hashedToken) {
      throw new Error(errorMessage(linkError, "The verification link could not be generated."));
    }

    await sendEmail({
      to: data.email,
      subject: "Verify your CiviCheck email address",
      html: renderLinkEmail({
        preheader: "Confirm your email address to finish setting up CiviCheck.",
        label: "Email verification",
        heading: "Verify your email address",
        greeting: target.first_name ? `Hello ${target.first_name},` : undefined,
        paragraphs: [
          "Confirm this email address to finish setting up your CiviCheck account.",
        ],
        actionLabel: "Verify my email",
        actionUrl: buildAuthCallbackUrl(hashedToken, "email"),
        noteLines: ["This link expires in 1 hour and can only be used once."],
        footerNote:
          "If you did not create a CiviCheck account, you can ignore this email.",
      }),
    });

    await writeAudit(session.user.id, "verification_resent", data.targetId, {
      email_changed: String(emailChanged),
    });
    return { success: true };
  });

export const getAccountHistory = createServerFn({ method: "GET" })
  .validator(accountActionSchema)
  .handler(async ({ data }): Promise<AccountHistoryEvent[]> => {
    await requireActiveSession("accounts:view_all");
    const admin = getSupabaseAdminClient();
    const [
      { data: events, error },
      { data: signIns, error: signInError },
    ] = await Promise.all([
      admin
        .from("system_audit_events")
        .select("id, event_type, actor_profile_id, metadata, created_at")
        .eq("target_profile_id", data.targetId)
        .order("created_at", { ascending: false })
        .limit(50),
      // Personnel sign-ins, so the timeline shows when the person used the
      // system alongside what administrators did to the account.
      admin
        .from("system_security_events")
        .select("id, event_type, summary, occurred_at, masked_ip_address, user_agent")
        .eq("actor_profile_id", data.targetId)
        .in("event_type", ["admin_session_started", "staff_session_started"])
        .order("occurred_at", { ascending: false })
        .limit(10),
    ]);
    if (error) throw new Error(error.message);
    if (signInError) throw new Error(signInError.message);

    const actorIds = [...new Set((events ?? []).map((event) => event.actor_profile_id))];
    const { data: actors } = actorIds.length
      ? await admin.from("profiles").select("id, first_name, last_name").in("id", actorIds)
      : { data: [] };
    const actorNames = new Map(
      (actors ?? []).map((actor) => [
        actor.id,
        `${actor.first_name ?? ""} ${actor.last_name ?? ""}`.trim() || actor.id,
      ]),
    );

    const adminEvents = (events ?? []).map((event): AccountHistoryEvent => {
      const reason = (event.metadata as Record<string, unknown> | null)?.reason;
      return {
        id: event.id,
        eventType: event.event_type,
        actor: actorNames.get(event.actor_profile_id) ?? event.actor_profile_id,
        timestamp: event.created_at,
        reason: typeof reason === "string" ? reason : null,
        detail: null,
      };
    });
    const signInEvents = (signIns ?? []).map((event): AccountHistoryEvent => ({
      id: event.id,
      eventType: "signed_in",
      actor: "The account holder",
      timestamp: event.occurred_at,
      reason: null,
      detail:
        [describeUserAgent(event.user_agent), event.masked_ip_address]
          .filter(Boolean)
          .join(" · ") || null,
    }));

    return [...adminEvents, ...signInEvents].sort((a, b) =>
      b.timestamp.localeCompare(a.timestamp),
    );
  });

export const replaceCcroAdmin = createServerFn({ method: "POST" })
  .validator(replacementSchema)
  .handler(async ({ data }) => {
    const { supabase } = await requireActiveSession("accounts:replace_admin");
    if (
      data.outgoingRole &&
      ["staff", "supervisor"].includes(data.outgoingRole) &&
      !data.outgoingDepartmentId
    ) {
      throw new Error("Select a department for the outgoing administrator.");
    }
    const { error } = await supabase.rpc("replace_ccro_admin", {
      candidate_id: data.candidateId,
      outgoing_role: data.outgoingRole ?? null,
      outgoing_department_id: data.outgoingDepartmentId ?? null,
    });
    if (error) throw new Error(error.message);
    return { success: true };
  });

/**
 * Rows fetched per source before merging. Each source is ordered newest-first
 * and filtered in the database, so this cap only trims the oldest rows of a
 * very broad query — never the most recent ones.
 */
const AUDIT_SOURCE_ROW_LIMIT = 1_000;

export const getAuditEvents = createServerFn({ method: "GET" })
  .validator(auditSchema)
  .handler(async ({ data }): Promise<{ events: NormalizedAuditEvent[]; total: number; filters: AuditFilters }> => {
    await requireActiveSession("audit:view");
    const admin = getSupabaseAdminClient();
    const fromBound = data.from ? `${data.from}T00:00:00` : null;
    const toBound = data.to ? `${data.to}T23:59:59.999` : null;
    const wants = (source: "system" | "request" | "sign-in") =>
      data.source === "all" || data.source === source;
    const empty = Promise.resolve({ data: [], error: null });

    let systemQuery = admin
      .from("system_audit_events")
      .select("id, event_type, actor_profile_id, target_profile_id, created_at, masked_ip_address, user_agent");
    let requestQuery = admin
      .from("application_logs")
      .select("id, request_id, performed_by_profile_id, action_status, created_at");
    let signInQuery = admin
      .from("system_security_events")
      .select("id, event_type, actor_profile_id, occurred_at, masked_ip_address, user_agent")
      .in("event_type", ["admin_session_started", "staff_session_started"]);
    if (fromBound) {
      systemQuery = systemQuery.gte("created_at", fromBound);
      requestQuery = requestQuery.gte("created_at", fromBound);
      signInQuery = signInQuery.gte("occurred_at", fromBound);
    }
    if (toBound) {
      systemQuery = systemQuery.lte("created_at", toBound);
      requestQuery = requestQuery.lte("created_at", toBound);
      signInQuery = signInQuery.lte("occurred_at", toBound);
    }
    if (data.account) {
      systemQuery = systemQuery.or(
        `actor_profile_id.eq.${data.account},target_profile_id.eq.${data.account}`,
      );
      requestQuery = requestQuery.eq("performed_by_profile_id", data.account);
      signInQuery = signInQuery.eq("actor_profile_id", data.account);
    }

    const [{ data: system, error: systemError }, { data: requests, error: requestError }, { data: signIns, error: signInError }, { data: profiles }] = await Promise.all([
      wants("system") ? systemQuery.order("created_at", { ascending: false }).limit(AUDIT_SOURCE_ROW_LIMIT) : empty,
      wants("request") ? requestQuery.order("created_at", { ascending: false }).limit(AUDIT_SOURCE_ROW_LIMIT) : empty,
      wants("sign-in") ? signInQuery.order("occurred_at", { ascending: false }).limit(AUDIT_SOURCE_ROW_LIMIT) : empty,
      admin.from("profiles").select("id, first_name, last_name"),
    ]);
    if (systemError) throw new Error(systemError.message);
    if (requestError) throw new Error(requestError.message);
    if (signInError) throw new Error(signInError.message);
    const actorNames = new Map((profiles ?? []).map((p) => [p.id, `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.id]));
    let events: NormalizedAuditEvent[] = [
      ...(system ?? []).map((e) => ({ id: e.id, source: "system" as const, eventType: e.event_type, actorId: e.actor_profile_id, actor: actorNames.get(e.actor_profile_id) ?? e.actor_profile_id, targetId: e.target_profile_id, requestId: null, timestamp: e.created_at, deviceLabel: describeUserAgent(e.user_agent), maskedIpAddress: e.masked_ip_address })),
      ...(requests ?? []).map((e) => ({ id: e.id, source: "request" as const, eventType: e.action_status, actorId: e.performed_by_profile_id, actor: actorNames.get(e.performed_by_profile_id) ?? e.performed_by_profile_id ?? "System", targetId: null, requestId: e.request_id, timestamp: e.created_at, deviceLabel: null, maskedIpAddress: null })),
      ...(signIns ?? []).map((e) => ({ id: e.id, source: "sign-in" as const, eventType: e.event_type, actorId: e.actor_profile_id, actor: (e.actor_profile_id && actorNames.get(e.actor_profile_id)) || "Unknown account", targetId: null, requestId: null, timestamp: e.occurred_at, deviceLabel: describeUserAgent(e.user_agent), maskedIpAddress: e.masked_ip_address })),
    ];
    const actor = data.actor?.toLowerCase();
    const event = data.event?.toLowerCase();
    events = events.filter((e) =>
      (!actor || e.actor.toLowerCase().includes(actor) || e.actorId?.toLowerCase().includes(actor)) &&
      (!event || e.eventType.toLowerCase().includes(event)) &&
      (!data.account || e.actorId === data.account || e.targetId === data.account)
    ).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    const total = events.length;
    const start = (data.page - 1) * data.pageSize;
    return { events: events.slice(start, start + data.pageSize), total, filters: data };
  });
