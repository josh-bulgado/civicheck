import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requirePermission } from "~/middleware/auth";
import { invalidateServiceCatalogue } from "~/features/services/services.catalogue";
import {
  definitionUsesBlock,
  replaceBlock,
} from "./form-field-block.utils";
import {
  formFieldBlockFieldSchema,
  formFieldBlockSchema,
  formTemplateDefinitionSchema,
  type FormFieldBlock,
  type FormTemplateDefinition,
} from "./form-template.types";

// ─── Shared form-field blocks (admin) ────────────────────────────────────────
// A block is edited once and copied into every template that includes it. The
// copy happens at publish time: saving a block computes the next definition of
// each affected template here, validates every one of them, and only then hands
// them to `save_form_field_block`, which upserts the block and publishes all the
// new template versions in a single transaction. Nothing is resolved at read
// time, so published versions — and the requests pinned to them — never change.

export interface FormFieldBlockUsage {
  templateId: string;
  templateKey: string;
  templateName: string;
  serviceCodes: string[];
}

export interface FormFieldBlockRecord extends FormFieldBlock {
  id: string;
  version: number;
  updatedAt: string;
}

export interface FormFieldBlockWithUsage {
  block: FormFieldBlockRecord;
  usage: FormFieldBlockUsage[];
}

interface ActiveTemplate {
  templateId: string;
  templateKey: string;
  templateName: string;
  activeVersionId: string;
  definition: FormTemplateDefinition;
  serviceCodes: string[];
}

/** All the shared helpers need of a Supabase client. */
type SupabaseLike = Pick<SupabaseClient, "from">;

// What each query's `select` returns. The client is not generated from the
// schema, so these state each row's shape where it is read.

/** A `form_field_blocks` row, `select("*")`. */
interface FormFieldBlockRow {
  id: string;
  block_key: string;
  name: string;
  description: string | null;
  step: FormFieldBlock["step"];
  fields: unknown;
  version: number;
  updated_at: string;
}

interface TemplateRow {
  id: string;
  template_key: string;
  name: string;
  active_version_id: string | null;
}

interface VersionRow {
  id: string;
  definition: unknown;
}

interface BindingRow {
  service_code: string;
  template_id: string;
}

function toBlockRecord(row: FormFieldBlockRow): FormFieldBlockRecord {
  const fields = z.array(formFieldBlockFieldSchema).parse(row.fields ?? []);
  return {
    id: row.id,
    blockKey: row.block_key,
    name: row.name,
    description: row.description ?? undefined,
    step: row.step,
    fields,
    version: row.version,
    updatedAt: row.updated_at,
  };
}

/** Every template's active definition plus the services bound to it. */
async function loadActiveTemplates(
  supabase: SupabaseLike,
): Promise<ActiveTemplate[]> {
  const [templatesResult, bindingsResult] = await Promise.all([
    supabase
      .from("form_templates")
      .select("id, template_key, name, active_version_id"),
    supabase.from("service_form_templates").select("service_code, template_id"),
  ]);
  if (templatesResult.error) throw new Error(templatesResult.error.message);
  if (bindingsResult.error) throw new Error(bindingsResult.error.message);

  const templates = ((templatesResult.data ?? []) as TemplateRow[]).filter(
    (template): template is TemplateRow & { active_version_id: string } =>
      Boolean(template.active_version_id),
  );
  if (templates.length === 0) return [];

  const versionsResult = await supabase
    .from("form_template_versions")
    .select("id, definition")
    .in(
      "id",
      templates.map((template) => template.active_version_id),
    );
  if (versionsResult.error) throw new Error(versionsResult.error.message);

  const definitionByVersion = new Map<string, unknown>(
    ((versionsResult.data ?? []) as VersionRow[]).map((version) => [
      version.id,
      version.definition,
    ]),
  );
  const codesByTemplate = new Map<string, string[]>();
  for (const binding of (bindingsResult.data ?? []) as BindingRow[]) {
    const bucket = codesByTemplate.get(binding.template_id) ?? [];
    bucket.push(binding.service_code);
    codesByTemplate.set(binding.template_id, bucket);
  }

  const active: ActiveTemplate[] = [];
  for (const template of templates) {
    const parsed = formTemplateDefinitionSchema.safeParse(
      definitionByVersion.get(template.active_version_id),
    );
    // A malformed admin-authored definition is reported by the template
    // editor; it must not take the whole blocks page down.
    if (!parsed.success) continue;
    active.push({
      templateId: template.id,
      templateKey: template.template_key,
      templateName: template.name,
      activeVersionId: template.active_version_id,
      definition: parsed.data,
      serviceCodes: (codesByTemplate.get(template.id) ?? []).sort(),
    });
  }
  return active.sort((a, b) => a.templateKey.localeCompare(b.templateKey));
}

function usageFor(
  templates: ActiveTemplate[],
  blockKey: string,
): FormFieldBlockUsage[] {
  return templates
    .filter((template) => definitionUsesBlock(template.definition, blockKey))
    .map((template) => ({
      templateId: template.templateId,
      templateKey: template.templateKey,
      templateName: template.templateName,
      serviceCodes: template.serviceCodes,
    }));
}

export const listFormFieldBlocksFn = createServerFn({ method: "GET" })
  .middleware([requirePermission("services:manage")])
  .handler(async ({ context }): Promise<FormFieldBlockWithUsage[]> => {
    const { data, error } = await context.supabase
      .from("form_field_blocks")
      .select("*")
      .order("name", { ascending: true });
    if (error) {
      // The blocks migration may not be applied yet in a local environment.
      if (error.code === "42P01" || error.code === "PGRST205") return [];
      throw new Error(error.message);
    }

    const templates = await loadActiveTemplates(context.supabase);
    return ((data ?? []) as FormFieldBlockRow[]).map((row) => {
      const block = toBlockRecord(row);
      return { block, usage: usageFor(templates, block.blockKey) };
    });
  });

const saveBlockSchema = z.object({
  block: formFieldBlockSchema,
  /** `version` of the block as the editor loaded it; omit when creating. */
  expectedVersion: z.number().int().positive().optional(),
});

/**
 * Create or update a block and republish every template that includes it.
 * Either everything is saved or nothing is.
 */
export const saveFormFieldBlockFn = createServerFn({ method: "POST" })
  .middleware([requirePermission("services:manage")])
  .validator(saveBlockSchema)
  .handler(async ({ data, context }) => {
    const { block, expectedVersion } = data;

    const { data: existing, error: existingError } = await context.supabase
      .from("form_field_blocks")
      .select("id, step, version")
      .eq("block_key", block.blockKey)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (!existing && expectedVersion !== undefined) {
      throw new Error("This shared block no longer exists. Reload the page.");
    }

    const templates = await loadActiveTemplates(context.supabase);
    const affected = templates.filter((template) =>
      definitionUsesBlock(template.definition, block.blockKey),
    );

    if (existing && existing.step !== block.step && affected.length > 0) {
      throw new Error(
        "A block that forms already use cannot move to a different step.",
      );
    }

    // Build and validate every resulting definition BEFORE writing anything,
    // so one template that can't take the change refuses the whole update.
    const items = affected.map((template) => {
      const next = replaceBlock(template.definition, block);
      const parsed = formTemplateDefinitionSchema.safeParse(next);
      if (!parsed.success) {
        throw new Error(
          `"${template.templateName}" can't take this change: ${
            parsed.error.issues[0]?.message ?? "the form would be invalid"
          }`,
        );
      }
      return {
        template_id: template.templateId,
        expected_active_version_id: template.activeVersionId,
        definition: parsed.data,
      };
    });

    const { data: result, error } = await context.supabase.rpc(
      "save_form_field_block",
      {
        p_block: {
          block_key: block.blockKey,
          name: block.name,
          description: block.description ?? null,
          step: block.step,
          fields: block.fields,
        },
        p_items: items,
        p_expected_version: expectedVersion ?? null,
      },
    );
    if (error) throw new Error(error.message);

    invalidateServiceCatalogue();
    return {
      version: (result as { version: number }).version,
      republishedTemplates: affected.map((template) => template.templateName),
    };
  });

/** Delete a block that no form includes any more. */
export const deleteFormFieldBlockFn = createServerFn({ method: "POST" })
  .middleware([requirePermission("services:manage")])
  .validator(z.object({ blockKey: z.string().min(1).max(64) }))
  .handler(async ({ data, context }) => {
    const templates = await loadActiveTemplates(context.supabase);
    const usage = usageFor(templates, data.blockKey);
    if (usage.length > 0) {
      throw new Error(
        `Still used by ${usage
          .map((template) => template.templateName)
          .join(", ")}. Detach it from those forms first.`,
      );
    }

    const { error } = await context.supabase
      .from("form_field_blocks")
      .delete()
      .eq("block_key", data.blockKey);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Blocks available to insert from the form builder (no usage lookup). */
export const listInsertableBlocksFn = createServerFn({ method: "GET" })
  .middleware([requirePermission("services:manage")])
  .handler(async ({ context }): Promise<FormFieldBlockRecord[]> => {
    const { data, error } = await context.supabase
      .from("form_field_blocks")
      .select("*")
      .order("name", { ascending: true });
    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") return [];
      throw new Error(error.message);
    }
    return (data ?? []).map(toBlockRecord);
  });
