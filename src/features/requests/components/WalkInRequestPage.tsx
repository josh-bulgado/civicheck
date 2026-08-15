import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ClipboardPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { createWalkInRequest } from "../requests.mutations";

export function WalkInRequestPage({services}:{services:Array<{service_code:string;name:string;fee:number;department_id:string}>}){
  const navigate=useNavigate(); const [busy,setBusy]=useState(false);
  return <div className="dashboard-page max-w-3xl space-y-5">
    <header className="dashboard-hero"><div className="relative z-10"><p className="mb-2 text-xs font-bold uppercase tracking-[.13em] text-brand-gold">Assisted intake</p><h1 className="text-3xl font-extrabold text-white">New Walk-In Request</h1><p className="mt-2 text-sm text-white/75">Keep the requester’s identity separate from the person named on the civil record.</p></div></header>
    <form className="dashboard-panel space-y-6 p-6" onSubmit={async(event)=>{event.preventDefault();setBusy(true);const form=new FormData(event.currentTarget);try{const request:any=await createWalkInRequest({data:{serviceCode:String(form.get("serviceCode")),requesterName:String(form.get("requesterName")),email:String(form.get("email")||"")||undefined,formData:{subject_name:String(form.get("subjectName")),notes:String(form.get("notes")||"")}}});toast.success("Walk-in request created");navigate({to:"/requests/$requestId",params:{requestId:request.id}})}catch(error){toast.error(error instanceof Error?error.message:"Unable to create request")}finally{setBusy(false)}}}>
      <section className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><h2 className="font-bold">Requester</h2><p className="text-sm text-muted-foreground">An exact email match links an existing applicant account; otherwise this request stores a guest contact.</p></div><Field label="Requester name"><Input name="requesterName" required autoComplete="name"/></Field><Field label="Email (optional)"><Input name="email" type="email" autoComplete="email"/></Field></section>
      <section className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><h2 className="font-bold">Request</h2></div><Field label="Service"><select name="serviceCode" required className="h-10 w-full rounded-md border bg-white px-3 text-sm"><option value="">Select a service</option>{services.map((service)=><option key={service.service_code} value={service.service_code}>{service.name} — ₱{Number(service.fee).toFixed(2)}</option>)}</select></Field><Field label="Document subject"><Input name="subjectName" required placeholder="Person named on the record"/></Field><div className="sm:col-span-2"><Field label="Intake notes (optional)"><Textarea name="notes"/></Field></div></section>
      <div className="flex justify-end"><Button disabled={busy} type="submit"><ClipboardPlus className="size-4"/>{busy?"Creating…":"Create request"}</Button></div>
    </form>
  </div>
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <div className="space-y-2"><Label>{label}</Label>{children}</div>}
