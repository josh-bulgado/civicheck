import { useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import {
  AlertTriangle,
  ClipboardCheck,
  GitBranch,
  Lock,
  Plus,
  Search,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "~/components/ui/empty";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  type ConditionSource,
} from "~/features/forms/components/ConditionRuleBuilder";
import {
  EDITOR_MENU_CONTENT,
  EDITOR_MENU_ITEM,
} from "~/features/forms/components/EditorSheetParts";
import type { FormTemplateDefinition } from "~/features/forms/form-template.types";
import type { Service } from "../../services.types";
import {
  defaultRequirementTab,
  filterRequirements,
  type RequirementTab,
} from "../requirement-chips";
import {
  classifyRequirementScope,
  variantScopeCondition,
  type RequirementScopeKind,
} from "../requirement-scope";
import { EMPTY_REQUIREMENT, type ServiceFormValues } from "../service-form.config";
import { RequirementSheet } from "./RequirementSheet";
import { RequirementsTable, type RequirementEntry } from "./RequirementsTable";

interface RequirementsSectionProps {
  isLoading: boolean;
  sharedWith: Service[];
  formDefinition: FormTemplateDefinition;
  currentServiceCode: string | null;
  variantCodes: string[];
  embedded?: boolean;
}

const TAB_LABELS: Record<RequirementTab, string> = {
  all: "All",
  variant: "This variant",
  conditional: "Conditional",
  inherited: "Shared",
  other: "Other",
};

const TAB_ORDER: RequirementTab[] = [
  "all",
  "variant",
  "conditional",
  "inherited",
  "other",
];

const NO_ROUTING_HINT =
  "Connect this checklist to a shared application form with routing to limit a requirement to one variant.";

export function RequirementsSection({
  isLoading,
  sharedWith,
  formDefinition,
  currentServiceCode,
  variantCodes,
  embedded = false,
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
  // null until the user picks a tab; the default is latched on first data.
  const [tab, setTab] = useState<RequirementTab | null>(null);
  // The row whose Configure sheet is open. The index stays set while the sheet
  // animates closed; `sheetOpen` is what actually shows it.
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  // A row added in this session that has not been confirmed with Done yet.
  const [newIndex, setNewIndex] = useState<number | null>(null);
  // What to refocus when the sheet closes. Base UI only returns focus to what
  // was focused when the sheet mounted, which is wrong for menu-originated
  // opens and for Safari (it does not focus a button on click).
  const openerRef = useRef<HTMLElement | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

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

  const counts = useMemo(() => {
    const next: Record<RequirementScopeKind, number> = {
      variant: 0,
      conditional: 0,
      inherited: 0,
      other: 0,
    };
    for (const entry of entries) next[entry.scope.kind] += 1;
    return next;
  }, [entries]);

  // Latch the default tab once the checklist AND the form definition (which
  // supplies the routing that classifies rows) have loaded, so a later edit
  // that changes the counts never moves the tab out from under the user.
  // Loading starting again (another service, a reload) clears the latch so
  // the default is chosen afresh from the new data.
  useEffect(() => {
    if (isLoading) {
      setTab(null);
      return;
    }
    if (tab === null && entries.length > 0) {
      setTab(defaultRequirementTab(counts));
    }
  }, [tab, isLoading, entries.length, counts]);

  const normalizedQuery = query.trim().toLowerCase();
  const selectedTab = tab ?? defaultRequirementTab(counts);
  // "This variant" and "Other" only exist as tabs while they have rows.
  const resolvedTab: RequirementTab =
    (selectedTab === "other" || selectedTab === "variant") &&
    counts[selectedTab] === 0
      ? "all"
      : selectedTab;
  // A search spans every group, so the strip shows All while one is active.
  const activeTab: RequirementTab = normalizedQuery ? "all" : resolvedTab;

  const filterable = useMemo(
    () =>
      entries.map((entry) => ({
        ...entry,
        scopeKind: entry.scope.kind,
        searchText: [
          entry.value.requirement_name,
          entry.value.where_to_secure,
          entry.scope.conditionSummary,
          entry.scope.label,
        ]
          .filter(Boolean)
          .join(" "),
      })),
    [entries],
  );
  const visibleEntries = useMemo(
    () => filterRequirements(filterable, resolvedTab, query),
    [filterable, resolvedTab, query],
  );

  const isShared = sharedWith.length > 0;
  const canOverride = Boolean(formDefinition.caseSelector);
  const variantCount = counts.variant;
  const inheritedCount = counts.inherited;
  const visibleTabs = TAB_ORDER.filter(
    (candidate) =>
      !(candidate === "other" || candidate === "variant") ||
      counts[candidate] > 0,
  );
  const hasLockableRows =
    isShared &&
    visibleEntries.some(
      (entry) =>
        entry.scope.kind === "inherited" || entry.scope.kind === "other",
    );

  function groupLocked(kind: RequirementScopeKind) {
    if (!isShared) return false;
    if (!(kind === "inherited" || kind === "other")) return false;
    return !inheritedUnlocked;
  }

  function tabCount(candidate: RequirementTab) {
    return candidate === "all" ? entries.length : counts[candidate];
  }

  function openRequirement(index: number, opener: HTMLElement | null = null) {
    openerRef.current = opener;
    setOpenIndex(index);
    setSheetOpen(true);
  }

  // Wait a frame so this runs after the close has been committed; the library
  // then sees focus already outside the sheet and leaves it alone. Prefers the
  // opener, then the row's own button (a kept new row has no opener), then the
  // Add button, so focus never falls back to <body>.
  function returnFocus(opener: HTMLElement | null, index: number | null) {
    requestAnimationFrame(() => {
      const rowButton =
        index === null
          ? null
          : tableRef.current?.querySelector<HTMLElement>(
              `[data-requirement-opener="${index}"]`,
            );
      const target =
        (opener?.isConnected ? opener : null) ??
        rowButton ??
        addButtonRef.current;
      target?.focus({ preventScroll: true });
    });
  }

  function handleSheetOpenChange(open: boolean) {
    setSheetOpen(open);
    if (open) return;
    const opener = openerRef.current;
    openerRef.current = null;
    setNewIndex(null);
    returnFocus(opener, openIndex);
  }

  function discardNewRequirement() {
    const index = openIndex;
    openerRef.current = null;
    setSheetOpen(false);
    setOpenIndex(null);
    setNewIndex(null);
    if (index !== null) requirementFields.remove(index);
    // The row is gone, so the Add button is the right place to land.
    returnFocus(null, null);
  }

  function addBlank() {
    const nextIndex = requirementFields.fields.length;
    requirementFields.append({ ...EMPTY_REQUIREMENT });
    // An unscoped requirement is Shared, so show and unlock that tab —
    // otherwise the new row appears to vanish into a locked list.
    setQuery("");
    setTab("inherited");
    setInheritedUnlocked(true);
    setNewIndex(nextIndex);
    openRequirement(nextIndex);
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
    setQuery("");
    setTab("variant");
    setNewIndex(nextIndex);
    openRequirement(nextIndex);
  }

  function removeRequirement(index: number) {
    const removed = form.getValues("requirements")[index];
    if (!removed) return;
    requirementFields.remove(index);
    toast(
      `Removed “${removed.requirement_name?.trim() || "Untitled requirement"}”`,
      {
        action: {
          label: "Undo",
          onClick: () => {
            const count = form.getValues("requirements").length;
            requirementFields.insert(Math.min(index, count), removed);
          },
        },
      },
    );
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
      // The override is a new checklist row; the shared one keeps its id.
      requirement_id: undefined,
      applies_when: condition,
    });
    setQuery("");
    setTab("variant");
    setNewIndex(nextIndex);
    openRequirement(nextIndex);
  }

  return (
    <Card
      id={embedded ? undefined : "requirements"}
      variant={embedded ? "embedded" : "default"}
      className={embedded ? "overflow-visible" : "scroll-mt-6 overflow-visible"}
    >
      {!embedded ? (
        <CardHeader className="border-b">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <ClipboardCheck aria-hidden="true" className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle>
                <h2>Requirements</h2>
              </CardTitle>
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
      ) : null}
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative sm:max-w-sm sm:flex-1">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  type="search"
                  name="requirements_search"
                  autoComplete="off"
                  fieldSize="touch"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search requirements…"
                  aria-label="Search requirements"
                  className="bg-background data-[field-size=touch]:pl-10"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  nativeButton
                  render={
                    <Button
                      ref={addButtonRef}
                      type="button"
                      variant="raised"
                      size="touch"
                    />
                  }
                >
                  <Plus aria-hidden="true" data-icon="inline-start" />
                  Add
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className={cn(EDITOR_MENU_CONTENT, "min-w-64")}
                >
                  <DropdownMenuItem
                    className={EDITOR_MENU_ITEM}
                    onClick={addBlank}
                  >
                    <Plus aria-hidden="true" className="text-muted-foreground" />
                    Add Requirement
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!canOverride}
                    className={cn(EDITOR_MENU_ITEM, "items-start py-2")}
                    onClick={addVariantSpecific}
                  >
                    <GitBranch
                      aria-hidden="true"
                      className="mt-0.5 text-muted-foreground"
                    />
                    <span className="flex flex-col gap-0.5">
                      Add Variant-Specific
                      {canOverride ? null : (
                        <span className="max-w-60 text-xs whitespace-normal text-muted-foreground">
                          {NO_ROUTING_HINT}
                        </span>
                      )}
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
            ) : (
              <Tabs
                value={activeTab}
                onValueChange={(next) => {
                  // Picking a group is an explicit choice, so it ends a search.
                  setQuery("");
                  setTab(next as RequirementTab);
                }}
                className="gap-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <div className="max-w-full overflow-x-auto">
                    <TabsList
                      variant="segmented"
                      aria-label="Requirement groups"
                    >
                      {visibleTabs.map((candidate) => (
                        <TabsTrigger
                          key={candidate}
                          value={candidate}
                          className="gap-2 px-3.5"
                        >
                          {TAB_LABELS[candidate]}
                          <span className="font-mono text-xs text-muted-foreground tabular-nums">
                            {tabCount(candidate)}
                          </span>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                  {hasLockableRows ? (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {inheritedUnlocked ? null : (
                        <p className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Lock aria-hidden="true" className="size-3.5" />
                          Locked to protect every variant. Unlock, or override a
                          row for this variant only.
                        </p>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setInheritedUnlocked((current) => !current)
                        }
                      >
                        {inheritedUnlocked ? (
                          <>
                            <Lock aria-hidden="true" data-icon="inline-start" />
                            Lock
                          </>
                        ) : (
                          <>
                            <Unlock
                              aria-hidden="true"
                              data-icon="inline-start"
                            />
                            Unlock to Edit
                          </>
                        )}
                      </Button>
                    </div>
                  ) : null}
                </div>

                <TabsContent value={activeTab} className="flex flex-col gap-3">
                  {activeTab === "other" ? (
                    <p className="text-xs text-muted-foreground">
                      Scoped by a condition that excludes this variant. Edit it
                      from the variant it applies to.
                    </p>
                  ) : null}
                  {visibleEntries.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                      {normalizedQuery
                        ? `No requirements match “${query}”.`
                        : "No requirements in this group yet."}
                    </div>
                  ) : (
                    <RequirementsTable
                      ref={tableRef}
                      entries={visibleEntries}
                      locked={groupLocked}
                      onOpen={openRequirement}
                      onOverride={
                        canOverride ? overrideRequirement : undefined
                      }
                      onRemove={removeRequirement}
                      conditionSources={conditionSources}
                    />
                  )}
                </TabsContent>
              </Tabs>
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
      <RequirementSheet
        index={openIndex}
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        isNew={sheetOpen && openIndex !== null && openIndex === newIndex}
        onDiscardNew={discardNewRequirement}
        conditionSources={conditionSources}
        partyRoles={partyRoles}
      />
    </Card>
  );
}
