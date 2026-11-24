import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KeyRound, Link2, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { QaLinkSessionBrowser } from "@/components/qa/QaLinkSessionBrowser";
import {
  cancelQaLiveLoginSession,
  fetchMcpAuthCaptureLatest,
  fetchProjectQaConfig,
  finishQaLiveLoginSession,
  startQaLiveLoginSession,
  updateProjectQaConfig,
} from "@/api";
import {
  assignIdsFromNames,
  AUTH_TYPES,
  defaultEnvironment,
  defaultPersona,
  devRepoRowsFromProject,
  emptyEnvironmentDraft,
  isMaskedSecret,
  normalizePersonaLoginMethod,
  normalizePlaywrightSlowMoMs,
  normalizeQaConfig,
  PERSONA_LOGIN_METHODS,
  PLAYWRIGHT_SLOW_MO_DEFAULT_MS,
  primaryRepoBranch,
  QA_PERSONA_LOGIN_METHOD_CREDENTIAL_LOGIN,
  stripMaskedAuthFieldsForSave,
  withDefaultBranches,
} from "@/utils/qaConfigClient";
import { cn } from "@/lib/utils";
import { qaLiveDebugError, qaLiveDebugInfo } from "@/utils/qaLiveLoginDebugLog";

function LoginMethodOption({ active, label, methodValue, onSelect }) {
  const Icon = methodValue === QA_PERSONA_LOGIN_METHOD_CREDENTIAL_LOGIN ? KeyRound : Link2;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "flex min-h-11 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm ring-1 ring-primary/25"
          : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
      )}
    >
      <Icon
        className={cn("size-3.5 shrink-0", active ? "text-primary" : "opacity-70")}
        aria-hidden
      />
      <span className="text-center leading-tight">{label}</span>
    </button>
  );
}

function PlaybackSpeed({ value, onChange }) {
  const ms = normalizePlaywrightSlowMoMs(value);
  return (
    <section className="space-y-2 rounded-xl border p-4">
      <h3 className="text-sm font-semibold">Test playback speed</h3>
      <p className="text-xs text-muted-foreground">Playwright slowMo delay (ms). Default 400.</p>
      <Input
        type="number"
        min={0}
        step={50}
        value={String(ms)}
        onChange={(e) => onChange(normalizePlaywrightSlowMoMs(e.target.value))}
        className="max-w-[160px]"
      />
    </section>
  );
}

function PersonaRow({
  persona,
  environmentId,
  projectId,
  onChange,
  onRemove,
  canRemove,
  onLinkStatusChange,
}) {
  const [capture, setCapture] = useState(null);
  const [loadingCapture, setLoadingCapture] = useState(false);
  /** The running link browser: `{ loginId, targetUrl }`. */
  const [live, setLive] = useState(null);
  /** Link clicked, runner still launching the browser (the starting animation shows). */
  const [linkStarting, setLinkStarting] = useState(false);
  /** Done pressed: saving the session. */
  const [linkBusy, setLinkBusy] = useState(false);
  // Set when the user ends the link on purpose, so the viewer's "browser closed" is not reported.
  const endingRef = useRef(false);
  // Bumped on every start and cancel: a start that returns after a cancel is closed, not shown.
  const attemptRef = useRef(0);
  const liveRef = useRef(null);
  liveRef.current = live;

  // Leaving the page with a link browser open closes it (nothing is saved).
  useEffect(
    () => () => {
      attemptRef.current += 1;
      const loginId = liveRef.current?.loginId;
      if (loginId) void cancelQaLiveLoginSession(projectId, loginId).catch(() => {});
    },
    [projectId],
  );

  const refreshCapture = useCallback(async () => {
    if (!projectId || !environmentId || !persona?.id) return;
    setLoadingCapture(true);
    try {
      const data = await fetchMcpAuthCaptureLatest(projectId, {
        environmentId,
        personaId: persona.id,
      });
      setCapture(data);
      onLinkStatusChange?.(data);
    } catch {
      setCapture({ status: "missing" });
    } finally {
      setLoadingCapture(false);
    }
  }, [projectId, environmentId, persona?.id, onLinkStatusChange]);

  useEffect(() => {
    refreshCapture();
  }, [refreshCapture]);

  const url = String(persona.urls?.[0]?.value || "").trim();
  const authType = persona.authentication?.type || "credentials";
  const loginMethod = normalizePersonaLoginMethod(authType, persona.authentication?.loginMethod);
  const isCredentialLogin = loginMethod === QA_PERSONA_LOGIN_METHOD_CREDENTIAL_LOGIN;
  const showSavedSessionLink = authType !== "credentials" || !isCredentialLogin;
  const storedPassword = persona.authentication?.fields?.password;
  const passwordPlaceholder = isMaskedSecret(storedPassword) ? "********" : "";

  const startLink = async () => {
    if (!environmentId || !persona?.id) {
      toast.error("Save configuration first so environment and persona IDs exist.");
      return;
    }
    if (!url) {
      toast.error("Add a persona URL first.");
      return;
    }
    endingRef.current = false;
    attemptRef.current += 1;
    const attempt = attemptRef.current;
    // Show the browser panel with its starting animation right away, not after the response.
    setLinkStarting(true);
    try {
      qaLiveDebugInfo("config-panel", "start_link_request", {
        projectId,
        environmentId,
        personaId: persona.id,
        url,
        authType,
      });
      const data = await startQaLiveLoginSession(projectId, {
        environmentId,
        personaId: persona.id,
      });
      qaLiveDebugInfo("config-panel", "start_link_ok", {
        loginId: data?.loginId,
        targetUrl: data?.targetUrl,
      });
      if (attempt !== attemptRef.current) {
        // Cancelled (or left the page) while the browser was starting: close it again.
        if (data?.loginId) void cancelQaLiveLoginSession(projectId, data.loginId).catch(() => {});
        return;
      }
      setLive({ loginId: data.loginId, targetUrl: data.targetUrl });
    } catch (err) {
      qaLiveDebugError("config-panel", "start_link_failed", {
        message: err?.response?.data?.message || err?.message,
        status: err?.response?.status,
      });
      if (attempt === attemptRef.current) {
        toast.error(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            "Could not start live login.",
        );
      }
    } finally {
      if (attempt === attemptRef.current) setLinkStarting(false);
    }
  };

  const finishLink = async () => {
    if (!live?.loginId) return;
    setLinkBusy(true);
    endingRef.current = true;
    try {
      qaLiveDebugInfo("config-panel", "finish_link_request", { loginId: live.loginId });
      const data = await finishQaLiveLoginSession(projectId, live.loginId);
      qaLiveDebugInfo("config-panel", "finish_link_response", {
        loginId: live.loginId,
        status: data?.status,
      });
      if (data?.status === "needs_input") {
        endingRef.current = false;
        toast.message("Finish sign-in in the live browser, then tap Done again.");
        return;
      }
      if (data?.persisted === false) {
        toast.warning(
          "Session linked for test runs, but it could not be saved for QA Chat. Link it again if QA Chat asks you to sign in.",
        );
      } else {
        toast.success("Session linked and saved for QA Chat and test runs.");
      }
      setLive(null);
      await refreshCapture();
    } catch (err) {
      endingRef.current = false;
      qaLiveDebugError("config-panel", "finish_link_failed", {
        message: err?.response?.data?.message || err?.message,
      });
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Could not save session.",
      );
    } finally {
      setLinkBusy(false);
    }
  };

  const cancelLink = async () => {
    endingRef.current = true;
    attemptRef.current += 1;
    const loginId = live?.loginId;
    setLive(null);
    setLinkStarting(false);
    if (loginId) {
      try {
        await cancelQaLiveLoginSession(projectId, loginId);
      } catch {
        /* ignore */
      }
    }
  };

  // The browser ended on its own (idle, crash) before Done: back to the Link session button.
  const handleLinkBrowserClosed = useCallback((reason) => {
    if (endingRef.current) return;
    setLive(null);
    toast.message(
      reason === "idle"
        ? "The link browser closed after being idle. Start Link session again."
        : "The link browser closed before the session was saved. Start Link session again.",
    );
  }, []);

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Persona name</Label>
          <Input
            value={persona.name || ""}
            onChange={(e) => onChange({ ...persona, name: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs">Auth type</Label>
          <Select
            value={authType}
            onValueChange={(type) =>
              onChange({
                ...persona,
                authentication: {
                  ...persona.authentication,
                  type,
                  loginMethod: normalizePersonaLoginMethod(
                    type,
                    persona.authentication?.loginMethod,
                  ),
                },
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUTH_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-xs">App URL</Label>
        <Input
          value={persona.urls?.[0]?.value || ""}
          onChange={(e) => {
            const urls = [{ name: "App", value: e.target.value }];
            onChange({ ...persona, urls });
          }}
        />
      </div>
      {authType === "credentials" ? (
        <div className="space-y-2">
          <Label className="text-xs">Login method</Label>
          <div
            className="flex w-full gap-1 rounded-lg border bg-muted/30 p-1"
            role="group"
            aria-label="Login method"
          >
            {PERSONA_LOGIN_METHODS.map((method) => (
              <LoginMethodOption
                key={method.value}
                methodValue={method.value}
                label={method.label}
                active={loginMethod === method.value}
                onSelect={() =>
                  onChange({
                    ...persona,
                    authentication: {
                      ...persona.authentication,
                      loginMethod: method.value,
                    },
                  })
                }
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {isCredentialLogin
              ? "Tests type this email and password on the login page. They are saved on this persona, not in the prompt."
              : "Log in once in the browser. Tests reuse that session."}
          </p>
          {isCredentialLogin ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Email / username</Label>
                <Input
                  value={persona.authentication?.fields?.email || ""}
                  onChange={(e) =>
                    onChange({
                      ...persona,
                      authentication: {
                        ...persona.authentication,
                        fields: { ...persona.authentication?.fields, email: e.target.value },
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Password</Label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder={passwordPlaceholder}
                  onChange={(e) =>
                    onChange({
                      ...persona,
                      authentication: {
                        ...persona.authentication,
                        fields: { ...persona.authentication?.fields, password: e.target.value },
                      },
                    })
                  }
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {showSavedSessionLink ? (
        <>
          <div className="rounded-md bg-muted/40 px-3 py-2 text-xs">
            {loadingCapture ? (
              "Checking linked session…"
            ) : capture?.status === "linked" ? (
              <>
                <span className="font-medium text-emerald-700">Linked</span>
                {capture.expiresAt
                  ? ` — expires ${new Date(capture.expiresAt).toLocaleString()}`
                  : ""}
              </>
            ) : (
              <span className="text-amber-700">Not linked — required for MCP test runs</span>
            )}
          </div>

          {!live && !linkStarting ? (
            <Button type="button" size="sm" onClick={startLink}>
              Link session
            </Button>
          ) : (
            <QaLinkSessionBrowser
              projectId={projectId}
              session={live}
              finishing={linkBusy}
              onFinish={finishLink}
              onCancel={cancelLink}
              onClosed={handleLinkBrowserClosed}
            />
          )}
        </>
      ) : null}

      {canRemove ? (
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          <Trash2 className="mr-1 size-3.5" />
          Remove persona
        </Button>
      ) : null}
    </div>
  );
}

export function ProjectQaAppConfigurationPanel({ projectId, project, embedded = false }) {
  const pid = Number(projectId);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [environments, setEnvironments] = useState([]);
  // Keyed on the string so a re-created `project` object never reloads (and discards edits).
  const developmentRepoUrl = project?.developmentRepoUrl ?? null;
  const devRepos = useMemo(
    () => devRepoRowsFromProject({ developmentRepoUrl }),
    [developmentRepoUrl],
  );
  const devRepoPaths = useMemo(() => devRepos.map((r) => r.path), [devRepos]);
  const prefillBranches = useCallback(
    (list) => list.map((env) => withDefaultBranches(env, devRepos)),
    [devRepos],
  );
  const [playwrightSlowMoMs, setPlaywrightSlowMoMs] = useState(PLAYWRIGHT_SLOW_MO_DEFAULT_MS);

  const load = useCallback(async () => {
    if (!Number.isInteger(pid) || pid < 1) return;
    setLoading(true);
    try {
      const data = await fetchProjectQaConfig(pid);
      const normalized = normalizeQaConfig(data?.qaConfigurations, devRepoPaths);
      setEnvironments(
        prefillBranches(
          normalized.environments?.length
            ? normalized.environments
            : [defaultEnvironment("Development", devRepos[0]?.ref || "", devRepoPaths)],
        ),
      );
      setPlaywrightSlowMoMs(normalized.playwrightSlowMoMs);
    } catch (err) {
      toast.error(err?.message || "Could not load QA configuration.");
    } finally {
      setLoading(false);
    }
  }, [pid, devRepos, devRepoPaths, prefillBranches]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        environments: assignIdsFromNames(stripMaskedAuthFieldsForSave(environments)),
        playwrightSlowMoMs,
      };
      const data = await updateProjectQaConfig(pid, payload);
      const normalized = normalizeQaConfig(data?.qaConfigurations, devRepoPaths);
      setEnvironments(prefillBranches(normalized.environments));
      setPlaywrightSlowMoMs(normalized.playwrightSlowMoMs);
      toast.success("QA App configuration saved.");
    } catch (err) {
      const data = err?.response?.data;
      toast.error(data?.error || data?.message || err?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const title = useMemo(() => (embedded ? null : "QA App Configuration"), [embedded]);

  if (loading) {
    return (
      <div className="space-y-3 p-1">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      {title ? <h2 className="text-lg font-semibold">{title}</h2> : null}
      <p className="text-sm text-muted-foreground">
        Configure environments, personas, playback speed, and link browser sessions for MCP QA runs
        (works on mobile — no QA Desktop app required).
      </p>

      <PlaybackSpeed value={playwrightSlowMoMs} onChange={setPlaywrightSlowMoMs} />

      <div className="space-y-4">
        {environments.map((env, envIndex) => (
          <section key={env.id || envIndex} className="space-y-3 rounded-xl border p-4">
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[200px] flex-1">
                <Label className="text-xs">Environment name</Label>
                <Input
                  value={env.name || ""}
                  onChange={(e) => {
                    const next = [...environments];
                    next[envIndex] = { ...env, name: e.target.value };
                    setEnvironments(next);
                  }}
                />
              </div>
              {environments.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEnvironments(environments.filter((_, i) => i !== envIndex))}
                >
                  Remove environment
                </Button>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label className="text-xs">
                {env.repoBranches?.length > 1 ? "Git branches" : "Git branch"}
              </Label>
              {env.repoBranches?.length ? (
                env.repoBranches.map((row, rowIndex) => (
                  <div key={row.path || rowIndex} className="flex items-center gap-2">
                    {env.repoBranches.length > 1 ? (
                      <span
                        className="min-w-0 flex-1 truncate text-xs text-muted-foreground"
                        title={row.path}
                      >
                        {row.path}
                      </span>
                    ) : null}
                    <Input
                      aria-label={`Git branch${row.path ? ` for ${row.path}` : ""}`}
                      className={env.repoBranches.length > 1 ? "w-48" : undefined}
                      value={row.branch || ""}
                      placeholder={
                        devRepos.find(
                          (r) => r.path.toLowerCase() === String(row.path).toLowerCase(),
                        )?.ref || "main"
                      }
                      onChange={(e) => {
                        const repoBranches = env.repoBranches.map((r, i) =>
                          i === rowIndex ? { ...r, branch: e.target.value } : r,
                        );
                        const next = [...environments];
                        next[envIndex] = {
                          ...env,
                          repoBranches,
                          branch: primaryRepoBranch({ ...env, repoBranches }),
                        };
                        setEnvironments(next);
                      }}
                    />
                  </div>
                ))
              ) : (
                <Input
                  aria-label="Git branch"
                  value={env.branch || ""}
                  placeholder="main"
                  onChange={(e) => {
                    const next = [...environments];
                    next[envIndex] = { ...env, branch: e.target.value };
                    setEnvironments(next);
                  }}
                />
              )}
              <p className="text-xs text-muted-foreground">
                The branch of the development repository this environment is tested against.
                Required to save.
              </p>
            </div>

            {(env.personas?.length ? env.personas : [defaultPersona()]).map((persona, pIndex) => (
              <PersonaRow
                key={persona.id || pIndex}
                persona={persona}
                environmentId={env.id}
                projectId={pid}
                canRemove={(env.personas?.length || 0) > 1}
                onChange={(nextPersona) => {
                  const next = [...environments];
                  const personas = [...(env.personas || [])];
                  personas[pIndex] = nextPersona;
                  next[envIndex] = { ...env, personas };
                  setEnvironments(next);
                }}
                onRemove={() => {
                  const next = [...environments];
                  next[envIndex] = {
                    ...env,
                    personas: env.personas.filter((_, i) => i !== pIndex),
                  };
                  setEnvironments(next);
                }}
              />
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const next = [...environments];
                const personas = [
                  ...(env.personas || []),
                  defaultPersona(`Persona ${(env.personas?.length || 0) + 1}`),
                ];
                next[envIndex] = { ...env, personas };
                setEnvironments(next);
              }}
            >
              <Plus className="mr-1 size-3.5" />
              Add persona
            </Button>
          </section>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          setEnvironments([
            ...environments,
            withDefaultBranches(emptyEnvironmentDraft(devRepoPaths), devRepos),
          ])
        }
      >
        <Plus className="mr-1 size-3.5" />
        Add environment
      </Button>

      <div className="flex gap-2 pt-2">
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : "Save configuration"}
        </Button>
      </div>
    </div>
  );
}
