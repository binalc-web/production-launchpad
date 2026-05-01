Design a web application UI for Jetpack Workflow, a project and workflow management 
tool built specifically for accounting firms. This is a B2B SaaS product with a 
professional, utilitarian aesthetic — think linear.app meets a spreadsheet. Clean, 
dense information layout. Not a marketing site.

--- VISUAL SYSTEM ---

Color palette:
- Primary action color: Blue (#2563EB or similar)
- Background: White (#FFFFFF)
- Sidebar / nav background: Very light gray (#F8F9FA)
- Table rows: White with subtle gray (#F3F4F6) alternating or on hover
- Labels/badges: Custom color-coded (pink, yellow, green, blue)
- Text: Near-black (#111827) for primary, gray (#6B7280) for secondary
- Borders: Light gray (#E5E7EB)

Typography:
- Clean sans-serif (Inter or equivalent)
- Table data: 13–14px
- Section headers: 16–18px medium
- Page titles: 20–22px semibold

Layout:
- Fixed left sidebar navigation, ~220px wide
- Top bar with page title and primary action button (blue, top right)
- Full-width content area with table or detail panel

--- NAVIGATION (LEFT SIDEBAR) ---

Logo / firm name at top.
Nav items with icons:
- Clients
- Templates
- Projects (default/active state)
- Tasks
- Planning
- Notifications (bell icon)
- Help & Support

Bottom of sidebar: user avatar + name + email

--- SCREEN 1: CLIENTS TAB ---

Top bar: "Clients" title | [Import] [Export] [+ Create Client] buttons top right

Main content: Data grid / table
Columns: Client Name | Priority | Status | Assignee | Entity Type | Fiscal Year End | Last Edited

Features visible:
- Filter button (opens right panel with filter options)
- Add Columns button
- Each row is clickable
- Top row has column headers with sort arrows

Client detail panel (right side drawer or full page):
- Client name + basic details at top (edit button, 3-dot menu)
- Right panel: Notes text area (supports links) + Contacts section
  - Each contact: Name, Email, Phone, Address
  - One marked as Primary
- Custom fields section below (Birthdate, Fiscal Year End, Entity Type, Services — multi-select)
- Tab at top: "Assigned Work" showing a list of recurring series (e.g., Monthly Bookkeeping, Quarterly Financial Reports)

--- SCREEN 2: TEMPLATES TAB ---

Top bar: "Templates" title | [+ Create Template] button

Main content: Table
Columns: Template Name | Task Count | Client Count

Template detail page (click into a template):
- Template name + edit/delete at top
- Right panel: Associated Clients list (scrollable)
- Main area: Task List
  - Each task row: Task Name | Cascading Due Date (e.g., "8 days before deadline") | Budgeted Time | Assignee avatar | Checklist icon
  - [+ Add Task] button at bottom
  - Add task side panel: Task name, description, cascading due date input, assignee dropdown, budgeted time, checklist items
- Change propagation banner/button: "Push changes to all associated clients" — prominent blue button

--- SCREEN 3: PROJECTS TAB (Primary / Command Center) ---

Top bar: "Projects" title | [Filters] [Add Columns] [Bulk Edit] [+ Create Project]

Active filters shown as pills below top bar (e.g., Status: In Progress | Due: This Month | Assignee: Beatty)

Main content: Data grid
Columns: Project Name | Client | Labels | Due Date | Status | Next Assignee | Last Edited

Labels column: Color-coded badge pills (e.g., pink "Missing Information", yellow "Follow Up")
Status column: Pill badges (Not Started / In Progress / Complete)
Next Assignee: Small circular avatar

Individual Project profile (click into a row):
Full page or large detail panel with:

Top section (card):
- Project name, Client name, Due date, Status, Project Assignee, Team Members
- [Edit] button, [Delete] option

Second card: Associated Series
- "Occurs every 2 weeks on Fridays"
- Link to series homepage

Comments section:
- Chat-style message thread
- @mention support (shows user suggestions)
- Text input + Post button

Task list (main working area):
Each task row:
- Task name
- Individual due date
- Status indicator (purple "Next" button if it's the next step)
- Budgeted time
- Checklist count (e.g., 3/5 items)
- Assignee avatar (right side)
- Checkmark bubble (click to complete)

Clicking a task opens side panel:
- Task name, status dropdown (Not Started / In Progress / Complete)
- Checklist items with checkboxes
- Comment thread for just this task
- @mention support

Labels on project: [+ Add Label] button at top, opens color-coded label picker

--- SCREEN 4: TASKS TAB ---

Top bar: "Tasks" | Search bar | Assignee filter dropdown | Date quick filters (Overdue / This Week / This Month) | [Filters] [Add Columns] [Export] [Edit]

Main content: Data grid
Columns: Task Name | Due Date | Assignee | Budgeted Time | Status | Associated Project

Filter panel (right side): Same filter fields as Projects
Bulk edit: Select checkboxes → Edit button activates → reassign or change due dates

Task side panel (click task name):
- Status change
- Comment + @mention
- Checklist update
- Link: "Go to project" → navigates to parent project

--- SCREEN 5: PLANNING TAB ---

Top bar: "Planning" | Date picker (5-week view) | Assignee filter | Client filter | [Bulk Edit]

Layout: Calendar-style grid, columns = weeks, rows = team members

Row 1 (Overview): Total team allocation per week (e.g., "34h 50m outstanding this week")
Rows below: One row per team member
- Name + avatar on left
- Per-week hour blocks (e.g., "9h 50m")
- Color: Blue for current week, gray for others
- "Unassigned" row at bottom

Clicking a team member's week block: Opens side panel
- List of clients + tasks making up those hours
- Click client → drill to tasks
- Reassign task → Assignee dropdown → Save

Bulk Edit mode: Select multiple tasks across time period, reassign in bulk

--- SCREEN 6: NOTIFICATIONS ---

Simple inbox view:
List of notifications:
- Task is "Next" in workflow
- @mention received (with context snippet)
- Task due today

Each notification: Clickable, links to project or task
Settings: Toggle in-app vs email per notification type

--- INTERACTION PATTERNS ---

- Right-side drawer panels for details (not full page navigation where possible)
- Blue primary buttons for all create/save actions
- Subtle hover states on table rows (light blue or gray background)
- Active nav item: Blue left border + blue text
- Filters applied = pills shown below top bar, each with an X to remove
- @mention: Type @ in any comment field → dropdown shows team members
- Complete task: Click checkmark bubble → task grays out and moves to bottom of list
- Change propagation: Shows confirmation modal ("This will update all X clients. This cannot be undone.")

Make this look like a polished, dense B2B SaaS tool. Not a startup landing page. 
Information-dense but organized. Every element should feel purposeful.