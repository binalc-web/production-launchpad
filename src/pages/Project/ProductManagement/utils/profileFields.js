/** PM profile field definitions mirrored from backend profileFields.constants.js */

export const CLIENT_PROFILE_FIELDS = [
  { key: "decisionRole", label: "Decision role" },
  { key: "goals", label: "Goals", textarea: true },
  { key: "painPoints", label: "Pain points", textarea: true },
  { key: "currentWorkflow", label: "Current workflow", textarea: true },
  { key: "jobsToBeDone", label: "Jobs to be done", textarea: true },
  { key: "successMetrics", label: "Success metrics", textarea: true },
  { key: "constraints", label: "Constraints", textarea: true },
  { key: "objections", label: "Objections / concerns", textarea: true },
  { key: "commsPreference", label: "Communication preference" },
];

export const COMPANY_PROFILE_FIELDS = [
  { key: "name", label: "Company name" },
  { key: "website", label: "Website" },
  { key: "industry", label: "Industry" },
  { key: "size", label: "Company size" },
  { key: "location", label: "HQ location" },
  { key: "founded", label: "Founded" },
  { key: "businessModel", label: "Business model", textarea: true },
  { key: "targetMarket", label: "Target market / ICP", textarea: true },
  { key: "strategicPriorities", label: "Strategic priorities", textarea: true },
  { key: "currentTools", label: "Current tools / stack", textarea: true },
  { key: "marketPosition", label: "Market position", textarea: true },
  { key: "growthStage", label: "Growth stage" },
];

export const PRODUCT_PROFILE_FIELDS = [
  { key: "name", label: "Product name" },
  { key: "problemStatement", label: "Problem statement", textarea: true },
  { key: "targetUsers", label: "Target users", textarea: true },
  { key: "useCases", label: "Use cases", textarea: true },
  { key: "valueProposition", label: "Value proposition", textarea: true },
  { key: "mvpScope", label: "MVP scope", textarea: true },
  { key: "outOfScope", label: "Out of scope", textarea: true },
  { key: "successMetrics", label: "Success metrics", textarea: true },
  { key: "timeline", label: "Timeline" },
  { key: "assumptions", label: "Assumptions", textarea: true },
  { key: "dependencies", label: "Dependencies", textarea: true },
  { key: "risks", label: "Risks", textarea: true },
];

export const COMPETITOR_INSIGHT_FIELDS = [
  { key: "competitiveAdvantages", label: "Competitive advantages" },
  { key: "marketWhitespace", label: "Market whitespace" },
  { key: "marketTrends", label: "Market trends" },
  { key: "strategicImplications", label: "Strategic implications" },
];

export const COMPETITOR_ITEM_FIELDS = [
  { key: "targetSegment", label: "Target segment", placeholder: "Segment" },
  { key: "pricingModel", label: "Pricing model", placeholder: "Pricing" },
  {
    key: "differentiationVsUs",
    label: "Differentiation vs us",
    placeholder: "How they differ",
  },
];
