import { createServerFn } from "@tanstack/react-start";
import { getCaptchaPublicConfig } from "./captcha.server";

export const getCaptchaConfigFn = createServerFn({ method: "GET" })
  .handler(async () => getCaptchaPublicConfig());
