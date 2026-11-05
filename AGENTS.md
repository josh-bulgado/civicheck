<!-- intent-skills:start -->
## Skill Loading

Before editing files for a substantial task:
- Run `pnpm dlx @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `pnpm dlx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->

## Civicheck UI

For UI work, read [docs/ui-guide.md](docs/ui-guide.md) and use the local
`civicheck-ui` skill when available. Follow the nearest existing citizen, staff,
or admin screen and reuse the customized components in `src/components/ui`.
Treat local component APIs and this guide as the project-specific conventions
when applying general design skills (especially Base UI composition, Table v9,
Sonner notifications, and the theme's separate primary ink/fill tokens).
