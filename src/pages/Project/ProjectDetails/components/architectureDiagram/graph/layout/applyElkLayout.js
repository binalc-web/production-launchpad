import { ELK_DEFAULT_LAYOUT_OPTIONS, NODE_HEIGHT, NODE_WIDTH } from "../constants.js";

let elkPromise;

/** Lazy-load elkjs bundled build. */
async function getElk() {
  if (!elkPromise) {
    elkPromise = import("elkjs/lib/elk.bundled.js").then((mod) => new mod.default());
  }
  return elkPromise;
}

/**
 * Sanitize ELK input so layout never crashes on orphan edges or missing dimensions.
 * Ported from Understand-Anything dashboard elk-layout repair pass.
 * @param {object} input
 * @returns {{ input: object, droppedEdgeCount: number }}
 */
export function repairElkInput(input) {
  let dimsAdded = 0;
  const fillDims = (children = []) =>
    children.map((child) => {
      const next = { ...child };
      if (next.width == null || next.height == null) {
        next.width = next.width ?? NODE_WIDTH;
        next.height = next.height ?? NODE_HEIGHT;
        dimsAdded++;
      }
      if (next.children?.length) next.children = fillDims(next.children);
      return next;
    });

  const childrenWithDims = fillDims(input.children ?? []);

  const allIds = new Set();
  const walkIds = (children = []) => {
    for (const child of children) {
      if (child.id != null) allIds.add(child.id);
      if (child.children?.length) walkIds(child.children);
    }
  };
  walkIds(childrenWithDims);

  let droppedEdgeCount = 0;
  const edges = (input.edges ?? []).filter((edge) => {
    const ok =
      edge.sources?.every((id) => allIds.has(id)) && edge.targets?.every((id) => allIds.has(id));
    if (!ok) droppedEdgeCount++;
    return ok;
  });

  return {
    input: { ...input, children: childrenWithDims, edges },
    droppedEdgeCount,
  };
}

/**
 * Run ELK layered layout and merge positions into React Flow nodes.
 * @param {import('@xyflow/react').Node[]} nodes
 * @param {import('@xyflow/react').Edge[]} edges
 * @param {Map<string, { width: number, height: number }>} [dimensions]
 */
export async function applyElkLayout(nodes, edges, dimensions = new Map()) {
  if (!nodes.length) return { nodes: [], edges };

  const elk = await getElk();
  const elkInput = {
    id: "root",
    layoutOptions: ELK_DEFAULT_LAYOUT_OPTIONS,
    children: nodes.map((node) => {
      const dims = dimensions.get(node.id);
      return {
        id: node.id,
        width: dims?.width ?? NODE_WIDTH,
        height: dims?.height ?? NODE_HEIGHT,
      };
    }),
    edges: edges.map((edge, index) => ({
      id: String(edge.id ?? `e-${index}`),
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  const { input: repaired } = repairElkInput(elkInput);

  let layouted;
  try {
    layouted = await elk.layout(repaired);
  } catch (err) {
    console.error("[architecture-graph] ELK layout failed:", err);
    return { nodes, edges };
  }

  const posById = new Map();

  const walk = (children = []) => {
    for (const child of children) {
      if (child.id != null && child.x != null && child.y != null) {
        posById.set(child.id, { x: child.x, y: child.y });
      }
      if (child.children?.length) walk(child.children);
    }
  };
  walk(layouted.children);

  const layoutedNodes = nodes.map((node) => {
    const pos = posById.get(node.id) ?? { x: 0, y: 0 };
    const dims = dimensions.get(node.id);
    const w = dims?.width ?? NODE_WIDTH;
    const h = dims?.height ?? NODE_HEIGHT;
    return {
      ...node,
      position: { x: pos.x, y: pos.y },
      style: { ...(node.style || {}), width: w, height: h },
    };
  });

  return { nodes: layoutedNodes, edges };
}
