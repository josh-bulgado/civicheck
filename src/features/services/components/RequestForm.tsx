import { Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
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
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
      <form onSubmit={onSubmit} className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">
          Request Details
        </h2>

        {/* Subject Name */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Subject of the Document
          </p>

          <div className="space-y-1">
            <Label htmlFor="firstName">First Name <span className="text-red-500">*</span></Label>
            <Input
              id="firstName"
              value={values.subjectFirstName}
              onChange={(e) => onChange("subjectFirstName", e.target.value)}
              placeholder="e.g. Juan"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="middleName">Middle Name</Label>
              <Input
                id="middleName"
                value={values.subjectMiddleName}
                onChange={(e) => onChange("subjectMiddleName", e.target.value)}
                placeholder="e.g. Santos"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastName">Last Name <span className="text-red-500">*</span></Label>
              <Input
                id="lastName"
                value={values.subjectLastName}
                onChange={(e) => onChange("subjectLastName", e.target.value)}
                placeholder="e.g. Dela Cruz"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="suffix">Suffix (optional)</Label>
            <Input
              id="suffix"
              value={values.subjectSuffix}
              onChange={(e) => onChange("subjectSuffix", e.target.value)}
              placeholder="e.g. Jr., III"
            />
          </div>
        </div>

        {/* Event Details */}
        <div className="space-y-3 pt-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Event Information
          </p>

          <div className="space-y-1">
            <Label htmlFor="eventDate">Date of Event <span className="text-red-500">*</span></Label>
            <Input
              id="eventDate"
              type="date"
              value={values.eventDate}
              onChange={(e) => onChange("eventDate", e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="eventPlace">Place of Event <span className="text-red-500">*</span></Label>
            <Input
              id="eventPlace"
              value={values.eventPlace}
              onChange={(e) => onChange("eventPlace", e.target.value)}
              placeholder="e.g. Legazpi City, Albay"
              required
            />
          </div>
        </div>

        {/* Purpose */}
        <div className="space-y-3 pt-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Purpose & Notes
          </p>

          <div className="space-y-1">
            <Label htmlFor="purpose">Purpose of Request</Label>
            <Select
              value={values.purpose}
              onValueChange={(val) => onChange("purpose", val ?? "")}
            >
              <SelectTrigger id="purpose">
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
            <div className="space-y-1">
              <Label htmlFor="otherPurpose">Specify Purpose <span className="text-red-500">*</span></Label>
              <Input
                id="otherPurpose"
                value={values.otherPurpose}
                onChange={(e) => onChange("otherPurpose", e.target.value)}
                placeholder="Describe purpose"
                required
              />
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="notes">Additional Notes (optional)</Label>
            <Textarea
              id="notes"
              value={values.additionalNotes}
              onChange={(e) => onChange("additionalNotes", e.target.value)}
              placeholder="Any special requests or instructions..."
              rows={2}
            />
          </div>
        </div>

        <Button type="submit" disabled={submitting} className="w-full mt-4">
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
    </div>
  );
}
