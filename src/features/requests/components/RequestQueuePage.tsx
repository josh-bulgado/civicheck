import { Link, useNavigate } from "@tanstack/react-router";
import { Archive, FileSearch, Plus, Search } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { STATUS_LABELS, REQUEST_STATUSES, type RequestQueueData, type RequestSearch } from "../requests.types";

const selectClass = "h-10 rounded-md border border-input bg-white px-3 text-sm text-foreground";

export function RequestQueuePage({data, search}:{data:RequestQueueData;search:RequestSearch}) {
  const navigate=useNavigate({from:"/requests"});
  const canIntake=data.permissions.includes("requests:intake");
  const submitFilters=(form:HTMLFormElement)=>{
    const values=new FormData(form);
    navigate({search:{
      q:String(values.get("q")??""),status:String(values.get("status")??""),payment:String(values.get("payment")??""),
      department:String(values.get("department")??""),service:String(values.get("service")??""),source:String(values.get("source")??""),
      archived:values.get("archived")==="true",page:1,sort:String(values.get("sort")) as "oldest"|"newest",
    }});
  };
  return <div className="dashboard-page max-w-7xl space-y-5">
    <header className="dashboard-hero">
      <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="mb-2 text-xs font-bold uppercase tracking-[.13em] text-brand-gold">Operations</p><h1 className="text-3xl font-extrabold text-white">Request Queue</h1><p className="mt-2 text-sm text-white/75">Department-aware intake, validation, payment, approval, and release work.</p></div>
        {canIntake?<Link to="/requests/new" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-bold text-primary"><Plus className="size-4"/>New walk-in request</Link>:null}
      </div>
    </header>
    <form className="dashboard-panel grid gap-3 p-4 lg:grid-cols-4" onSubmit={(event)=>{event.preventDefault();submitFilters(event.currentTarget)}}>
      <label className="relative lg:col-span-2"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/><Input name="q" defaultValue={search.q} className="pl-9" placeholder="Tracking, requester, subject, or service"/></label>
      <select className={selectClass} name="status" defaultValue={search.status}><option value="">All statuses</option>{REQUEST_STATUSES.map((status)=><option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select>
      <select className={selectClass} name="payment" defaultValue={search.payment}><option value="">All payment states</option><option value="unpaid">Unpaid</option><option value="verified">Verified</option></select>
      <select className={selectClass} name="department" defaultValue={search.department}><option value="">All departments</option>{data.filters.departments.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <select className={selectClass} name="service" defaultValue={search.service}><option value="">All services</option>{data.filters.services.map((item)=><option key={item.code} value={item.code}>{item.name}</option>)}</select>
      <select className={selectClass} name="source" defaultValue={search.source}><option value="">All sources</option><option value="online">Online</option><option value="walk_in">Walk-in</option></select>
      <select className={selectClass} name="sort" defaultValue={search.sort}><option value="oldest">Oldest first</option><option value="newest">Newest first</option></select>
      <input type="hidden" name="archived" value={String(search.archived)}/>
      <div className="flex gap-2 lg:col-span-4"><Button type="submit">Apply filters</Button><Link to="/requests" search={{q:"",status:"",payment:"",department:"",service:"",source:"",archived:false,page:1,sort:"oldest"}} className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-semibold">Reset</Link><Link to="/requests" search={(prev)=>({...prev,archived:!prev.archived,page:1})} className="ml-auto inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-semibold"><Archive className="size-4"/>{search.archived?"Active queue":"Archived"}</Link></div>
    </form>
    <section className="dashboard-panel overflow-hidden">
      <div className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="font-bold">{search.archived?"Archived requests":"Active requests"}</h2><p className="text-xs text-muted-foreground">{data.total} result{data.total===1?"":"s"} · Page {data.page} of {data.pageCount}</p></div></div>
      {data.items.length===0?<div className="grid min-h-64 place-items-center p-8 text-center"><div><FileSearch className="mx-auto mb-3 size-9 text-muted-foreground"/><h3 className="font-bold">No matching requests</h3><p className="mt-1 text-sm text-muted-foreground">Adjust the filters or wait for new work to arrive.</p></div></div>:<>
        <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b bg-surface-subtle text-xs uppercase text-muted-foreground"><tr><th className="px-5 py-3">Request</th><th className="px-4 py-3">Requester / subject</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Submitted</th></tr></thead><tbody className="divide-y">{data.items.map((item)=><tr key={item.id} className="hover:bg-surface-subtle"><td className="px-5 py-4"><Link to="/requests/$requestId" params={{requestId:item.id}} className="font-mono text-xs font-bold text-primary">{item.trackingNumber}</Link><p className="mt-1 max-w-64 font-medium">{item.serviceName}</p></td><td className="px-4 py-4"><p className="font-semibold">{item.requesterName}</p><p className="text-xs text-muted-foreground">Subject: {item.subjectName}</p></td><td className="px-4 py-4">{item.departmentName}</td><td className="px-4 py-4"><Status value={STATUS_LABELS[item.status]}/></td><td className="px-4 py-4 capitalize">{item.paymentStatus}</td><td className="px-4 py-4 text-muted-foreground">{new Date(item.submittedAt).toLocaleDateString()}</td></tr>)}</tbody></table></div>
        <div className="divide-y md:hidden">{data.items.map((item)=><Link key={item.id} to="/requests/$requestId" params={{requestId:item.id}} className="block space-y-2 p-4"><div className="flex justify-between gap-3"><span className="font-mono text-xs font-bold text-primary">{item.trackingNumber}</span><Status value={STATUS_LABELS[item.status]}/></div><p className="font-semibold">{item.serviceName}</p><p className="text-xs text-muted-foreground">{item.requesterName} · {item.departmentName}</p></Link>)}</div>
      </>}
      <div className="flex items-center justify-end gap-2 border-t p-4"><Button variant="outline" disabled={data.page<=1} onClick={()=>navigate({search:(prev)=>({...prev,page:prev.page-1})})}>Previous</Button><Button variant="outline" disabled={data.page>=data.pageCount} onClick={()=>navigate({search:(prev)=>({...prev,page:prev.page+1})})}>Next</Button></div>
    </section>
  </div>;
}

function Status({value}:{value:string}){return <span className="inline-flex rounded-md border border-primary/20 bg-primary-soft px-2 py-1 text-xs font-semibold text-primary">{value}</span>}
