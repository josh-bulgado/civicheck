import { createServerFn } from "@tanstack/react-start";
import { getCaptchaPublicConfig, getInvisibleCaptchaPublicConfig } from "./captcha.server";

export const getCaptchaConfigFn = createServerFn({ method: "GET" })
  .handler(async () => getCaptchaPublicConfig());

export const getInvisibleCaptchaConfigFn = createServerFn({ method: "GET" })
  .handler(async () => getInvisibleCaptchaPublicConfig());
