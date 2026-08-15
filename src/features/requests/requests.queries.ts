import { createServerFn } from "@tanstack/react-start";
import { getPermissions, hasPermission, type Role } from "~/lib/permissions";
import { getSupabaseAdminClient, getSupabaseServerClient } from "~/utils/supabase";
import { subjectFromFormData, type RequestQueueData, type RequestQueueItem, type RequestSearch, type RequestStatus } from "./requests.types";

const PAGE_SIZE = 25;

async function requireRequestUser() {
  const session = getSupabaseServerClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data: profile, error } = await session.from("profiles").select("role,department_id,first_name,last_name").eq("id", user.id).single();
  if (error) throw new Error("Forbidden");
  const role = profile.role as Role;
  if (!hasPermission(role, "requests:view_all")) throw new Error("Forbidden");
  return { user, profile, role };
}

export const getRequestQueue = createServerFn({ method: "GET" })
  .validator((data: RequestSearch) => data)
  .handler(async ({ data }): Promise<RequestQueueData> => {
    const { profile, role } = await requireRequestUser();
    const db = getSupabaseAdminClient();
    const [{ data: departments }, { data: services }, requestsResult] = await Promise.all([
      db.from("departments").select("id,name").eq("is_active", true).order("name"),
      db.from("services_registry").select("service_code,name").order("name"),
      db.from("requests").select("id,tracking_number,request_type,status,payment_status,created_at,form_data,applicant_id,department_id,submission_source,archived_at"),
    ]);
    if (requestsResult.error) throw new Error(requestsResult.error.message);
    let rows = requestsResult.data ?? [];
    if (role === "staff") rows = rows.filter((row) => row.department_id === profile.department_id);
    if (role === "frontdesk") rows = rows.filter((row) => row.status === "pending_frontdesk");
    if (role === "cashier") rows = rows.filter((row) => row.status === "ready_for_release");
    rows = rows.filter((row) => data.archived ? Boolean(row.archived_at) : !row.archived_at);
    if (data.status) rows = rows.filter((row) => row.status === data.status);
    if (data.payment) rows = rows.filter((row) => row.payment_status === data.payment);
    if (data.department) rows = rows.filter((row) => row.department_id === data.department);
    if (data.service) rows = rows.filter((row) => row.request_type === data.service);
    if (data.source) rows = rows.filter((row) => row.submission_source === data.source);

    const applicantIds = [...new Set(rows.map((row) => row.applicant_id).filter(Boolean))];
    const requestIds = rows.map((row) => row.id);
    const [{ data: profiles }, { data: contacts }] = await Promise.all([
      applicantIds.length ? db.from("profiles").select("id,first_name,last_name").in("id", applicantIds) : Promise.resolve({ data: [] }),
      requestIds.length ? db.from("request_contacts").select("request_id,requester_name").in("request_id", requestIds) : Promise.resolve({ data: [] }),
    ]);
    const profileMap = new Map((profiles ?? []).map((item) => [item.id, `${item.first_name ?? ""} ${item.last_name ?? ""}`.trim()]));
    const contactMap = new Map((contacts ?? []).map((item) => [item.request_id, item.requester_name]));
    const serviceMap = new Map((services ?? []).map((item) => [item.service_code, item.name]));
    const departmentMap = new Map((departments ?? []).map((item) => [item.id, item.name]));
    let items: RequestQueueItem[] = rows.map((row) => ({
      id: row.id, trackingNumber: row.tracking_number ?? "Not assigned", serviceCode: row.request_type,
      serviceName: serviceMap.get(row.request_type) ?? row.request_type, departmentId: row.department_id,
      departmentName: departmentMap.get(row.department_id) ?? "Unassigned",
      requesterName: profileMap.get(row.applicant_id) ?? contactMap.get(row.id) ?? "Guest requester",
      subjectName: subjectFromFormData(row.form_data), status: row.status as RequestStatus,
      paymentStatus: row.payment_status ?? "unpaid", source: row.submission_source ?? "online",
      submittedAt: row.created_at, archivedAt: row.archived_at,
    }));
    if (data.q) {
      const q = data.q.toLocaleLowerCase();
      items = items.filter((item) => [item.trackingNumber,item.requesterName,item.subjectName,item.serviceName].some((part) => part.toLocaleLowerCase().includes(q)));
    }
    items.sort((a,b) => (data.sort === "newest" ? -1 : 1) * a.submittedAt.localeCompare(b.submittedAt));
    const total = items.length;
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(data.page, pageCount);
    items = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    return { items, total, page, pageCount, role, permissions: getPermissions(role), filters: {
      departments: departments ?? [], services: (services ?? []).map((item) => ({ code: item.service_code, name: item.name })),
    }};
  });

export const getRequestDetails = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const { profile, role } = await requireRequestUser();
    const db = getSupabaseAdminClient();
    const { data: request, error } = await db.from("requests").select("*").eq("id", id).single();
    if (error || !request) throw new Error("Request not found");
    const allowed = role === "admin" || role === "supervisor" ||
      (role === "staff" && request.department_id === profile.department_id) ||
      (role === "frontdesk" && request.status === "pending_frontdesk") ||
      (role === "cashier" && request.status === "ready_for_release");
    if (!allowed) throw new Error("Forbidden");
    const [serviceResult, deptResult, requirementsResult, activityResult, contactResult, applicantResult, notificationsResult] = await Promise.all([
      db.from("services_registry").select("name,fee").eq("service_code",request.request_type).maybeSingle(),
      db.from("departments").select("name").eq("id",request.department_id).maybeSingle(),
      role === "cashier" ? Promise.resolve({ data: [] }) : db.from("request_requirements").select("*").eq("request_id",id).order("position"),
      db.from("request_activity").select("*").eq("request_id",id).order("created_at",{ascending:false}),
      db.from("request_contacts").select("requester_name,email").eq("request_id",id).maybeSingle(),
      request.applicant_id ? db.from("profiles").select("first_name,last_name").eq("id",request.applicant_id).maybeSingle() : Promise.resolve({data:null}),
      role === "admin" ? db.from("notifications").select("id,title,email_status,email_attempts,email_last_error,created_at").eq("request_id",id).order("created_at",{ascending:false}) : Promise.resolve({data:[]}),
    ]);
    const actorIds = [...new Set((activityResult.data ?? []).map((a) => a.actor_id).filter(Boolean))];
    const { data: actors } = actorIds.length ? await db.from("profiles").select("id,first_name,last_name").in("id",actorIds) : {data:[]};
    const actorMap = new Map((actors ?? []).map((a) => [a.id,`${a.first_name ?? ""} ${a.last_name ?? ""}`.trim()]));
    return {
      request, service: serviceResult.data, department: deptResult.data,
      requirements: requirementsResult.data ?? [], contact: contactResult.data,
      applicant: applicantResult.data,
      activity: (activityResult.data ?? []).map((event) => ({...event, actorName: actorMap.get(event.actor_id) ?? "System"})),
      notifications: notificationsResult.data ?? [],
      role, permissions: getPermissions(role),
    };
  });

export const getIntakeOptions = createServerFn({ method: "GET" }).handler(async () => {
  const { role } = await requireRequestUser();
  if (!hasPermission(role,"requests:intake")) throw new Error("Forbidden");
  const db=getSupabaseAdminClient();
  const {data,error}=await db.from("services_registry").select("service_code,name,fee,department_id").not("department_id","is",null).order("name");
  if(error) throw new Error(error.message); return data ?? [];
});
