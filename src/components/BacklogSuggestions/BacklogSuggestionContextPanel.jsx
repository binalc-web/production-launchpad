import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { JiraBacklog } from "@/components/ReleaseSuggestions/JiraBacklog";
import { CaptureContextPicker } from "./CaptureContextPicker";

function DocumentSelectionContext({ captureContext }) {
  const { textareaProps, characterCount, documentSelectionSource } = captureContext;
  const selectionText = textareaProps.value?.trim();
  if (!selectionText) return null;

  return (
    <section className="space-y-2 rounded-lg border border-primary/25 bg-primary/5 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Label
          htmlFor={textareaProps.id}
          className="text-xs font-semibold uppercase tracking-wide text-primary"
        >
          Your selection
        </Label>
        <Badge variant="secondary" className="text-[10px] font-normal">
          Strict scope
        </Badge>
        {documentSelectionSource?.docName ? (
          <Badge variant="outline" className="text-[10px] font-normal">
            from {documentSelectionSource.docName}
          </Badge>
        ) : null}
      </div>
      <Textarea
        {...textareaProps}
        rows={6}
        className="min-h-[120px] resize-y bg-background text-sm"
      />
      {characterCount > 0 ? (
        <p className="text-xs text-muted-foreground">
          {characterCount.toLocaleString()} chars in context
        </p>
      ) : null}
    </section>
  );
}

function SourcesLoadingSkeleton({ label }) {
  return (
    <div
      className="absolute inset-0 z-20 min-h-48 space-y-3 rounded-lg bg-background/95 p-4 shadow-sm ring-1 ring-border/60"
      role="status"
      aria-busy="true"
      aria-label={label}
    >
      <Skeleton className="h-4 w-40" />
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function BacklogSuggestionContextPanel({
  sourcesLoading,
  captureContext,
  jiraBacklog,
  jiraReady = false,
}) {
  const showDocumentSelection =
    captureContext?.focusDocumentSelection || Boolean(captureContext?.documentSelectionSource);

  return (
    <div className="relative space-y-4">
      {sourcesLoading ? (
        <SourcesLoadingSkeleton
          label={jiraReady ? "Loading Jira backlog" : "Loading Discovery capture"}
        />
      ) : null}

      {showDocumentSelection ? <DocumentSelectionContext captureContext={captureContext} /> : null}

      {jiraReady ? (
        <JiraBacklog jiraBacklog={jiraBacklog} sourcesLoading={sourcesLoading} />
      ) : (
        <CaptureContextPicker captureContext={captureContext} sourcesLoading={sourcesLoading} />
      )}
    </div>
  );
}
