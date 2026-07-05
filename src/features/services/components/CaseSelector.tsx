import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Label } from "~/components/ui/label";

interface Service {
  service_code: string;
  name: string;
  fee: number | string;
}

interface CaseSelectorProps {
  services: Service[];
  selectedCode: string | null;
  onSelect: (code: string) => void;
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
    if (name.includes("non-marital") || name.includes("nonmarital")) maritalStatuses.add("non-marital");
    if ((name.includes("marital") && !name.includes("non-marital") && !name.includes("nonmarital"))) maritalStatuses.add("marital");
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

export function CaseSelector({ services, selectedCode, onSelect }: CaseSelectorProps) {
  const steps = parseSelectionSteps(services);

  const [age, setAge] = useState<string | null>(null);
  const [program, setProgram] = useState<string | null>(null);
  const [marital, setMarital] = useState<string | null>(null);

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

  // If only 1 service in group, no selection needed
  if (services.length === 1) return null;

  const selectedService = services.find((s) => s.service_code === selectedCode);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Select Your Case</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Answer the questions below to find the right service for your situation.
        </p>
      </div>

      {/* Step 1: Age */}
      {steps.hasAge && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-700">
            1. Age of the person to be registered
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
                    ? "border-gray-200"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
                style={age === a ? { borderColor: "var(--svc-primary)", background: "var(--svc-primary-soft)" } : undefined}
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
          <p className="text-sm font-semibold text-gray-700">
            2. Registration program
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
                    ? "border-gray-200"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
                style={program === p ? { borderColor: "var(--svc-primary)", background: "var(--svc-primary-soft)" } : undefined}
              >
                <RadioGroupItem value={p} id={`prog-${p}`} />
                <Label htmlFor={`prog-${p}`} className="cursor-pointer text-sm">
                  <span className="font-medium">
                    {p === "brap" ? "Under BRAP" : "Normal"}
                  </span>
                  <span className="block text-xs text-gray-500 mt-0.5">
                    {p === "brap" ? "Free — PSA assisted program" : "Standard registration"}
                  </span>
                </Label>
              </label>
            ))}
          </RadioGroup>
        </div>
      )}

      {/* Step 3: Marital status — shown after program=normal, OR directly if no age/program steps */}
      {steps.hasMarital && (program === "normal" || (!steps.hasAge && !steps.hasProgram)) && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-700">
            {steps.hasAge || steps.hasProgram ? "3." : "1."} Status of the child
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
                      ? "border-gray-200"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                  style={marital === m ? { borderColor: "var(--svc-primary)", background: "var(--svc-primary-soft)" } : undefined}
                >
                  <RadioGroupItem value={m} id={`marital-${m}`} />
                  <Label htmlFor={`marital-${m}`} className="cursor-pointer text-sm">
                    <span className="font-medium capitalize">{m} Child</span>
                    {match && (
                      <span className="block text-xs text-gray-500 mt-0.5">
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
        <div className="rounded-lg px-4 py-3 text-sm" style={{ background: "var(--svc-cta-soft)", border: "1px solid var(--svc-cta)", color: "var(--svc-cta)" }}>
          <span className="font-semibold">Selected: </span>
          {selectedService.name} —{" "}
          <span className="font-semibold">
            {Number(selectedService.fee) === 0 ? "Free" : `₱${Number(selectedService.fee).toFixed(2)}`}
          </span>
        </div>
      )}
    </div>
  );
}
