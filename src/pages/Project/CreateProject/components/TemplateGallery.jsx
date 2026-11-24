import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Eye, LayoutTemplate, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { fetchDesignTemplateCatalog, fetchDesignTemplatePreview } from "@/api";

/** Session cache of rendered example.html keyed by template folder name. */
const previewCache = new Map();

/** Fetch a template's preview HTML once per session. */
async function loadPreviewHtml(folderName) {
  if (previewCache.has(folderName)) return previewCache.get(folderName);
  const data = await fetchDesignTemplatePreview(folderName);
  const html = typeof data?.html === "string" ? data.html : "";
  previewCache.set(folderName, html);
  return html;
}

function TemplateGridSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-busy="true"
      aria-label="Loading templates"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-border">
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Scaled, non-interactive live thumbnail of a template's example.html. */
function TemplateThumbnail({ folderName }) {
  const [html, setHtml] = useState(() => previewCache.get(folderName) ?? null);
  const [loading, setLoading] = useState(() => !previewCache.has(folderName));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    if (previewCache.has(folderName)) {
      setHtml(previewCache.get(folderName));
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    loadPreviewHtml(folderName)
      .then((value) => {
        if (!active) return;
        setHtml(value);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setFailed(true);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [folderName]);

  if (loading) {
    return (
      <Skeleton
        className="h-full w-full rounded-none"
        role="status"
        aria-busy="true"
        aria-label="Loading template preview"
      />
    );
  }
  if (failed || !html) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted/40">
        <LayoutTemplate className="size-6 text-muted-foreground/50" aria-hidden />
      </div>
    );
  }
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <iframe
        title={`${folderName} preview`}
        srcDoc={html}
        sandbox="allow-scripts allow-same-origin"
        loading="lazy"
        tabIndex={-1}
        aria-hidden
        className="absolute left-0 top-0 h-[1000px] w-[1400px] origin-top-left border-0"
        style={{ transform: "scale(0.26)" }}
      />
    </div>
  );
}

/** Full-size sandboxed preview inside a dialog, with prev/next navigation. */
function TemplatePreviewDialog({
  template,
  onClose,
  onUse,
  isSelected,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  position,
  total,
}) {
  const [html, setHtml] = useState(() =>
    template ? (previewCache.get(template.folderName) ?? null) : null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!template) return undefined;
    let active = true;
    const cached = previewCache.get(template.folderName);
    if (cached != null) {
      setHtml(cached);
      setLoading(false);
      return undefined;
    }
    setHtml(null);
    setLoading(true);
    loadPreviewHtml(template.folderName)
      .then((value) => {
        if (!active) return;
        setHtml(value);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [template]);

  return (
    <Dialog open={Boolean(template)} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent
        className="gap-0 overflow-hidden p-0 sm:max-w-none"
        style={{
          display: "flex",
          flexDirection: "column",
          width: "96vw",
          maxWidth: "1600px",
          height: "92vh",
        }}
      >
        <DialogHeader className="shrink-0 border-b px-5 py-4 pr-14 text-left">
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="size-4 text-primary" aria-hidden />
            {template?.title}
            {total > 1 ? (
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                {position} / {total}
              </span>
            ) : null}
          </DialogTitle>
          {template?.description ? (
            <DialogDescription className="line-clamp-2">{template.description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="relative w-full bg-muted/30" style={{ flex: "1 1 auto", minHeight: 0 }}>
          {loading ? (
            <Skeleton
              className="h-full w-full rounded-none"
              role="status"
              aria-busy="true"
              aria-label="Loading template preview"
            />
          ) : (
            <iframe
              key={template?.folderName}
              title={`${template?.title} full preview`}
              srcDoc={
                html || "<p style='font-family:sans-serif;padding:24px'>No preview available.</p>"
              }
              sandbox="allow-scripts allow-same-origin"
              className="h-full w-full border-0 bg-white"
            />
          )}
          {hasPrev ? (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute left-3 top-1/2 size-10 -translate-y-1/2 rounded-full shadow-md"
              onClick={onPrev}
              aria-label="Previous template"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </Button>
          ) : null}
          {hasNext ? (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute right-3 top-1/2 size-10 -translate-y-1/2 rounded-full shadow-md"
              onClick={onNext}
              aria-label="Next template"
            >
              <ChevronRight className="size-5" aria-hidden />
            </Button>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center justify-between gap-2 border-t px-5 py-3">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={!hasPrev}
              onClick={onPrev}
            >
              <ChevronLeft className="size-4" aria-hidden />
              Prev
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={!hasNext}
              onClick={onNext}
            >
              Next
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button
              type="button"
              variant={isSelected ? "secondary" : "default"}
              className="gap-2"
              onClick={() => {
                onUse(template);
                onClose();
              }}
            >
              {isSelected ? (
                <>
                  <Check className="size-4" aria-hidden />
                  Selected
                </>
              ) : (
                <>
                  <Sparkles className="size-4" aria-hidden />
                  Use this template
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Onboarding template gallery for the "from scratch" flow. Selecting a template is
 * optional; it feeds the chosen template pack into the scratch agent alongside the prompt.
 */
export function TemplateGallery({ selectedFolder, onSelect }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [open, setOpen] = useState(false);
  const loadedRef = useRef(false);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchDesignTemplateCatalog();
      const cats = Array.isArray(data?.categories) ? data.categories : [];
      setCategories(cats);
      setActiveCategory((prev) => prev || cats[0]?.id || "");
    } catch (err) {
      setError(err?.error || "Failed to load templates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || loadedRef.current) return;
    loadedRef.current = true;
    void loadCatalog();
  }, [open, loadCatalog]);

  const selectedTitle = (() => {
    for (const cat of categories) {
      const found = cat.templates?.find((t) => t.folderName === selectedFolder);
      if (found) return found.title;
    }
    return null;
  })();

  // Flat list of previewable templates in the active category for in-dialog nav.
  const previewList = useMemo(() => {
    const cat = categories.find((c) => c.id === activeCategory);
    return (cat?.templates || []).filter((t) => t.hasPreview);
  }, [categories, activeCategory]);

  const previewIndex = previewTemplate
    ? previewList.findIndex((t) => t.folderName === previewTemplate.folderName)
    : -1;

  const goToPreview = useCallback(
    (delta) => {
      setPreviewTemplate((current) => {
        if (!current) return current;
        const idx = previewList.findIndex((t) => t.folderName === current.folderName);
        const next = previewList[idx + delta];
        return next || current;
      });
    },
    [previewList],
  );

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="overflow-hidden rounded-xl border border-primary/15 bg-linear-to-br from-primary/5 via-background to-muted/30"
    >
      <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <LayoutTemplate className="size-4" aria-hidden />
          </span>
          <div>
            <span className="block text-sm font-semibold text-foreground">
              Start from a template (optional)
            </span>
            <span className="block text-xs text-muted-foreground">
              Pick a curated design template to guide the first version.
            </span>
          </div>
        </div>
        {selectedTitle ? (
          <Badge variant="secondary" className="gap-1 font-normal">
            <Check className="size-3" aria-hidden />
            {selectedTitle}
          </Badge>
        ) : null}
      </CollapsibleTrigger>

      <CollapsibleContent className="border-t border-primary/15 px-5 py-5">
        {loading ? (
          <TemplateGridSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadCatalog()}>
              Retry
            </Button>
          </div>
        ) : categories.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No templates available yet.
          </p>
        ) : (
          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
            <TabsList className="mb-4 flex h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
              {categories.map((cat) => (
                <TabsTrigger
                  key={cat.id}
                  value={cat.id}
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs data-[state=active]:border-primary/60 data-[state=active]:bg-primary/10 data-[state=active]:text-foreground"
                >
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map((cat) => (
              <TabsContent key={cat.id} value={cat.id} className="mt-0">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {cat.templates.map((template) => {
                    const isSelected = template.folderName === selectedFolder;
                    return (
                      <Card
                        key={template.folderName}
                        className={cn(
                          "group gap-0 overflow-hidden py-0 transition-all duration-200 hover:shadow-md",
                          isSelected
                            ? "border-primary ring-2 ring-primary/40"
                            : "border-border hover:border-primary/40",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => onSelect(isSelected ? null : template)}
                          className="relative block aspect-video w-full overflow-hidden border-b border-border bg-muted/30 text-left"
                          aria-label={`Select ${template.title} template`}
                        >
                          {template.hasPreview ? (
                            <TemplateThumbnail folderName={template.folderName} />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <LayoutTemplate
                                className="size-6 text-muted-foreground/50"
                                aria-hidden
                              />
                            </div>
                          )}
                          {isSelected ? (
                            <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                              <Check className="size-3.5" aria-hidden />
                            </span>
                          ) : null}
                        </button>
                        <CardHeader className="gap-1 px-4 pt-3">
                          <CardTitle className="text-sm">{template.title}</CardTitle>
                          {template.description ? (
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {template.description}
                            </p>
                          ) : null}
                        </CardHeader>
                        <CardFooter className="gap-2 px-4 pb-4 pt-3">
                          <Button
                            type="button"
                            size="sm"
                            variant={isSelected ? "secondary" : "default"}
                            className="h-8 flex-1 gap-1.5"
                            onClick={() => onSelect(isSelected ? null : template)}
                          >
                            {isSelected ? (
                              <>
                                <Check className="size-3.5" aria-hidden />
                                Selected
                              </>
                            ) : (
                              "Use template"
                            )}
                          </Button>
                          {template.hasPreview ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1.5"
                              onClick={() => setPreviewTemplate(template)}
                            >
                              <Eye className="size-3.5" aria-hidden />
                              Preview
                            </Button>
                          ) : null}
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CollapsibleContent>

      <TemplatePreviewDialog
        template={previewTemplate}
        isSelected={previewTemplate?.folderName === selectedFolder}
        onClose={() => setPreviewTemplate(null)}
        onUse={onSelect}
        onPrev={() => goToPreview(-1)}
        onNext={() => goToPreview(1)}
        hasPrev={previewIndex > 0}
        hasNext={previewIndex >= 0 && previewIndex < previewList.length - 1}
        position={previewIndex + 1}
        total={previewList.length}
      />
    </Collapsible>
  );
}
