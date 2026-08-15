import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "~/utils/supabase";

export const submitRequestFn = createServerFn({ method: "POST" })
  .validator((d: { serviceCode: string; fee: number; formData: any }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: true, message: "Unauthorized: Please log in again." };
    }

    const { data: request, error } = await supabase.rpc("create_operational_request", {
      p_service_code: data.serviceCode,
      p_form_data: data.formData,
      p_source: "online",
      p_guest_name: null,
      p_guest_email: null,
      p_applicant_id: user.id,
    });
    if (error) return { error: true, message: error.message };
    return { error: false, trackingNumber: request.tracking_number };
  });
