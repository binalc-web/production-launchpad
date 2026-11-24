import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { PageShell } from "@/components/common/PageShell";
import {
  MODEL_ROUTER_MODE_OPTIONS,
  ModelRouterFormFields,
  OpenCodeModelFields,
} from "@/components/model-router/ModelRouterFormFields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import {
  fetchPlatformModelRouter,
  fetchProjectModelRouterOverrides,
  patchPlatformModelRouter,
} from "@/api";
import { AGENT_PROVIDERS, agentProviderLabel } from "@/constants/agentProvider";
import { getCursorModelLabel, OPENCODE_DEFAULT_MODEL_ID } from "@/constants/cursorModelCatalog";
import { isLaunchpadAdmin } from "@/utils/launchpadRole";

const DEFAULT_FORM = {
  mode: "fixed",
  fixedPlanModelId: "Auto",
  fixedBuildModelId: "cursor-grok-4.5-high",
  frontendPlanModelId: "Auto",
  frontendBuildModelId: "cursor-grok-4.5-high",
  backendPlanModelId: "Auto",
  backendBuildModelId: "Auto",
  cloudPlanModelId: "Auto",
  cloudBuildModelId: "Auto",
  opencodePlanModelId: OPENCODE_DEFAULT_MODEL_ID,
  opencodeBuildModelId: OPENCODE_DEFAULT_MODEL_ID,
};

function formFromPayload(data, fallback = DEFAULT_FORM) {
  return {
    mode: data?.mode || fallback.mode,
    fixedPlanModelId: data?.fixedPlanModelId || fallback.fixedPlanModelId,
    fixedBuildModelId: data?.fixedBuildModelId || fallback.fixedBuildModelId,
    frontendPlanModelId: data?.frontendPlanModelId || fallback.frontendPlanModelId,
    frontendBuildModelId: data?.frontendBuildModelId || fallback.frontendBuildModelId,
    backendPlanModelId: data?.backendPlanModelId || fallback.backendPlanModelId,
    backendBuildModelId: data?.backendBuildModelId || fallback.backendBuildModelId,
    cloudPlanModelId: data?.cloudPlanModelId || fallback.cloudPlanModelId,
    cloudBuildModelId: data?.cloudBuildModelId || fallback.cloudBuildModelId,
    opencodePlanModelId: data?.opencodePlanModelId || fallback.opencodePlanModelId,
    opencodeBuildModelId: data?.opencodeBuildModelId || fallback.opencodeBuildModelId,
  };
}

function modeLabel(row) {
  if (row.inherit) return "Platform default";
  return MODEL_ROUTER_MODE_OPTIONS.find((opt) => opt.value === row.mode)?.label || row.mode || "—";
}

function formatUpdatedAt(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "—";
  }
}

/**
 * Compact model summary for list rows (depends on routing mode).
 * @param {object} row
 * @returns {string[]}
 */
function modelSummaryLines(row, platformForm) {
  const label = (id) => getCursorModelLabel(id);
  if (row.agentProvider === AGENT_PROVIDERS.OPENCODE) {
    const plan = row.opencodePlanModelId || platformForm.opencodePlanModelId;
    const build = row.opencodeBuildModelId || platformForm.opencodeBuildModelId;
    const suffix = row.opencodePlanModelId || row.opencodeBuildModelId ? "" : " (platform)";
    return [`OpenCode plan: ${label(plan)}`, `OpenCode build: ${label(build)}${suffix}`];
  }
  if (row.inherit) {
    return ["Platform default"];
  }
  if (row.mode === "self_select") {
    return ["OpenAI picks per spawn"];
  }
  if (row.mode === "fixed_by_part") {
    return [
      `Frontend: plan ${label(row.frontendPlanModelId)} · build ${label(row.frontendBuildModelId)}`,
      `Backend: plan ${label(row.backendPlanModelId)} · build ${label(row.backendBuildModelId)}`,
      `Cloud: plan ${label(row.cloudPlanModelId)} · build ${label(row.cloudBuildModelId)}`,
    ];
  }
  // fixed (default)
  return [`Plan: ${label(row.fixedPlanModelId)}`, `Build: ${label(row.fixedBuildModelId)}`];
}

/**
 * Platform-wide Cursor model router admin page.
 */
export default function ModelRouterPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [overridesLoading, setOverridesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [opencodeCatalog, setOpencodeCatalog] = useState([]);
  const [catalogNote, setCatalogNote] = useState("");
  const [form, setForm] = useState(DEFAULT_FORM);
  const [overrides, setOverrides] = useState([]);

  const loadOverrides = useCallback(async () => {
    setOverridesLoading(true);
    try {
      const data = await fetchProjectModelRouterOverrides();
      setOverrides(Array.isArray(data?.projects) ? data.projects : []);
    } catch (error) {
      toast.error(error?.message || "Could not load project model overrides.");
      setOverrides([]);
    } finally {
      setOverridesLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPlatformModelRouter();
      setCatalog(Array.isArray(data?.catalog) ? data.catalog : []);
      setOpencodeCatalog(Array.isArray(data?.opencodeCatalog) ? data.opencodeCatalog : []);
      setCatalogNote(typeof data?.catalogNote === "string" ? data.catalogNote : "");
      setForm(formFromPayload(data));
    } catch (error) {
      toast.error(error?.message || "Could not load model router settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    void loadOverrides();
  }, [load, loadOverrides]);

  if (!isLaunchpadAdmin(user?.role)) {
    return <Navigate to="/projects" replace />;
  }

  const onFieldChange = (patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const data = await patchPlatformModelRouter(form);
      setForm(formFromPayload(data, form));
      if (Array.isArray(data?.catalog)) setCatalog(data.catalog);
      if (Array.isArray(data?.opencodeCatalog)) setOpencodeCatalog(data.opencodeCatalog);
      toast.success("Model router saved.");
    } catch (error) {
      toast.error(error?.message || "Could not save model router settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Model Router"
        description="Choose how Cursor and OpenCode agents pick models across LaunchPad. Projects can override these defaults."
      />
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Platform default</CardTitle>
            <CardDescription>
              Applies to every project unless that project sets its own override. Plan and build
              models apply when Cursor runs in plan vs agent mode; ask mode always uses Auto.
              {catalogNote ? ` ${catalogNote}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div
                className="space-y-3"
                role="status"
                aria-busy="true"
                aria-label="Loading model router settings"
              >
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-2/3" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <>
                <ModelRouterFormFields
                  mode={form.mode}
                  fixedPlanModelId={form.fixedPlanModelId}
                  fixedBuildModelId={form.fixedBuildModelId}
                  frontendPlanModelId={form.frontendPlanModelId}
                  frontendBuildModelId={form.frontendBuildModelId}
                  backendPlanModelId={form.backendPlanModelId}
                  backendBuildModelId={form.backendBuildModelId}
                  cloudPlanModelId={form.cloudPlanModelId}
                  cloudBuildModelId={form.cloudBuildModelId}
                  catalog={catalog}
                  onChange={onFieldChange}
                  disabled={saving}
                />
                <div className="space-y-3 border-t border-border/60 pt-6">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">OpenCode defaults</p>
                    <p className="text-xs text-muted-foreground">
                      Used by projects a platform admin has switched to the OpenCode runtime. The
                      plan model handles ask and plan runs; the build model handles agent runs.
                    </p>
                  </div>
                  <OpenCodeModelFields
                    planModelId={form.opencodePlanModelId}
                    buildModelId={form.opencodeBuildModelId}
                    catalog={opencodeCatalog}
                    onChange={onFieldChange}
                    disabled={saving}
                    idPrefix="platform-opencode-model"
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={save} disabled={saving}>
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5">
              <CardTitle>Project overrides</CardTitle>
              <CardDescription>
                Projects that differ from the platform default (Cursor routing override or the
                OpenCode runtime), configured on each project&apos;s Agent analytics card.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadOverrides()}
              disabled={overridesLoading}
            >
              {overridesLoading ? "Refreshing…" : "Refresh"}
            </Button>
          </CardHeader>
          <CardContent>
            {overridesLoading ? (
              <div
                className="space-y-3"
                role="status"
                aria-busy="true"
                aria-label="Loading project overrides"
              >
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-2/3" />
              </div>
            ) : overrides.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No project overrides. Every project runs on Cursor with the platform default above.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Runtime</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Models</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overrides.map((row) => (
                      <TableRow key={row.projectId}>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              to={`/projects/details/${row.projectId}?section=agent-analytics`}
                              className="font-medium text-primary hover:underline"
                            >
                              {row.name}
                            </Link>
                            {row.isActive === false ? (
                              <Badge variant="outline" className="text-muted-foreground">
                                Inactive
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              row.agentProvider === AGENT_PROVIDERS.OPENCODE ? "default" : "outline"
                            }
                          >
                            {agentProviderLabel(row.agentProvider)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.agentProvider === AGENT_PROVIDERS.OPENCODE ? "—" : modeLabel(row)}
                        </TableCell>
                        <TableCell>
                          <ul className="space-y-0.5 text-sm">
                            {modelSummaryLines(row, form).map((line) => (
                              <li key={line}>{line}</li>
                            ))}
                          </ul>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatUpdatedAt(row.updatedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
