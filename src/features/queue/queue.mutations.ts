import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "~/utils/supabase";

export const bookAppointmentFn = createServerFn({ method: "POST" })
  .validator((d: { requestId: string; date: string; timeSlotId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: true, message: "Unauthorized: please log in again." };
    }

    const { data: slot, error: slotError } = await supabase
      .from("appointment_time_slots")
      .select("capacity")
      .eq("id", data.timeSlotId)
      .single();
    if (slotError || !slot) {
      return { error: true, message: "That slot no longer exists." };
    }

    if (slot.capacity != null) {
      const { count, error: countError } = await supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("appointment_date", data.date)
        .eq("time_slot_id", data.timeSlotId)
        .neq("appointment_status", "cancelled");
      if (countError) {
        return { error: true, message: countError.message };
      }
      if ((count ?? 0) >= slot.capacity) {
        return { error: true, message: "That slot just filled up. Please pick another." };
      }
    }

    const { error: insertError } = await supabase.from("appointments").insert({
      request_id: data.requestId,
      applicant_id: user.id,
      appointment_date: data.date,
      time_slot_id: data.timeSlotId,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        return { error: true, message: "This request already has a booked slot." };
      }
      return { error: true, message: insertError.message };
    }

    return { error: false };
  });

export const cancelAppointmentFn = createServerFn({ method: "POST" })
  .validator((d: { appointmentId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: true, message: "Unauthorized: please log in again." };
    }

    const { error } = await supabase
      .from("appointments")
      .update({ appointment_status: "cancelled" })
      .eq("id", data.appointmentId)
      .eq("applicant_id", user.id);

    if (error) return { error: true, message: error.message };
    return { error: false };
  });
