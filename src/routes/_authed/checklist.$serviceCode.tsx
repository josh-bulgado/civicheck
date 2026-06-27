import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "~/utils/supabase";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle,
  FileText,
  Clock,
  CircleDollarSign,
  AlertCircle,
  Calendar,
  MapPin,
  HelpCircle,
  BadgeAlert,
  Loader2
} from "lucide-react";
import { Input } from "~/components/ui/input";

// Fetch service and checklist requirements
const getChecklistData = createServerFn({ method: "GET" })
  .validator((d: string) => d)
  .handler(async ({ data: serviceCode }) => {
    const supabase = getSupabaseServerClient();
    
    // Fetch service info
    const { data: service, error: serviceError } = await supabase
      .from("services_registry")
      .select("*")
      .eq("service_code", serviceCode)
      .single();
      
    if (serviceError) {
      throw new Error(serviceError.message);
    }
    
    // Fetch requirements metadata
    const { data: requirements, error: reqError } = await supabase
      .from("service_requirements_metadata")
      .select("*")
      .eq("service_code", serviceCode);
      
    if (reqError) {
      throw new Error(reqError.message);
    }
    
    return {
      service,
      requirements: requirements || [],
    };
  });

// Server function to submit the request
export const submitRequestFn = createServerFn({ method: "POST" })
  .validator((d: { serviceCode: string; fee: number; formData: any }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    
    // Get currently authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: true, message: "Unauthorized: Please log in again." };
    }
    
    const year = new Date().getFullYear();
    let trackingNumber = "";
    let inserted = false;
    let attempts = 0;
    const maxAttempts = 5;
    let lastErrorMsg = "";
    
    while (!inserted && attempts < maxAttempts) {
      attempts++;
      // Generate 6 digit random number padded
      const randVal = Math.floor(Math.random() * 1000000);
      const randStr = String(randVal).padStart(6, "0");
      trackingNumber = `CCRO-${year}-${randStr}`;
      
      const { error: insertError } = await supabase
        .from("requests")
        .insert({
          applicant_id: user.id,
          request_type: data.serviceCode,
          form_data: data.formData,
          tracking_number: trackingNumber,
          fees_due: data.fee
          // status and payment_status left to DB defaults ('pending_frontdesk' and 'unpaid')
        });
        
      if (!insertError) {
        inserted = true;
      } else {
        lastErrorMsg = insertError.message;
        // Postgres unique violation code is 23505
        if (insertError.code === "23505") {
          continue; // retry
        } else {
          return { error: true, message: insertError.message };
        }
      }
    }
    
    if (!inserted) {
      return { error: true, message: `Could not generate a unique tracking number after ${maxAttempts} attempts: ${lastErrorMsg}` };
    }
    
    return { error: false, trackingNumber };
  });

export const Route = createFileRoute("/_authed/checklist/$serviceCode")({
  loader: ({ params }) => getChecklistData({ data: params.serviceCode }),
  component: ChecklistPage,
});

function ChecklistPage() {
  const { service, requirements } = Route.useLoaderData();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  
  // Track checked requirements to encourage validation check-off
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  
  // Form fields
  const [subjectFirstName, setSubjectFirstName] = useState("");
  const [subjectMiddleName, setSubjectMiddleName] = useState("");
  const [subjectLastName, setSubjectLastName] = useState("");
  const [subjectSuffix, setSubjectSuffix] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventPlace, setEventPlace] = useState("");
  const [purpose, setPurpose] = useState("Local Use");
  const [otherPurpose, setOtherPurpose] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  const handleCheckboxChange = (id: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const getClassificationColor = (classification: string | null) => {
    switch (classification) {
      case "simple":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "complex":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "highly_technical":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subjectFirstName.trim() || !subjectLastName.trim()) {
      toast.error("Validation Error", {
        description: "Subject First Name and Last Name are required.",
      });
      return;
    }

    if (!eventDate) {
      toast.error("Validation Error", {
        description: "Event Date is required.",
      });
      return;
    }

    if (!eventPlace.trim()) {
      toast.error("Validation Error", {
        description: "Event Place is required.",
      });
      return;
    }

    // Verify if all mandatory items are checked in the checklist UI
    const missingMandatory = requirements.filter(
      (req) => req.is_mandatory && !checkedItems[req.id]
    );

    if (missingMandatory.length > 0) {
      toast.warning("Checklist Incomplete", {
        description: "Please confirm that you have prepared all required (mandatory) documents by checking them off before submitting.",
      });
      // We don't block submission completely (as per charter guidelines pre-validation is optional),
      // but showing a warning helps validation completeness.
    }

    setSubmitting(true);
    const finalPurpose = purpose === "Other" ? otherPurpose : purpose;

    try {
      const res = await submitRequestFn({
        data: {
          serviceCode: service.service_code,
          fee: Number(service.fee),
          formData: {
            subject_first_name: subjectFirstName,
            subject_middle_name: subjectMiddleName,
            subject_last_name: subjectLastName,
            subject_suffix: subjectSuffix,
            event_date: eventDate,
            event_place: eventPlace,
            purpose: finalPurpose,
            additional_notes: additionalNotes,
          },
        },
      });

      if (res.error) {
        toast.error("Submission Failed", {
          description: res.message || "An error occurred while submitting your request.",
        });
      } else {
        toast.success("Request Submitted Successfully", {
          description: `Tracking Number: ${res.trackingNumber}. Keep this number safe to monitor your request progress.`,
          duration: 6000,
        });
        router.invalidate();
        router.navigate({ to: "/my-requests" });
      }
    } catch (err: any) {
      toast.error("Submission Error", {
        description: err.message || "A network or system error occurred.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-4">
      {/* Back button */}
      <div>
        <Link
          to="/services"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Services
        </Link>
      </div>

      {/* Hero section */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{service.name}</h1>
            <p className="text-xs text-gray-400 font-medium">Service Code: {service.service_code}</p>
          </div>
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase ${getClassificationColor(service.classification)}`}>
            {service.classification?.replace("_", " ")}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100 text-sm">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-gray-400 shrink-0" />
            <div>
              <p className="text-gray-500 text-xs">Estimated Processing Time</p>
              <p className="font-semibold text-gray-900">{service.processing_time}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <CircleDollarSign className="w-5 h-5 text-gray-400 shrink-0" />
            <div>
              <p className="text-gray-500 text-xs">Service Fee</p>
              <p className="font-semibold text-gray-900">
                {Number(service.fee) === 0 ? "Free" : `₱${Number(service.fee).toFixed(2)}`}
              </p>
            </div>
          </div>
        </div>

        {/* Steps description */}
        {service.steps_description && service.steps_description.length > 0 && (
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-[#1a4480]" />
              Official Processing Steps
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 pl-1">
              {service.steps_description.map((step: string, idx: number) => (
                <li key={idx} className="leading-relaxed">
                  <span className="text-gray-900 font-medium">{idx + 1}. </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column - Checklist (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-gray-900">Requirement Checklist</h2>
            <p className="text-xs text-muted-foreground">
              Please review the requirements for this service. Check off the items you have prepared.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {requirements.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg text-gray-500 text-sm">
                No requirement records configured for this service.
              </div>
            ) : (
              requirements.map((req) => (
                <label
                  key={req.id}
                  className={`flex items-start gap-3 p-3.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                    checkedItems[req.id]
                      ? "bg-slate-50 border-gray-300"
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!!checkedItems[req.id]}
                    onChange={() => handleCheckboxChange(req.id)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#1a4480] focus:ring-[#1a4480]"
                  />
                  <div className="space-y-1 flex-1">
                    <p className={`leading-relaxed ${checkedItems[req.id] ? "text-gray-500 line-through" : "text-gray-900 font-medium"}`}>
                      {req.requirement_name}
                    </p>
                    <div>
                      {req.is_mandatory ? (
                        <span className="inline-flex items-center rounded-md bg-red-50 px-1.5 py-0.5 text-2xs font-semibold text-red-700 ring-1 ring-inset ring-red-600/10">
                          Required
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-gray-50 px-1.5 py-0.5 text-2xs font-semibold text-gray-600 ring-1 ring-inset ring-gray-500/10">
                          If applicable
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Right column - Application Form (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">
              Request Details
            </h2>

            {/* Subject Name Fields */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Subject of the Document
              </p>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={subjectFirstName}
                  onChange={(e) => setSubjectFirstName(e.target.value)}
                  placeholder="e.g. Juan"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Middle Name
                  </label>
                  <Input
                    value={subjectMiddleName}
                    onChange={(e) => setSubjectMiddleName(e.target.value)}
                    placeholder="e.g. Santos"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={subjectLastName}
                    onChange={(e) => setSubjectLastName(e.target.value)}
                    placeholder="e.g. Dela Cruz"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Suffix (optional)
                </label>
                <Input
                  value={subjectSuffix}
                  onChange={(e) => setSubjectSuffix(e.target.value)}
                  placeholder="e.g. Jr., III"
                />
              </div>
            </div>

            {/* Event Details */}
            <div className="space-y-3 pt-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Event Information
              </p>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Date of Event <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Place of Event <span className="text-red-500">*</span>
                </label>
                <Input
                  value={eventPlace}
                  onChange={(e) => setEventPlace(e.target.value)}
                  placeholder="e.g. Legazpi City, Albay"
                  required
                />
              </div>
            </div>

            {/* Metadata / Settings */}
            <div className="space-y-3 pt-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Purpose & Notes
              </p>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Purpose of Request
                </label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-white px-2.5 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="Local Use">Local Use (ID, Barangay, etc.)</option>
                  <option value="Employment">Employment</option>
                  <option value="Passport / Travel">Passport / Travel</option>
                  <option value="School Records">School Records / Admission</option>
                  <option value="Social Security">Social Security (SSS/GSIS/etc.)</option>
                  <option value="Legal / Court">Legal / Court proceedings</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {purpose === "Other" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Specify Purpose <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={otherPurpose}
                    onChange={(e) => setOtherPurpose(e.target.value)}
                    placeholder="Describe purpose"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Additional Notes (optional)
                </label>
                <textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Any special requests or instructions..."
                  rows={2}
                  className="w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1a4480] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1a4480]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a4480] transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting Request...
                </>
              ) : (
                "Submit Request Intent"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
