const CLIENT_KEYS = [
  "decisionRole",
  "goals",
  "painPoints",
  "currentWorkflow",
  "jobsToBeDone",
  "successMetrics",
  "constraints",
  "objections",
  "commsPreference",
];

const COMPANY_KEYS = [
  "name",
  "website",
  "industry",
  "strategicPriorities",
  "marketPosition",
  "targetMarket",
  "businessModel",
];

const PRODUCT_KEYS = [
  "name",
  "problemStatement",
  "targetUsers",
  "useCases",
  "valueProposition",
  "mvpScope",
  "successMetrics",
];

function countFilled(obj, keys) {
  if (!obj) return 0;
  return keys.filter((k) => {
    const v = obj[k];
    if (v == null) return false;
    if (typeof v === "string") return v.trim().length > 0;
    if (typeof v === "object" && !Array.isArray(v)) {
      return Object.values(v).some((x) => typeof x === "string" && x.trim());
    }
    return Boolean(v);
  }).length;
}

export function personaCompleteness(personas, type) {
  const p = personas?.[type];
  if (!p) return 0;
  if (type === "client") {
    const keys = ["primaryContact", "socials", ...CLIENT_KEYS];
    const filled = countFilled(p, keys) + (p.primaryContact?.name ? 1 : 0);
    return Math.round((filled / (keys.length + 1)) * 100);
  }
  if (type === "company") {
    return Math.round((countFilled(p, COMPANY_KEYS) / COMPANY_KEYS.length) * 100);
  }
  if (type === "competitors") {
    const items = p.items?.length || 0;
    const insightKeys = [
      "competitiveAdvantages",
      "marketWhitespace",
      "marketTrends",
      "strategicImplications",
      "differentiators",
      "opportunities",
      "trends",
      "comparison",
    ];
    const insights = countFilled(p.insights || {}, insightKeys);
    return Math.min(100, Math.round((items > 0 ? 50 : 0) + (insights / insightKeys.length) * 50));
  }
  if (type === "product") {
    return Math.round((countFilled(p, PRODUCT_KEYS) / PRODUCT_KEYS.length) * 100);
  }
  return 0;
}
