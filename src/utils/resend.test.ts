import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "./resend";

const fetchMock = vi.fn<typeof fetch>();
const message = {
  to: "recipient@example.com",
  subject: "Your CiviCheck email verification code",
  html: "<p>Your code is 123456.</p>",
  text: "Your code is 123456.",
};
const authEmail = { category: "auth" as const, ...message };

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("RESEND_API_KEY", "test-api-key");
  vi.stubEnv("RESEND_FROM_EMAIL", undefined);
  vi.stubEnv("RESEND_FROM_AUTH", undefined);
  vi.stubEnv("RESEND_FROM_UPDATES", undefined);
  vi.stubEnv("RESEND_FROM_ALERTS", undefined);
  vi.stubEnv("RESEND_REPLY_TO", undefined);
  fetchMock.mockResolvedValue(Response.json({ id: "test-message-id" }));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetAllMocks();
});

function sentPayload() {
  return JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
}

describe("transactional email sender", () => {
  it.each([
    ["auth", "RESEND_FROM_AUTH"],
    ["updates", "RESEND_FROM_UPDATES"],
    ["alerts", "RESEND_FROM_ALERTS"],
  ] as const)("uses the %s category sender", async (category, environmentVariable) => {
    vi.stubEnv(environmentVariable, ` CiviCheck ${category} <${category}@civicheck.xyz> `);

    await expect(sendEmail({ category, ...message })).resolves.toEqual({
      id: "test-message-id",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer test-api-key" }),
      }),
    );
    expect(sentPayload()).toEqual({
      from: `CiviCheck ${category} <${category}@civicheck.xyz>`,
      ...message,
    });
  });

  it("uses the shared sender as a migration fallback", async () => {
    vi.stubEnv("RESEND_FROM_EMAIL", " CiviCheck <accounts@mail.example.com> ");

    await sendEmail(authEmail);

    expect(sentPayload()).toEqual({
      from: "CiviCheck <accounts@mail.example.com>",
      ...message,
    });
  });

  it("adds the monitored reply mailbox without changing the message", async () => {
    vi.stubEnv("RESEND_FROM_AUTH", "CiviCheck Accounts <auth@civicheck.xyz>");
    vi.stubEnv("RESEND_REPLY_TO", " support@example.com ");

    await sendEmail(authEmail);

    expect(sentPayload()).toEqual({
      from: "CiviCheck Accounts <auth@civicheck.xyz>",
      ...message,
      reply_to: "support@example.com",
    });
  });

  it("does not contact Resend without a configured category or fallback sender", async () => {
    await expect(sendEmail(authEmail)).rejects.toThrow(
      "RESEND_FROM_AUTH or RESEND_FROM_EMAIL must be defined",
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not contact Resend without an API key", async () => {
    vi.stubEnv("RESEND_API_KEY", undefined);

    await expect(sendEmail(authEmail)).rejects.toThrow("RESEND_API_KEY is not defined");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports immediate provider rejection without retrying the message", async () => {
    vi.stubEnv("RESEND_FROM_AUTH", "CiviCheck Accounts <auth@civicheck.xyz>");
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValue(
      Response.json({ message: "The sender domain is not verified." }, { status: 403 }),
    );

    await expect(sendEmail(authEmail)).rejects.toThrow("The sender domain is not verified.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
