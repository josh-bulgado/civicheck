import { useEffect, useId, useState } from "react";
import type { HotkeyChord } from "@tanstack/react-hotkeys";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Pencil,
  X,
} from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { Kbd } from "~/components/ui/kbd";
import { Sheet, SheetContent } from "~/components/ui/sheet";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  getServiceChecklist,
  type ServiceRequirement,
} from "~/features/admin/services/services.queries";
import {
  ClassificationBadge,
  formatFeeRange,
  type ServiceDossier,
} from "~/features/admin/services/components/ServicesColumn";
import {
  cleanStepText,
  formatFee,
  formatServiceCode,
  parseRequirementName,
} from "~/features/services/service-utils";
import {
  cachedServiceRead,
  serviceCacheKeys,
} from "~/features/services/services.cache";
import { useHotkeyLabel } from "~/hooks/useHotkeyLabel";
import { cn } from "~/lib/utils";

/** Shortcuts the table listens for; the panel shows the same keys. */
export const NEXT_SERVICE_HOTKEY: HotkeyChord = "J";
export const PREVIOUS_SERVICE_HOTKEY: HotkeyChord = "K";
export const EDIT_SERVICE_HOTKEY: HotkeyChord = "E";

type InspectorTab = "requirements" | "variants" | "process" | "registry";

interface ServiceInspectorProps {
  service: ServiceDossier | null;
  /**
   * Wide screens dock the panel beside the table so the list stays visible and
   * clickable. Narrower ones open it as an overlay sheet instead.
   */
  docked: boolean;
  onClose: () => void;
  onEdit?: (service: ServiceDossier) => void;
  editLabel?: string;
  /**
   * Steps through the list the panel was opened from, so an admin can review
   * services one after another. A missing handler disables that button (first
   * or last item).
   */
  navigation?: {
    position: number;
    total: number;
    onPrevious?: () => void;
    onNext?: () => void;
  };
}

export function ServiceInspector({
  service,
  docked,
  onClose,
  onEdit,
  editLabel = "Edit Service",
  navigation,
}: ServiceInspectorProps) {
  const titleId = useId();

  // A docked panel is not modal, so Escape closes it from anywhere on the page
  // unless a field or an open menu is using the key.
  useEffect(() => {
    if (!docked || !service) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [role='combobox']")) return;
      onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [docked, service, onClose]);

  if (!service) return null;

  const body = (
    <InspectorBody
      service={service}
      titleId={titleId}
      docked={docked}
      onClose={onClose}
      onEdit={onEdit}
      editLabel={editLabel}
      // Docked, the table is right there: clicking a row is the way to move.
      // The overlay sheet covers it, so it keeps the arrows.
      navigation={docked ? undefined : navigation}
    />
  );

  if (docked) {
    return (
      <aside
        aria-labelledby={titleId}
        className="sticky top-4 flex max-h-[calc(100dvh-2rem)] w-[26rem] shrink-0 flex-col overflow-hidden rounded-xl border border-border-strong bg-card animate-in fade-in slide-in-from-right-2 duration-200 motion-reduce:animate-none"
      >
        {body}
      </aside>
    );
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        showCloseButton={false}
        aria-labelledby={titleId}
        className="w-full gap-0 overflow-hidden border-l border-border bg-card p-0 sm:max-w-lg"
      >
        {body}
      </SheetContent>
    </Sheet>
  );
}

function useChecklist(service: ServiceDossier) {
  const [requirements, setRequirements] = useState<ServiceRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { service_code, requirement_group } = service;

  useEffect(() => {
    // Stepping quickly through the list starts a new read before the last one
    // finishes; only the latest one may write its result.
    let cancelled = false;
    setLoading(true);
    setError(null);
    cachedServiceRead(
      serviceCacheKeys.checklist(service_code, requirement_group),
      () => getServiceChecklist({ data: { service_code, requirement_group } }),
    )
      .then((data) => {
        if (!cancelled) setRequirements(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            (err instanceof Error && err.message) ||
              "Failed to load requirements.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [service_code, requirement_group]);

  return { requirements, loading, error };
}

interface InspectorBodyProps {
  service: ServiceDossier;
  titleId: string;
  docked: boolean;
  onClose: () => void;
  onEdit?: (service: ServiceDossier) => void;
  editLabel: string;
  navigation?: ServiceInspectorProps["navigation"];
}

function InspectorBody({
  service,
  titleId,
  docked,
  onClose,
  onEdit,
  editLabel,
  navigation,
}: InspectorBodyProps) {
  const hotkeyLabel = useHotkeyLabel();
  const { requirements, loading, error } = useChecklist(service);
  const [tab, setTab] = useState<InspectorTab>("requirements");
  const [conditionalOpen, setConditionalOpen] = useState(false);

  // Collapse "If applicable" again when stepping to another service.
  useEffect(() => {
    setConditionalOpen(false);
  }, [service.dossier_key]);

  const mandatory = requirements.filter((r) => r.is_mandatory);
  const conditional = requirements.filter((r) => !r.is_mandatory);
  const steps = (service.steps_description ?? [])
    .map(cleanStepText)
    .filter((s) => s.length > 0);
  const isGroup = service.variant_count > 1;

  // The tab the admin was on is kept while stepping through services, unless
  // the next one has no such tab (a single service has no variants).
  const available: InspectorTab[] = [
    "requirements",
    ...(isGroup ? (["variants"] as const) : []),
    ...(steps.length > 0 ? (["process"] as const) : []),
    "registry",
  ];
  const activeTab = available.includes(tab) ? tab : "requirements";

  return (
    <>
      {navigation ? (
        <div className="flex items-center gap-1.5 px-5 pt-4">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={navigation.onPrevious}
            disabled={!navigation.onPrevious}
            aria-label="Previous service"
            title="Previous service"
          >
            <ChevronUp aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={navigation.onNext}
            disabled={!navigation.onNext}
            aria-label="Next service"
            title="Next service"
          >
            <ChevronDown aria-hidden="true" />
          </Button>
          <span
            className="ml-1 text-xs tabular-nums text-muted-foreground"
            aria-live="polite"
          >
            {navigation.position} of {navigation.total}
          </span>
        </div>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onClose}
        aria-label="Close details"
        title="Close (Esc)"
        className="absolute top-4 right-4"
      >
        <X aria-hidden="true" />
      </Button>

      <div
        className={cn(
          "flex flex-col gap-2 px-5 pr-14 pb-3",
          navigation ? "pt-3" : "pt-5",
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          {isGroup ? (
            <>
              <Badge variant="secondary">Service group</Badge>
              <span className="text-xs text-muted-foreground">
                {service.variant_count} variants
              </span>
            </>
          ) : (
            <ClassificationBadge classification={service.classification} />
          )}
        </div>
        <h2
          id={titleId}
          className="font-heading text-lg leading-tight font-bold text-balance text-foreground"
        >
          {service.name}
        </h2>
        {/* A group has no single code; the first variant's would read as the
            group's. */}
        <p className="text-xs text-muted-foreground">
          {isGroup ? "Group" : "Service code"}{" "}
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground/80">
            {formatServiceCode(
              isGroup
                ? (service.display_group ?? service.service_code)
                : service.service_code,
            )}
          </span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 pb-4 text-sm">
        <span className="font-mono text-base font-semibold tabular-nums text-foreground">
          {formatFeeRange(service.minimum_fee, service.maximum_fee)}
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
          <Clock aria-hidden="true" className="size-3.5 shrink-0" />
          {service.processing_time || "N/A"}
        </span>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setTab(value as InspectorTab)}
        className="min-h-0 flex-1 gap-0"
      >
        <TabsList
          variant="editor"
          className="h-10 w-full justify-start gap-4 border-b border-border px-5"
        >
          <TabsTrigger value="requirements" className="flex-none px-0.5">
            Requirements
            {!loading && !error ? (
              <TabCount>{requirements.length}</TabCount>
            ) : null}
          </TabsTrigger>
          {isGroup ? (
            <TabsTrigger value="variants" className="flex-none px-0.5">
              Variants
              <TabCount>{service.variant_count}</TabCount>
            </TabsTrigger>
          ) : null}
          {steps.length > 0 ? (
            <TabsTrigger value="process" className="flex-none px-0.5">
              Process
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="registry" className="flex-none px-0.5">
            Registry
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="requirements"
          className="min-h-0 flex-1 overflow-y-auto px-5 py-4"
        >
          {loading ? (
            <div className="space-y-4" aria-busy="true">
              {[0, 1, 2, 3].map((n) => (
                <div key={n} className="space-y-1.5">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          ) : requirements.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              No specific requirements defined for this service.
            </div>
          ) : (
            <div className="space-y-5">
              {mandatory.length > 0 ? (
                <section aria-label="Required documents">
                  <SectionLabel count={mandatory.length}>Required</SectionLabel>
                  <ul className="divide-y divide-border">
                    {mandatory.map((req) => (
                      <RequirementRow key={req.id} requirement={req} />
                    ))}
                  </ul>
                </section>
              ) : null}
              {conditional.length > 0 ? (
                <Collapsible
                  open={conditionalOpen}
                  onOpenChange={setConditionalOpen}
                >
                  <CollapsibleTrigger className="flex w-full select-none items-center justify-between rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                    <SectionLabel count={conditional.length} icon>
                      If applicable
                    </SectionLabel>
                    <ChevronDown
                      aria-hidden="true"
                      className={cn(
                        "size-4 text-muted-foreground transition-transform duration-200",
                        conditionalOpen && "rotate-180",
                      )}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ul className="divide-y divide-border pt-1">
                      {conditional.map((req) => (
                        <RequirementRow
                          key={req.id}
                          requirement={req}
                          optional
                        />
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              ) : null}
            </div>
          )}
        </TabsContent>

        {isGroup ? (
          <TabsContent
            value="variants"
            className="min-h-0 flex-1 overflow-y-auto px-5 py-4"
          >
            <ul className="divide-y divide-border">
              {service.variants.map((variant) => (
                <li
                  key={variant.service_code}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <span className="min-w-0 text-sm text-foreground">
                    {formatServiceCode(variant.service_code)}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 font-mono text-sm font-semibold tabular-nums",
                      variant.fee === 0 ? "text-success" : "text-foreground",
                    )}
                  >
                    {formatFee(variant.fee)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              The checklist applies to every variant in the group.
            </p>
          </TabsContent>
        ) : null}

        {steps.length > 0 ? (
          <TabsContent
            value="process"
            className="min-h-0 flex-1 overflow-y-auto px-5 py-4"
          >
            <ol>
              {steps.map((step, index) => (
                <li key={index} className="relative flex gap-3 pb-4 last:pb-0">
                  {index < steps.length - 1 ? (
                    <span
                      aria-hidden="true"
                      className="absolute top-6 bottom-0.5 left-[10.5px] w-px bg-border"
                    />
                  ) : null}
                  <span
                    aria-hidden="true"
                    className="relative z-10 flex size-[22px] shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary"
                  >
                    {index + 1}
                  </span>
                  <p className="pt-0.5 text-sm leading-relaxed text-body">
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          </TabsContent>
        ) : null}

        <TabsContent
          value="registry"
          className="min-h-0 flex-1 overflow-y-auto px-5 py-4"
        >
          <dl className="divide-y divide-border text-sm">
            <RegistryRow
              label="Bundled under"
              value={
                service.display_group
                  ? formatServiceCode(service.display_group)
                  : null
              }
              empty="None (Standalone)"
            />
            <RegistryRow
              label="Public label"
              value={service.display_name}
              empty="None"
            />
            <RegistryRow
              label="Checklist shared with"
              value={formatServiceCode(
                service.requirement_group || service.service_code,
              )}
            />
          </dl>
        </TabsContent>
      </Tabs>

      {onEdit ? (
        <div className="flex flex-col gap-2.5 border-t border-border bg-card p-4">
          {docked ? (
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Kbd aria-hidden="true">{hotkeyLabel(NEXT_SERVICE_HOTKEY)}</Kbd>
              <Kbd aria-hidden="true">
                {hotkeyLabel(PREVIOUS_SERVICE_HOTKEY)}
              </Kbd>
              next or previous service
            </p>
          ) : null}
          <Button
            type="button"
            className="relative w-full"
            aria-keyshortcuts={EDIT_SERVICE_HOTKEY}
            onClick={() => onEdit(service)}
          >
            <Pencil aria-hidden="true" data-icon="inline-start" />
            {editLabel}
            <Kbd
              aria-hidden="true"
              className="absolute right-3 bg-white/20 text-current max-sm:hidden"
            >
              {hotkeyLabel(EDIT_SERVICE_HOTKEY)}
            </Kbd>
          </Button>
        </div>
      ) : null}
    </>
  );
}

function TabCount({ children }: { children: number }) {
  return (
    <span className="font-mono text-xs font-normal text-muted-foreground tabular-nums">
      {children}
    </span>
  );
}

function SectionLabel({
  children,
  count,
  icon,
}: {
  children: string;
  count: number;
  icon?: boolean;
}) {
  return (
    <span className="mb-1 flex items-center gap-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
      {icon ? <AlertTriangle aria-hidden="true" className="size-3.5" /> : null}
      {children}
      <span className="rounded-full bg-muted px-1.5 font-mono text-xs font-normal tracking-normal tabular-nums">
        {count}
      </span>
    </span>
  );
}

function RequirementRow({
  requirement,
  optional = false,
}: {
  requirement: ServiceRequirement;
  optional?: boolean;
}) {
  const { primary, secondary } = parseRequirementName(
    requirement.requirement_name,
  );
  const source = requirement.where_to_secure ?? secondary;
  return (
    <li className="flex gap-3 py-2.5">
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 grid size-4 shrink-0 place-items-center rounded-[4px] border-[1.5px]",
          optional
            ? "border-dashed border-muted-foreground/60"
            : "border-primary text-primary",
        )}
      >
        {optional ? null : <Check className="size-2.5 stroke-[3]" />}
      </span>
      <div className="min-w-0">
        <p className="text-sm leading-snug font-medium text-foreground">
          {primary}
        </p>
        {source ? (
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
            {source}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function RegistryRow({
  label,
  value,
  empty,
}: {
  label: string;
  value: string | null | undefined;
  empty?: string;
}) {
  return (
    <div className="flex justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "min-w-0 text-right",
          value ? "font-medium text-foreground" : "text-muted-foreground",
        )}
      >
        {value || empty}
      </dd>
    </div>
  );
}
