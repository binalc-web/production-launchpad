import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Copy, FileText, Loader2, RefreshCw } from "lucide-react";
import { fetchConventionsExample, validateProjectConventions } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CONVENTIONS_PATH = ".launchpad/conventions.md";
const EXAMPLE_PATH = ".launchpad/conventions.example.md";

async function copyText(text) {
  if (!text?.trim()) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function ExampleTemplateSkeleton({ className }) {
  return (
    <div
      className={cn("space-y-2", className)}
      role="status"
      aria-busy="true"
      aria-label="Loading example template"
    >
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}

export function ProjectConventionsCard({ projectId, className, variant = "default" }) {
  const isSettings = variant === "settings";
  const [loading, setLoading] = useState(true);
  const [validation, setValidation] = useState(null);
  const [exampleOpen, setExampleOpen] = useState(false);
  const [exampleContent, setExampleContent] = useState("");
  const [exampleLoading, setExampleLoading] = useState(false);
  const [exampleError, setExampleError] = useState(null);

  const loadExample = useCallback(async () => {
    if (exampleContent) return exampleContent;
    setExampleLoading(true);
    setExampleError(null);
    try {
      try {
        const data = await fetchConventionsExample();
        const content = String(data?.content || "").trim();
        if (content) {
          setExampleContent(content);
          return content;
        }
      } catch {
        /* fall through to static fallback */
      }

      try {
        const res = await fetch("/conventions.example.md");
        if (res.ok) {
          const content = (await res.text()).trim();
          if (content) {
            setExampleContent(content);
            return content;
          }
        }
      } catch {
        /* ignore */
      }

      setExampleError("Could not load example template. Restart the backend or contact support.");
      setExampleContent("");
      return "";
    } finally {
      setExampleLoading(false);
    }
  }, [exampleContent]);

  const load = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await validateProjectConventions(projectId);
      setValidation(data);
    } catch {
      setValidation({ ok: false, exists: false, errors: ["Could not validate conventions"] });
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (isSettings) {
      void loadExample();
    }
  }, [isSettings, loadExample]);

  const openExample = async () => {
    setExampleOpen(true);
    await loadExample();
  };

  const handleCopyExample = async () => {
    const content = exampleContent || (await loadExample());
    if (!content?.trim()) {
      toast.error(exampleError || "Example template is not available yet");
      return;
    }
    const ok = await copyText(content);
    if (ok) {
      toast.success(`Copied — save as ${CONVENTIONS_PATH} in your development repo`);
    } else {
      toast.error("Could not copy to clipboard");
    }
  };

  const examplePreview = (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{EXAMPLE_PATH}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="gap-2"
            disabled={exampleLoading}
            onClick={() => void handleCopyExample()}
          >
            {exampleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            Copy example
          </Button>
          {!isSettings ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => void openExample()}
            >
              <FileText className="h-4 w-4" />
              Open full view
            </Button>
          ) : null}
        </div>
      </div>
      {exampleLoading && !exampleContent ? (
        <ExampleTemplateSkeleton className="rounded-md border bg-muted/40 px-4 py-4" />
      ) : exampleError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {exampleError}
        </p>
      ) : (
        <pre className="max-h-96 overflow-auto rounded-md border bg-muted p-4 text-xs leading-relaxed whitespace-pre-wrap">
          {exampleContent}
        </pre>
      )}
    </div>
  );

  const statusBadge = () => {
    if (loading) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Checking
        </Badge>
      );
    }
    if (validation?.ok && validation?.exists) {
      return (
        <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600">
          <CheckCircle2 className="h-3 w-3" />
          Configured
        </Badge>
      );
    }
    if (validation?.ok && !validation?.exists) {
      return (
        <Badge variant="secondary" className="gap-1">
          Not configured
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="h-3 w-3" />
        Issues found
      </Badge>
    );
  };

  return (
    <>
      <Card className={cn(className)}>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base">Engineering standards (optional)</CardTitle>
            <CardDescription>
              Optionally add <code className="text-xs">{CONVENTIONS_PATH}</code> to a connected
              development repository. When present, LaunchPad agents read it first — it overrides
              platform defaults for tech stack, folder structure, design system, and which Cursor
              rules/skills to follow.
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {statusBadge()}
            <Button type="button" variant="outline" size="icon" onClick={() => void load()}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {isSettings ? (
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <p className="font-medium text-foreground">Recommended setup</p>
              <ol className="mt-2 list-decimal space-y-2 pl-5 text-muted-foreground">
                <li>
                  In your <strong className="font-medium text-foreground">development repo</strong>{" "}
                  (linked below), you may add <code className="text-xs">{CONVENTIONS_PATH}</code>.
                </li>
                <li>
                  Start from the example <code className="text-xs">{EXAMPLE_PATH}</code> below —
                  copy the template, save as <code className="text-xs">{CONVENTIONS_PATH}</code>,
                  then customize.
                </li>
                <li>
                  Document tech stack, folder paths, design system, and links to your existing{" "}
                  <code className="text-xs">.cursor/rules</code> and{" "}
                  <code className="text-xs">.cursor/skills</code> files.
                </li>
                <li>Commit and push. Use Refresh above to verify LaunchPad can read the file.</li>
              </ol>
              <p className="mt-3 text-xs text-muted-foreground">
                This file is optional. Without it, agents still run using detected stack signals and
                platform defaults.
              </p>
            </div>
          ) : null}

          {!loading && validation && (
            <>
              {validation.repoPath ? (
                <p className="text-muted-foreground">
                  Checking repo: <span className="font-mono text-xs">{validation.repoPath}</span>
                  {validation.ref ? ` @ ${validation.ref}` : ""}
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Connect a development repository below. You can optionally add{" "}
                  <code className="text-xs">{CONVENTIONS_PATH}</code> in that repo.
                </p>
              )}
              {Array.isArray(validation.errors) && validation.errors.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5 text-destructive">
                  {validation.errors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              ) : null}
              {Array.isArray(validation.warnings) && validation.warnings.length > 0 ? (
                <ul
                  className={cn(
                    "list-disc space-y-1 pl-5",
                    validation.exists
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-muted-foreground",
                  )}
                >
                  {validation.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              ) : null}
              {validation.ok && validation.exists ? (
                <p className="text-muted-foreground">
                  Conventions file is present and referenced Cursor paths look good.
                </p>
              ) : null}
            </>
          )}

          {isSettings ? (
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">
                Copy the template below into your development repo as{" "}
                <code className="text-xs">{CONVENTIONS_PATH}</code>, customize it, then commit and
                push.
              </p>
              <div className="mt-4">{examplePreview}</div>
            </div>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-2"
              onClick={() => void openExample()}
            >
              <FileText className="h-4 w-4" />
              View example template
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={exampleOpen} onOpenChange={setExampleOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{EXAMPLE_PATH}</DialogTitle>
            <DialogDescription>
              Copy this into your development repository as <code>{CONVENTIONS_PATH}</code>, then
              customize tech stack, folders, and Cursor paths. Commit and push so agents on App
              repositories use your standards.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="gap-2"
              onClick={() => void handleCopyExample()}
            >
              <Copy className="h-4 w-4" />
              Copy to clipboard
            </Button>
          </div>
          {exampleLoading ? (
            <ExampleTemplateSkeleton className="rounded-md bg-muted p-4" />
          ) : (
            <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs leading-relaxed">
              {exampleContent}
            </pre>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
