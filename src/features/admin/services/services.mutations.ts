import { createServerFn } from "@tanstack/react-start";
import { rbacMiddleware, requirePermission } from "~/middleware/auth";
import type {
  CreateServiceInput,
  UpdateServiceInput,
  CreateServiceRequirementInput,
  UpdateServiceRequirementInput,
  Service,
  ServiceRequirement,
} from "./services.types";

// ─── services_registry mutations ─────────────────────────────────────────────

export const createService = createServerFn({ method: "POST" })
  .middleware([requirePermission("services:manage")])
  .validator((d: CreateServiceInput) => d)
  .handler(async ({ data, context }) => {
    const { data: created, error } = await context.supabase
      .from("services_registry")
      .insert(data)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return created as Service;
  });

export const updateService = createServerFn({ method: "POST" })
  .middleware([requirePermission("services:manage")])
  .validator((d: { service_code: string; updates: UpdateServiceInput }) => d)
  .handler(async ({ data: { service_code, updates }, context }) => {
    const { data: updated, error } = await context.supabase
      .from("services_registry")
      .update(updates)
      .eq("service_code", service_code)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return updated as Service;
  });

export const deleteService = createServerFn({ method: "POST" })
  .middleware([requirePermission("services:manage")])
  .validator((d: string) => d)
  .handler(async ({ data: service_code, context }) => {
    const { error } = await context.supabase
      .from("services_registry")
      .delete()
      .eq("service_code", service_code);

    if (error) throw new Error(error.message);
    return { success: true, service_code };
  });

// ─── service_requirements_metadata mutations ─────────────────────────────────

export const createServiceRequirement = createServerFn({ method: "POST" })
  .middleware([requirePermission("services:manage")])
  .validator((d: CreateServiceRequirementInput) => d)
  .handler(async ({ data, context }) => {
    const { data: created, error } = await context.supabase
      .from("service_requirements_metadata")
      .insert({
        ...data,
        is_mandatory: data.is_mandatory ?? true,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return created as ServiceRequirement;
  });

export const updateServiceRequirement = createServerFn({ method: "POST" })
  .middleware([requirePermission("services:manage")])
  .validator((d: { id: string; updates: UpdateServiceRequirementInput }) => d)
  .handler(async ({ data: { id, updates }, context }) => {
    const { data: updated, error } = await context.supabase
      .from("service_requirements_metadata")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return updated as ServiceRequirement;
  });

export const deleteServiceRequirement = createServerFn({ method: "POST" })
  .middleware([requirePermission("services:manage")])
  .validator((d: string) => d)
  .handler(async ({ data: id, context }) => {
    const { error } = await context.supabase
      .from("service_requirements_metadata")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);
    return { success: true, id };
  });

export const deleteServiceRequirementsByServiceCode = createServerFn({ method: "POST" })
  .middleware([requirePermission("services:manage")])
  .validator((d: string) => d)
  .handler(async ({ data: service_code, context }) => {
    const { error } = await context.supabase
      .from("service_requirements_metadata")
      .delete()
      .eq("service_code", service_code);

    if (error) throw new Error(error.message);
    return { success: true, service_code };
  });
