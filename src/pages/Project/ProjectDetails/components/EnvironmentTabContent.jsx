import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  getDeployMap,
  patchDeployMap,
  prepareDeployMapEnvironment,
  scanProjectEnvironments,
} from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { KeyRound, Loader2, Plus, ScanSearch, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/utils/logger";
import { EnvironmentAutoResolvedBoard } from "./EnvironmentAutoResolvedBoard";
import { EnvironmentCredentialsBoard } from "./EnvironmentCredentialsBoard";
import { EnvironmentDeploymentLinks } from "./EnvironmentDeploymentLinks";
import { EnvironmentOptionalBoard } from "./EnvironmentOptionalBoard";
import { EnvironmentStatusModal } from "./EnvironmentStatusModal";
import { AddEnvironmentVariableDialog } from "./AddEnvironmentVariableDialog";
import { buildProjectSettingsPath } from "@/pages/Project/ProjectSettings/constants";

const ENVIRONMENT_SCAN_POLL_MS = 4000;

function CredentialsSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading credentials">
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="space-y-3 rounded-xl border border-border p-4">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

function slugifyEnvId(name) {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function readinessBadgeClass(status) {
  switch (status) {
    case "ready":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300";
    case "preparing":
      return "border-blue-500/30 bg-blue-500/10 text-blue-800 dark:text-blue-300";
    case "blocked":
      return "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200";
    default:
      return "text-muted-foreground";
  }
}

function readinessLabel(status) {
  switch (status) {
    case "ready":
      return "Ready";
    case "preparing":
      return "Setting up…";
    case "blocked":
      return "Action needed";
    case "needs_credentials":
    default:
      return "Needs credentials";
  }
}

/**
 * Environment tab: credentials-only UX with silent prepare.
 */
export function EnvironmentTabContent({ project, hasDeveloperRepo }) {
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deployMap, setDeployMap] = useState({
    exists: false,
    scannedAt: null,
    userVariables: [],
    optionalVariables: [],
    environments: [],
    scan: null,
  });
  const [activeEnvId, setActiveEnvId] = useState("");
  const [credentialDrafts, setCredentialDrafts] = useState({});
  const [addEnvOpen, setAddEnvOpen] = useState(false);
  const [addVariableOpen, setAddVariableOpen] = useState(false);
  const [removeVariableTarget, setRemoveVariableTarget] = useState(null);
  const [newEnvName, setNewEnvName] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [retryingSetup, setRetryingSetup] = useState(false);
  const scanFailureToastShownRef = useRef(false);

  const applyDeployMapData = useCallback((data) => {
    setDeployMap(data);
    setScanning(data.scan?.status === "running");
    if (data.scan?.status !== "failed") {
      scanFailureToastShownRef.current = false;
    }
  }, []);

  const loadDeployMap = useCallback(async () => {
    if (!project?.id) return;
    setLoading(true);
    try {
      const data = await getDeployMap(project.id);
      applyDeployMapData(data);
      if (data.environments?.length && !activeEnvId) {
        setActiveEnvId(data.environments[0].id);
      }
    } catch (err) {
      logger.error("Failed to load deploy map", err);
      toast.error(
        (typeof err === "object" && err?.error) || "Could not load environment configuration",
      );
    } finally {
      setLoading(false);
    }
  }, [activeEnvId, applyDeployMapData, project?.id]);

  useEffect(() => {
    loadDeployMap();
  }, [loadDeployMap]);

  const scanRunning = deployMap.scan?.status === "running";
  const shouldPollDeployMap = scanRunning;

  useEffect(() => {
    if (!shouldPollDeployMap || !project?.id) return undefined;

    let cancelled = false;
    const poll = async () => {
      try {
        const data = await getDeployMap(project.id, { force: true });
        if (cancelled) return;
        applyDeployMapData(data);
      } catch (err) {
        if (!cancelled) {
          logger.error("Failed to poll deploy map status", err);
        }
      }
    };

    void poll();
    const id = setInterval(() => void poll(), ENVIRONMENT_SCAN_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [applyDeployMapData, project?.id, shouldPollDeployMap]);

  useEffect(() => {
    if (deployMap.scan?.status !== "failed" || scanFailureToastShownRef.current) {
      return;
    }
    scanFailureToastShownRef.current = true;
    toast.error(deployMap.scan.error || "Environment scan failed");
  }, [deployMap.scan?.error, deployMap.scan?.status]);

  const activeEnv = useMemo(
    () => deployMap.environments?.find((e) => e.id === activeEnvId) ?? null,
    [activeEnvId, deployMap.environments],
  );

  const credentialRows = useMemo(
    () => activeEnv?.userVariables ?? deployMap.userVariables ?? [],
    [activeEnv?.userVariables, deployMap.userVariables],
  );

  const optionalRows = useMemo(
    () => activeEnv?.optionalVariables ?? deployMap.optionalVariables ?? [],
    [activeEnv?.optionalVariables, deployMap.optionalVariables],
  );

  const autoResolvedRows = useMemo(
    () => (activeEnv?.allVariables ?? []).filter((row) => row.tier === "auto_resolved"),
    [activeEnv?.allVariables],
  );

  const pendingCredentialCount =
    activeEnv?.readiness?.pendingCredentialCount ??
    credentialRows.filter((row) => !row.hasValue).length;

  useEffect(() => {
    if (activeEnv?.readiness?.status === "blocked" && activeEnv.readiness.picker) {
      setPickerOpen(true);
    }
  }, [activeEnv?.readiness?.picker, activeEnv?.readiness?.status]);

  const handleScan = async () => {
    if (!project?.id) return;
    setScanning(true);
    try {
      const data = await scanProjectEnvironments(project.id);
      applyDeployMapData(data);
      if (data.environments?.length) {
        setActiveEnvId((prev) =>
          prev && data.environments.some((e) => e.id === prev) ? prev : data.environments[0].id,
        );
      }
      toast.success("Environment scan completed.");
    } catch (err) {
      const msg =
        (typeof err === "object" && err?.error) || err?.message || "Environment scan failed";
      if (typeof err === "object" && /already in progress/i.test(String(err?.error ?? ""))) {
        try {
          const data = await getDeployMap(project.id);
          applyDeployMapData(data);
        } catch (pollErr) {
          logger.error("Failed to load in-progress environment scan", pollErr);
        }
        return;
      }
      setScanning(false);
      toast.error(String(msg));
      logger.error("Environment scan failed", err);
    }
  };

  const handleAddEnvironment = async () => {
    const name = newEnvName.trim();
    if (!name || !project?.id) return;
    const id = slugifyEnvId(name);
    if (!id) {
      toast.error("Enter a valid environment name.");
      return;
    }
    setSaving(true);
    try {
      const data = await patchDeployMap(project.id, {
        environments: [{ id, name }],
      });
      applyDeployMapData(data);
      setActiveEnvId(id);
      setNewEnvName("");
      setAddEnvOpen(false);
      toast.success(`Environment "${name}" created.`);
    } catch (err) {
      toast.error((typeof err === "object" && err?.error) || "Could not create environment");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEnvironment = async (envId) => {
    if (!project?.id || !envId) return;
    setSaving(true);
    try {
      const data = await patchDeployMap(project.id, {
        environments: [{ id: envId, delete: true }],
      });
      applyDeployMapData(data);
      setActiveEnvId(data.environments?.[0]?.id ?? "");
      setCredentialDrafts({});
      toast.success("Environment removed.");
    } catch (err) {
      toast.error((typeof err === "object" && err?.error) || "Could not remove environment");
    } finally {
      setSaving(false);
    }
  };

  const allEditableLogicalIds = useMemo(() => {
    const ids = new Set([
      ...credentialRows.map((r) => r.logicalId),
      ...optionalRows.map((r) => r.logicalId),
      ...autoResolvedRows.map((r) => r.logicalId),
    ]);
    return ids;
  }, [autoResolvedRows, credentialRows, optionalRows]);

  const pendingCredentialUpdates = useMemo(() => {
    if (!activeEnvId) return [];
    return Object.entries(credentialDrafts)
      .filter(
        ([logicalId, value]) =>
          allEditableLogicalIds.has(logicalId) && String(value ?? "").trim().length > 0,
      )
      .map(([logicalId, value]) => ({
        environmentId: activeEnvId,
        logicalId,
        value: String(value).trim(),
      }));
  }, [activeEnvId, allEditableLogicalIds, credentialDrafts]);

  const pendingOptionalUpdates = useMemo(
    () =>
      pendingCredentialUpdates.filter((u) => optionalRows.some((r) => r.logicalId === u.logicalId)),
    [optionalRows, pendingCredentialUpdates],
  );

  const pendingAutoResolvedUpdates = useMemo(
    () =>
      pendingCredentialUpdates.filter((u) =>
        autoResolvedRows.some((r) => r.logicalId === u.logicalId),
      ),
    [autoResolvedRows, pendingCredentialUpdates],
  );

  const pendingRequiredUpdates = useMemo(
    () =>
      pendingCredentialUpdates.filter((u) =>
        credentialRows.some((r) => r.logicalId === u.logicalId),
      ),
    [credentialRows, pendingCredentialUpdates],
  );

  const handleAddManualVariable = async (payload) => {
    if (!project?.id || !activeEnvId) return;
    setSaving(true);
    try {
      const data = await patchDeployMap(project.id, {
        variableAdditions: [payload],
      });
      applyDeployMapData(data);
      setAddVariableOpen(false);
      setCredentialDrafts({});
      toast.success(
        payload.value
          ? "Variable added and saved for deploy."
          : "Variable added. Enter a value when you are ready.",
      );
    } catch (err) {
      toast.error((typeof err === "object" && err?.error) || "Could not add variable");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!project?.id || !pendingCredentialUpdates.length) return;
    setSaving(true);
    try {
      const data = await patchDeployMap(project.id, {
        valueUpdates: pendingCredentialUpdates,
      });
      applyDeployMapData(data);
      setCredentialDrafts({});
      const verification = data?.credentialVerification;
      if (verification?.awsAccountId) {
        toast.success(`Credentials saved · AWS account ${verification.awsAccountId}`);
      } else if (verification?.error) {
        toast.success("Credentials saved.");
        toast.warning(verification.error);
      } else if (
        pendingAutoResolvedUpdates.length &&
        !pendingRequiredUpdates.length &&
        !pendingOptionalUpdates.length
      ) {
        toast.success("Override saved. Dependent auto values will refresh on setup.");
      } else {
        toast.success("Credentials saved. Setting up your environment…");
      }
    } catch (err) {
      toast.error((typeof err === "object" && err?.error) || "Could not save credentials");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmRemoveVariable = async () => {
    if (!project?.id || !removeVariableTarget?.logicalId) return;
    setSaving(true);
    try {
      const data = await patchDeployMap(project.id, {
        variableRemovals: [{ logicalId: removeVariableTarget.logicalId }],
      });
      applyDeployMapData(data);
      setCredentialDrafts((prev) => {
        const next = { ...prev };
        delete next[removeVariableTarget.logicalId];
        return next;
      });
      setRemoveVariableTarget(null);
      toast.success("Variable removed.");
    } catch (err) {
      toast.error((typeof err === "object" && err?.error) || "Could not remove variable");
    } finally {
      setSaving(false);
    }
  };

  const openStatusModal = useCallback(() => {
    setStatusModalOpen(true);
  }, []);

  const handleRetrySetup = async () => {
    if (!project?.id || !activeEnvId) return;
    setRetryingSetup(true);
    try {
      const data = await prepareDeployMapEnvironment(project.id, {
        environmentId: activeEnvId,
      });
      applyDeployMapData(data);
      toast.success("Environment setup completed.");
    } catch (err) {
      toast.error((typeof err === "object" && err?.error) || "Could not run environment setup");
    } finally {
      setRetryingSetup(false);
    }
  };

  const handlePickerSelect = async (selectionId) => {
    if (!project?.id || !activeEnvId || !activeEnv?.readiness?.picker) return;
    setSaving(true);
    try {
      const data = await prepareDeployMapEnvironment(project.id, {
        environmentId: activeEnvId,
        logicalId: activeEnv.readiness.picker.logicalId,
        selectionId,
      });
      applyDeployMapData(data);
      setPickerOpen(false);
      toast.success("Environment updated.");
    } catch (err) {
      toast.error((typeof err === "object" && err?.error) || "Could not complete this step");
    } finally {
      setSaving(false);
    }
  };

  if (!hasDeveloperRepo) {
    return (
      <Card className="border-border shadow-sm">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Add a development repository in project settings to scan and configure deploy
          environments.
        </CardContent>
      </Card>
    );
  }

  const picker = activeEnv?.readiness?.picker;

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-sm">
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <KeyRound className="size-5" aria-hidden />
              </div>
              <div className="min-w-0 space-y-1">
                <h3 className="text-base font-semibold text-foreground">Deploy environments</h3>
                <p className="text-sm text-muted-foreground">
                  Add the secrets only you can provide — we&apos;ll configure everything else
                  automatically.
                </p>
                {project?.awsAuthMode === "instance_role" ? (
                  <p className="text-sm text-muted-foreground">
                    This project uses the LaunchPad server role. Access key and secret are not
                    required.{" "}
                    <Link
                      className="font-medium text-foreground underline"
                      to={buildProjectSettingsPath(project.id, "backend")}
                    >
                      Project settings
                    </Link>
                  </p>
                ) : null}
                {scanRunning ? (
                  <p className="text-xs text-muted-foreground">
                    Scanning development repositories
                    {deployMap.scan?.agentStatus
                      ? ` (${deployMap.scan.agentStatus.replace(/_/g, " ").toLowerCase()})`
                      : "…"}
                  </p>
                ) : deployMap.scan?.status === "failed" ? (
                  <p className="text-xs text-destructive">
                    {deployMap.scan.error || "Last scan failed. Try again."}
                  </p>
                ) : deployMap.scannedAt ? (
                  <p className="text-xs text-muted-foreground">
                    Last scan: {new Date(deployMap.scannedAt).toLocaleString()}
                    {pendingCredentialCount > 0
                      ? ` · ${pendingCredentialCount} credential${pendingCredentialCount === 1 ? "" : "s"} pending`
                      : ""}
                  </p>
                ) : null}
              </div>
            </div>
            <Button
              type="button"
              className="shrink-0 gap-2"
              onClick={handleScan}
              disabled={scanning || scanRunning || loading}
            >
              {scanning ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <ScanSearch className="size-4" aria-hidden />
              )}
              Scan repositories
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(280px,22rem)_minmax(0,1fr)] xl:items-start">
        <div className="min-w-0 xl:sticky xl:top-4 xl:self-start">
          <Card className="border-border shadow-sm">
            <CardContent className="space-y-4 pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h4 className="text-sm font-medium text-foreground">Environments</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setAddEnvOpen(true)}
                  disabled={saving}
                >
                  <Plus className="size-3.5" aria-hidden />
                  Add environment
                </Button>
              </div>

              {deployMap.environments?.length ? (
                <div className="flex flex-col gap-2">
                  {deployMap.environments.map((env) => (
                    <Button
                      key={env.id}
                      type="button"
                      size="sm"
                      variant={env.id === activeEnvId ? "default" : "outline"}
                      onClick={() => {
                        setActiveEnvId(env.id);
                        setCredentialDrafts({});
                      }}
                      className="w-full justify-start gap-2"
                    >
                      {env.name}
                      {env.readiness ? (
                        env.id === activeEnvId ? (
                          <Badge
                            asChild
                            variant="outline"
                            className={`cursor-pointer text-[10px] ${readinessBadgeClass(env.readiness.status)}`}
                            title={
                              env.readiness.status === "preparing"
                                ? "Some values are still being set up automatically. Click to see details."
                                : "Click to see all variable statuses"
                            }
                          >
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                openStatusModal();
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openStatusModal();
                                }
                              }}
                            >
                              {readinessLabel(env.readiness.status)}
                            </span>
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${readinessBadgeClass(env.readiness.status)}`}
                          >
                            {readinessLabel(env.readiness.status)}
                          </Badge>
                        )
                      ) : null}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Create an environment (e.g. staging, production) to configure deploy values.
                </p>
              )}

              {activeEnv?.readiness?.message ? (
                <p className="text-xs text-muted-foreground">
                  {activeEnv.readiness.message}{" "}
                  <button
                    type="button"
                    className="font-medium text-primary underline-offset-2 hover:underline"
                    onClick={openStatusModal}
                  >
                    View all variables
                  </button>
                </p>
              ) : activeEnv ? (
                <p className="text-xs text-muted-foreground">
                  <button
                    type="button"
                    className="font-medium text-primary underline-offset-2 hover:underline"
                    onClick={openStatusModal}
                  >
                    View all variables
                  </button>
                </p>
              ) : null}

              {activeEnv ? (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteEnvironment(activeEnv.id)}
                    disabled={saving}
                    aria-label={`Delete ${activeEnv.name}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          {activeEnv ? (
            loading ? (
              <CredentialsSkeleton />
            ) : (
              <>
                <EnvironmentDeploymentLinks
                  deployment={activeEnv.deployment}
                  environmentName={activeEnv.name}
                />
                <EnvironmentCredentialsBoard
                  rows={credentialRows}
                  draftValues={credentialDrafts}
                  onDraftChange={(logicalId, value) =>
                    setCredentialDrafts((prev) => ({ ...prev, [logicalId]: value }))
                  }
                  onSave={handleSaveCredentials}
                  onAddVariable={() => setAddVariableOpen(true)}
                  onRemoveVariable={setRemoveVariableTarget}
                  saving={saving}
                  pendingCount={pendingRequiredUpdates.length}
                />
                <EnvironmentAutoResolvedBoard
                  rows={autoResolvedRows}
                  draftValues={credentialDrafts}
                  onDraftChange={(logicalId, value) =>
                    setCredentialDrafts((prev) => ({ ...prev, [logicalId]: value }))
                  }
                  onSave={handleSaveCredentials}
                  saving={saving}
                  pendingCount={pendingAutoResolvedUpdates.length}
                />
                <EnvironmentOptionalBoard
                  rows={optionalRows}
                  draftValues={credentialDrafts}
                  onDraftChange={(logicalId, value) =>
                    setCredentialDrafts((prev) => ({ ...prev, [logicalId]: value }))
                  }
                  onSave={handleSaveCredentials}
                  onRemoveVariable={setRemoveVariableTarget}
                  saving={saving}
                  pendingCount={pendingOptionalUpdates.length}
                />
              </>
            )
          ) : null}
        </div>
      </div>

      <AddEnvironmentVariableDialog
        open={addVariableOpen}
        onOpenChange={setAddVariableOpen}
        environmentId={activeEnvId}
        environmentName={activeEnv?.name}
        onSubmit={handleAddManualVariable}
        saving={saving}
      />

      <Dialog
        open={Boolean(removeVariableTarget)}
        onOpenChange={(open) => {
          if (!open && !saving) setRemoveVariableTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove this variable?</DialogTitle>
            <DialogDescription>
              {removeVariableTarget
                ? `"${removeVariableTarget.label || removeVariableTarget.logicalId}" will be removed from your environment list. Saved values for this variable will be deleted.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRemoveVariableTarget(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleConfirmRemoveVariable()}
              disabled={saving}
            >
              {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addEnvOpen} onOpenChange={setAddEnvOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add environment</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-env-name">Name</Label>
            <Input
              id="new-env-name"
              value={newEnvName}
              onChange={(e) => setNewEnvName(e.target.value)}
              placeholder="staging"
              disabled={saving}
            />
            {newEnvName.trim() ? (
              <p className="text-xs text-muted-foreground">
                ID: <code className="font-mono">{slugifyEnvId(newEnvName) || "—"}</code>
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddEnvOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddEnvironment}
              disabled={!newEnvName.trim() || saving}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EnvironmentStatusModal
        open={statusModalOpen}
        onOpenChange={setStatusModalOpen}
        environment={activeEnv}
        readiness={activeEnv?.readiness}
        onRetrySetup={handleRetrySetup}
        retrying={retryingSetup}
      />

      <Dialog open={pickerOpen && Boolean(picker)} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Choose an option</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{picker?.message}</p>
          <ul className="space-y-2">
            {(picker?.options ?? []).map((opt) => (
              <li key={opt.id}>
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto w-full justify-start whitespace-normal px-3 py-2 text-left text-sm"
                  disabled={saving}
                  onClick={() => void handlePickerSelect(opt.id)}
                >
                  {opt.label || opt.id}
                </Button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
