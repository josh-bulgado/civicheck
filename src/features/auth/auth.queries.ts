import { createServerFn } from "@tanstack/react-start";
import { requireActiveSession } from "~/server/auth";

export const getUserFn = createServerFn({ method: "GET" }).handler(async () => {
  try { return (await requireActiveSession()).user; } catch { return null; }
});
