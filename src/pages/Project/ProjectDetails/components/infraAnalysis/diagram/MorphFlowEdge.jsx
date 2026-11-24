import { memo, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BaseEdge, getSmoothStepPath, MarkerType } from "@xyflow/react";
import { cn } from "@/lib/utils";
import {
  COMET_TRAIL_OFFSETS,
  MAX_HOP_DURATION_SEC,
  MIN_HOP_DURATION_SEC,
  REFERENCE_PATH_LENGTH_PX,
} from "./motionConstants.js";

function defaultAnimateRole(role, suggested, paused) {
  if (paused || suggested) return false;
  return role === "primary_flow" || role === "primary";
}

function clampDuration(seconds) {
  return Math.min(MAX_HOP_DURATION_SEC, Math.max(MIN_HOP_DURATION_SEC, seconds));
}

function resolveDuration(edgeData, pathLength) {
  const flowSpeed = edgeData.flowSpeed ?? 1;
  const base = edgeData.chainDurationSec ?? edgeData.duration ?? 2;
  const scaled = (base * pathLength) / REFERENCE_PATH_LENGTH_PX / flowSpeed;
  return clampDuration(scaled);
}

function MorphFlowEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  options = {},
}) {
  const edgeData = data ?? {};
  const role = edgeData.edgeRole ?? "primary_flow";
  const suggested = edgeData.suggested || edgeData.status === "proposed" || role === "recommended";
  const highlighted = Boolean(edgeData.highlighted || selected);
  const paused = Boolean(edgeData.paused);
  const idPrefix = options.idPrefix ?? "morph";
  const pathOffset = edgeData.pathOffset ?? 0;

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 22,
    offset: pathOffset,
  });

  const pathRef = useRef(null);
  const [pathLength, setPathLength] = useState(REFERENCE_PATH_LENGTH_PX);

  useLayoutEffect(() => {
    const length = pathRef.current?.getTotalLength();
    if (length && length > 0) {
      setPathLength(length);
    }
  }, [edgePath]);

  const duration = useMemo(() => resolveDuration(edgeData, pathLength), [edgeData, pathLength]);

  const chainDelay = edgeData.chainDelaySec ?? edgeData.delay ?? 0;

  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const roleAllowsAnimation =
    options.animateRole?.(role, suggested, paused) ?? defaultAnimateRole(role, suggested, paused);
  const animateFlow =
    roleAllowsAnimation && !paused && edgeData.animated !== false && !reducedMotion;

  const baseStroke = highlighted ? "#00B38A" : "#00B38A";
  const glowStroke = highlighted ? "#00B38A" : "#00B38A";
  const particleFill = "#00B38A";

  return (
    <>
      <defs>
        <linearGradient id={`${idPrefix}-grad-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={glowStroke} stopOpacity="0.15" />
          <stop offset="50%" stopColor={glowStroke} stopOpacity={highlighted ? 0.9 : 0.55} />
          <stop offset="100%" stopColor={glowStroke} stopOpacity="0.15" />
        </linearGradient>
      </defs>

      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={MarkerType.ArrowClosed}
        style={{
          stroke: "#E5E7EB",
          strokeWidth: highlighted ? 3 : 2,
          opacity: 0.9,
        }}
      />

      <path
        ref={pathRef}
        d={edgePath}
        fill="none"
        stroke={baseStroke}
        strokeWidth={highlighted ? 3.25 : 2}
        strokeOpacity={highlighted ? 1 : 0.65}
        className={cn(animateFlow && "infra-edge-shimmer")}
      />

      {animateFlow ? (
        <>
          <path
            d={edgePath}
            fill="none"
            stroke={`url(#${idPrefix}-grad-${id})`}
            strokeWidth={highlighted ? 3.5 : 2.5}
            strokeOpacity={highlighted ? 0.9 : 0.5}
            className="infra-edge-glow"
          />
          <path
            d={edgePath}
            fill="none"
            stroke={particleFill}
            strokeWidth={highlighted ? 3.5 : 2.75}
            strokeOpacity={highlighted ? 0.5 : 0.35}
            className="infra-edge-energy"
            style={{ animationDuration: `${duration}s`, animationDelay: `${chainDelay}s` }}
          />
          {COMET_TRAIL_OFFSETS.map((trail) => (
            <g key={`${id}-comet-${trail.trailIndex}`}>
              <circle
                r={highlighted ? trail.radius + 1 : trail.radius}
                fill={particleFill}
                opacity={highlighted ? trail.opacity : trail.opacity * 0.85}
                className="wb-flow-particle"
              >
                <animateMotion
                  dur={`${duration}s`}
                  repeatCount="indefinite"
                  path={edgePath}
                  begin={`${chainDelay + duration * trail.beginOffsetRatio}s`}
                />
              </circle>
              {trail.trailIndex === 0 ? (
                <circle
                  r={highlighted ? 12 : 10}
                  fill={particleFill}
                  opacity={highlighted ? 0.15 : 0.1}
                  className="wb-flow-particle-glow"
                >
                  <animateMotion
                    dur={`${duration}s`}
                    repeatCount="indefinite"
                    path={edgePath}
                    begin={`${chainDelay}s`}
                  />
                </circle>
              ) : null}
            </g>
          ))}
        </>
      ) : null}
    </>
  );
}

export const MorphFlowEdge = memo(MorphFlowEdgeComponent);
