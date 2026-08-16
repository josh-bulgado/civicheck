import { createServerFn } from "@tanstack/react-start";
import { rbacMiddleware, requirePermission } from "~/middleware/auth";
import type {
  CreateServiceInput,
  UpdateServiceInput,
  CreateServiceRequirementInput,
  CreateServiceWithRequirementsInput,
  UpdateServiceWithRequirementsInput,
  UpdateServiceRequirementInput,
  Service,
  ServiceRequirement,
} from "./services.types";

/**
 * `service_code` is the primary key and is supplied by the admin, so a collision
 * is an expected user error rather than a bug. Postgres reports it as 23505 with
 * a raw constraint message — turn that into something a form can display.
 */
function describeInsertError(
  error: { code?: string; message: string },
  service_code: string
): string {
  if (error.code === "23505" || /duplicate key/i.test(error.message)) {
    return `A service with the code "${service_code}" already exists.`;
  }
  return error.message;
}

/**
 * Requirement rows use one of two linkage conventions in this database, and a
 * write must not silently convert between them:
 *
 *  - **Group-owned** — several services share one checklist (all six DCOLB
 *    services resolve to `birth_delayed`). Those rows carry the group and leave
 *    `service_code` null, because they belong to no single service.
 *  - **Service-owned** — the service has its own checklist, and the row carries
 *    both its `service_code` and a group equal to that code.
 */
function linkRequirements(
  requirements: Omit<CreateServiceRequirementInput, "service_code">[],
  service_code: string,
  requirementGroup: string | null | undefined
) {
  const groupKey = requirementGroup || service_code;
  const isGroupOwned = groupKey !== service_code;

  return requirements.map((requirement) => ({
    ...requirement,
    service_code: isGroupOwned ? null : service_code,
    requirement_group: requirement.requirement_group ?? groupKey,
    is_mandatory: requirement.is_mandatory ?? true,
  }));
}

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

/**
 * Create a service together with its full requirement checklist in one round trip.
 *
 * Requirements are tagged with `requirement_group` (falling back to the service's
 * own code) because the citizen-facing `getServiceDetail` resolves a checklist
 * *only* by `requirement_group` — requirements carrying just a `service_code`
 * would be invisible to applicants, which is the exact gap this system exists to
 * close.
 */
export const createServiceWithRequirements = createServerFn({ method: "POST" })
  .middleware([requirePermission("services:manage")])
  .validator((d: CreateServiceWithRequirementsInput) => d)
  .handler(async ({ data, context }) => {
    const { requirements, ...service } = data;

    const { data: created, error } = await context.supabase
      .from("services_registry")
      .insert({
        ...service,
        // NOT NULL with no DB default — never let it through as undefined.
        steps_description: service.steps_description ?? [],
      })
      .select()
      .single();

    if (error) throw new Error(describeInsertError(error, service.service_code));

    if (requirements.length > 0) {
      const { error: reqError } = await context.supabase
        .from("service_requirements_metadata")
        .insert(
          linkRequirements(
            requirements,
            created.service_code,
            service.requirement_group
          )
        );

      if (reqError) {
        // Roll the service row back so the admin can fix the checklist and retry
        // without the now-taken primary key blocking them.
        await context.supabase
          .from("services_registry")
          .delete()
          .eq("service_code", created.service_code);

        throw new Error(reqError.message);
      }
    }

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

/**
 * Update a service and replace its requirement checklist.
 *
 * The checklist is replaced wholesale rather than diffed row by row: nothing
 * references `service_requirements_metadata.id`, so the rows are safe to
 * recreate, and a replace keeps the saved state identical to what the admin saw
 * in the form.
 *
 * Note this edits the checklist for the whole `requirement_group`. Where several
 * services share a group, all of them are affected — the form warns before
 * saving, and `case_tag` is preserved so variant-specific rows survive.
 *
 * `service_code` is never updated: `requests.request_type` references it with
 * ON DELETE RESTRICT, so it is the stable identity of the service.
 */
export const updateServiceWithRequirements = createServerFn({ method: "POST" })
  .middleware([requirePermission("services:manage")])
  .validator((d: UpdateServiceWithRequirementsInput) => d)
  .handler(async ({ data: { service_code, updates, requirements }, context }) => {
    const { data: updated, error } = await context.supabase
      .from("services_registry")
      .update(updates)
      .eq("service_code", service_code)
      .select()
      .single();

    if (error) throw new Error(error.message);

    const groupKey = updated.requirement_group ?? updated.service_code;

    // Same predicate the form loaded with (see getServiceChecklist).
    const { error: deleteError } = await context.supabase
      .from("service_requirements_metadata")
      .delete()
      .or(`requirement_group.eq.${groupKey},service_code.eq.${service_code}`);

    if (deleteError) throw new Error(deleteError.message);

    if (requirements.length > 0) {
      const { error: insertError } = await context.supabase
        .from("service_requirements_metadata")
        .insert(
          linkRequirements(requirements, service_code, updated.requirement_group)
        );

      if (insertError) throw new Error(insertError.message);
    }

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
