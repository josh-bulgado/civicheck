import { describe, expect, it } from "vitest";
import {
  PASSWORD_RULES_MESSAGE,
  passwordMeetsRules,
  strongPasswordSchema,
} from "./auth.schema";
import { describeWeakPassword } from "./password-error";

describe("password rules", () => {
  it("asks for all four kinds of character, as Supabase Auth does", () => {
    expect(passwordMeetsRules("123Uwu.1")).toBe(true);
    // The one that was refused at signup: no uppercase letter.
    expect(passwordMeetsRules("123uwu.1")).toBe(false);
    expect(passwordMeetsRules("Abcdefgh1")).toBe(false);
    expect(passwordMeetsRules("Abcdefgh.")).toBe(false);
    expect(passwordMeetsRules("ABCDEFG1.")).toBe(false);
  });

  it("only counts the symbols Supabase counts", () => {
    expect(passwordMeetsRules("Abcdef1é")).toBe(false);
    expect(passwordMeetsRules("Abcdef1 ")).toBe(false);
    expect(passwordMeetsRules("Abcdef1~")).toBe(true);
  });

  it("explains a missing kind in one line", () => {
    const result = strongPasswordSchema.safeParse("123uwu.1");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(PASSWORD_RULES_MESSAGE);
  });
});

describe("describeWeakPassword", () => {
  it("replaces Supabase's list of every accepted character", () => {
    const message = describeWeakPassword({
      code: "weak_password",
      reasons: ["characters"],
    });
    expect(message).toBe(PASSWORD_RULES_MESSAGE);
    expect(message!.length).toBeLessThan(80);
  });

  it("names a breached or too-short password for what it is", () => {
    expect(
      describeWeakPassword({ code: "weak_password", reasons: ["pwned"] }),
    ).toMatch(/data breach/);
    expect(
      describeWeakPassword({ code: "weak_password", reasons: ["length"] }),
    ).toMatch(/at least 8/i);
  });

  it("leaves other errors alone", () => {
    expect(describeWeakPassword({ code: "same_password" })).toBeNull();
    expect(describeWeakPassword({})).toBeNull();
  });
});
