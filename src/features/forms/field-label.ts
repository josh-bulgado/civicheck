export function formatFieldLabel(label: string): string {
  return label.replace(/[A-Za-z]+(?:['?][A-Za-z]+)*/g, (word) => {
    if (["of", "to", "the"].includes(word.toLowerCase())) {
      return word.toLowerCase();
    }
    return word.charAt(0).toUpperCase() + word.slice(1);
  });
}
