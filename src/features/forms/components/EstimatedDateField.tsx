import { Checkbox } from "~/components/ui/checkbox";
import { DatePicker } from "~/components/ui/date-picker";
import { Input } from "~/components/ui/input";
import { todayKeyInTimeZone } from "../form-template.utils";
import { ESTIMATE_PREFIX, UNKNOWN_DATE, isEstimatedDate } from "../estimated-date";
import { WIZARD_CONTROL_CLASS } from "./wizard-field";

export function EstimatedDateField({ id, value, onChange, onBlur, invalid }: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  invalid: boolean;
}) {
  const estimated = isEstimatedDate(value);
  return (
    <>
      {estimated ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={id}>Estimated year or year range (required)</label>
          <Input
            id={id}
            value={value === UNKNOWN_DATE ? "" : value.slice(ESTIMATE_PREFIX.length)}
            onChange={(event) => onChange(event.target.value.trim() ? ESTIMATE_PREFIX + event.target.value : UNKNOWN_DATE)}
            onBlur={onBlur}
            placeholder="2018 or 2015–2020"
            maxLength={32}
            required
            aria-invalid={invalid}
            aria-describedby={`${id}-help`}
            className={WIZARD_CONTROL_CLASS}
          />
          <p id={`${id}-help`} className="text-sm text-muted-foreground">
            Enter your best estimate so CCRO can locate the record in the archive.
          </p>
        </div>
      ) : (
        <DatePicker id={id} value={value} onValueChange={onChange} onBlur={onBlur}
          max={todayKeyInTimeZone()} invalid={invalid} icon="calendar"
          className={`${WIZARD_CONTROL_CLASS} h-10 px-3`} />
      )}
      <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
        <Checkbox checked={estimated} onCheckedChange={(checked) => onChange(checked === true ? UNKNOWN_DATE : "")} />
        I don’t remember the exact date
      </label>
    </>
  );
}
