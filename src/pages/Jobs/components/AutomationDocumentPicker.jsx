import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { fetchProjectAutomationDocuments } from "@/api";

function docTargetKey(projectId, documentId) {
  return `${projectId}:${documentId}`;
}

/**
 * @param {{
 *   repoTargets: Array<{ projectId: number }>,
 *   projects: Array<{ id: number, name: string }>,
 *   documentTargets: Array<{ projectId: number, documentId: string, documentName?: string }>,
 *   onChange: (next: Array<{ projectId: number, documentId: string, documentName?: string }>) => void,
 *   error?: string,
 * }} props
 */
export function AutomationDocumentPicker({
  repoTargets,
  projects,
  documentTargets,
  onChange,
  error,
}) {
  const [docsByProject, setDocsByProject] = useState({});
  const [loading, setLoading] = useState({});

  const projectIds = useMemo(() => {
    const ids = new Set((repoTargets ?? []).map((t) => Number(t.projectId)).filter((id) => id > 0));
    return [...ids];
  }, [repoTargets]);

  const projectNameById = useMemo(() => {
    const map = new Map();
    for (const p of projects ?? []) {
      map.set(Number(p.id), p.name);
    }
    return map;
  }, [projects]);

  const loadDocs = useCallback(async (projectId) => {
    setLoading((prev) => ({ ...prev, [projectId]: true }));
    try {
      const res = await fetchProjectAutomationDocuments(projectId);
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setDocsByProject((prev) => ({ ...prev, [projectId]: list }));
    } catch {
      setDocsByProject((prev) => ({ ...prev, [projectId]: [] }));
    } finally {
      setLoading((prev) => ({ ...prev, [projectId]: false }));
    }
  }, []);

  useEffect(() => {
    for (const pid of projectIds) {
      if (!docsByProject[pid] && !loading[pid]) {
        loadDocs(pid);
      }
    }
  }, [projectIds, docsByProject, loading, loadDocs]);

  const toggleDoc = (projectId, doc, checked) => {
    const pid = Number(projectId);
    const documentId = String(doc.id ?? "").trim();
    const key = docTargetKey(pid, documentId);
    if (!checked) {
      onChange(
        (documentTargets ?? []).filter((t) => docTargetKey(t.projectId, t.documentId) !== key),
      );
      return;
    }
    onChange([
      ...(documentTargets ?? []).filter((t) => docTargetKey(t.projectId, t.documentId) !== key),
      {
        projectId: pid,
        documentId,
        documentName: String(doc.name ?? "").trim() || "Untitled",
      },
    ]);
  };

  if (!projectIds.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Select at least one repository target to choose Discovery documents to update.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Optional: after each run, the same report sent by email updates selected Discovery documents
        incrementally (sections only, with revision history).
      </p>
      <div className="space-y-3 rounded-lg border border-border divide-y divide-border">
        {projectIds.map((pid) => {
          const docs = docsByProject[pid] ?? [];
          const isLoading = loading[pid];
          const projectName = projectNameById.get(pid) || `Project ${pid}`;

          return (
            <div key={pid} className="px-3 py-2">
              <p className="text-sm font-medium text-foreground">{projectName}</p>
              <div className="ml-1 mt-2 space-y-2">
                {isLoading ? (
                  <div
                    className="space-y-2"
                    role="status"
                    aria-busy="true"
                    aria-label="Loading documents"
                  >
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full rounded-md" />
                    ))}
                  </div>
                ) : docs.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No workspace documents in Discovery.
                  </p>
                ) : (
                  docs.map((doc) => {
                    const documentId = String(doc.id ?? "").trim();
                    const key = docTargetKey(pid, documentId);
                    const selected = (documentTargets ?? []).some(
                      (t) => docTargetKey(t.projectId, t.documentId) === key,
                    );
                    return (
                      <div
                        key={key}
                        className={cn(
                          "flex items-start gap-2 rounded-md border border-border/60 p-2.5",
                          selected && "border-primary/30 bg-primary/5",
                        )}
                      >
                        <Checkbox
                          id={`doc-target-${key}`}
                          checked={selected}
                          onCheckedChange={(c) => toggleDoc(pid, doc, c === true)}
                        />
                        <label
                          htmlFor={`doc-target-${key}`}
                          className="cursor-pointer flex-1 text-xs"
                        >
                          <span className="flex items-center gap-1.5 font-medium text-foreground">
                            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            {doc.name || "Untitled"}
                          </span>
                          {doc.updatedAt ? (
                            <span className="mt-0.5 block text-muted-foreground">
                              Updated {new Date(doc.updatedAt).toLocaleString()}
                            </span>
                          ) : null}
                        </label>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {(documentTargets ?? []).length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {(documentTargets ?? []).length} document
          {(documentTargets ?? []).length === 1 ? "" : "s"} selected for post-run updates.
        </p>
      ) : null}
    </div>
  );
}
