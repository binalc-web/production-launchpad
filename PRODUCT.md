# Product

## Register

product

## Users

Accounting firm staff — bookkeepers, accountants, and firm admins — running client delivery work day to day. They manage clients, recurring projects, tasks, planning calendars, meeting notes, and AI-assisted bookkeeping agents inside a single firm workspace (e.g. Kessler & Flynn CPA). Context is deadline-driven tax/bookkeeping work; the UI should stay dense but scannable.

## Product Purpose

Jetpack Workflow is a practice-management workspace for accounting firms. It exists so teams can track clients and engagements, execute recurring project workflows, capture meeting follow-ups via AI Notetaker, and run AI agents on client workbooks — without bouncing between spreadsheets and chat threads.

Success looks like: open the app → land on Projects → reach a client task or meeting review in one or two clicks, with clear status and next actions.

## Brand Personality

Calm, precise, and professional — a capable practice OS. Labels should sound like firm operations (clients, projects, fiscal year), not startup marketing. Confidence comes from clarity and reliable state feedback, not decorative chrome.

## Anti-references

- Generic SaaS marketing dashboards (hero metrics, icon-card grids, navy/purple gradients)
- Loud AI chrome that crowds live tables and dense forms
- Placeholder lorem or fake “Acme Corp” copy in product surfaces

## Design Principles

1. **Workflow first** — Every primary control completes a job (navigate, filter, review, save).
2. **Practice-accurate language** — Copy matches accounting firm work, not generic PM jargon.
3. **Efficient density** — Sidebar + list/detail for daily ops; progressive disclosure for secondary settings.
4. **Honest preview data** — Mock stores power full flows until backend lock; mark with `DUMMY:`.
5. **Embed-safe routing** — App-relative routes work under LaunchPad Client Link `/embedded/<port>/`.

## Accessibility & Inclusion

Target WCAG AA contrast on body text, visible focus states on nav and controls, and keyboard-reachable primary actions. Honor `prefers-reduced-motion` for non-essential motion.

## Primary journeys

| Journey | Persona job | Entry | Success (preview) | Loading / empty / error |
|---|---|---|---|---|
| App entry under embed | Open firm workspace | `/` or `/embedded/<port>/` | Redirects to Projects; shell + sidebar render | yes — router basename; no blank 404 |
| Browse projects | See engagement status | Nav → Projects | Project list from mock store | yes — list UI; empty/filter states in page |
| Manage clients | Find client / contacts | Nav → Clients | Client list + detail panels | yes |
| Work tasks | Update task progress | Nav → Tasks | Task board/list updates in local state | yes |
| AI Notetaker review | Accept meeting suggestions | Nav → AI Notetaker → review | Suggestion accept/dismiss updates mock status | yes |
| AI Agents hub | Check agent run output | Nav → AI Agents | Agent queue + completed runs visible | yes |
| Notifications / Help | Catch up or get support | Bottom nav | Notification list / help content | yes |
