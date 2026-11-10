import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { encodeWalkInFn } from "~/features/requests/walk-in-intake.mutations";
import type { EncodableService } from "~/features/requests/walk-in-intake.queries";
import { CopiesStepper } from "~/features/services/components/CopiesStepper";
import { ServiceRequirementsDialog } from "~/features/services/components/ServiceRequirementsDialog";
import { formatPesoFee } from "~/features/services/service-utils";
import { WalkInRegistrationFields } from "./WalkInRegistrationFields";
import { isWalkInDetailedIntake } from "../walk-in-registration";
import type { TemplateAnswers } from "~/features/forms/form-template.types";
import { digitsOnly } from "~/lib/phone";
import {
  emptySubject,
  reconcileSubjects,
  subjectsMatchRoles,
  type SubjectFields,
} from "~/lib/subject-fields";

interface WalkInIntakeDialogProps {
  services: EncodableService[];
  onChanged: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}

export function WalkInIntakeDialog({
  services,
  onChanged,
  open,
  onOpenChange,
  showTrigger = true,
}: WalkInIntakeDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submissionPending = useRef(false);
  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const [serviceCode, setServiceCode] = useState("");
  const [registrationAnswers, setRegistrationAnswers] = useState<TemplateAnswers>({});
  const [subjects, setSubjects] = useState<SubjectFields[]>([
    emptySubject("Subject"),
  ]);
  const [purpose, setPurpose] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [copies, setCopies] = useState(1);
  const [encodedRequest, setEncodedRequest] = useState<{
    trackingNumber: string;
    status: "submitted" | "processing";
  } | null>(null);

  const selectedService = services.find(
    (service) => service.serviceCode === serviceCode,
  );

  // Most services ask about one person; Marriage License asks about two.
  // Resize the subject list to match whenever the selected service changes.
  useEffect(() => {
    const roles = selectedService?.partyRoles ?? ["Subject"];
    setSubjects((prev) =>
      subjectsMatchRoles(prev, roles) ? prev : reconcileSubjects(prev, roles),
    );
  }, [selectedService]);

  const showRoleLabels = subjects.length > 1;

  function updateSubject(index: number, patch: Partial<SubjectFields>) {
    setSubjects((prev) =>
      prev.map((subject, i) =>
        i === index ? { ...subject, ...patch } : subject,
      ),
    );
  }

  function reset() {
    setServiceCode("");
    setRegistrationAnswers({});
    setSubjects([emptySubject("Subject")]);
    setPurpose("");
    setFatherName("");
    setContactNumber("");
    setCopies(1);
    setEncodedRequest(null);
    setRequirementsOpen(false);
  }

  function setDialogOpen(next: boolean) {
    if (submissionPending.current) return;
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
    if (!next) reset();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (selectedService && isWalkInDetailedIntake(serviceCode)) return;
    await encodeRequest({
      serviceCode,
      subjects,
      purpose,
      fatherName,
      contactNumber,
      copies: selectedService?.feePerCopy ? copies : undefined,
    });
  }

  async function encodeRequest(data: Parameters<typeof encodeWalkInFn>[0]["data"]) {
    if (submissionPending.current) return;
    submissionPending.current = true;
    setSubmitting(true);
    try {
      const result = await encodeWalkInFn({ data });

      if (result.error) {
        toast.error("Could not encode this walk-in", {
          description: result.message,
        });
        return;
      }

      setEncodedRequest({ trackingNumber: result.trackingNumber, status: result.status });
      onChanged();
      toast.success("Walk-in request encoded", {
        description: `Tracking number ${result.trackingNumber}`,
      });
    } catch (error) {
      toast.error("Could not encode this walk-in", { description: error instanceof Error ? error.message : "Please try again." });
    } finally {
      submissionPending.current = false;
      setSubmitting(false);
    }
  }

  return (
    <>
      {showTrigger ? (
        <Button
          type="button"
          shape="pill"
          size="lg"
          onClick={() => setDialogOpen(true)}
          disabled={services.length === 0}
        >
          <Plus aria-hidden="true" data-icon="inline-start" />
          Encode Walk-in
        </Button>
      ) : null}

      <Dialog
        open={open ?? internalOpen}
        onOpenChange={setDialogOpen}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Department walk-in intake</DialogTitle>
            <DialogDescription>
              Encode the request for the visitor waiting at the counter.
            </DialogDescription>
          </DialogHeader>

          {!encodedRequest ? (
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <Field>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <FieldLabel htmlFor="walkin-service">
                      Service requested
                    </FieldLabel>
                    {selectedService && isWalkInDetailedIntake(serviceCode) ? (
                      <span role="status" className="rounded-md bg-primary-soft px-3 py-1 text-sm font-semibold text-primary">
                        Fee: {formatPesoFee(selectedService.fee)}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Select
                      items={services.map((service) => ({ value: service.serviceCode, label: service.name }))}
                      value={serviceCode}
                      disabled={submitting}
                      onValueChange={(value) => { setServiceCode(value ?? ""); setRegistrationAnswers({}); }}
                    >
                      <SelectTrigger
                        id="walkin-service"
                        className="w-full min-w-0 max-w-full sm:flex-1"
                        shape="split"
                      >
                        <SelectValue className="min-w-0 truncate" placeholder="Select a department service" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {services.map((service) => (
                            <SelectItem
                              key={service.serviceCode}
                              value={service.serviceCode}
                            >
                              {service.name} — ₱{service.fee.toFixed(2)}
                              {service.feePerCopy ? " per copy" : ""}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      shape="soft"
                      disabled={!selectedService}
                      onClick={() => setRequirementsOpen(true)}
                    >
                      View requirements
                    </Button>
                  </div>
                </Field>

                {selectedService && isWalkInDetailedIntake(serviceCode) ? (
                  <WalkInRegistrationFields key={serviceCode} service={selectedService} submitting={submitting}
                    onSubmit={encodeRequest} onAnswersChange={setRegistrationAnswers} onCancel={() => setDialogOpen(false)} />
                ) : <>
                {selectedService?.feePerCopy ? (
                  <CopiesStepper
                    value={copies}
                    onChange={setCopies}
                    unitFee={selectedService.fee}
                  />
                ) : null}

                {subjects.map((subject, index) => (
                  <div key={index} className="space-y-3">
                    {showRoleLabels && (
                      <p className="text-sm font-medium text-foreground">
                        {subject.role}
                      </p>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor={`walkin-first-${index}`}>
                          First name
                        </FieldLabel>
                        <Input
                          id={`walkin-first-${index}`}
                          value={subject.firstName}
                          onChange={(event) =>
                            updateSubject(index, {
                              firstName: event.target.value,
                            })
                          }
                          required
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor={`walkin-last-${index}`}>
                          Last name
                        </FieldLabel>
                        <Input
                          id={`walkin-last-${index}`}
                          value={subject.lastName}
                          onChange={(event) =>
                            updateSubject(index, {
                              lastName: event.target.value,
                            })
                          }
                          required
                        />
                      </Field>
                    </div>
                  </div>
                ))}

                {serviceCode.startsWith("CTC-") || serviceCode === "CTC_ISSUANCE" ? (
                  <Field>
                    <FieldLabel htmlFor="walkin-father-name">Father's full name (birth records, optional)</FieldLabel>
                    <Input id="walkin-father-name" value={fatherName} maxLength={240}
                      onChange={(event) => setFatherName(event.target.value)} />
                  </Field>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="walkin-contact">
                      Contact number (optional)
                    </FieldLabel>
                    <Input
                      id="walkin-contact"
                      type="tel"
                      inputMode="numeric"
                      value={contactNumber}
                      onChange={(event) =>
                        setContactNumber(digitsOnly(event.target.value))
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="walkin-purpose">
                      Purpose (optional)
                    </FieldLabel>
                    <Input
                      id="walkin-purpose"
                      value={purpose}
                      onChange={(event) => setPurpose(event.target.value)}
                    />
                  </Field>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      submitting ||
                      !serviceCode ||
                      subjects.some(
                        (s) => !s.firstName.trim() || !s.lastName.trim(),
                      )
                    }
                  >
                    {submitting ? "Encoding..." : "Encode request"}
                  </Button>
                </div>
                </>}
              </FieldGroup>
            </form>
          ) : (
            <div className="flex flex-col gap-5">
              <Alert>
                <AlertTitle>
                  Request {encodedRequest.trackingNumber} encoded
                </AlertTitle>
                <AlertDescription>
                  {encodedRequest.status === "processing"
                    ? "The physical papers were accepted. The request is now in Processing."
                    : "The request has been submitted and is ready for staff to process."}
                </AlertDescription>
              </Alert>
              <div className="flex justify-end">
                <Button
                  onClick={() => setDialogOpen(false)}
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {selectedService && (
        <ServiceRequirementsDialog
          serviceCode={
            isWalkInDetailedIntake(serviceCode) ? selectedService.serviceCode : selectedService.displayGroup ?? selectedService.serviceCode
          }
          title={selectedService.name}
          fee={selectedService.fee}
          displayGroup={selectedService.displayGroup}
          processingTime={selectedService.processingTime}
          open={requirementsOpen}
          onOpenChange={setRequirementsOpen}
          answers={isWalkInDetailedIntake(serviceCode) ? registrationAnswers : undefined}
        />
      )}
    </>
  );
}
