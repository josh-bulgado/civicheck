import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check } from "lucide-react";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Spinner } from "~/components/ui/spinner";
import { cn } from "~/lib/utils";
import { SERVICE_EDITOR_SECTIONS } from "./service-form.config";

type EditorMode = "full" | "variant";

const VARIANT_EDITOR_SECTIONS = SERVICE_EDITOR_SECTIONS.filter(
  (section) =>
    section.id !== "case-questions" && section.id !== "application-form",
);

export function ServiceDossierNavigation({
  mode = "full",
}: {
  mode?: EditorMode;
}) {
  const editorSections =
    mode === "variant" ? VARIANT_EDITOR_SECTIONS : SERVICE_EDITOR_SECTIONS;
  const [activeSection, setActiveSection] = useState<string>(
    editorSections[0].id,
  );

  useEffect(() => {
    const sections = editorSections.map(({ id }) =>
      document.getElementById(id),
    ).filter((section): section is HTMLElement => section !== null);
    let animationFrame: number | null = null;

    const updateActiveSection = () => {
      if (animationFrame !== null) return;

      animationFrame = window.requestAnimationFrame(() => {
        const marker = Math.min(window.innerHeight * 0.28, 240);
        let nextSection = sections[0]?.id ?? editorSections[0].id;

        for (const section of sections) {
          if (section.getBoundingClientRect().top > marker) break;
          nextSection = section.id;
        }

        const atPageEnd =
          window.scrollY + window.innerHeight >=
          document.documentElement.scrollHeight - 2;
        if (atPageEnd) {
          nextSection = editorSections.at(-1)?.id ?? nextSection;
        }

        setActiveSection((current) =>
          current === nextSection ? current : nextSection,
        );
        animationFrame = null;
      });
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [editorSections]);

  const activeIndex = editorSections.findIndex(
    ({ id }) => id === activeSection,
  );
  const lineProgress =
    activeIndex / Math.max(editorSections.length - 1, 1);

  return (
    <nav aria-label="Service editor sections">
      <ol className="relative flex flex-col gap-1">
        <span
          aria-hidden="true"
          className="absolute bottom-4 left-[0.4375rem] top-4 w-px bg-border"
        />
        <span
          aria-hidden="true"
          className="absolute bottom-4 left-[0.4375rem] top-4 w-px origin-top bg-primary transition-transform duration-300 ease-out motion-reduce:transition-none"
          style={{ transform: `scaleY(${lineProgress})` }}
        />

        {editorSections.map((section, index) => {
          const isCurrent = index === activeIndex;
          const isComplete = index < activeIndex;

          return (
            <li key={section.id} className="relative">
              <a
                href={`#${section.id}`}
                aria-current={isCurrent ? "location" : undefined}
                className={cn(
                  "flex min-w-0 items-center gap-3 rounded-md py-1.5 text-sm hover:bg-muted",
                  isCurrent
                    ? "font-semibold text-primary"
                    : isComplete
                      ? "text-foreground"
                      : "text-muted-foreground",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "relative flex size-3.5 shrink-0 items-center justify-center rounded-full border bg-card",
                    isCurrent
                      ? "border-primary ring-4 ring-primary-soft"
                      : isComplete
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border-strong",
                  )}
                >
                  {isComplete ? (
                    <Check className="size-2.5" />
                  ) : isCurrent ? (
                    <span className="size-1.5 rounded-full bg-primary" />
                  ) : null}
                </span>
                <span
                  className={cn(
                    "min-w-0 px-1",
                    isCurrent && "rounded bg-primary-soft px-2 py-1",
                  )}
                >
                  {section.label}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

interface ServiceDossierHeaderProps {
  isEdit: boolean;
  serviceCode: string;
  mode?: EditorMode;
  displayGroup?: string | null;
}

export function ServiceDossierHeader({
  isEdit,
  serviceCode,
  mode = "full",
  displayGroup = null,
}: ServiceDossierHeaderProps) {
  const isVariant = mode === "variant";
  const heading = isVariant
    ? "Edit Internal Variant"
    : isEdit
      ? "Edit Service"
      : "Register a Service";
  const description = isVariant
    ? "Update this internal registry record. The checklist section identifies when requirements are shared, while the group-wide applicant application is managed separately."
    : isEdit
      ? "Update the registry record, citizen-facing questions, application form, and requirements in one place."
      : "Build one complete registry record from the charter entry, including its public process, application form, and checklist.";
  const editorSections = isVariant
    ? VARIANT_EDITOR_SECTIONS
    : SERVICE_EDITOR_SECTIONS;

  return (
    <header className="px-1 pt-1">
      <div className="flex items-center justify-between gap-3 pb-3">
        {isVariant && displayGroup ? (
          <Link
            to="/admin/services/groups/$displayGroup"
            params={{ displayGroup }}
            search={{ scope: undefined }}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Service group
          </Link>
        ) : (
          <Link
            to="/admin/services"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Services Registry
          </Link>
        )}
        <p className="font-mono text-xs text-muted-foreground">
          Service dossier
        </p>
      </div>

      <div className="grid gap-6 border-y py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:py-7">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
            Citizen&rsquo;s Charter
          </p>
          <h1 className="text-pretty text-3xl font-bold tracking-[-0.03em] text-foreground sm:text-4xl">
            {heading}
          </h1>
          <p className="mt-3 max-w-3xl text-pretty text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="min-w-0 sm:max-w-56 sm:text-right">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
            {isVariant ? "Internal variant" : "Registry record"}
          </p>
          <p className="mt-1 break-words font-mono text-lg font-semibold leading-tight text-primary sm:text-xl">
            {serviceCode}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-3 text-xs text-muted-foreground">
        <span>{isVariant ? "Variant-specific record" : "Complete service record"}</span>
        <span>{editorSections.length} dossier sections</span>
      </div>
    </header>
  );
}

interface ServiceFormSidebarProps {
  isEdit: boolean;
  isSaving: boolean;
  isDisabled: boolean;
  mode?: EditorMode;
  displayGroup?: string | null;
}

export function ServiceFormSidebar({
  isEdit,
  isSaving,
  isDisabled,
  mode = "full",
  displayGroup = null,
}: ServiceFormSidebarProps) {
  const isVariant = mode === "variant";
  return (
    <aside className="lg:sticky lg:top-6">
      <Card className="border-primary/15 shadow-sm">
        <CardHeader className="border-b">
          <CardTitle>
            <h2>{isVariant ? "Internal Variant" : "Service Dossier"}</h2>
          </CardTitle>
          <CardDescription>
            {isVariant
              ? "Only this service code is changed here."
              : "Your place in the record updates as you move through it."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <ServiceDossierNavigation mode={mode} />

          <div className="flex flex-col gap-2 border-t border-border pt-5">
            <Button
              type="submit"
              aria-live="polite"
              disabled={isDisabled}
            >
              {isSaving ? (
                <>
                  <Spinner data-icon="inline-start" />
                  {isVariant
                    ? "Saving Variant…"
                    : isEdit
                      ? "Saving & Publishing…"
                      : "Creating & Publishing…"}
                </>
              ) : isVariant ? (
                "Save Variant"
              ) : isEdit ? (
                "Save & Publish"
              ) : (
                "Create & Publish"
              )}
            </Button>
            {isVariant && displayGroup ? (
              <Link
                to="/admin/services/groups/$displayGroup"
                params={{ displayGroup }}
                search={{ scope: undefined }}
                className={cn(buttonVariants({ variant: "outline" }), "w-full")}
              >
                Cancel
              </Link>
            ) : (
              <Link
                to="/admin/services"
                className={cn(buttonVariants({ variant: "outline" }), "w-full")}
              >
                Cancel
              </Link>
            )}
            <p className="text-pretty text-xs leading-5 text-muted-foreground">
              {isVariant
                ? "The shared application form is not published from this editor."
                : "Publishing activates an immutable application-form version."}
            </p>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}
