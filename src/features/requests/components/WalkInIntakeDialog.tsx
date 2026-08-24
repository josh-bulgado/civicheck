import { useEffect, useState } from "react";
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
import { ServiceRequirementsDialog } from "~/features/services/components/ServiceRequirementsDialog";
import {
  emptySubject,
  reconcileSubjects,
  subjectsMatchRoles,
  type SubjectFields,
} from "~/lib/subject-fields";

interface WalkInIntakeDialogProps {
  services: EncodableService[];
  onChanged: () => void;
}

export function WalkInIntakeDialog({ services, onChanged }: WalkInIntakeDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const [serviceCode, setServiceCode] = useState("");
  const [subjects, setSubjects] = useState<SubjectFields[]>([emptySubject("Subject")]);
  const [purpose, setPurpose] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [encodedRequest, setEncodedRequest] = useState<{
    trackingNumber: string;
  } | null>(null);

  const selectedService = services.find((service) => service.serviceCode === serviceCode);

  // Most services ask about one person; Marriage License asks about two.
  // Resize the subject list to match whenever the selected service changes.
  useEffect(() => {
    const roles = selectedService?.partyRoles ?? ["Subject"];
    setSubjects((prev) => (subjectsMatchRoles(prev, roles) ? prev : reconcileSubjects(prev, roles)));
  }, [selectedService]);

  const showRoleLabels = subjects.length > 1;

  function updateSubject(index: number, patch: Partial<SubjectFields>) {
    setSubjects((prev) =>
      prev.map((subject, i) => (i === index ? { ...subject, ...patch } : subject)),
    );
  }

  function reset() {
    setServiceCode("");
    setSubjects([emptySubject("Subject")]);
    setPurpose("");
    setContactNumber("");
    setEncodedRequest(null);
    setRequirementsOpen(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = await encodeWalkInFn({
        data: {
          serviceCode,
          subjects,
          purpose,
          contactNumber,
        },
      });

      if (result.error) {
        toast.error("Could not encode this walk-in", { description: result.message });
        return;
      }

      setEncodedRequest({ trackingNumber: result.trackingNumber });
      onChanged();
      toast.success("Walk-in request encoded", {
        description: `Tracking number ${result.trackingNumber}`,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} disabled={services.length === 0}>
        Encode walk-in
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
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
                  <FieldLabel htmlFor="walkin-service">Service requested</FieldLabel>
                  <div className="flex gap-2">
                    <Select value={serviceCode} onValueChange={(value) => setServiceCode(value ?? "")}>
                      <SelectTrigger id="walkin-service" className="flex-1">
                        <SelectValue placeholder="Select a department service" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {services.map((service) => (
                            <SelectItem key={service.serviceCode} value={service.serviceCode}>
                              {service.name} — ₱{service.fee.toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!selectedService}
                      onClick={() => setRequirementsOpen(true)}
                    >
                      View requirements
                    </Button>
                  </div>
                </Field>

                {subjects.map((subject, index) => (
                  <div key={index} className="space-y-3">
                    {showRoleLabels && (
                      <p className="text-sm font-medium text-foreground">
                        {subject.role}
                      </p>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor={`walkin-first-${index}`}>First name</FieldLabel>
                        <Input
                          id={`walkin-first-${index}`}
                          value={subject.firstName}
                          onChange={(event) =>
                            updateSubject(index, { firstName: event.target.value })
                          }
                          required
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor={`walkin-last-${index}`}>Last name</FieldLabel>
                        <Input
                          id={`walkin-last-${index}`}
                          value={subject.lastName}
                          onChange={(event) =>
                            updateSubject(index, { lastName: event.target.value })
                          }
                          required
                        />
                      </Field>
                    </div>
                  </div>
                ))}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="walkin-contact">Contact number (optional)</FieldLabel>
                    <Input
                      id="walkin-contact"
                      value={contactNumber}
                      onChange={(event) => setContactNumber(event.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="walkin-purpose">Purpose (optional)</FieldLabel>
                    <Input
                      id="walkin-purpose"
                      value={purpose}
                      onChange={(event) => setPurpose(event.target.value)}
                    />
                  </Field>
                </div>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      submitting ||
                      !serviceCode ||
                      subjects.some((s) => !s.firstName.trim() || !s.lastName.trim())
                    }
                  >
                    {submitting ? "Encoding..." : "Encode request"}
                  </Button>
                </div>
              </FieldGroup>
            </form>
          ) : (
            <div className="flex flex-col gap-5">
              <Alert>
                <AlertTitle>Request {encodedRequest.trackingNumber} is ready</AlertTitle>
                <AlertDescription>
                  The request has been submitted and is ready for staff to process.
                </AlertDescription>
              </Alert>
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    setOpen(false);
                    reset();
                  }}
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
          serviceCode={selectedService.displayGroup ?? selectedService.serviceCode}
          title={selectedService.name}
          fee={selectedService.fee}
          displayGroup={selectedService.displayGroup}
          processingTime={selectedService.processingTime}
          open={requirementsOpen}
          onOpenChange={setRequirementsOpen}
        />
      )}
    </>
  );
}
