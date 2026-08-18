import { createServerFn } from "@tanstack/react-start";
import { isDepartmentScopedRole } from "~/lib/permissions";
import { insertRequestWithTrackingNumber } from "~/features/requests/tracking-number";
import { requireActiveSession } from "~/server/auth";

export const encodeWalkInFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      serviceCode: string;
      subjectFirstName: string;
      subjectLastName: string;
      purpose?: string;
      contactNumber?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { supabase, user, role, departmentId } = await requireActiveSession(
      "requests:encode_walkin",
    );

    const firstName = data.subjectFirstName.trim();
    const lastName = data.subjectLastName.trim();
    if (!firstName || !lastName) {
      return { error: true, message: "Enter the applicant's first and last name." };
    }

    const { data: service, error: serviceError } = await supabase
      .from("services_registry")
      .select("service_code, fee, department_id")
      .eq("service_code", data.serviceCode)
      .maybeSingle();

    if (serviceError) return { error: true, message: serviceError.message };
    if (!service) return { error: true, message: "Pick a valid service." };
    if (
      isDepartmentScopedRole(role) &&
      (!departmentId || service.department_id !== departmentId)
    ) {
      return { error: true, message: "Pick a service assigned to your department." };
    }

    const created = await insertRequestWithTrackingNumber(supabase, {
      applicant_id: null,
      request_type: service.service_code,
      fees_due: Number(service.fee ?? 0),
      form_data: {
        subject_first_name: firstName,
        subject_last_name: lastName,
        purpose: data.purpose?.trim() || null,
        contact_number: data.contactNumber?.trim() || null,
        encoded_by: user.id,
        intake_channel: "walk_in",
      },
    });

    if (created.error) return { error: true, message: created.message };

    const { error: logError } = await supabase.from("application_logs").insert({
      request_id: created.requestId,
      performed_by_profile_id: user.id,
      action_status: "submitted",
      remarks: "Walk-in encoded by department staff.",
    });
    if (logError) console.error("Failed to write walk-in audit log", logError);

    return {
      error: false,
      requestId: created.requestId,
      trackingNumber: created.trackingNumber,
      applicantName: `${firstName} ${lastName}`,
    };
  });
