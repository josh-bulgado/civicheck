import { useRef, type Ref } from "react";
import {
  Check,
  Copy,
  Lock,
  MoreHorizontal,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import type { ConditionSource } from "~/features/forms/components/ConditionRuleBuilder";
import {
  EDITOR_ROW_MENU_TRIGGER,
} from "~/features/forms/components/EditorSheetParts";
import { requirementChips, splitRequirementTitle } from "../requirement-chips";
import type {
  RequirementScope,
  RequirementScopeKind,
} from "../requirement-scope";
import type { RequirementValue } from "./RequirementSheet";

/** One checklist row plus where it sits in the field array and its scope. */
export interface RequirementEntry {
  id: string;
  /** Real field-array index, never the position inside a filtered list. */
  index: number;
  value: RequirementValue;
  scope: RequirementScope;
}

interface RequirementsTableProps {
  /** The table wrapper, so the section can find a row's button by index. */
  ref?: Ref<HTMLDivElement>;
  entries: RequirementEntry[];
  /** True for kinds that cannot be edited until the group is unlocked. */
  locked: (kind: RequirementScopeKind) => boolean;
  onOpen: (index: number, opener: HTMLElement) => void;
  /** Only supplied when the group has routing, so an override is meaningful. */
  onOverride?: (index: number) => void;
  onRemove: (index: number) => void;
  conditionSources: ConditionSource[];
}

/** The two lines inside the first cell: bold title, muted detail. */
function RequirementCellText({
  title,
  detail,
  noFile,
}: {
  title: string;
  detail: string | null;
  noFile: boolean;
}) {
  return (
    <>
      <span className="flex min-w-0 items-baseline gap-2">
        <span className="truncate text-sm font-semibold text-foreground group-hover/req:underline">
          {title}
        </span>
        {noFile ? (
          <span className="shrink-0 text-xs text-muted-foreground">
            No file
          </span>
        ) : null}
      </span>
      {detail ? (
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {detail}
        </span>
      ) : null}
    </>
  );
}

function RequirementTableRow({
  entry,
  isLocked,
  onOpen,
  onOverride,
  onRemove,
  conditionSources,
}: {
  entry: RequirementEntry;
  isLocked: boolean;
  onOpen: RequirementsTableProps["onOpen"];
  onOverride?: (index: number) => void;
  onRemove: (index: number) => void;
  conditionSources: ConditionSource[];
}) {
  const { index, value, scope } = entry;
  const openerRef = useRef<HTMLButtonElement>(null);
  const fullName = value.requirement_name?.trim() || "Untitled requirement";
  const { title, detail } = splitRequirementTitle(value.requirement_name ?? "");
  const noFile = !(value.requires_upload ?? true);
  const chips = requirementChips(
    {
      appliesWhen: value.applies_when ?? null,
      uploadScope: value.upload_scope ?? "request",
      subjectRole: value.subject_role ?? null,
    },
    conditionSources,
  );
  // Only a Shared row can be overridden; "Other" rows belong to another variant.
  const canOverride = scope.kind === "inherited" && Boolean(onOverride);
  const lockLabel =
    scope.kind === "other"
      ? "Applies to other variants. Unlock to edit."
      : "Shared with other variants. Unlock to edit.";

  return (
    <TableRow className="focus-within:bg-muted/50">
      <TableCell className="px-3.5 py-2">
        {isLocked ? (
          <div className="block min-w-0 py-1" title={fullName}>
            <RequirementCellText title={title} detail={detail} noFile={noFile} />
          </div>
        ) : (
          <button
            ref={openerRef}
            type="button"
            data-requirement-opener={index}
            title={fullName}
            onClick={(event) => onOpen(index, event.currentTarget)}
            className="group/req -mx-2 block min-h-11 w-[calc(100%+1rem)] min-w-0 rounded-md px-2 py-1 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <RequirementCellText title={title} detail={detail} noFile={noFile} />
          </button>
        )}
      </TableCell>

      <TableCell className="px-3.5 py-2">
        {chips.condition || chips.person ? (
          <div className="flex min-w-0 items-center gap-1.5">
            {chips.condition ? (
              <Badge variant="info" className="min-w-0">
                <span className="truncate">{chips.condition}</span>
              </Badge>
            ) : null}
            {chips.person ? (
              <Badge variant="neutral" className="min-w-0">
                <span className="truncate">{chips.person}</span>
              </Badge>
            ) : null}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Everyone</span>
        )}
      </TableCell>

      <TableCell className="px-3.5 py-2">
        <div className="flex items-center justify-between gap-1.5">
          {value.is_mandatory ? (
            <span className="inline-flex text-tone-success">
              <Check aria-hidden="true" className="size-4" />
              <span className="sr-only">Required</span>
            </span>
          ) : (
            <Badge variant="warning">Optional</Badge>
          )}
          <div className="flex items-center">
            {isLocked ? (
              <span
                role="img"
                aria-label={lockLabel}
                title={lockLabel}
                className="flex size-9 items-center justify-center text-muted-foreground"
              >
                <Lock aria-hidden="true" className="size-4" />
              </span>
            ) : null}
            {/* Locked rows keep Override (copy to this variant) but lose
                Configure and Remove, which would edit the shared checklist. */}
            {!isLocked || canOverride ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  nativeButton
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={EDITOR_ROW_MENU_TRIGGER}
                      aria-label={`Actions for ${fullName}`}
                    />
                  }
                >
                  <MoreHorizontal aria-hidden="true" className="fill-current" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" variant="roomy">
                  {!isLocked ? (
                    <DropdownMenuItem
                      onClick={() => {
                        const opener = openerRef.current;
                        if (opener) onOpen(index, opener);
                      }}
                    >
                      <SlidersHorizontal
                        aria-hidden="true"
                        className="text-muted-foreground"
                      />
                      Configure
                    </DropdownMenuItem>
                  ) : null}
                  {/* Only Shared rows can be overridden; the item stays, dimmed,
                      on the others so the menu reads the same on every row. */}
                  {onOverride ? (
                    <DropdownMenuItem
                      disabled={!canOverride}
                      onClick={() => onOverride(index)}
                    >
                      <Copy
                        aria-hidden="true"
                        className="text-muted-foreground"
                      />
                      Override for this variant
                    </DropdownMenuItem>
                  ) : null}
                  {!isLocked ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onRemove(index)}
                      >
                        <Trash2 aria-hidden="true" />
                        Remove
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function RequirementsTable({
  ref,
  entries,
  locked,
  onOpen,
  onOverride,
  onRemove,
  conditionSources,
}: RequirementsTableProps) {
  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-xl border border-border bg-background"
    >
      <Table className="min-w-[40rem] table-fixed">
        <TableHeader>
          <TableRow className="bg-surface-subtle hover:bg-surface-subtle">
            <TableHead className="px-3.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Requirement
            </TableHead>
            <TableHead className="w-64 px-3.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Applies to
            </TableHead>
            <TableHead className="w-40 px-3.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Required
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <RequirementTableRow
              key={entry.id}
              entry={entry}
              isLocked={locked(entry.scope.kind)}
              onOpen={onOpen}
              onOverride={onOverride}
              onRemove={onRemove}
              conditionSources={conditionSources}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
