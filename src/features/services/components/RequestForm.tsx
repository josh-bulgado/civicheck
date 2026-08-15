import { Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";

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

export function RequestForm({ values, onChange, onSubmit, submitting }: RequestFormProps) {
  return (
    <Card size="sm" className="lg:sticky lg:top-24">
      <CardHeader className="pb-3 border-b border-border">
        <CardTitle className="font-bold text-base">
          Request Details
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-4">
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Subject Name */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-foreground">
              Subject of the document
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-xs font-medium text-muted-foreground">First Name <span className="text-primary">*</span></Label>
                <Input
                  id="firstName"
                  value={values.subjectFirstName}
                  onChange={(e) => onChange("subjectFirstName", e.target.value)}
                  placeholder="e.g. Juan"
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="middleName" className="text-xs font-medium text-muted-foreground">Middle Name</Label>
                <Input
                  id="middleName"
                  value={values.subjectMiddleName}
                  onChange={(e) => onChange("subjectMiddleName", e.target.value)}
                  placeholder="e.g. Santos"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-xs font-medium text-muted-foreground">Last Name <span className="text-primary">*</span></Label>
                <Input
                  id="lastName"
                  value={values.subjectLastName}
                  onChange={(e) => onChange("subjectLastName", e.target.value)}
                  placeholder="e.g. Dela Cruz"
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="suffix" className="text-xs font-medium text-muted-foreground">Suffix</Label>
                <Input
                  id="suffix"
                  value={values.subjectSuffix}
                  onChange={(e) => onChange("subjectSuffix", e.target.value)}
                  placeholder="e.g. Jr."
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Event Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-foreground">
              Event information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="eventDate" className="text-xs font-medium text-muted-foreground">Date of Event <span className="text-primary">*</span></Label>
                <Input
                  id="eventDate"
                  type="date"
                  value={values.eventDate}
                  onChange={(e) => onChange("eventDate", e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="eventPlace" className="text-xs font-medium text-muted-foreground">Place of Event <span className="text-primary">*</span></Label>
                <Input
                  id="eventPlace"
                  value={values.eventPlace}
                  onChange={(e) => onChange("eventPlace", e.target.value)}
                  placeholder="e.g. Legazpi City, Albay"
                  required
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Purpose */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-foreground">
              Purpose & notes
            </h3>

            <div className="space-y-1.5">
              <Label htmlFor="purpose" className="text-xs font-medium text-muted-foreground">Purpose of Request</Label>
              <Select
                value={values.purpose}
                onValueChange={(val) => onChange("purpose", val ?? "")}
              >
                <SelectTrigger id="purpose" className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PURPOSES.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {values.purpose === "Other" && (
              <div className="space-y-1.5">
                <Label htmlFor="otherPurpose" className="text-xs font-medium text-muted-foreground">Specify Purpose <span className="text-primary">*</span></Label>
                <Input
                  id="otherPurpose"
                  value={values.otherPurpose}
                  onChange={(e) => onChange("otherPurpose", e.target.value)}
                  placeholder="Describe purpose"
                  required
                  className="h-9 text-xs"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-medium text-muted-foreground">Additional Notes (optional)</Label>
              <Textarea
                id="notes"
                value={values.additionalNotes}
                onChange={(e) => onChange("additionalNotes", e.target.value)}
                placeholder="Any special requests or instructions..."
                rows={2}
                className="text-xs"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full mt-4"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
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
