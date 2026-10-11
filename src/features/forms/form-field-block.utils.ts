import type {
  FormFieldBlock,
  FormFieldDefinition,
  FormTemplateDefinition,
} from "./form-template.types";

// ─── Shared field blocks ─────────────────────────────────────────────────────
// Pure helpers, no React/server dependency, so the same logic backs the admin
// builder (insert / detach) and the server-side fan-out (replace) and can be
// dry-run and validated before anything is published.
//
// A block is copied into a template's definition with every field tagged
// `blockKey`. Published definitions are always fully materialized — nothing
// resolves a block at read time — so old versions can never change meaning.

function tagFields(block: FormFieldBlock): FormFieldDefinition[] {
  return block.fields.map((field) => ({ ...field, blockKey: block.blockKey }));
}

function allFieldKeys(definition: FormTemplateDefinition) {
  return new Set(
    definition.sections.flatMap((section) =>
      section.fields.map((field) => field.key),
    ),
  );
}

/** Block keys that still have at least one field in this definition. */
export function blockKeysIn(definition: FormTemplateDefinition): string[] {
  const keys = new Set<string>();
  for (const section of definition.sections) {
    for (const field of section.fields) {
      if (field.blockKey) keys.add(field.blockKey);
    }
  }
  return [...keys];
}

export function definitionUsesBlock(
  definition: FormTemplateDefinition,
  blockKey: string,
): boolean {
  return definition.sections.some((section) =>
    section.fields.some((field) => field.blockKey === blockKey),
  );
}

export type InsertBlockResult =
  | { ok: true; definition: FormTemplateDefinition }
  | { ok: false; reason: string };

/** Append a block to the end of its step, refusing key collisions. */
export function insertBlock(
  definition: FormTemplateDefinition,
  block: FormFieldBlock,
): InsertBlockResult {
  if (definitionUsesBlock(definition, block.blockKey)) {
    return {
      ok: false,
      reason: `"${block.name}" is already part of this form.`,
    };
  }

  const existing = allFieldKeys(definition);
  const conflicts = block.fields
    .map((field) => field.key)
    .filter((key) => existing.has(key));
  if (conflicts.length > 0) {
    return {
      ok: false,
      reason: `This form already has a question with the key ${conflicts
        .map((key) => `"${key}"`)
        .join(", ")}. Remove or detach it before adding "${block.name}".`,
    };
  }

  const fields = tagFields(block);
  const firstIndex = definition.sections.findIndex(
    (section) => section.step === block.step,
  );
  if (firstIndex === -1) {
    return {
      ok: true,
      definition: {
        ...definition,
        sections: [
          ...definition.sections,
          {
            key: block.step,
            step: block.step,
            title: block.step === "case" ? "Case details" : "Your details",
            fields,
          },
        ],
      },
    };
  }

  return {
    ok: true,
    definition: {
      ...definition,
      sections: definition.sections.map((section, index) =>
        index === firstIndex
          ? { ...section, fields: [...section.fields, ...fields] }
          : section,
      ),
    },
  };
}

/**
 * Swap the fields tagged with this block for the block's current fields, in
 * place: the block keeps the position of its first field. Fields the block
 * no longer has disappear, new ones appear at the same position. Returns the
 * definition unchanged when the block isn't part of it.
 */
export function replaceBlock(
  definition: FormTemplateDefinition,
  block: FormFieldBlock,
): FormTemplateDefinition {
  if (!definitionUsesBlock(definition, block.blockKey)) return definition;

  const replacement = tagFields(block);
  let placed = false;

  return {
    ...definition,
    sections: definition.sections.map((section) => {
      if (!section.fields.some((field) => field.blockKey === block.blockKey)) {
        return section;
      }
      const fields: FormFieldDefinition[] = [];
      for (const field of section.fields) {
        if (field.blockKey !== block.blockKey) {
          fields.push(field);
        } else if (!placed) {
          fields.push(...replacement);
          placed = true;
        }
      }
      return { ...section, fields };
    }),
  };
}

/** Turn a block's fields into ordinary local fields of this form. */
export function detachBlock(
  definition: FormTemplateDefinition,
  blockKey: string,
): FormTemplateDefinition {
  return {
    ...definition,
    sections: definition.sections.map((section) => ({
      ...section,
      fields: section.fields.map((field) => {
        if (field.blockKey !== blockKey) return field;
        const { blockKey: _removed, ...local } = field;
        return local;
      }),
    })),
  };
}
