/** Map node fields to an Iconify or lucide icon key. */

const AGENT_TECH_ICON_MAP = {
  lambda: "logos:aws-lambda",
  "aws-lambda": "logos:aws-lambda",
  serverless: "logos:aws-lambda",
  github: "mdi:github",
  "github-actions": "logos:github-actions",
  docker: "devicon:docker",
  node: "devicon:nodejs",
  nodejs: "devicon:nodejs",
  express: "devicon:express",
  react: "devicon:react",
  nextjs: "devicon:nextjs",
  postgres: "devicon:postgresql",
  postgresql: "devicon:postgresql",
  redis: "devicon:redis",
  terraform: "devicon:terraform",
  rds: "logos:aws-rds",
  ecs: "logos:aws-ecs",
  s3: "logos:aws-s3",
  cognito: "logos:aws-cognito",
  cloudwatch: "logos:aws-cloudwatch",
  dynamodb: "logos:aws-dynamodb",
  api: "mdi:server-network-outline",
  database: "mdi:database-outline",
  cache: "mdi:database-outline",
  queue: "mdi:transit-connection-variant",
  worker: "mdi:engine-outline",
  web: "mdi:web",
  user: "mdi:account-outline",
};

function normalizeKey(raw) {
  if (!raw?.trim()) return undefined;
  return raw.trim().toLowerCase().replace(/\s+/g, "-").replace(/_/g, "-");
}

function matchFromLabel(label) {
  const lower = String(label ?? "").toLowerCase();
  for (const [key, icon] of Object.entries(AGENT_TECH_ICON_MAP)) {
    if (lower.includes(key)) return icon;
  }
  return "mdi:application-brackets-outline";
}

/** @param {{ techIcon?: string, kind?: string, label?: string, plainName?: string, name?: string }} node */
export function resolveTechIcon(node) {
  const techKey = normalizeKey(node.techIcon);
  if (techKey && AGENT_TECH_ICON_MAP[techKey]) {
    return { icon: AGENT_TECH_ICON_MAP[techKey], generic: false };
  }
  if (techKey?.includes(":")) {
    return { icon: techKey, generic: false };
  }

  const kindKey = normalizeKey(node.kind);
  if (kindKey && AGENT_TECH_ICON_MAP[kindKey]) {
    return { icon: AGENT_TECH_ICON_MAP[kindKey], generic: false };
  }

  return { icon: matchFromLabel(node.plainName ?? node.label ?? node.name), generic: true };
}

/** Accent colors for service icon container. */
export function resolveIconAccent(kind, label) {
  const key = normalizeKey(kind) ?? normalizeKey(label) ?? "";
  if (key.includes("data") || key.includes("postgres") || key.includes("redis")) {
    return {
      border: "border-amber-500/35",
      bg: "bg-amber-500/10",
      text: "text-amber-700 dark:text-amber-300",
    };
  }
  if (key.includes("auth") || key.includes("cognito")) {
    return {
      border: "border-slate-400/40",
      bg: "bg-slate-500/10",
      text: "text-slate-700 dark:text-slate-300",
    };
  }
  if (key.includes("ingress") || key.includes("gateway") || key.includes("alb")) {
    return {
      border: "border-teal-500/35",
      bg: "bg-teal-500/10",
      text: "text-teal-700 dark:text-teal-300",
    };
  }
  return {
    border: "border-violet-500/35",
    bg: "bg-violet-500/10",
    text: "text-violet-700 dark:text-violet-300",
  };
}
