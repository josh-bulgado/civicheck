import { Button } from "~/components/ui/button";
import { DatePicker } from "~/components/ui/date-picker";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { Spinner } from "~/components/ui/spinner";
import { toDateKey } from "~/lib/date";

export interface RequestFormValues {
  subjectFirstName: string;
  subjectMiddleName: string;
  subjectLastName: string;
  subjectSuffix: string;
  eventDate: string;
  eventPlace: string;
  purpose: string;
  otherPurpose: string;
  additionalNotes: string;
}

interface RequestFormProps {
  values: RequestFormValues;
  onChange: (field: keyof RequestFormValues, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  eventDateLabel?: string;
  eventPlaceLabel?: string;
}

const PURPOSES = [
  "Local Use (ID, Barangay, etc.)",
  "Employment",
  "Passport / Travel",
  "School Records / Admission",
  "Social Security (SSS/GSIS/etc.)",
  "Legal / Court proceedings",
  "Other",
];

const PURPOSE_OPTIONS = PURPOSES.map((purpose) => ({
  label: purpose,
  value: purpose,
}));

export function RequestForm({
  values,
  onChange,
  onSubmit,
  submitting,
  eventDateLabel = "Date of Event",
  eventPlaceLabel = "Place of Event",
}: RequestFormProps) {
  return (
    <Card size="sm">
      <CardHeader className="border-b border-border pb-3">
        <CardTitle className="font-bold text-base">
          Request Details
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-4">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            {/* Subject Name */}
            <FieldSet>
              <FieldLegend variant="label">
                Subject of the document
              </FieldLegend>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <Field>
                  <FieldLabel htmlFor="firstName">First Name</FieldLabel>
                  <Input
                    id="firstName"
                    value={values.subjectFirstName}
                    onChange={(e) =>
                      onChange("subjectFirstName", e.target.value)
                    }
                    placeholder="e.g. Juan"
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="middleName">Middle Name</FieldLabel>
                  <Input
                    id="middleName"
                    value={values.subjectMiddleName}
                    onChange={(e) =>
                      onChange("subjectMiddleName", e.target.value)
                    }
                    placeholder="e.g. Santos"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
                  <Input
                    id="lastName"
                    value={values.subjectLastName}
                    onChange={(e) =>
                      onChange("subjectLastName", e.target.value)
                    }
                    placeholder="e.g. Dela Cruz"
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="suffix">Suffix</FieldLabel>
                  <Input
                    id="suffix"
                    value={values.subjectSuffix}
                    onChange={(e) => onChange("subjectSuffix", e.target.value)}
                    placeholder="e.g. Jr."
                  />
                </Field>
              </div>
            </FieldSet>

            {/* Event Details */}
            <FieldSet>
              <FieldLegend variant="label">Event information</FieldLegend>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="eventDate">{eventDateLabel}</FieldLabel>
                  <DatePicker
                    id="eventDate"
                    value={values.eventDate}
                    onValueChange={(value) => onChange("eventDate", value)}
                    max={toDateKey()}
                    clearable={false}
                    placeholder={eventDateLabel}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="eventPlace">
                    {eventPlaceLabel}
                  </FieldLabel>
                  <Input
                    id="eventPlace"
                    value={values.eventPlace}
                    onChange={(e) => onChange("eventPlace", e.target.value)}
                    placeholder="e.g. Legazpi City, Albay"
                    required
                  />
                </Field>
              </div>
            </FieldSet>

            {/* Purpose */}
            <FieldSet>
              <FieldLegend variant="label">Purpose & notes</FieldLegend>

              <Field>
                <FieldLabel htmlFor="purpose">Purpose of Request</FieldLabel>
                <Select
                  items={PURPOSE_OPTIONS}
                  value={values.purpose}
                  onValueChange={(val) => onChange("purpose", val ?? "")}
                >
                  <SelectTrigger id="purpose">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {PURPOSES.map((purpose) => (
                        <SelectItem key={purpose} value={purpose}>
                          {purpose}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              {values.purpose === "Other" && (
                <Field>
                  <FieldLabel htmlFor="otherPurpose">
                    Specify Purpose
                  </FieldLabel>
                  <Input
                    id="otherPurpose"
                    value={values.otherPurpose}
                    onChange={(e) => onChange("otherPurpose", e.target.value)}
                    placeholder="Describe purpose"
                    required
                  />
                </Field>
              )}

              <Field>
                <FieldLabel htmlFor="notes">
                  Additional Notes (optional)
                </FieldLabel>
                <Textarea
                  id="notes"
                  value={values.additionalNotes}
                  onChange={(e) =>
                    onChange("additionalNotes", e.target.value)
                  }
                  placeholder="Any special requests or instructions..."
                  rows={2}
                />
              </Field>
            </FieldSet>
          </FieldGroup>

          <Button
            type="submit"
            // eventDate is picked, not typed, so it carries no native `required`.
            disabled={submitting || !values.eventDate}
            className="mt-4 w-full"
          >
            {submitting ? (
              <>
                <Spinner data-icon="inline-start" />
                Submitting Request...
              </>
            ) : (
              "Submit Request Intent"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
