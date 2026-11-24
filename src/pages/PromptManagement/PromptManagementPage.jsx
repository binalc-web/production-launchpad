import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { FolderOpen, Plus } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { PageShell } from "@/components/common/PageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { fetchManagedPrompts, fetchManagedPromptById } from "@/api";
import { PromptEditorDialog } from "./PromptEditorDialog";
import { PromptPreviewDialog } from "./PromptPreviewDialog";
import { PromptCard } from "./components/PromptCard";
import { PromptManagementToolbar } from "./components/PromptManagementToolbar";
import { getCategoryLabel, ORDERED_CATEGORY_SLUGS } from "./managedPromptUiLabels";
import { isLaunchpadAdmin } from "@/utils/launchpadRole";
import { usePageUiPreferences } from "@/hooks/usePageUiPreferences";
import { LIST_GRID_CLASS_THREE_COL } from "@/constants/responsiveLayout";

const PAGE_SIZE = 10;

const PROMPT_MANAGEMENT_UI_SCHEMA = {
  page: { defaultValue: 1, type: "number", min: 1 },
  search: { defaultValue: "", type: "string" },
  category: {
    defaultValue: "__all",
    allowed: ["__all", ...ORDERED_CATEGORY_SLUGS],
  },
};

const CATEGORY_FILTER_OPTIONS = [
  { value: "__all", slug: null },
  ...ORDERED_CATEGORY_SLUGS.map((slug) => ({ value: slug, slug })),
];

function PromptCardsSkeleton({ count = 6 }) {
  return (
    <ul className={LIST_GRID_CLASS_THREE_COL}>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="min-w-0 space-y-3 rounded-xl border border-border bg-card p-4">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-8 w-24" />
        </li>
      ))}
    </ul>
  );
}

function PromptGridSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-busy="true" aria-label="Loading prompts">
      <div className="space-y-1">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <PromptCardsSkeleton />
    </div>
  );
}

function PromptManagementPageSkeleton() {
  return (
    <PageShell width="full" className="space-y-0 pb-8">
      <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading account">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-48" />
        </div>
        <PromptCardsSkeleton />
      </div>
    </PageShell>
  );
}

export default function PromptManagementPage() {
  const { user, loading: authBootLoading, launchpadRoleLoading, checkAuth } = useAuth();
  const canAccess = isLaunchpadAdmin(user?.role);
  const isAdmin = canAccess;

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [prefs, setPref] = usePageUiPreferences("global", PROMPT_MANAGEMENT_UI_SCHEMA, {
    debouncedKeys: ["search"],
  });
  const page = prefs.page;
  const search = prefs.search;
  const category = prefs.category;
  const setPage = useCallback((value) => setPref("page", value), [setPref]);
  const setSearch = useCallback((value) => setPref("search", value), [setPref]);
  const setCategory = useCallback((value) => setPref("category", value), [setPref]);
  const [debouncedSearch, setDebouncedSearch] = useState(() => String(prefs.search ?? ""));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRow, setPreviewRow] = useState(null);

  const load = useCallback(async () => {
    if (!canAccess) return;
    setError(null);
    setLoading(true);
    try {
      const params = {
        page,
        limit: PAGE_SIZE,
        ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
        ...(category !== "__all" ? { category } : {}),
      };
      const data = await fetchManagedPrompts(params);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      setItems([]);
      setTotal(0);
      setError(typeof e?.error === "string" ? e.error : "Failed to load prompts");
    } finally {
      setLoading(false);
    }
  }, [canAccess, page, debouncedSearch, category]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const handleSearchChange = useCallback(
    (value) => {
      setSearch(value);
      setPage(1);
    },
    [setSearch, setPage],
  );

  const handleCategoryChange = useCallback(
    (value) => {
      setCategory(value);
      setPage(1);
    },
    [setCategory, setPage],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user || user.role || authBootLoading || launchpadRoleLoading) return;
    void checkAuth();
  }, [user, authBootLoading, launchpadRoleLoading, checkAuth]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = total === 0 ? 0 : (page - 1) * PAGE_SIZE + items.length;

  const grouped = useMemo(() => {
    const buckets = new Map();
    for (const row of items) {
      const c = String(row.category ?? "unknown").trim();
      if (!buckets.has(c)) buckets.set(c, []);
      buckets.get(c).push(row);
    }
    for (const [, list] of buckets) {
      list.sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || ""), undefined, {
          sensitivity: "base",
        }),
      );
    }
    const extraSlugs = [...buckets.keys()]
      .filter((k) => !ORDERED_CATEGORY_SLUGS.includes(k))
      .sort((a, b) => getCategoryLabel(a).title.localeCompare(getCategoryLabel(b).title));

    const order = [...ORDERED_CATEGORY_SLUGS, ...extraSlugs];
    return order
      .filter((slug) => buckets.has(slug))
      .map((slug) => ({
        slug,
        label: getCategoryLabel(slug),
        rows: buckets.get(slug),
      }));
  }, [items]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if ((!user?.role && (launchpadRoleLoading || authBootLoading)) || authBootLoading) {
    return <PromptManagementPageSkeleton />;
  }
  if (!user?.role) {
    return <PromptManagementPageSkeleton />;
  }
  if (!canAccess) {
    return <Navigate to="/projects" replace />;
  }

  const openEdit = async (row) => {
    try {
      setCreatingNew(false);
      const full = await fetchManagedPromptById(row.id);
      setEditingRow(full || row);
      setEditorOpen(true);
    } catch (e) {
      toast.error(typeof e?.error === "string" ? e.error : "Failed to load prompt");
    }
  };

  const openCreate = () => {
    setCreatingNew(true);
    setEditingRow(null);
    setEditorOpen(true);
  };

  const openFullPreview = (row) => {
    setPreviewRow(row);
    setPreviewOpen(true);
  };

  return (
    <PageShell width="full" className="space-y-0 pb-8">
      <PageHeader
        compact
        title="Prompt management"
        description="Review and edit the AI prompts that power Cursor agents, chat, releases, jobs, Figma IR, and more. Saves apply immediately everywhere the prompt is used."
      >
        <Button type="button" className="gap-2" onClick={openCreate}>
          <Plus className="size-4 shrink-0" aria-hidden />
          Add prompt
        </Button>
      </PageHeader>

      <PromptManagementToolbar
        search={search}
        onSearchChange={handleSearchChange}
        category={category}
        onCategoryChange={handleCategoryChange}
        categoryOptions={CATEGORY_FILTER_OPTIONS}
        total={total}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        page={page}
        totalPages={totalPages}
      />

      <div className="mt-4">
        {loading ? (
          <PromptGridSkeleton />
        ) : error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : grouped.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center"
            aria-live="polite"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <FolderOpen className="h-6 w-6" aria-hidden />
            </div>
            <p className="text-base font-medium text-foreground">No prompts found</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Try another search or category — or create a new prompt.
            </p>
            <Button type="button" className="mt-6 gap-2" onClick={openCreate}>
              <Plus className="size-4 shrink-0" aria-hidden />
              Add prompt
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map((group) => (
              <section key={group.slug} className="space-y-4">
                <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold tracking-tight text-foreground">
                        {group.label.title}
                      </h2>
                      <Badge variant="outline" className="font-normal text-muted-foreground">
                        {group.rows.length} prompt{group.rows.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{group.label.summary}</p>
                  </div>
                </div>
                <ul className={LIST_GRID_CLASS_THREE_COL}>
                  {group.rows.map((row) => (
                    <li key={row.id} className="min-w-0">
                      <PromptCard row={row} onEdit={openEdit} onOpenFullPreview={openFullPreview} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        {!loading && !error && total > 0 && totalPages > 1 ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <PromptEditorDialog
        open={editorOpen && (creatingNew || Boolean(editingRow))}
        onOpenChange={(next) => {
          setEditorOpen(next);
          if (!next) {
            setEditingRow(null);
            setCreatingNew(false);
          }
        }}
        canEdit={isAdmin}
        row={editingRow}
        isCreate={creatingNew}
        onSaved={load}
      />

      <PromptPreviewDialog
        open={previewOpen && Boolean(previewRow)}
        onOpenChange={(next) => {
          setPreviewOpen(next);
          if (!next) setPreviewRow(null);
        }}
        row={previewRow}
      />
    </PageShell>
  );
}
