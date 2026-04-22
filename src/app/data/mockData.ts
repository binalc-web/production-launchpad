export const meetings = [
  {
    id: "meeting-1",
    clientName: "Acme Corporation",
    clientId: "client-1",
    date: "2026-04-21T14:00:00",
    status: "AI Summary Ready",
    summary: {
      keyPoints: [
        "Discussed Q1 2026 financial performance and revenue targets",
        "Reviewed outstanding invoices and payment schedules",
        "Addressed tax filing deadlines for upcoming quarter",
        "Explored opportunities for cost optimization in operational expenses"
      ],
      decisions: [
        "Move monthly reporting to the 15th of each month",
        "Implement new expense tracking system by end of Q2",
        "Schedule quarterly tax planning session"
      ],
      actionItems: [
        "Prepare detailed revenue analysis report by April 30th",
        "Update client billing information in system",
        "Create project for Q2 tax preparation"
      ]
    },
    transcript: [
      { speaker: "Client", time: "00:00:15", text: "Thanks for meeting with us today. We really need to get a handle on our Q1 numbers." },
      { speaker: "You", time: "00:00:23", text: "Of course! I've reviewed your preliminary data. Let's start with revenue performance." },
      { speaker: "Client", time: "00:01:45", text: "We'd like to move our monthly reporting to the 15th. Our board meetings are on the 18th, so this would give us more time to prepare." },
      { speaker: "You", time: "00:02:03", text: "That makes perfect sense. I'll update the schedule and create the necessary tasks in our workflow." },
      { speaker: "Client", time: "00:05:12", text: "Also, can you prepare a detailed revenue analysis report by the end of the month?" },
      { speaker: "You", time: "00:05:20", text: "Absolutely. I'll have that ready by April 30th." },
      { speaker: "Client", time: "00:08:30", text: "One more thing - we need to update our billing information. We've changed banks." },
      { speaker: "You", time: "00:08:40", text: "I'll make sure to update that in our system right away." }
    ],
    suggestions: [
      {
        id: "sug-1",
        type: "Create Project",
        confidence: "High",
        description: "Q2 2026 Tax Preparation",
        context: "Schedule quarterly tax planning session",
        targetEntity: "Acme Corporation",
        details: {
          projectName: "Q2 2026 Tax Preparation",
          client: "Acme Corporation",
          dueDate: "2026-06-15"
        }
      },
      {
        id: "sug-2",
        type: "Add Task",
        confidence: "High",
        description: "Prepare detailed revenue analysis report",
        context: "Can you prepare a detailed revenue analysis report by the end of the month?",
        targetEntity: "Acme Corporation",
        details: {
          taskName: "Prepare Q1 Revenue Analysis Report",
          client: "Acme Corporation",
          dueDate: "2026-04-30",
          assignee: "You"
        }
      },
      {
        id: "sug-3",
        type: "Update Client",
        confidence: "High",
        description: "Update billing information",
        context: "We need to update our billing information. We've changed banks.",
        targetEntity: "Acme Corporation",
        details: {
          field: "Banking Information",
          action: "Update required"
        }
      },
      {
        id: "sug-4",
        type: "Add Task",
        confidence: "Medium",
        description: "Implement expense tracking system",
        context: "Implement new expense tracking system by end of Q2",
        targetEntity: "Acme Corporation",
        details: {
          taskName: "Set up new expense tracking system",
          client: "Acme Corporation",
          dueDate: "2026-06-30",
          assignee: "You"
        }
      },
      {
        id: "sug-5",
        type: "Log Note",
        confidence: "Medium",
        description: "Monthly reporting schedule change",
        context: "Move monthly reporting to the 15th of each month",
        targetEntity: "Acme Corporation",
        details: {
          note: "Client requested to change monthly reporting schedule to the 15th to align with board meetings on the 18th"
        }
      }
    ]
  }
];

export const clients = [
  {
    id: "client-1",
    name: "Acme Corporation",
    industry: "Technology",
    status: "Active",
    agentConfig: {
      agentType: "Claude for Excel",
      oneDrivePath: "/Clients/Acme/Monthly Reports",
      skillName: "monthly-financial-report",
      isValid: true
    },
    lastActivity: "2026-04-21"
  },
  {
    id: "client-2",
    name: "GlobalTech Solutions",
    industry: "Consulting",
    status: "Active",
    agentConfig: {
      agentType: "Claude Cowork",
      oneDrivePath: "/Clients/GlobalTech/",
      skillName: "",
      isValid: false
    },
    lastActivity: "2026-04-20"
  },
  {
    id: "client-3",
    name: "Bright Retail Inc",
    industry: "Retail",
    status: "Active",
    lastActivity: "2026-04-18"
  }
];

export const tasks = [
  {
    id: "task-1",
    name: "Monthly Financial Report – Acme Corporation",
    client: "Acme Corporation",
    clientId: "client-1",
    dueDate: "2026-04-25",
    assignee: "Claude for Excel",
    assigneeType: "agent",
    status: "Agent Completed",
    priority: "High",
    agentExecution: {
      startTime: "2026-04-22T08:00:00",
      completionTime: "2026-04-22T08:15:00",
      status: "Completed",
      annotations: [
        {
          type: "status",
          content: "Status updated to 'Agent Completed – Pending Review'"
        },
        {
          type: "completion-note",
          content: "Successfully generated monthly financial report for March 2026. Report includes:\n• Revenue analysis: $2.4M (8% increase MoM)\n• Expense breakdown by category\n• Cash flow statement\n• Budget variance analysis\n• Key financial ratios"
        },
        {
          type: "observations",
          content: "Noted a 15% increase in operational expenses compared to February. This appears to be due to new software licensing costs. May warrant discussion with client."
        },
        {
          type: "output-link",
          content: "OneDrive: /Clients/Acme/Monthly Reports/March_2026_Financial_Report.xlsx",
          link: "#"
        }
      ]
    }
  },
  {
    id: "task-2",
    name: "Q1 Tax Filing – GlobalTech Solutions",
    client: "GlobalTech Solutions",
    clientId: "client-2",
    dueDate: "2026-04-30",
    assignee: "Sarah Johnson",
    assigneeType: "human",
    status: "In Progress",
    priority: "High"
  },
  {
    id: "task-3",
    name: "Quarterly Review Meeting Prep",
    client: "Acme Corporation",
    clientId: "client-1",
    dueDate: "2026-04-28",
    assignee: "Michael Chen",
    assigneeType: "human",
    status: "Pending",
    priority: "Medium"
  },
  {
    id: "task-4",
    name: "Expense Reconciliation – Bright Retail",
    client: "Bright Retail Inc",
    clientId: "client-3",
    dueDate: "2026-04-26",
    assignee: "Claude for Excel",
    assigneeType: "agent",
    status: "Action Required",
    priority: "High",
    agentExecution: {
      startTime: "2026-04-22T09:00:00",
      status: "Failed",
      error: {
        message: "File not found: /Clients/BrightRetail/Expenses/April_2026.xlsx",
        escalation: true,
        mentionedUser: "Sarah Johnson"
      }
    }
  },
  {
    id: "task-5",
    name: "Bank Reconciliation – Acme Corporation",
    client: "Acme Corporation",
    clientId: "client-1",
    dueDate: "2026-05-01",
    assignee: "Claude for Excel",
    assigneeType: "agent",
    status: "Scheduled",
    priority: "Medium"
  }
];

export const agentAuditLog = [
  {
    id: "audit-1",
    client: "Acme Corporation",
    task: "Monthly Financial Report",
    agentType: "Claude for Excel",
    status: "Completed",
    executionTime: "2026-04-22T08:15:00",
    reviewer: "Pending",
    outputLink: "/Clients/Acme/Monthly Reports/March_2026_Financial_Report.xlsx"
  },
  {
    id: "audit-2",
    client: "Bright Retail Inc",
    task: "Expense Reconciliation",
    agentType: "Claude for Excel",
    status: "Failed",
    executionTime: "2026-04-22T09:05:00",
    reviewer: "-",
    outputLink: "-"
  },
  {
    id: "audit-3",
    client: "GlobalTech Solutions",
    task: "Payroll Processing",
    agentType: "Claude Cowork",
    status: "Completed",
    executionTime: "2026-04-21T15:30:00",
    reviewer: "Sarah Johnson",
    outputLink: "/Clients/GlobalTech/Payroll/April_2026.xlsx"
  },
  {
    id: "audit-4",
    client: "Acme Corporation",
    task: "Invoice Generation",
    agentType: "Claude for Excel",
    status: "Completed",
    executionTime: "2026-04-20T10:00:00",
    reviewer: "Michael Chen",
    outputLink: "/Clients/Acme/Invoices/INV-2026-04-001.pdf"
  }
];

export const morningDigest = [
  {
    id: "digest-1",
    client: "Acme Corporation",
    task: "Monthly Financial Report – March 2026",
    agentType: "Claude for Excel",
    completedAt: "2026-04-22T08:15:00",
    outputLink: "/Clients/Acme/Monthly Reports/March_2026_Financial_Report.xlsx"
  },
  {
    id: "digest-2",
    client: "GlobalTech Solutions",
    task: "Payroll Processing – April 2026",
    agentType: "Claude Cowork",
    completedAt: "2026-04-21T15:30:00",
    outputLink: "/Clients/GlobalTech/Payroll/April_2026.xlsx"
  }
];
