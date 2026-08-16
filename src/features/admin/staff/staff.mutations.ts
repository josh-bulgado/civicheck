import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseAdminClient } from "~/utils/supabase";
import type { Permission, Role } from "~/lib/permissions";
import { requireActiveSession } from "~/server/auth";
import type {
  InviteStaffInput,
  StaffActionResult,
  UpdateStaffAccessInput,
} from "./staff.types";
import { sendEmail } from "~/utils/resend";
import { getRequestNetworkSignal } from "~/features/system-admin/network-signal.server";

const INVITABLE_ROLES: Role[] = ["frontdesk", "staff", "supervisor", "cashier"];
const staffInvitationActionSchema = z.object({
  staffId: z.string().uuid(),
});
const updateStaffAccessSchema = z.object({
  staffId: z.string().uuid(),
  role: z.enum(["frontdesk", "staff", "supervisor", "cashier"]),
  departmentId: z.string().uuid().nullable().optional(),
  employmentType: z.enum(["regular", "job_order", "contractual"]),
}) satisfies z.ZodType<UpdateStaffAccessInput>;

function readableSupabaseError(
  error: { message?: string; code?: string } | null | undefined,
  fallback: string,
) {
  const message = error?.message?.trim();
  if (!message || message === "{}") return fallback;
  return error?.code ? `${message} (${error.code})` : message;
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] ?? character,
  );
}

async function authorizeStaffManager(permission: Permission) {
  try {
    const session = await requireActiveSession(permission);
    return {
      error: false as const,
      actorId: session.user.id,
      adminSupabase: getSupabaseAdminClient(),
    };
  } catch {
    return {
      error: true as const,
      message: "Only the active CCRO Administrator can perform this action.",
    };
  }
}

async function appendStaffAudit(
  adminSupabase: ReturnType<typeof getSupabaseAdminClient>,
  actorId: string,
  eventType: string,
  targetId: string,
  metadata: Record<string, string> = {},
) {
  const { maskedIpAddress, userAgent } = getRequestNetworkSignal();
  const { error } = await adminSupabase.from("system_audit_events").insert({
    event_type: eventType,
    actor_profile_id: actorId,
    target_profile_id: targetId,
    metadata,
    masked_ip_address: maskedIpAddress,
    user_agent: userAgent,
  });
  if (error) throw new Error(`Audit event could not be recorded: ${error.message}`);
}

async function sendStaffInvitationEmail({
  email,
  firstName,
  role,
  adminSupabase,
}: {
  email: string;
  firstName: string;
  role: Role;
  adminSupabase: ReturnType<typeof getSupabaseAdminClient>;
}) {
  const { data: linkData, error: linkError } =
    await adminSupabase.auth.admin.generateLink({
      type: "invite",
      email,
    });
  const hashedToken = linkData?.properties?.hashed_token;

  if (linkError || !hashedToken) {
    throw new Error(
      readableSupabaseError(
        linkError,
        "The invitation link could not be generated.",
      ),
    );
  }

  const invitationUrl = new URL(
    "/auth/callback",
    process.env.APP_URL || "http://localhost:3000",
  );
  invitationUrl.searchParams.set("token_hash", hashedToken);
  invitationUrl.searchParams.set("type", "invite");
  invitationUrl.searchParams.set("next", "/accept-invitation");

  await sendEmail({
    to: email,
    subject: "You are invited to CiviCheck",
    html: `<div style="font-family:'Public Sans',Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #DCE2EA;border-radius:8px;color:#17212B"><h2 style="color:#0049A8">Welcome to CiviCheck</h2><p>Hello ${escapeHtml(firstName)},</p><p>You have been invited to join the CiviCheck staff team as a ${escapeHtml(role)}.</p><p style="margin:30px 0"><a href="${invitationUrl.toString()}" style="background:#0049A8;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:600">Accept invitation</a></p><p style="color:#5D6876;font-size:14px">This invitation link will let you set your password and finish your account setup.</p></div>`,
  });
}

export const inviteStaff = createServerFn({ method: "POST" })
  .validator((d: InviteStaffInput) => d)
  .handler(async ({ data }) => {
    const authorization = await authorizeStaffManager("users:invite_staff");
    if (authorization.error) return authorization;
    const { adminSupabase, actorId } = authorization;

    const email = data.email.trim().toLowerCase();

    if (!email || !email.includes("@") || !INVITABLE_ROLES.includes(data.role))
      return {
        error: true,
        message: "Enter a valid email address and staff role.",
      };

    const requiresDepartment =
      data.role === "staff" || data.role === "supervisor";
    const departmentId = requiresDepartment ? data.departmentId || null : null;

    if (requiresDepartment && !departmentId)
      return { error: true, message: "Select a department for this role." };

    if (departmentId) {
      const { data: department } = await adminSupabase
        .from("departments")
        .select("id")
        .eq("id", departmentId)
        .eq("is_active", true)
        .single();
      if (!department)
        return { error: true, message: "Select a valid active department." };
    }

    const { data: invited, error } = await adminSupabase.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: {
        first_name: data.firstName.trim(),
        last_name: data.lastName.trim(),
        invited_role: data.role,
      },
    });

    if (error || !invited.user)
      return {
        error: true,
        message: /already|exists|registered/i.test(error?.message || "")
          ? "This email already has an account or pending invitation."
          : readableSupabaseError(
              error,
              "The staff account could not be created.",
            ),
      };

    const { error: profileError } = await adminSupabase
      .from("profiles")
      .upsert({
        id: invited.user.id,
        first_name: data.firstName.trim(),
        last_name: data.lastName.trim(),
        role: data.role,
        department_id: departmentId,
        employment_type: data.employmentType,
      });

    if (profileError) {
      await adminSupabase.auth.admin.deleteUser(invited.user.id);
      return {
        error: true,
        message: `The invitation could not be prepared: ${readableSupabaseError(profileError, "Supabase rejected the staff profile update.")}`,
      };
    }

    try {
      await sendStaffInvitationEmail({
        email,
        firstName: data.firstName.trim(),
        role: data.role,
        adminSupabase,
      });
      await appendStaffAudit(adminSupabase, actorId, "staff_invited", invited.user.id, { role: data.role });
    } catch (emailError) {
      await adminSupabase.auth.admin.deleteUser(invited.user.id);
      return {
        error: true,
        message:
          emailError instanceof Error
            ? emailError.message
            : "The invitation email could not be sent.",
      };
    }

    return { error: false, message: "Invitation sent." };
  });

export const resendStaffInvitation = createServerFn({ method: "POST" })
  .validator(staffInvitationActionSchema)
  .handler(async ({ data }) => {
    const authorization = await authorizeStaffManager("users:invite_staff");
    if (authorization.error) return authorization;

    const { adminSupabase, actorId } = authorization;
    const { data: userData, error: userError } =
      await adminSupabase.auth.admin.getUserById(data.staffId);
    const user = userData.user;

    if (userError || !user?.email) {
      return {
        error: true,
        message: readableSupabaseError(
          userError,
          "The pending staff account could not be found.",
        ),
      };
    }

    if (user.email_confirmed_at) {
      return {
        error: true,
        message: "This staff member has already accepted the invitation.",
      };
    }

    const { data: profile, error: profileError } = await adminSupabase
      .from("profiles")
      .select("first_name, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || !INVITABLE_ROLES.includes(profile.role as Role)) {
      return {
        error: true,
        message: readableSupabaseError(
          profileError,
          "The pending staff profile could not be found.",
        ),
      };
    }

    try {
      await sendStaffInvitationEmail({
        email: user.email,
        firstName: profile.first_name || "there",
        role: profile.role as Role,
        adminSupabase,
      });
      await appendStaffAudit(adminSupabase, actorId, "invitation_resent", user.id);
    } catch (error) {
      return {
        error: true,
        message:
          error instanceof Error
            ? error.message
            : "The invitation could not be resent.",
      };
    }

    return { error: false, message: "Invitation resent." };
  });

export const cancelStaffInvitation = createServerFn({ method: "POST" })
  .validator(staffInvitationActionSchema)
  .handler(async ({ data }) => {
    const authorization = await authorizeStaffManager("users:invite_staff");
    if (authorization.error) return authorization;

    const { adminSupabase, actorId } = authorization;
    const { data: userData, error: userError } =
      await adminSupabase.auth.admin.getUserById(data.staffId);
    const user = userData.user;

    if (userError || !user) {
      return {
        error: true,
        message: readableSupabaseError(
          userError,
          "The pending staff account could not be found.",
        ),
      };
    }

    if (user.email_confirmed_at) {
      return {
        error: true,
        message: "Accepted staff accounts cannot be cancelled as invitations.",
      };
    }

    const { data: profile, error: profileError } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !profile ||
      !INVITABLE_ROLES.includes(profile.role as Role)
    ) {
      return {
        error: true,
        message: readableSupabaseError(
          profileError,
          "The pending staff profile could not be found.",
        ),
      };
    }

    await appendStaffAudit(adminSupabase, actorId, "invitation_cancelled", user.id);
    const { error } = await adminSupabase.auth.admin.deleteUser(user.id);
    if (error) {
      return {
        error: true,
        message: readableSupabaseError(
          error,
          "The invitation could not be cancelled.",
        ),
      };
    }

    return { error: false, message: "Invitation cancelled." };
  });

export const updateStaffAccess = createServerFn({ method: "POST" })
  .validator(updateStaffAccessSchema)
  .handler(async ({ data }): Promise<StaffActionResult> => {
    const authorization = await authorizeStaffManager("users:update_operational_roles");
    if (authorization.error) return authorization;

    const { adminSupabase, actorId } = authorization;
    const { data: currentProfile, error: profileError } = await adminSupabase
      .from("profiles")
      .select("role, access_status")
      .eq("id", data.staffId)
      .single();

    if (
      profileError ||
      !currentProfile ||
      !INVITABLE_ROLES.includes(currentProfile.role as Role) ||
      currentProfile.access_status !== "active"
    ) {
      return {
        error: true,
        message: readableSupabaseError(
          profileError,
          "The staff profile could not be found.",
        ),
      };
    }

    const requiresDepartment =
      data.role === "staff" || data.role === "supervisor";
    const departmentId = requiresDepartment ? data.departmentId || null : null;

    if (requiresDepartment && !departmentId) {
      return {
        error: true,
        message: "Select a department for this role.",
      };
    }

    if (departmentId) {
      const { data: department } = await adminSupabase
        .from("departments")
        .select("id")
        .eq("id", departmentId)
        .eq("is_active", true)
        .single();

      if (!department) {
        return {
          error: true,
          message: "Select a valid active department.",
        };
      }
    }

    const { error } = await adminSupabase
      .from("profiles")
      .update({
        role: data.role,
        department_id: departmentId,
        employment_type: data.employmentType,
      })
      .eq("id", data.staffId);

    if (error) {
      return {
        error: true,
        message: readableSupabaseError(
          error,
          "The staff access could not be updated.",
        ),
      };
    }

    await appendStaffAudit(adminSupabase, actorId, "role_changed", data.staffId, {
      from: currentProfile.role,
      to: data.role,
    });

    return { error: false, message: "Staff access updated." };
  });

export const deactivateStaffMember = createServerFn({ method: "POST" })
  .validator(staffInvitationActionSchema)
  .handler(async ({ data }): Promise<StaffActionResult> => {
    const authorization = await authorizeStaffManager("users:deactivate_staff");
    if (authorization.error) return authorization;

    const { adminSupabase, actorId } = authorization;
    const [userResult, profileResult] = await Promise.all([
      adminSupabase.auth.admin.getUserById(data.staffId),
      adminSupabase
        .from("profiles")
        .select("role, access_status")
        .eq("id", data.staffId)
        .single(),
    ]);
    const user = userResult.data.user;
    const profile = profileResult.data;

    if (userResult.error || !user) {
      return {
        error: true,
        message: readableSupabaseError(
          userResult.error,
          "The staff account could not be found.",
        ),
      };
    }

    if (
      profileResult.error ||
      !profile ||
      !INVITABLE_ROLES.includes(profile.role as Role)
    ) {
      return {
        error: true,
        message: readableSupabaseError(
          profileResult.error,
          "This account cannot be deactivated from staff management.",
        ),
      };
    }

    if (!user.email_confirmed_at) {
      return {
        error: true,
        message: "Cancel this pending invitation instead.",
      };
    }

    if (profile.access_status !== "active") {
      return { error: true, message: "This staff member is already inactive." };
    }
    const reason = "Deactivated by the CCRO Administrator.";
    const { error: profileUpdateError } = await adminSupabase.from("profiles").update({
      access_status: "deactivated",
      suspended_at: new Date().toISOString(),
      suspended_by: actorId,
      suspension_reason: reason,
    }).eq("id", user.id);
    if (profileUpdateError) {
      return {
        error: true,
        message: readableSupabaseError(
          profileUpdateError,
          "The staff member could not be deactivated.",
        ),
      };
    }

    const { error: banError } = await adminSupabase.auth.admin.updateUserById(user.id, { ban_duration: "876000h" });
    if (banError) {
      await adminSupabase.from("profiles").update({ access_status: "active", suspended_at: null, suspended_by: null, suspension_reason: null }).eq("id", user.id);
      return { error: true, message: readableSupabaseError(banError, "The staff member could not be deactivated.") };
    }
    await appendStaffAudit(adminSupabase, actorId, "staff_deactivated", user.id);

    return { error: false, message: "Staff member deactivated." };
  });

export const reactivateStaffMember = createServerFn({ method: "POST" })
  .validator(staffInvitationActionSchema)
  .handler(async ({ data }): Promise<StaffActionResult> => {
    const authorization = await authorizeStaffManager("users:deactivate_staff");
    if (authorization.error) return authorization;
    const { adminSupabase, actorId } = authorization;
    const { data: profile } = await adminSupabase.from("profiles").select("role, access_status").eq("id", data.staffId).single();
    if (
      !profile ||
      !INVITABLE_ROLES.includes(profile.role as Role) ||
      profile.access_status !== "deactivated"
    ) {
      return { error: true, message: "This account cannot be reactivated from staff management." };
    }
    const { error: banError } = await adminSupabase.auth.admin.updateUserById(data.staffId, { ban_duration: "none" });
    if (banError) return { error: true, message: readableSupabaseError(banError, "The staff member could not be reactivated.") };
    const { error } = await adminSupabase.from("profiles").update({ access_status: "active", suspended_at: null, suspended_by: null, suspension_reason: null }).eq("id", data.staffId);
    if (error) return { error: true, message: readableSupabaseError(error, "The staff member could not be reactivated.") };
    await appendStaffAudit(adminSupabase, actorId, "staff_reactivated", data.staffId);

    return { error: false, message: "Staff member reactivated." };
  });
