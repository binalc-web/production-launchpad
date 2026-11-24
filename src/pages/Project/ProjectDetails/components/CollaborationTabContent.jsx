import { useEffect, useRef, useState } from "react";
import { useProjectCollaborationStream } from "../hooks/useProjectCollaborationStream";
import { PresenceBar } from "./collaboration/PresenceBar";
import { ConflictBanner } from "./collaboration/ConflictBanner";
import { TeamDigestCard } from "./collaboration/TeamDigestCard";
import { ActivityTimeline } from "./collaboration/ActivityTimeline";

/**
 * Team Activity: live presence, conflict warnings, RAG digest, and activity timeline.
 * Visible to all project members.
 * @param {{ project: { id: number } }} props
 */
export function CollaborationTabContent({ project }) {
  const projectId = Number(project?.id);
  const { connected, events, presence, conflicts, loadMore, hasMore, loadingMore } =
    useProjectCollaborationStream(projectId, { enabled: projectId > 0 });

  // Nudge the digest to regenerate when new activity or conflicts arrive (server debounces).
  const [digestSignal, setDigestSignal] = useState(0);
  const lastEventId = useRef(null);
  useEffect(() => {
    const latest = events[0]?.id ?? null;
    if (latest && latest !== lastEventId.current) {
      lastEventId.current = latest;
      setDigestSignal((n) => n + 1);
    }
  }, [events]);

  return (
    <div className="min-w-0 space-y-4">
      <PresenceBar presence={presence} />
      <ConflictBanner conflicts={conflicts} />

      <div className="grid gap-4 lg:grid-cols-2">
        <TeamDigestCard projectId={projectId} refreshSignal={digestSignal} />
        <ActivityTimeline
          events={events}
          loading={!connected}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
        />
      </div>
    </div>
  );
}
