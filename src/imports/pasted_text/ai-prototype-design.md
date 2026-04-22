Design a high-fidelity interactive prototype that extends an existing SaaS product similar to Jetpack Workflow (an accounting workflow management platform).

The prototype should demonstrate a Proof of Concept (POC) for two new AI-powered capabilities:

1. AI Notetaker
2. Agent Orchestration Layer

The experience should feel like a natural extension of an existing product (not a new app). Maintain consistency with a modern SaaS UI: clean layout, sidebar navigation, table-based task lists, and minimalistic design.

---

## 🎯 PRIMARY USER

* Accountant / Bookkeeper
* Firm Admin / Manager

---

## 🎯 PROTOTYPE GOAL

Show an end-to-end flow where:

1. A client meeting is captured by AI
2. AI generates actionable suggestions
3. User reviews and approves suggestions
4. Tasks are created/updated in workflow
5. AI agents automatically execute recurring tasks
6. User reviews AI-completed work

---

## 🧩 CORE NAVIGATION (MATCH EXISTING PRODUCT)

Left sidebar navigation:

* Dashboard
* Clients
* Projects
* Tasks
* Workflows
* NEW: AI Hub (or “AI Activity”)

Top bar:

* Search
* Notifications
* User profile

---

## 🧠 FEATURE 1: AI NOTETAKER FLOW

SCREEN 1: Meeting Completed State

* Show a “Recent Activity” or “Meetings” panel
* A completed meeting card:

  * Client name
  * Date/time
  * Status: “AI Summary Ready”

Interaction:
→ Clicking opens meeting details

---

SCREEN 2: AI Meeting Summary View

* Structured summary:

  * Key discussion points
  * Decisions made
  * Action items

* Section: “AI Suggestions (Max 5, ranked by confidence)”

Each suggestion card contains:

* Action type:

  * Create Project
  * Add Task
  * Update Client
  * Log Note
* Confidence score (e.g., High / Medium)
* Transcript snippet (context)
* Target entity (client/project)

Actions on each card:

* Accept
* Edit
* Dismiss

Interaction:
→ Accept triggers success state
→ Edit opens inline editable form
→ Dismiss removes from active list

---

SCREEN 3: Write-back Confirmation

* Toast or inline confirmation:

  * “Task created successfully”
* Show updated:

  * Task list OR
  * Client profile activity feed

---

SCREEN 4: Transcript Viewer (Optional but strong for POC)

* Full transcript with:

  * Speaker labels
  * Timestamps
* Search bar (keyword search)
* Highlight matched text

---

---

## ⚙️ FEATURE 2: AGENT ORCHESTRATION FLOW

SCREEN 5: Task List with Agent Assignment

* Table view of tasks

Columns:

* Task Name
* Client
* Due Date
* Assignee
* Status

Enhancement:

* Agent-assigned tasks visually distinct:

  * Icon (AI / robot)
  * Label: “AI Agent”

Example:

* “Monthly Financial Report – Client A”
* Assignee: Claude for Excel (AI Agent)

---

SCREEN 6: Client Configuration Panel

* Client settings page

Fields:

* Agent Type (Dropdown)

  * Claude for Excel
  * Claude Cowork
* OneDrive File Path
* Skill Name

Validation state:

* Invalid path → inline error message
* Valid → success indicator

---

SCREEN 7: Scheduling & Execution State

* Show task automatically transitioning:

  * “Scheduled” → “In Progress (Agent Running)” → “Agent Completed”

* Include:

  * Execution timestamp
  * Retry indicator (if failed before)

---

SCREEN 8: Agent Output + Annotation (CRITICAL POC SCREEN)

* Task detail view after agent execution

Show:

* Status: “Agent Completed – Pending Review”

Four-step annotation (MANDATORY):

1. Status updated
2. Completion note (structured summary)
3. Observations (comments section)
4. Link to output file (OneDrive)

Buttons:

* Approve
* Request Changes

---

SCREEN 9: Failure Escalation (IMPORTANT EDGE CASE)

* Task with failure state:

  * Status: “Action Required”

Show:

* Error message:

  * “File not found”
  * “Access revoked”
* @mention comment tagging user
* Email alert indicator

---

SCREEN 10: Morning Digest View

* Email-style UI OR dashboard widget

List:

* Tasks ready for review
* Each item includes:

  * Client
  * Task
  * Agent type
  * Link to output

---

SCREEN 11: Agent Audit Log

* Table view:

Columns:

* Client
* Task
* Agent Type
* Status
* Execution Time
* Reviewer
* Output Link

Filters:

* Status
* Date range
* Client

---

---

## 🎨 DESIGN STYLE

* Clean SaaS UI (similar to Asana / ClickUp / Jetpack)
* Light theme
* Subtle shadows, rounded cards
* Blue/neutral color palette
* Clear hierarchy and spacing

---

## 🔄 INTERACTIONS (VERY IMPORTANT)

Prototype should include clickable flows:

1. Meeting → Summary → Accept Suggestion → Task Created
2. Task → Agent Assigned → Auto Execution → Review
3. Failure → Escalation → User Action

Use transitions:

* Slide panels
* Modal overlays
* Toast notifications

---

---

## 🎯 SUCCESS CRITERIA FOR PROTOTYPE

* Clearly demonstrates BOTH:

  * AI Notetaker value
  * Agent automation value
* Feels like a real product (not concept screens)
* Shows human-in-the-loop control (approval before write-back)
* Shows automation + visibility + auditability

---

## 🎁 BONUS (IF SUPPORTED)

* Add confidence indicators on AI suggestions
* Add timeline view of task lifecycle
* Add “AI Activity Feed” combining both features

---

IMPORTANT:
This is a realistic enterprise SaaS prototype for accountants. Avoid futuristic UI. Focus on usability, clarity, and workflow efficiency.
