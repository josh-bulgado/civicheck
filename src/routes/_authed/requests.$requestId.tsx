import { createFileRoute, redirect } from "@tanstack/react-router";
import { RequestDetailPage } from "~/features/requests/components/RequestDetailPage";
import { getRequestDetails } from "~/features/requests/requests.queries";
import { hasPermission, type Role } from "~/lib/permissions";
export const Route=createFileRoute("/_authed/requests/$requestId")({
  beforeLoad:({context})=>{if(!hasPermission((context.user?.role??"applicant") as Role,"requests:view_all")) throw redirect({to:"/dashboard"})},
  loader:({params})=>getRequestDetails({data:params.requestId}),component:()=> <RequestDetailPage data={Route.useLoaderData()}/>,
});
