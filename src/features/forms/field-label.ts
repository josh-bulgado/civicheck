export function formatFieldLabel(label: string): string {
  label = label.replace(/^requester['’]s (first|middle|last) name$/i, "$1 Name");

  if (label.trim() === "Registered late?") return "Registered Late?";

  if (label.trimEnd().endsWith("?")) return label;

  return label.replace(/[A-Za-z]+(?:['?][A-Za-z]+)*/g, (word) => {
    if (["of", "to", "the"].includes(word.toLowerCase())) {
      return word.toLowerCase();
    }
    return word.charAt(0).toUpperCase() + word.slice(1);
  });
}
