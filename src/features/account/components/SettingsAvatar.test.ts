import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { AccountProfile } from "../account.types";
import { SettingsAvatar } from "./SettingsAvatar";

const account: AccountProfile = {
  id: "applicant-id",
  email: "applicant@example.com",
  role: "applicant",
  firstName: "Ana",
  middleName: "",
  hasNoMiddleName: true,
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

function render(avatarUrl: string | null, pending = false) {
  return renderToStaticMarkup(createElement(SettingsAvatar, {
    account,
    avatarUrl,
    pending,
    onSelect: vi.fn(),
    onRemove: vi.fn(),
  }));
}

function removeButton(html: string) {
  return html.match(/<button\b[^>]*>(?:(?!<\/button>)[\s\S])*Remove photo<\/button>/)?.[0];
}

describe("profile photo controls", () => {
  it("shows an enabled Remove photo button immediately for an unsaved selection", () => {
    const button = removeButton(render("blob:local-preview"));
    expect(button).toBeDefined();
    expect(button).toContain('type="button"');
    expect(button).not.toContain('disabled=""');
  });

  it("shows Remove photo for an existing profile photo", () => {
    expect(removeButton(render("https://example.com/saved-photo.jpg"))).toBeDefined();
  });

  it("hides Remove photo once the preview is removed and offers Upload photo", () => {
    const html = render(null);
    expect(removeButton(html)).toBeUndefined();
    expect(html).toContain("Upload photo");
  });

  it("disables removal while a save is in progress", () => {
    expect(removeButton(render("blob:local-preview", true))).toContain('disabled=""');
  });
});
