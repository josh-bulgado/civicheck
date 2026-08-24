import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  FileSliders,
  GitBranch,
  Layers3,
  Pencil,
  PhilippinePeso,
} from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { formatFee } from "~/features/services/service-utils";
import { cn } from "~/lib/utils";
import type { Service } from "../services.types";

function requirementScope(variant: Service, variants: Service[]) {
  const key = variant.requirement_group ?? variant.service_code;
  const sharedCount = variants.filter(
    (candidate) =>
      (candidate.requirement_group ?? candidate.service_code) === key,
  ).length;
  return sharedCount > 1 ? `Shared by ${sharedCount}` : "Variant only";
}

export function ServiceGroupPage({ variants }: { variants: Service[] }) {
  const orderedVariants = [...variants].sort((left, right) =>
    left.service_code.localeCompare(right.service_code),
  );
  const representative = orderedVariants[0];
  const groupKey = representative.display_group!;
  const displayName = representative.display_name ?? groupKey;

  return (
    <div className="dashboard-page max-w-7xl">
      <header className="px-1 pt-1">
        <div className="flex items-center justify-between gap-3 pb-3">
          <Link
            to="/admin/services"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Services Registry
          </Link>
          <p className="font-mono text-xs text-muted-foreground">
            Grouped service dossier
          </p>
        </div>

        <div className="grid gap-6 border-y py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:py-7">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
              Citizen&rsquo;s Charter
            </p>
            <h1 className="text-pretty text-3xl font-bold tracking-[-0.03em] text-foreground sm:text-4xl">
              {displayName}
            </h1>
            <p className="mt-3 max-w-3xl text-pretty text-sm leading-6 text-muted-foreground">
              Manage the applicant-facing form once, then maintain fees,
              processing details, and checklist ownership for each internal
              variant separately.
            </p>
          </div>
          <div className="min-w-0 sm:max-w-64 sm:text-right">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              Display group
            </p>
            <p className="mt-1 break-words font-mono text-lg font-semibold leading-tight text-primary sm:text-xl uppercase">
              {groupKey}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 text-xs text-muted-foreground">
          <span>One public service</span>
          <span>{orderedVariants.length} internal variants</span>
        </div>
      </header>

      <main className="mt-6 flex flex-col gap-6">
        <section
          className="grid gap-4 lg:grid-cols-2"
          aria-label="Editing scopes"
        >
          <Card className="border-primary/20 bg-primary-tint/25 shadow-sm">
            <CardHeader className="border-b border-primary/10">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <FileSliders aria-hidden="true" className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                    Shared across the group
                  </p>
                  <CardTitle className="mt-1">Applicant application</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <p className="text-sm leading-6 text-muted-foreground">
                Edit routing questions, conditional fields, and the published
                application template used by all {orderedVariants.length}{" "}
                variants.
              </p>
              <Link
                to="/admin/services/groups/$displayGroup"
                params={{ displayGroup: groupKey }}
                search={{ scope: "application" }}
                className={cn(buttonVariants(), "w-fit")}
              >
                Edit shared application
                <ArrowRight aria-hidden="true" data-icon="inline-end" />
              </Link>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="border-b">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                  <GitBranch aria-hidden="true" className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Managed per variant
                  </p>
                  <CardTitle className="mt-1">Internal records</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <p className="text-sm leading-6 text-muted-foreground">
                Choose the exact service code before changing its internal name,
                fee, processing time, roles, relationships, or checklist.
              </p>
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Layers3 aria-hidden="true" className="size-4 text-primary" />
                {orderedVariants.length} records available below
              </div>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Select before editing
                </p>
                <CardTitle className="mt-1">Internal variants</CardTitle>
              </div>
              <Badge variant="secondary">
                {orderedVariants.length} variants
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {orderedVariants.map((variant) => (
                <article
                  key={variant.service_code}
                  className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto] lg:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-xs font-bold text-primary">
                        {variant.service_code}
                      </p>
                      <Badge variant="outline">
                        {requirementScope(variant, orderedVariants)} checklist
                      </Badge>
                    </div>
                    <h2 className="mt-2 text-sm font-semibold leading-5 text-foreground">
                      {variant.name}
                    </h2>
                  </div>

                  <dl className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="flex items-center gap-1 text-muted-foreground">
                        <PhilippinePeso
                          aria-hidden="true"
                          className="size-3.5"
                        />
                        Fee
                      </dt>
                      <dd className="mt-1 font-semibold text-foreground">
                        {formatFee(variant.fee)}
                      </dd>
                    </div>
                    <div>
                      <dt className="flex items-center gap-1 text-muted-foreground">
                        <Clock3 aria-hidden="true" className="size-3.5" />
                        Processing
                      </dt>
                      <dd className="mt-1 font-semibold text-foreground">
                        {variant.processing_time || "Not set"}
                      </dd>
                    </div>
                  </dl>

                  <Link
                    to="/admin/services/$serviceCode/edit"
                    params={{ serviceCode: variant.service_code }}
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "w-full lg:w-auto",
                    )}
                    aria-label={`Edit variant ${variant.service_code}`}
                  >
                    <Pencil aria-hidden="true" data-icon="inline-start" />
                    Edit variant
                  </Link>
                </article>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
