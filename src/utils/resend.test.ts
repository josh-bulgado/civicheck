import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "./resend";

const fetchMock = vi.fn<typeof fetch>();
const email = {
  to: "recipient@example.com",
  subject: "Your CiviCheck email verification code",
  html: "<p>Your code is 123456.</p>",
  text: "Your code is 123456.",
};

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("RESEND_API_KEY", "test-api-key");
  vi.stubEnv("RESEND_FROM_EMAIL", undefined);
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
  it("retains the current sender when no replacement is configured", async () => {
    await expect(sendEmail(email)).resolves.toEqual({ id: "test-message-id" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer test-api-key" }),
      }),
    );
    expect(sentPayload()).toEqual({
      from: "CiviCheck <noreply@civicheck.abrdns.com>",
      ...email,
    });
  });

  it("uses the configured sender and reply mailbox without changing the message", async () => {
    vi.stubEnv("RESEND_FROM_EMAIL", " CiviCheck <accounts@mail.example.com> ");
    vi.stubEnv("RESEND_REPLY_TO", " support@example.com ");

    await sendEmail(email);

    expect(sentPayload()).toEqual({
      from: "CiviCheck <accounts@mail.example.com>",
      ...email,
      reply_to: "support@example.com",
    });
  });

  it("ignores empty optional sender configuration", async () => {
    vi.stubEnv("RESEND_FROM_EMAIL", "  ");
    vi.stubEnv("RESEND_REPLY_TO", "  ");

    await sendEmail(email);

    expect(sentPayload().from).toBe("CiviCheck <noreply@civicheck.abrdns.com>");
    expect(sentPayload()).not.toHaveProperty("reply_to");
  });

  it("does not contact Resend without an API key", async () => {
    vi.stubEnv("RESEND_API_KEY", undefined);

    await expect(sendEmail(email)).rejects.toThrow("RESEND_API_KEY is not defined");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports immediate provider rejection without retrying the message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValue(
      Response.json({ message: "The sender domain is not verified." }, { status: 403 }),
    );

    await expect(sendEmail(email)).rejects.toThrow("The sender domain is not verified.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
