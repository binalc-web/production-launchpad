import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ModelRouterFormFields,
  OpenCodeModelFields,
} from "@/components/model-router/ModelRouterFormFields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { fetchProjectModelRouter, patchProjectModelRouter } from "@/api";
import {
  AGENT_PROVIDERS,
  agentProviderLabel,
  normalizeAgentProvider,
} from "@/constants/agentProvider";
import { OPENCODE_DEFAULT_MODEL_ID } from "@/constants/cursorModelCatalog";

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
};

function formFromSource(source, effective) {
  return {
    mode: source?.mode || effective?.mode || "fixed",
    fixedPlanModelId: source?.fixedPlanModelId || effective?.fixedPlanModelId || "Auto",
    fixedBuildModelId:
      source?.fixedBuildModelId || effective?.fixedBuildModelId || "cursor-grok-4.5-high",
    frontendPlanModelId: source?.frontendPlanModelId || effective?.frontendPlanModelId || "Auto",
    frontendBuildModelId:
      source?.frontendBuildModelId || effective?.frontendBuildModelId || "cursor-grok-4.5-high",
    backendPlanModelId: source?.backendPlanModelId || effective?.backendPlanModelId || "Auto",
    backendBuildModelId: source?.backendBuildModelId || effective?.backendBuildModelId || "Auto",
    cloudPlanModelId: source?.cloudPlanModelId || effective?.cloudPlanModelId || "Auto",
    cloudBuildModelId: source?.cloudBuildModelId || effective?.cloudBuildModelId || "Auto",
  };
}

const EMPTY_OPENCODE = { opencodePlanModelId: null, opencodeBuildModelId: null };

/**
 * Per-project agent runtime (Cursor / OpenCode) and model router override card
 * (admin agent analytics section).
 */
export function ProjectModelRouterCard({ project }) {
  const projectId = project?.id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inherit, setInherit] = useState(true);
  const [catalog, setCatalog] = useState([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [effective, setEffective] = useState(null);
  const [savedProvider, setSavedProvider] = useState(AGENT_PROVIDERS.CURSOR);
  const [provider, setProvider] = useState(AGENT_PROVIDERS.CURSOR);
  const [opencodeAvailable, setOpencodeAvailable] = useState(false);
  const [opencodeCatalog, setOpencodeCatalog] = useState([]);
  const [opencodeForm, setOpencodeForm] = useState(EMPTY_OPENCODE);
  const [opencodePlatform, setOpencodePlatform] = useState({
    opencodePlanModelId: OPENCODE_DEFAULT_MODEL_ID,
    opencodeBuildModelId: OPENCODE_DEFAULT_MODEL_ID,
  });

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await fetchProjectModelRouter(projectId);
      setCatalog(Array.isArray(data?.catalog) ? data.catalog : []);
      setInherit(data?.inherit !== false);
      setEffective(data?.effective || null);
      const source = data?.override && data.inherit === false ? data.override : data?.platform;
      setForm(formFromSource(source, data?.effective));
      const nextProvider = normalizeAgentProvider(data?.agentProvider);
      setSavedProvider(nextProvider);
      setProvider(nextProvider);
      setOpencodeAvailable(data?.opencodeAvailable === true);
      setOpencodeCatalog(Array.isArray(data?.opencodeCatalog) ? data.opencodeCatalog : []);
      setOpencodeForm({
        opencodePlanModelId: data?.override?.opencodePlanModelId || null,
        opencodeBuildModelId: data?.override?.opencodeBuildModelId || null,
      });
      setOpencodePlatform({
        opencodePlanModelId: data?.platform?.opencodePlanModelId || OPENCODE_DEFAULT_MODEL_ID,
        opencodeBuildModelId: data?.platform?.opencodeBuildModelId || OPENCODE_DEFAULT_MODEL_ID,
      });
    } catch (error) {
      toast.error(error?.message || "Could not load model router settings.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onFieldChange = (patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const onOpenCodeChange = (patch) => {
    setOpencodeForm((prev) => ({ ...prev, ...patch }));
  };

  const providerChanged = provider !== savedProvider;
  const switchingToOpenCode = providerChanged && provider === AGENT_PROVIDERS.OPENCODE;

  const save = async () => {
    setSaving(true);
    try {
      const cursorBody = inherit
        ? { inherit: true }
        : {
            inherit: false,
            mode: form.mode,
            fixedPlanModelId: form.fixedPlanModelId,
            fixedBuildModelId: form.fixedBuildModelId,
            frontendPlanModelId: form.frontendPlanModelId,
            frontendBuildModelId: form.frontendBuildModelId,
            backendPlanModelId: form.backendPlanModelId,
            backendBuildModelId: form.backendBuildModelId,
            cloudPlanModelId: form.cloudPlanModelId,
            cloudBuildModelId: form.cloudBuildModelId,
          };
      const body = {
        ...cursorBody,
        opencodePlanModelId: opencodeForm.opencodePlanModelId,
        opencodeBuildModelId: opencodeForm.opencodeBuildModelId,
        ...(providerChanged ? { agentProvider: provider } : {}),
      };
      await patchProjectModelRouter(projectId, body);
      toast.success(
        providerChanged
          ? `Saved. New agents now run on ${agentProviderLabel(provider)}.`
          : "Project model router saved.",
      );
      await load();
    } catch (error) {
      toast.error(error?.message || "Could not save model router settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI agent runtime &amp; models</CardTitle>
        <CardDescription>
          Choose which runtime runs this project&apos;s agents and override the platform model
          defaults.
          {effective?.mode && savedProvider === AGENT_PROVIDERS.CURSOR
            ? ` Effective now: ${effective.mode}${
                effective.scope === "platform" ? " (platform)" : " (project)"
              }.`
            : ""}
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
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <>
            <div className="space-y-2 rounded-lg border border-border/60 p-3">
              <Label htmlFor="agent-runtime">Agent runtime</Label>
              <Select value={provider} onValueChange={setProvider} disabled={saving}>
                <SelectTrigger id="agent-runtime" className="w-full sm:w-64">
                  <SelectValue placeholder="Choose a runtime" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AGENT_PROVIDERS.CURSOR}>Cursor (default)</SelectItem>
                  <SelectItem
                    value={AGENT_PROVIDERS.OPENCODE}
                    disabled={!opencodeAvailable && savedProvider !== AGENT_PROVIDERS.OPENCODE}
                  >
                    OpenCode
                  </SelectItem>
                </SelectContent>
              </Select>
              {!opencodeAvailable && savedProvider !== AGENT_PROVIDERS.OPENCODE ? (
                <p className="text-xs text-muted-foreground">
                  OpenCode is unavailable: the opencode-agent pool is not configured on this
                  deployment.
                </p>
              ) : null}
              {providerChanged ? (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  After saving, new agents start on {agentProviderLabel(provider)}. Running agents
                  and existing chat sessions keep following up on the runtime they started on.
                  {switchingToOpenCode
                    ? " Save is refused if the OpenCode pool has no healthy task."
                    : ""}
                </p>
              ) : null}
            </div>

            {provider === AGENT_PROVIDERS.OPENCODE ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">OpenCode models</p>
                  <p className="text-xs text-muted-foreground">
                    The plan model handles ask and plan runs; the build model handles agent runs.
                  </p>
                </div>
                <OpenCodeModelFields
                  planModelId={opencodeForm.opencodePlanModelId}
                  buildModelId={opencodeForm.opencodeBuildModelId}
                  catalog={opencodeCatalog}
                  platformDefaults={opencodePlatform}
                  onChange={onOpenCodeChange}
                  disabled={saving}
                  idPrefix="project-opencode-model"
                />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-3">
                  <div className="space-y-1">
                    <Label htmlFor="model-router-inherit">Use platform default</Label>
                    <p className="text-xs text-muted-foreground">
                      Turn off to set a fixed model, smart self-select, or per-part models for this
                      project only.
                    </p>
                  </div>
                  <Switch
                    id="model-router-inherit"
                    checked={inherit}
                    onCheckedChange={setInherit}
                    disabled={saving}
                  />
                </div>

                {!inherit ? (
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
                ) : null}
              </>
            )}

            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : providerChanged ? "Save & switch runtime" : "Save"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
