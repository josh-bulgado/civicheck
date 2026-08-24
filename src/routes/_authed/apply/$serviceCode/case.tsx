import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClock } from "lucide-react";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { DatePicker } from "~/components/ui/date-picker";
import { Textarea } from "~/components/ui/textarea";
import { ageInYears, diffInDays, toDateKey } from "~/lib/date";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { BirthTrackRedirectDialog } from "~/features/apply/components/BirthTrackRedirectDialog";
import { WizardShell } from "~/features/apply/components/WizardShell";
import { WizardFooterActions } from "~/features/apply/components/WizardFooterActions";
import { isVisible } from "~/features/services/service-utils";
import {
  seedDraftForGroup,
  useApplyDraft,
} from "~/features/apply/hooks/useApplyDraft";
import { INFORMANT_RELATIONSHIPS, PLACE_TYPES } from "~/lib/case-fields";
import {
  CaseSelector,
  inferMaritalStatus,
} from "~/features/services/components/CaseSelector";
import { Route as ApplyLayoutRoute } from "./route";

export const Route = createFileRoute("/_authed/apply/$serviceCode/case")({
  component: CaseStepRoute,
});

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

const INFORMANT_RELATIONSHIP_OPTIONS = INFORMANT_RELATIONSHIPS.map(
  (relationship) => ({
    label: relationship,
    value: relationship,
  }),
);

// On-Time birth registration only covers births within this window; outside
// it (or, in reverse, a Delayed application for a birth still within it),
// the applicant is nudged toward the other track. See `checkBirthTrack`.
const ON_TIME_WINDOW_DAYS = 30;
const MARRIAGE_LICENSE_CODE = "MARRIAGE_LICENSE";
const MARRIAGE_NOTICE_DAYS = 10;
const RECOMMENDED_MARRIAGE_LEAD_DAYS = 21;
const OPPOSITE_BIRTH_GROUP: Record<string, string> = {
  birth_ontime: "birth_delayed",
  birth_delayed: "birth_ontime",
};

const caseSchema = z
  .object({
    eventDate: z.string().min(1, "This date is required"),
    eventPlace: z.string().min(1, "This place is required"),
    purpose: z.string().min(1),
    otherPurpose: z.string(),
    additionalNotes: z.string(),
    referenceNumber: z.string(),
    placeType: z.string(),
    informantName: z.string(),
    informantRelationship: z.string(),
  })
  .refine((v) => v.purpose !== "Other" || v.otherPurpose.trim().length > 0, {
    message: "Please specify the purpose",
    path: ["otherPurpose"],
  });

type CaseValues = z.infer<typeof caseSchema>;

type RedirectDirection = "toDelayed" | "toOnTime";

/** Does `dateKey` qualify for `birthGroup`'s track, and if not, which way should it switch? */
function mismatchDirection(
  dateKey: string,
  birthGroup: string | null,
): RedirectDirection | null {
  if (!dateKey || !birthGroup) return null;
  const daysAgo = diffInDays(dateKey, toDateKey());
  if (birthGroup === "birth_ontime" && daysAgo > ON_TIME_WINDOW_DAYS)
    return "toDelayed";
  if (
    birthGroup === "birth_delayed" &&
    daysAgo >= 0 &&
    daysAgo <= ON_TIME_WINDOW_DAYS
  ) {
    return "toOnTime";
  }
  return null;
}

function formatLeadTime(days: number) {
  if (days === 0) return "today";
  if (days === 1) return "1 day away";
  return `${days} days away`;
}

function getMarriageTimingNotice(
  serviceCode: string | undefined,
  intendedDate: string,
) {
  if (serviceCode !== MARRIAGE_LICENSE_CODE || !intendedDate) return null;

  const daysUntilMarriage = diffInDays(toDateKey(), intendedDate);
  if (daysUntilMarriage < 0) return null;

  if (daysUntilMarriage <= MARRIAGE_NOTICE_DAYS) {
    return {
      title: "Your intended marriage date is too soon",
      description: `This date is ${formatLeadTime(daysUntilMarriage)}. A marriage license is issued only after the required 10-day public-notice period, and you must first attend the scheduled family-planning and pre-marriage counseling session. Choose a later date; planning at least 3 weeks ahead is safer.`,
    };
  }

  if (daysUntilMarriage < RECOMMENDED_MARRIAGE_LEAD_DAYS) {
    return {
      title: "Allow more time before the wedding",
      description: `This date is ${formatLeadTime(daysUntilMarriage)}. The schedule may be tight after the family-planning and pre-marriage counseling session, document processing, and the required 10-day public-notice period. Planning at least 3 weeks ahead is safer.`,
    };
  }

  return null;
}

function CaseStepRoute() {
  const { serviceCode } = Route.useParams();
  const navigate = useNavigate();
  const { isGroup, requirements, services } =
    ApplyLayoutRoute.useLoaderData();
  const { draft, update, hydrated, clear } = useApplyDraft(serviceCode);
  const selectedService =
    services.find((s) => s.service_code === draft.selectedServiceCode) ??
    services[0];
  const dateLabel = selectedService?.event_date_label || "Date of event";
  const placeLabel = selectedService?.event_place_label || "Place of event";
  const referenceLabel = selectedService?.reference_number_label;
  const dateDirection = selectedService?.event_date_direction ?? "past";
  const asksPurpose = selectedService?.asks_purpose ?? true;
  const asksBirthDetails = selectedService?.asks_birth_details ?? false;

  // A non-grouped service has only one possible code — resolve it silently,
  // there's nothing to ask via CaseSelector.
  useEffect(() => {
    if (hydrated && !isGroup && !draft.selectedServiceCode) {
      update({ selectedServiceCode: services[0].service_code });
    }
  }, [hydrated, isGroup, draft.selectedServiceCode, services, update]);

  // Every variant in a group shares its display_group, so this identifies
  // "which birth track am I on" regardless of which specific variant applies.
  const birthGroup = services[0]?.display_group ?? null;
  const targetBirthGroup =
    asksBirthDetails && birthGroup
      ? (OPPOSITE_BIRTH_GROUP[birthGroup] ?? null)
      : null;

  const form = useForm<CaseValues>({
    resolver: zodResolver(caseSchema),
    mode: "onBlur",
    values: {
      eventDate: draft.eventDate,
      eventPlace: draft.eventPlace,
      purpose: draft.caseAnswers.purpose,
      otherPurpose: draft.caseAnswers.otherPurpose,
      additionalNotes: draft.caseAnswers.additionalNotes,
      referenceNumber: draft.caseAnswers.referenceNumber,
      placeType: draft.caseAnswers.placeType,
      informantName: draft.caseAnswers.informantName,
      informantRelationship: draft.caseAnswers.informantRelationship,
    },
  });

  const purpose = form.watch("purpose");
  const placeType = form.watch("placeType");
  const watchedEventDate = form.watch("eventDate");
  const marriageTimingNotice = getMarriageTimingNotice(
    selectedService?.service_code,
    watchedEventDate,
  );

  // Recomputed from whatever date is currently in the form — not just at the
  // moment it was picked — so dismissing the dialog without actually fixing
  // the date doesn't leave the applicant free to continue on the wrong track.
  const currentMismatch = targetBirthGroup
    ? mismatchDirection(watchedEventDate, birthGroup)
    : null;

  const [redirectDirection, setRedirectDirection] =
    useState<RedirectDirection | null>(null);
  // A date the applicant already dismissed the prompt for shouldn't re-prompt
  // on every subsequent blur — only a genuinely new date re-triggers the check.
  const lastCheckedDate = useRef<string | null>(null);

  function checkBirthTrack(dateKey: string) {
    if (lastCheckedDate.current === dateKey) return;
    lastCheckedDate.current = dateKey;
    const direction = mismatchDirection(dateKey, birthGroup);
    if (direction) setRedirectDirection(direction);
  }

  function handleSwitchTrack() {
    if (!targetBirthGroup) return;
    const values = form.getValues();

    seedDraftForGroup(targetBirthGroup, {
      // Nothing downstream (subjects, contact number) has been filled in yet
      // at this point in the wizard — the redirect fires before "who is this
      // for" — so only this step's own answers need to carry over.
      eventDate: values.eventDate,
      eventPlace: values.eventPlace,
      caseAnswers: {
        purpose: values.purpose,
        otherPurpose: values.otherPurpose,
        additionalNotes: values.additionalNotes,
        referenceNumber: values.referenceNumber,
        placeType: values.placeType,
        informantName: values.informantName,
        informantRelationship: values.informantRelationship,
      },
      // Marital status is only known once CaseSelector has resolved a specific
      // variant — if the applicant answers the date before that, don't guess:
      // leave it unset so the target group's CaseSelector still asks it.
      presetMarital: draft.selectedServiceCode
        ? inferMaritalStatus(selectedService.name)
        : null,
      presetAge: ageInYears(values.eventDate) >= 80 ? "80+" : "0-79",
    });
    clear();
    setRedirectDirection(null);
    navigate({
      to: "/apply/$serviceCode/case",
      params: { serviceCode: targetBirthGroup },
    });
  }

  function onSubmit(values: CaseValues) {
    update(() => ({
      eventDate: values.eventDate,
      eventPlace: values.eventPlace,
      caseAnswers: {
        purpose: values.purpose,
        otherPurpose: values.otherPurpose,
        additionalNotes: values.additionalNotes,
        referenceNumber: values.referenceNumber,
        placeType: values.placeType,
        informantName: values.informantName,
        informantRelationship: values.informantRelationship,
      },
    }));
    navigate({ to: "/apply/$serviceCode/details", params: { serviceCode } });
  }

  function handleServiceSelect(code: string) {
    update((previous) => {
      if (!code) return { selectedServiceCode: null };
      const visibleRequirementIds = new Set(
        requirements
          .filter((requirement) => isVisible(requirement, code))
          .map((requirement) => requirement.id),
      );
      return {
        selectedServiceCode: code,
        documents: previous.documents.filter((document) =>
          visibleRequirementIds.has(document.requirementId),
        ),
      };
    });
  }

  return (
    <WizardShell
      step={1}
      title="Tell us about your case"
      description="A few quick questions to find the right service and get the details of your case."
    >
      <div className="flex flex-col gap-6">
        {isGroup && (
          <CaseSelector
            services={services}
            selectedCode={draft.selectedServiceCode}
            onSelect={handleServiceSelect}
            presetAge={draft.presetAge}
            presetMarital={draft.presetMarital}
          />
        )}

        <FieldGroup>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="eventDate"
              render={({ field, fieldState }) => (
                <Field
                  data-invalid={fieldState.invalid || Boolean(currentMismatch)}
                >
                  <FieldLabel htmlFor="eventDate">{dateLabel}</FieldLabel>
                  <DatePicker
                    id="eventDate"
                    value={field.value}
                    onValueChange={(next) => {
                      field.onChange(next);
                      // DatePicker only calls this on a discrete calendar
                      // click (no keystroke-by-keystroke typing to debounce
                      // here), and it hands us the fresh value directly —
                      // reading `field.value` instead would still be the
                      // previous render's stale closure at this point.
                      checkBirthTrack(next);
                    }}
                    onBlur={field.onBlur}
                    max={dateDirection === "past" ? toDateKey() : undefined}
                    min={dateDirection === "future" ? toDateKey() : undefined}
                    placeholder={`Select the ${dateLabel.toLowerCase()}`}
                    invalid={fieldState.invalid || Boolean(currentMismatch)}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                  {!fieldState.invalid && currentMismatch && (
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm text-warning-strong">
                        {currentMismatch === "toDelayed"
                          ? "This date is more than 30 days ago."
                          : "This date is within the last 30 days."}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSwitchTrack}
                      >
                        Switch to{" "}
                        {currentMismatch === "toDelayed"
                          ? "Delayed"
                          : "On-Time"}{" "}
                        Registration
                      </Button>
                    </div>
                  )}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="eventPlace"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="eventPlace">{placeLabel}</FieldLabel>
                  <Input
                    id="eventPlace"
                    autoComplete="off"
                    placeholder={
                      placeType === "home"
                        ? "e.g. Purok 2, Barangay Imalnod, Legazpi City"
                        : placeType === "hospital"
                          ? "e.g. Sto. Niño General Hospital, Legazpi City"
                          : "e.g. Legazpi City, Albay"
                    }
                    {...field}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>

          {marriageTimingNotice ? (
            <Alert variant="warning" role="status" aria-live="polite">
              <CalendarClock aria-hidden="true" />
              <AlertTitle>{marriageTimingNotice.title}</AlertTitle>
              <AlertDescription>
                {marriageTimingNotice.description}
              </AlertDescription>
            </Alert>
          ) : null}

          {asksBirthDetails && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="placeType"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="placeType">
                      Where did the birth take place?
                    </FieldLabel>
                    <Select
                      items={PLACE_TYPES}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        id="placeType"
                        className="w-full capitalize"
                      >
                        <SelectValue placeholder="Select one" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {PLACE_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="informantRelationship"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="informantRelationship">
                      Informant&rsquo;s relationship to the child
                    </FieldLabel>
                    <Select
                      items={INFORMANT_RELATIONSHIP_OPTIONS}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        id="informantRelationship"
                        className="w-full capitalize"
                      >
                        <SelectValue placeholder="Select one" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {INFORMANT_RELATIONSHIPS.map((relationship) => (
                            <SelectItem
                              key={relationship}
                              value={relationship}
                            >
                              {relationship}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="informantName"
                render={({ field }) => (
                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="informantName">
                      Informant&rsquo;s name
                    </FieldLabel>
                    <Input
                      id="informantName"
                      autoComplete="off"
                      placeholder="Full name of the person reporting the birth"
                      {...field}
                    />
                  </Field>
                )}
              />
            </div>
          )}

          {referenceLabel && (
            <Controller
              control={form.control}
              name="referenceNumber"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="referenceNumber">
                    {referenceLabel}
                  </FieldLabel>
                  <Input
                    id="referenceNumber"
                    autoComplete="off"
                    {...field}
                  />
                </Field>
              )}
            />
          )}

          {asksPurpose && (
            <Controller
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="purpose">Purpose of request</FieldLabel>
                  <Select
                    items={PURPOSE_OPTIONS}
                    value={field.value}
                    onValueChange={field.onChange}
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
              )}
            />
          )}

          {asksPurpose && purpose === "Other" && (
            <Controller
              control={form.control}
              name="otherPurpose"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="otherPurpose">
                    Specify purpose
                  </FieldLabel>
                  <Input
                    id="otherPurpose"
                    autoComplete="off"
                    {...field}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          )}

          <Controller
            control={form.control}
            name="additionalNotes"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="additionalNotes">
                  Additional notes (optional)
                </FieldLabel>
                <Textarea
                  id="additionalNotes"
                  autoComplete="off"
                  placeholder="Any special requests or instructions…"
                  rows={3}
                  {...field}
                />
              </Field>
            )}
          />
        </FieldGroup>

        <WizardFooterActions
          onContinue={form.handleSubmit(onSubmit)}
          continueLabel="Continue to your details"
          continueDisabled={
            (isGroup && !draft.selectedServiceCode) || currentMismatch !== null
          }
          note={
            currentMismatch
              ? "Resolve the date above before continuing."
              : undefined
          }
        />
      </div>

      <BirthTrackRedirectDialog
        open={redirectDirection !== null}
        onOpenChange={(open) => !open && setRedirectDirection(null)}
        direction={redirectDirection}
        onKeepEditing={() => setRedirectDirection(null)}
        onSwitch={handleSwitchTrack}
      />
    </WizardShell>
  );
}
