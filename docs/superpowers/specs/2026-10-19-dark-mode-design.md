# Dark mode for the signed-in app

## Intent

Let anyone signed in to CiviCheck switch the app between light and dark from the top header. The reason is comfort: CCRO staff and cashiers sit in front of the dashboard for long shifts, and applicants often use their phones in the evening. Light stays the default for everyone.

Success looks like this: a person flips one switch in the header, the whole signed-in app changes at once with no flash on later page loads, the choice is still there the next time they open the app on the same device, and nothing becomes harder to read than it is today.

## Goals

- A switch in the top header of every signed-in shell: the staff/admin/cashier/system-admin bar, the applicant desktop top bar, and the applicant phone header. All roles get it.
- First load is always light. No following of the device's own light/dark setting.
- The whole signed-in app is themed: sidebar, pages, tables, dialogs, popovers, toasts, status pills, the service editor, the apply wizard, the applicant portal (floating panel and gradient ground).
- Palette is **Graphite** (the user chose it over Navy ink and Brand blue). Reference mock: https://claude.ai/artifact/Km8FCHLuGpL9Tmx31P6Mvp . Values from the mock: page `#101216`, workspace `#121419`, card `#181b21`, sidebar `#14171c`, text `#e8eaee`, muted text `#9aa1ad`, border `#2a2f38`, accent `#7aa8ea`, soft accent surface `#1a2740`, button fill `#3069c0` with white label. Status tones (ink on tint): review `#93b9f0` on `#1a2740`, progress `#bdb0ee` on `#27213f`, warning `#eac26e` on `#33290f`, success `#85d3a6` on `#12291d`, danger `#f0a3a3` on `#361b1b`, neutral `#b1b7c2` on `#22262d`. The mock was checked: body text 14.3:1, muted 6.6:1, accent text 7.1:1, button label 5.4:1, every status pill at least 7.4:1.
- Accessible: AA contrast everywhere, the switch has a text label for screen readers, 44px target on phones, visible focus ring, respects reduced motion.

## Non-goals

- (Changed 2026-10-19 at the user's request: the public pages are themed too. Landing, requirements, track, privacy and terms have the switch in the site header; sign-in, register, forgot/reset password, email verification and invitation have it beside the logo. They read the same saved choice and are still light on a first visit. The forbidden and not-found pages follow the theme but have no switch.)
- A third "follow my device" setting.
- Saving the choice to the user's account so it follows them across devices.
- Printed and downloaded documents (PDFs, acknowledgments, verification forms): they stay light.
- New theming of emails.
- Redesigning anything. This is a recolor, not a layout change.

## Anti-goals

- A flash of the wrong theme on page load or on navigation between signed-in pages.
- The signed-in dark theme leaking onto the landing or sign-in pages, including right after sign-out.
- Any element left light-only inside dark mode (a white card, white input, light skeleton, light toast) or dark-only inside light mode.
- Any text or control that drops below AA contrast in dark.
- Colour being the only carrier of meaning. Status pills already carry text labels and must keep them.
- Changing light mode's look. Today's light appearance is the reference and must not shift.

## Current state (facts about the repo)

- Tailwind v4, shadcn/ui components, TanStack Start, `next-themes` is in `package.json` but unused.
- `src/routes/__root.tsx` deliberately forces light: an inline `<script>` and a `useEffect` both remove the `dark` class and set `color-scheme: light`. `src/styles/app.css` also sets `html { color-scheme: light }`.
- There is no `@custom-variant dark`, so in Tailwind v4 every `dark:` utility already in the shadcn components (for example in `ui/switch.tsx`) follows the OS preference, not any class. With tokens light-only this is a latent mismatch for people whose OS is dark.
- Colour tokens are defined once on `:root` in `src/styles/app.css` (background, card, primary, status tones `--tone-*`, `--health-*`, sidebar, portal tokens `--portal-*`, `--ground`, shadows). Only one dark block exists: `.dark .system-health-page` near line 796, which can be reused as a starting point.
- About 150 literal colour values in `app.css` and roughly 270 uses of `bg-white` / `text-white` across about 60 files (largest: `features/services/components`, `features/requests/components`, `features/apply/components`, `features/system-admin/components`). Many `text-white` uses sit on a primary fill and may stay as they are; `bg-white` generally needs a token.
- `src/components/ui/sonner.tsx` hard-codes `theme="light"`.
- Headers to change: the staff/admin shell header in `src/routes/_authed/_dashboard/route.tsx` (a 72px bar with the sidebar trigger, workspace label and the city seal); `src/components/sidebar-01/citizen-top-bar.tsx` (applicant desktop); `src/components/sidebar-01/citizen-mobile-header.tsx` (applicant phone). There is also an account Settings dialog (`src/features/account/components/SettingsDialog.tsx`) reachable from the avatar menu; the user asked for the switch in the header, not there.
- Two signed-in surfaces have no header: the service editor (`isServiceEditor` in the dashboard route renders a full-screen `<main>`) and the apply wizard (`src/routes/_authed/apply`, which sits outside the dashboard shell). They must still render in the chosen theme.
- Signed-in routes are pathless under `_authed` (`src/routes/_authed/route.tsx`); URLs like `/dashboard`, `/admin/...`, `/apply/...` do not share a prefix. Landing and auth routes are outside `_authed`.
- Reference guide the user pointed to: https://ui.shadcn.com/docs/dark-mode/tanstack-start . It uses a `ThemeProvider` with `ScriptOnce` and `localStorage`, `suppressHydrationWarning` on `<html>`, and toggles a `dark` class on `<html>`. It does not cover the Tailwind v4 dark variant or limiting the theme to part of the app.

## Decisions made by the user

- All roles, switch in the top header.
- Start in light.
- Only the signed-in app for now.
- Palette is Graphite.
- Use the shadcn `Switch` component for the control (the user said "use the switch"); the repo's `src/components/ui/switch.tsx` is the component, and its sizes include a touch size.
- Follow the shadcn TanStack Start guide as the starting point.

## Calls I made (mark for review)

- **Device-level memory.** The choice is remembered in the browser on that device, not on the account.
- **Two values only.** Stored value is `light` or `dark`; no `system`.
- **Switch design.** Sun and moon icons inside the track, thumb slides, label "Dark mode" for assistive tech. Shown in the mock.
- **Wizard and service editor.** They get the theme but no switch of their own (changing theme mid-task is not needed and they have no header). The choice made elsewhere applies.
- **Documents stay light** as listed in the non-goals.
- **Onboarding is themed.** It sits under `_authed` outside the dashboard shell, has no header and no switch, and follows the chosen theme like the wizard and the service editor.
- **The saved choice belongs to the device, not the person.** It survives sign-out, and anyone who signs in next on the same browser starts with whatever was last chosen there. Sign-out only returns the landing and sign-in pages to light, which they always are. First visit on a new device is light. Reviewer raised this for shared cashier and staff workstations; I kept device-level because it is simplest and matches the guide.

## What is left to the builder

- How to apply the theme only to the signed-in app without a flash. Constraints: no wrong-theme flash on any signed-in page load, landing and auth never dark, sign-out returns to light. Options include reading a cookie on the server and rendering the `dark` class on `<html>` when a user is present, or the guide's script plus a provider mounted in the `_authed` layout that adds and removes the class. The builder picks and justifies.
- The `@custom-variant dark` definition so `dark:` follows the class, and what to do about existing `dark:` utilities.
- How to split the accent. In light, `--primary` is both text/link colour and button fill. In dark the mock uses a lighter accent (`#7aa8ea`) for text and a deeper blue (`#3069c0`) for button fills with white labels. The builder chooses between two tokens or flipping the button foreground to dark ink, as long as both stay AA.
- Dark values for every remaining token and for the portal ground and hero gradients, shadows (turn into borders or rings where shadows vanish), skeleton colour, `--health-*`, `--tone-*`, sidebar tokens, toasts and dialog overlays.
- The order of the sweep through the roughly 60 files and which `bg-white` / `text-white` uses are real defects.
- How to check the result, for example by walking the main screens of each role in both themes.
- Whether the shared switch is one component placed in the three headers.
