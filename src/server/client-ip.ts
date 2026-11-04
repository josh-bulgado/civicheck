import { ipAddress } from "@vercel/functions";
import { getRequest, getRequestIP } from "@tanstack/react-start/server";
import ipaddr from "ipaddr.js";

/** One trusted address source for counters, CAPTCHA and audit logs. */
export function getClientIp(): string | null {
  try {
    // Outside Vercel forwarded headers are attacker-controlled. The framework
    // may expose the socket peer; otherwise use the shared unknown-IP bucket.
    const raw = process.env.VERCEL === "1"
      ? ipAddress(getRequest())
      : getRequestIP({ xForwardedFor: false });
    return normalizeClientIp(raw);
  } catch {
    return null;
  }
}

export function normalizeClientIp(raw: string | null | undefined): string | null {
  if (!raw || raw.includes("%") || !ipaddr.isValid(raw.trim())) return null;
  const address = ipaddr.process(raw.trim());
  if (address.kind() === "ipv4") return address.toString();
  // All addresses within an IPv6 /64 share an identity, including alternative
  // textual spellings. Keep a valid IP string for Google's optional remoteip.
  const bytes = address.toByteArray();
  bytes.fill(0, 8);
  return ipaddr.fromByteArray(bytes).toString();
}
