import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseAdminClient } from "~/utils/supabase";
import { requireActiveSession } from "~/server/auth";
import {
  describeUserAgent,
  getRequestNetworkSignal,
} from "./network-signal.server";
import type {
  AccountCategory,
  AccountEmploymentType,
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
  // Blank means "keep the current password" — the field is only sent when the
  // administrator deliberately types a replacement.
  newPassword: z
    .string()
    .refine(
      (value) => value === "" || (value.length >= 8 && /\d/.test(value)),
      "The new password must be at least 8 characters and include a number.",
    ),
  role: z.enum([
    "applicant",
    "staff",
    "supervisor",
    "cashier",
    "admin",
  ]),
  departmentId: z.string().min(1).nullable(),
  employmentType: z.enum(["regular", "job_order", "contractual"]),
});
const replacementSchema = z.object({
  candidateId: z.string().uuid(),
  outgoingRole: z.enum(["staff", "supervisor", "cashier"]),
  outgoingDepartmentId: z.string().min(1).nullable().optional(),
});
const auditSchema = pageSchema.extend({
  actor: z.string().trim().max(100).optional(),
  event: z.string().trim().max(100).optional(),
  source: z.enum(["all", "system", "request"]).default("all"),
  from: z.string().optional(),
  to: z.string().optional(),
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
    const [
      { data: profiles, error: profilesError, count },
      departmentsResult,
      candidatesResult,
      usersResult,
    ] = await Promise.all([
      admin
        .from("profiles")
        .select(
          "id, first_name, middle_name, last_name, suffix, date_of_birth, sex, phone_number, role, access_status, suspension_reason, department_id, employment_type",
          { count: "exact" },
        )
        .in("role", accountCategoryRoles[category])
        .order("last_name", { ascending: true, nullsFirst: false })
        .order("first_name", { ascending: true, nullsFirst: false })
        .range(start, start + data.pageSize - 1),
      admin
        .from("departments")
        .select("id, name")
        .eq("is_active", true)
        .order("name"),
      candidatesPromise,
      admin.auth.admin.listUsers({ page: 1, perPage: 1_000 }),
    ]);
    if (profilesError) throw new Error(profilesError.message);
    if (usersResult.error) throw new Error(usersResult.error.message);

    const usersById = new Map(
      usersResult.data.users.map((user) => [user.id, user]),
    );
    const accounts: AccountSummary[] = (profiles ?? []).map((profile) => {
      const user = usersById.get(profile.id);
      if (!user) throw new Error(`Auth user ${profile.id} is missing.`);

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
      };
    });

    if (departmentsResult.error) {
      throw new Error(departmentsResult.error.message);
    }
    if (candidatesResult?.error) {
      throw new Error(candidatesResult.error.message);
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
    await writeAudit(session.user.id, "account_suspended", data.targetId, { reason: data.reason });
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

    // Only staff and supervisor are department-scoped; every other role is
    // cleared so a demoted account never keeps a stale department.
    const requiresDepartment =
      data.role === "staff" || data.role === "supervisor";
    const departmentId = requiresDepartment ? data.departmentId : null;
    if (requiresDepartment && !departmentId) {
      throw new Error("Select a department for this role.");
    }
    if (departmentId) {
      const { data: department } = await admin
        .from("departments")
        .select("id")
        .eq("id", departmentId)
        .eq("is_active", true)
        .single();
      if (!department) throw new Error("Select a valid active department.");
    }

    const { data: authUser, error: authUserError } =
      await admin.auth.admin.getUserById(data.targetId);
    if (authUserError || !authUser.user) {
      throw new Error("The sign-in record for this account is missing.");
    }

    const emailChanged =
      data.email !== (authUser.user.email ?? "").toLowerCase();
    const passwordChanged = data.newPassword !== "";

    // Credentials go first: a duplicate email is the likeliest failure here, and
    // rejecting it before the profile write keeps the account untouched.
    if (emailChanged || passwordChanged) {
      const { error: credentialError } = await admin.auth.admin.updateUserById(
        data.targetId,
        {
          ...(emailChanged ? { email: data.email, email_confirm: true } : {}),
          ...(passwordChanged ? { password: data.newPassword } : {}),
        },
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
        role: data.role,
        department_id: departmentId,
        // Applicants are residents, not personnel, so they carry no employment
        // type — the column is nullable precisely for them.
        employment_type: data.role === "applicant" ? null : data.employmentType,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.targetId);
    if (profileError) {
      // profiles_one_active_ccro_admin_idx allows a single active `admin` row.
      throw new Error(
        profileError.code === "23505"
          ? "There is already an active CCRO Administrator. Use Replace CCRO Administrator to hand the role over."
          : profileError.message,
      );
    }

    await writeAudit(session.user.id, "account_details_updated", data.targetId, {
      email_changed: String(emailChanged),
      password_reset: String(passwordChanged),
      role_from: target.role as string,
      role_to: data.role,
    });
    return { success: true };
  });

export const replaceCcroAdmin = createServerFn({ method: "POST" })
  .validator(replacementSchema)
  .handler(async ({ data }) => {
    const { supabase } = await requireActiveSession("accounts:replace_admin");
    if (["staff", "supervisor"].includes(data.outgoingRole) && !data.outgoingDepartmentId) {
      throw new Error("Select a department for the outgoing administrator.");
    }
    const { error } = await supabase.rpc("replace_ccro_admin", {
      candidate_id: data.candidateId,
      outgoing_role: data.outgoingRole,
      outgoing_department_id: data.outgoingDepartmentId ?? null,
    });
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const getAuditEvents = createServerFn({ method: "GET" })
  .validator(auditSchema)
  .handler(async ({ data }): Promise<{ events: NormalizedAuditEvent[]; total: number; filters: AuditFilters }> => {
    await requireActiveSession("audit:view");
    const admin = getSupabaseAdminClient();
    const [{ data: system, error: systemError }, { data: requests, error: requestError }, { data: profiles }] = await Promise.all([
      admin.from("system_audit_events").select("id, event_type, actor_profile_id, target_profile_id, created_at, masked_ip_address, user_agent"),
      admin.from("application_logs").select("id, request_id, performed_by_profile_id, action_status, created_at"),
      admin.from("profiles").select("id, first_name, last_name"),
    ]);
    if (systemError) throw new Error(systemError.message);
    if (requestError) throw new Error(requestError.message);
    const actorNames = new Map((profiles ?? []).map((p) => [p.id, `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.id]));
    let events: NormalizedAuditEvent[] = [
      ...(system ?? []).map((e) => ({ id: e.id, source: "system" as const, eventType: e.event_type, actorId: e.actor_profile_id, actor: actorNames.get(e.actor_profile_id) ?? e.actor_profile_id, targetId: e.target_profile_id, requestId: null, timestamp: e.created_at, deviceLabel: describeUserAgent(e.user_agent), maskedIpAddress: e.masked_ip_address })),
      ...(requests ?? []).map((e) => ({ id: e.id, source: "request" as const, eventType: e.action_status, actorId: e.performed_by_profile_id, actor: actorNames.get(e.performed_by_profile_id) ?? e.performed_by_profile_id ?? "System", targetId: null, requestId: e.request_id, timestamp: e.created_at, deviceLabel: null, maskedIpAddress: null })),
    ];
    const actor = data.actor?.toLowerCase();
    const event = data.event?.toLowerCase();
    events = events.filter((e) =>
      (data.source === "all" || e.source === data.source) &&
      (!actor || e.actor.toLowerCase().includes(actor) || e.actorId?.toLowerCase().includes(actor)) &&
      (!event || e.eventType.toLowerCase().includes(event)) &&
      (!data.from || e.timestamp >= `${data.from}T00:00:00`) &&
      (!data.to || e.timestamp <= `${data.to}T23:59:59.999`)
    ).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    const total = events.length;
    const start = (data.page - 1) * data.pageSize;
    return { events: events.slice(start, start + data.pageSize), total, filters: data };
  });
