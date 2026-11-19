import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { Dialog } from "~/components/ui/dialog";
import { FilePreviewDialogContent } from "~/components/file-preview/FilePreviewDialogContent";
import { ImageMagnifier } from "~/features/requests/components/ImageMagnifier";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "~/components/ui/alert-dialog";
import { TrackRedirectDialog } from "~/features/apply/components/TrackRedirectDialog";
import { KeepDraftDialog } from "~/features/apply/components/KeepDraftDialog";
import { LeaveApplicationDialog } from "~/features/apply/components/LeaveApplicationDialog";
import { ApplyStepRail } from "~/features/apply/components/ApplyStepRail";
import { ApplicationDocket } from "~/features/apply/components/ApplicationDocket";
import { WizardPageSkeleton } from "~/features/apply/components/WizardPageSkeleton";
import { DocumentsStep } from "~/features/apply/components/DocumentsStep";
import { ReviewStep } from "~/features/apply/components/ReviewStep";
import { MyRequestHeader } from "~/features/requests/components/MyRequestHeader";
import { NextStepsCard } from "~/features/requests/components/NextStepsCard";
import { MyRequestDetailPageSkeleton } from "~/features/requests/pages/MyRequestDetailPageSkeleton";
import { nextSteps } from "~/features/requests/next-steps";
import { CitizenMobileHeader } from "~/components/sidebar-01/citizen-mobile-header";
import { CitizenTopBar } from "~/components/sidebar-01/citizen-top-bar";
import { CitizenBottomBar } from "~/components/sidebar-01/citizen-bottom-bar";
import { CITIZEN_MAIN_CLASS, CITIZEN_PANEL_CLASS } from "~/components/sidebar-01/workspace";
import { NewNotificationToasts } from "~/features/notifications/components/NewNotificationToasts";
import { announceNotification } from "~/features/notifications/new-notification-toasts";
import type { NotificationRow } from "~/features/notifications/notifications.queries";
import { seedNotifications } from "./notification-mocks";
import { CitizenDashboardHeader } from "~/features/dashboard/components/CitizenDashboardHeader";
import { HeroRequestCard } from "~/features/dashboard/components/HeroRequestCard";
import { QuickStartPanel } from "~/features/dashboard/components/QuickStartPanel";
import { CitizenDashboardBodySkeleton } from "~/features/dashboard/CitizenDashboardSkeleton";
import type { CitizenDashboardRequest } from "~/features/dashboard/types";
import { useSeedDraftForGroup } from "~/features/apply/hooks/useApplyDraft";
import { formTemplateDefinitionSchema } from "~/features/forms/form-template.types";
import type { ServiceDetail } from "~/features/services/services.queries";
import "~/styles/app.css";

const params = new URLSearchParams(location.search);
document.documentElement.classList.toggle("dark", params.get("theme") === "dark");
if (params.has("large")) document.documentElement.style.fontSize = "24px";
const kind = params.get("kind") ?? "track";
const service = params.get("service") ?? "birth";
const serviceName = "Delayed Registration of Certificate of Live Birth for Applicants Aged 80 Years and Above";
const sampleImage = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="white"/><text x="40" y="80" font-size="24">Certificate of Live Birth</text></svg>')}`;

const dashboardRequest: CitizenDashboardRequest = {
  id: "dashboard-request", tracking_number: "CCRO-2026-860259", request_type: "BIRTH_ONTIME",
  status: params.get("status") ?? "submitted", payment_status: "unpaid", fees_due: 0,
  created_at: "2026-11-14T04:00:00Z", short_name: "On-Time Registration of Certificate of Live Birth",
};

function DashboardFixture() {
  return <main className="citizen-portal min-h-screen bg-background p-5 md:p-9">
    <div className="portal-page min-w-0 max-w-full gap-4.5 md:gap-5">
      <CitizenDashboardHeader firstName="Ana" />
      {params.has("loading") ? <CitizenDashboardBodySkeleton shape={{ kind: "requests", hero: { lead: true, done: 1, captioned: 1, tag: false }, attention: 0, rows: 0 }} />
        : params.has("empty") ? <QuickStartPanel prominent /> : <><HeroRequestCard request={dashboardRequest} /><QuickStartPanel /></>}
    </div>
  </main>;
}

function NotificationToastFixture() {
  const count = Number(params.get("count") ?? "1");
  useEffect(() => {
    const notifications: NotificationRow[] = Array.from({ length: count }, (_, index) => ({
      id: `notice-${count - index}`, requestId: `request-${count - index}`, type: "status_change", archivedAt: null,
      subject: `Request CCRO-2026-860259: now Under Validation${params.has("long") ? " with an extended status description".repeat(8) : ""}`,
      body: `Your request CCRO-2026-860259 is under validation.\n\nCCRO is currently reviewing your uploaded documents. We’ll notify you of updates or needed corrections.${params.has("long") ? " Long notification details without shortened content.".repeat(20) : ""}\n\nOpen My Requests for the full details.`,
      status: "sent", isRead: false, sentAt: "2026-11-14T20:24:00Z", trackingNumber: "CCRO-2026-860259",
      serviceName: `On-Time Registration of Certificate of Live Birth (request ${count - index})`,
      target: { to: "/my-requests/$requestId", requestId: `request-${count - index}` },
    }));
    seedNotifications(notifications);
    notifications.forEach((notification) => announceNotification("toast-applicant", notification.id));
  }, [count]);
  return <div className="citizen-portal min-h-screen bg-background">
    <div className={CITIZEN_PANEL_CLASS}>
      <CitizenMobileHeader userId="" unreadNotifications={count} />
      <CitizenTopBar userId="" unreadNotifications={count} />
      <main className={CITIZEN_MAIN_CLASS}><div className="portal-page gap-4.5 md:gap-5">
        <CitizenDashboardHeader firstName="Ana" />
        <HeroRequestCard request={{ ...dashboardRequest, status: "under_validation" }} />
        <QuickStartPanel />
      </div></main>
    </div><CitizenBottomBar /><NewNotificationToasts userId="toast-applicant" lifted={!params.has("unlifted")} />
  </div>;
}

function RequestProgressFixture() {
  const status = params.get("status") ?? "submitted";
  const next = nextSteps({ status, serviceCode: "BIRTH_ONTIME", paymentStatus: "unpaid", feesDue: 0,
    allowsMessages: false, formData: { event_date: "2026-11-05" }, logs: [],
    attachments: [{ requirementName: "Certificate of Live Birth", subjectRole: null, verificationStatus: status === "incomplete" ? "rejected" : "pending" }],
  });
  return <div className="citizen-portal min-h-screen bg-background">
    <div className={CITIZEN_PANEL_CLASS}>
      <CitizenMobileHeader userId="" unreadNotifications={0} />
      <CitizenTopBar userId="" unreadNotifications={0} />
      <main className={CITIZEN_MAIN_CLASS}>
        {params.has("loading") ? <MyRequestDetailPageSkeleton /> : <div className="portal-page gap-5 md:gap-6">
          <MyRequestHeader serviceName={params.has("long") ? serviceName : "On-Time Registration of Certificate of Live Birth"}
            trackingNumber="CCRO-2026-860259" />
          <NextStepsCard status={status} next={next} />
          <section aria-label="Documents" className="rounded-3xl border border-border-light bg-card p-5"><h2 className="text-[22px] font-semibold max-md:text-lg">Documents (4)</h2></section>
        </div>}
      </main>
    </div><CitizenBottomBar />
  </div>;
}

const uploadService = {
  service_code: "BIRTH_ONTIME",
  asks_purpose: false,
  form_template: { definition: formTemplateDefinitionSchema.parse({
    schemaVersion: 1,
    sections: [{ key: "details", title: "Child details", step: "details", fields: [
      { key: "subjects", type: "person_group", label: "Child" },
      { key: "event_date", type: "date", label: "Date of birth" },
      { key: "event_place", type: "text", label: "Place of birth" },
      ...(params.has("verification") ? [{ key: "requester_first_name", type: "text", label: "Requester first name" }] : []),
    ] }],
  }) },
} as ServiceDetail["services"][number];
const uploadRequirements: ServiceDetail["requirements"] = [{
  id: "birth-certificate", service_code: "BIRTH_ONTIME", requirement_name: "Certificate of Live Birth",
  is_mandatory: true, requires_upload: true, upload_scope: "request", subject_role: null,
  requirement_group: null, where_to_secure: null, case_tag: null, applies_when: null,
}];

function ApplicationFixture() {
  const seedDraft = useSeedDraftForGroup();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    seedDraft("BIRTH_ONTIME", {
      selectedServiceCode: "BIRTH_ONTIME",
      subjects: [{ role: "Child", firstName: "Ana", middleName: "", lastName: "Cruz", suffix: "", sex: "female" }],
      answers: { event_date: "2026-11-05", event_place: "Legazpi City", ...(params.has("verification") ? { requester_first_name: "Ana" } : {}) },
    });
    setReady(true);
  }, [seedDraft]);
  return <main className="apply-wizard apply-wizard-ground min-h-screen">
    {ready && (kind === "submitted"
      ? <ReviewStep serviceCode="BIRTH_ONTIME" displayName="On-Time Registration of Certificate of Live Birth" services={[uploadService]} requirements={uploadRequirements} />
      : <DocumentsStep serviceCode="BIRTH_ONTIME" services={[uploadService]} requirements={uploadRequirements} />)}
  </main>;
}

function HeaderFixture() {
  const [destination, setDestination] = useState<"/services" | "/dashboard" | null>(null);
  const currentStep = params.get("step") === "4" ? 4 : 1;
  const changeService = () => setDestination("/services");
  return <div className="apply-wizard apply-wizard-ground min-h-screen">
    <ApplyStepRail currentStep={currentStep} draftUpdatedAt={null}
      onChangeService={changeService} onLeave={() => setDestination("/dashboard")} />
    <ApplicationDocket serviceName={serviceName} fee={100} selectionPending={false} onChangeService={changeService} />
    <KeepDraftDialog open={destination !== null} onOpenChange={(open) => { if (!open) setDestination(null); }}
      serviceName={serviceName} destination={destination ?? "/dashboard"}
      onDiscard={() => localStorage.setItem("header-fixture-draft", "Discarded")} />
  </div>;
}

function Fixture() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState("Editing application");
  const finish = (message: string) => { setResult(message); setOpen(false); };
  if (kind === "header") return <HeaderFixture />;
  if (kind === "header-pending") return <WizardPageSkeleton />;
  if (kind === "uploads" || kind === "submitted") return <ApplicationFixture />;
  if (kind === "dashboard") return <DashboardFixture />;
  if (kind === "request-header") return <main className="citizen-portal min-h-screen bg-background p-5 md:p-9">
    <MyRequestHeader serviceName="On-Time Registration of Certificate of Live Birth" trackingNumber="CCRO-2026-860259" />
  </main>;
  return (
    <main className="apply-wizard min-h-screen bg-background p-5 text-foreground">
      <h1>Request details</h1>
      <Button id="dynamic-event_date" className="mt-5" onClick={() => setOpen(true)}>Open confirmation</Button>
      <output className="mt-5 block" aria-label="Result">{result}</output>
      {kind === "track" ? (
        <TrackRedirectDialog open={open} onOpenChange={setOpen}
          title={service === "birth" ? "This date is within the last 30 days" : service === "death" ? "This death date is more than 30 days ago" : "This marriage date is within the on-time registration period"}
          description={params.has("long") ? "Review the registration type and the information entered in this application. ".repeat(20) : "Use the registration type that matches the birth date."}
          switchLabel={service === "death" ? "Switch to Delayed Registration" : "Switch to On-Time Registration"}
          onKeepEditing={() => finish("Date retained")}
          onSwitch={() => finish("Registration switched; answers retained")}
          returnFocusTo={() => document.getElementById("dynamic-event_date")} />
      ) : kind === "draft" ? (
        <KeepDraftDialog open={open} onOpenChange={setOpen} serviceName={serviceName}
          destination="/services" onDiscard={() => setResult("Draft discarded")} />
      ) : kind === "leave" ? (
        <LeaveApplicationDialog open={open} onOpenChange={setOpen} serviceName={serviceName}
          onSaveAndExit={() => finish("Draft saved")} onDiscard={() => finish("Draft discarded")} />
      ) : kind === "preview" ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <FilePreviewDialogContent title="Certificate of Live Birth and supporting identification pages" kind="image" url={sampleImage} fileName="certificate-of-live-birth.jpg">
            <ImageMagnifier src={sampleImage} alt="Certificate of Live Birth" />
          </FilePreviewDialogContent>
        </Dialog>
      ) : (
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove this uploaded requirement?</AlertDialogTitle>
              <AlertDialogDescription>{serviceName}: certificate-of-live-birth-with-supporting-pages-and-identification.pdf</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep the uploaded document</AlertDialogCancel>
              <AlertDialogAction onClick={() => finish("File removed")}>Remove the uploaded document</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </main>
  );
}

const route = createRootRoute({ component: Outlet });
const fixtureRoute = createRoute({ getParentRoute: () => route, path: "/", component: Fixture });
const servicesRoute = createRoute({ getParentRoute: () => route, path: "/services", component: () => <main><h1>Services</h1><output aria-label="Draft">{localStorage.getItem("header-fixture-draft") ?? "Retained"}</output></main> });
const dashboardRoute = createRoute({ getParentRoute: () => route, path: "/dashboard", component: () => kind === "notification-toast" ? <NotificationToastFixture /> : <h1>Dashboard</h1> });
const notificationsRoute = createRoute({ getParentRoute: () => route, path: "/notifications", component: () => <h1>Notifications</h1> });
const requestsRoute = createRoute({ getParentRoute: () => route, path: "/my-requests", component: () => <h1>My requests</h1> });
const requestRoute = createRoute({ getParentRoute: () => route, path: "/my-requests/$requestId", component: () => kind === "request-progress" ? <RequestProgressFixture /> : <h1>Request details</h1> });
const router = createRouter({ routeTree: route.addChildren([fixtureRoute, servicesRoute, dashboardRoute, requestsRoute, requestRoute, notificationsRoute]), history: createMemoryHistory({ initialEntries: [kind === "request-progress" ? "/my-requests/request-fixture" : kind === "notification-toast" ? "/dashboard" : "/"] }) });
createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);
