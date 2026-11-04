import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { deleteCookie, getCookie, getRequest, setCookie } from "@tanstack/react-start/server";
import { getAppUrl } from "~/utils/app-url";
import { getSupabaseAdminClient } from "~/utils/supabase";
import { bucketKey, getClientIp } from "~/server/rate-limit";
import {
  captchaFailure, CAPTCHA_CONFIG_MESSAGE, CAPTCHA_TOKEN_MAX_LENGTH,
  CAPTCHA_RETRY_MESSAGE, CAPTCHA_UNAVAILABLE_MESSAGE,
} from "./captcha";

const TEST_SITE_KEY = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";
const TEST_SECRET_KEY = "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe";
const OAUTH_PROOF_COOKIE = "civicheck-oauth-captcha";
const PROOF_SECONDS = 10 * 60;

function isLocalDevelopment() {
  return process.env.NODE_ENV !== "production" && !process.env.VERCEL &&
    ["localhost", "127.0.0.1", "[::1]"].includes(new URL(getRequest().url).hostname);
}

function getSettings() {
  const local = isLocalDevelopment();
  let siteKey = process.env.RECAPTCHA_SITE_KEY?.trim();
  let secretKey = process.env.RECAPTCHA_SECRET_KEY?.trim();
  if (local && !siteKey && !secretKey) {
    siteKey = TEST_SITE_KEY;
    secretKey = TEST_SECRET_KEY;
  }
  if (!siteKey || !secretKey) throw new Error("reCAPTCHA keys are not configured");
  const testMode = siteKey === TEST_SITE_KEY || secretKey === TEST_SECRET_KEY;
  if (testMode && (!local || siteKey !== TEST_SITE_KEY || secretKey !== TEST_SECRET_KEY)) {
    throw new Error("reCAPTCHA test key pairs are restricted to local development");
  }
  const hostnames = (process.env.RECAPTCHA_ALLOWED_HOSTNAMES?.trim() || new URL(getAppUrl()).hostname)
    .split(",").map(host => host.trim().toLowerCase()).filter(Boolean);
  return { siteKey, secretKey, testMode, hostnames };
}

/** Only this public key is returned to the browser. */
export function getCaptchaPublicConfig() {
  try {
    return { siteKey: getSettings().siteKey, error: null };
  } catch {
    return { siteKey: null, error: CAPTCHA_CONFIG_MESSAGE };
  }
}

/** Google enforces two-minute expiry and single use; real tokens must match this site. */
export async function verifyCaptcha(token: string | undefined, settingsOverride?: {
  secretKey: string; hostnames: string[]; testMode: boolean; timeoutMs?: number;
}) {
  if (!token?.trim() || token.length > CAPTCHA_TOKEN_MAX_LENGTH) return captchaFailure();
  try {
    const settings = settingsOverride ?? getSettings();
    if (!settings.secretKey || !settings.hostnames.length) return captchaFailure(CAPTCHA_CONFIG_MESSAGE);
    const body = new URLSearchParams({ secret: settings.secretKey, response: token });
    const ip = getClientIp();
    if (ip) body.set("remoteip", ip);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), settingsOverride?.timeoutMs ?? 8000);
    let result: { success?: boolean; hostname?: unknown; score?: unknown; "error-codes"?: unknown };
    try {
      const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST", body, signal: controller.signal,
      });
      if (!response.ok) return captchaFailure(CAPTCHA_UNAVAILABLE_MESSAGE);
      result = await response.json();
    } finally {
      clearTimeout(timeout);
    }
    // Siteverify can return success alongside quota errors. Do not accept those
    // responses, or score-based v3 responses, as a valid v2 checkbox solution.
    if (result["error-codes"] != null &&
      (!Array.isArray(result["error-codes"]) || result["error-codes"].length > 0)) {
      const errors = result["error-codes"];
      return captchaFailure(Array.isArray(errors) && errors.includes("timeout-or-duplicate")
        ? CAPTCHA_RETRY_MESSAGE : CAPTCHA_UNAVAILABLE_MESSAGE);
    }
    if (result.success !== true) return captchaFailure(CAPTCHA_RETRY_MESSAGE);
    if (result.score !== undefined) return captchaFailure(CAPTCHA_RETRY_MESSAGE);
    // Google's test keys use fixed metadata. Only loopback development skips
    // hostname binding; public deployments cannot use those keys.
    if (!settings.testMode && (typeof result.hostname !== "string" ||
      !settings.hostnames.includes(result.hostname.toLowerCase()))) {
      return captchaFailure(CAPTCHA_RETRY_MESSAGE);
    }
    return { error: false as const };
  } catch {
    return captchaFailure(CAPTCHA_UNAVAILABLE_MESSAGE);
  }
}

function getInvisibleSettings() {
  const siteKey = process.env.RECAPTCHA_INVISIBLE_SITE_KEY?.trim();
  const secretKey = process.env.RECAPTCHA_INVISIBLE_SECRET_KEY?.trim();
  if (!siteKey || !secretKey) {
    const missing = [
      !siteKey && "RECAPTCHA_INVISIBLE_SITE_KEY",
      !secretKey && "RECAPTCHA_INVISIBLE_SECRET_KEY",
    ].filter(Boolean);
    throw new Error(`Missing ${missing.join(", ")}`);
  }
  const production = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  const hostnames = (process.env.RECAPTCHA_ALLOWED_HOSTNAMES ?? "")
    .split(",").map(host => host.trim().toLowerCase()).filter(Boolean)
    .filter(host => !["localhost", "127.0.0.1", "::1", "[::1]"].includes(host));
  if (!production) hostnames.push("localhost");
  if (!hostnames.length) throw new Error("Missing RECAPTCHA_ALLOWED_HOSTNAMES with a non-loopback hostname");
  if (siteKey === TEST_SITE_KEY || secretKey === TEST_SECRET_KEY) {
    throw new Error("Invisible reCAPTCHA requires its own v2 Invisible keys, not Checkbox test keys");
  }
  return { siteKey, secretKey, hostnames, testMode: false, timeoutMs: 4000 };
}

export function getInvisibleCaptchaPublicConfig() {
  try { return { siteKey: getInvisibleSettings().siteKey, error: null }; }
  catch (error) {
    // Configuration names only. Never expose secret values in logs or responses.
    console.error("Invisible reCAPTCHA configuration:", error instanceof Error ? error.message : "Invalid configuration");
    return { siteKey: null, error: CAPTCHA_CONFIG_MESSAGE };
  }
}

export async function verifyInvisibleCaptcha(token: string | undefined) {
  try { return await verifyCaptcha(token, getInvisibleSettings()); }
  catch { return captchaFailure(CAPTCHA_CONFIG_MESSAGE); }
}

function signProof(payload: string) {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("Missing OAuth proof signing key");
  return createHmac("sha256", secret).update(`oauth-captcha:${payload}`).digest("hex");
}

/** Carry a verified CAPTCHA across the external provider redirect. */
export function issueOAuthCaptchaProof(intent: "login" | "signup" = "signup") {
  const payload = Buffer.from(JSON.stringify({ id: randomUUID(), intent, expires: Date.now() + PROOF_SECONDS * 1000 })).toString("base64url");
  setCookie(OAUTH_PROOF_COOKIE, `${payload}.${signProof(payload)}`, {
    path: "/", httpOnly: true, sameSite: "lax",
    secure: new URL(getAppUrl()).protocol === "https:", maxAge: PROOF_SECONDS,
  });
}

/** Signed, expiring and consumed atomically: a direct/replayed callback cannot skip CAPTCHA. */
export async function consumeOAuthCaptchaProof(): Promise<boolean> {
  return !!(await consumeOAuthFlowProof());
}

/** Login proves initiation only; signup additionally proves checkbox completion. */
export async function consumeOAuthFlowProof(): Promise<"login" | "signup" | false> {
  const proof = getCookie(OAUTH_PROOF_COOKIE);
  deleteCookie(OAUTH_PROOF_COOKIE, { path: "/" });
  if (!proof || proof.length > 1024) return false;
  try {
    const [payload, signature, extra] = proof.split(".");
    if (!payload || !signature || extra) return false;
    const expected = Buffer.from(signProof(payload), "hex");
    const received = Buffer.from(signature, "hex");
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return false;
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { id?: unknown; expires?: unknown; intent?: unknown };
    if (typeof value.id !== "string" || typeof value.expires !== "number" ||
      value.expires <= Date.now() || value.expires > Date.now() + PROOF_SECONDS * 1000) return false;
    const { data, error } = await getSupabaseAdminClient().rpc("consume_rate_limit", {
      p_bucket: bucketKey("oauth-captcha-proof", value.id), p_limit: 1, p_window_seconds: PROOF_SECONDS,
    });
    if (error || data !== true) return false;
    return value.intent === "login" ? "login" : "signup";
  } catch {
    return false;
  }
}
