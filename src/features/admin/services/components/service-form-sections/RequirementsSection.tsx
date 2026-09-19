import { useMemo, useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import {
  AlertTriangle,
  ChevronDown,
  ClipboardCheck,
  GitBranch,
  Lock,
  Plus,
  Search,
  Unlock,
} from "lucide-react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "~/components/ui/empty";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import {
  type ConditionSource,
} from "~/features/forms/components/ConditionRuleBuilder";
import type { FormTemplateDefinition } from "~/features/forms/form-template.types";
import type { Service } from "../../services.types";
import {
  classifyRequirementScope,
  variantScopeCondition,
  type RequirementScope,
  type RequirementScopeKind,
} from "../requirement-scope";
import {
  EMPTY_REQUIREMENT,
  type ServiceFormValues,
} from "../service-form.config";
import { RequirementRow, type RequirementValue } from "./RequirementRow";

interface RequirementsSectionProps {
  isLoading: boolean;
  sharedWith: Service[];
  formDefinition: FormTemplateDefinition;
  currentServiceCode: string | null;
  variantCodes: string[];
}

interface RequirementEntry {
  id: string;
  index: number;
  value: RequirementValue;
  scope: RequirementScope;
}

const GROUP_ORDER: RequirementScopeKind[] = [
  "variant",
  "conditional",
  "inherited",
  "other",
];

const GROUP_COPY: Record<
  RequirementScopeKind,
  { title: string; description: string }
> = {
  variant: {
    title: "Variant-specific",
    description:
      "Requirements that apply only to this variant, scoped by the routing answers.",
  },
  conditional: {
    title: "Conditional",
    description:
      "Requirements revealed by a condition that can apply to more than one variant.",
  },
  inherited: {
    title: "Inherited from group",
    description: "Shared by every variant that uses this checklist.",
  },
  other: {
    title: "Applies to other variants",
    description:
      "Scoped by a condition that excludes this variant. Edit it from the variant it applies to.",
  },
};

function RequirementGroup({
  title,
  description,
  entries,
  open,
  onOpenChange,
  locked,
  showLock,
  onToggleLock,
  conditionSources,
  partyRoles,
  onRemove,
  onOverride,
  initiallyOpenIndex,
}: {
  title: string;
  description: string;
  entries: RequirementEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locked: boolean;
  showLock: boolean;
  onToggleLock: () => void;
  conditionSources: ConditionSource[];
  partyRoles: string[];
  onRemove: (index: number) => void;
  onOverride: ((index: number) => void) | undefined;
  initiallyOpenIndex: number | null;
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <div className="rounded-lg border border-border bg-surface-subtle">
        <div className="flex items-center justify-between gap-3 p-3">
          <CollapsibleTrigger className="group flex min-w-0 flex-1 items-start gap-2 text-left">
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold text-foreground">
                  {title}
                </span>
                <Badge variant="neutral">{entries.length}</Badge>
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                {description}
              </span>
            </span>
            <ChevronDown
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
            />
          </CollapsibleTrigger>
          {showLock ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onToggleLock}
            >
              {locked ? (
                <>
                  <Unlock aria-hidden="true" data-icon="inline-start" />
                  Unlock to edit
                </>
              ) : (
                <>
                  <Lock aria-hidden="true" data-icon="inline-start" />
                  Lock
                </>
              )}
            </Button>
          ) : null}
        </div>
        <CollapsibleContent>
          <div className="flex flex-col gap-2 px-3 pb-3">
            {locked ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Lock aria-hidden="true" className="size-3.5" />
                Locked to protect every variant. Unlock, or override a row for
                this variant only.
              </p>
            ) : null}
            {entries.map((entry) => (
              <RequirementRow
                key={entry.id}
                index={entry.index}
                value={entry.value}
                scope={entry.scope}
                conditionSources={conditionSources}
                partyRoles={partyRoles}
                locked={locked}
                canRemove={entries.length > 0}
                initiallyOpen={entry.index === initiallyOpenIndex}
                onRemove={() => onRemove(entry.index)}
                onOverride={
                  onOverride ? () => onOverride(entry.index) : undefined
                }
              />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function RequirementsSection({
  isLoading,
  sharedWith,
  formDefinition,
  currentServiceCode,
  variantCodes,
}: RequirementsSectionProps) {
  const form = useFormContext<ServiceFormValues>();
  const requirementFields = useFieldArray({
    control: form.control,
    name: "requirements",
  });
  const requirementValues = form.watch("requirements");
  const partyRoles = form
    .watch("party_roles")
    .map((entry) => entry.value.trim())
    .filter(Boolean);

  const [query, setQuery] = useState("");
  const [inheritedUnlocked, setInheritedUnlocked] = useState(false);
  const [initiallyOpenIndex, setInitiallyOpenIndex] = useState<number | null>(
    null,
  );
  const [openGroups, setOpenGroups] = useState<
    Record<RequirementScopeKind, boolean>
  >({
    variant: true,
    conditional: true,
    inherited: false,
    other: false,
  });

  const conditionSources: ConditionSource[] = useMemo(
    () => [
      ...(formDefinition.caseSelector?.questions ?? []).map((question) => ({
        key: question.key,
        label: question.label,
        options: question.options,
      })),
      ...(formDefinition.derivedAnswers ?? []).map((derived) => ({
        key: derived.key,
        label: derived.label,
        options: derived.bands.map((band) => ({
          value: band.value,
          label: band.label,
        })),
      })),
      ...formDefinition.sections.flatMap((section) =>
        section.fields.flatMap((field) =>
          field.type === "select"
            ? [{ key: field.key, label: field.label, options: field.options }]
            : [],
        ),
      ),
    ],
    [formDefinition],
  );

  const entries: RequirementEntry[] = useMemo(
    () =>
      requirementValues.map((value, index) => ({
        id: requirementFields.fields[index]?.id ?? `requirement-${index}`,
        index,
        value,
        scope: classifyRequirementScope(value, {
          variantCodes,
          currentCode: currentServiceCode,
          caseSelector: formDefinition.caseSelector,
          sources: conditionSources,
        }),
      })),
    [
      requirementValues,
      requirementFields.fields,
      variantCodes,
      currentServiceCode,
      formDefinition.caseSelector,
      conditionSources,
    ],
  );

  const normalizedQuery = query.trim().toLowerCase();
  const visibleEntries = normalizedQuery
    ? entries.filter((entry) =>
        [
          entry.value.requirement_name,
          entry.value.where_to_secure,
          entry.scope.conditionSummary,
          entry.scope.label,
        ]
          .filter(Boolean)
          .some((text) => (text as string).toLowerCase().includes(normalizedQuery)),
      )
    : entries;

  const grouped = useMemo(() => {
    const buckets: Record<RequirementScopeKind, RequirementEntry[]> = {
      variant: [],
      conditional: [],
      inherited: [],
      other: [],
    };
    for (const entry of visibleEntries) buckets[entry.scope.kind].push(entry);
    return buckets;
  }, [visibleEntries]);

  const isShared = sharedWith.length > 0;
  const canOverride = Boolean(formDefinition.caseSelector);
  const variantCount =
    entries.filter((entry) => entry.scope.kind === "variant").length;
  const inheritedCount = entries.filter(
    (entry) => entry.scope.kind === "inherited",
  ).length;

  function groupLocked(kind: RequirementScopeKind) {
    if (!isShared) return false;
    if (!(kind === "inherited" || kind === "other")) return false;
    return !inheritedUnlocked;
  }

  function groupTitle(kind: RequirementScopeKind) {
    if (kind === "variant") {
      return `${GROUP_COPY.variant.title} · ${currentServiceCode ?? "this variant"}`;
    }
    return GROUP_COPY[kind].title;
  }

  function groupDescription(kind: RequirementScopeKind) {
    return GROUP_COPY[kind].description;
  }

  function addBlank() {
    const nextIndex = requirementFields.fields.length;
    requirementFields.append({ ...EMPTY_REQUIREMENT });
    setInitiallyOpenIndex(nextIndex);
    // An unscoped requirement is inherited, so reveal and unlock the group it
    // lands in — otherwise the new row appears to vanish into a closed section.
    setInheritedUnlocked(true);
    setOpenGroups((current) => ({ ...current, inherited: true }));
  }

  function addVariantSpecific() {
    const nextIndex = requirementFields.fields.length;
    requirementFields.append({
      ...EMPTY_REQUIREMENT,
      applies_when: variantScopeCondition(
        currentServiceCode,
        formDefinition.caseSelector,
      ),
    });
    setInitiallyOpenIndex(nextIndex);
    setOpenGroups((current) => ({ ...current, variant: true }));
  }

  function overrideRequirement(index: number) {
    const source = requirementValues[index];
    if (!source) return;
    const condition = variantScopeCondition(
      currentServiceCode,
      formDefinition.caseSelector,
    );
    const nextIndex = requirementFields.fields.length;
    requirementFields.insert(nextIndex, {
      ...source,
      applies_when: condition,
    });
    setInitiallyOpenIndex(nextIndex);
    setOpenGroups((current) => ({ ...current, variant: true }));
  }

  return (
    <Card id="requirements" className="scroll-mt-6 overflow-visible">
      <CardHeader className="border-b">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <ClipboardCheck aria-hidden="true" className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle>
              <h2>Requirements</h2>
            </CardTitle>
            <CardDescription>
              What applicants must bring, where to secure it, and when each item
              applies. Variant-specific rows are listed first; inherited rows
              are grouped and locked.
            </CardDescription>
            {entries.length > 0 ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="neutral">{entries.length} total</Badge>
                <Badge variant="default">{variantCount} this variant</Badge>
                <Badge variant="outline">{inheritedCount} shared</Badge>
              </div>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-4">
        {sharedWith.length > 0 ? (
          <Alert variant="warning">
            <AlertTriangle aria-hidden="true" />
            <AlertDescription>
              This checklist is shared by {sharedWith.length + 1} services.
              Inherited requirements are locked to prevent group-wide edits — use{" "}
              <span className="font-medium">Override for this variant</span> to
              change one without touching the others.
            </AlertDescription>
          </Alert>
        ) : null}

        {isLoading ? (
          <div
            className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-6 text-xs text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            <Spinner className="size-4" />
            Loading checklist&hellip;
          </div>
        ) : (
          <>
            <div className="sticky top-2 z-10 flex flex-col gap-3 rounded-lg border border-border bg-card/95 p-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <div className="relative sm:max-w-xs sm:flex-1">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search requirements…"
                  aria-label="Search requirements"
                  className="pl-8"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canOverride}
                  title={
                    canOverride
                      ? undefined
                      : "Bind this checklist to a shared application with routing to scope a requirement to one variant."
                  }
                  onClick={addVariantSpecific}
                >
                  <GitBranch aria-hidden="true" data-icon="inline-start" />
                  Add variant-specific
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addBlank}
                >
                  <Plus aria-hidden="true" data-icon="inline-start" />
                  Add requirement
                </Button>
              </div>
            </div>

            {entries.length === 0 ? (
              <Empty className="border border-border px-4 py-8">
                <EmptyHeader>
                  <EmptyTitle className="text-sm">
                    <h3>No Requirements Yet</h3>
                  </EmptyTitle>
                  <EmptyDescription>
                    Add the first item applicants must bring for this service.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : visibleEntries.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                No requirements match “{query}”.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {GROUP_ORDER.map((kind) => {
                  const bucket = grouped[kind];
                  if (bucket.length === 0) return null;
                  const locked = groupLocked(kind);
                  return (
                    <RequirementGroup
                      key={kind}
                      title={groupTitle(kind)}
                      description={groupDescription(kind)}
                      entries={bucket}
                      open={normalizedQuery ? true : openGroups[kind]}
                      onOpenChange={(open) =>
                        setOpenGroups((current) => ({
                          ...current,
                          [kind]: open,
                        }))
                      }
                      locked={locked}
                      showLock={
                        isShared && (kind === "inherited" || kind === "other")
                      }
                      onToggleLock={() =>
                        setInheritedUnlocked((current) => !current)
                      }
                      conditionSources={conditionSources}
                      partyRoles={partyRoles}
                      onRemove={(index) => requirementFields.remove(index)}
                      onOverride={
                        canOverride ? overrideRequirement : undefined
                      }
                      initiallyOpenIndex={initiallyOpenIndex}
                    />
                  );
                })}
              </div>
            )}

            {normalizedQuery ? (
              <p className="text-xs text-muted-foreground">
                Showing {visibleEntries.length} of {entries.length}{" "}
                requirements.
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
