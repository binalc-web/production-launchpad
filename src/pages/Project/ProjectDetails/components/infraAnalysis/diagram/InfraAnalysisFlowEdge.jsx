import { memo } from "react";
import { MorphFlowEdge } from "./MorphFlowEdge.jsx";

function InfraAnalysisFlowEdgeComponent(props) {
  const data = props.data ?? {};
  return (
    <MorphFlowEdge
      {...props}
      data={{
        ...data,
        edgeRole: data.edgeRole,
        status: data.status,
        flowOrder: data.flowOrder,
        pathOffset: data.pathOffset,
        chainDelaySec: data.chainDelaySec,
        chainDurationSec: data.chainDurationSec,
        flowSpeed: data.flowSpeed,
        paused: data.paused,
        highlighted: data.highlighted,
      }}
      options={{
        idPrefix: "infra-flow",
        showFlowOrderBadge: false,
        animateRole: (role, suggested, paused) => {
          if (paused || suggested) return false;
          return role === "primary_flow" || role === "primary";
        },
      }}
    />
  );
}

export const InfraAnalysisFlowEdge = memo(InfraAnalysisFlowEdgeComponent);
