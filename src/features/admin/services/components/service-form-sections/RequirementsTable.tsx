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
import { cn } from "~/lib/utils";
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
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="min-w-0 break-words text-sm leading-5 font-semibold text-foreground group-hover/req:underline">
          {title}
        </span>
        {noFile ? (
          <span className="shrink-0 text-xs text-muted-foreground">
            No file
          </span>
        ) : null}
      </span>
      {detail ? (
        <span className="mt-0.5 block break-words text-xs leading-5 text-muted-foreground">
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
    <TableRow className="grid grid-cols-[minmax(0,1fr)_8.5rem] focus-within:bg-muted/50 md:table-row">
      <TableCell className="col-start-1 row-start-1 block min-w-0 px-3 py-3 whitespace-normal md:table-cell md:px-3.5 md:py-2">
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

      <TableCell className="col-start-1 row-start-2 block min-w-0 px-3 pt-0 pb-3 whitespace-normal md:table-cell md:px-3.5 md:py-2">
        {chips.condition || chips.person ? (
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="mr-0.5 text-xs font-medium tracking-wide text-muted-foreground uppercase md:hidden">
              {"Applies to: "}
            </span>
            {chips.condition ? (
              <Badge
                variant="info"
                className="h-auto min-h-5 max-w-full min-w-0 whitespace-normal"
              >
                <span className="break-words">{chips.condition}</span>
              </Badge>
            ) : null}
            {chips.person ? (
              <Badge
                variant="neutral"
                className="h-auto min-h-5 max-w-full min-w-0 whitespace-normal"
              >
                <span className="break-words">{chips.person}</span>
              </Badge>
            ) : null}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">
            <span className="mr-1 text-xs font-medium tracking-wide uppercase md:hidden">
              {"Applies to: "}
            </span>
            Everyone
          </span>
        )}
      </TableCell>

      <TableCell className="col-start-2 row-span-2 row-start-1 block px-2 py-3 whitespace-normal md:table-cell md:px-3.5 md:py-2">
        <div className="flex flex-col items-end gap-2 md:flex-row md:items-center md:justify-between md:gap-1.5">
          {value.is_mandatory ? (
            <Badge variant="success">
              <Check aria-hidden="true" data-icon="inline-start" />
              Required
            </Badge>
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
                      className={cn(EDITOR_ROW_MENU_TRIGGER, "size-11")}
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
      <Table className="table-fixed">
        <TableHeader className="hidden md:table-header-group">
          <TableRow className="bg-surface-subtle hover:bg-surface-subtle">
            <TableHead className="px-3.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Requirement
            </TableHead>
            <TableHead className="w-52 px-3.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Applies to
            </TableHead>
            <TableHead className="w-36 px-3.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Status
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="block md:table-row-group">
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
