import { createServerFn } from "@tanstack/react-start";
import { requireActiveSession } from "~/server/auth";
import { loadCcroStaff } from "./staff.server";

export const getStaff = createServerFn({ method: "GET" }).handler(async () => {
  await requireActiveSession("users:invite_staff");
  return loadCcroStaff();
});
