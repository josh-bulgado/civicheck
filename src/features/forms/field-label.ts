export function formatNameHeading(label: string): string {
  const names: Record<string, string> = {
    child: "Child's Name",
    groom: "Groom's Name",
    bride: "Bride's Name",
    husband: "Husband's Name",
    wife: "Wife's Maiden Name",
    mother: "Mother's Maiden Name",
    father: "Father's Name",
    deceased: "Deceased Person's Name",
    applicant: "Applicant's Name",
    requester: "Requester's Name",
  };
  const normalized = label.trim().toLowerCase();
  if (names[normalized]) return names[normalized];
  const maiden = normalized.match(/^maiden name of (?:the )?(wife|mother)$/);
  if (maiden) return names[maiden[1]];
  const person = normalized.match(/^(?:full )?name of (?:the )?(child|groom|bride|husband|wife|mother|father|deceased|applicant|requester)$/);
  return person ? names[person[1]] : formatFieldLabel(label);
}

export function formatFieldLabel(label: string): string {
  label = label.replace(/^requester['’]s (first|middle|last) name$/i, "$1 Name");

  if (label.trim() === "Registered late?") return "Registered Late?";

  if (label.trimEnd().endsWith("?")) return label;

  return label.replace(/[A-Za-z]+(?:['’][A-Za-z]+)*/g, (word) => {
    if (["of", "to", "the", "on"].includes(word.toLowerCase())) {
      return word.toLowerCase();
    }
    return word.charAt(0).toUpperCase() + word.slice(1);
  });
}
