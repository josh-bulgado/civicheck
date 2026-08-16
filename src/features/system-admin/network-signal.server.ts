import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";

const MAX_USER_AGENT_LENGTH = 300;

function maskIpAddress(ip: string): string | null {
  const trimmed = ip.trim();
  if (!trimmed) return null;

  if (trimmed.includes(":")) {
    const groups = trimmed.split(":").filter(Boolean).slice(0, 4);
    return groups.length ? `${groups.join(":")}::` : null;
  }

  const octets = trimmed.split(".");
  if (octets.length !== 4) return null;
  return `${octets.slice(0, 3).join(".")}.0`;
}

export function describeUserAgent(userAgent: string | null): string | null {
  if (!userAgent) return null;

  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /OPR\//.test(userAgent)
      ? "Opera"
      : /Chrome\//.test(userAgent)
        ? "Chrome"
        : /Firefox\//.test(userAgent)
          ? "Firefox"
          : /Safari\//.test(userAgent)
            ? "Safari"
            : "an unrecognized browser";

  const os = /Windows/.test(userAgent)
    ? "Windows"
    : /Mac OS X/.test(userAgent)
      ? "macOS"
      : /Android/.test(userAgent)
        ? "Android"
        : /iPhone|iPad|iPod/.test(userAgent)
          ? "iOS"
          : /Linux/.test(userAgent)
            ? "Linux"
            : "an unrecognized device";

  return `${browser} on ${os}`;
}

/**
 * Best-effort network signal for staff/administrator audit trails. Never returns
 * a raw, re-identifiable IP address — only a network-masked one (host-level
 * detail zeroed) — since this feeds tables that are contractually IP-redacted.
 */
export function getRequestNetworkSignal(): {
  maskedIpAddress: string | null;
  userAgent: string | null;
  deviceLabel: string | null;
} {
  try {
    const rawIp = getRequestIP({ xForwardedFor: true });
    const userAgent = getRequestHeader("user-agent") ?? null;
    return {
      maskedIpAddress: rawIp ? maskIpAddress(rawIp) : null,
      userAgent: userAgent ? userAgent.slice(0, MAX_USER_AGENT_LENGTH) : null,
      deviceLabel: describeUserAgent(userAgent),
    };
  } catch {
    return { maskedIpAddress: null, userAgent: null, deviceLabel: null };
  }
}
