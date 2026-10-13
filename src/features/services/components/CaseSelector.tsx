import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { FieldLegend, FieldSet } from "~/components/ui/field";
import { RequiredMark } from "~/components/ui/required-mark";
import {
  ChoiceGroup,
  choiceLegendClass,
} from "~/features/forms/components/ChoiceGroup";
import type { CaseSelectorDefinition } from "~/features/forms/form-template.types";
import { conditionRuleMatches } from "~/features/forms/form-template.utils";
import { formatPesoFee } from "~/features/services/service-utils";

interface Service {
  service_code: string;
  name: string;
  fee: number | string;
}

interface CaseSelectorProps {
  services: Service[];
  selectedCode: string | null;
  onSelect: (code: string) => void;
  definition?: CaseSelectorDefinition;
  answers?: Record<string, string>;
  contextAnswers?: Record<string, string>;
  onAnswersChange?: (answers: Record<string, string>) => void;
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

/** Compares two sentences ignoring case, spacing, and trailing punctuation. */
function sameSentence(a: string, b: string) {
  const normalize = (value: string) =>
    value.trim().replace(/[\s]+/g, " ").replace(/[?.!:]+$/, "").toLowerCase();
  return normalize(a) === normalize(b);
}

/**
 * Quiet confirmation of the service the answers resolved to. The docket above
 * the form already carries the name and fee, so this stays a single muted line
 * (and the live region still announces the result to screen readers).
 */
function SelectedServiceNote({ name }: { name: string }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className="civic-enter-sm flex items-start gap-2 text-sm text-muted-foreground"
    >
      <CheckCircle2
        className="mt-0.5 size-4 shrink-0 text-success"
        aria-hidden="true"
      />
      <span>
        Selected: <span className="font-medium text-foreground">{name}</span>
      </span>
    </p>
  );
}

function LegacyCaseSelector({
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

  // Names that carry none of the age/program/marital tokens give this selector
  // nothing to ask. Falling through to `matches` would then accept every
  // service and silently pick whichever sorts first, so such a group is picked
  // from directly below instead.
  const hasDimensions = steps.hasAge || steps.hasProgram || steps.hasMarital;

  // Edge case (not hit by today's groups, all of which also have a Program
  // dimension): both age and marital arrived preset and nothing else needs
  // asking — resolve immediately instead of leaving the selector blank.
  useEffect(() => {
    if (!hasDimensions) return;
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
        {/* No question can tell these variants apart, so let the applicant pick one. */}
        {!hasDimensions && (
          <FieldSet className="civic-enter-sm gap-3">
            <FieldLegend variant="label" className={choiceLegendClass}>
              Which service do you need? <RequiredMark />
            </FieldLegend>
            <ChoiceGroup
              wide
              idPrefix="service"
              value={selectedCode ?? ""}
              onValueChange={onSelect}
              options={services.map((service) => ({
                value: service.service_code,
                label: service.name,
                description: `Fee at cashier: ${formatPesoFee(service.fee)}`,
              }))}
            />
          </FieldSet>
        )}

        {/* Step 1: Age */}
        {showAge && (
          <FieldSet className="civic-enter-sm gap-3">
            <FieldLegend variant="label" className={choiceLegendClass}>
              {stepPrefix(true)}Age of the person to be registered <RequiredMark />
            </FieldLegend>
            <ChoiceGroup
              wide
              idPrefix="age"
              value={age ?? ""}
              onValueChange={handleAge}
              options={steps.ages.map((a) => ({
                value: a,
                label: a === "0-79" ? "0 – 79 years old" : "80 years old and above",
              }))}
            />
          </FieldSet>
        )}

        {/* Step 2: Program (only after age picked) */}
        {steps.hasProgram && age && (
          <FieldSet className="civic-enter-sm gap-3">
            <FieldLegend variant="label" className={choiceLegendClass}>
              {stepPrefix(true)}Registration program <RequiredMark />
            </FieldLegend>
            <ChoiceGroup
              wide
              idPrefix="prog"
              value={program ?? ""}
              onValueChange={handleProgram}
              options={steps.programs.map((p) => ({
                value: p,
                label:
                  p === "brap" ? "BRAP-assisted registration" : "Standard registration",
                description:
                  p === "brap" ? "PSA-assisted program" : "Regular filing process",
              }))}
            />
          </FieldSet>
        )}

        {/* Step 3: Marital status — shown after program=normal, OR directly if no age/program steps */}
        {showMarital && (program === "normal" || (!steps.hasAge && !steps.hasProgram)) && (
          <FieldSet className="civic-enter-sm gap-3">
            <FieldLegend variant="label" className={choiceLegendClass}>
              {stepPrefix(true)}Are the child&rsquo;s parents legally married?{" "}
              <RequiredMark />
            </FieldLegend>
            <ChoiceGroup
              wide
              idPrefix="marital"
              value={marital ?? ""}
              onValueChange={handleMarital}
              options={steps.maritalStatuses.map((m) => ({
                value: m,
                label: m === "marital" ? "Yes" : "No",
              }))}
            />
          </FieldSet>
        )}

        {selectedService && <SelectedServiceNote name={selectedService.name} />}
      </div>
    </section>
  );
}

function ConfiguredCaseSelector({
  services,
  selectedCode,
  onSelect,
  definition,
  answers = {},
  contextAnswers = {},
  onAnswersChange,
  presetAge,
  presetMarital,
}: CaseSelectorProps & { definition: CaseSelectorDefinition }) {
  function resolve(nextAnswers: Record<string, string>) {
    const answerBag = { ...contextAnswers, ...nextAnswers };
    const visibleQuestions = definition.questions.filter((question) =>
      conditionRuleMatches(question.visibleWhen, answerBag),
    );
    if (visibleQuestions.some((question) => !nextAnswers[question.key])) {
      return null;
    }
    return (
      definition.outcomes.find((outcome) =>
        conditionRuleMatches(outcome.when, answerBag),
      )?.serviceCode ?? null
    );
  }

  function publishAnswers(nextAnswers: Record<string, string>) {
    const cleaned = { ...nextAnswers };
    for (const question of definition.questions) {
      if (
        !conditionRuleMatches(question.visibleWhen, {
          ...contextAnswers,
          ...cleaned,
        })
      ) {
        delete cleaned[question.key];
      }
    }
    onAnswersChange?.(cleaned);
    onSelect(resolve(cleaned) ?? "");
  }

  useEffect(() => {
    const seeded = { ...answers };
    if (presetAge && definition.questions.some((question) => question.key === "age")) {
      seeded.age = presetAge;
    }
    if (
      presetMarital &&
      definition.questions.some((question) => question.key === "marital")
    ) {
      seeded.marital = presetMarital;
    }
    if (Object.entries(seeded).some(([key, value]) => answers[key] !== value)) {
      publishAnswers(seeded);
    }
    // Presets are one-time draft migration inputs. Publishing them again after
    // every answer would overwrite a deliberate applicant change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetAge, presetMarital]);

  const visibleQuestions = definition.questions.filter((question) =>
    conditionRuleMatches(question.visibleWhen, {
      ...contextAnswers,
      ...answers,
    }),
  );
  const resolvedCode = resolve(answers);
  useEffect(() => {
    const nextCode = resolvedCode ?? "";
    if (nextCode !== (selectedCode ?? "")) onSelect(nextCode);
  }, [resolvedCode, selectedCode, onSelect]);
  const selectedService = services.find(
    (service) => service.service_code === selectedCode,
  );

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
          {definition.title}
          {/* A lone question that repeats the title has no legend of its own,
              so the heading is what the applicant answers. */}
          {visibleQuestions.length === 1 &&
          sameSentence(visibleQuestions[0].label, definition.title) ? (
            <>
              {" "}
              <RequiredMark />
            </>
          ) : null}
        </h2>
        <p className="mt-1 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
          {definition.description ??
            "Choose the answers that match this case. We’ll select the correct service."}
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-6">
        {visibleQuestions.map((question, index) => {
          // A lone question that just restates the section title would show the
          // same sentence twice in a row, so the title names the group instead.
          const repeatsTitle =
            visibleQuestions.length === 1 &&
            sameSentence(question.label, definition.title);
          return (
            <FieldSet key={question.key} className="civic-enter-sm gap-3">
              {repeatsTitle ? null : (
                <FieldLegend variant="label" className={choiceLegendClass}>
                  {visibleQuestions.length > 1 ? `${index + 1}. ` : ""}
                  {question.label} <RequiredMark />
                </FieldLegend>
              )}
              {question.description ? (
                <p className="text-xs text-muted-foreground">
                  {question.description}
                </p>
              ) : null}
              <ChoiceGroup
                wide
                idPrefix={`case-${question.key}`}
                value={answers[question.key] ?? ""}
                onValueChange={(value) =>
                  publishAnswers({ ...answers, [question.key]: value })
                }
                options={question.options}
                labelledBy={repeatsTitle ? "case-selector-title" : undefined}
              />
            </FieldSet>
          );
        })}

        {selectedService ? (
          <SelectedServiceNote name={selectedService.name} />
        ) : null}
      </div>
    </section>
  );
}

export function CaseSelector(props: CaseSelectorProps) {
  if (props.definition) {
    return <ConfiguredCaseSelector {...props} definition={props.definition} />;
  }
  return <LegacyCaseSelector {...props} />;
}
