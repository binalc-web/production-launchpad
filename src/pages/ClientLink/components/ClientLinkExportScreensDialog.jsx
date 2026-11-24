import { useEffect, useMemo, useState } from "react";
import { Download, Figma, Loader2, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { isAuthBrowsePath, parsePreviewUrlInput } from "@/lib/clientLinkEmbeddedPreviewSrc";
import {
  PREVIEW_SCREEN_EXPORT_MAX,
  defaultPreviewScreenName,
  previewScreenRouteKey,
} from "@/lib/previewFullPageScreenshot.util";

const VIEWPORT_LABELS = { desktop: "Desktop", tablet: "Tablet", mobile: "Mobile" };

/**
 * Pick several preview screens (or all of them) and export each full-length as PNG / ZIP
 * or to the LaunchPad Figma plugin.
 */
export function ClientLinkExportScreensDialog({
  open,
  onOpenChange,
  candidates,
  currentRoute,
  scanning,
  onRescan,
  viewport,
  canSendToFigma,
  progress,
  onStart,
  onStop,
}) {
  const [selected, setSelected] = useState(() => new Set());
  const [extraRoutes, setExtraRoutes] = useState([]);
  const [routeInput, setRouteInput] = useState("");
  const [routeError, setRouteError] = useState("");
  const running = Boolean(progress);
  const currentKey = previewScreenRouteKey(currentRoute);

  useEffect(() => {
    if (!open) return;
    setSelected(new Set(currentKey ? [currentKey] : []));
    setExtraRoutes([]);
    setRouteInput("");
    setRouteError("");
  }, [open, currentKey]);

  const routes = useMemo(() => {
    const known = new Set(candidates);
    return [...candidates, ...extraRoutes.filter((r) => !known.has(r))];
  }, [candidates, extraRoutes]);

  const selectedRoutes = routes.filter((r) => selected.has(r));
  const allSelected = routes.length > 0 && selectedRoutes.length === routes.length;
  const tooMany = selectedRoutes.length > PREVIEW_SCREEN_EXPORT_MAX;
  const canStart = selectedRoutes.length > 0 && !tooMany && !running;

  const toggle = (route, checked) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(route);
      else next.delete(route);
      return next;
    });
  };

  const addRoute = () => {
    const key = previewScreenRouteKey(parsePreviewUrlInput(routeInput));
    if (!key) {
      setRouteError("Enter a path like /settings/billing");
      return;
    }
    if (isAuthBrowsePath(key)) {
      setRouteError("Sign-in pages can't be exported");
      return;
    }
    if (!routes.includes(key)) setExtraRoutes((prev) => [...prev, key]);
    toggle(key, true);
    setRouteInput("");
    setRouteError("");
  };

  const start = (mode) => {
    if (canStart) onStart({ routes: selectedRoutes, mode });
  };

  const viewportLabel = VIEWPORT_LABELS[viewport] || "current";
  const count = selectedRoutes.length;

  return (
    <Dialog open={open} onOpenChange={running ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Export screens</DialogTitle>
          <DialogDescription>
            Each selected screen is opened in the preview and captured full-length at the{" "}
            {viewportLabel} width. Keep this tab open until it finishes.
          </DialogDescription>
        </DialogHeader>

        {running ? (
          <div className="space-y-3 py-2" aria-live="polite">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Loader2 className="size-4 animate-spin" />
              Capturing {progress.index + 1} of {progress.total}
              {progress.mode === "figma" ? " for Figma" : ""}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.round((progress.index / progress.total) * 100)}%` }}
              />
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {defaultPreviewScreenName(progress.route)}{" "}
              <span className="font-mono text-xs">{progress.route}</span>
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={allSelected}
                  disabled={!routes.length}
                  onCheckedChange={(checked) => setSelected(new Set(checked ? routes : []))}
                />
                Select all ({routes.length})
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={scanning}
                onClick={onRescan}
              >
                {scanning ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Rescan
              </Button>
            </div>

            <ul className="max-h-72 divide-y overflow-y-auto rounded-md border">
              {routes.length ? (
                routes.map((route) => (
                  <li key={route}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/50">
                      <Checkbox
                        checked={selected.has(route)}
                        onCheckedChange={(checked) => toggle(route, checked === true)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">
                          {defaultPreviewScreenName(route)}
                        </span>
                        <span className="block truncate font-mono text-xs text-muted-foreground">
                          {route}
                        </span>
                      </span>
                      {route === currentKey ? (
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          Current
                        </span>
                      ) : null}
                    </label>
                  </li>
                ))
              ) : (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {scanning ? "Looking for screens…" : "No screens found yet. Add a path below."}
                </li>
              )}
            </ul>

            <div className="space-y-1">
              <div className="flex gap-2">
                <Input
                  value={routeInput}
                  placeholder="/settings/billing"
                  aria-label="Add a screen by path"
                  onChange={(e) => {
                    setRouteInput(e.target.value);
                    setRouteError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addRoute();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addRoute}
                  disabled={!routeInput.trim()}
                >
                  <Plus className="size-4" />
                  Add
                </Button>
              </div>
              <p
                className={
                  routeError ? "text-xs text-destructive" : "text-xs text-muted-foreground"
                }
              >
                {routeError ||
                  (tooMany
                    ? `Select up to ${PREVIEW_SCREEN_EXPORT_MAX} screens at a time.`
                    : "Screens come from links on the current page and pages you've opened. Add any that are missing.")}
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {running ? (
            <Button type="button" variant="outline" className="sm:ml-auto" onClick={onStop}>
              Stop
            </Button>
          ) : (
            <>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant={canSendToFigma ? "outline" : "default"}
                  disabled={!canStart}
                  onClick={() => start("download")}
                >
                  <Download className="size-4" />
                  {count > 1 ? `Download ZIP (${count})` : "Download PNG"}
                </Button>
                {canSendToFigma ? (
                  <Button type="button" disabled={!canStart} onClick={() => start("figma")}>
                    <Figma className="size-4" />
                    {count > 1 ? `Send ${count} to Figma` : "Send to Figma"}
                  </Button>
                ) : null}
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
