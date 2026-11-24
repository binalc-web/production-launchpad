import { CONSOLE_SERVICES, CONSOLE_SETTINGS_SERVICE } from "./projectServices.js";

const SIDEBAR_OBSERVE_SELECTOR = '[data-tour="project-console-sidebar"]';

/** Keep reactour mask aligned when accordion expand/collapse shifts sidebar layout. */
const SIDEBAR_STEP_OBSERVABLES = {
  mutationObservables: [SIDEBAR_OBSERVE_SELECTOR],
  resizeObservables: [SIDEBAR_OBSERVE_SELECTOR],
};

/** Simple bullet copy keyed by console service id. */
const SERVICE_TOUR_COPY = {
  "product-strategy": {
    title: "Product Strategy",
    points: [
      "Collect all the information for any feature or module",
      "Write down what you want to build.",
      "Save notes, files, and hub meeting notes.",
      "Create Questionnaire link which you can share with client to get their feedback",
      "Create final PRD in Documents",
    ],
  },
  "backlog-management": {
    title: "Backlog Management",
    points: [
      "Create Epic, Story, Tasks in to Jira Borad directly from here",
      "Update Epic, Story, Tasks using AI",
      "Connect your Jira Board from settings or use Lauchpad Board",
    ],
  },
  "release-management": {
    title: "Release Management",
    points: [
      "Manage your releases",
      "Using Manage Scope AI you can execute any Epic or Story in to a release.",
      "2 ways to execute Release: 1) Launchpad Preview  2) Actual Development",
      "See the whole Roadmap of Releases.",
    ],
  },
  preview: {
    title: "Preview",
    points: [
      "Launchpad Preview - live look in the browser.",
      "Using AI Chat you can change any design.",
      "Launchpad Preview is separate from Actual Development.",
    ],
  },
  application: {
    title: "App repositories",
    points: [
      "This is the real code for the app (Actual Development).",
      "Using Chat you can implement any feature (FE,BE both)",
      "IDE Feature exactly works like cursor IDE but in the cloud",
      "After work done you will directly get PR of that feature"
    ],
  },
  infrastructure: {
    title: "Infrastructure",
    points: [
      "This is where you can deploy your app",
    ],
  },
  validation: {
    title: "QA",
    points: [
      "You will see all Feedback from users here via QA App, Code Snipet, Lauchpad Preview (Client Link)",
      "Able to See bugs here which is tested via QA App ",
      "Using Fix with AI you can directly get PR on your github repository"
    ],
  },
  "code-snippet": {
    title: "Code Snippet",
    points: [
      "Add Script in your app to get that Report Issue button into your website",
      "Red Report issue button which you are seeing right now in the Lauchpad",
      "Edit Screenshot, Record video, Pick element and then submit feedback"
    ],
  },
  "project-reports": {
    title: "Project reports",
    points: [
      "You can Schdule any Cron Job to run in your code",
      "Like Security Audit, Code Standard Check, etc...",
      "Using any hub skill you can run any cron job"
    ],
  },
};

/**
 * Build the ordered tour steps.
 * @param {Array<{ id: string, label: string }>} [_stages] — unused; kept for call-site compat
 */
export function buildJourneyTourSteps(_stages) {
  return [
    {
      id: "project-switcher",
      selector: '[data-tour="project-console-switcher"]',
      position: "right",
      serviceId: null,
      content: {
        title: "Your project",
        points: [
          "This is the project you are working on right now.",
          "Click the name to pick a different project.",
          "Click Create project to start a new one.",
        ],
      },
    },
    ...CONSOLE_SERVICES.map((service) => ({
      id: `service-${service.id}`,
      selector: `[data-tour="project-console-service-${service.id}"]`,
      position: "right",
      serviceId: service.id,
      content: SERVICE_TOUR_COPY[service.id],
      ...SIDEBAR_STEP_OBSERVABLES,
    })),
    {
      id: "service-settings",
      selector: `[data-tour="project-console-service-${CONSOLE_SETTINGS_SERVICE.id}"]`,
      position: "right",
      serviceId: CONSOLE_SETTINGS_SERVICE.id,
      ...SIDEBAR_STEP_OBSERVABLES,
      content: {
        title: "Settings",
        points: [
          "Configure Github Repository and Jira Board",
          "Configure Team Members and their roles",
          "Open project chat, review portal (Client Link), Preivew only mode for client and more.",
          "See how the team is doing.",
        ],
      },
    },
    {
      id: "workspace-tour-button",
      selector: '[data-tour="workspace-tour-button"]',
      position: "bottom",
      serviceId: null,
      content: {
        title: "See this again",
        points: [
          "Click Tour anytime to replay this walkthrough.",
          "Search Tour with ⌘K to start it too.",
        ],
      },
    },
  ];
}
