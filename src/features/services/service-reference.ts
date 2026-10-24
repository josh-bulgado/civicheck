import type {
  Service,
  ServiceRequirement,
} from "~/features/admin/services/services.types";
import {
  splitFeeComponents,
  type FeeComponent,
} from "~/features/services/fee-components";
import {
  SERVICE_CATEGORY_LABELS,
  formatPesoFee,
  getServiceCategory,
  isRequirementApplicable,
  parseRequirementName,
  sortChecklist,
  splitCaseLabel,
  type ServiceCategory,
} from "~/features/services/service-utils";

// ─── Staff service reference ─────────────────────────────────────────────────
// What the counter page words for a visitor: which case they are, what they
// will pay, and the documents that apply to them. Pure, so it is tested without
// React and shared by the page and its copy button.

/**
 * The name a case goes by in the picker. Cases of one service share a display
 * name and differ in the bracket at the end of the charter name, e.g.
 * "Delayed Registration of COLB (0-79 yrs, Normal, Marital Child)" is
 * "0-79 yrs, Normal, Marital Child". A name with no bracket loses the display
 * name it starts with; one with neither is shown whole.
 */
export function caseLabel(
  service: Pick<Service, "name" | "display_name">,
): string {
  const bracket = service.name.match(/\(([^()]+)\)\s*$/);
  if (bracket) return bracket[1].trim();

  const shared = service.display_name?.trim();
  if (shared && service.name.startsWith(shared)) {
    const rest = service.name.slice(shared.length).replace(/^[\s\-–—:,]+/, "");
    if (rest) return rest;
  }
  return service.name;
}

/** "Free", "₱300.00", or "Free to ₱800.00" when the cases charge differently. */
export function feeRangeLabel(min: number, max: number): string {
  if (min === max) return formatPesoFee(max);
  return min === 0
    ? `Free to ${formatPesoFee(max)}`
    : `${formatPesoFee(min)} to ${formatPesoFee(max)}`;
}

/**
 * The charges behind one fee as the cashier will add them up:
 * "Service fee ₱500.00 + Admission of paternity ₱100.00". Null when the fee is
 * a single amount, so there is nothing to spell out.
 */
export function feeBreakdownLabel(
  components: readonly FeeComponent[],
): string | null {
  const { included } = splitFeeComponents(components);
  if (included.length < 2) return null;
  return included
    .map((component) => `${component.label} ${formatPesoFee(component.amount)}`)
    .join(" + ");
}

export interface Checklist {
  required: ServiceRequirement[];
  /** Documents that are only asked for in some situations. */
  conditional: ServiceRequirement[];
}

/**
 * The documents for one case, or for every case when `serviceCode` is null.
 * Applicability is the same call the apply wizard makes, so staff and
 * applicants are never told different things for the same case.
 */
export function checklistFor(
  requirements: readonly ServiceRequirement[],
  serviceCode: string | null,
): Checklist {
  const applicable =
    serviceCode === null
      ? [...requirements]
      : requirements.filter((requirement) =>
          isRequirementApplicable(requirement, serviceCode, {}),
        );
  const sorted = sortChecklist(applicable);
  return {
    required: sorted.filter((requirement) => requirement.is_mandatory),
    conditional: sorted.filter((requirement) => !requirement.is_mandatory),
  };
}

/** A document as one plain line: its name, and where the visitor gets it. */
function requirementLine(requirement: ServiceRequirement): string {
  const { name } = splitCaseLabel(requirement.requirement_name);
  const { primary, secondary } = parseRequirementName(name);
  const source = requirement.where_to_secure ?? secondary;
  return source ? `- ${primary} (${source})` : `- ${primary}`;
}

interface ChecklistTextInput {
  title: string;
  /** The picked case, or null while every case is showing. */
  caseText: string | null;
  fee: string;
  time: string;
  checklist: Checklist;
}

/** The checklist as text staff can paste into a message or read down a phone. */
export function checklistText({
  title,
  caseText,
  fee,
  time,
  checklist,
}: ChecklistTextInput): string {
  const lines = [
    caseText ? `${title} (${caseText})` : title,
    `Fee at cashier: ${fee}. Time at the office: ${time}.`,
    "",
    "Documents to bring:",
    ...checklist.required.map(requirementLine),
  ];
  if (checklist.conditional.length > 0) {
    lines.push("", "Only if it applies:", ...checklist.conditional.map(requirementLine));
  }
  return lines.join("\n");
}

export interface ServiceGroup<T> {
  key: string;
  /** Heading above the group, or null when the page already names it. */
  label: string | null;
  services: T[];
}

/**
 * The rail's sections. Staff in one department are already looking at a single
 * category, so they get one unlabelled group. Everyone else gets a section per
 * category, in the order the applicant directory lists them, with services that
 * belong to none at the end.
 */
export function groupServicesByCategory<
  T extends { department_id: string | null },
>(services: readonly T[], scoped: boolean): ServiceGroup<T>[] {
  if (scoped) {
    return services.length > 0
      ? [{ key: "all", label: null, services: [...services] }]
      : [];
  }

  const byCategory = new Map<ServiceCategory | "other", T[]>();
  for (const service of services) {
    const category = getServiceCategory(service.department_id) ?? "other";
    byCategory.set(category, [...(byCategory.get(category) ?? []), service]);
  }

  const order = [
    ...(Object.keys(SERVICE_CATEGORY_LABELS) as ServiceCategory[]),
    "other" as const,
  ];
  return order.flatMap((category) => {
    const members = byCategory.get(category);
    if (!members) return [];
    return [
      {
        key: category,
        label: category === "other" ? "Other" : SERVICE_CATEGORY_LABELS[category],
        services: members,
      },
    ];
  });
}
