/** Use a regular hyphen for em dashes in downloaded document text. */
export function documentText(value: string): string {
  return value.replaceAll("\u2014", "-");
}
