import type { ReactNode, Ref } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, CircleAlert, Save, type LucideIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { IconTile } from "~/components/ui/icon-tile";
import { Spinner } from "~/components/ui/spinner";
import { TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { formatServiceCode } from "~/features/services/service-utils";
import { cn } from "~/lib/utils";

type EditorMode = "full" | "variant" | "group";

interface ServiceDossierHeaderProps {
  isEdit: boolean;
  serviceCode: string;
  serviceName?: string;
  applicationVersion: number;
  applicationLoading: boolean;
  mode?: EditorMode;
  displayGroup?: string | null;
  children: ReactNode;
}

export function ServiceDossierHeader({
  isEdit,
  serviceCode,
  serviceName,
  applicationVersion,
  applicationLoading,
  mode = "full",
  displayGroup = null,
  children,
}: ServiceDossierHeaderProps) {
  const isVariant = mode === "variant";
  const isGroup = mode === "group";
  const backClassName = cn(
    buttonVariants({ variant: "outline", size: "icon" }),
    "size-11 shrink-0 rounded-full",
  );

  return (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-3 bg-background px-4 pt-5 pb-3 sm:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        {(isVariant || isGroup) && displayGroup ? (
          <Link
            to="/admin/services/groups/$displayGroup"
            params={{ displayGroup }}
            search={{ scope: undefined }}
            className={backClassName}
            aria-label="Back to service group"
          >
            <ArrowLeft aria-hidden="true" />
          </Link>
        ) : (
          <Link
            to="/admin/services"
            className={backClassName}
            aria-label="Back to services registry"
          >
            <ArrowLeft aria-hidden="true" />
          </Link>
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>Services Registry</span>
            <span aria-hidden="true">/</span>
            <span>
              {isGroup
                ? "Edit Shared Application"
                : isVariant
                  ? "Edit Variant"
                  : isEdit
                    ? "Edit Service"
                    : "New Service"}
            </span>
            <span aria-hidden="true" className="hidden sm:inline">
              ·
            </span>
            <span translate="no" className="hidden font-mono sm:inline">
              {isGroup ? displayGroup : formatServiceCode(serviceCode)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-pretty text-lg font-semibold tracking-tight sm:text-xl">
              {serviceName || (isEdit ? "Edit Service" : "Register a Service")}
            </h1>
            {isVariant ? (
              <Badge variant="neutral">Variant Record</Badge>
            ) : applicationLoading ? (
              <Badge variant="neutral">Loading…</Badge>
            ) : applicationVersion > 0 ? (
              <Badge variant="success">
                Application v{applicationVersion} Live
              </Badge>
            ) : (
              <Badge variant="warning">Application Not Published</Badge>
            )}
          </div>
        </div>
      </div>
      {children}
    </header>
  );
}

interface ServiceEditorTabBarProps {
  tabs: readonly { id: string; label: string; icon: LucideIcon }[];
  label: string;
  /** Tabs whose section has errors get a "Needs attention" mark. */
  invalidIds?: ReadonlySet<string>;
  listRef?: Ref<HTMLDivElement>;
}

/** The underline section bar under the header; render it inside `<Tabs>`. */
export function ServiceEditorTabBar({
  tabs,
  label,
  invalidIds,
  listRef,
}: ServiceEditorTabBarProps) {
  return (
    <div className="shrink-0 border-b border-border bg-background px-4 pb-3 sm:px-8">
      <TabsList
        ref={listRef}
        variant="editor"
        className="w-full"
        aria-label={label}
      >
        {tabs.map(({ id, label: tabLabel, icon: Icon }) => (
          <TabsTrigger key={id} value={id} className="gap-2">
            <Icon aria-hidden="true" />
            <span>{tabLabel}</span>
            {invalidIds?.has(id) ? (
              <CircleAlert
                aria-label="Needs attention"
                className="text-destructive"
              />
            ) : null}
          </TabsTrigger>
        ))}
      </TabsList>
    </div>
  );
}

interface ServiceEditorSectionProps {
  id: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  summary?: string;
  hasError?: boolean;
  /** Off when the body opens with its own block (a field) rather than a divided band. */
  headerDivider?: boolean;
  children: ReactNode;
}

export function ServiceEditorSection({
  id,
  icon: Icon,
  title,
  description,
  summary,
  hasError = false,
  headerDivider = true,
  children,
}: ServiceEditorSectionProps) {
  return (
    <TabsContent
      value={id}
      keepMounted
      className="min-w-0 data-[hidden]:hidden"
    >
      <Card id={id} variant="soft" className="min-w-0 gap-0 py-0">
        <CardHeader
          className={cn("py-6 sm:px-8", headerDivider ? "border-b" : "pb-5")}
        >
          <div className="flex flex-wrap items-start gap-3">
            <IconTile icon={Icon} />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-xl font-semibold tracking-tight">
                  <h2 className="text-pretty">{title}</h2>
                </CardTitle>
                {hasError ? (
                  <Badge variant="destructive">Needs Attention</Badge>
                ) : summary ? (
                  <Badge variant="neutral">{summary}</Badge>
                ) : null}
              </div>
              {description ? (
                <CardDescription className="max-w-[62ch]">
                  {description}
                </CardDescription>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 py-6 [&>[data-slot=card]]:py-0 [&>[data-slot=card]>[data-slot=card-content]]:sm:px-8">
          {children}
        </CardContent>
      </Card>
    </TabsContent>
  );
}

interface ServiceFormActionBarProps {
  isEdit: boolean;
  isSaving: boolean;
  isDisabled: boolean;
  isDirty: boolean;
  mode?: EditorMode;
  displayGroup?: string | null;
}

export function ServiceFormActionBar({
  isEdit,
  isSaving,
  isDisabled,
  isDirty,
  mode = "full",
  displayGroup = null,
}: ServiceFormActionBarProps) {
  const isVariant = mode === "variant";
  const isGroup = mode === "group";
  const cancelClassName = cn(
    buttonVariants({ variant: "outline", size: "lg" }),
  );

  return (
    <div
      className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto"
      role="region"
      aria-label="Service editor actions"
    >
      <p
        className="mr-auto flex items-center gap-2 text-xs text-muted-foreground sm:mr-3"
        aria-live="polite"
      >
        <span
          aria-hidden="true"
          className={cn(
            "size-2 shrink-0 rounded-full",
            isSaving
              ? "bg-tone-progress"
              : isDirty
                ? "bg-tone-warning"
                : "bg-tone-success",
          )}
        />
        {isSaving
          ? "Saving changes…"
          : isDirty
            ? "Unsaved changes"
            : "No unsaved changes"}
      </p>
      {(isVariant || isGroup) && displayGroup ? (
        <Link
          to="/admin/services/groups/$displayGroup"
          params={{ displayGroup }}
          search={{ scope: undefined }}
          className={cancelClassName}
        >
          Cancel
        </Link>
      ) : (
        <Link to="/admin/services" className={cancelClassName}>
          Cancel
        </Link>
      )}
      <Button type="submit" variant="raised" size="lg" disabled={isDisabled}>
        {isSaving ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <Save aria-hidden="true" data-icon="inline-start" />
        )}
        {isSaving
          ? "Saving…"
          : isVariant
            ? "Save Variant"
            : isEdit
              ? "Save & Publish"
              : "Create & Publish"}
      </Button>
    </div>
  );
}

interface DiscardChangesDialogProps {
  open: boolean;
  /** What the admin is leaving, such as "the service editor". */
  subject: string;
  onKeepEditing: () => void;
  onDiscard: () => void;
}

/** Asks before navigation drops an editor's unsaved changes. */
export function DiscardChangesDialog({
  open,
  subject,
  onKeepEditing,
  onDiscard,
}: DiscardChangesDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && open) onKeepEditing();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
          <AlertDialogDescription>
            If you leave {subject} now, your unsaved changes will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep editing</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onDiscard}>
            Discard and leave
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
