You are extending the existing Jetpack Workflow application (already designed across 
two prior prompts) with a second AI feature: AI Agent Task Automation.

Where Phase 1 (AI Notetaker) captured what happened in meetings and suggested actions, 
Phase 2 is about recurring execution. Accounting firms assign AI agents to tasks inside 
their templates. When those tasks come due — across every client the template is assigned 
to — the agent automatically runs, completes the work, checks off the task, and surfaces 
the output for a human to review. If the agent hits a problem, it flags it before the 
due date so nothing falls through.

This is not a separate product. It lives inside the existing templates, projects, tasks, 
and client profile surfaces — with targeted additions to make agent-assigned work 
visible, configurable, and reviewable.

Maintain the exact same visual system as the existing app:
blue (#2563EB) primary, white/light gray layout, Inter font, data-dense B2B aesthetic.

--- NEW CONCEPT: AGENT ASSIGNEE ---

Throughout the app, wherever a task has an assignee, there is now a third category 
alongside "Team Member" and "Unassigned":
- Agent assignee type: shown as a small purple or indigo badge/avatar
  instead of a human avatar photo
- Agent avatar: a small square icon with a subtle circuit or spark symbol, 
  colored indigo/purple (#6366F1), labeled with the agent type 
  (e.g., "Claude Excel" or "Claude Cowork")
- This appears in: Template task lists, Project task lists, Tasks tab grid, 
  Planning tab rows

--- SCREEN 1: TEMPLATE TASK — AGENT ASSIGNMENT ---

Modify the existing "Add Task" and "Edit Task" side panel in Templates.

Assignee field becomes a segmented selector:
- [Team Member] tab — existing behavior, shows user dropdown
- [AI Agent] tab — new, shows agent configuration fields

When "AI Agent" tab is selected, show:
  Agent Type: Dropdown
    - Claude for Excel
    - Claude Cowork
  
  Skill Name: Text input or dropdown
    (e.g., "Transaction Analysis", "Bank Reconciliation", "Payroll Summary")
  
  Trigger: Read-only display
    "Auto-runs when task becomes due"

  Info banner (light blue, subtle):
    "Each client using this template will need an agent configuration 
     (file path, data source) set on their profile. You can configure 
     this from the client's AI Agents tab."

Save / Save & Create Another buttons — same as existing.

In the template task list, agent-assigned tasks show:
- Indigo avatar icon (not a person photo) with agent type label below
- Small "Agent" badge in purple on the task row

--- SCREEN 2: CLIENT PROFILE — AI AGENTS TAB ---

Add a new tab to the existing Client Profile page, alongside "Assigned Work" and 
"Meetings" (from Phase 1).

Tab label: "AI Agents"

Content: Configuration table + run history

Top section — Agent Configurations card:

Title: "Agent Configuration for [Client Name]"
Subtitle: "Each agent-assigned task needs a configuration telling it where to find 
this client's data."

Table with columns:
Task / Template | Agent Type | Skill Name | Data Source | File Path | Status | Actions

Each row is one configured agent task for this client:
- Task/Template: "Transaction Analysis — Monthly Bookkeeping" 
- Agent Type: Badge — "Claude Excel" (indigo) or "Claude Cowork" (purple)
- Skill Name: e.g., "Transaction Analysis"
- Data Source: "OneDrive" or "Google Drive" with small cloud icon
- File Path: Truncated path with tooltip on hover 
  (e.g., "/Clients/Riverside/2026/Bookkeeping.xlsx")
- Status: "Configured" (green dot) | "Not Configured" (yellow dot) | "Error" (red dot)
- Actions: [Edit] [Test Run] buttons

[+ Add Configuration] button above table (blue outline)

Add/Edit Configuration modal:
- Task: Dropdown (agent-assigned tasks from templates applied to this client)
- Agent Type: Dropdown (Claude for Excel / Claude Cowork)  
- Skill Name: Text input
- Data Source: Radio — OneDrive | Google Drive | Manual Upload
- File Path: Text input + [Browse] button
- New Tab Name: Text input 
  (e.g., "March 2026 — Transaction Analysis" — auto-appended to workbook)
- [Save Configuration] button

Bottom section — Run History (collapsible):

Title: "Recent Agent Runs"

Table with columns:
Date | Task | Agent | Status | Output | Duration

Status badges:
- "Completed" — green
- "Failed" — red  
- "In Progress" — blue with spinner
- "Pending" — gray

Output column: Link icon → "View Output" (opens file in new tab) or "No output" grayed

--- SCREEN 3: MORNING DIGEST NOTIFICATION ---

New notification type in the Notifications tab (and email).

In-app version: Appears as a special card at the top of the Notifications list, 
distinct from regular @mention notifications.

Card design:
- Left accent bar: Indigo (#6366F1)
- Icon: Small calendar + agent icon combined
- Header: "Today's Agent Work — 8 clients ready"
- Subtext: "Tasks have been prepared and are ready for agent execution. 
  Review before your agents run."
- Date: Today's date, time sent (e.g., "Sent at 7:00 AM")

Expandable section below (click to expand):
Table listing each client:
Client | Task | Agent | File Ready | Action

Each row:
- Client name (blue link)
- Task name
- Agent badge (indigo)
- File Ready: Green checkmark or yellow warning
- Action: [Open File] button (opens OneDrive/Google Drive link)

[Review All] button at bottom of card (blue, full width of card)

Email version (shown as a mockup / preview component):
Subject: "7 agent tasks ready for today — Jetpack Workflow"
Body shows same table with clickable links

--- SCREEN 4: PROJECTS TAB — AGENT TASK STATES ---

Modify the existing individual project profile to show agent task states.

In the task list, agent-assigned tasks have distinct visual states:

STATE 1 — Scheduled (task not yet due):
- Row shows indigo agent avatar
- Status: Gray "Scheduled" pill
- Subtext below task name (small gray): "Runs on [date] — Claude for Excel"

STATE 2 — In Progress (agent is running):
- Row has subtle indigo left border
- Status: Indigo "Running" pill with animated spinner
- Subtext: "Started 2 min ago"
- [View Progress] link (if real-time status is available)

STATE 3 — Completed by Agent:
- Checkmark is filled indigo (not the usual green/blue for human completion)
- Status: "Completed by Agent" pill — indigo
- Task name has a small robot/agent icon prefix
- Below task name: 
  "Completed Mar 15 at 9:42 AM · Claude for Excel · Transaction Analysis"
  "[View Output →]" link opens the output file
  "[View Notes]" expands inline notes left by the agent (what it did, any caveats)

Agent completion notes (expanded inline panel):
Light indigo background card below the task:
  Header: "Agent Notes — Claude for Excel"
  Body: Summary of what the agent did 
    e.g., "Analyzed 847 transactions across 3 accounts. Categorized 
    into 12 expense types. Flagged 4 items for manual review. Output 
    written to tab 'March 2026 — Transaction Analysis'."
  Attachments: "[Bookkeeping.xlsx — March 2026 tab]" with file icon
  Human review task (next in workflow): shown immediately below as 
    the next active task with purple "Next" button

STATE 4 — Failed / Exception:
- Red left border on task row
- Status: "Needs Attention" pill — red
- Subtext: "Agent could not complete — see comment below"
- In the comments section of that task, an auto-generated comment appears:
  Agent avatar (indigo icon) + "Claude for Excel" label
  Message: "@Jordan — I wasn't able to complete the Transaction Analysis 
  for Riverside Restaurant Group. The file at /Clients/Riverside/Bookkeeping.xlsx 
  couldn't be located. Can you check the file path or upload the correct file? 
  Due date: March 15."
  This comment @mentions the human assignee, who receives a direct notification.
  [Fix Configuration] button in the comment card (links to client AI Agents tab)

--- SCREEN 5: TASKS TAB — AGENT WORK VIEW ---

Add to the existing Tasks tab:

Quick filter at top (alongside existing Overdue / This Week / This Month):
New toggle: [Agent Tasks] — when active, filters to show only agent-assigned tasks

When Agent Tasks filter is on, a new column appears:
"Agent Status" — shows Scheduled / Running / Completed / Failed badges

Rows where agent has completed show a small output link in a new "Output" column.

--- SCREEN 6: AI AGENTS HUB ---

Add to the left sidebar navigation below "AI Notetaker":
- "AI Agents" with a small indigo robot/circuit icon

This is the firm-wide command center for all agent activity.

Top bar: "AI Agents" | Date range picker | [+ Configure Agent Task] button

Layout: Two sections stacked

Section 1 — Today's Activity (top):

Three stat cards in a row:
- "Running Now": number with spinning indigo indicator
- "Completed Today": number with green checkmark
- "Need Attention": number with red warning icon (clickable — filters list below)

Below stats: Live activity feed
Each row: Time | Client | Task | Agent | Status | Action
Sorted by most recent. Updates in near-real-time.
Rows with "Failed" status are highlighted red (very subtle background).

Section 2 — All Agent Runs (table, paginated):

Columns: Date | Client | Task | Template | Agent Type | Skill | Status | Duration | Output

Filter bar above table:
- Status filter: All | Completed | Failed | Running | Scheduled
- Agent Type: All | Claude Excel | Claude Cowork
- Date range picker
- Client search

Row actions: [View Output] | [View in Project] | [Re-run] (for failed tasks)

Bottom of page: [Export Audit Log] button (exports to CSV)

--- SCREEN 7: PLANNING TAB — AGENT ROWS ---

Modify the existing Planning tab (5-week capacity view) to represent agent work.

Add a new row at the bottom of the team allocation view, below the "Unassigned" row:
Label: "AI Agents" with indigo robot icon

This row shows:
- Per-week count of agent-scheduled tasks (e.g., "14 tasks")
- Clicking the week block opens a side panel:
  List of all agent-scheduled tasks that week
  Columns: Client | Task | Agent | Due Date | Status
  Link to each task

This gives managers a complete picture: human capacity + agent workload in one view.

--- SCREEN 8: ONBOARDING / EMPTY STATE ---

When a firm has no agent configurations yet, the AI Agents hub shows an empty state:

Centered in the main content area:
- Indigo icon (circuit/agent)
- Headline: "Automate your recurring work"
- Body: "Assign AI agents to tasks in your templates. When tasks come due, 
  the agent runs automatically — and the output is ready for your team to review."
- Two cards side by side:
  Card 1: "Claude for Excel" — "Best for transaction analysis, reconciliation, 
  and any work done inside spreadsheets."
  Card 2: "Claude Cowork" — "Best for research, drafting, and tasks that don't 
  require a spreadsheet."
- [Set Up Your First Agent Task →] blue button
  (links to Templates, with a tooltip pointing to the assignee field)

--- INTERACTION PATTERNS ---

Agent avatar / identity:
- Never a human photo — always the indigo icon with label
- In any assignee dropdown, agent options appear in a separate group labeled 
  "AI Agents" with a divider, below the list of team members

Completion vs. human completion:
- Human task completion: green checkmark, standard behavior
- Agent task completion: indigo checkmark, always has an output link and agent notes
- Never auto-accept or auto-close human review tasks — those always stay open 
  until a person marks them done

Exception handling:
- Failed agent tasks surface red in every view they appear: Projects, Tasks, AI Agents hub
- @mention comment from agent always notifies the human assignee 
- "Needs Attention" badge should feel urgent but not alarming — red pill, not a banner

Configuration warnings:
- If an agent-assigned task exists in a template and a client has no configuration set, 
  show a yellow "Not Configured" indicator on that client in the Associated Clients panel 
  of the template
- Clicking it links directly to the client's AI Agents tab

Agent notes tone:
- Short, factual, professional — "Analyzed 847 transactions. Flagged 4 items."
- Never verbose. The accountant is busy. Surface the key facts and the output link.

The overall feel of Phase 2 should be: calm, systematic, running in the background. 
Not flashy. The agents are doing the work quietly and handing it off cleanly. 
The UI reflects that — the indigo color distinguishes agent work without overpowering 
the human workflow that still runs around it.