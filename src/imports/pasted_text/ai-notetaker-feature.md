You are extending the existing Jetpack Workflow application (described in a prior prompt) 
with a new first-class feature: AI Notetaker. This is not a separate product — it lives 
natively inside Jetpack Workflow as a new Settings section and a new post-call review flow.

The feature allows accounting firms to deploy a white-labeled AI meeting bot that joins 
their client calls, transcribes them, generates a meeting summary, and surfaces suggested 
actions (create project, add task, update client record, log a note) for a human to 
review and approve before anything is written.

Add the following screens and components to the existing Jetpack Workflow UI, 
maintaining the same visual system (blue primary, white/light gray layout, Inter font, 
data-dense B2B aesthetic).

--- NEW NAV ITEM ---

Add to the left sidebar, below Planning:
- "AI Notetaker" with a microphone or bot icon
- This is the hub for all notetaker activity

--- SCREEN 1: AI NOTETAKER HUB ---

Top bar: "AI Notetaker" | [+ Start New Meeting] button (blue, top right)

Two-column layout:

Left column — Recent Meetings (list):
Each meeting card shows:
- Meeting title (e.g., "Q1 Review — Riverside Restaurant Group")
- Client name
- Date + time
- Duration
- Status badge: "Suggestions Ready" (blue) | "Reviewed" (green) | "Processing" (gray spinner) | "No Suggestions" (gray)
- Small avatar row showing attendees

Right column — Bot Status panel:
- Bot identity card:
  - Bot name: "Miller & Co. Assistant" (editable inline)
  - Firm logo thumbnail
  - Status: Active / Inactive toggle
- Quick stats: Meetings this month | Tasks created | Notes logged
- [Go to Settings] link

--- SCREEN 2: SETTINGS > AI NOTETAKER ---

Inside existing Settings section, new submenu item: "AI Notetaker"

Page layout: Stacked settings cards

Card 1 — Bot Identity:
- Bot Display Name: Text input (default: "[Firm Name] Assistant")
- Upload Logo: Drag-and-drop zone + preview thumbnail
- Brand Color: Color picker hex input + preview swatch
- [Save Changes] button

Card 2 — Meeting Platforms:
- Instruction text: "Your bot joins meetings via link. Paste a link manually or connect your calendar for auto-join."
- Toggle rows:
  - Zoom: [Connected ✓] or [Connect] button
  - Google Meet: [Connect] button
  - Microsoft Teams: [Connect] button

Card 3 — Calendar Integration (P2 — shown as "Coming Soon" with lock icon):
- Google Calendar: Grayed out, "Coming Soon" badge
- Outlook: Grayed out, "Coming Soon" badge

Card 4 — Summary Email:
- Toggle: "Auto-send summary email when call ends" (on/off)
- Recipients: Tag input (add email addresses)
- Preview: Small example of what the email looks like

Card 5 — Default Behaviors:
- Toggle: "Auto-suggest creating project from meeting"
- Toggle: "Auto-suggest logging call note to client"
- Suggestion confirmation level dropdown: "Always require review" (default) / "Auto-accept notes only"

--- SCREEN 3: START MEETING (MANUAL) ---

Modal or full-screen panel triggered by "+ Start New Meeting":

Step 1 of 2 — Meeting Setup:
- Meeting Link: URL input ("Paste your Zoom, Meet, or Teams link")
- Client: Searchable dropdown (pulls from Clients list)
- Meeting Title: Text input (optional, auto-suggested from client name)
- [Send Bot to Meeting] button (blue, prominent)

Step 2 — Bot Active state:
- Green status indicator: "Bot joined — Recording in progress"
- Meeting title + client name shown
- Timer showing elapsed recording time
- [End Early] button (gray, secondary)
- Note: "Summary and suggestions will be ready within 2 minutes of the call ending."

--- SCREEN 4: POST-CALL NOTIFICATION ---

In-app notification (appears in Notifications tab and as a banner):
- "Your meeting with Riverside Restaurant Group is ready for review."
- [Review Suggestions →] CTA button

--- SCREEN 5: SUGGESTION REVIEW PANEL (Core Flow) ---

Full-page review experience (not a modal — this deserves full real estate):

Top bar:
- "Post-Call Review: Q1 Review — Riverside Restaurant Group"
- Date, Duration, Attendees (avatar row)
- Status: "4 suggestions pending"

Two-column layout:

LEFT COLUMN — Transcript Summary (40% width):
- AI-generated meeting summary
  - Key Discussion Points (bullet list)
  - Decisions Made (bullet list)
  - Action Items Identified (bullet list)
- Below summary: Collapsible full transcript
  - Speaker-labeled segments: "David C. (0:02:14): We need to start the quarterly review..."
  - Search bar within transcript
  - Timestamps shown on left

RIGHT COLUMN — Suggestion Cards (60% width):
Stack of suggestion cards, each one:

Card anatomy:
- Header: Suggestion type badge (e.g., blue "Add Task" | green "Create Project" | purple "Update Client" | gray "Log Note")
- Suggested action: Bold text (e.g., "Add task: Prepare Q1 financial package")
- Context snippet: Gray italicized quote pulled from transcript ("...she mentioned needing the package by March 15th...")
- Target: "Project: Q1 Tax Prep — Riverside Restaurant Group" (with dropdown to change)
- Three action buttons:
  - [Accept] — blue filled
  - [Edit] — gray outline (expands inline edit fields)
  - [Dismiss] — red text, no border

Inline Edit mode (on Edit click):
- Task name: editable text input
- Assignee: dropdown
- Due date: date picker
- Target project: dropdown
- [Save & Accept] button

Progress indicator at top of right column:
"3 of 4 reviewed" — progress bar

Bottom bar (sticky):
- "All suggestions reviewed" state → [Mark Complete] button (blue)
- Or: "2 remaining" with count

--- SCREEN 6: MEETING DETAIL (POST-REVIEW) ---

Accessed from the AI Notetaker Hub by clicking a "Reviewed" meeting:

Full page:
Top section: Meeting metadata (same as review panel top bar)
Tab bar: Summary | Transcript | Actions Taken | Audit Log

Summary tab:
- Same AI summary (read-only)

Transcript tab:
- Full searchable transcript, speaker-labeled

Actions Taken tab:
- List of accepted suggestions with outcomes:
  - "Task added: Prepare Q1 financial package → Q1 Tax Prep project" ✓
  - "Note logged to Riverside Restaurant Group client profile" ✓
  - "Dismissed: Create new project" (grayed out with X icon)

Audit Log tab (P2):
- Table: Suggestion | Action | User | Timestamp

--- NEW COMPONENT: CLIENT PROFILE — MEETINGS TAB ---

On the existing Client Profile page, add a new tab alongside "Assigned Work":
Label: "Meetings"

Content: Chronological list of all meetings involving this client
Each row: Date | Meeting Title | Duration | Summary snippet | [View →] link

--- DESIGN NOTES ---

- Suggestion cards should feel like Notion or Linear cards — clean, actionable, not overwhelming
- The review flow is the most important screen — it needs to feel fast and decisive
- The bot status / recording state should feel calm, not alarming (green dot, clean)
- Transcripts should be readable but secondary — the suggestions are the hero
- "Reviewed" meetings in the hub should feel done and archived (muted colors, checkmark icon)
- Keep all new screens consistent with the existing app's visual language — same table patterns, 
  same blue primary, same sidebar, same font

The overall experience should feel like the bot is a quiet, competent member of the team 
that does the work and then hands it to a human for the final call. Nothing is automatic. 
Everything surfaces for approval.