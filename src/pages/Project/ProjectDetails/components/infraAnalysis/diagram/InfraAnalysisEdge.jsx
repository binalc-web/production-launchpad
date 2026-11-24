import { BaseEdge, getSmoothStepPath, MarkerType } from "@xyflow/react";

/** Static / secondary architecture edge. */
export function InfraAnalysisEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}) {
  const role = data?.edgeRole ?? "dependency_flow";
  const highlighted = Boolean(data?.highlighted || selected);
  const dimmed = Boolean(data?.dimmed);

  const stroke = role === "primary_flow" ? "#00B38A" : "#94A3B8";

  const dash = role === "data_flow" || role === "dependency_flow" ? "6 4" : undefined;

  const strokeWidth =
    role === "primary_flow" ? (highlighted ? 2.85 : 2.5) : highlighted ? 1.75 : 1.25;

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16,
    offset: data?.pathOffset ?? 0,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={MarkerType.ArrowClosed}
      style={{
        stroke,
        strokeWidth,
        strokeDasharray: dash,
        opacity: highlighted ? 1 : dimmed ? 0.15 : role === "primary_flow" ? 0.85 : 0.45,
      }}
    />
  );
}
