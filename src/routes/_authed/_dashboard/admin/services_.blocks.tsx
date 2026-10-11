import { createFileRoute } from "@tanstack/react-router";
import { FormBlocksPage } from "~/features/admin/services/pages/FormBlocksPage";
import { listFormFieldBlocksFn } from "~/features/forms/form-field-block.functions";
import { hasPermission } from "~/lib/permissions";
import type { Role } from "~/lib/permissions";
import { denyAccess } from "~/lib/access";

export const Route = createFileRoute("/_authed/_dashboard/admin/services_/blocks")({
  validateSearch: (search: Record<string, unknown>) => ({
    block: typeof search.block === "string" ? search.block : undefined,
  }),
  beforeLoad: ({ context, location }) => {
    const role = (context.user?.role ?? "applicant") as Role;
    if (!hasPermission(role, "services:manage")) {
      denyAccess(location);
    }
  },
  loader: () => listFormFieldBlocksFn(),
  component: FormBlocksRoute,
});

function FormBlocksRoute() {
  const blocks = Route.useLoaderData();
  const { block } = Route.useSearch();
  return <FormBlocksPage blocks={blocks} initialBlockKey={block} />;
}
