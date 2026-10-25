import { useMemo, useRef, useState } from "react";
import { QuietLink as Link } from "~/components/quiet-link";
import { useHotkeys } from "@tanstack/react-hotkeys";
import { ArrowLeft, ArrowRight, FileSliders, Search } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "~/components/ui/input-group";
import { Kbd } from "~/components/ui/kbd";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import {
  EDIT_SERVICE_HOTKEY,
  NEXT_SERVICE_HOTKEY,
  PREVIOUS_SERVICE_HOTKEY,
} from "~/features/services/components/ServiceInspector";
import {
  formatPesoFee,
  formatServiceCode,
} from "~/features/services/service-utils";
import { useHotkeyLabel } from "~/hooks/useHotkeyLabel";
import { cn } from "~/lib/utils";
import {
  filterVariants,
  summarizeVariants,
  evaluateDraft,
  type FeeFilter,
  type VariantDraft,
} from "../service-group-workbench.utils";
import { neighbourCode } from "../services-table.utils";
import type { Service } from "../services.types";
import { ServiceGroupInspector } from "./ServiceGroupInspector";

const SEARCH_HOTKEY = "/";

export function ServiceGroupPage({ variants }: { variants: Service[] }) {
  const hotkeyLabel = useHotkeyLabel();
  const orderedVariants = useMemo(
    () =>
      [...variants].sort((left, right) =>
        left.service_code.localeCompare(right.service_code),
      ),
    [variants],
  );
  const representative = orderedVariants[0];
  const groupKey = representative.display_group!;
  const displayName = representative.display_name ?? groupKey;
  const summary = useMemo(
    () => summarizeVariants(orderedVariants),
    [orderedVariants],
  );

  const [query, setQuery] = useState("");
  const [feeFilter, setFeeFilter] = useState<FeeFilter>("all");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, VariantDraft>>({});
  const searchRef = useRef<HTMLInputElement>(null);
  const feeInputRef = useRef<HTMLInputElement>(null);

  const visible = useMemo(
    () => filterVariants(orderedVariants, { query, fee: feeFilter }),
    [orderedVariants, query, feeFilter],
  );
  const visibleCodes = useMemo(
    () => visible.map((variant) => variant.service_code),
    [visible],
  );
  // Filtering the selected variant out of the list moves the panel to the
  // first one still showing, so it never edits something the admin can't see.
  const selected =
    visible.find((variant) => variant.service_code === selectedCode) ??
    visible[0] ??
    null;

  function select(code: string | null) {
    if (code) setSelectedCode(code);
  }

  // Plain keys are ignored while a field has focus, so typing in the search box
  // or the inspector is unaffected. Same keys as the Services Registry.
  useHotkeys([
    {
      hotkey: NEXT_SERVICE_HOTKEY,
      callback: () =>
        selected &&
        select(neighbourCode(visibleCodes, selected.service_code, 1)),
    },
    {
      hotkey: PREVIOUS_SERVICE_HOTKEY,
      callback: () =>
        selected &&
        select(neighbourCode(visibleCodes, selected.service_code, -1)),
    },
    {
      hotkey: "ArrowDown",
      callback: () =>
        selected &&
        select(neighbourCode(visibleCodes, selected.service_code, 1)),
    },
    {
      hotkey: "ArrowUp",
      callback: () =>
        selected &&
        select(neighbourCode(visibleCodes, selected.service_code, -1)),
    },
    {
      hotkey: SEARCH_HOTKEY,
      callback: () => searchRef.current?.focus(),
    },
    {
      hotkey: EDIT_SERVICE_HOTKEY,
      callback: () => feeInputRef.current?.focus(),
    },
  ]);

  function patchDraft(code: string, patch: VariantDraft) {
    setDrafts((current) => ({
      ...current,
      [code]: { ...current[code], ...patch },
    }));
  }

  function clearDraft(code: string) {
    setDrafts((current) => {
      const { [code]: _removed, ...rest } = current;
      return rest;
    });
  }

  const feeSummary = summary.fees.map((fee) => formatPesoFee(fee)).join(", ");

  return (
    <div className="dashboard-page max-w-7xl">
      <header className="flex flex-col gap-3 px-1 pt-1">
        <Link
          to="/admin/services"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Services Registry
        </Link>

        <div className="flex flex-col gap-2">
          <h1 className="max-w-3xl text-pretty text-2xl font-bold tracking-[-0.03em] text-foreground sm:text-3xl">
            {displayName}
          </h1>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary">Citizen&rsquo;s Charter</Badge>
            <Badge variant="info" className="font-mono uppercase">
              {groupKey}
            </Badge>
            <Badge variant="secondary">
              One public service, {summary.count} internal variants
            </Badge>
          </div>
        </div>

        <dl className="flex flex-wrap gap-x-7 gap-y-1 text-sm">
          <Fact label="Variants" value={String(summary.count)} />
          <Fact label="Fees" value={feeSummary} />
          <Fact
            label="Processing"
            value={
              summary.processingTimes.length === 1
                ? `${summary.processingTimes[0] || "Not set"} for all`
                : `${summary.processingTimes.length} different times`
            }
          />
          <Fact
            label="Checklist"
            value={
              summary.checklistCount === 1
                ? `Shared by all ${summary.count}`
                : `${summary.checklistCount} checklists`
            }
          />
        </dl>
      </header>

      <main className="mt-5 flex flex-col gap-4">
        <section
          aria-label="Shared application"
          className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-primary/20 bg-primary-tint/25 px-4 py-3"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <FileSliders aria-hidden="true" className="size-4.5" />
          </div>
          <div className="min-w-0 flex-1 basis-64">
            <p className="text-sm font-semibold text-foreground">
              Applicant application
            </p>
            <p className="text-sm text-muted-foreground">
              Shared by all {summary.count} variants: routing questions,
              conditional fields and the published template.
            </p>
          </div>
          <Link
            to="/admin/services/groups/$displayGroup"
            params={{ displayGroup: groupKey }}
            search={{ scope: "application" }}
            className={buttonVariants({ size: "lg" })}
          >
            Edit shared application
            <ArrowRight aria-hidden="true" data-icon="inline-end" />
          </Link>
        </section>

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <section
            aria-label="Internal variants"
            className="min-w-0 overflow-hidden rounded-xl border border-border-strong bg-card"
          >
            <div className="flex flex-wrap items-center gap-3 border-b border-border-light px-4 py-3">
              <InputGroup size="lg" className="min-w-48 max-w-80 flex-1">
                <InputGroupAddon>
                  <Search aria-hidden="true" />
                </InputGroupAddon>
                <InputGroupInput
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search variants"
                  aria-label="Search variants"
                />
                {query ? null : (
                  <InputGroupAddon align="inline-end">
                    <Kbd aria-hidden="true">{SEARCH_HOTKEY}</Kbd>
                  </InputGroupAddon>
                )}
              </InputGroup>
              <ToggleGroup
                value={[feeFilter]}
                onValueChange={(next) => {
                  // Clicking the active option would clear the group; keep one on.
                  const value = next[0] as FeeFilter | undefined;
                  if (value) setFeeFilter(value);
                }}
                variant="pill"
                size="lg"
                aria-label="Filter by fee"
              >
                <ToggleGroupItem value="all">
                  All {summary.count}
                </ToggleGroupItem>
                <ToggleGroupItem value="free">
                  Free {summary.freeCount}
                </ToggleGroupItem>
                <ToggleGroupItem value="paid">
                  Paid {summary.count - summary.freeCount}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {visible.length > 0 ? (
              <ul className="divide-y divide-border-light">
                {visible.map((variant) => {
                  const isSelected =
                    variant.service_code === selected?.service_code;
                  const edited = evaluateDraft(
                    variant,
                    drafts[variant.service_code],
                  ).dirty;
                  return (
                    <li key={variant.service_code}>
                      <button
                        type="button"
                        onClick={() => select(variant.service_code)}
                        aria-current={isSelected ? "true" : undefined}
                        className={cn(
                          "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-inset",
                          isSelected &&
                            "bg-primary-tint shadow-[inset_3px_0_0_var(--primary)] hover:bg-primary-tint",
                        )}
                      >
                        <span className="flex items-center gap-2 font-mono text-xs font-semibold text-primary">
                          {formatServiceCode(variant.service_code)}
                          {edited ? (
                            <Badge variant="warning">Edited</Badge>
                          ) : null}
                        </span>
                        <span className="row-span-2 col-start-2 row-start-1 text-right text-sm font-semibold tabular-nums">
                          {Number(variant.fee) === 0 ? (
                            <Badge variant="success">Free</Badge>
                          ) : (
                            formatPesoFee(variant.fee)
                          )}
                          {summary.processingTimes.length > 1 ? (
                            <span className="block text-xs font-normal text-muted-foreground">
                              {variant.processing_time || "Not set"}
                            </span>
                          ) : null}
                        </span>
                        <span className="text-sm leading-snug font-medium text-foreground">
                          {variant.name}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
                <p>No variants match{query ? ` "${query}"` : ""}.</p>
                <button
                  type="button"
                  className="font-medium text-primary underline underline-offset-3"
                  onClick={() => {
                    setQuery("");
                    setFeeFilter("all");
                  }}
                >
                  Clear search and filter
                </button>
              </div>
            )}
          </section>

          <aside
            aria-label="Variant details"
            className="min-w-0 overflow-hidden rounded-xl border border-border-strong bg-card xl:sticky xl:top-4"
          >
            {selected ? (
              <ServiceGroupInspector
                key={selected.service_code}
                variant={selected}
                variants={orderedVariants}
                draft={drafts[selected.service_code]}
                onDraftChange={(patch) =>
                  patchDraft(selected.service_code, patch)
                }
                onDiscard={() => clearDraft(selected.service_code)}
                onSaved={() => clearDraft(selected.service_code)}
                feeInputRef={feeInputRef}
              />
            ) : (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                Select a variant to edit its fee, processing time and checklist.
              </p>
            )}
          </aside>
        </div>

        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Kbd>{hotkeyLabel(PREVIOUS_SERVICE_HOTKEY)}</Kbd>
            <Kbd>{hotkeyLabel(NEXT_SERVICE_HOTKEY)}</Kbd>
            move
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Kbd>{SEARCH_HOTKEY}</Kbd>
            search
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Kbd>{hotkeyLabel(EDIT_SERVICE_HOTKEY)}</Kbd>
            edit fee
          </span>
        </p>
      </main>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold text-foreground">{value}</dd>
    </div>
  );
}
