import type { ConditionSource } from "~/features/forms/components/ConditionRuleBuilder";
import type {
  ConditionRule,
  FormCondition,
} from "~/features/forms/form-template.types";

import type { RequirementScopeKind } from "./requirement-scope";

/**
 * Pure helpers behind the requirements table: the two-line title/detail split,
 * the short condition and person chips, and the tab/search filtering.
 */

export type RequirementTab = "all" | RequirementScopeKind;

/** Text before the first comma is the title; the rest (trimmed) is the detail. */
export function splitRequirementTitle(name: string): {
  title: string;
  detail: string | null;
} {
  const trimmed = name.trim();
  if (!trimmed) return { title: "Untitled requirement", detail: null };
  const comma = trimmed.indexOf(",");
  if (comma < 0) return { title: trimmed, detail: null };
  const title = trimmed.slice(0, comma).trim();
  const detail = trimmed.slice(comma + 1).trim();
  return {
    title: title || "Untitled requirement",
    detail: detail || null,
  };
}

function shortCondition(
  condition: FormCondition,
  sources: readonly ConditionSource[],
): string {
  const source = sources.find((s) => s.key === condition.field);
  // Conditions store the option value, never its label, so a renamed label
  // still renders; an option that no longer exists falls back to the raw value.
  const label =
    source?.options?.find((o) => o.value === condition.value)?.label ??
    condition.value;
  const text = /age$/i.test(source?.label ?? "")
    ? `Age ${label.replace(/ years old$/i, "")}`
    : label;
  return condition.operator === "not_equals" ? `Not ${text}` : text;
}

export function requirementChips(
  input: {
    appliesWhen: ConditionRule | null;
    uploadScope: "request" | "each_subject" | "specific_subject";
    subjectRole: string | null;
  },
  sources: readonly ConditionSource[],
): { condition: string | null; person: string | null } {
  const conditions = input.appliesWhen?.conditions ?? [];
  let condition: string | null = null;
  if (input.appliesWhen && conditions.length > 0) {
    const parts = conditions.map((c) => shortCondition(c, sources));
    condition =
      parts.length > 2
        ? `${parts[0]} +${parts.length - 1}`
        : parts.join(input.appliesWhen.match === "all" ? " + " : " or ");
  }

  let person: string | null = null;
  if (input.uploadScope === "specific_subject") {
    person = input.subjectRole?.trim() || null;
  } else if (input.uploadScope === "each_subject") {
    person = "Each person";
  }

  return { condition, person };
}

/** A non-empty query searches every group and ignores the active tab. */
export function filterRequirements<
  T extends { scopeKind: RequirementScopeKind; searchText: string },
>(entries: readonly T[], tab: RequirementTab, query: string): T[] {
  const q = query.trim().toLowerCase();
  if (q) return entries.filter((e) => e.searchText.toLowerCase().includes(q));
  if (tab === "all") return [...entries];
  return entries.filter((e) => e.scopeKind === tab);
}

export function defaultRequirementTab(
  counts: Record<RequirementScopeKind, number>,
): RequirementTab {
  return counts.conditional > 0 ? "conditional" : "all";
}
