import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  checkProjectSlugAvailability,
  clientLinkFetchAgentStatus,
  createProject,
  createProjectCustomCursorRule,
  createProjectCustomCursorSkill,
  enhanceScratchPrompt as enhanceScratchPromptApi,
  fetchDesignTemplateCatalog,
  fetchExternalHubProjects,
  fetchIntegrationsStatus,
  fetchImportedHubProjectIds,
  initializeProjectOnboarding,
  startMigrateOnboardingAgent,
  updateProject,
  updateProjectPromptConfig,
  uploadToRelease,
  consumeDeploymentWorkflowStream,
  fetchPublicProjectBySlug,
  fetchProjectById,
  fetchCursorAgentGithubReadiness,
  migrateGithubAccessFromReadiness,
  parseMigrateGithubAccessError,
} from "@/api";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { useNavigate, useParams } from "react-router-dom";
import {
  CheckCircle2,
  ChevronDown,
  Cpu,
  Eye,
  GitMerge,
  Hammer,
  Loader2,
  Settings,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  devRowsFromStored,
  isDevRowAutoProvision,
  resolveDevRowRefForSave,
} from "@/utils/projectMultiRepoForm";
import {
  SCRATCH_AGENT_PHASE_LUCIDE_ICON,
  SCRATCH_AGENT_PHASE_MESSAGES,
  SCRATCH_AGENT_PHASE_MESSAGE_STEP_MS,
  SCRATCH_PREVIEW_READY_UI_HOLD_MS,
} from "@/pages/Project/CreateProject/constants/scratchAgentPhaseMessages";
import { StepProgressHeader } from "@/pages/Project/CreateProject/components/StepProgressHeader";
import { InitMethodSelector } from "@/pages/Project/CreateProject/components/InitMethodSelector";
import { MethodSetupPanel } from "@/pages/Project/CreateProject/components/MethodSetupPanel";
import { TemplateGallery } from "@/pages/Project/CreateProject/components/TemplateGallery";
import {
  EMPTY_PROMPT_CONFIG,
  hasPromptConfigValues,
  OnboardingFrontendFoldersConfig,
} from "@/pages/Project/CreateProject/components/OnboardingFrontendFoldersConfig";
import { MigrateFrontendRepoAccessDialog } from "@/pages/Project/ProjectDetails/components/MigrateFrontendRepoAccessDialog";
import { BackendCloudPreferencesStep } from "@/pages/Project/CreateProject/components/BackendCloudPreferencesStep";
import ProjectGitJiraOAuthCard from "@/pages/Project/CreateProject/components/ProjectGitJiraOAuthCard";
import {
  normalizeBackendDeployMode,
  normalizeBackendInfraStack,
  normalizeBackendLockAgentMode,
} from "@/pages/Project/ProjectDetails/components/ReleaseLockBackendAgentCard";
import {
  formatBackendInfraLabel,
  formatBackendLockAgentModeLabel,
} from "@/lib/projectStatusPresentation";
import { cn } from "@/lib/utils";
import {
  CONFIGURE_PHASE_DESCRIPTION,
  EMPTY_SCRATCH_ENHANCEMENT_STATE,
  IDEA_STARTER_CHIPS,
  INIT_OPTIONS,
  MAX_BRAND_COLORS,
  METHOD_IDS,
  ONBOARDING_DRAFT_KEY,
  ONBOARDING_DRAFT_VERSION,
  SCRATCH_AGENT_POLL_INTERVAL_MS,
  SCRATCH_AGENT_POLL_TIMEOUT_MS,
  shouldContinueAgentUiPoll,
  visibleOnboardingSteps,
} from "@/pages/Project/CreateProject/constants/constants";
import {
  buildMigrateOnboardingDetailsPath,
  buildOnboardPreviewQueryString,
  buildScratchAwaitPreviewSearch,
} from "@/lib/onboardPreviewUrl";
import { persistMigrateOnboardingStreamHandoff } from "@/lib/migrateFrontendStream.util";
import {
  isBackendAgentFailureTerminal,
  isBackendAgentSuccessTerminal,
  isClientLinkAgentTurnFailed,
  normalizeBackendAgentStatus,
} from "@/lib/backendAgentStatus";

export const CreateProjectButton = () => {
  const navigate = useNavigate();
  return (
    <Button
      type="button"
      className="gap-2 text-white"
      onClick={() => navigate("/projects/onboarding")}
    >
      Create New Project
    </Button>
  );
};

function normalizeHexColorValue(raw) {
  const v = String(raw || "")
    .trim()
    .toUpperCase();
  if (!v) return "";
  const prefixed = v.startsWith("#") ? v : `#${v}`;
  if (!/^#[0-9A-F]{6}$/.test(prefixed)) return "";
  return prefixed;
}

function normalizeColorList(values) {
  if (!Array.isArray(values)) return [];
  const seen = new Set();
  const out = [];
  for (const item of values) {
    const normalized = normalizeHexColorValue(item);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
    if (out.length >= MAX_BRAND_COLORS) break;
  }
  return out;
}

function normalizeStringList(values, max = 6) {
  if (!Array.isArray(values)) return [];
  const seen = new Set();
  const out = [];
  for (const item of values) {
    const text = String(item || "").trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= max) break;
  }
  return out;
}

function buildScratchPromptWithDesignDetails({
  prompt,
  brandColors,
  fontStyle,
  brandTones,
  industry,
}) {
  const basePrompt = String(prompt || "").trim();
  if (!basePrompt) return "";
  const colors = normalizeColorList(brandColors);
  const tones = normalizeStringList(brandTones, 10);
  const font = String(fontStyle || "").trim();
  const sector = String(industry || "").trim();
  if (!colors.length && !tones.length && !font && !sector) return basePrompt;
  const lines = [];
  if (colors.length) lines.push(`Brand colors: ${colors.join(", ")}`);
  if (font) lines.push(`Preferred font style: ${font}`);
  if (tones.length) lines.push(`Brand tone: ${tones.join(", ")}`);
  if (sector) lines.push(`Industry: ${sector}`);
  return `${basePrompt}\n\nDesign-specific context:\n${lines
    .map((line) => `- ${line}`)
    .join("\n")}`;
}

/**
 * Read the first development repo path from either legacy string storage or
 * multi-repo JSON storage so existing migrate checks can reuse one value.
 */
function primaryDevelopmentRepoPath(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  const rows = devRowsFromStored(s);
  if (rows?.length) return String(rows[0]?.path || "").trim();
  return s;
}

/** First usable preview/live URL from GET /projects/public/:slug (root versions + nested releases). */
function extractLivePreviewUrlFromPublicPayload(payload) {
  if (!payload || typeof payload !== "object") return "";
  const port = payload.port != null ? Number(payload.port) : 0;
  if (port > 0) return `http://localhost:${port}/`;
  const collected = [];
  const take = (arr) => {
    if (!Array.isArray(arr)) return;
    for (const v of arr) {
      if (v && typeof v.buildUrl === "string") collected.push(v);
    }
  };
  take(payload.versions);
  for (const r of payload.releases || []) take(r?.versions);
  const preferred = collected.find((v) => v.isActive) || collected[0] || null;
  const raw = String(preferred?.buildUrl ?? "").trim();
  if (!raw || /^pending$/i.test(raw)) return "";
  if (raw.startsWith("/iframe-preview/")) {
    const m = raw.match(/\/iframe-preview\/(\d+)/);
    if (m) return `http://localhost:${m[1]}/`;
  }
  if (/^https?:\/\//i.test(raw)) return raw;
  return "";
}

/**
 * Restore onboarding draft from localStorage.
 * Returns null on version mismatch or malformed JSON.
 */
function loadOnboardingDraft() {
  try {
    const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== ONBOARDING_DRAFT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Persist the current onboarding step snapshot so page refresh keeps progress.
 */
function saveOnboardingDraft(snapshot) {
  try {
    localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Remove the onboarding draft after successful initialization.
 */
function clearOnboardingDraft() {
  try {
    localStorage.removeItem(ONBOARDING_DRAFT_KEY);
  } catch {
    // ignore
  }
}

function toPositiveIntId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Jira fields for feedback onboarding — use draft if widget unmounted (step 4). */
function buildFeedbackJiraInitFields(refPayload, draft) {
  const fromRef = refPayload ?? {};
  const fromDraft = draft ?? {};
  return {
    jiraConnectionId:
      fromRef.jiraConnectionId ?? toPositiveIntId(fromDraft.selectedJiraConnectionId),
    jiraProjectKey: String(fromRef.jiraProjectKey ?? fromDraft.jiraProjectKey ?? "").trim(),
  };
}

/** Primary dev branch from git/jira draft (fallback when step 5 unmounts the card). */
function primaryDevBranchFromGitJiraDraft(draft) {
  const rows = draft?.devMultiRows;
  if (!Array.isArray(rows) || rows.length === 0) return "";
  const row = rows[0];
  if (!row || typeof row !== "object") return "";
  if (isDevRowAutoProvision(row)) {
    return resolveDevRowRefForSave(row);
  }
  return String(row.ref ?? "").trim();
}

/**
 * User-facing error when scratch onboarding agent reaches a terminal failure.
 */
function buildOnboardAgentFailureError(st, rawStatus = "") {
  const label = rawStatus || normalizeBackendAgentStatus(st?.status) || "FAILED";
  const detail =
    typeof st?.failureReason === "string" && st.failureReason.trim()
      ? st.failureReason.trim()
      : null;
  return new Error(
    detail ? `Scratch agent failed (${label}). ${detail}` : `Scratch agent failed (${label}).`,
  );
}

/** True when agent-status (or related fields) indicate the scratch agent failed. */
function isOnboardAgentStatusFailure(st, rawStatus = "") {
  if (!st) return false;
  if (st.zipOnboardPreviewFailed) return true;
  if (st.scratchPreviewFailed) return true;
  if (isClientLinkAgentTurnFailed(st)) return true;
  if (isBackendAgentFailureTerminal(rawStatus || st?.status)) return true;
  if (typeof st?.failureReason === "string" && st.failureReason.trim() && !st?.userStopped) {
    return true;
  }
  return false;
}

const SCRATCH_PHASE_LUCIDE_COMPONENT = {
  Settings,
  Cpu,
  Hammer,
  Loader2,
  CheckCircle2,
  GitMerge,
  Sparkles,
  Eye,
};

function ScratchPhaseStatusIcon({ phase, className }) {
  const iconName = SCRATCH_AGENT_PHASE_LUCIDE_ICON[phase];
  const Cmp = SCRATCH_PHASE_LUCIDE_COMPONENT[iconName] || Loader2;
  const spin = phase === "running";
  return (
    <Cmp
      className={cn("h-8 w-8 shrink-0 text-primary", spin && "animate-spin", className)}
      aria-hidden
    />
  );
}

function PromptSkillsCollapsible({ open, onOpenChange, subtitle, children }) {
  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      className="overflow-hidden rounded-xl border border-primary/15 bg-linear-to-br from-primary/5 via-background to-muted/30"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
        <div>
          <span className="block text-sm font-semibold text-foreground">
            Prompt &amp; Skills (optional)
          </span>
          <span className="block text-xs text-muted-foreground">{subtitle}</span>
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-primary/15 px-5 py-5">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function normalizeHubProjectsResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.projects)) return data.projects;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function hubProjectIdOf(item) {
  return String(item?.id ?? item?._id ?? item?.projectId ?? "").trim();
}

function hubProjectTitleOf(item) {
  return String(item?.title ?? item?.name ?? item?.projectName ?? "").trim();
}

function hubProjectDescriptionOf(item) {
  return String(item?.description ?? item?.projectDescription ?? item?.summary ?? "").trim();
}

/** Hub external id for POST /api/projects when user picked a Hub project. */
function hubProjectIdForCreatePayload(hubProjectId) {
  const trimmed = String(hubProjectId ?? "").trim();
  return trimmed || undefined;
}

function withOptionalDescription(payload, description) {
  const trimmed = String(description ?? "").trim();
  return trimmed ? { ...payload, description: trimmed } : payload;
}

function withHubProjectId(payload, hubProjectId) {
  const id = hubProjectIdForCreatePayload(hubProjectId);
  return id ? { ...payload, projectId: id } : payload;
}

function linkedHubProjectIdOf(project) {
  if (project?.projectId == null || !String(project.projectId).trim()) return null;
  return String(project.projectId).trim();
}

async function applyBackendCloudPreferences(projectId, prefs) {
  return updateProject(projectId, {
    backendLockAgentMode: prefs.backendLockAgentMode,
    backendInfraStack: prefs.backendInfraStack,
    backendDeployMode: prefs.backendDeployMode,
  });
}

function withBackendCloudPrefs(payload, prefs) {
  return {
    ...payload,
    backendLockAgentMode: prefs.backendLockAgentMode,
    backendInfraStack: prefs.backendInfraStack,
    backendDeployMode: prefs.backendDeployMode,
  };
}

function resolveOnboardingStepFromDraft(raw) {
  const m = METHOD_IDS.includes(raw.method) ? raw.method : "zip";
  const hubBlank = raw.hubMode === "blank";
  const methodBlank = m === "blank";
  let stepNum =
    Number.isFinite(Number(raw.step)) && Number(raw.step) >= 1 && Number(raw.step) <= 5
      ? Number(raw.step)
      : 1;
  const migrateAwaitingInvite = Boolean(raw.migrateAwaitingInvitation) && m === "migrate";
  if (stepNum >= 5 && !migrateAwaitingInvite) stepNum = 4;
  if ((hubBlank || methodBlank) && stepNum >= 3) stepNum = 2;
  if (stepNum === 3 && m !== "migrate") stepNum = 4;
  return { stepNum, method: m, hubBlank, methodBlank, migrateAwaitingInvite };
}

/** Canonical onboarding URL for a saved draft step/method. */
function onboardingPathForDraft(raw) {
  const { stepNum, method: m, migrateAwaitingInvite } = resolveOnboardingStepFromDraft(raw);
  if (stepNum === 5 && migrateAwaitingInvite && m === "migrate") {
    return "/projects/onboarding/migrate";
  }
  if (stepNum === 4 && m && m !== "blank") {
    return `/projects/onboarding/${m}`;
  }
  return "/projects/onboarding";
}

/** Restore migrate invitation gate fields from draft snapshot. */
function migrateOnboardingContextFromDraft(raw) {
  if (!raw?.migrateOnboardingContext || typeof raw.migrateOnboardingContext !== "object") {
    return null;
  }
  const ctx = raw.migrateOnboardingContext;
  const projectId = toPositiveIntId(ctx.projectId ?? raw.onboardingProjectId);
  const releaseId = toPositiveIntId(ctx.releaseId);
  if (!projectId || !releaseId) return null;
  return {
    projectId,
    releaseId,
    launchpadRepoPath:
      typeof ctx.launchpadRepoPath === "string" ? ctx.launchpadRepoPath.trim() : null,
    primaryLaunchpad:
      ctx.primaryLaunchpad && typeof ctx.primaryLaunchpad === "object"
        ? ctx.primaryLaunchpad
        : null,
    primaryDevelopment:
      ctx.primaryDevelopment && typeof ctx.primaryDevelopment === "object"
        ? ctx.primaryDevelopment
        : null,
  };
}

const CreateProject = () => {
  const navigate = useNavigate();
  const { method: methodParam } = useParams();
  const [step, setStep] = useState(1);
  const [hasMovedPastStep1, setHasMovedPastStep1] = useState(false);
  const [hubMode, setHubMode] = useState("manual");
  const [hubProjects, setHubProjects] = useState([]);
  const [importedHubProjectIds, setImportedHubProjectIds] = useState([]);
  const [hubProjectId, setHubProjectId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slugData, setSlugData] = useState({
    loading: false,
    available: true,
    suggestedSlug: "",
  });
  const [project, setProject] = useState(null);
  const [method, setMethod] = useState("zip");
  const [backendLockAgentMode, setBackendLockAgentMode] = useState("plan");
  const [backendInfraStack, setBackendInfraStack] = useState("none");
  const [backendDeployMode, setBackendDeployMode] = useState("server");
  const [zipFile, setZipFile] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [scratchPrompt, setScratchPrompt] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [brandColors, setBrandColors] = useState([]);
  const [fontStyle, setFontStyle] = useState("");
  const [brandTones, setBrandTones] = useState([]);
  const [industry, setIndustry] = useState("");
  const [developmentRepoUrl, setDevelopmentRepoUrl] = useState("");
  const [branch, setBranch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [blankCreating, setBlankCreating] = useState(false);
  const [agentStatusText, setAgentStatusText] = useState("");
  const [scratchAgentPhase, setScratchAgentPhase] = useState(null);
  const scratchAgentPhaseRef = useRef(null);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [integrationsPayload, setIntegrationsPayload] = useState(null);
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  const [gitJiraDraft, setGitJiraDraft] = useState(null);
  const [migrateValidationErrors, setMigrateValidationErrors] = useState({});
  const [migrateAccessDialogOpen, setMigrateAccessDialogOpen] = useState(false);
  const [migrateAccessPayload, setMigrateAccessPayload] = useState(null);
  /** Migrate onboarding: pause on step 5 until launchpad GitHub invite is accepted. */
  const [migrateAwaitingInvitation, setMigrateAwaitingInvitation] = useState(false);
  const [migrateOnboardingContext, setMigrateOnboardingContext] = useState(null);
  const [feedbackValidationErrors, setFeedbackValidationErrors] = useState({});
  const [scratchEnhancementState, setScratchEnhancementState] = useState(
    EMPTY_SCRATCH_ENHANCEMENT_STATE,
  );
  const [promptConfig, setPromptConfig] = useState(EMPTY_PROMPT_CONFIG);
  /** Folder name of the onboarding template chosen in the scratch gallery (subset of frontendSkillFolders). */
  const [selectedTemplateFolder, setSelectedTemplateFolder] = useState(null);
  /** Custom skill packs created before the project id exists. */
  const [pendingCustomCursorSkills, setPendingCustomCursorSkills] = useState([]);
  /** Custom rule packs created before the project id exists. */
  const [pendingCustomCursorRules, setPendingCustomCursorRules] = useState([]);
  const [promptSkillsOpen, setPromptSkillsOpen] = useState(false);
  const [starterChipId, setStarterChipId] = useState(null);
  const [scratchPromptError, setScratchPromptError] = useState("");
  const scratchPromptTextareaRef = useRef(null);
  const designTemplateCatalogRef = useRef(null);
  const gitJiraRef = useRef(null);
  const feedbackJiraRef = useRef(null);
  const scratchEnhanceRequestRef = useRef(0);
  const scratchEnhanceInFlightRef = useRef(false);
  const blankCreateInFlightRef = useRef(false);

  const withOptionalPromptConfig = useCallback(
    (body) => {
      if (!hasPromptConfigValues(promptConfig)) return body;
      if (pendingCustomCursorSkills.length || pendingCustomCursorRules.length) return body;
      return { ...body, promptConfig };
    },
    [promptConfig, pendingCustomCursorSkills.length, pendingCustomCursorRules.length],
  );

  /** Upserts a pending pack by folder name while the project is still unsaved. */
  const upsertPendingCustomCursorPack = useCallback((setPendingPacks, pack) => {
    setPendingPacks((prev) => [
      pack,
      ...prev.filter((item) => item.folderName !== pack.folderName),
    ]);
  }, []);

  /** Persists onboarding custom packs after createProject returns a project id. */
  const savePendingCustomCursorPacks = useCallback(
    async (projectId) => {
      if (!pendingCustomCursorSkills.length && !pendingCustomCursorRules.length) return;
      await Promise.all([
        ...pendingCustomCursorSkills.map((skill) =>
          createProjectCustomCursorSkill(projectId, {
            folderName: skill.folderName,
            body: skill.body,
          }),
        ),
        ...pendingCustomCursorRules.map((rule) =>
          createProjectCustomCursorRule(projectId, {
            folderName: rule.folderName,
            body: rule.body,
          }),
        ),
      ]);
      setPendingCustomCursorSkills([]);
      setPendingCustomCursorRules([]);
    },
    [pendingCustomCursorRules, pendingCustomCursorSkills],
  );

  /** Saves deferred custom packs, then applies prompt folder selections. */
  const finalizeOnboardingPromptConfig = useCallback(
    async (projectId) => {
      const hadPending =
        pendingCustomCursorSkills.length > 0 || pendingCustomCursorRules.length > 0;
      if (!hadPending || !hasPromptConfigValues(promptConfig)) return;
      try {
        await savePendingCustomCursorPacks(projectId);
        await updateProjectPromptConfig(projectId, promptConfig);
      } catch (err) {
        toast.error(err?.error || "Project created, but custom packs could not be saved");
      }
    },
    [
      pendingCustomCursorRules,
      pendingCustomCursorSkills,
      promptConfig,
      savePendingCustomCursorPacks,
    ],
  );

  useEffect(() => {
    scratchAgentPhaseRef.current = scratchAgentPhase;
  }, [scratchAgentPhase]);

  /** One-time sweep through the four lines per phase; then hold the last line until phase changes. */
  useEffect(() => {
    if (method !== "scratch" || !scratchAgentPhase) return undefined;
    const messages = SCRATCH_AGENT_PHASE_MESSAGES[scratchAgentPhase];
    if (!Array.isArray(messages) || messages.length === 0) return undefined;

    const phaseAtStart = scratchAgentPhase;
    setAgentStatusText(messages[0]);

    const stepMs = SCRATCH_AGENT_PHASE_MESSAGE_STEP_MS;
    const timerIds = [];
    for (let i = 1; i < messages.length; i += 1) {
      const id = setTimeout(() => {
        if (scratchAgentPhaseRef.current !== phaseAtStart) return;
        setAgentStatusText(messages[i]);
      }, stepMs * i);
      timerIds.push(id);
    }

    return () => {
      timerIds.forEach((tid) => clearTimeout(tid));
    };
  }, [scratchAgentPhase, method]);

  useLayoutEffect(() => {
    const raw = loadOnboardingDraft();
    if (!raw || raw.v !== ONBOARDING_DRAFT_VERSION) return;
    const target = onboardingPathForDraft(raw);
    const current = typeof window !== "undefined" ? window.location.pathname : "";
    if (current && current !== target) {
      navigate(target, { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const raw = loadOnboardingDraft();
    if (!raw || raw.v !== ONBOARDING_DRAFT_VERSION) {
      setDraftHydrated(true);
      return;
    }
    const { stepNum } = resolveOnboardingStepFromDraft(raw);
    const m = METHOD_IDS.includes(raw.method) ? raw.method : "zip";
    setStep(stepNum);
    setHasMovedPastStep1(Boolean(raw.hasMovedPastStep1) || stepNum > 1);
    setHubMode(raw.hubMode === "hub" ? "hub" : raw.hubMode === "blank" ? "blank" : "manual");
    setHubProjectId(String(raw.hubProjectId ?? ""));
    setName(typeof raw.name === "string" ? raw.name : "");
    setDescription(typeof raw.description === "string" ? raw.description : "");
    setMethod(m);
    setBackendLockAgentMode(normalizeBackendLockAgentMode(raw.backendLockAgentMode));
    setBackendInfraStack(normalizeBackendInfraStack(raw.backendInfraStack));
    setBackendDeployMode(normalizeBackendDeployMode(raw.backendDeployMode));
    setScratchPrompt(typeof raw.scratchPrompt === "string" ? raw.scratchPrompt : "");
    setWebsiteUrl(typeof raw.websiteUrl === "string" ? raw.websiteUrl : "");
    setBrandColors(normalizeColorList(raw.brandColors));
    setFontStyle(typeof raw.fontStyle === "string" ? raw.fontStyle : "");
    setBrandTones(normalizeStringList(raw.brandTones, 10));
    setIndustry(typeof raw.industry === "string" ? raw.industry : "");
    setDevelopmentRepoUrl(typeof raw.developmentRepoUrl === "string" ? raw.developmentRepoUrl : "");
    setBranch(typeof raw.branch === "string" ? raw.branch : "");
    const restoredMigrateCtx = migrateOnboardingContextFromDraft(raw);
    if (Boolean(raw.migrateAwaitingInvitation) && restoredMigrateCtx) {
      setMigrateAwaitingInvitation(true);
      setMigrateOnboardingContext(restoredMigrateCtx);
      setProject((prev) =>
        prev?.id === restoredMigrateCtx.projectId
          ? prev
          : {
              ...(prev || {}),
              id: restoredMigrateCtx.projectId,
              gitRepoPath: restoredMigrateCtx.launchpadRepoPath ?? prev?.gitRepoPath ?? null,
            },
      );
    }
    setDraftHydrated(true);
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;
    const snapshot = {
      v: ONBOARDING_DRAFT_VERSION,
      step,
      hasMovedPastStep1,
      hubMode,
      hubProjectId,
      name,
      description,
      method,
      backendLockAgentMode,
      backendInfraStack,
      backendDeployMode,
      scratchPrompt,
      websiteUrl,
      brandColors,
      fontStyle,
      brandTones,
      industry,
      developmentRepoUrl,
      branch,
      migrateAwaitingInvitation: migrateAwaitingInvitation && method === "migrate",
      migrateOnboardingContext:
        migrateAwaitingInvitation && method === "migrate" && migrateOnboardingContext
          ? migrateOnboardingContext
          : null,
      onboardingProjectId: migrateOnboardingContext?.projectId ?? project?.id ?? null,
    };
    const t = setTimeout(() => saveOnboardingDraft(snapshot), 400);
    return () => clearTimeout(t);
  }, [
    draftHydrated,
    step,
    hasMovedPastStep1,
    hubMode,
    hubProjectId,
    name,
    description,
    method,
    backendLockAgentMode,
    backendInfraStack,
    backendDeployMode,
    scratchPrompt,
    websiteUrl,
    brandColors,
    fontStyle,
    brandTones,
    industry,
    developmentRepoUrl,
    branch,
    migrateAwaitingInvitation,
    migrateOnboardingContext,
    project?.id,
  ]);

  useEffect(() => {
    if (!methodParam) return;
    if (!METHOD_IDS.includes(methodParam)) {
      navigate("/projects/onboarding", { replace: true });
      return;
    }
    setMethod(methodParam);
  }, [methodParam, navigate]);

  useEffect(() => {
    if (!draftHydrated) return;
    if (!methodParam || !METHOD_IDS.includes(methodParam)) return;
    if (methodParam === "blank") return;
    setStep((prev) => (prev < 4 ? 4 : prev));
    setHasMovedPastStep1(true);
  }, [draftHydrated, methodParam]);

  useEffect(() => {
    let active = true;
    fetchExternalHubProjects()
      .then((data) => {
        if (!active) return;
        const rows = normalizeHubProjectsResponse(data);
        setHubProjects(rows);
      })
      .catch(() => {
        setHubProjects([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetchImportedHubProjectIds()
      .then((data) => {
        if (!active) return;
        const ids = Array.isArray(data?.hubProjectIds) ? data.hubProjectIds : [];
        setImportedHubProjectIds(ids.map((id) => String(id).trim()).filter(Boolean));
      })
      .catch(() => {
        setImportedHubProjectIds([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (method !== "migrate" && method !== "feedback") return;
    let cancelled = false;
    const loadIntegrations = async ({ silent = false } = {}) => {
      if (!silent) setIntegrationsLoading(true);
      try {
        const data = await fetchIntegrationsStatus({ checkHealth: true });
        if (!cancelled) setIntegrationsPayload(data);
      } catch {
        if (!cancelled && !silent) setIntegrationsPayload(null);
      } finally {
        if (!cancelled && !silent) setIntegrationsLoading(false);
      }
    };
    loadIntegrations();
    const timer = window.setInterval(
      () => {
        void loadIntegrations({ silent: true });
      },
      2 * 60 * 1000,
    );
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [method]);

  const importedHubProjectIdSet = useMemo(
    () => new Set(importedHubProjectIds),
    [importedHubProjectIds],
  );

  const hubProjectsWithIds = useMemo(
    () => hubProjects.filter((item) => Boolean(hubProjectIdOf(item))),
    [hubProjects],
  );

  const selectableHubProjectCount = useMemo(
    () =>
      hubProjectsWithIds.filter((item) => !importedHubProjectIdSet.has(hubProjectIdOf(item)))
        .length,
    [hubProjectsWithIds, importedHubProjectIdSet],
  );

  /** Whole Select disabled only when every hub row is already linked; otherwise users could not pick importable projects. */
  const hubProjectSelectFullyDisabled =
    hubProjectsWithIds.length > 0 && selectableHubProjectCount === 0;

  useEffect(() => {
    if (hubMode !== "hub" || !hubProjectId) return;
    if (importedHubProjectIdSet.has(String(hubProjectId))) {
      setHubProjectId("");
    }
  }, [hubMode, hubProjectId, importedHubProjectIdSet]);

  const selectedHubProject = useMemo(
    () => hubProjects.find((item) => hubProjectIdOf(item) === String(hubProjectId)),
    [hubProjects, hubProjectId],
  );

  useEffect(() => {
    if (hubMode !== "hub") return;
    const selectedTitle = hubProjectTitleOf(selectedHubProject);
    const selectedDescription = hubProjectDescriptionOf(selectedHubProject);
    if (!selectedTitle) return;
    setName(selectedTitle);
    if (!description.trim() && selectedDescription) {
      setDescription(selectedDescription);
    }
  }, [hubMode, selectedHubProject, description]);

  useEffect(() => {
    if (!name.trim()) {
      setSlugData({ loading: false, available: true, suggestedSlug: "" });
      return;
    }
    const t = setTimeout(async () => {
      try {
        setSlugData((prev) => ({ ...prev, loading: true }));
        const data = await checkProjectSlugAvailability({ name });
        setSlugData({
          loading: false,
          available: Boolean(data?.available),
          suggestedSlug: data?.suggestedSlug || "",
        });
      } catch {
        setSlugData({ loading: false, available: false, suggestedSlug: "" });
      }
    }, 350);
    return () => clearTimeout(t);
  }, [name]);

  const shouldValidateSlugOnStep1 = true;
  const shouldShowSlugStatus = Boolean(name.trim()) && shouldValidateSlugOnStep1;

  const selectedHubIdImported =
    hubMode === "hub" && Boolean(hubProjectId) && importedHubProjectIdSet.has(String(hubProjectId));

  const canContinueStep1 =
    (hubMode !== "hub" || Boolean(hubProjectId)) &&
    !selectedHubIdImported &&
    name.trim().length >= 3 &&
    (!shouldValidateSlugOnStep1 || (!slugData.loading && slugData.available));

  const canStartBlank =
    name.trim().length >= 3 &&
    (!shouldValidateSlugOnStep1 || (!slugData.loading && slugData.available));

  const canContinueFromStep2 = METHOD_IDS.includes(method);

  const isBlankOnboarding = hubMode === "blank" || method === "blank";

  const backendCloudPrefs = useMemo(
    () => ({
      backendLockAgentMode: normalizeBackendLockAgentMode(backendLockAgentMode),
      backendInfraStack: normalizeBackendInfraStack(backendInfraStack),
      backendDeployMode: normalizeBackendDeployMode(backendDeployMode),
    }),
    [backendLockAgentMode, backendInfraStack, backendDeployMode],
  );

  const handleStartBlank = useCallback(async () => {
    if (!canStartBlank || submitting || blankCreateInFlightRef.current) return;
    blankCreateInFlightRef.current = true;
    setBlankCreating(true);
    setSubmitting(true);
    try {
      const created = await createProject(
        withBackendCloudPrefs(
          withOptionalPromptConfig(
            withHubProjectId(
              withOptionalDescription({ name: name.trim() }, description),
              hubProjectId,
            ),
          ),
          backendCloudPrefs,
        ),
      );
      await finalizeOnboardingPromptConfig(created.id);
      await initializeProjectOnboarding(created.id, { method: "blank" });
      clearOnboardingDraft();
      navigate(`/projects/details/${created.id}`);
    } catch (err) {
      toast.error(err?.error || "Failed to create project");
    } finally {
      setSubmitting(false);
      setBlankCreating(false);
      blankCreateInFlightRef.current = false;
    }
  }, [
    canStartBlank,
    name,
    description,
    navigate,
    submitting,
    backendCloudPrefs,
    withOptionalPromptConfig,
    finalizeOnboardingPromptConfig,
    hubProjectId,
  ]);

  const handleMethodSelect = useCallback((id) => {
    setMethod(id);
  }, []);

  const resetScratchEnhancementState = useCallback(() => {
    scratchEnhanceRequestRef.current += 1;
    setScratchEnhancementState(EMPTY_SCRATCH_ENHANCEMENT_STATE);
  }, []);

  const scratchEnhancementStatus = scratchEnhancementState.status;
  const scratchEnhancementPending = scratchEnhancementStatus === "pending";
  const scratchEnhancementLoading = scratchEnhancementStatus === "loading";

  const handleScratchPromptChange = useCallback(
    (nextPrompt) => {
      if (scratchEnhancementPending) return;
      setScratchPrompt(nextPrompt);
      if (String(nextPrompt || "").trim()) setScratchPromptError("");
      else setStarterChipId(null);
      if (scratchEnhancementStatus !== "idle") {
        resetScratchEnhancementState();
      }
    },
    [scratchEnhancementPending, scratchEnhancementStatus, resetScratchEnhancementState],
  );

  /**
   * Select (or clear) an onboarding template. The template's skill pack is added to
   * frontendSkillFolders so the existing persist + repo-push + scratch-prompt-routing
   * flow carries it to the agent. Prefills the prompt only when it is empty.
   */
  const handleSelectTemplate = useCallback(
    (template) => {
      const nextFolder = template?.folderName ?? null;
      const prevFolder = selectedTemplateFolder;
      setPromptConfig((cfg) => {
        const current = Array.isArray(cfg.frontendSkillFolders) ? cfg.frontendSkillFolders : [];
        let next = current.filter((folder) => folder !== prevFolder);
        if (nextFolder) next = [...new Set([...next, nextFolder])];
        return { ...cfg, frontendSkillFolders: next.length ? next : null };
      });
      setSelectedTemplateFolder(nextFolder);
      if (template?.examplePrompt) {
        setScratchPrompt((prev) => (prev.trim() ? prev : template.examplePrompt));
      }
    },
    [selectedTemplateFolder],
  );

  /** Fill the prompt from a starter chip and attach its design-library template when available. */
  const handleStarterChipSelect = useCallback(
    async (chip) => {
      if (!chip || scratchEnhancementPending) return;
      setStarterChipId(chip.id);
      handleScratchPromptChange(chip.prompt);
      if (!chip.templateFolder) return;
      try {
        if (!designTemplateCatalogRef.current) {
          designTemplateCatalogRef.current = fetchDesignTemplateCatalog();
        }
        const catalog = await designTemplateCatalogRef.current;
        const template = (catalog?.categories ?? [])
          .flatMap((cat) => cat?.templates ?? [])
          .find((t) => t?.folderName === chip.templateFolder);
        if (template) handleSelectTemplate({ ...template, examplePrompt: null });
      } catch {
        designTemplateCatalogRef.current = null;
      }
    },
    [scratchEnhancementPending, handleScratchPromptChange, handleSelectTemplate],
  );

  /** Keep the gallery selection in sync if the template chip is removed elsewhere. */
  useEffect(() => {
    if (!selectedTemplateFolder) return;
    const folders = Array.isArray(promptConfig.frontendSkillFolders)
      ? promptConfig.frontendSkillFolders
      : [];
    if (!folders.includes(selectedTemplateFolder)) {
      setSelectedTemplateFolder(null);
    }
  }, [promptConfig, selectedTemplateFolder]);

  const handleEnhanceScratchPrompt = useCallback(async () => {
    const promptSnapshot = String(scratchPrompt || "");
    const prompt = promptSnapshot.trim();
    if (
      !prompt ||
      scratchEnhancementLoading ||
      scratchEnhancementPending ||
      scratchEnhanceInFlightRef.current
    )
      return;
    scratchEnhanceInFlightRef.current = true;
    const requestId = scratchEnhanceRequestRef.current + 1;
    scratchEnhanceRequestRef.current = requestId;

    setScratchEnhancementState({
      status: "loading",
      originalPrompt: promptSnapshot,
      enhancedPrompt: "",
    });
    try {
      const data = await enhanceScratchPromptApi({ prompt });
      const enhancedPrompt =
        typeof data?.enhancedPrompt === "string" ? data.enhancedPrompt.trim() : "";
      if (scratchEnhanceRequestRef.current !== requestId) return;
      if (!enhancedPrompt) {
        throw new Error("Empty enhanced prompt");
      }
      setScratchPrompt(enhancedPrompt);
      setScratchEnhancementState({
        status: "pending",
        originalPrompt: promptSnapshot,
        enhancedPrompt,
      });
    } catch (err) {
      if (scratchEnhanceRequestRef.current !== requestId) return;
      resetScratchEnhancementState();
      toast.error(err?.error || err?.message || "Failed to enhance prompt");
    } finally {
      if (scratchEnhanceRequestRef.current === requestId) {
        scratchEnhanceInFlightRef.current = false;
      }
    }
  }, [
    scratchPrompt,
    scratchEnhancementLoading,
    scratchEnhancementPending,
    resetScratchEnhancementState,
    setScratchPrompt,
  ]);

  const handleAcceptScratchEnhancement = useCallback(() => {
    if (!scratchEnhancementPending) return;
    resetScratchEnhancementState();
  }, [scratchEnhancementPending, resetScratchEnhancementState]);

  const handleUndoScratchEnhancement = useCallback(() => {
    if (!scratchEnhancementPending) return;
    setScratchPrompt(scratchEnhancementState.originalPrompt);
    resetScratchEnhancementState();
  }, [
    scratchEnhancementPending,
    scratchEnhancementState.originalPrompt,
    resetScratchEnhancementState,
    setScratchPrompt,
  ]);

  useEffect(() => {
    if (method === "scratch") return;
    if (scratchEnhancementStatus !== "idle") {
      resetScratchEnhancementState();
    }
  }, [method, scratchEnhancementStatus, resetScratchEnhancementState]);

  useEffect(() => {
    if (!scratchEnhancementPending) return;
    if (scratchPrompt === scratchEnhancementState.enhancedPrompt) return;
    resetScratchEnhancementState();
  }, [
    scratchPrompt,
    scratchEnhancementPending,
    scratchEnhancementState.enhancedPrompt,
    resetScratchEnhancementState,
  ]);

  const onboardingOAuthReturnTo = useMemo(() => {
    if (method !== "migrate" && method !== "feedback") return undefined;
    return `/projects/onboarding/${method}`;
  }, [method]);

  const persistOnboardingDraftStep = useCallback(
    (stepOverride) => {
      if (!draftHydrated) return;
      saveOnboardingDraft({
        v: ONBOARDING_DRAFT_VERSION,
        step: stepOverride,
        hasMovedPastStep1: true,
        hubMode,
        hubProjectId,
        name,
        description,
        method,
        backendLockAgentMode,
        backendInfraStack,
        backendDeployMode,
        scratchPrompt,
        websiteUrl,
        brandColors,
        fontStyle,
        brandTones,
        industry,
        developmentRepoUrl,
        branch,
      });
    },
    [
      draftHydrated,
      hubMode,
      hubProjectId,
      name,
      description,
      method,
      backendLockAgentMode,
      backendInfraStack,
      backendDeployMode,
      scratchPrompt,
      websiteUrl,
      brandColors,
      fontStyle,
      brandTones,
      industry,
      developmentRepoUrl,
      branch,
    ],
  );

  const flushOnboardingDraftForOAuth = useCallback(() => {
    persistOnboardingDraftStep(4);
  }, [persistOnboardingDraftStep]);

  const migrateCardErrors = useMemo(() => {
    if (method !== "migrate") return {};
    return gitJiraRef.current?.validateCreate?.(integrationsLoading) ?? {};
  }, [method, integrationsLoading, gitJiraDraft]);

  const feedbackCardErrors = useMemo(() => {
    if (method !== "feedback") return {};
    return feedbackJiraRef.current?.validateCreate?.(integrationsLoading) ?? {};
  }, [method, integrationsLoading, gitJiraDraft]);

  const canContinueFromStep4 = useMemo(() => {
    if (method === "blank") return false;
    if (method === "zip") return Boolean(zipFile);
    if (method === "figma") return true;
    if (method === "feedback") return Object.keys(feedbackCardErrors).length === 0;
    if (method === "scratch") return scratchPrompt.trim().length > 0;
    if (method === "migrate") {
      return Object.keys(migrateCardErrors).length === 0;
    }
    return true;
  }, [method, zipFile, scratchPrompt, migrateCardErrors, feedbackCardErrors]);
  const projectExistsConflict = Boolean(name.trim()) && !slugData.loading && !slugData.available;
  const canSubmitFromStep4 = canContinueFromStep4 && !slugData.loading && slugData.available;

  const validateSlugNow = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return false;
    if (
      project?.id &&
      String(project?.name || "")
        .trim()
        .toLowerCase() === trimmedName.toLowerCase()
    ) {
      return true;
    }

    try {
      setSlugData((prev) => ({ ...prev, loading: true }));
      const data = await checkProjectSlugAvailability({ name: trimmedName });
      const available = Boolean(data?.available);
      setSlugData({
        loading: false,
        available,
        suggestedSlug: data?.suggestedSlug || "",
      });
      return available;
    } catch {
      setSlugData({ loading: false, available: false, suggestedSlug: "" });
      return false;
    }
  }, [name, project?.id, project?.name]);

  useEffect(() => {
    if (step !== 4) return;
    if (!name.trim()) return;
    void validateSlugNow();
  }, [step, name, validateSlugNow]);

  useEffect(() => {
    if (method !== "migrate" && Object.keys(migrateValidationErrors).length > 0) {
      setMigrateValidationErrors({});
    }
  }, [method, migrateValidationErrors]);

  useEffect(() => {
    if (method !== "migrate") return;
    const nextDevRaw =
      gitJiraRef.current?.getDevelopmentRepoUrl?.() ?? gitJiraDraft?.developmentRepoUrlInput ?? "";
    const nextPrimary = primaryDevelopmentRepoPath(nextDevRaw);
    setDevelopmentRepoUrl((prev) => (prev === nextPrimary ? prev : nextPrimary));
  }, [method, gitJiraDraft]);

  const handleZipDrop = useCallback((event) => {
    event.preventDefault();
    setIsDragActive(false);
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip")) {
      toast.error("Please upload a ZIP file");
      return;
    }
    setZipFile(file);
  }, []);

  /** Scratch + migrate: poll until previewReady; returns ZIP-aligned preview handles. */
  const waitForOnboardPreviewWithAgentPhases = useCallback(
    async ({ projectId, slug, releaseId, trackScratchPhases = false }) => {
      const safeSlug = String(slug || "").trim();
      const rid = Number(releaseId);
      const pid = Number(projectId);
      if (!safeSlug || !Number.isInteger(rid) || rid < 1) {
        throw new Error("Missing slug or release id for preview.");
      }
      const startedAt = Date.now();
      let agentTerminal = false;
      while (shouldContinueAgentUiPoll(startedAt, SCRATCH_AGENT_POLL_TIMEOUT_MS)) {
        const st = await clientLinkFetchAgentStatus(safeSlug, rid);
        let raw = normalizeBackendAgentStatus(st?.status);

        if (st?.error === "poll_failed" && Number.isInteger(pid) && pid > 0) {
          try {
            const projectRow = await fetchProjectById(pid);
            const scratchRaw = normalizeBackendAgentStatus(projectRow?.scratchAgentStatus);
            if (isBackendAgentFailureTerminal(scratchRaw)) {
              throw buildOnboardAgentFailureError(st, scratchRaw);
            }
            if (!raw && scratchRaw) {
              raw = scratchRaw;
            }
          } catch (err) {
            if (err instanceof Error && err.message.includes("Scratch agent failed")) {
              throw err;
            }
          }
        }

        if (isOnboardAgentStatusFailure(st, raw)) {
          if (st?.zipOnboardPreviewFailed) {
            throw new Error(
              st?.zipOnboardPreviewError ||
                "Preview failed after ZIP upload. Check preview.log in the project folder or try again.",
            );
          }
          if (st?.scratchPreviewFailed) {
            throw new Error(
              "Preview build failed after the agent finished. Check server logs or try again.",
            );
          }
          throw buildOnboardAgentFailureError(st, raw);
        }

        if (trackScratchPhases && !agentTerminal) {
          if (isBackendAgentSuccessTerminal(raw)) {
            agentTerminal = true;
            setScratchAgentPhase("finished");
          } else if (raw === "CREATING") {
            setScratchAgentPhase("creating");
          } else if (raw) {
            setScratchAgentPhase("running");
          }
        } else if (trackScratchPhases && agentTerminal) {
          if (st?.scratchPreviewBuilding || (st?.previewPort != null && !st?.previewDevListening)) {
            setScratchAgentPhase("merging_building_preview");
          } else if (!st?.previewReady) {
            setScratchAgentPhase("finalizing_preview");
          }
        }

        if (st?.previewReady) {
          const agentDoneForScratch =
            !trackScratchPhases || agentTerminal || isBackendAgentSuccessTerminal(raw);
          if (trackScratchPhases && !agentDoneForScratch) {
            await new Promise((resolve) => setTimeout(resolve, SCRATCH_AGENT_POLL_INTERVAL_MS));
            continue;
          }
          let previewUrl = String(st?.previewUrl || "").trim();
          let previewPort =
            st?.previewPort != null && Number(st.previewPort) > 0 ? Number(st.previewPort) : null;
          let workflowId = st?.workflowId ? String(st.workflowId).trim() : "";
          if (!previewUrl) {
            try {
              const data = await fetchPublicProjectBySlug(safeSlug);
              previewUrl = extractLivePreviewUrlFromPublicPayload(data) || "";
            } catch {
              /* optional */
            }
          }
          if (!previewUrl && previewPort > 0) {
            previewUrl = `http://localhost:${previewPort}/`;
          }
          if (!previewUrl && workflowId && Number.isInteger(pid) && pid > 0) {
            try {
              const terminal = await consumeDeploymentWorkflowStream(pid, workflowId);
              const fromMeta =
                terminal?.meta?.previewUrl && String(terminal.meta.previewUrl).trim();
              if (fromMeta) previewUrl = fromMeta;
              else if (terminal?.phase === "preview_ready" && previewPort > 0) {
                previewUrl = `http://localhost:${previewPort}/`;
              }
            } catch {
              /* stream optional */
            }
          }
          return { previewUrl, previewPort, workflowId };
        }

        await new Promise((resolve) => setTimeout(resolve, SCRATCH_AGENT_POLL_INTERVAL_MS));
      }
      throw new Error("Preview initialization timed out.");
    },
    [],
  );

  /** After launchpad invite accepted: verify access, start migrate, open Project Details. */
  const handleMigrateInvitationAccepted = useCallback(async () => {
    const ctx = migrateOnboardingContext;
    const projectId = Number(project?.id || ctx?.projectId);
    const releaseId = Number(ctx?.releaseId);
    if (
      !Number.isInteger(projectId) ||
      projectId < 1 ||
      !Number.isInteger(releaseId) ||
      releaseId < 1
    ) {
      toast.error("Missing project or release. Go back and try again.");
      return;
    }

    setSubmitting(true);
    setMigrateAwaitingInvitation(false);
    setAgentStatusText("Verifying GitHub access…");
    let navigatedToDetails = false;

    try {
      const readiness = await fetchCursorAgentGithubReadiness(projectId);
      const accessPayload = migrateGithubAccessFromReadiness(readiness, {
        gitRepoPath: project?.gitRepoPath ?? ctx?.launchpadRepoPath ?? ctx?.primaryLaunchpad?.label,
      });
      if (accessPayload) {
        setMigrateAccessPayload(accessPayload);
        setMigrateAccessDialogOpen(true);
        setMigrateAwaitingInvitation(true);
        setAgentStatusText("");
        return;
      }

      setAgentStatusText("Starting Build Frontend App…");
      clearOnboardingDraft();
      navigate(buildMigrateOnboardingDetailsPath(projectId), {
        replace: true,
        state: { migrateOnboardingPending: { releaseId } },
      });
      navigatedToDetails = true;

      const migrateStart = await startMigrateOnboardingAgent(projectId, { releaseId });
      const agentId =
        migrateStart?.agentId != null
          ? String(migrateStart.agentId).trim()
          : migrateStart?.id != null
            ? String(migrateStart.id).trim()
            : "";
      if (agentId) {
        persistMigrateOnboardingStreamHandoff(projectId, { releaseId, agentId });
      }
      toast.success("Build Frontend App started. Watch progress in Releases or Web App → App.");
    } catch (err) {
      const accessFromApi = parseMigrateGithubAccessError(err, {
        gitRepoPath: project?.gitRepoPath ?? ctx?.launchpadRepoPath ?? ctx?.primaryLaunchpad?.label,
      });
      if (accessFromApi) {
        setMigrateAccessPayload(accessFromApi);
        setMigrateAccessDialogOpen(true);
        setMigrateAwaitingInvitation(true);
      }
      if (!accessFromApi) {
        toast.error(err?.error || err?.message || "Failed to start Build Frontend App");
        if (!navigatedToDetails) setStep(4);
      }
      setAgentStatusText("");
    } finally {
      setSubmitting(false);
    }
  }, [migrateOnboardingContext, project?.id, project?.gitRepoPath, navigate, clearOnboardingDraft]);

  const handleInitialize = useCallback(async () => {
    const trimmedName = name.trim();
    if (trimmedName.length < 3) {
      setStep(1);
      toast.error("Project name is required");
      return;
    }

    setSubmitting(true);
    if (method === "scratch") {
      setScratchAgentPhase("preparing");
    } else {
      setAgentStatusText("Preparing onboarding...");
    }
    try {
      const slugAvailable = await validateSlugNow();
      if (!slugAvailable) {
        setStep(1);
        toast.error("Project name already exists. Please choose another name.");
        if (method === "scratch") {
          setScratchAgentPhase(null);
          setAgentStatusText("");
        }
        return;
      }

      let feedbackJiraInitFields = null;
      if (method === "feedback") {
        const cardErrors = feedbackJiraRef.current?.validateCreate?.(integrationsLoading) ?? {};
        if (Object.keys(cardErrors).length > 0) {
          setFeedbackValidationErrors(cardErrors);
          toast.error("Connect Jira and select a Jira project to continue");
          return;
        }
        feedbackJiraInitFields = buildFeedbackJiraInitFields(
          feedbackJiraRef.current?.getCreatePayload?.(),
          gitJiraDraft,
        );
        if (!feedbackJiraInitFields.jiraConnectionId || !feedbackJiraInitFields.jiraProjectKey) {
          setFeedbackValidationErrors({
            ...(!feedbackJiraInitFields.jiraConnectionId
              ? { integrations: "Select a Jira site for this project" }
              : {}),
            ...(!feedbackJiraInitFields.jiraProjectKey
              ? { jiraProjectKey: "Select a Jira project from the list" }
              : {}),
          });
          toast.error("Connect Jira and select a Jira project to continue");
          return;
        }
        setFeedbackValidationErrors({});
      }

      /** Capture migrate form while step-4 card is still mounted (setStep(5) unmounts it). */
      let migrateInitSnapshot = null;
      if (method === "migrate") {
        const cardErrors = gitJiraRef.current?.validateCreate?.(integrationsLoading) ?? {};
        if (Object.keys(cardErrors).length > 0) {
          setMigrateValidationErrors(cardErrors);
          toast.error("Please fix the migrate configuration");
          return;
        }
        const remoteBranchErrors = (await gitJiraRef.current?.validateDevBranchesRemote?.()) ?? {};
        if (Object.keys(remoteBranchErrors).length > 0) {
          setMigrateValidationErrors(remoteBranchErrors);
          toast.error("Please fix the migrate configuration");
          return;
        }
        const createPayload = gitJiraRef.current?.getCreatePayload?.() ?? {};
        const branch =
          String(gitJiraRef.current?.getPrimaryDevBranchRef?.() ?? "").trim() ||
          primaryDevBranchFromGitJiraDraft(gitJiraDraft);
        if (!branch) {
          setMigrateValidationErrors({
            developmentRepoUrl: "Choose a branch for your repository.",
          });
          toast.error("Choose a branch for your repository.");
          return;
        }
        migrateInitSnapshot = { createPayload, branch };
        setMigrateValidationErrors({});
      }

      setStep(5);

      let ensuredProject = project;
      if (!ensuredProject?.id) {
        const createBody = withBackendCloudPrefs(
          withOptionalPromptConfig(
            withHubProjectId(
              withOptionalDescription({ name: trimmedName }, description),
              hubProjectId,
            ),
          ),
          backendCloudPrefs,
        );
        if (method === "migrate" && migrateInitSnapshot) {
          const { createPayload } = migrateInitSnapshot;
          if (createPayload.gitRepoPath) {
            createBody.gitRepoPath = String(createPayload.gitRepoPath).trim();
          }
          createBody.developmentRepoUrl = String(
            createPayload.developmentRepoUrl ?? developmentRepoUrl,
          ).trim();
          if (Object.prototype.hasOwnProperty.call(createPayload, "githubConnectionId")) {
            createBody.githubConnectionId = createPayload.githubConnectionId;
          }
          if (Object.prototype.hasOwnProperty.call(createPayload, "bitbucketConnectionId")) {
            createBody.bitbucketConnectionId = createPayload.bitbucketConnectionId;
          }
          if (Object.prototype.hasOwnProperty.call(createPayload, "jiraConnectionId")) {
            createBody.jiraConnectionId = createPayload.jiraConnectionId;
          }
          if (createPayload.jiraProjectKey) {
            createBody.jiraProjectKey = String(createPayload.jiraProjectKey).trim();
          }
          createBody.importUiFromDevelopmentRepo = true;
        }
        ensuredProject = await createProject(createBody);
        setProject(ensuredProject);
      } else {
        const hubId = hubProjectIdForCreatePayload(hubProjectId);
        if (hubId && !linkedHubProjectIdOf(ensuredProject)) {
          ensuredProject = await updateProject(ensuredProject.id, { projectId: hubId });
          setProject(ensuredProject);
        }
      }
      await finalizeOnboardingPromptConfig(ensuredProject.id);

      const payload = { method };
      if (method === "scratch") {
        payload.prompt = buildScratchPromptWithDesignDetails({
          prompt: scratchPrompt,
          brandColors,
          fontStyle,
          brandTones,
          industry,
        });
        payload.websiteUrl = websiteUrl.trim() || undefined;
      }
      if (method === "migrate" && migrateInitSnapshot) {
        const { createPayload, branch } = migrateInitSnapshot;
        if (createPayload.gitRepoPath) {
          payload.gitRepoPath = String(createPayload.gitRepoPath).trim();
        }
        payload.developmentRepoUrl = String(
          createPayload.developmentRepoUrl ?? developmentRepoUrl,
        ).trim();
        if (Object.prototype.hasOwnProperty.call(createPayload, "githubConnectionId")) {
          payload.githubConnectionId = createPayload.githubConnectionId;
        }
        if (Object.prototype.hasOwnProperty.call(createPayload, "bitbucketConnectionId")) {
          payload.bitbucketConnectionId = createPayload.bitbucketConnectionId;
        }
        if (Object.prototype.hasOwnProperty.call(createPayload, "jiraConnectionId")) {
          payload.jiraConnectionId = createPayload.jiraConnectionId;
        }
        if (createPayload.jiraProjectKey) {
          payload.jiraProjectKey = String(createPayload.jiraProjectKey).trim();
        }
        payload.branch = branch;
      }
      if (method === "feedback" && feedbackJiraInitFields) {
        payload.jiraConnectionId = feedbackJiraInitFields.jiraConnectionId;
        payload.jiraProjectKey = feedbackJiraInitFields.jiraProjectKey;
        payload.feedbackConfigurations = { allowedDomains: [] };
      }
      const init = await initializeProjectOnboarding(ensuredProject.id, payload);
      await applyBackendCloudPreferences(ensuredProject.id, backendCloudPrefs);
      let zipUploadResult = null;
      if (method === "zip" && zipFile && init?.release?.id) {
        zipUploadResult = await uploadToRelease(init.release.id, zipFile);
      }
      const linkSlug = String(ensuredProject?.slug || slugData.suggestedSlug || "").trim();
      let previewQsZip = "";
      if (method === "zip" && zipUploadResult && linkSlug && init?.release?.id) {
        setAgentStatusText("Waiting for live preview…");
        const zipPreview = await waitForOnboardPreviewWithAgentPhases({
          projectId: ensuredProject.id,
          slug: linkSlug,
          releaseId: init.release.id,
          trackScratchPhases: false,
        });
        setAgentStatusText("");
        previewQsZip = buildOnboardPreviewQueryString(zipPreview);
      }

      if (method === "migrate" && init?.awaitingLaunchpadInvitation && init?.release?.id) {
        const launchpadPath =
          typeof init.launchpadRepoPath === "string" ? init.launchpadRepoPath.trim() : "";
        if (launchpadPath) {
          setProject((prev) => (prev ? { ...prev, gitRepoPath: launchpadPath } : prev));
        }
        setMigrateOnboardingContext({
          projectId: ensuredProject.id,
          releaseId: init.release.id,
          launchpadRepoPath: launchpadPath || null,
          primaryLaunchpad: init.primaryLaunchpad ?? null,
          primaryDevelopment: init.primaryDevelopment ?? null,
        });
        setMigrateAwaitingInvitation(true);
        setAgentStatusText("");
        toast.success("Launchpad repository is ready. Accept the GitHub invitation to continue.");
        return;
      }

      if (method === "migrate" && init?.release?.id && !init?.awaitingLaunchpadInvitation) {
        const readiness = await fetchCursorAgentGithubReadiness(ensuredProject.id);
        const accessPayload = migrateGithubAccessFromReadiness(readiness, {
          gitRepoPath: ensuredProject?.gitRepoPath ?? project?.gitRepoPath,
        });
        if (accessPayload) {
          setMigrateAccessPayload(accessPayload);
          setMigrateAccessDialogOpen(true);
          throw new Error(
            accessPayload.error || "GitHub access is required before Build Frontend App can start.",
          );
        }
      }

      let openingQs = "";
      if (method === "zip") {
        openingQs = previewQsZip;
      } else if (method === "scratch" && init?.release?.id) {
        openingQs = buildScratchAwaitPreviewSearch(init.release.id);
      }
      toast.success("Onboarding initialized");
      clearOnboardingDraft();
      if (method === "migrate" && ensuredProject?.id) {
        navigate(buildMigrateOnboardingDetailsPath(ensuredProject.id), {
          replace: true,
        });
      } else if (linkSlug && (method === "scratch" || method === "zip")) {
        navigate(`/projects/${encodeURIComponent(linkSlug)}${openingQs}`, {
          replace: true,
        });
      } else {
        navigate("/projects", { replace: true });
      }
    } catch (err) {
      toast.error(err?.error || err?.message || "Failed to initialize onboarding");
      setScratchAgentPhase(null);
      setAgentStatusText("");
      setStep(4);
    } finally {
      setSubmitting(false);
    }
  }, [
    project,
    name,
    description,
    validateSlugNow,
    hubMode,
    hubProjectId,
    method,
    backendCloudPrefs,
    scratchPrompt,
    websiteUrl,
    brandColors,
    fontStyle,
    brandTones,
    industry,
    developmentRepoUrl,
    integrationsLoading,
    gitJiraDraft,
    zipFile,
    navigate,
    waitForOnboardPreviewWithAgentPhases,
    withOptionalPromptConfig,
    finalizeOnboardingPromptConfig,
  ]);

  const migrateIntegrationCard = useMemo(() => {
    if (method !== "migrate") return null;
    return (
      <ProjectGitJiraOAuthCard
        ref={gitJiraRef}
        variant="create"
        devRepositoriesLayout="edit"
        launchpadRepoAutoProvision
        enableJira={false}
        projectId={project?.id}
        integrationsPayload={integrationsPayload}
        integrationsLoading={integrationsLoading}
        validationErrors={migrateValidationErrors}
        syncKey={project?.id ? `onboarding-${project.id}` : "onboarding-create"}
        oauthReturnTo={onboardingOAuthReturnTo}
        onBeforeOAuthRedirect={flushOnboardingDraftForOAuth}
        onCreateFieldsChange={setGitJiraDraft}
        initialCreateDraft={gitJiraDraft}
      />
    );
  }, [
    method,
    project?.id,
    integrationsPayload,
    integrationsLoading,
    migrateValidationErrors,
    onboardingOAuthReturnTo,
    flushOnboardingDraftForOAuth,
    gitJiraDraft,
  ]);

  const feedbackIntegrationCard = useMemo(() => {
    if (method !== "feedback") return null;
    return (
      <ProjectGitJiraOAuthCard
        ref={feedbackJiraRef}
        variant="edit"
        jiraOnly
        projectId={project?.id}
        editProject={project}
        integrationsPayload={integrationsPayload}
        integrationsLoading={integrationsLoading}
        validationErrors={feedbackValidationErrors}
        syncKey={project?.id ? `onboarding-feedback-${project.id}` : "onboarding-feedback"}
        oauthReturnTo={onboardingOAuthReturnTo}
        onBeforeOAuthRedirect={flushOnboardingDraftForOAuth}
        onCreateFieldsChange={setGitJiraDraft}
      />
    );
  }, [
    method,
    project?.id,
    project,
    integrationsPayload,
    integrationsLoading,
    feedbackValidationErrors,
    onboardingOAuthReturnTo,
    flushOnboardingDraftForOAuth,
  ]);

  const promptSkillsConfig = (
    <OnboardingFrontendFoldersConfig
      value={promptConfig}
      onChange={setPromptConfig}
      onSaveCustomSkillWithoutProject={(skill) =>
        upsertPendingCustomCursorPack(setPendingCustomCursorSkills, skill)
      }
      onSaveCustomRuleWithoutProject={(rule) =>
        upsertPendingCustomCursorPack(setPendingCustomCursorRules, rule)
      }
      pendingCustomSkills={pendingCustomCursorSkills}
      pendingCustomRules={pendingCustomCursorRules}
    />
  );

  return (
    <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col justify-center space-y-6 px-4 py-6 md:px-6">
      <StepProgressHeader
        steps={visibleOnboardingSteps(isBlankOnboarding ? "blank" : method)}
        step={step}
      />

      <div className="space-y-6">
        {step === 1 && (
          <div key="step-1" className="space-y-5 animate-in fade-in-0 zoom-in-95 duration-300">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
                {hubMode === "hub" ? "Import from Hub" : "Name your project"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {hubMode === "hub"
                  ? "Pick an existing project from your Hub workspace."
                  : "You can change this later."}
              </p>
            </div>
            {hubMode === "hub" && (
              <div className="space-y-2">
                <Label>Hub Project</Label>
                <TooltipProvider delayDuration={200}>
                  <Select
                    disabled={hubProjectSelectFullyDisabled}
                    value={hubProjectId || undefined}
                    onValueChange={setHubProjectId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select hub project" />
                    </SelectTrigger>
                    <SelectContent>
                      {hubProjects.map((item) => {
                        const extId = hubProjectIdOf(item);
                        const alreadyImported = importedHubProjectIdSet.has(extId);
                        const label = hubProjectTitleOf(item) || extId;
                        if (alreadyImported) {
                          return (
                            <TooltipPrimitive.Root key={extId}>
                              <TooltipTrigger asChild>
                                <SelectItem
                                  value={extId}
                                  disabled
                                  className={cn(
                                    "cursor-not-allowed opacity-60 data-disabled:pointer-events-auto",
                                  )}
                                >
                                  {label}
                                </SelectItem>
                              </TooltipTrigger>
                              <TooltipContent
                                side="right"
                                sideOffset={6}
                                className="z-300 max-w-56 text-balance"
                              >
                                This project is already created
                              </TooltipContent>
                            </TooltipPrimitive.Root>
                          );
                        }
                        return (
                          <SelectItem key={extId} value={extId}>
                            {label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </TooltipProvider>
                {hubProjectSelectFullyDisabled ? (
                  <p className="text-xs text-muted-foreground">
                    Every hub project is already linked to Launchpad. Use Create New or remove an
                    existing project to import again.
                  </p>
                ) : null}
                {shouldShowSlugStatus && !slugData.loading && !slugData.available ? (
                  <p className="text-xs font-medium text-destructive">
                    A project with this name already exists. Select a different hub project.
                  </p>
                ) : null}
              </div>
            )}
            {hubMode === "manual" || hubMode === "blank" ? (
              <div className="space-y-2">
                <Label htmlFor="onboarding-project-name">Project name</Label>
                <div className="relative">
                  <Input
                    id="onboarding-project-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Customer onboarding portal"
                    className={shouldShowSlugStatus && slugData.loading ? "pr-10" : undefined}
                  />
                  {shouldShowSlugStatus && slugData.loading ? (
                    <Loader2
                      className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
                      aria-hidden
                    />
                  ) : null}
                </div>
                {shouldShowSlugStatus && !slugData.loading && !slugData.available ? (
                  <p className="text-xs font-medium text-destructive">
                    Project is already exists. Please choose a different project name.
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="onboarding-project-description">
                Short description{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="onboarding-project-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A portal where new clients complete onboarding tasks"
              />
              <p className="text-xs text-muted-foreground">
                A sentence to help your team recognize it.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => {
                  if (hubMode === "hub") {
                    setHubMode("manual");
                    setHubProjectId("");
                  } else {
                    setHubMode("hub");
                  }
                }}
              >
                {hubMode === "hub" ? "Create new instead" : "Already in Hub? Import it instead"}
              </Button>
              <Button
                type="button"
                className="min-w-22 transition-all duration-200"
                disabled={!canContinueStep1 || submitting}
                onClick={() => {
                  if (hubMode === "blank") setHubMode("manual");
                  setHasMovedPastStep1(true);
                  setStep(2);
                  navigate("/projects/onboarding", { replace: true });
                }}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div key="step-2" className="space-y-5 animate-in fade-in-0 zoom-in-95 duration-300">
            <InitMethodSelector
              method={method}
              onSelect={handleMethodSelect}
              disabled={submitting}
            />
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                className="min-w-22 transition-all duration-200"
                disabled={submitting}
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button
                type="button"
                className="min-w-22 transition-all duration-200"
                onClick={() => {
                  if (method === "blank") {
                    void handleStartBlank();
                    return;
                  }
                  if (method === "migrate") {
                    setStep(3);
                    return;
                  }
                  persistOnboardingDraftStep(4);
                  setStep(4);
                  navigate(`/projects/onboarding/${method}`, { replace: true });
                }}
                disabled={
                  !canContinueFromStep2 || submitting || (method === "blank" && !canStartBlank)
                }
              >
                {method === "blank" && submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                {method === "blank" && submitting ? "Creating…" : "Continue"}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div key="step-3" className="space-y-5 animate-in fade-in-0 zoom-in-95 duration-300">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
                Backend and cloud preferences
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Choose how the release-lock backend agent and cloud infrastructure should work for
                this project. You can change these later in Project Details.
              </p>
            </div>

            <BackendCloudPreferencesStep
              backendLockAgentMode={backendLockAgentMode}
              onBackendLockAgentModeChange={setBackendLockAgentMode}
              backendInfraStack={backendInfraStack}
              onBackendInfraStackChange={setBackendInfraStack}
              backendDeployMode={backendDeployMode}
              onBackendDeployModeChange={setBackendDeployMode}
              disabled={submitting}
            />

            <PromptSkillsCollapsible
              open={promptSkillsOpen}
              onOpenChange={setPromptSkillsOpen}
              subtitle="Set frontend prompt and skill/rule packs before creating the project."
            >
              {promptSkillsConfig}
            </PromptSkillsCollapsible>

            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                className="min-w-22 transition-all duration-200"
                disabled={submitting}
                onClick={() => {
                  setStep(2);
                  navigate("/projects/onboarding", { replace: true });
                }}
              >
                Back
              </Button>
              <Button
                type="button"
                className="min-w-22 transition-all duration-200"
                onClick={() => {
                  persistOnboardingDraftStep(4);
                  setStep(4);
                  navigate(`/projects/onboarding/${method}`, {
                    replace: true,
                  });
                }}
                disabled={submitting}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div key="step-4" className="space-y-5 animate-in fade-in-0 zoom-in-95 duration-300">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
                {method === "scratch" ? "Describe your idea" : "Configure your setup"}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {method === "scratch"
                  ? "Tell us what you want and we'll build a first version."
                  : (CONFIGURE_PHASE_DESCRIPTION[method] ?? CONFIGURE_PHASE_DESCRIPTION.zip)}
              </p>
            </div>

            <MethodSetupPanel
              method={method}
              zipFile={zipFile}
              isDragActive={isDragActive}
              onZipChange={setZipFile}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragActive(false);
              }}
              onDrop={handleZipDrop}
              scratchPrompt={scratchPrompt}
              setScratchPrompt={handleScratchPromptChange}
              websiteUrl={websiteUrl}
              setWebsiteUrl={setWebsiteUrl}
              brandColors={brandColors}
              setBrandColors={setBrandColors}
              fontStyle={fontStyle}
              setFontStyle={setFontStyle}
              brandTones={brandTones}
              setBrandTones={setBrandTones}
              industry={industry}
              setIndustry={setIndustry}
              migrateIntegrationCard={migrateIntegrationCard}
              feedbackIntegrationCard={feedbackIntegrationCard}
              enhanceLoading={scratchEnhancementLoading}
              enhanceState={scratchEnhancementStatus}
              onEnhancePrompt={handleEnhanceScratchPrompt}
              onAcceptEnhancement={handleAcceptScratchEnhancement}
              onUndoEnhancement={handleUndoScratchEnhancement}
              starterChips={IDEA_STARTER_CHIPS}
              selectedStarterChipId={starterChipId}
              onStarterChipSelect={(chip) => void handleStarterChipSelect(chip)}
              promptError={scratchPromptError}
              promptTextareaRef={scratchPromptTextareaRef}
              extraContext={promptSkillsConfig}
              templateGallery={
                <TemplateGallery
                  selectedFolder={selectedTemplateFolder}
                  onSelect={(template) => {
                    const chip = IDEA_STARTER_CHIPS.find(
                      (c) => c.templateFolder === template?.folderName,
                    );
                    setStarterChipId(chip?.id ?? null);
                    handleSelectTemplate(template);
                  }}
                />
              }
            />

            {method !== "scratch" ? (
              <PromptSkillsCollapsible
                open={promptSkillsOpen}
                onOpenChange={setPromptSkillsOpen}
                subtitle="Set frontend prompt and skill/rule packs before creating the project."
              >
                {promptSkillsConfig}
              </PromptSkillsCollapsible>
            ) : null}

            {projectExistsConflict ? (
              <p className="text-sm font-medium text-destructive">
                A project with this name already exists. Please go back and choose a different
                project name.
              </p>
            ) : null}

            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                className="min-w-22 transition-all duration-200"
                disabled={submitting}
                onClick={() => {
                  const prevStep = method === "migrate" ? 3 : 2;
                  persistOnboardingDraftStep(prevStep);
                  setStep(prevStep);
                  navigate("/projects/onboarding", { replace: true });
                }}
              >
                Back
              </Button>
              <Button
                type="button"
                className="min-w-32 transition-all duration-200"
                onClick={() => {
                  if (method === "scratch" && !scratchPrompt.trim()) {
                    setScratchPromptError("Describe your idea to continue.");
                    scratchPromptTextareaRef.current?.focus();
                    return;
                  }
                  void handleInitialize();
                }}
                disabled={
                  submitting ||
                  (method === "scratch"
                    ? projectExistsConflict || slugData.loading
                    : !canSubmitFromStep4)
                }
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                Create project
              </Button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div key="step-5" className="space-y-5 animate-in fade-in-0 zoom-in-95 duration-300">
            <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-linear-to-br from-primary/10 via-background to-muted/50 p-6 shadow-md md:p-8">
              <div
                className={cn(
                  "mx-auto max-w-2xl text-center",
                  method !== "scratch" || !scratchAgentPhase
                    ? migrateAwaitingInvitation && method === "migrate"
                      ? ""
                      : "pr-14 md:pr-20"
                    : "",
                )}
              >
                <div className="flex items-center justify-center gap-2">
                  {!(
                    (method === "migrate" && migrateAwaitingInvitation) ||
                    (method === "scratch" && scratchAgentPhase)
                  ) ? (
                    <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
                  ) : null}
                  <h3 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
                    {method === "migrate" && migrateAwaitingInvitation
                      ? "Accept GitHub invitation"
                      : "Setting up your project"}
                  </h3>
                </div>
                {method === "migrate" && migrateAwaitingInvitation ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Open the launchpad repository link below and accept the collaborator invite,
                    then continue.
                  </p>
                ) : null}
                {agentStatusText ? (
                  <div className="mt-4 flex items-start justify-center gap-2.5 text-left sm:items-center">
                    {method === "scratch" && scratchAgentPhase ? (
                      <ScratchPhaseStatusIcon phase={scratchAgentPhase} className="h-4 w-4" />
                    ) : null}
                    <TextShimmerWave
                      key={agentStatusText}
                      duration={1}
                      spread={1}
                      zDistance={1}
                      scaleDistance={1.1}
                      rotateYDistance={20}
                      className="min-h-8"
                    >
                      {agentStatusText}
                    </TextShimmerWave>
                  </div>
                ) : null}
              </div>

              <div className="mt-8 rounded-xl border bg-card/95 p-5 shadow-sm backdrop-blur-sm md:p-6">
                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Project name
                    </p>
                    <p className="mt-1.5 text-lg font-semibold text-foreground">
                      {name.trim() || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Description
                    </p>
                    <p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {description.trim() || "—"}
                    </p>
                  </div>
                  <div className="space-y-2 border-t border-border/80 pt-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Initialization method
                      </span>
                      <span className="inline-flex items-center rounded-full bg-primary/12 px-3 py-1 text-sm font-medium text-primary">
                        {INIT_OPTIONS.find((o) => o.id === method)?.label ?? method}
                      </span>
                    </div>
                    {method === "scratch" ? (
                      <p className="text-sm text-muted-foreground">
                        This may take up to 30 minutes.
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2 border-t border-border/80 pt-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Backend mode
                      </span>
                      <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm font-medium text-foreground">
                        {formatBackendLockAgentModeLabel(backendLockAgentMode)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Cloud infra
                      </span>
                      <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm font-medium text-foreground">
                        {formatBackendInfraLabel(backendInfraStack, backendDeployMode)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {method === "migrate" && migrateAwaitingInvitation ? (
                <div className="mt-6 space-y-4 rounded-xl border bg-card/95 p-5 text-left shadow-sm backdrop-blur-sm md:p-6">
                  {(() => {
                    const launchpadUrl =
                      typeof migrateOnboardingContext?.primaryLaunchpad?.url === "string"
                        ? migrateOnboardingContext.primaryLaunchpad.url.trim()
                        : "";
                    const launchpadLabel =
                      typeof migrateOnboardingContext?.primaryLaunchpad?.label === "string"
                        ? migrateOnboardingContext.primaryLaunchpad.label.trim()
                        : "";
                    return (
                      <>
                        <p className="text-sm leading-relaxed text-foreground">
                          Please accept the GitHub project invitation at{" "}
                          {launchpadUrl ? (
                            <a
                              href={launchpadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-primary underline underline-offset-2"
                            >
                              {launchpadLabel || launchpadUrl.replace(/^https?:\/\//i, "")}
                            </a>
                          ) : (
                            "your launchpad repository"
                          )}{" "}
                          or check your mail for the invitation.
                        </p>
                        {(() => {
                          const devLabel =
                            typeof migrateOnboardingContext?.primaryDevelopment?.label === "string"
                              ? migrateOnboardingContext.primaryDevelopment.label.trim()
                              : "";
                          if (!devLabel) return null;
                          return (
                            <p className="text-sm leading-relaxed text-muted-foreground">
                              You will also need access to your development repository:{" "}
                              <span className="font-medium text-foreground">{devLabel}</span>
                            </p>
                          );
                        })()}
                      </>
                    );
                  })()}
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    disabled={submitting}
                    onClick={handleMigrateInvitationAccepted}
                  >
                    {submitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    ) : null}
                    I&apos;ve accepted the invitation
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {blankCreating ? (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
          <p className="text-sm font-medium text-foreground">Creating project…</p>
        </div>
      ) : null}

      <MigrateFrontendRepoAccessDialog
        open={migrateAccessDialogOpen}
        onOpenChange={setMigrateAccessDialogOpen}
        payload={migrateAccessPayload}
        fallbackGitRepoPath={project?.gitRepoPath}
      />
    </div>
  );
};

export default CreateProject;
