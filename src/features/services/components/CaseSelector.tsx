import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import {
  Field,
  FieldContent,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "~/components/ui/field";

const choiceGroupClass =
  "grid grid-cols-1 gap-0 overflow-hidden rounded-lg border border-border bg-white divide-y divide-border-light sm:grid-cols-2 sm:divide-x sm:divide-y-0";

const choiceLabelClass =
  "cursor-pointer has-[>[data-slot=field]]:rounded-none has-[>[data-slot=field]]:border-0 transition-colors hover:bg-primary-tint focus-within:bg-primary-tint has-data-checked:bg-primary-soft/70";

interface Service {
  service_code: string;
  name: string;
  fee: number | string;
}

interface CaseSelectorProps {
  services: Service[];
  selectedCode: string | null;
  onSelect: (code: string) => void;
  /**
   * Pre-answered dimensions — set when the applicant arrived here via the
   * On-Time/Delayed birth-registration redirect, which already knows the
   * marital status and age bracket from the group they switched from. The
   * corresponding question is skipped rather than re-asked.
   */
  presetAge?: string | null;
  presetMarital?: string | null;
}

/** Marital status implied by a service's charter name, or null if it doesn't say. */
export function inferMaritalStatus(name: string): "marital" | "non-marital" | null {
  const n = name.toLowerCase();
  if (n.includes("non-marital") || n.includes("nonmarital")) return "non-marital";
  if (n.includes("marital")) return "marital";
  return null;
}

// Parse the DCOLB-style service codes into selection dimensions.
// Works for any display_group by extracting meaningful segments from the name.
function parseSelectionSteps(services: Service[]) {
  // Determine which dimensions exist across the group
  const ages = new Set<string>();
  const programs = new Set<string>();
  const maritalStatuses = new Set<string>();

  for (const s of services) {
    const name = s.name.toLowerCase();
    if (name.includes("0-79") || name.includes("0–79")) ages.add("0-79");
    if (name.includes("80")) ages.add("80+");
    if (name.includes("brap")) programs.add("brap");
    if (name.includes("normal")) programs.add("normal");
    const marital = inferMaritalStatus(name);
    if (marital) maritalStatuses.add(marital);
  }

  return {
    hasAge: ages.size > 1,
    hasProgram: programs.size > 1,
    hasMarital: maritalStatuses.size > 1,
    ages: [...ages].sort(),
    programs: [...programs].sort(),
    maritalStatuses: [...maritalStatuses].sort(),
  };
}

function matches(name: string, age: string | null, program: string | null, marital: string | null) {
  const n = name.toLowerCase();
  if (age === "0-79" && !(n.includes("0-79") || n.includes("0–79"))) return false;
  if (age === "80+" && !n.includes("80")) return false;
  if (program === "brap" && !n.includes("brap")) return false;
  if (program === "normal" && !n.includes("normal")) return false;
  if (marital === "marital" && (n.includes("non-marital") || n.includes("nonmarital"))) return false;
  if (marital === "marital" && !(n.includes("marital"))) return false;
  if (marital === "non-marital" && !(n.includes("non-marital") || n.includes("nonmarital"))) return false;
  return true;
}

export function CaseSelector({
  services,
  selectedCode,
  onSelect,
  presetAge = null,
  presetMarital = null,
}: CaseSelectorProps) {
  const steps = parseSelectionSteps(services);

  const [age, setAge] = useState<string | null>(presetAge);
  const [program, setProgram] = useState<string | null>(null);
  const [marital, setMarital] = useState<string | null>(presetMarital);

  const showAge = steps.hasAge && !presetAge;
  const showMarital = steps.hasMarital && !presetMarital;
  // With both age and marital already known, at most one question (Program)
  // remains — numbering a single question adds nothing.
  const showNumbers =
    [showAge, steps.hasProgram, showMarital].filter(Boolean).length > 1;
  let stepCounter = 0;
  function stepPrefix(visible: boolean) {
    if (!visible || !showNumbers) return "";
    stepCounter += 1;
    return `${stepCounter}. `;
  }

  // When age changes, reset downstream
  const handleAge = (val: string) => {
    setAge(val);
    setProgram(null);
    setMarital(null);
    onSelect(""); // clear selection
  };

  const handleProgram = (val: string) => {
    setProgram(val);
    setMarital(null);
    onSelect("");
    // If no marital step needed, auto-resolve
    if (!steps.hasMarital || val === "brap") {
      const match = services.find((s) => matches(s.name, age, val, null));
      if (match) onSelect(match.service_code);
    }
  };

  const handleMarital = (val: string) => {
    setMarital(val);
    const match = services.find((s) => matches(s.name, age, program, val));
    // Fallback for groups with only marital dimension (no age/program)
    if (match) {
      onSelect(match.service_code);
    } else {
      const direct = services.find((s) => s.name.toLowerCase().includes(val.replace("-", "")));
      if (direct) onSelect(direct.service_code);
    }
  };

  // Edge case (not hit by today's groups, all of which also have a Program
  // dimension): both age and marital arrived preset and nothing else needs
  // asking — resolve immediately instead of leaving the selector blank.
  useEffect(() => {
    if (selectedCode || showAge || steps.hasProgram || showMarital) return;
    const match = services.find((s) => matches(s.name, age, program, marital));
    if (match) onSelect(match.service_code);
    // Runs once per mount of a fully-preset selector; `services`/`onSelect`
    // are stable for the lifetime of one wizard session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If only 1 service in group, no selection needed
  if (services.length === 1) return null;

  const selectedService = services.find((s) => s.service_code === selectedCode);

  return (
    <section
      aria-labelledby="case-selector-title"
      className="border-y border-border-light py-5 sm:py-6"
    >
      <div>
        <h2
          id="case-selector-title"
          className="text-pretty text-lg font-bold text-foreground"
        >
          Find the right service
        </h2>
        <p className="mt-1 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
          Choose the answers that match this case. We&rsquo;ll select the correct
          service.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-6">
        {/* Step 1: Age */}
        {showAge && (
          <FieldSet className="civic-enter-sm gap-3">
            <FieldLegend variant="label">
              {stepPrefix(true)}Age of the person to be registered
            </FieldLegend>
            <RadioGroup
              value={age ?? ""}
              onValueChange={handleAge}
              className={choiceGroupClass}
            >
              {steps.ages.map((a) => (
                <FieldLabel
                  key={a}
                  htmlFor={`age-${a}`}
                  className={choiceLabelClass}
                >
                  <Field orientation="horizontal" className="min-h-14">
                    <RadioGroupItem value={a} id={`age-${a}`} />
                    <FieldContent>
                      {a === "0-79" ? "0 – 79 years old" : "80 years old and above"}
                    </FieldContent>
                  </Field>
                </FieldLabel>
              ))}
            </RadioGroup>
          </FieldSet>
        )}

        {/* Step 2: Program (only after age picked) */}
        {steps.hasProgram && age && (
          <FieldSet className="civic-enter-sm gap-3">
            <FieldLegend variant="label">
              {stepPrefix(true)}Registration program
            </FieldLegend>
            <RadioGroup
              value={program ?? ""}
              onValueChange={handleProgram}
              className={choiceGroupClass}
            >
              {steps.programs.map((p) => (
                <FieldLabel
                  key={p}
                  htmlFor={`prog-${p}`}
                  className={choiceLabelClass}
                >
                  <Field orientation="horizontal" className="min-h-16">
                    <RadioGroupItem value={p} id={`prog-${p}`} />
                    <FieldContent>
                      <span className="font-medium">
                        {p === "brap"
                          ? "BRAP-assisted registration"
                          : "Standard registration"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {p === "brap"
                          ? "PSA-assisted program"
                          : "Regular filing process"}
                      </span>
                    </FieldContent>
                  </Field>
                </FieldLabel>
              ))}
            </RadioGroup>
          </FieldSet>
        )}

        {/* Step 3: Marital status — shown after program=normal, OR directly if no age/program steps */}
        {showMarital && (program === "normal" || (!steps.hasAge && !steps.hasProgram)) && (
          <FieldSet className="civic-enter-sm gap-3">
            <FieldLegend variant="label">
              {stepPrefix(true)}Are the child&rsquo;s parents legally married?
            </FieldLegend>
            <RadioGroup
              value={marital ?? ""}
              onValueChange={handleMarital}
              className={choiceGroupClass}
            >
              {steps.maritalStatuses.map((m) => (
                <FieldLabel
                  key={m}
                  htmlFor={`marital-${m}`}
                  className={choiceLabelClass}
                >
                  <Field orientation="horizontal" className="min-h-14">
                    <RadioGroupItem value={m} id={`marital-${m}`} />
                    <FieldContent>
                      <span className="font-medium">
                        {m === "marital" ? "Yes" : "No"}
                      </span>
                    </FieldContent>
                  </Field>
                </FieldLabel>
              ))}
            </RadioGroup>
          </FieldSet>
        )}

        {/* The exact service and fee are shown in the selected-service strip above. */}
        {selectedService && (
          <div
            role="status"
            aria-live="polite"
            className="civic-enter-sm flex items-center gap-2 border-t border-success/20 pt-4 text-sm font-semibold text-success"
          >
            <CheckCircle2 className="size-4.5 shrink-0" aria-hidden="true" />
            Service selected. Check the selection above before continuing.
            <span className="sr-only">{selectedService.name}</span>
          </div>
        )}
      </div>
    </section>
  );
}
