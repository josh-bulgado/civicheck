import { FieldLegend, FieldSet } from "~/components/ui/field";
import { RequiredMark } from "~/components/ui/required-mark";
import { ChoiceGroup, choiceLegendClass } from "~/features/forms/components/ChoiceGroup";
import { PETITION_OPTIONS, withPrimaryPetition } from "../petition-selection";

interface Props {
  answers: Record<string, string>;
  onChange: (answers: Record<string, string>) => void;
}

export function PrimaryPetitionSelection({ answers, onChange }: Props) {
  return <FieldSet className="gap-3">
    <FieldLegend variant="label" className={choiceLegendClass}>
      What do you need to change or correct? <RequiredMark />
    </FieldLegend>
    <ChoiceGroup wide idPrefix="primary-petition" value={answers.primary_petition ?? ""}
      options={PETITION_OPTIONS} onValueChange={value => onChange(withPrimaryPetition(answers, value))} />
  </FieldSet>;
}
