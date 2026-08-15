import { createServerFn } from "@tanstack/react-start";
import { getSupabaseAdminClient } from "~/utils/supabase";

const NOT_FOUND_MESSAGE =
  "We couldn't find a request matching that tracking number and last name.";

export const trackRequestFn = createServerFn({ method: "POST" })
  .validator((d: { trackingNumber: string; lastName: string }) => d)
  .handler(async ({ data }) => {
    const trackingNumber = data.trackingNumber.trim().toUpperCase();
    const lastName = data.lastName.trim().toLowerCase();

    if (!trackingNumber || !lastName) {
      return { error: true, message: "Enter your tracking number and last name." };
    }

    // Public, unauthenticated lookup — intentionally crosses the normal
    // "applicants can only see their own requests" RLS boundary, so the
    // admin client is used deliberately here. The tracking number alone is
    // guessable at scale, so last name is required as a second factor and
    // both failure paths below return the exact same generic message —
    // never reveal whether the tracking number exists but the name didn't
    // match, only whether the lookup as a whole succeeded.
    const supabase = getSupabaseAdminClient();
    const { data: request, error } = await supabase
      .from("requests")
      .select(
        "tracking_number, request_type, status, payment_status, created_at, fees_due, form_data, services_registry(name)",
      )
      .eq("tracking_number", trackingNumber)
      .maybeSingle();

    if (error || !request) {
      return { error: true, message: NOT_FOUND_MESSAGE };
    }

    const formData = (request.form_data ?? {}) as Record<string, unknown>;
    const storedLastName = String(formData.subject_last_name ?? "").trim().toLowerCase();

    if (!storedLastName || storedLastName !== lastName) {
      return { error: true, message: NOT_FOUND_MESSAGE };
    }

    const service = request.services_registry as { name?: string } | { name?: string }[] | null;
    const serviceName = Array.isArray(service) ? service[0]?.name : service?.name;

    return {
      error: false,
      request: {
        trackingNumber: request.tracking_number,
        serviceName: serviceName || request.request_type,
        status: request.status,
        paymentStatus: request.payment_status,
        feesDue: request.fees_due,
        createdAt: request.created_at,
      },
    };
  });
