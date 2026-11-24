# Engineering standards (optional — recommended for agent consistency)

> Copy this file to `.launchpad/conventions.md` in your **development repository** and customize.
> When present, LaunchPad agents read `.launchpad/conventions.md` first — it overrides platform defaults.

## Tech stack (mandatory)

- **Language:** TypeScript 5.x (strict) — do not write plain `.js` for application code
- **Backend:** Node.js 20 + Express — not Nest, not Python
- **Frontend:** React 18 + Vite — not Next.js unless listed here
- **Styling:** Tailwind + existing design tokens in `frontend/src/styles/tokens.ts`

## Folder structure (mandatory)

| Area | Path |
|------|------|
| UI pages | `frontend/src/pages/` |
| Shared UI | `frontend/src/components/` |
| API routes | `backend/src/routes/` |
| Tests | `backend/test/` |

Do not create parallel trees (`Frontend/` next to `frontend/`, second `src/` app).

## Design system

- Rules: `.cursor/rules/design-system.mdc`
- Component library: `frontend/src/components/ui/`

## Cursor guidance (read before coding)

### Rules (read all)

- `.cursor/rules/typescript-strict.mdc`
- `.cursor/rules/api-conventions.mdc`

### Skills (read when relevant)

- `.cursor/skills/internal-api/SKILL.md` — REST handler patterns
- `.cursor/skills/auth-flow/SKILL.md` — session/OAuth

## Out of scope for agents

- Do not modify `launchpad-frontend/` submodule
- Do not add new top-level packages without updating this file
