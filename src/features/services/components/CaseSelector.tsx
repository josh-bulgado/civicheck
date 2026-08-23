import { useEffect, useState } from "react";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

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
    <Card size="sm" className="border-l-4 border-l-brand-gold">
      <CardHeader className="border-b border-border pb-3">
        <CardTitle className="text-base font-bold text-foreground">Select Your Case</CardTitle>
        <p className="text-xs text-muted-foreground">
          Answer the questions below to find the right service for your situation.
        </p>
      </CardHeader>

      <CardContent className="pt-4 space-y-6">
        {/* Step 1: Age */}
        {showAge && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">
              {stepPrefix(true)}Age of the person to be registered
            </p>
            <RadioGroup
              value={age ?? ""}
              onValueChange={handleAge}
              className="grid grid-cols-2 gap-3"
            >
              {steps.ages.map((a) => (
                <label
                  key={a}
                  className={`flex items-center gap-3 rounded-lg border p-3.5 cursor-pointer transition-colors ${
                    age === a
                      ? "border-primary bg-primary text-white shadow-sm [&_.case-helper]:text-white/70"
                      : "border-border-strong bg-white text-foreground hover:border-primary/40 hover:bg-surface-subtle"
                  }`}
                >
                  <RadioGroupItem value={a} id={`age-${a}`} />
                  <Label htmlFor={`age-${a}`} className="cursor-pointer font-medium text-sm">
                    {a === "0-79" ? "0 – 79 years old" : "80 years old and above"}
                  </Label>
                </label>
              ))}
            </RadioGroup>
          </div>
        )}

        {/* Step 2: Program (only after age picked) */}
        {steps.hasProgram && age && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">
              {stepPrefix(true)}Registration program
            </p>
            <RadioGroup
              value={program ?? ""}
              onValueChange={handleProgram}
              className="grid grid-cols-2 gap-3"
            >
              {steps.programs.map((p) => (
                <label
                  key={p}
                  className={`flex items-center gap-3 rounded-lg border p-3.5 cursor-pointer transition-colors ${
                    program === p
                      ? "border-primary bg-primary text-white shadow-sm [&_.case-helper]:text-white/70"
                      : "border-border-strong bg-white text-foreground hover:border-primary/40 hover:bg-surface-subtle"
                  }`}
                >
                  <RadioGroupItem value={p} id={`prog-${p}`} />
                  <Label htmlFor={`prog-${p}`} className="cursor-pointer text-sm">
                    <span className="font-medium">
                      {p === "brap" ? "Under BRAP" : "Normal"}
                    </span>
                    <span className="case-helper mt-0.5 block text-xs text-muted-foreground">
                      {p === "brap" ? "Free — PSA assisted program" : "Standard registration"}
                    </span>
                  </Label>
                </label>
              ))}
            </RadioGroup>
          </div>
        )}

        {/* Step 3: Marital status — shown after program=normal, OR directly if no age/program steps */}
        {showMarital && (program === "normal" || (!steps.hasAge && !steps.hasProgram)) && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">
              {stepPrefix(true)}Are the child&rsquo;s parents legally married?
            </p>
            <RadioGroup
              value={marital ?? ""}
              onValueChange={handleMarital}
              className="grid grid-cols-2 gap-3"
            >
              {steps.maritalStatuses.map((m) => {
                const match = services.find((s) => matches(s.name, age, program, m));
                return (
                  <label
                    key={m}
                    className={`flex items-center gap-3 rounded-lg border p-3.5 cursor-pointer transition-colors ${
                      marital === m
                        ? "border-primary bg-primary text-white shadow-sm [&_.case-helper]:text-white/70"
                        : "border-border-strong bg-white text-foreground hover:border-primary/40 hover:bg-surface-subtle"
                    }`}
                  >
                    <RadioGroupItem value={m} id={`marital-${m}`} />
                    <Label htmlFor={`marital-${m}`} className="cursor-pointer text-sm">
                      <span className="font-medium">{m === "marital" ? "Yes" : "No"}</span>
                      {match && (
                        <span className="case-helper mt-0.5 block text-xs text-muted-foreground">
                          {Number(match.fee) === 0 ? "Free" : `₱${Number(match.fee).toFixed(2)}`}
                        </span>
                      )}
                    </Label>
                  </label>
                );
              })}
            </RadioGroup>
          </div>
        )}

        {/* Selected result summary */}
        {selectedService && (
          <div className="rounded-lg border border-primary/25 bg-primary-soft px-4 py-3 text-sm text-primary-hover">
            <span className="font-semibold">Selected: </span>
            {selectedService.name} —{" "}
            <span className="font-semibold">
              {Number(selectedService.fee) === 0 ? "Free" : `₱${Number(selectedService.fee).toFixed(2)}`}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
