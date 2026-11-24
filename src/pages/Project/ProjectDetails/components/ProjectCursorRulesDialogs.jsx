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
import { Library, PenLine } from "lucide-react";

/**
 * Add Cursor Rules dialogs — catalog import and custom rule editor.
 * Render with state/handlers from useProjectCursorRules.
 */
export function ProjectCursorRulesDialogs({
  cursorRules,
  hasDeveloperRepo,
  purpose = "import",
  idPrefix = "cursor-rules",
}) {
  const isSelectMode = purpose === "select";
  const {
    cursorRulesOpen,
    cursorRulesLoading,
    cursorRulesSearch,
    setCursorRulesSearch,
    selectedCursorFolders,
    cursorRulesImporting,
    customRuleFolderName,
    setCustomRuleFolderName,
    customRuleBody,
    setCustomRuleBody,
    customRuleSaving,
    cursorRulesMainStep,
    setCursorRulesMainStep,
    cursorRulesCreateOwnOpen,
    setCursorRulesCreateOwnOpen,
    customRulesSavedList,
    customRulesSavedLoading,
    editingCustomTitle,
    filteredCursorFolders,
    toggleCursorFolder,
    handleImportCursorRules,
    handleSaveCustomCursorRule,
    startEditCustomRule,
    startNewCustomRule,
    handleMainDialogOpenChange,
    handleCreateOwnDialogOpenChange,
  } = cursorRules;

  const showCatalog = isSelectMode || cursorRulesMainStep === "catalog";

  return (
    <>
      <Dialog open={cursorRulesOpen} onOpenChange={handleMainDialogOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[min(90vh,760px)] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
          aria-describedby="cursor-rules-dialog-desc"
        >
          <div className="border-b border-slate-200 bg-slate-50/90 px-5 py-4 sm:px-6">
            <DialogHeader className="gap-1.5 space-y-0 text-left">
              <DialogTitle className="text-lg font-semibold tracking-tight">
                {isSelectMode ? "Select Cursor Rules" : "Add Cursor Rules"}
              </DialogTitle>
              <DialogDescription
                id="cursor-rules-dialog-desc"
                className="text-sm leading-relaxed text-slate-600"
              >
                {isSelectMode ? (
                  <>Choose rule packs to include in this project&apos;s prompt configuration.</>
                ) : cursorRulesMainStep === "choose" ? (
                  <>Choose how to add rules to your GitHub developer repository.</>
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
                  onClick={() => setCursorRulesMainStep("catalog")}
                  className="flex flex-col items-start gap-2 rounded-xl border-2 border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Library className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="text-sm font-semibold text-slate-900">Add from catalog</span>
                  <span className="text-xs leading-relaxed text-slate-500">
                    Browse PatrickJS/awesome-cursorrules and your saved custom packs, then push
                    selected folders.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setCursorRulesCreateOwnOpen(true)}
                  className="flex flex-col items-start gap-2 rounded-xl border-2 border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-800">
                    <PenLine className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="text-sm font-semibold text-slate-900">Create your own</span>
                  <span className="text-xs leading-relaxed text-slate-500">
                    Name a pack and write rule content; it is saved for the whole workspace (visible
                    in every project), then you can push from the catalog step.
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
                    onClick={() => setCursorRulesMainStep("choose")}
                  >
                    ← Back to choices
                  </Button>
                ) : null}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {isSelectMode ? "Choose rule packs" : "Choose packs to add"}
                    </p>
                    {isSelectMode ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setCursorRulesCreateOwnOpen(true)}
                      >
                        <PenLine className="size-3.5" aria-hidden />
                        Create your own
                      </Button>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-500">
                    Includes{" "}
                    <a
                      href="https://github.com/PatrickJS/awesome-cursorrules/tree/main/rules"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      PatrickJS/awesome-cursorrules
                    </a>{" "}
                    and your saved custom packs.
                  </p>
                  <Input
                    placeholder="Search packs…"
                    value={cursorRulesSearch}
                    onChange={(e) => setCursorRulesSearch(e.target.value)}
                    disabled={cursorRulesLoading}
                    className="bg-white"
                  />
                  <div className="max-h-[min(40vh,280px)] min-h-[180px] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/40 p-2">
                    {cursorRulesLoading ? (
                      <div
                        className="space-y-2"
                        role="status"
                        aria-busy="true"
                        aria-label="Loading rule catalog"
                      >
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Skeleton key={i} className="h-10 w-full rounded-md bg-slate-200/70" />
                        ))}
                      </div>
                    ) : filteredCursorFolders.length === 0 ? (
                      <p className="py-8 text-center text-sm text-slate-500">
                        No packs match your search.
                      </p>
                    ) : (
                      <ul className="space-y-1">
                        {filteredCursorFolders.map((name) => (
                          <li key={name}>
                            <label
                              htmlFor={`${idPrefix}-cursor-rule-pack-${name}`}
                              className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-white"
                            >
                              <Checkbox
                                checked={selectedCursorFolders.has(name)}
                                onCheckedChange={() => toggleCursorFolder(name)}
                                className="mt-0.5"
                                id={`${idPrefix}-cursor-rule-pack-${name}`}
                              />
                              <span className="break-all leading-snug text-slate-800">{name}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {selectedCursorFolders.size} pack
                    {selectedCursorFolders.size === 1 ? "" : "s"} selected
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter
            showCloseButton={false}
            className="flex-row flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50/50 px-5 py-4 sm:gap-2 sm:px-6 [&>button]:shrink-0"
          >
            {!cursorRulesImporting ? (
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
                onClick={handleImportCursorRules}
                disabled={cursorRulesImporting || cursorRulesLoading}
              >
                {cursorRulesImporting ? (
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

      <Dialog open={cursorRulesCreateOwnOpen} onOpenChange={handleCreateOwnDialogOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[min(92vh,720px)] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
          aria-describedby="cursor-rules-create-desc"
        >
          <div className="border-b border-slate-200 bg-slate-50/90 px-5 py-4 sm:px-6">
            <DialogHeader className="gap-1.5 space-y-0 text-left">
              <DialogTitle className="text-lg font-semibold tracking-tight">
                Create your own rules
              </DialogTitle>
              <DialogDescription
                id="cursor-rules-create-desc"
                className="text-sm leading-relaxed text-slate-600"
              >
                Custom rules are shared across all projects on this workspace. The title becomes the
                directory name; content is saved as{" "}
                <code className="rounded bg-white px-1.5 py-0.5 text-xs ring-1 ring-slate-200/80">
                  rules.mdc
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
                    Shared workspace rules
                  </p>
                  {(customRulesSavedList.length > 0 || editingCustomTitle !== null) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={startNewCustomRule}
                      disabled={customRuleSaving}
                    >
                      New rule
                    </Button>
                  )}
                </div>
                {customRulesSavedLoading ? (
                  <div
                    className="space-y-2 py-2"
                    role="status"
                    aria-busy="true"
                    aria-label="Loading custom rules"
                  >
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-lg bg-slate-200/70" />
                    ))}
                  </div>
                ) : customRulesSavedList.length === 0 ? (
                  <p className="py-2 text-sm text-slate-500">
                    No custom rules yet. Add a title and content below.
                  </p>
                ) : (
                  <ul className="max-h-[200px] space-y-2 overflow-y-auto pr-1">
                    {customRulesSavedList.map((rule) => (
                      <li
                        key={rule.id}
                        className="rounded-md border border-slate-200 bg-white p-2.5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-mono text-sm font-medium text-slate-900">
                              {rule.folderName}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Updated{" "}
                              {rule.updatedAt
                                ? format(new Date(rule.updatedAt), "MMM d, yyyy h:mm a")
                                : "—"}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                              {(rule.body || "").replace(/\s+/g, " ").trim() || "(empty body)"}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="shrink-0 text-xs"
                            onClick={() => startEditCustomRule(rule)}
                            disabled={customRuleSaving}
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
                  {editingCustomTitle !== null ? `Edit “${editingCustomTitle}”` : "New rule"}
                </p>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label
                      htmlFor="cursor-custom-title"
                      className="text-xs font-medium text-slate-700"
                    >
                      Title
                    </Label>
                    <Input
                      id="cursor-custom-title"
                      placeholder="e.g. my-team-conventions"
                      value={customRuleFolderName}
                      onChange={(e) => setCustomRuleFolderName(e.target.value)}
                      disabled={customRuleSaving || editingCustomTitle !== null}
                      autoComplete="off"
                      className="bg-white"
                    />
                    {editingCustomTitle !== null ? (
                      <p className="text-[11px] text-slate-500">
                        Title cannot be changed when editing; use “New rule” to add another pack.
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="cursor-custom-body"
                      className="text-xs font-medium text-slate-700"
                    >
                      Rule content
                    </Label>
                    <Textarea
                      id="cursor-custom-body"
                      placeholder="Markdown or Cursor rule content…"
                      value={customRuleBody}
                      onChange={(e) => setCustomRuleBody(e.target.value)}
                      disabled={customRuleSaving}
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
              disabled={customRuleSaving}
            >
              Close
            </Button>
            <Button
              type="button"
              className="text-white"
              onClick={handleSaveCustomCursorRule}
              disabled={customRuleSaving || !customRuleFolderName.trim()}
            >
              {customRuleSaving ? (
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
    </>
  );
}
