import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "~/utils/supabase";

export const getMyNotifications=createServerFn({method:"GET"}).handler(async()=>{
  const db=getSupabaseServerClient(); const {data:{user}}=await db.auth.getUser(); if(!user) throw new Error("Unauthorized");
  const {data,error}=await db.from("notifications").select("id,title,message,read_at,created_at,request_id").eq("recipient_id",user.id).order("created_at",{ascending:false}).limit(100);
  if(error) throw new Error(error.message); return data??[];
});
export const markNotificationRead=createServerFn({method:"POST"}).validator((id:string)=>id).handler(async({data:id})=>{
  const db=getSupabaseServerClient(); const {data:{user}}=await db.auth.getUser(); if(!user) throw new Error("Unauthorized");
  const {error}=await db.from("notifications").update({read_at:new Date().toISOString()}).eq("id",id).eq("recipient_id",user.id); if(error) throw new Error(error.message); return {ok:true};
});
