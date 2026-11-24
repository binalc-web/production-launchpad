import { Handle, Position } from "@xyflow/react";
import { TechServiceIcon } from "./TechServiceIcon.jsx";
import { resolveIconAccent } from "./resolveTechIcon.js";
import { SERVICE_NODE_MIN_HEIGHT, SERVICE_NODE_WIDTH } from "./motionConstants.js";

const STATUS_STYLES = {
  detected: "border-border/90 bg-card shadow-sm",
  suggested: "border-emerald-600/35 border-dashed bg-emerald-500/[0.06]",
  "needs-review": "border-amber-500/40 border-dashed bg-amber-500/[0.06]",
};

const CONFIDENCE_LABELS = {
  high: {
    label: "High confidence",
    className: "border-emerald-600/45 bg-emerald-500/15 text-emerald-900 dark:text-emerald-100",
  },
  medium: {
    label: "Medium confidence",
    className: "border-slate-400/50 bg-slate-500/10 text-slate-700 dark:text-slate-200",
  },
  low: {
    label: "Low confidence",
    className: "border-amber-500/50 bg-amber-500/12 text-amber-900 dark:text-amber-100",
  },
};

function nodeBorderClass(status) {
  return STATUS_STYLES[status] ?? STATUS_STYLES.detected;
}

function confidenceBadge(confidence) {
  const key = String(confidence ?? "medium").toLowerCase();
  return CONFIDENCE_LABELS[key] ?? CONFIDENCE_LABELS.medium;
}

/** Rich service card node for the architecture diagram. */
export function InfraAnalysisServiceNode({ data, selected }) {
  const subtitle = data.description?.trim() || data.kind?.trim() || data.zone?.trim() || "Service";
  const iconAccent = resolveIconAccent(data.kind, data.label);
  const confidence = confidenceBadge(data.confidence);

  const enterClass = data.isNew ? "wb-node-enter" : "";
  const hopClass = data.flowHopActive ? "wb-node-flow-pulse" : "";

  const motionStyle = {
    ...(data.isNew && typeof data.enterDelayMs === "number"
      ? { "--enter-delay": `${data.enterDelayMs}ms` }
      : {}),
    ...(data.flowHopActive && typeof data.flowHopDelaySec === "number"
      ? { "--hop-delay": `${data.flowHopDelaySec}s` }
      : {}),
  };

  return (
    <div
      style={{ width: SERVICE_NODE_WIDTH, minHeight: SERVICE_NODE_MIN_HEIGHT, ...motionStyle }}
      className={`group relative rounded-xl border px-4 py-4 transition-shadow duration-200 motion-reduce:transition-none ${enterClass} ${hopClass} ${nodeBorderClass(data.status)} ${
        selected
          ? "z-10 shadow-md ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
          : "shadow-sm"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-1.5 !w-1.5 !min-h-0 !min-w-0 !border-0 !bg-muted-foreground/35 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
      />

      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
            data.iconGeneric
              ? "border-border/80 bg-muted/80"
              : `${iconAccent.border} ${iconAccent.bg}`
          }`}
          title={data.icon}
        >
          <TechServiceIcon
            icon={data.icon ?? "mdi:application-brackets-outline"}
            title={data.icon}
            className={`h-5 w-5 ${data.iconGeneric ? "text-muted-foreground" : iconAccent.text}`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-relaxed text-card-foreground [overflow-wrap:anywhere] line-clamp-2">
            {data.label}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere] line-clamp-2">
            {subtitle}
          </p>
          <span
            className={`mt-3 inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${confidence.className}`}
          >
            {data.status === "suggested" ? "Suggested" : confidence.label}
          </span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-1.5 !w-1.5 !min-h-0 !min-w-0 !border-0 !bg-muted-foreground/35 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
      />
    </div>
  );
}
