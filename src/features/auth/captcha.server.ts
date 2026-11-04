import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { deleteCookie, getCookie, getRequest, setCookie } from "@tanstack/react-start/server";
import { getAppUrl } from "~/utils/app-url";
import { getSupabaseAdminClient } from "~/utils/supabase";
import { bucketKey, getClientIp } from "~/server/rate-limit";
import {
  captchaFailure, CAPTCHA_ACTION, CAPTCHA_RETRY_MESSAGE, CAPTCHA_UNAVAILABLE_MESSAGE,
} from "./captcha";

const TEST_SITE_KEY = "1x00000000000000000000AA";
const TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";
const OAUTH_PROOF_COOKIE = "civicheck-oauth-captcha";
const PROOF_SECONDS = 10 * 60;

function isLocalDevelopment() {
  return process.env.NODE_ENV !== "production" && !process.env.VERCEL &&
    ["localhost", "127.0.0.1", "[::1]"].includes(new URL(getRequest().url).hostname);
}

function getSettings() {
  const local = isLocalDevelopment();
  let siteKey = process.env.TURNSTILE_SITE_KEY?.trim();
  let secretKey = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (local && !siteKey && !secretKey) {
    siteKey = TEST_SITE_KEY;
    secretKey = TEST_SECRET_KEY;
  }
  if (!siteKey || !secretKey) throw new Error("Turnstile keys are not configured");
  const testMode = /^[123]x0{8}/.test(siteKey) || /^[123]x0{8}/.test(secretKey);
  if (testMode && !local) throw new Error("Turnstile test keys are restricted to local development");
  const hostnames = (process.env.TURNSTILE_ALLOWED_HOSTNAMES || new URL(getAppUrl()).hostname)
    .split(",").map(host => host.trim().toLowerCase()).filter(Boolean);
  return { siteKey, secretKey, testMode, hostnames };
}

/** Only this public key is returned to the browser. */
export function getCaptchaPublicConfig() {
  try {
    return { siteKey: getSettings().siteKey, error: null };
  } catch {
    return { siteKey: null, error: CAPTCHA_UNAVAILABLE_MESSAGE };
  }
}

/** Cloudflare enforces expiry and single use; we also bind real tokens to this site/action. */
export async function verifyCaptcha(token: string | undefined) {
  if (!token?.trim() || token.length > 2048) return captchaFailure();
  try {
    const settings = getSettings();
    const body = new URLSearchParams({ secret: settings.secretKey, response: token });
    const ip = getClientIp();
    if (ip) body.set("remoteip", ip);
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", body, signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return captchaFailure(CAPTCHA_UNAVAILABLE_MESSAGE);
    const result = await response.json() as { success?: boolean; action?: string; hostname?: string };
    if (result.success !== true) return captchaFailure(CAPTCHA_RETRY_MESSAGE);
    // Cloudflare's dummy keys return fixed metadata, so these checks are only
    // skipped for test keys on an actual local development request.
    if (!settings.testMode && (result.action !== CAPTCHA_ACTION ||
      !result.hostname || !settings.hostnames.includes(result.hostname.toLowerCase()))) {
      return captchaFailure(CAPTCHA_RETRY_MESSAGE);
    }
    return { error: false as const };
  } catch {
    return captchaFailure(CAPTCHA_UNAVAILABLE_MESSAGE);
  }
}

function signProof(payload: string) {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("Missing OAuth proof signing key");
  return createHmac("sha256", secret).update(`oauth-captcha:${payload}`).digest("hex");
}

/** Carry a verified CAPTCHA across the external provider redirect. */
export function issueOAuthCaptchaProof() {
  const payload = Buffer.from(JSON.stringify({ id: randomUUID(), expires: Date.now() + PROOF_SECONDS * 1000 })).toString("base64url");
  setCookie(OAUTH_PROOF_COOKIE, `${payload}.${signProof(payload)}`, {
    path: "/", httpOnly: true, sameSite: "lax",
    secure: new URL(getAppUrl()).protocol === "https:", maxAge: PROOF_SECONDS,
  });
}

/** Signed, expiring and consumed atomically: a direct/replayed callback cannot skip CAPTCHA. */
export async function consumeOAuthCaptchaProof(): Promise<boolean> {
  const proof = getCookie(OAUTH_PROOF_COOKIE);
  deleteCookie(OAUTH_PROOF_COOKIE, { path: "/" });
  if (!proof || proof.length > 1024) return false;
  try {
    const [payload, signature, extra] = proof.split(".");
    if (!payload || !signature || extra) return false;
    const expected = Buffer.from(signProof(payload), "hex");
    const received = Buffer.from(signature, "hex");
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return false;
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { id?: unknown; expires?: unknown };
    if (typeof value.id !== "string" || typeof value.expires !== "number" ||
      value.expires <= Date.now() || value.expires > Date.now() + PROOF_SECONDS * 1000) return false;
    const { data, error } = await getSupabaseAdminClient().rpc("consume_rate_limit", {
      p_bucket: bucketKey("oauth-captcha-proof", value.id), p_limit: 1, p_window_seconds: PROOF_SECONDS,
    });
    return !error && data === true;
  } catch {
    return false;
  }
}
