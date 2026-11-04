import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountProfile } from "../account.types";
import { SettingsProfilePanel } from "./SettingsProfilePanel";

const mocks = vi.hoisted(() => ({
  avatar: {
    avatarUrl: null as string | null,
    isDirty: false,
    pending: false,
    select: vi.fn(),
    remove: vi.fn(),
    save: vi.fn(),
  },
}));
vi.mock("../hooks/useAvatar", () => ({ useAvatar: () => mocks.avatar }));
vi.mock("../hooks/useUpdateProfile", () => ({
  useUpdateProfile: () => ({ status: "idle", mutate: vi.fn() }),
}));

const account: AccountProfile = {
  id: "applicant-id",
  email: "applicant@example.com",
  role: "applicant",
  firstName: "Ana",
  middleName: "",
  hasNoMiddleName: false,
  lastName: "Cruz",
  suffix: "",
  dateOfBirth: "",
  sex: "",
  phoneNumber: "",
  accountStatus: "active",
  createdAt: "2026-01-01T00:00:00Z",
  lastLoginAt: null,
  welcomeTutorialSeen: true,
  avatarUrl: null,
};

function render() {
  return renderToStaticMarkup(createElement(SettingsProfilePanel, {
    account,
    onClose: vi.fn(),
    onDirtyChange: vi.fn(),
  }));
}

function submitButton(html: string) {
  const button = html.match(/<button\b[^>]*type="submit"[^>]*>/)?.[0];
  expect(button).toBeDefined();
  return button!;
}

beforeEach(() => {
  mocks.avatar.avatarUrl = null;
  mocks.avatar.isDirty = false;
  mocks.avatar.pending = false;
});

describe("the profile Save changes button", () => {
  it("is disabled while neither the photo nor personal details have changed", () => {
    expect(submitButton(render())).toContain('disabled=""');
  });

  it("is enabled for a photo-only change, even with incomplete unchanged details", () => {
    mocks.avatar.avatarUrl = "blob:photo-preview";
    mocks.avatar.isDirty = true;
    const html = render();
    expect(submitButton(html)).not.toContain('disabled=""');
    expect(html).toContain("Unsaved changes");
  });

  it("is enabled for a pending photo removal", () => {
    mocks.avatar.isDirty = true;
    expect(submitButton(render())).not.toContain('disabled=""');
  });

  it("is disabled while the photo is saving", () => {
    mocks.avatar.isDirty = true;
    mocks.avatar.pending = true;
    const html = render();
    expect(submitButton(html)).toContain('disabled=""');
    expect(html).toContain("Saving");
  });
});
