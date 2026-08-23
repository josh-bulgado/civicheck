import { createServerFn } from "@tanstack/react-start";
import { isDepartmentScopedRole } from "~/lib/permissions";
import { insertRequestWithTrackingNumber } from "~/features/requests/tracking-number";
import { flattenSubjects, type SubjectFields } from "~/lib/subject-fields";
import { requireActiveSession } from "~/server/auth";

export const encodeWalkInFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      serviceCode: string;
      subjects: SubjectFields[];
      purpose?: string;
      contactNumber?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { supabase, user, role, departmentId } = await requireActiveSession(
      "requests:encode_walkin",
    );

    const subjects = data.subjects.map((subject) => ({
      ...subject,
      firstName: subject.firstName.trim(),
      lastName: subject.lastName.trim(),
    }));
    if (subjects.length === 0 || subjects.some((s) => !s.firstName || !s.lastName)) {
      return { error: true, message: "Enter each person's first and last name." };
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
        ...flattenSubjects(subjects),
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
      applicantName: `${subjects[0].firstName} ${subjects[0].lastName}`,
    };
  });
