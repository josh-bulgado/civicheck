import { createFileRoute, redirect } from "@tanstack/react-router";
import { WalkInRequestPage } from "~/features/requests/components/WalkInRequestPage";
import { getIntakeOptions } from "~/features/requests/requests.queries";
import { hasPermission, type Role } from "~/lib/permissions";
export const Route=createFileRoute("/_authed/requests/new")({beforeLoad:({context})=>{if(!hasPermission((context.user?.role??"applicant") as Role,"requests:intake")) throw redirect({to:"/requests"})},loader:()=>getIntakeOptions(),component:()=> <WalkInRequestPage services={Route.useLoaderData()}/>});
