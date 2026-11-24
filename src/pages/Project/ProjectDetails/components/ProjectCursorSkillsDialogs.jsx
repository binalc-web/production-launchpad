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
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Eye, Library, PenLine } from "lucide-react";
import { useMemo } from "react";

function SkillPackListSkeleton({ label }) {
  return (
    <div className="space-y-1" role="status" aria-busy="true" aria-label={label}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-start gap-2 px-2 py-1.5">
          <Skeleton className="mt-0.5 size-4 rounded-sm" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SavedSkillsListSkeleton() {
  return (
    <div className="space-y-2" role="status" aria-busy="true" aria-label="Loading custom skills">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-1.5 rounded-md border border-slate-200 bg-white p-2.5">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

/**
 * Add Cursor Skills dialogs — workspace catalog import and custom skill editor.
 * Render with state/handlers from useProjectCursorSkills.
 */
export function ProjectCursorSkillsDialogs({
  cursorSkills,
  hasDeveloperRepo,
  purpose = "import",
  idPrefix = "cursor-skills",
}) {
  const isSelectMode = purpose === "select";
  const {
    cursorSkillsOpen,
    cursorSkillsLoading,
    cursorSkillsSearch,
    setCursorSkillsSearch,
    selectedCursorFolders,
    selectedHubSkillIds,
    totalSelectedCount,
    hasHubSession,
    hubSkills,
    filteredHubSkills,
    toggleHubSkill,
    cursorSkillsImporting,
    customSkillFolderName,
    setCustomSkillFolderName,
    customSkillBody,
    setCustomSkillBody,
    customSkillSaving,
    cursorSkillsMainStep,
    setCursorSkillsMainStep,
    cursorSkillsCreateOwnOpen,
    setCursorSkillsCreateOwnOpen,
    customSkillsSavedList,
    customSkillsSavedLoading,
    editingCustomTitle,
    cursorSkillsFolders,
    filteredCursorFolders,
    toggleCursorFolder,
    handleImportCursorSkills,
    handleSaveCustomCursorSkill,
    startEditCustomSkill,
    startNewCustomSkill,
    handleMainDialogOpenChange,
    handleCreateOwnDialogOpenChange,
    skillPreviewFolderName,
    skillPreviewBody,
    openSkillPreview,
    closeSkillPreview,
  } = cursorSkills;

  const skillPreviewTitle = useMemo(() => {
    if (!skillPreviewFolderName) return "";
    const hub = hubSkills.find((skill) => skill.folderName === skillPreviewFolderName);
    if (hub?.title) return hub.title;
    const custom = customSkillsSavedList.find(
      (skill) => skill.folderName === skillPreviewFolderName,
    );
    return custom?.folderName ?? skillPreviewFolderName;
  }, [skillPreviewFolderName, hubSkills, customSkillsSavedList]);

  const showCatalog = isSelectMode || cursorSkillsMainStep === "catalog";

  return (
    <>
      <Dialog open={cursorSkillsOpen} onOpenChange={handleMainDialogOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[min(90vh,760px)] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
          aria-describedby="cursor-skills-dialog-desc"
        >
          <div className="border-b border-slate-200 bg-slate-50/90 px-5 py-4 sm:px-6">
            <DialogHeader className="gap-1.5 space-y-0 text-left">
              <DialogTitle className="text-lg font-semibold tracking-tight">
                {isSelectMode ? "Select Cursor Skills" : "Add Cursor Skills"}
              </DialogTitle>
              <DialogDescription
                id="cursor-skills-dialog-desc"
                className="text-sm leading-relaxed text-slate-600"
              >
                {isSelectMode ? (
                  <>Choose skill packs to include in this project&apos;s prompt configuration.</>
                ) : cursorSkillsMainStep === "choose" ? (
                  <>Choose how to add skills to your GitHub developer repository.</>
                ) : (
                  <>
                    Select packs, then click <span className="font-medium text-slate-800">Add</span>{" "}
                    to commit and push.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
            {!showCatalog ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setCursorSkillsMainStep("catalog")}
                  className="flex flex-col items-start gap-2 rounded-xl border-2 border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Library className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="text-sm font-semibold text-slate-900">Add from catalog</span>
                  <span className="text-xs leading-relaxed text-slate-500">
                    Browse Hub public skills and workspace custom packs, then push selected folders.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setCursorSkillsCreateOwnOpen(true)}
                  className="flex flex-col items-start gap-2 rounded-xl border-2 border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-800">
                    <PenLine className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="text-sm font-semibold text-slate-900">Create your own</span>
                  <span className="text-xs leading-relaxed text-slate-500">
                    Name a pack and write skill content; it is saved for the whole workspace
                    (visible in every project), then you can push from the catalog step.
                  </span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {!isSelectMode ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="-ml-2 h-8 px-2 text-slate-600"
                    onClick={() => setCursorSkillsMainStep("choose")}
                  >
                    ← Back to choices
                  </Button>
                ) : null}
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {isSelectMode ? "Choose skill packs" : "Choose packs to add"}
                    </p>
                    {isSelectMode ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setCursorSkillsCreateOwnOpen(true)}
                      >
                        <PenLine className="size-3.5" aria-hidden />
                        Create your own
                      </Button>
                    ) : null}
                  </div>
                  <Input
                    placeholder="Search packs…"
                    value={cursorSkillsSearch}
                    onChange={(e) => setCursorSkillsSearch(e.target.value)}
                    disabled={cursorSkillsLoading}
                    className="bg-white"
                  />

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Hub AI skills library
                    </p>
                    {!hasHubSession ? (
                      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-3 py-4 text-center text-xs leading-relaxed text-slate-500">
                        Sign in to Hub to browse public skills.
                      </p>
                    ) : (
                      <div className="max-h-[min(28vh,220px)] min-h-[120px] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/40 p-2">
                        {cursorSkillsLoading ? (
                          <SkillPackListSkeleton label="Loading Hub skills" />
                        ) : filteredHubSkills.length === 0 ? (
                          <p className="py-6 text-center text-sm text-slate-500">
                            {hubSkills.length === 0
                              ? "No public Hub skills available."
                              : "No Hub skills match your search."}
                          </p>
                        ) : (
                          <ul className="space-y-1">
                            {filteredHubSkills.map((skill) => (
                              <li
                                key={skill.id}
                                className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-white"
                              >
                                <Checkbox
                                  checked={selectedHubSkillIds.has(skill.id)}
                                  onCheckedChange={() => toggleHubSkill(skill.id)}
                                  className="mt-0.5"
                                  id={`${idPrefix}-hub-skill-pack-${skill.id}`}
                                />
                                <label
                                  htmlFor={`${idPrefix}-hub-skill-pack-${skill.id}`}
                                  className="min-w-0 flex-1 cursor-pointer leading-snug"
                                >
                                  <span className="block font-medium text-slate-800">
                                    {skill.title}
                                  </span>
                                  {skill.description ? (
                                    <span className="mt-0.5 block text-xs text-slate-500 line-clamp-2">
                                      {skill.description}
                                    </span>
                                  ) : null}
                                </label>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Workspace custom packs
                    </p>
                    <div className="max-h-[min(28vh,220px)] min-h-[120px] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/40 p-2">
                      {cursorSkillsLoading ? (
                        <SkillPackListSkeleton label="Loading custom packs" />
                      ) : filteredCursorFolders.length === 0 ? (
                        <p className="py-6 text-center text-sm text-slate-500">
                          {cursorSkillsFolders.length === 0
                            ? "No workspace custom packs yet."
                            : "No custom packs match your search."}
                        </p>
                      ) : (
                        <ul className="space-y-1">
                          {filteredCursorFolders.map((name) => (
                            <li
                              key={name}
                              className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-white"
                            >
                              <Checkbox
                                checked={selectedCursorFolders.has(name)}
                                onCheckedChange={() => toggleCursorFolder(name)}
                                className="mt-0.5"
                                id={`${idPrefix}-cursor-skill-pack-${name}`}
                              />
                              <label
                                htmlFor={`${idPrefix}-cursor-skill-pack-${name}`}
                                className="min-w-0 flex-1 cursor-pointer break-all leading-snug text-slate-800"
                              >
                                {name}
                              </label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 text-slate-600"
                                aria-label={`View content for ${name}`}
                                disabled={customSkillsSavedLoading}
                                onClick={(e) => {
                                  e.preventDefault();
                                  openSkillPreview(name);
                                }}
                              >
                                <Eye className="h-4 w-4" aria-hidden />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-500">
                    {totalSelectedCount} pack
                    {totalSelectedCount === 1 ? "" : "s"} selected
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter
            showCloseButton={false}
            className="flex-row flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50/50 px-5 py-4 sm:gap-2 sm:px-6 [&>button]:shrink-0"
          >
            {!cursorSkillsImporting ? (
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                onClick={() => handleMainDialogOpenChange(false)}
              >
                Cancel
              </Button>
            ) : null}
            {showCatalog ? (
              <Button
                type="button"
                className="shrink-0 text-white"
                onClick={handleImportCursorSkills}
                disabled={cursorSkillsImporting || cursorSkillsLoading}
              >
                {cursorSkillsImporting ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap">Importing…</span>
                  </>
                ) : isSelectMode ? (
                  "Apply"
                ) : (
                  "Add"
                )}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cursorSkillsCreateOwnOpen} onOpenChange={handleCreateOwnDialogOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[min(92vh,720px)] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
          aria-describedby="cursor-skills-create-desc"
        >
          <div className="border-b border-slate-200 bg-slate-50/90 px-5 py-4 sm:px-6">
            <DialogHeader className="gap-1.5 space-y-0 text-left">
              <DialogTitle className="text-lg font-semibold tracking-tight">
                Create your own skills
              </DialogTitle>
              <DialogDescription
                id="cursor-skills-create-desc"
                className="text-sm leading-relaxed text-slate-600"
              >
                Custom skills are shared across all projects on this workspace. The title becomes
                the directory name; content is saved as{" "}
                <code className="rounded bg-white px-1.5 py-0.5 text-xs ring-1 ring-slate-200/80">
                  SKILL.md
                </code>
                . Edit packs below or add a new one. Push to a repo from “Add from catalog” in the
                previous step.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Shared workspace skills
                  </p>
                  {(customSkillsSavedList.length > 0 || editingCustomTitle !== null) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={startNewCustomSkill}
                      disabled={customSkillSaving}
                    >
                      New skill
                    </Button>
                  )}
                </div>
                {customSkillsSavedLoading ? (
                  <SavedSkillsListSkeleton />
                ) : customSkillsSavedList.length === 0 ? (
                  <p className="py-2 text-sm text-slate-500">
                    No custom skills yet. Add a title and content below.
                  </p>
                ) : (
                  <ul className="max-h-[200px] space-y-2 overflow-y-auto pr-1">
                    {customSkillsSavedList.map((skill) => (
                      <li
                        key={skill.id}
                        className="rounded-md border border-slate-200 bg-white p-2.5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-mono text-sm font-medium text-slate-900">
                              {skill.folderName}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Updated{" "}
                              {skill.updatedAt
                                ? format(new Date(skill.updatedAt), "MMM d, yyyy h:mm a")
                                : "—"}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                              {(skill.body || "").replace(/\s+/g, " ").trim() || "(empty body)"}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="shrink-0 text-xs"
                            onClick={() => startEditCustomSkill(skill)}
                            disabled={customSkillSaving}
                          >
                            Edit
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="border-t border-slate-200 pt-2">
                <p className="mb-3 text-sm font-semibold text-slate-900">
                  {editingCustomTitle !== null ? `Edit “${editingCustomTitle}”` : "New skill"}
                </p>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label
                      htmlFor="cursor-custom-skill-title"
                      className="text-xs font-medium text-slate-700"
                    >
                      Title
                    </Label>
                    <Input
                      id="cursor-custom-skill-title"
                      placeholder="e.g. my-team-skill"
                      value={customSkillFolderName}
                      onChange={(e) => setCustomSkillFolderName(e.target.value)}
                      disabled={customSkillSaving || editingCustomTitle !== null}
                      autoComplete="off"
                      className="bg-white"
                    />
                    {editingCustomTitle !== null ? (
                      <p className="text-[11px] text-slate-500">
                        Title cannot be changed when editing; use “New skill” to add another pack.
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="cursor-custom-skill-body"
                      className="text-xs font-medium text-slate-700"
                    >
                      Skill content
                    </Label>
                    <Textarea
                      id="cursor-custom-skill-body"
                      placeholder="Markdown or Cursor skill content…"
                      value={customSkillBody}
                      onChange={(e) => setCustomSkillBody(e.target.value)}
                      disabled={customSkillSaving}
                      rows={8}
                      className="min-h-[160px] resize-y bg-white font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter
            showCloseButton={false}
            className="flex-row flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50/50 px-5 py-4 sm:gap-2 sm:px-6 [&>button]:shrink-0"
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => handleCreateOwnDialogOpenChange(false)}
              disabled={customSkillSaving}
            >
              Close
            </Button>
            <Button
              type="button"
              className="text-white"
              onClick={handleSaveCustomCursorSkill}
              disabled={customSkillSaving || !customSkillFolderName.trim()}
            >
              {customSkillSaving ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Saving…
                </>
              ) : editingCustomTitle !== null ? (
                "Save changes"
              ) : (
                "Save custom pack"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={skillPreviewFolderName !== null}
        onOpenChange={(open) => {
          if (!open) closeSkillPreview();
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[min(85vh,640px)] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
          aria-describedby="cursor-skill-preview-desc"
        >
          <div className="border-b border-slate-200 bg-slate-50/90 px-5 py-4 sm:px-6">
            <DialogHeader className="gap-1.5 space-y-0 text-left">
              <DialogTitle className="text-lg font-semibold tracking-tight">
                {skillPreviewTitle}
              </DialogTitle>
              <DialogDescription
                id="cursor-skill-preview-desc"
                className="text-sm leading-relaxed text-slate-600"
              >
                Read-only preview of{" "}
                <code className="rounded bg-white px-1.5 py-0.5 text-xs ring-1 ring-slate-200/80">
                  SKILL.md
                </code>
                .
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
            {customSkillsSavedLoading ? (
              <Skeleton
                className="h-[200px] w-full rounded-md"
                role="status"
                aria-busy="true"
                aria-label="Loading skill content"
              />
            ) : (
              <Textarea
                readOnly
                value={skillPreviewBody.trim() ? skillPreviewBody : "(empty body)"}
                rows={12}
                className="min-h-[200px] resize-none bg-white font-mono text-sm text-slate-800"
                aria-label="Skill content preview"
              />
            )}
          </div>
          <DialogFooter
            showCloseButton={false}
            className="flex-row justify-end border-t border-slate-200 bg-slate-50/50 px-5 py-4 sm:px-6"
          >
            <Button type="button" variant="outline" onClick={closeSkillPreview}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
