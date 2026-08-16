const COUNT_FORMATTER = new Intl.NumberFormat("en-PH");

const OFFICE_DATE_FORMATTER = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "full",
  timeZone: "Asia/Manila",
});

export function formatCount(value: number) {
  return COUNT_FORMATTER.format(value);
}

export function formatOfficeDate(dateKey: string) {
  return OFFICE_DATE_FORMATTER.format(
    new Date(`${dateKey}T00:00:00+08:00`),
  );
}
