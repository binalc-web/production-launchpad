import { useCallback, useMemo, useState } from "react";
import Editor from "@/lib/monacoEditor";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  createKickoffPresentationRevision,
  fetchKickoffPresentationRevisions,
  restoreKickoffPresentationRevision,
} from "@/api";
import { Bookmark, FileDown, History, Loader2, RefreshCw, SunMoon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PresentationSkillBar } from "../components/PresentationSkillBar";
import { PRESENTATION_EXPORT_DESTINATIONS } from "./kickoffPresentationExport";

const STATUS_LABELS = {
  pending: "Queued",
  generating: "Generating…",
  completed: "Ready",
  failed: "Failed",
};

function ToolbarDivider() {
  return <div className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />;
}

export function KickoffPresentationEditor({
  projectId,
  presentation,
  saving,
  onHtmlChange,
  onSkillChange,
  onRegenerate,
  onThemeChange,
  onPresentationApplied,
  onReload,
}) {
  const [tab, setTab] = useState("preview");
  const [exporting, setExporting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState({ original: null, revisions: [] });
  const [versionSummary, setVersionSummary] = useState("");
  const [versionSaving, setVersionSaving] = useState(false);

  const isBusy = ["pending", "generating"].includes(presentation?.status);
  const statusLabel = STATUS_LABELS[presentation?.status] || presentation?.status;

  const previewHtml = useMemo(() => presentation?.html || "", [presentation?.html]);

  const loadHistory = useCallback(async () => {
    if (!projectId || !presentation?.id) return;
    setHistoryLoading(true);
    try {
      const data = await fetchKickoffPresentationRevisions(projectId, presentation.id);
      setHistory({
        original: data.original || null,
        revisions: data.revisions || [],
      });
    } catch (err) {
      toast.error(err?.error || "Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  }, [projectId, presentation?.id]);

  const openHistory = () => {
    setHistoryOpen(true);
    loadHistory();
  };

  const handleExport = async (destination) => {
    if (!presentation?.html?.trim()) {
      toast.error("Nothing to export yet");
      return;
    }
    setExporting(true);
    try {
      await destination.export({ presentation });
      toast.success(`Exported ${destination.label}`);
    } catch (err) {
      toast.error(err?.message || err?.error || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await onRegenerate?.();
    } finally {
      setRegenerating(false);
    }
  };

  const handleSaveVersion = async () => {
    const summary = versionSummary.trim();
    if (!summary) {
      toast.error("Enter a version name");
      return;
    }
    setVersionSaving(true);
    try {
      const data = await createKickoffPresentationRevision(projectId, presentation.id, {
        changeSummary: summary,
      });
      onPresentationApplied?.(data.presentation);
      setVersionSummary("");
      await loadHistory();
      toast.success("Version saved");
    } catch (err) {
      toast.error(err?.error || "Failed to save version");
    } finally {
      setVersionSaving(false);
    }
  };

  const handleRestore = async (revisionId) => {
    try {
      const data = await restoreKickoffPresentationRevision(projectId, presentation.id, revisionId);
      onPresentationApplied?.(data.presentation);
      await onReload?.();
      setHistoryOpen(false);
      toast.success("Version restored");
    } catch (err) {
      toast.error(err?.error || "Failed to restore version");
    }
  };

  const toggleTheme = () => {
    onThemeChange?.(presentation.theme === "dark" ? "light" : "dark");
  };

  if (!presentation) return null;

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b px-3 py-2 min-h-11 shrink-0">
        <h2
          className="min-w-0 flex-1 truncate text-sm font-semibold leading-tight"
          title={presentation.name}
        >
          {presentation.name}
        </h2>
        <Badge
          variant={
            presentation.status === "failed" ? "destructive" : isBusy ? "secondary" : "outline"
          }
          className="shrink-0 text-[10px]"
        >
          {statusLabel}
        </Badge>
        {saving ? (
          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            <span className="hidden sm:inline">Saving…</span>
          </span>
        ) : null}
      </div>

      {presentation.status === "failed" && presentation.error ? (
        <div className="mx-3 mt-2 shrink-0 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {presentation.error}
        </div>
      ) : null}

      {isBusy ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 size-6 animate-spin" />
          Building your kickoff presentation…
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col gap-0">
          <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b px-3 py-2 sm:px-4">
            <TabsList className="h-8 shrink-0">
              <TabsTrigger value="preview" className="px-3 text-xs">
                Preview
              </TabsTrigger>
              <TabsTrigger value="edit" className="px-3 text-xs">
                Edit HTML
              </TabsTrigger>
            </TabsList>
            <ToolbarDivider />
            <PresentationSkillBar
              presentation={presentation}
              saving={saving || isBusy}
              onSkillChange={onSkillChange}
              compact
            />
            <div className="min-w-2 flex-1" />
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs"
                onClick={toggleTheme}
                disabled={isBusy}
                title={
                  presentation.theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
                }
              >
                <SunMoon className="size-3.5 sm:mr-1.5" />
                <span className="hidden md:inline">
                  {presentation.theme === "dark" ? "Dark" : "Light"}
                </span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-xs"
                    disabled={exporting || isBusy || !presentation.html}
                  >
                    {exporting ? (
                      <Loader2 className="size-3.5 animate-spin sm:mr-1.5" />
                    ) : (
                      <FileDown className="size-3.5 sm:mr-1.5" />
                    )}
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {PRESENTATION_EXPORT_DESTINATIONS.map((dest) => (
                    <DropdownMenuItem
                      key={dest.id}
                      className="cursor-pointer"
                      onClick={() => handleExport(dest)}
                    >
                      {dest.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs"
                onClick={handleRegenerate}
                disabled={regenerating || isBusy}
              >
                {regenerating || isBusy ? (
                  <Loader2 className="size-3.5 animate-spin sm:mr-1.5" />
                ) : (
                  <RefreshCw className="size-3.5 sm:mr-1.5" />
                )}
                <span className="hidden sm:inline">Regenerate</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs"
                onClick={openHistory}
              >
                <History className="size-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">History</span>
              </Button>
            </div>
          </div>

          <TabsContent
            value="preview"
            className="m-0 flex min-h-0 flex-1 flex-col p-3 sm:p-4 data-[state=inactive]:hidden"
          >
            <div className="flex min-h-[min(50vh,420px)] flex-1 flex-col overflow-hidden rounded-xl border bg-muted/10 shadow-sm sm:min-h-[min(65vh,720px)]">
              {previewHtml ? (
                <iframe
                  title={presentation.name}
                  srcDoc={previewHtml}
                  className="min-h-[min(50vh,420px)] w-full flex-1 bg-background sm:min-h-[min(65vh,720px)]"
                  sandbox="allow-same-origin"
                />
              ) : (
                <div className="flex min-h-[min(50vh,420px)] flex-1 items-center justify-center text-sm text-muted-foreground sm:min-h-[min(65vh,720px)]">
                  No content yet
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent
            value="edit"
            className="m-0 flex min-h-0 flex-1 flex-col p-3 sm:p-4 data-[state=inactive]:hidden"
          >
            <div className="flex min-h-[min(50vh,420px)] flex-1 flex-col overflow-hidden rounded-xl border sm:min-h-[min(65vh,720px)]">
              <Editor
                height="100%"
                defaultLanguage="html"
                value={presentation.html || ""}
                onChange={(value) => onHtmlChange?.(value ?? "")}
                options={{
                  minimap: { enabled: false },
                  wordWrap: "on",
                  fontSize: 13,
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
      )}

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden sm:max-w-md">
          <SheetHeader className="shrink-0 border-b px-4 pb-4">
            <SheetTitle>Presentation history</SheetTitle>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="version-summary">Name this version</Label>
              <div className="flex gap-2">
                <Input
                  id="version-summary"
                  value={versionSummary}
                  onChange={(e) => setVersionSummary(e.target.value)}
                  placeholder="e.g. Client review draft"
                  className="min-w-0 flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleSaveVersion();
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  className="size-9 shrink-0"
                  onClick={handleSaveVersion}
                  disabled={versionSaving}
                  title="Save version"
                >
                  {versionSaving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Bookmark className="size-4" />
                  )}
                </Button>
              </div>
            </div>
            {historyLoading ? (
              <div
                className="space-y-2"
                role="status"
                aria-busy="true"
                aria-label="Loading presentation history"
              >
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <ul className="space-y-2">
                {history.original ? (
                  <li>
                    <button
                      type="button"
                      onClick={() => handleRestore(history.original.id)}
                      className={cn(
                        "w-full cursor-pointer rounded-lg border px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/40",
                      )}
                    >
                      <span className="font-medium">Original</span>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {history.original.changeSummary || "Baseline"}
                      </p>
                    </button>
                  </li>
                ) : null}
                {[...(history.revisions || [])].reverse().map((rev) => (
                  <li key={rev.id}>
                    <button
                      type="button"
                      onClick={() => handleRestore(rev.id)}
                      className="w-full cursor-pointer rounded-lg border px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/40"
                    >
                      <span className="font-medium">
                        v{rev.revisionNumber} — {rev.changeSummary}
                      </span>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {rev.createdAt ? new Date(rev.createdAt).toLocaleString() : ""}
                      </p>
                    </button>
                  </li>
                ))}
                {!history.original && !(history.revisions || []).length ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No saved versions yet. Name a version above to create your first snapshot.
                  </p>
                ) : null}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
