// This harness exercises real account/navigation UI without a live session.
export const getPaletteDefaultsFn = async () => [];
declare global {
  interface Window {
    __settingsMutationMode?: "success" | "reject" | "error" | "pending";
    __settingsSaveCalls?: number;
    __finishSettingsSave?: () => void;
  }
}

async function saveSettings(message: string) {
  window.__settingsSaveCalls = (window.__settingsSaveCalls ?? 0) + 1;
  if (window.__settingsMutationMode === "pending") {
    await new Promise<void>((resolve) => { window.__finishSettingsSave = resolve; });
  }
  if (window.__settingsMutationMode === "reject") throw new Error("Test connection failure");
  if (window.__settingsMutationMode === "error") return { error: true, message: "The change could not be saved. Try again." };
  return { error: false, message };
}

export const updateMyProfileFn = async () => saveSettings("Profile updated");
export const changeMyPasswordFn = async () => saveSettings("Password updated");
export function useAvatar(_userId: string, savedUrl: string | null) {
  return { avatarUrl: savedUrl, isDirty: false, pending: false, select: () => {}, remove: () => {}, save: async () => true };
}
