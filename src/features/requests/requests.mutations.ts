import { createServerFn } from "@tanstack/react-start";
import { hasPermission, type Role } from "~/lib/permissions";
import { sendEmail } from "~/utils/resend";
import { getSupabaseAdminClient, getSupabaseServerClient } from "~/utils/supabase";
import type { RequirementReviewStatus, RequestStatus } from "./requests.types";

async function deliverPendingNotifications(requestId: string) {
  const admin = getSupabaseAdminClient();
  const { data } = await admin.from("notifications").select("id,recipient_email,title,message").eq("request_id",requestId).eq("email_status","pending");
  await Promise.all((data ?? []).map(async (notification) => {
    try {
      await sendEmail({to:notification.recipient_email,subject:notification.title,html:`<p>${notification.message}</p>`});
      await admin.from("notifications").update({email_status:"sent",email_sent_at:new Date().toISOString(),email_attempts:1,email_last_error:null}).eq("id",notification.id);
    } catch (error) {
      await admin.from("notifications").update({email_status:"failed",email_attempts:1,email_last_error:error instanceof Error ? error.message : "Email delivery failed"}).eq("id",notification.id);
    }
  }));
}

export const transitionRequest = createServerFn({method:"POST"}).validator((data:{requestId:string;expectedVersion:number;newStatus:RequestStatus;reason?:string;reviews?:Array<{id:string;status:RequirementReviewStatus;note?:string}>})=>data).handler(async({data})=>{
  const db=getSupabaseServerClient();
  const {data:result,error}=await db.rpc("transition_request",{p_request_id:data.requestId,p_expected_version:data.expectedVersion,p_new_status:data.newStatus,p_reason:data.reason ?? null,p_reviews:data.reviews ?? null});
  if(error) throw new Error(error.message);
  await deliverPendingNotifications(data.requestId).catch(() => undefined);
  return result;
});

export const verifyPayment = createServerFn({method:"POST"}).validator((data:{requestId:string;expectedVersion:number;reference:string})=>data).handler(async({data})=>{
  const db=getSupabaseServerClient(); const {data:result,error}=await db.rpc("verify_request_payment",{p_request_id:data.requestId,p_expected_version:data.expectedVersion,p_reference:data.reference});
  if(error) throw new Error(error.message); return result;
});

export const setRequestArchived = createServerFn({method:"POST"}).validator((data:{requestId:string;expectedVersion:number;restore:boolean})=>data).handler(async({data})=>{
  const db=getSupabaseServerClient(); const {data:result,error}=await db.rpc("archive_request",{p_request_id:data.requestId,p_expected_version:data.expectedVersion,p_restore:data.restore});
  if(error) throw new Error(error.message); return result;
});

export const createWalkInRequest = createServerFn({method:"POST"}).validator((data:{serviceCode:string;requesterName:string;email?:string;formData:Record<string,string>})=>data).handler(async({data})=>{
  const session=getSupabaseServerClient(); const {data:{user}}=await session.auth.getUser(); if(!user) throw new Error("Unauthorized");
  const {data:profile}=await session.from("profiles").select("role").eq("id",user.id).single(); const role=(profile?.role??"applicant") as Role;
  if(!hasPermission(role,"requests:intake")) throw new Error("Forbidden");
  let applicantId:string|null=null;
  if(data.email){ const admin=getSupabaseAdminClient(); const {data:users}=await admin.auth.admin.listUsers({perPage:1000}); applicantId=users?.users.find((item)=>item.email?.toLowerCase()===data.email?.trim().toLowerCase())?.id??null; }
  const {data:request,error}=await session.rpc("create_operational_request",{p_service_code:data.serviceCode,p_form_data:data.formData,p_source:"walk_in",p_guest_name:data.requesterName,p_guest_email:data.email??null,p_applicant_id:applicantId});
  if(error) throw new Error(error.message); return request;
});

export const retryNotification = createServerFn({method:"POST"}).validator((id:string)=>id).handler(async({data:id})=>{
  const session=getSupabaseServerClient(); const {data:{user}}=await session.auth.getUser(); if(!user) throw new Error("Unauthorized");
  const {data:profile}=await session.from("profiles").select("role").eq("id",user.id).single(); if(!hasPermission(profile?.role as Role,"requests:retry_notification")) throw new Error("Forbidden");
  const admin=getSupabaseAdminClient(); await admin.from("notifications").update({email_status:"pending"}).eq("id",id).eq("email_status","failed");
  const {data:n}=await admin.from("notifications").select("request_id").eq("id",id).single(); if(n) await deliverPendingNotifications(n.request_id); return {ok:true};
});
