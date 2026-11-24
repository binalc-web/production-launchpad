/**
 * Project stats overview for Info tab (UA ProjectOverview parity).
 */
export function ArchitectureProjectOverview({ graph, onStartTour }) {
  if (!graph) return null;

  const { project, nodes = [], edges = [], layers = [], tour = [] } = graph;
  const typeCounts = {};
  for (const node of nodes) {
    typeCounts[node.type] = (typeCounts[node.type] ?? 0) + 1;
  }

  return (
    <div className="space-y-4 px-4 py-4">
      <div>
        <h3 className="arch-graph-heading text-lg font-semibold text-foreground">
          {project?.name || "Project"}
        </h3>
        {project?.description ? (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {project.description}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <StatCard label="Nodes" value={nodes.length} />
        <StatCard label="Edges" value={edges.length} />
        <StatCard label="Layers" value={layers.length} />
        <StatCard label="Tour steps" value={tour.length} />
      </div>

      {tour.length > 0 ? (
        <button
          type="button"
          className="w-full rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/15"
          onClick={onStartTour}
        >
          Start project tour
        </button>
      ) : null}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Node types
        </p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(typeCounts).map(([type, count]) => (
            <span
              key={type}
              className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] capitalize text-muted-foreground"
            >
              {type} ({count})
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
