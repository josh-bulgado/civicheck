import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { RequestQueuePage } from "~/features/requests/components/RequestQueuePage";
import { getRequestQueue } from "~/features/requests/requests.queries";
import { hasPermission, type Role } from "~/lib/permissions";

const searchSchema=z.object({
  q:z.string().catch(""),status:z.string().catch(""),payment:z.string().catch(""),department:z.string().catch(""),service:z.string().catch(""),source:z.string().catch(""),
  archived:z.boolean().catch(false),page:z.number().int().positive().catch(1),sort:z.enum(["oldest","newest"]).catch("oldest"),
});
export const Route=createFileRoute("/_authed/requests")({
  validateSearch:searchSchema,
  beforeLoad:({context})=>{if(!hasPermission((context.user?.role??"applicant") as Role,"requests:view_all")) throw redirect({to:"/dashboard"})},
  loaderDeps:({search})=>search,
  loader:({deps})=>getRequestQueue({data:deps}),
  component:()=> <RequestQueuePage data={Route.useLoaderData()} search={Route.useSearch()}/>,
});
