import { Skeleton } from "@/components/ui/skeleton";
import { JiraBacklog } from "./JiraBacklog";
import { MeetingNotes } from "./MeetingNotes";

function SourcesLoadingSkeleton() {
  return (
    <div
      className="absolute inset-0 z-20 min-h-48 space-y-3 rounded-lg bg-background/95 p-4 shadow-sm ring-1 ring-border/60"
      role="status"
      aria-busy="true"
      aria-label="Loading Hub meeting notes and Jira backlog"
    >
      <Skeleton className="h-4 w-40" />
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

/**
 * Renders meeting notes + Jira backlog sections. Pass the `meetingNotes` and
 * `jiraBacklog` objects returned from {@link useReleaseSuggestionContext}.
 */
export function ReleaseSuggestionContextPanel({ sourcesLoading, meetingNotes, jiraBacklog }) {
  return (
    <div className="relative space-y-4">
      {sourcesLoading ? <SourcesLoadingSkeleton /> : null}
      <MeetingNotes meetingNotes={meetingNotes} sourcesLoading={sourcesLoading} />
      <JiraBacklog jiraBacklog={jiraBacklog} sourcesLoading={sourcesLoading} />
    </div>
  );
}
