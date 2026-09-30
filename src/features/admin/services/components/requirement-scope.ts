import { conditionRuleMatches } from "~/features/forms/form-template.utils";
import type {
  CaseSelectorDefinition,
  ConditionRule,
} from "~/features/forms/form-template.types";
import type { ConditionSource } from "~/features/forms/components/ConditionRuleBuilder";

/**
 * How a requirement row relates to the variant currently being edited. The
 * requirement table is group-owned, so "variant-specific" is never a separate
 * row: it is derived by resolving the row's condition against the shared
 * application's routing outcomes. The editor uses this to split inherited from
 * delta requirements without changing the storage model.
 */
export type RequirementScopeKind =
  | "variant"
  | "conditional"
  | "inherited"
  | "other";

export interface RequirementScope {
  kind: RequirementScopeKind;
  /** Service codes the condition can resolve to, when the routing is known. */
  affectedCodes: string[];
  /** Human-readable condition, or null when the row always applies. */
  conditionSummary: string | null;
  /** Short chip label, e.g. "This variant" or "Shared ×6". */
  label: string;
}

export interface RequirementScopeContext {
  variantCodes: string[];
  currentCode: string | null;
  caseSelector?: CaseSelectorDefinition;
  sources: ConditionSource[];
}

/** Answers implied by one routing outcome, used to test a requirement rule. */
function outcomeAnswers(outcome: CaseSelectorDefinition["outcomes"][number]) {
  const answers: Record<string, string> = {};
  for (const condition of outcome.when.conditions) {
    answers[condition.field] = condition.value;
  }
  return answers;
}

function resolveAffectedCodes(
  rule: ConditionRule,
  caseSelector: CaseSelectorDefinition | undefined,
  variantCodes: string[],
): string[] {
  if (!caseSelector) return [];
  const known = new Set(variantCodes);
  const affected = new Set<string>();
  for (const outcome of caseSelector.outcomes) {
    if (!known.has(outcome.serviceCode)) continue;
    if (conditionRuleMatches(rule, outcomeAnswers(outcome))) {
      affected.add(outcome.serviceCode);
    }
  }
  return [...affected];
}

export function summarizeCondition(
  rule: ConditionRule,
  sources: ConditionSource[],
): string {
  const parts = rule.conditions.map((condition) => {
    const source = sources.find((item) => item.key === condition.field);
    const fieldLabel = source?.label ?? condition.field;
    const valueLabel =
      source?.options?.find((option) => option.value === condition.value)?.label ??
      condition.value;
    return `${fieldLabel} ${condition.operator === "equals" ? "is" : "is not"} ${valueLabel}`;
  });
  if (parts.length <= 2) {
    return parts.join(rule.match === "all" ? " and " : " or ");
  }
  return `${parts.length} conditions`;
}

export function classifyRequirementScope(
  requirement: {
    applies_when?: ConditionRule | null;
    case_tag?: string | null;
  },
  context: RequirementScopeContext,
): RequirementScope {
  const { variantCodes, currentCode, caseSelector, sources } = context;

  if (requirement.applies_when) {
    const conditionSummary = summarizeCondition(requirement.applies_when, sources);

    if (!caseSelector || variantCodes.length <= 1) {
      return {
        kind: "conditional",
        affectedCodes: [],
        conditionSummary,
        label: "Conditional",
      };
    }

    const affected = resolveAffectedCodes(
      requirement.applies_when,
      caseSelector,
      variantCodes,
    );
    if (affected.length === 0) {
      return {
        kind: "conditional",
        affectedCodes: [],
        conditionSummary,
        label: "Conditional",
      };
    }
    if (affected.length === variantCodes.length) {
      return {
        kind: "conditional",
        affectedCodes: affected,
        conditionSummary,
        label: "Conditional · all variants",
      };
    }
    if (currentCode && affected.includes(currentCode)) {
      return {
        kind: "variant",
        affectedCodes: affected,
        conditionSummary,
        label:
          affected.length === 1
            ? "This variant"
            : `This variant +${affected.length - 1}`,
      };
    }
    return {
      kind: "other",
      affectedCodes: affected,
      conditionSummary,
      label: "Other variants",
    };
  }

  if (requirement.case_tag) {
    return {
      kind: "variant",
      affectedCodes: [],
      conditionSummary: `Legacy case tag: ${requirement.case_tag}`,
      label: "This variant · legacy",
    };
  }

  return {
    kind: "inherited",
    affectedCodes: [...variantCodes],
    conditionSummary: null,
    label:
      variantCodes.length > 1 ? `Shared ×${variantCodes.length}` : "All applicants",
  };
}

/**
 * The routing outcome that selects `currentCode`, expressed as a rule that can
 * scope a requirement to this variant. Returns null when the group has no
 * database-backed routing, so callers fall back to a normal requirement.
 */
export function variantScopeCondition(
  currentCode: string | null,
  caseSelector: CaseSelectorDefinition | undefined,
): ConditionRule | null {
  if (!currentCode || !caseSelector) return null;
  const outcome = caseSelector.outcomes.find(
    (candidate) => candidate.serviceCode === currentCode,
  );
  if (!outcome) return null;
  return {
    match: "all",
    conditions: outcome.when.conditions.map((condition) => ({ ...condition })),
  };
}
