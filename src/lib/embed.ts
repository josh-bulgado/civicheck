/**
 * The related row PostgREST embeds with a select such as
 * `services_registry(name)`. It is one object or a one-item array depending on
 * how the foreign key is declared, and null when nothing matches.
 */
export function one<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}
