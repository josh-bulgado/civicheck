import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";
import type { SecurityFinding } from "../system-admin.types";

function ResolutionForm({
  finding,
  isPending,
  onClose,
  onResolve,
}: {
  finding: SecurityFinding;
  isPending: boolean;
  onClose: () => void;
  onResolve: (resolution: string) => Promise<boolean>;
}) {
  const [resolution, setResolution] = useState("");

  async function handleResolve() {
    if (await onResolve(resolution.trim())) onClose();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Resolve security finding?</DialogTitle>
        <DialogDescription>
          Record how “{finding.title}” was addressed. Do not include citizen,
          case, document, or credential data.
        </DialogDescription>
      </DialogHeader>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="security-resolution-note">
            Resolution note
          </FieldLabel>
          <Textarea
            id="security-resolution-note"
            value={resolution}
            onChange={(event) => setResolution(event.target.value)}
            placeholder="Describe the security action completed"
            aria-describedby="security-resolution-guidance"
          />
          <p
            id="security-resolution-guidance"
            className="text-xs text-muted-foreground"
          >
            Minimum 10 characters. This note is retained with the finding.
          </p>
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button variant="outline" disabled={isPending} onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={isPending || resolution.trim().length < 10}
          onClick={() => void handleResolve()}
        >
          {isPending ? (
            <>
              <Spinner data-icon="inline-start" />
              Resolving
            </>
          ) : (
            "Resolve finding"
          )}
        </Button>
      </DialogFooter>
    </>
  );
}

export function ResolveSecurityFindingDialog({
  finding,
  isPending,
  onOpenChange,
  onResolve,
}: {
  finding: SecurityFinding | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onResolve: (resolution: string) => Promise<boolean>;
}) {
  return (
    <Dialog open={finding !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        {finding ? (
          <ResolutionForm
            key={finding.id}
            finding={finding}
            isPending={isPending}
            onClose={() => onOpenChange(false)}
            onResolve={onResolve}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
