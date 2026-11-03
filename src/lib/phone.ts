// Mobile numbers are entered after a fixed "+63" prefix: ten digits starting
// with 9, the shape every phone validator in the app checks for.
export const MOBILE_NUMBER_LENGTH = 10;

/** Drops everything but the digits from what was typed or pasted. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * A stored ten-digit mobile number as it is read locally: "9171234567" becomes
 * "0917 123 4567". A partial number is grouped the same way as it is typed.
 */
export function formatLocalMobile(digits: string): string {
  if (!digits) return "";
  const local = `0${digits}`;
  return [local.slice(0, 4), local.slice(4, 7), local.slice(7, 11)]
    .filter(Boolean)
    .join(" ");
}

/**
 * What a "+63" mobile input keeps of its raw value: digits only, at most ten.
 * A number pasted in full ("+63 917 123 4567", "0917-123-4567") loses the
 * country code or leading zero the prefix already stands for.
 */
export function mobileDigits(value: string): string {
  let digits = digitsOnly(value);
  if (digits.startsWith("63") && digits.length > MOBILE_NUMBER_LENGTH) {
    digits = digits.slice(2);
  }
  return digits.replace(/^0+/, "").slice(0, MOBILE_NUMBER_LENGTH);
}
