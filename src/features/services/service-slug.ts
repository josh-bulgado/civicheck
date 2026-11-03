import { redirect } from "@tanstack/react-router";

/**
 * The URL form of a registry identifier (a `display_group` or `service_code`):
 *   "MARRIAGE_LICENSE" -> "marriage-license"
 *   "birth_delayed"    -> "birth-delayed"
 *   "RA9048-CCE"       -> "ra9048-cce"
 * Lossy on purpose — codes mix case and separators, so going back from a slug
 * takes a lookup against the real codes, not a string rule.
 */
export function toServiceSlug(code: string): string {
  return code
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
}

/**
 * Route guard for a URL that still carries a raw registry code, such as a link
 * saved before the URLs were slugged: sends it to the slugged address.
 * `prefix` is the path up to the code ("/apply/"), so only that segment is
 * rewritten.
 */
export function redirectToServiceSlug(
  location: { href: string },
  prefix: string,
  code: string,
): void {
  const slug = toServiceSlug(code);
  if (slug === code) return;
  throw redirect({
    href: location.href.replace(`${prefix}${code}`, `${prefix}${slug}`),
    replace: true,
  });
}
