import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveSelectedJiraEpicContext } from "@/utils/releaseSuggestionJira";
import { ExternalLink, MessageSquare, Sparkles } from "lucide-react";
import { BacklogEpicAiSheet } from "./BacklogEpicAiSheet";

export function JiraEpicStoryAiSection({ projectId, jiraBacklog, onStoriesCreated }) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const allTickets = jiraBacklog?.allTickets ?? jiraBacklog?.tickets ?? [];
  const selectedKeys = jiraBacklog?.selectedKeys ?? [];

  const epicContext = useMemo(
    () => resolveSelectedJiraEpicContext(selectedKeys, allTickets),
    [selectedKeys, allTickets],
  );

  const readyEpic = epicContext.status === "ready" ? epicContext.epic : null;
  const stories = epicContext.status === "ready" ? (epicContext.stories ?? []) : [];

  return (
    <>
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary shrink-0" aria-hidden />
            Epic stories
          </CardTitle>
          <CardDescription>
            Select exactly one Epic in Jira backlog above. Its stories appear here; use AI to add
            more under that epic.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {epicContext.status === "none" ? (
            <p className="text-sm text-muted-foreground">
              Select one Epic in the Jira backlog list above to view its stories.
            </p>
          ) : null}

          {epicContext.status === "no_epic" ? (
            <p className="text-sm text-muted-foreground">
              Your selection does not include an Epic. Select exactly one Epic to manage its
              stories.
            </p>
          ) : null}

          {epicContext.status === "multiple" ? (
            <p className="text-sm text-muted-foreground">
              Multiple Epics are selected. Select only one Epic to view and add stories.
            </p>
          ) : null}

          {readyEpic ? (
            <>
              <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/10 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Selected epic</p>
                  <p className="text-sm font-medium text-foreground truncate">{readyEpic.title}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="font-mono font-normal">
                      {readyEpic.jiraKey}
                    </Badge>
                    {readyEpic.url ? (
                      <a
                        href={readyEpic.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline"
                      >
                        Open in Jira
                        <ExternalLink className="h-3 w-3" aria-hidden />
                      </a>
                    ) : null}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 shrink-0"
                  onClick={() => setSheetOpen(true)}
                >
                  <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                  Add stories with AI
                </Button>
              </div>

              {stories.length ? (
                <ul className="m-0 max-h-72 list-none space-y-1.5 overflow-y-auto rounded-lg border border-border bg-background p-2">
                  {stories.map((story, idx) => (
                    <li
                      key={story.key}
                      className="rounded-md border border-border/60 bg-muted/10 px-3 py-2.5 transition-colors hover:bg-muted/25"
                    >
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold tabular-nums text-muted-foreground">
                          {idx + 1}
                        </span>
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {story.key}
                        </span>
                        {story.status ? (
                          <span className="text-[11px] text-muted-foreground">{story.status}</span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm leading-snug text-foreground">{story.title}</p>
                      {story.url ? (
                        <a
                          href={story.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline"
                        >
                          Open in Jira
                          <ExternalLink className="h-3 w-3" aria-hidden />
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground rounded-md border border-dashed border-border px-3 py-4 text-center">
                  No stories linked to this epic yet. Use <strong>Add stories with AI</strong> to
                  create some in Jira.
                </p>
              )}
            </>
          ) : null}
        </CardContent>
      </Card>

      <BacklogEpicAiSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        projectId={projectId}
        mode="add_stories"
        jiraReady
        startWithChat
        existingEpic={
          readyEpic
            ? {
                jiraKey: readyEpic.jiraKey,
                title: readyEpic.title,
                description: "",
                siblingStoryNames: stories.map((s) => s.title),
              }
            : null
        }
        onCreated={() => {
          onStoriesCreated?.();
        }}
      />
    </>
  );
}
