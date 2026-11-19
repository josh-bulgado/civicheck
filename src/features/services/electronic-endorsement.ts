export function endorsementRequirementName(name: string, serviceCode: string | null, recordType?: string) {
  if (serviceCode !== "ELEC_ENDORSEMENT") return name;
  const forms: Record<string, string> = { birth: "1A", death: "2A", marriage: "3A" };
  const form = forms[recordType ?? ""];
  return form ? name.replace(/\bForm\s+1A\s*\/\s*2A\s*\/\s*3A\b/gi, `Form ${form}`) : name;
}
