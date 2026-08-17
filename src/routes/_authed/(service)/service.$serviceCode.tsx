import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import { getServiceDetail } from "~/features/services/services.queries";
import { submitRequestFn } from "~/features/services/services.mutations";
import { ServiceHero } from "~/features/services/components/ServiceHero";
import { CaseSelector } from "~/features/services/components/CaseSelector";
import { RequirementChecklist } from "~/features/services/components/RequirementChecklist";
import { HowItWorksCard } from "~/features/services/components/HowItWorksCard";
import { NeedHelpCard } from "~/features/services/components/NeedHelpCard";
import { RequestForm } from "~/features/services/components/RequestForm";
import type { RequestFormValues } from "~/features/services/components/RequestForm";

export const Route = createFileRoute("/_authed/(service)/service/$serviceCode")({
  loader: ({ params }) => getServiceDetail({ data: params.serviceCode }),
  // Admin edits call `router.invalidate()`, so this only ever serves a
  // checklist the applicant already loaded in this session.
  staleTime: 5 * 60_000,
  component: ServicePage,
});

const DEFAULT_FORM: RequestFormValues = {
  subjectFirstName: "",
  subjectMiddleName: "",
  subjectLastName: "",
  subjectSuffix: "",
  eventDate: "",
  eventPlace: "",
  purpose: "Local Use (ID, Barangay, etc.)",
  otherPurpose: "",
  additionalNotes: "",
};

function ServicePage() {
  const { isGroup, displayName, services, requirements } = Route.useLoaderData();
  const { serviceCode } = Route.useParams();
  const router = useRouter();

  const [selectedCode, setSelectedCode] = useState<string | null>(
    isGroup ? null : services[0].service_code,
  );
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState<RequestFormValues>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);

  const selectedService = services.find((s) => s.service_code === selectedCode);
  const filteredRequirements = selectedCode ? requirements : [];

  const handleFormChange = (field: keyof RequestFormValues, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCode || !selectedService) {
      toast.error("No service selected", {
        description: "Please complete the case selection above.",
      });
      return;
    }

    if (!form.subjectFirstName.trim() || !form.subjectLastName.trim()) {
      toast.error("Validation Error", {
        description: "Subject First Name and Last Name are required.",
      });
      return;
    }

    if (!form.eventDate) {
      toast.error("Validation Error", { description: "Event Date is required." });
      return;
    }

    if (!form.eventPlace.trim()) {
      toast.error("Validation Error", { description: "Event Place is required." });
      return;
    }

    const missingMandatory = filteredRequirements.filter(
      (req) => req.is_mandatory && !checkedItems[req.id],
    );
    if (missingMandatory.length > 0) {
      toast.warning("Checklist Incomplete", {
        description:
          "Please confirm you have prepared all required documents by checking them off.",
      });
    }

    setSubmitting(true);
    const finalPurpose =
      form.purpose === "Other" ? form.otherPurpose : form.purpose;

    try {
      const res = await submitRequestFn({
        data: {
          serviceCode: selectedCode,
          fee: Number(selectedService.fee),
          formData: {
            subject_first_name: form.subjectFirstName,
            subject_middle_name: form.subjectMiddleName,
            subject_last_name: form.subjectLastName,
            subject_suffix: form.subjectSuffix,
            event_date: form.eventDate,
            event_place: form.eventPlace,
            purpose: finalPurpose,
            additional_notes: form.additionalNotes,
          },
        },
      });

      if (res.error) {
        toast.error("Submission Failed", {
          description: res.message || "An error occurred.",
        });
      } else {
        toast.success("Request Submitted", {
          description: `Tracking Number: ${res.trackingNumber}`,
          duration: 6000,
        });
        router.invalidate();
        router.navigate({ to: "/my-requests" });
      }
    } catch (err: any) {
      toast.error("Submission Error", { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dashboard-page max-w-350">
      <div className="flex flex-wrap items-center gap-3.5">
        <Link
          to="/services"
          className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:text-primary-hover"
        >
          <ChevronLeft className="size-4" />
          Back to Services
        </Link>
        <div className="h-4.5 w-px bg-border-light" />
        <p className="text-sm text-muted-foreground">
          Services / <span className="text-foreground">{displayName}</span>
        </p>
      </div>

      {/* Case selector (only for grouped services) */}
      {isGroup && (
        <CaseSelector
          services={services}
          selectedCode={selectedCode}
          onSelect={setSelectedCode}
        />
      )}

      {/* Service detail + checklist + form (shown once a case is selected) */}
      {selectedService && (
        <>
          <ServiceHero service={selectedService} displayName={displayName} />

          <div className="grid items-start gap-5 lg:grid-cols-[1fr_380px]">
            <RequestForm
              values={form}
              onChange={handleFormChange}
              onSubmit={handleSubmit}
              submitting={submitting}
              eventDateLabel={
                serviceCode.toLowerCase().startsWith("birth")
                  ? "Date of Birth"
                  : undefined
              }
              eventPlaceLabel={
                serviceCode.toLowerCase().startsWith("birth")
                  ? "Place of Birth"
                  : undefined
              }
            />

            <div className="flex flex-col gap-5">
              <RequirementChecklist
                requirements={filteredRequirements}
                checkedItems={checkedItems}
                onToggle={(id) =>
                  setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }))
                }
                selectedServiceCode={selectedCode}
                allowUploads={serviceCode.toLowerCase() === "birth_ontime"}
              />
              <HowItWorksCard steps={selectedService.steps_description} />
              <NeedHelpCard />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
