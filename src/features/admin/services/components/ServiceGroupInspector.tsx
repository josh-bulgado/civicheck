import { useId, useState, type FormEvent, type Ref } from "react";
import { QuietLink as Link } from "~/components/quiet-link";
import {
  ArrowUpRight,
  ChevronRight,
  GitBranch,
  ListChecks,
  Undo2,
  type LucideIcon,
  SlidersHorizontal,
} from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "~/components/ui/input-group";
import { Label } from "~/components/ui/label";
import { formatServiceCode } from "~/features/services/service-utils";
import { cn } from "~/lib/utils";
import { useUpdateService } from "../hooks/useUpdateService";
import {
  checklistSharedCount,
  evaluateDraft,
  isFeeItemized,
  type VariantDraft,
} from "../service-group-workbench.utils";
import type { Service } from "../services.types";

interface ServiceGroupInspectorProps {
  variant: Service;
  variants: Service[];
  draft: VariantDraft | undefined;
  onDraftChange: (patch: VariantDraft) => void;
  onDiscard: () => void;
  onSaved: () => void;
  feeInputRef: Ref<HTMLInputElement>;
}

/**
 * Edits the three things admins change most (name, fee, processing time) in
 * place, and links to the full editor sections for everything else. Drafts live
 * in the parent so stepping to another variant does not throw typing away.
 */
export function ServiceGroupInspector({
  variant,
  variants,
  draft,
  onDraftChange,
  onDiscard,
  onSaved,
  feeInputRef,
}: ServiceGroupInspectorProps) {
  const ids = useId();
  const { mutate, status, error } = useUpdateService();
  const [showErrors, setShowErrors] = useState(false);

  const evaluation = evaluateDraft(variant, draft);
  const itemized = isFeeItemized(variant);
  const saving = status === "pending";
  const sharedCount = checklistSharedCount(variant, variants);

  const nameError = showErrors ? evaluation.errors.name : undefined;
  const feeError = showErrors ? evaluation.errors.fee : undefined;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!evaluation.dirty || saving) return;
    if (evaluation.errors.name || evaluation.errors.fee) {
      setShowErrors(true);
      return;
    }
    const saved = await mutate({
      data: {
        service_code: variant.service_code,
        updates: evaluation.updates,
      },
    });
    if (saved) {
      setShowErrors(false);
      onSaved();
    }
  }

  function handleDiscard() {
    setShowErrors(false);
    onDiscard();
  }

  const editParams = { serviceCode: variant.service_code };

  return (
    <form
      onSubmit={handleSubmit}
      aria-labelledby={`${ids}-title`}
      className="flex flex-col"
    >
      <div className="flex flex-col gap-2 border-b border-border-light px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-semibold text-primary">
            {formatServiceCode(variant.service_code)}
          </span>
          <Link
            to="/admin/services/$serviceCode/edit"
            params={editParams}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Full editor
            <ArrowUpRight aria-hidden="true" data-icon="inline-end" />
          </Link>
        </div>
        <h2
          id={`${ids}-title`}
          className="text-pretty text-base leading-snug font-semibold text-foreground"
        >
          {variant.name}
        </h2>
      </div>

      <div className="flex flex-col gap-4 px-5 py-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${ids}-name`}>Internal name</Label>
          <Input
            id={`${ids}-name`}
            fieldSize="lg"
            value={draft?.name ?? variant.name}
            onChange={(event) => onDraftChange({ name: event.target.value })}
            aria-invalid={nameError ? true : undefined}
            aria-describedby={nameError ? `${ids}-name-error` : undefined}
          />
          {nameError ? (
            <p id={`${ids}-name-error`} className="text-xs text-destructive">
              {nameError}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${ids}-fee`}>Fee</Label>
            <InputGroup fieldSize="lg">
              <InputGroupAddon aria-hidden="true">₱</InputGroupAddon>
              <InputGroupInput
                id={`${ids}-fee`}
                ref={feeInputRef}
                inputMode="decimal"
                className="tabular-nums"
                value={draft?.fee ?? Number(variant.fee).toFixed(2)}
                onChange={(event) => onDraftChange({ fee: event.target.value })}
                onFocus={(event) => event.currentTarget.select()}
                disabled={itemized}
                aria-invalid={feeError ? true : undefined}
                aria-describedby={`${ids}-fee-hint`}
              />
            </InputGroup>
            <p
              id={`${ids}-fee-hint`}
              className={cn(
                "text-xs",
                feeError ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {feeError ??
                (itemized ? (
                  <>
                    Set by the fee breakdown.{" "}
                    <Link
                      to="/admin/services/$serviceCode/edit"
                      params={editParams}
                      hash="registry-details"
                      className="font-medium text-primary underline underline-offset-2"
                    >
                      Change it in the full editor
                    </Link>
                    .
                  </>
                ) : variant.fee_per_copy ? (
                  "Charged per copy. 0.00 shows as Free."
                ) : (
                  "0.00 shows as Free."
                ))}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${ids}-time`}>Processing time</Label>
            <Input
              id={`${ids}-time`}
              fieldSize="lg"
              value={draft?.processing_time ?? variant.processing_time}
              onChange={(event) =>
                onDraftChange({ processing_time: event.target.value })
              }
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <InspectorLink
            icon={ListChecks}
            title="Requirements"
            hash="requirements"
            params={editParams}
            detail={
              sharedCount > 1
                ? `Shared with ${sharedCount} variants. Edits apply to all of them.`
                : "Used by this variant only."
            }
          />
          <InspectorLink
            icon={GitBranch}
            title="Relationships"
            hash="relationships"
            params={editParams}
            detail="Related services and prerequisites."
          />
          <InspectorLink
            icon={SlidersHorizontal}
            title="Other settings"
            hash="registry-details"
            params={editParams}
            detail="Fee breakdown, copies and registry fields."
          />
        </div>
      </div>

      <div className="flex min-h-14 items-center gap-2 border-t border-border-light bg-muted/50 px-5 py-3 text-sm">
        {status === "error" && error ? (
          <p role="alert" className="min-w-0 flex-1 text-xs text-destructive">
            {error.message || "Could not save. Try again."}
          </p>
        ) : evaluation.dirty ? (
          <Badge variant="warning">Unsaved changes</Badge>
        ) : (
          <span className="text-muted-foreground">No changes</span>
        )}
        {evaluation.dirty ? (
          <div className="ml-auto flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDiscard}
              disabled={saving}
            >
              <Undo2 aria-hidden="true" data-icon="inline-start" />
              Revert
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving" : "Save changes"}
            </Button>
          </div>
        ) : null}
      </div>
    </form>
  );
}

function InspectorLink({
  icon: Icon,
  title,
  detail,
  hash,
  params,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  hash: string;
  params: { serviceCode: string };
}) {
  return (
    <Link
      to="/admin/services/$serviceCode/edit"
      params={params}
      hash={hash}
      className="flex items-center gap-3 rounded-lg border border-border-light px-3 py-2.5 transition-colors hover:border-border hover:bg-muted"
    >
      <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">
          {title}
        </span>
        <span className="block text-xs text-muted-foreground">{detail}</span>
      </span>
      <ChevronRight
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground"
      />
    </Link>
  );
}
