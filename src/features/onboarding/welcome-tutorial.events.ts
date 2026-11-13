export const WELCOME_TUTORIAL_OPEN_EVENT = "civicheck:open-tutorial";

/** Reopen the welcome tutorial from any client-side entry point. */
export function openWelcomeTutorial() {
  window.dispatchEvent(new Event(WELCOME_TUTORIAL_OPEN_EVENT));
}
