import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  clientLinkScratchRecover,
  clientLinkRefreshLiveBuild,
  clientLinkPullWorkspaceFromGit,
  clientLinkWorkspaceSyncStatus,
  consumeDeploymentWorkflowStream,
  ensurePublicProjectPreview,
  fetchPublicProjectPreviewStatus,
  fetchPublicProjectBySlug,
  fetchPublicCursorAgentGithubReadiness,
  cursorAgentGithubGateMessage,
  publicLockRelease,
  publicReleaseBackendAgentClarify,
  publicReleaseBackendAgentQuestions,
  restorePublicProjectLivePreview,
  sendPublicProjectPreviewHeartbeat,
  switchProjectVersion,
  uploadPreviewScreen,
} from "@/api";
import { getLatestPriorBaseline } from "@/lib/releaseLifecycle";
import { UNTRUSTED_PREVIEW_IFRAME_SANDBOX } from "@/lib/embedPreviewSandbox.constants";
import { normalizeReleaseStatus } from "@/lib/releasePresentation";
import { watchClientLinkAgentStream } from "@/lib/clientLinkAgentStream";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { logger } from "@/utils/logger";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { EmbeddedFeedbackWidget } from "@/features/feedback-widget";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SelectClientLinkVersion } from "./components/SelectClientLinkVersion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, ExternalLink, FileText, Loader2, Sparkles } from "lucide-react";
import { AssistantMarkdown } from "@/components/chat/AssistantMarkdown";
import { ClientLinkChatPanel } from "./components/ClientLinkChatPanel";
import { VoiceDemoCursorOverlay } from "./components/VoiceDemoCursorOverlay";
import { ClientLinkEmailGateDialog } from "./components/ClientLinkEmailGateDialog";
import { ClientLinkResponsivePreviewShell } from "./components/ClientLinkResponsivePreviewShell";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { cn, formatProjectVersionLabel } from "@/lib/utils";
import { usePanelRef } from "react-resizable-panels";
import {
  ClientLinkPreviewPicker,
  canAccessIframeDocument,
} from "./components/ClientLinkPreviewPicker";
import { ClientLinkPreviewLoaderOverlay } from "./components/ClientLinkPreviewLoaderOverlay";
import { ClientLinkPreviewCompilingChip } from "./components/ClientLinkPreviewCompilingChip";
import {
  PREVIEW_AUTO_HEAL_MAX_ATTEMPTS,
  getAutoHealDelayMs,
  shouldAttemptAutoSoftReload,
} from "./clientLinkPreviewAutoSoftReload.util";
import {
  canCallPreviewEnsureNow,
  isPreviewEnsureRateLimitedError,
  nextPreviewBootWaitTick,
  PREVIEW_PORT_RECOVERY_PROBE_MS,
  resolvePreviewEnsureThrottleUntil,
  shouldPollPreviewStatusDuringBoot,
  shouldProbeEmbedDuringBoot,
  shouldReEnsureDuringBoot,
  shouldRetryEnsureAfterFailedStatus,
  shouldSkipOverlappingPreviewBoot,
} from "./clientLinkPreviewBootWait.util";
import { ClientLinkPreviewAddressBar } from "./components/ClientLinkPreviewAddressBar";
import { ClientLinkPreviewErrorBanner } from "./components/ClientLinkPreviewErrorBanner";
import { ClientLinkPreviewToolbar } from "./components/ClientLinkPreviewToolbar";
import { ClientLinkPreviewToolbarExpandableButton } from "./components/ClientLinkPreviewToolbarExpandableButton";
import { ClientLinkPreviewLogsDialog } from "./components/ClientLinkPreviewLogsDialog";
import { ClientLinkSendToFigmaDialog } from "./components/ClientLinkSendToFigmaDialog";
import { ClientLinkExportScreensDialog } from "./components/ClientLinkExportScreensDialog";
import {
  ClientLinkPreviewToolsDock,
  usePreviewToolsDockVisible,
} from "./components/ClientLinkPreviewToolsDock";
import { defaultPreviewScreenName } from "@/lib/previewFullPageScreenshot.util";
import { ClientLinkCommentOverlay } from "./components/ClientLinkCommentOverlay";
import { ClientLinkCommentSidebar } from "./components/ClientLinkCommentSidebar";
import { useComments } from "@/hooks/useComments";
import { formatCommentConversationOnly } from "@/lib/previewCommentCategory.util";
import { anchorToPickedElementContext } from "@/lib/previewElementAnchor.util";
import { CLIENT_LINK_LIFECYCLE } from "@/constants/releaseLifecycleGuide";
import { CursorAgentGithubGateAlert } from "@/components/agent/CursorAgentGithubGateAlert";
import {
  CLIENT_LINK_AGENT_WORKING_OVERLAY,
  CLIENT_LINK_FIRST_VERSION_BUILD,
  CLIENT_LINK_PREVIEW_COLD_START,
  CLIENT_LINK_PREVIEW_IDLE_WAKE,
  CLIENT_LINK_PREVIEW_RECOVERY,
  CLIENT_LINK_PREVIEW_FAILURE_TITLES,
  CLIENT_LINK_BUILD_VERIFY_BANNER,
  appendPreviewDiagnosisToAgentPrompt,
  clientLinkPreviewBootMessage,
  isPreviewIdleWakeReason,
  LAUNCHPAD_SUPPORT_EMAIL,
  PREVIEW_CONTENT_LOAD_MESSAGES,
  PREVIEW_RELOAD_SERVER_ENABLE_DELAY_MS,
  PREVIEW_RELOAD_SERVER_STUCK_HINT_DELAY_MS,
  PREVIEW_REFRESH_BUILD_TIMEOUT_MS,
  PREVIEW_RESTART_AGENT_STUCK_DELAY_MS,
} from "./clientLinkPreviewRecovery.constants";
import { isPreviewContentLoadMessage } from "./clientLinkPreviewContentLoad.util";
import { buildPreviewErrorDocumentHtml } from "./clientLinkPreviewDiagnosis.util";
import { normalizeFirstVersionBuildError } from "./clientLinkFirstVersionError.util";
import {
  isReloadDevServerDisabled,
  resolvePreviewReloadAction,
} from "./clientLinkPreviewReload.util";
import {
  SECRET_RESTART_SOFT_DELAY_MS,
  createSecretRestartClickState,
  recordSecretRestartClick,
  resolveSecretRestartSoftAfterDelay,
} from "./clientLinkPreviewSecretRestart.util";
import {
  classifyPreviewFailure,
  extractIframePreviewFailureMessage,
  inspectDevIframePreviewSrc,
  reconcilePreviewConsoleWatch,
  isClientLinkPreviewLoaderBlocking,
  isDevIframePreviewSrc,
  isIframePortUnreachablePage,
  isIframePreviewBlankOrBroken,
  isIframePreviewContentReady,
  isIframePreviewErrorPage,
  isIframePreviewReadyEnough,
  iframeLooksLikeNextDev,
  looksLikeDevCompileErrorHtml,
  pollUntilEmbedPreviewFullyReady,
  pollUntilEmbedViteModulesReady,
  pollUntilIframePreviewContentReady,
  probeDevIframePreviewSrc,
  shouldMarkNextInAppCompile,
  waitForIframeLoadEvent,
  waitForIframePreviewNonce,
} from "@/lib/clientLinkPreviewHealth";
import { resolveNextInAppBrowsePath } from "@/lib/nextEmbedRoutePrefetch.util";
import {
  buildEmbeddedPreviewSrc,
  EMBED_ROUTE_MESSAGE_TYPE,
  isAuthBrowsePath,
  loadPersistedBrowsePath,
  loadPersistedCommentsMode,
  navigateEmbedIframeToAppRoute,
  navigateEmbedIframeToBrowsePath,
  parsePreviewUrlInput,
  previewRoutePathname,
  previewRoutesMatch,
  readIframeBrowsePath,
  iframeIsEmbedPortBreakout,
  resolvePreviewRefreshBrowsePath,
  sanitizeEmbedBrowsePath,
  savePersistedBrowsePath,
  savePersistedCommentsMode,
} from "@/lib/clientLinkEmbeddedPreviewSrc";
import {
  applyStagedStorageFromLocalStorage,
  bumpEmbedIframeLocationInPlace,
  restoreIframeStagedStorage,
  restoreIframeStagedStorageWithHydrationRetries,
  snapshotIframeStorageBundle,
  stageIframeSessionRestore,
} from "@/lib/clientLinkPreviewSessionSnapshot.util";
import { isPreviewEmbedHmrEnabled } from "@/lib/previewEmbedHmr";
import {
  attachPreviewBridge,
  getPreviewConsoleLines,
  isPreviewBridgeFrame,
  isPreviewBridgeSrc,
  registerPreviewEmbedOrigin,
  removeIframeWindowListener,
  subscribePreviewBridgeState,
  subscribePreviewConsole,
} from "@/lib/previewBridge";
import {
  isEmbedHmrWsMessage,
  waitForEmbedHmrUpdate,
  parseEmbedCompileProgressMessage,
} from "@/lib/clientLinkEmbedHmrWs";
import { createEmbedHmrWsFailureTracker } from "@/lib/clientLinkEmbedHmrWsRecovery.util";
import {
  createEmptyCompileProgress,
  formatCompileTheaterCopy,
  hasCompileTheaterProgress,
  mergeCompileProgress,
} from "@/lib/clientLinkCompileTheater.util";
import { useClientLinkPreviewRefresh } from "@/hooks/useClientLinkPreviewRefresh";
import { useClientLinkBuildVerify } from "@/hooks/useClientLinkBuildVerify";
import {
  getClientLinkVerifiedEmail,
  isPlausibleClientLinkEmail,
  isYorkInternalClientLinkEmail,
  setClientLinkVerifiedEmail,
} from "@/lib/clientLinkVerifiedEmail";
import { useAuth } from "@/context/AuthContext";
import { LaunchpadQuestionsCard } from "@/components/LaunchpadQuestionsCard";
import { BackendPlanAgentStatusBanner } from "@/components/release/BackendPlanAgentStatusBanner";
import {
  BACKEND_PLAN_AGENT_CONTROLS_DISABLED_HINT,
  getReleaseBackgroundAgentBlock,
  isBackendAgentFailureTerminal,
  isBackendAgentPollActive,
  isBackendAgentSuccessTerminal,
  isClientLinkAgentGenerationFailed,
  isClientLinkAgentUserStopped,
  isReleaseBackendAgentFailed,
  isReleaseBackendAgentRunning,
  isReleaseEffectivelyLocked,
  isReleaseLockPending,
  RELEASE_BACKGROUND_AGENT_CHAT_DISABLED_HINT,
  shouldPollReleaseBackendLockCompletion,
} from "@/lib/backendAgentStatus";
import {
  buildProjectBackendCodePath,
  mergeOnboardPreviewReadySearch,
  clearScratchAwaitPreviewSearch,
} from "@/lib/onboardPreviewUrl";
import {
  classifyScratchAwaitFailure,
  resolvePreviewHandlesFromStatus,
  resolveScratchAwaitStatusMessage,
  shouldCompleteScratchAwait,
} from "@/lib/scratchOnboardPreviewComplete.util";
import {
  CLIENT_LINK_CHAT_PANEL_DEFAULT_SIZE,
  CLIENT_LINK_MOBILE_LAYOUT_MAX_WIDTH_PX,
  computeScratchBuildInProgress,
  computeScratchChatLayoutActive,
  computeScratchChatPanelDefaultSizes,
  computeShowAiChatToolbarButton,
  scheduleEnsureChatPanelExpanded,
} from "@/lib/clientLinkScratchChatLayout.util";
import { useMaxWidthMediaQuery } from "@/hooks/useMaxWidthMediaQuery";
import { auditPreviewPipeline } from "@/lib/previewPipelineAudit";
import { resolveClientLinkPreviewSyncEarlyExit } from "@/lib/clientLinkPreviewSync.util";
import {
  DEFAULT_LOCK_DEVELOPER_SUBMODULE_PATH,
  isPlausibleDevRepoPath,
} from "@/lib/releaseLockForm";
import { buildReleaseManagementDetailsPath } from "@/lib/releaseNavigation";
import { ReleaseLockDevRepoSummary } from "@/components/release/ReleaseLockDevRepoSummary";
import { SkipBackendLockAgentCheckbox } from "@/components/release/SkipBackendLockAgentCheckbox";
import { ClientLinkLockDeployOptions } from "./components/ClientLinkLockDeployOptions";

const PREVIEW_MOBILE_W = 390;
const PREVIEW_TABLET_W = 820;
const PREVIEW_MIN_W = 320;
const CLIENT_LINK_PREVIEW_PANEL_ID = "client-link-preview-pane";
const CLIENT_LINK_CHAT_PANEL_ID = "client-link-chat-pane";
const COMMENT_SIDEBAR_WIDTH_STORAGE_KEY = "client-link-comment-sidebar-width";
const COMMENT_SIDEBAR_WIDTH_DEFAULT = 384;
const COMMENT_SIDEBAR_WIDTH_MIN = 280;
const BACKEND_PLAN_AGENT_POLL_MS = 5_000;

/** Load persisted comment sidebar width from session storage. */
function loadCommentSidebarWidthPx() {
  if (typeof window === "undefined") return COMMENT_SIDEBAR_WIDTH_DEFAULT;
  try {
    const stored = window.sessionStorage.getItem(COMMENT_SIDEBAR_WIDTH_STORAGE_KEY);
    const widthPx = Number(stored);
    if (Number.isFinite(widthPx) && widthPx >= COMMENT_SIDEBAR_WIDTH_MIN) {
      return widthPx;
    }
  } catch {
    /* private mode / quota */
  }
  return COMMENT_SIDEBAR_WIDTH_DEFAULT;
}

/** Same-origin iframe path only — never set iframe src to a raw upstream URL. */
function resolveProxiedPreviewUrl(port) {
  const n = Number(port);
  if (Number.isInteger(n) && n > 0 && n <= 65535) {
    return `/embedded/${n}/?embed_frame=1&embed_port=${n}`;
  }
  return "";
}

const SCRATCH_ONBOARD_STREAM_TIMEOUT_MS = 20 * 60 * 1000;

const EMPTY_ONBOARD_LIVE_PREVIEW = {
  previewDevListening: false,
  previewReady: false,
  scratchPreviewBuilding: false,
  zipOnboardPreviewBuilding: false,
  agentRunning: false,
};

const ZIP_ONBOARD_PREVIEW_FAILED_MESSAGE =
  "Preview failed after ZIP upload. Check preview.log in the project folder or try again.";

/** Cursor / onboard agent still in flight (for live dev preview while no active version). */
function isOnboardAgentStillRunning(st) {
  if (!st) return false;
  if (isClientLinkAgentUserStopped(st)) return false;
  if (isBackendAgentFailureTerminal(st?.status)) return false;
  if (isClientLinkAgentGenerationFailed(st)) return false;
  if (st?.generationState === "running") return true;
  const raw = normalizeBackendAgentStatus(st?.status);
  if (!raw) return false;
  if (isBackendAgentSuccessTerminal(raw) || isBackendAgentFailureTerminal(raw)) {
    return false;
  }
  return true;
}

/** Port from ?previewPort= or port segment of ?previewUrl= (iframe still uses /embedded/:port/). */
function resolvePreviewPortNumber({
  previewPortParam,
  previewUrlParam,
  publicProjectPort,
  deferPublicPort = false,
}) {
  const raw = String(previewPortParam ?? "").trim();
  if (/^\d{1,5}$/.test(raw)) {
    const n = Number(raw);
    if (n >= 1 && n <= 65535) return n;
  }
  const urlRaw = String(previewUrlParam ?? "").trim();
  if (urlRaw) {
    try {
      const u = new URL(/^https?:\/\//i.test(urlRaw) ? urlRaw : `http://${urlRaw}`);
      const p = u.port ? Number(u.port) : u.protocol === "https:" ? 443 : 80;
      if (Number.isInteger(p) && p >= 1 && p <= 65535) return p;
    } catch {
      /* fall through */
    }
  }
  if (deferPublicPort) return null;
  if (publicProjectPort != null && Number(publicProjectPort) > 0) {
    return Number(publicProjectPort);
  }
  return null;
}

function ClientLinkPageSkeleton() {
  return (
    <div
      className="flex h-dvh max-h-dvh min-h-0 w-full overflow-hidden bg-muted/30"
      role="status"
      aria-busy="true"
      aria-label="Loading project"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 flex-1 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
        <Skeleton className="min-h-0 flex-1 rounded-xl" />
      </div>
      <div className="hidden w-[min(32%,420px)] min-w-[280px] flex-col gap-4 border-l border-border bg-card p-4 md:flex">
        <Skeleton className="h-6 w-40 rounded-md" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-16 w-[85%] rounded-xl" />
          <Skeleton className="ml-auto h-12 w-[70%] rounded-xl" />
          <Skeleton className="h-20 w-[90%] rounded-xl" />
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}

export const ClientLink = () => {
  const { user } = useAuth();
  const { projectSlug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const showControls = searchParams.get("c") !== "false";
  const openCommentsFromUrl = searchParams.get("comments") === "1";
  const awaitScratchPreview = searchParams.get("awaitScratchPreview") === "1";
  const scratchOnboardReleaseId = searchParams.get("releaseId");

  const [publicProject, setPublicProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locking, setLocking] = useState(false);
  const [lockClarifySending, setLockClarifySending] = useState(false);
  const [lockClarifyQuestions, setLockClarifyQuestions] = useState(null);
  const [lockConfirmOpen, setLockConfirmOpen] = useState(false);
  const [lockDevelopmentRepoUrl, setLockDevelopmentRepoUrl] = useState("");
  const [lockEmail, setLockEmail] = useState("");
  const [lockDeployAfterBackend, setLockDeployAfterBackend] = useState(false);
  const [lockDeployEnvironmentId, setLockDeployEnvironmentId] = useState("");
  const [skipLockAgentOperations, setSkipLockAgentOperations] = useState(false);
  const [lockUserPrompt, setLockUserPrompt] = useState("");
  const [identityEmailBump, setIdentityEmailBump] = useState(0);
  const [lockGithubGateMessage, setLockGithubGateMessage] = useState(null);
  const [lockGithubGateLoading, setLockGithubGateLoading] = useState(false);
  const [onboardPreviewWaiting, setOnboardPreviewWaiting] = useState(false);
  const [onboardPreviewStatus, setOnboardPreviewStatus] = useState("");
  const onboardPreviewStatusRef = useRef(onboardPreviewStatus);
  onboardPreviewStatusRef.current = onboardPreviewStatus;
  const [previewContextReleaseId, setPreviewContextReleaseId] = useState(null);
  const [chatOpen, setChatOpen] = useState(awaitScratchPreview);
  /** One-shot auto-open for scratch create redirect (`awaitScratchPreview=1`). */
  const scratchChatAutoOpenedRef = useRef(false);
  /** Avoid re-seeding verified email on every scratch onboarding render. */
  const scratchEmailSeededRef = useRef(false);
  const chatPanelRef = usePanelRef();
  const previewIframeRef = useRef(null);
  const isInitialProjectLoadRef = useRef(true);
  const prevIframeSrcRef = useRef(undefined);
  const prevIframeLoadSrcRef = useRef(null);
  const devEmbedLiveRef = useRef({ gate: false, ready: false });
  const feedbackWidgetRef = useRef(null);
  const [feedbackCapturing, setFeedbackCapturing] = useState(false);
  const [feedbackRecording, setFeedbackRecording] = useState(false);
  const [visualPickMode, setVisualPickMode] = useState(false);
  /** Figma-style UI comment pick mode (separate from AI element pick). */
  const [commentMode, setCommentMode] = useState(false);
  const [commentSidebarOpen, setCommentSidebarOpen] = useState(false);
  const [commentSidebarWidthPx, setCommentSidebarWidthPx] = useState(loadCommentSidebarWidthPx);
  const [pendingCommentPlacement, setPendingCommentPlacement] = useState(null);
  /** Ignore Radix outside-dismiss briefly after opening the comment sidebar. */
  const commentSidebarDismissGuardUntilRef = useRef(0);
  const [pickedElementContext, setPickedElementContext] = useState(null);
  /** Voice mode demo cursor (window-fixed rect) over the preview, or null. */
  const [voiceDemoCursor, setVoiceDemoCursor] = useState(null);
  /** One-shot draft injected into AI chat (e.g. Fix with AI from a comment). */
  const [chatComposerSeed, setChatComposerSeed] = useState(null);
  /** Queued for next chat send: same image as preview replace, for Cursor + repo. */
  const [stagedChatReplacementImage, setStagedChatReplacementImage] = useState(null);
  /** Design reference screenshots for next chat (Cursor multimodal; not tied to pick). */
  const [stagedChatReferenceImages, setStagedChatReferenceImages] = useState([]);
  const [previewIframeAccessible, setPreviewIframeAccessible] = useState(null);
  /** False until iframe has real content (dev proxy may return 502 while server starts). */
  const [previewIframeReady, setPreviewIframeReady] = useState(false);
  /** Sticky once the embed document looks like Next — used to cover in-app compile. */
  const [isNextEmbedPreview, setIsNextEmbedPreview] = useState(false);
  const isNextEmbedPreviewRef = useRef(false);
  /** In-app Next route compile overlay — must not clear boot `previewIframeReady`. */
  const [nextInAppCompiling, setNextInAppCompiling] = useState(false);
  const nextInAppCompilingRef = useRef(false);
  const [previewIframeLoadMessage, setPreviewIframeLoadMessage] = useState("");
  /** Embed compile theater: forward-only module count + current file. */
  const [compileTheaterProgress, setCompileTheaterProgress] = useState(null);
  const [compileTheaterNow, setCompileTheaterNow] = useState(() => Date.now());
  /** True while rebooting after idle soft-stop (API `wakeReason: "inactivity"`). */
  const [previewIdleWake, setPreviewIdleWake] = useState(false);
  /** Chat agent turn busy + live status line (from ClientLinkChatPanel). */
  const [chatAgentWorking, setChatAgentWorking] = useState({ active: false, statusLine: "" });
  const [previewBootFailed, setPreviewBootFailed] = useState(false);
  /** @type {[null | { kind: string, summary: string, detail: string, source: string }, Function]} */
  const [previewFailureDiagnosis, setPreviewFailureDiagnosis] = useState(null);
  const [previewConsoleLines, setPreviewConsoleLines] = useState([]);
  const previewFailureDiagnosisRef = useRef(null);
  previewFailureDiagnosisRef.current = previewFailureDiagnosis;
  const previewIframeReadyRef = useRef(false);
  previewIframeReadyRef.current = previewIframeReady;
  const blockingPreviewFailure =
    Boolean(previewFailureDiagnosis) && previewFailureDiagnosis.blocking !== false;
  /** Hide opaque loader so iframe Vite/proxy error page is visible for this session. */
  const [previewOverlayPeeled, setPreviewOverlayPeeled] = useState(false);
  /** srcdoc HTML built from the exact preview-port response (reliable when embed overlay is blank). */
  const [previewErrorDocumentHtml, setPreviewErrorDocumentHtml] = useState("");
  const [onboardingRecovery, setOnboardingRecovery] = useState({
    eligible: false,
    mode: null,
    figmaConversionId: null,
  });
  /** While no active version: early PM2 / scratch agent preview flags from agent-status API. */
  const [onboardLivePreview, setOnboardLivePreview] = useState(EMPTY_ONBOARD_LIVE_PREVIEW);
  const [onboardingRetryBusy, setOnboardingRetryBusy] = useState(false);
  const [previewLoadStuckRecoveryAvailable, setPreviewLoadStuckRecoveryAvailable] = useState(false);
  const [previewReloadActionEnabled, setPreviewReloadActionEnabled] = useState(false);
  const [previewAgentStuckRecoveryAvailable, setPreviewAgentStuckRecoveryAvailable] =
    useState(false);
  const [firstVersionBuildError, setFirstVersionBuildError] = useState(null);
  const [autoAgentRecoverySettled, setAutoAgentRecoverySettled] = useState(false);
  const autoAgentRecoveryAttemptedRef = useRef(false);
  const autoAgentEmailPromptedRef = useRef(false);
  const [onboardingRetryEmailOpen, setOnboardingRetryEmailOpen] = useState(false);
  const [onboardingRetryEmail, setOnboardingRetryEmail] = useState("");
  /** Version selected for iframe preview (may differ from live active). */
  const [previewMeta, setPreviewMeta] = useState(null);
  /** Bumped after chat merge/revert + project reload so iframe URL changes when build URL is unchanged (cache bust). */
  const [previewRefreshNonce, setPreviewRefreshNonce] = useState(0);
  /** True while chat is running post-revert preview sync (covers iframe until server is healthy). */
  const [revertPreviewSyncActive, setRevertPreviewSyncActive] = useState(false);
  /** Bumped on explicit preview reload so embed-HMR iframes remount (mount key is otherwise stable). */
  const [previewRemountGen, setPreviewRemountGen] = useState(0);
  const [previewRefreshBrowsePath, setPreviewRefreshBrowsePath] = useState("");
  const iframeBrowsePathRef = useRef("");
  const lastNonAuthBrowsePathRef = useRef("");
  /** Screens opened this session; seeds the Export screens picker. */
  const visitedBrowsePathsRef = useRef(new Set());
  const pendingSessionSnapshotRef = useRef(null);
  const [latchedDevPreviewPort, setLatchedDevPreviewPort] = useState(null);
  const livePreviewInProgressRef = useRef(false);
  const devEmbedBootPortRef = useRef(null);
  const [previewRefreshBusy, setPreviewRefreshBusy] = useState(false);
  const previewRefreshBusyRef = useRef(false);
  /** Server workspace behind launchpad main after Preview Desktop pushed. */
  const [workspaceBehindRemote, setWorkspaceBehindRemote] = useState(false);
  const [updateFromGitBusy, setUpdateFromGitBusy] = useState(false);
  const [desktopControlHeld, setDesktopControlHeld] = useState(false);
  const workspaceSyncPollGenRef = useRef(0);
  /** Bumped to cancel in-flight iframe content polls when src/remount changes. */
  const previewContentPollGenRef = useRef(0);
  /** Grace period after refresh during which embed HMR WS errors are ignored. */
  const previewRefreshHmrGraceUntilRef = useRef(0);
  /** Reset when post-lock refresh runs so read-only prior baseline preview can auto-load. */
  const postLockAutoPreviewAttemptedRef = useRef(false);
  /** Tracks prior hasActiveVersion to tear down stale live preview after lock. */
  const hadActiveVersionForLivePreviewRef = useRef(false);
  /**
   * True while an agent turn is settling (backend merge + workspace sync). The backend briefly
   * disrupts Vite's HMR socket during this window, so the embed reports a transient "failed"
   * that must NOT trigger the scary "connection lost" toast or an auto hard reload — the
   * post-turn refresh already drives any needed reload deliberately.
   */
  const clientLinkSettleActiveRef = useRef(false);
  const embedHmrWsRecoveryRef = useRef(createEmbedHmrWsFailureTracker());
  const forceRemountPreviewIframeRef = useRef(async () => {});
  const softReloadPreviewIframeRef = useRef(async () => false);
  /** Secret triple-click Reload preview → force npm restart. */
  const secretRestartClickStateRef = useRef(createSecretRestartClickState());
  const secretRestartSoftTimerRef = useRef(
    /** @type {ReturnType<typeof setTimeout> | null} */ (null),
  );
  /** Bounded auto heal attempts (blank / port unreachable) for the current preview port+src. */
  const autoHealAttemptCountRef = useRef(0);
  /** Combined release notes + what to review (client view only). */
  const [releaseDetailsOpen, setReleaseDetailsOpen] = useState(false);
  const [previewLogsOpen, setPreviewLogsOpen] = useState(false);
  const [previewStageWidth, setPreviewStageWidth] = useState(0);
  /** Current path inside the preview iframe (same-origin / proxied only). */
  const [iframeBrowsePath, setIframeBrowsePath] = useState("");
  const [responsivePreset, setResponsivePreset] = useState(
    /** @type {'desktop' | 'tablet' | 'mobile' | 'custom'} */ ("desktop"),
  );
  const [responsiveCustomWidth, setResponsiveCustomWidth] = useState(PREVIEW_TABLET_W);

  /**
   * Public API returns root `versions` as the active build(s) but often omits `isActive`
   * on those objects; nested `releases[].versions` may also omit flags. Treat any
   * version id present on root `versions` as active so iframe, lock UI, and selector match.
   */
  const activeVersionIds = React.useMemo(() => {
    const ids = (publicProject?.versions ?? []).map((v) => v.id).filter((id) => id != null);
    return new Set(ids);
  }, [publicProject?.versions]);

  const rootReleaseIdFromActiveVersion = React.useMemo(() => {
    const v =
      publicProject?.versions?.find((x) => x.isActive || activeVersionIds.has(x.id)) ??
      publicProject?.versions?.[0];
    return v?.releaseId != null ? Number(v.releaseId) : null;
  }, [publicProject?.versions, activeVersionIds]);

  const releases = React.useMemo(() => {
    if (!publicProject) return [];
    const raw =
      publicProject.releases?.length > 0
        ? publicProject.releases
        : publicProject.versions?.length
          ? [
              {
                id: publicProject.id,
                name: "Version",
                versions: publicProject.versions,
              },
            ]
          : [];
    return raw.map((r) => ({
      ...r,
      versions: (r.versions || []).map((v) => ({
        ...v,
        isActive: Boolean(v.isActive) || (v.id != null && activeVersionIds.has(v.id)),
      })),
    }));
  }, [publicProject, activeVersionIds]);

  const activeRelease =
    releases.find((r) => normalizeReleaseStatus(r) === "active") ||
    releases.find((r) => (r.versions || []).some((v) => v.isActive)) ||
    releases[0];

  const selectedReleaseId = publicProject?.releases?.length ? activeRelease?.id : null;

  /** Oldest release id — scratch prompt applies only to this release’s chat (first version / base release). */
  const firstProjectReleaseId = React.useMemo(() => {
    if (!Array.isArray(releases) || releases.length === 0) return null;
    const ids = releases.map((r) => Number(r?.id)).filter((n) => Number.isInteger(n) && n > 0);
    if (ids.length === 0) return null;
    return Math.min(...ids);
  }, [releases]);

  const effectiveChatReleaseId = React.useMemo(() => {
    if (previewContextReleaseId != null) return previewContextReleaseId;
    if (selectedReleaseId != null) return selectedReleaseId;
    if (firstProjectReleaseId != null) return firstProjectReleaseId;
    const onboardRid = Number(scratchOnboardReleaseId);
    if (Number.isInteger(onboardRid) && onboardRid > 0) return onboardRid;
    return rootReleaseIdFromActiveVersion;
  }, [
    previewContextReleaseId,
    selectedReleaseId,
    firstProjectReleaseId,
    scratchOnboardReleaseId,
    rootReleaseIdFromActiveVersion,
  ]);

  /** Slug + release + email resolver for AI SVG (backend proxy; same gate as chat). */
  const clientLinkAiSvgContext = useMemo(
    () => ({
      slug: typeof projectSlug === "string" ? projectSlug : "",
      releaseId: effectiveChatReleaseId,
      getClientEmail: getClientLinkVerifiedEmail,
    }),
    [projectSlug, effectiveChatReleaseId],
  );

  const effectiveReleaseForChat = React.useMemo(() => {
    const rid = effectiveChatReleaseId;
    if (rid == null) return null;
    return releases.find((r) => Number(r.id) === Number(rid)) ?? null;
  }, [releases, effectiveChatReleaseId]);

  const effectiveReleaseLocked =
    String(effectiveReleaseForChat?.status ?? "").toLowerCase() === "locked";

  const releaseBackgroundAgentBlock = React.useMemo(
    () => getReleaseBackgroundAgentBlock(effectiveReleaseForChat),
    [effectiveReleaseForChat],
  );

  const loadProject = useCallback(async () => {
    if (!projectSlug?.trim()) {
      setPublicProject(null);
      setLoading(false);
      isInitialProjectLoadRef.current = true;
      return;
    }
    try {
      if (!isInitialProjectLoadRef.current) {
        setLoading(true);
      }
      setPreviewContextReleaseId(null);
      setPreviewMeta(null);
      const slug = projectSlug.trim();
      if (isInitialProjectLoadRef.current) {
        await restorePublicProjectLivePreview(slug).catch(() => {});
        setPreviewRefreshNonce((n) => n + 1);
      }
      const data = await fetchPublicProjectBySlug(slug);
      setPublicProject(data);
    } catch (error) {
      logger.error("client_link_load_project", error);
      setPublicProject(null);
    } finally {
      setLoading(false);
      isInitialProjectLoadRef.current = false;
    }
  }, [projectSlug]);

  useEffect(() => {
    setLatchedDevPreviewPort(null);
    devEmbedBootPortRef.current = null;
  }, [projectSlug]);

  /** Fetch latest project JSON without full-page loading state or clearing preview context (post-chat / chat refresh). */
  const reloadProjectQuiet = useCallback(async () => {
    if (!projectSlug?.trim()) return;
    try {
      const data = await fetchPublicProjectBySlug(projectSlug);
      setPublicProject(data);
    } catch (error) {
      logger.error("client_link_refresh_project", error);
    }
  }, [projectSlug]);

  /** Apply finalized lock state without a full-page reload (clears stale live preview). */
  const applyPostLockProjectRefresh = useCallback((data) => {
    setPublicProject(data);
    setPreviewMeta(null);
    setPreviewContextReleaseId(null);
    setPreviewRefreshNonce((n) => n + 1);
    postLockAutoPreviewAttemptedRef.current = false;

    const freshReleases = data?.releases ?? [];
    const lockFinalized = freshReleases.some(
      (release) => isReleaseEffectivelyLocked(release) && Boolean(release?.backendAgentId?.trim()),
    );
    if (lockFinalized) {
      const activeRel = freshReleases.find((r) => normalizeReleaseStatus(r) === "active");
      toast.success(
        activeRel?.name
          ? `Release locked. ${activeRel.name} is now active — add the first revision when ready.`
          : "Release locked successfully.",
      );
    }
  }, []);

  useEffect(() => {
    isInitialProjectLoadRef.current = true;
    loadProject();
  }, [loadProject]);

  /** ZIP / onboarding: `previewUrl` from API or `previewPort` for direct dev-server URL */
  const previewPortParam = searchParams.get("previewPort");
  const previewUrlParam = searchParams.get("previewUrl");
  const workflowIdParam = searchParams.get("workflowId");
  const onboardPreviewQueryActive = Boolean(
    (previewPortParam || "").trim() ||
    (previewUrlParam || "").trim() ||
    (workflowIdParam || "").trim(),
  );

  /** Scratch create: SSE agent-events until preview is ready, then swap URL to preview params. */
  useEffect(() => {
    if (!awaitScratchPreview) return undefined;
    const slug = projectSlug?.trim();
    const rid = Number(scratchOnboardReleaseId);
    if (!slug || !Number.isInteger(rid) || rid < 1) return undefined;

    let cancelled = false;
    const streamAbort = new AbortController();
    setOnboardPreviewWaiting(true);
    setOnboardPreviewStatus("Setting things up…");

    const clearAwaitPreviewParams = () => {
      navigate(
        {
          pathname: location.pathname,
          search: clearScratchAwaitPreviewSearch(location.search),
        },
        { replace: true },
      );
    };

    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      streamAbort.abort();
      setOnboardPreviewWaiting(false);
      setOnboardPreviewStatus("");
      clearAwaitPreviewParams();
      toast.error("Preview initialization timed out.");
    }, SCRATCH_ONBOARD_STREAM_TIMEOUT_MS);

    const completeScratchAwaitPreview = (st, fallbackPort) => {
      const { previewPort, previewUrl, workflowId } = resolvePreviewHandlesFromStatus(st, {
        fallbackPort,
      });
      if (!previewPort && !previewUrl && !workflowId) return false;

      const nextSearch = mergeOnboardPreviewReadySearch(location.search, {
        previewUrl,
        previewPort,
        workflowId,
      });
      streamAbort.abort();
      navigate(
        {
          pathname: location.pathname,
          search: nextSearch,
        },
        { replace: true },
      );
      setOnboardPreviewWaiting(false);
      setOnboardPreviewStatus("");
      return true;
    };

    const handleScratchOnboardStatus = async (st) => {
      if (cancelled) return;

      const failure = classifyScratchAwaitFailure(st);
      if (failure.failed) {
        streamAbort.abort();
        setOnboardPreviewWaiting(false);
        setOnboardPreviewStatus("");
        clearAwaitPreviewParams();
        if (failure.reason === "preview_failed") {
          toast.error(
            "Preview build failed after the agent finished. Check server logs or try again.",
          );
        } else {
          toast.error(`Scratch agent failed (${failure.reason}).`);
        }
        return;
      }

      setOnboardPreviewStatus(resolveScratchAwaitStatusMessage(st));

      const initialFallbackPort =
        publicProject?.port != null && Number(publicProject.port) > 0
          ? Number(publicProject.port)
          : null;
      let decision = shouldCompleteScratchAwait(st, { fallbackPort: initialFallbackPort });

      if (!decision.complete && decision.waitingForPreview) {
        try {
          const data = await fetchPublicProjectBySlug(slug);
          const fetchedPort = data?.port > 0 ? Number(data.port) : null;
          if (fetchedPort) {
            decision = shouldCompleteScratchAwait(st, { fallbackPort: fetchedPort });
            if (decision.complete) {
              completeScratchAwaitPreview(st, fetchedPort);
              return;
            }
          }
        } catch {
          /* optional */
        }
      }

      if (!decision.complete) return;

      if (!completeScratchAwaitPreview(st, initialFallbackPort)) {
        try {
          const data = await fetchPublicProjectBySlug(slug);
          const fetchedPort = data?.port > 0 ? Number(data.port) : null;
          completeScratchAwaitPreview(st, fetchedPort);
        } catch {
          /* optional */
        }
      }
    };

    void watchClientLinkAgentStream({
      slug,
      releaseId: rid,
      signal: streamAbort.signal,
      onStatus: (st) => {
        void handleScratchOnboardStatus(st).catch((err) => {
          if (cancelled) return;
          logger.warn("scratch_onboard_preview_stream", {
            slug,
            err: err?.message || err,
          });
        });
      },
    }).catch((err) => {
      if (cancelled || err?.name === "AbortError") return;
      logger.warn("scratch_onboard_preview_stream", {
        slug,
        err: err?.message || err,
      });
    });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      streamAbort.abort();
    };
  }, [
    awaitScratchPreview,
    scratchOnboardReleaseId,
    projectSlug,
    publicProject?.port,
    navigate,
    location.pathname,
    location.search,
  ]);

  useEffect(() => {
    const workflowId = (workflowIdParam || "").trim();
    const raw = (previewPortParam || "").trim();
    const queryPort =
      /^\d+$/.test(raw) && Number(raw) >= 1 && Number(raw) <= 65535 ? Number(raw) : null;

    if (workflowId && queryPort && publicProject?.id) {
      setOnboardPreviewWaiting(true);
      setOnboardPreviewStatus("Starting preview…");
      let cancelled = false;
      const streamAbort = new AbortController();

      consumeDeploymentWorkflowStream(publicProject.id, workflowId, {
        signal: streamAbort.signal,
        onEvent: (evt) => {
          if (cancelled) return;
          if (evt?.message) setOnboardPreviewStatus(String(evt.message));
          if (evt?.phase === "preview_ready" || evt?.phase === "preview_waiting_for_client") {
            setOnboardPreviewWaiting(false);
          }
          if (evt?.phase === "error") {
            setOnboardPreviewWaiting(false);
            toast.error(evt?.message || "Preview failed");
          }
        },
      })
        .then((terminal) => {
          if (cancelled) return;
          if (terminal?.phase === "error") {
            toast.error(terminal?.message || "Preview failed");
          }
          setOnboardPreviewWaiting(false);
        })
        .catch(() => {
          if (cancelled) return;
          setOnboardPreviewWaiting(false);
        });

      return () => {
        cancelled = true;
        streamAbort.abort();
      };
    }

    if (!awaitScratchPreview) {
      setOnboardPreviewWaiting(false);
      setOnboardPreviewStatus("");
    }
  }, [previewPortParam, workflowIdParam, publicProject?.id, awaitScratchPreview]);

  const needsLockCompletionPoll = React.useMemo(
    () => shouldPollReleaseBackendLockCompletion(releases),
    [releases],
  );

  useEffect(() => {
    if (!projectSlug?.trim() || !needsLockCompletionPoll) return undefined;

    let cancelled = false;
    const pollBackendPlanAgent = async () => {
      if (cancelled) return;
      try {
        const data = await fetchPublicProjectBySlug(projectSlug);
        if (cancelled) return;
        const stillAwaiting = shouldPollReleaseBackendLockCompletion(data.releases ?? []);
        if (!stillAwaiting) {
          applyPostLockProjectRefresh(data);
          return;
        }
        setPublicProject(data);
      } catch (error) {
        logger.error("client_link_backend_agent_poll", error);
      }
    };

    void pollBackendPlanAgent();
    const intervalId = setInterval(() => void pollBackendPlanAgent(), BACKEND_PLAN_AGENT_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [projectSlug, needsLockCompletionPoll, applyPostLockProjectRefresh]);

  useEffect(() => {
    const onIdentityUpdated = () => setIdentityEmailBump((b) => b + 1);
    window.addEventListener("client-link-identity-updated", onIdentityUpdated);
    return () => window.removeEventListener("client-link-identity-updated", onIdentityUpdated);
  }, []);

  const hasVerifiedClientEmail = useMemo(() => {
    void identityEmailBump;
    return isPlausibleClientLinkEmail(getClientLinkVerifiedEmail());
  }, [identityEmailBump]);

  const emailGateInitialEmail = useMemo(() => {
    void identityEmailBump;
    const stored = getClientLinkVerifiedEmail();
    if (stored) return stored;
    const authEmail = typeof user?.email === "string" ? user.email.trim().toLowerCase() : "";
    return isPlausibleClientLinkEmail(authEmail) ? authEmail : "";
  }, [identityEmailBump, user?.email]);

  const showEmailGate = Boolean(publicProject && !loading && !hasVerifiedClientEmail);

  const showYorkInternalDashboardLink = useMemo(() => {
    void identityEmailBump;
    if (publicProject?.id == null) return false;
    const verifiedEmail = getClientLinkVerifiedEmail();
    const authEmail = typeof user?.email === "string" ? user.email.trim().toLowerCase() : "";
    return isYorkInternalClientLinkEmail(verifiedEmail) || isYorkInternalClientLinkEmail(authEmail);
  }, [identityEmailBump, publicProject?.id, user?.email]);

  useEffect(() => {
    if (!lockConfirmOpen) return;
    setLockEmail(getClientLinkVerifiedEmail());
    setLockDevelopmentRepoUrl("");
    setLockDeployAfterBackend(false);
    setLockDeployEnvironmentId("");
    setSkipLockAgentOperations(false);
  }, [lockConfirmOpen]);

  useEffect(() => {
    const slug = projectSlug?.trim();
    if (!lockConfirmOpen || !slug || skipLockAgentOperations) {
      setLockGithubGateMessage(null);
      setLockGithubGateLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLockGithubGateLoading(true);
    setLockGithubGateMessage(null);
    fetchPublicCursorAgentGithubReadiness(slug)
      .then((data) => {
        if (!cancelled) {
          setLockGithubGateMessage(cursorAgentGithubGateMessage(data));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLockGithubGateMessage("Could not check GitHub access. Try again in a moment.");
        }
      })
      .finally(() => {
        if (!cancelled) setLockGithubGateLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lockConfirmOpen, projectSlug, skipLockAgentOperations]);

  const hasDevelopmentRepo = Boolean(publicProject?.hasDevelopmentRepo);

  const lockEmailValid = React.useMemo(() => {
    return isPlausibleClientLinkEmail(lockEmail);
  }, [lockEmail]);

  const lockEmailIsYorkInternal = React.useMemo(
    () => isYorkInternalClientLinkEmail(lockEmail),
    [lockEmail],
  );

  useEffect(() => {
    if (!lockEmailIsYorkInternal) {
      setSkipLockAgentOperations(false);
    }
  }, [lockEmailIsYorkInternal]);

  const appendLockDeployOptions = useCallback(
    (lockOpts) => {
      if (!skipLockAgentOperations && lockDeployAfterBackend && lockDeployEnvironmentId.trim()) {
        lockOpts.deployEnvironmentId = lockDeployEnvironmentId.trim();
      }
      if (skipLockAgentOperations) {
        lockOpts.skipLockAgentOperations = true;
      }
      if (!skipLockAgentOperations && lockUserPrompt.trim()) {
        lockOpts.userPrompt = lockUserPrompt.trim();
      }
      return lockOpts;
    },
    [lockDeployAfterBackend, lockDeployEnvironmentId, skipLockAgentOperations, lockUserPrompt],
  );

  const lockDevRepoValid = React.useMemo(() => {
    if (hasDevelopmentRepo) return true;
    return isPlausibleDevRepoPath(lockDevelopmentRepoUrl);
  }, [hasDevelopmentRepo, lockDevelopmentRepoUrl]);

  const liveActiveVersionId = React.useMemo(() => {
    for (const r of releases) {
      const v = (r.versions || []).find((x) => x.isActive);
      if (v?.id != null) return Number(v.id);
    }
    return null;
  }, [releases]);

  /** Non-active version selected: static build on project port — do not boot live dev. */
  const isViewingVersionPreview = React.useMemo(() => {
    if (previewMeta?.versionId == null) return false;
    if (liveActiveVersionId == null) return true;
    return Number(previewMeta.versionId) !== Number(liveActiveVersionId);
  }, [previewMeta?.versionId, liveActiveVersionId]);

  const displayRelease = React.useMemo(() => {
    if (previewMeta?.releaseId != null) {
      const rel = releases.find((r) => Number(r.id) === Number(previewMeta.releaseId));
      if (rel) return rel;
    }
    return activeRelease;
  }, [releases, activeRelease, previewMeta]);

  /** Context for ClientFeedbacks rows (preview picker + chat release). */
  const feedbackWidgetReleaseAndVersion = React.useMemo(() => {
    const releaseId =
      previewMeta?.releaseId != null
        ? Number(previewMeta.releaseId)
        : effectiveChatReleaseId != null
          ? Number(effectiveChatReleaseId)
          : null;

    let projectVersionId = null;
    if (previewMeta?.versionId != null) {
      projectVersionId = Number(previewMeta.versionId);
    } else {
      const rid = Number.isInteger(releaseId) && releaseId > 0 ? releaseId : null;
      const rel = rid ? releases.find((r) => Number(r.id) === rid) : null;
      if (rel?.versions?.length) {
        const v = rel.versions.find((x) => x?.isActive) || rel.versions[0];
        if (v?.id != null) projectVersionId = Number(v.id);
      }
      if (
        projectVersionId == null &&
        Array.isArray(publicProject?.versions) &&
        publicProject.versions.length > 0
      ) {
        const v =
          publicProject.versions.find((x) => x.isActive || activeVersionIds.has(x.id)) ??
          publicProject.versions[0];
        if (v?.id != null) projectVersionId = Number(v.id);
      }
    }

    return {
      releaseId: Number.isInteger(releaseId) && releaseId > 0 ? releaseId : null,
      projectVersionId:
        Number.isInteger(projectVersionId) && projectVersionId > 0 ? projectVersionId : null,
    };
  }, [previewMeta, effectiveChatReleaseId, releases, publicProject?.versions, activeVersionIds]);

  const clientNote = displayRelease?.clientReleaseNote?.trim() || "";
  const showReviewChecklist = displayRelease?.showClientReviewSummary !== false;
  const aiReviewSummary =
    showReviewChecklist && (displayRelease?.clientReviewAiSummary?.trim() || "");
  const aiReviewSummaryAt = showReviewChecklist ? displayRelease?.clientReviewAiSummaryAt : null;

  const activeReleaseLocked = normalizeReleaseStatus(activeRelease) === "locked";

  const backendPlanAgentRunning = React.useMemo(
    () => isReleaseLockPending(activeRelease),
    [activeRelease],
  );

  const lockAwaitingQuestions = React.useMemo(
    () =>
      String(activeRelease?.backendAgentLockPhase || "")
        .trim()
        .toLowerCase() === "awaiting_questions",
    [activeRelease?.backendAgentLockPhase],
  );

  useEffect(() => {
    if (!lockAwaitingQuestions || activeRelease?.id == null) {
      setLockClarifyQuestions(null);
      return;
    }
    const snapshot = activeRelease?.backendAgentQuestionsSnapshot;
    if (Array.isArray(snapshot) && snapshot.length > 0) {
      setLockClarifyQuestions(snapshot);
      return;
    }
    const email = getClientLinkVerifiedEmail();
    if (!email) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await publicReleaseBackendAgentQuestions(activeRelease.id, email);
        if (cancelled) return;
        setLockClarifyQuestions(Array.isArray(data?.questions) ? data.questions : []);
      } catch {
        if (!cancelled) setLockClarifyQuestions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lockAwaitingQuestions, activeRelease?.id, activeRelease?.backendAgentQuestionsSnapshot]);

  const handleLockClarifySubmit = useCallback(
    async (prompt) => {
      if (!activeRelease?.id || !prompt?.trim()) return;
      const email = getClientLinkVerifiedEmail();
      if (!email) {
        toast.error("Verify your email to continue.");
        return;
      }
      setLockClarifySending(true);
      try {
        await publicReleaseBackendAgentClarify(activeRelease.id, email, prompt.trim());
        setLockClarifyQuestions(null);
        toast.success("Answers sent — backend agent continuing.");
        const data = await fetchPublicProjectBySlug(projectSlug);
        if (data) setPublicProject(data);
      } catch (err) {
        toast.error(err?.error || err?.message || "Could not send answers.");
      } finally {
        setLockClarifySending(false);
      }
    },
    [activeRelease?.id, projectSlug],
  );

  const hasAnyVersions = releases.some((r) => Array.isArray(r.versions) && r.versions.length > 0);
  const hasActiveStatusRelease = releases.some((r) => normalizeReleaseStatus(r) === "active");
  const hasActiveVersion = releases.some((r) => (r.versions || []).some((v) => v.isActive));

  /** Active release exists but no revision is live yet (e.g. 1.0.1 active, empty versions). */
  const activeReleaseAwaitingRevision = hasActiveStatusRelease && !hasActiveVersion;

  /** Locked/prior releases exist, nothing live, and no release is currently active. */
  const isPostLockIdleState = hasAnyVersions && !hasActiveVersion && !hasActiveStatusRelease;

  /** Read-only preview from the latest locked revision while waiting for a live build. */
  const showPriorLockedReadOnlyPreview = hasAnyVersions && !hasActiveVersion;

  const showLockAndFeedback = hasActiveVersion && selectedReleaseId != null;

  const previewCommentsEnabled = Boolean(
    showLockAndFeedback && projectSlug?.trim() && effectiveChatReleaseId != null,
  );

  const {
    filteredForSidebar: previewCommentThreads,
    pinsForCurrentPage: previewCommentPins,
    loading: previewCommentsLoading,
    error: previewCommentsError,
    statusFilter: previewCommentStatusFilter,
    setStatusFilter: setPreviewCommentStatusFilter,
    pageFilter: previewCommentPageFilter,
    setPageFilter: setPreviewCommentPageFilter,
    categoryFilter: previewCommentCategoryFilter,
    setCategoryFilter: setPreviewCommentCategoryFilter,
    focusedCommentId: focusedPreviewCommentId,
    setFocusedCommentId: setFocusedPreviewCommentId,
    selectedThreadId: selectedPreviewCommentThreadId,
    setSelectedThreadId: setSelectedPreviewCommentThreadId,
    createComment: createPreviewComment,
    replyToComment: replyToPreviewComment,
    setCommentStatus: setPreviewCommentStatus,
    updateCommentLogicBody: updatePreviewCommentLogicBody,
    removeComment: removePreviewComment,
    normalizedPath: previewCommentNormalizedPath,
  } = useComments({
    projectSlug,
    releaseId: feedbackWidgetReleaseAndVersion.releaseId ?? effectiveChatReleaseId,
    previewPath: iframeBrowsePath || "/",
    projectVersionId: feedbackWidgetReleaseAndVersion.projectVersionId,
    enabled: previewCommentsEnabled,
  });

  const openPreviewCommentCount = React.useMemo(
    () => previewCommentThreads.filter((comment) => comment.status === "open").length,
    [previewCommentThreads],
  );

  const chatBlockedReason = React.useMemo(() => {
    if (hasActiveVersion) return null;
    if (activeReleaseAwaitingRevision) return "awaiting_first_revision";
    if (hasAnyVersions) return "no_active_version";
    return null;
  }, [hasActiveVersion, hasAnyVersions, activeReleaseAwaitingRevision]);

  const isScratchOnboardingProject = Boolean(
    publicProject?.fromScratch || String(publicProject?.scratchPrompt || "").trim(),
  );

  /** Active scratch revision spawned before preview URL is ready (buildUrl stays "pending"). */
  const activeVersionBuildUrl = React.useMemo(() => {
    const fromRelease = releases.flatMap((r) => r.versions || []).find((v) => v.isActive)?.buildUrl;
    if (fromRelease != null) return String(fromRelease).trim();
    const root = publicProject?.versions?.[0]?.buildUrl;
    return root != null ? String(root).trim() : "";
  }, [releases, publicProject?.versions]);

  const activePendingScratchRevision =
    isScratchOnboardingProject && activeVersionBuildUrl === "pending";

  const scratchBuildInProgress = React.useMemo(
    () =>
      computeScratchBuildInProgress(
        isScratchOnboardingProject,
        activePendingScratchRevision,
        onboardLivePreview,
      ),
    [isScratchOnboardingProject, activePendingScratchRevision, onboardLivePreview],
  );

  const shouldWatchOnboardAgentStream =
    activePendingScratchRevision ||
    (!hasActiveVersion && !isPostLockIdleState) ||
    (onboardPreviewQueryActive &&
      !awaitScratchPreview &&
      !previewIframeReady &&
      !previewBootFailed);

  /** SSE agent-events so dashboard Client Link can mount live dev while scratch/agent runs. */
  useEffect(() => {
    const slug = projectSlug?.trim();
    const rid = effectiveChatReleaseId != null ? Number(effectiveChatReleaseId) : null;
    if (!slug || !Number.isInteger(rid) || rid < 1 || !shouldWatchOnboardAgentStream) {
      setOnboardLivePreview(EMPTY_ONBOARD_LIVE_PREVIEW);
      return undefined;
    }

    let cancelled = false;
    const streamAbort = new AbortController();

    void watchClientLinkAgentStream({
      slug,
      releaseId: rid,
      signal: streamAbort.signal,
      onStatus: (st) => {
        if (cancelled) return;
        if (st?.zipOnboardPreviewFailed) {
          const msg =
            String(st?.zipOnboardPreviewError || "").trim() || ZIP_ONBOARD_PREVIEW_FAILED_MESSAGE;
          setPreviewBootFailed(true);
          setPreviewIframeLoadMessage(msg);
          toast.error(msg);
          streamAbort.abort();
          return;
        }
        setOnboardLivePreview({
          previewDevListening: Boolean(st?.previewDevListening),
          previewReady: Boolean(st?.previewReady),
          scratchPreviewBuilding: Boolean(st?.scratchPreviewBuilding),
          zipOnboardPreviewBuilding: Boolean(st?.zipOnboardPreviewBuilding),
          agentRunning: isOnboardAgentStillRunning(st),
        });
      },
    }).catch(() => {});

    return () => {
      cancelled = true;
      streamAbort.abort();
      setOnboardLivePreview(EMPTY_ONBOARD_LIVE_PREVIEW);
    };
  }, [projectSlug, effectiveChatReleaseId, shouldWatchOnboardAgentStream]);

  const handleLock = useCallback(() => {
    if (!selectedReleaseId || activeReleaseLocked || backendPlanAgentRunning) return;
    setLockConfirmOpen(true);
  }, [selectedReleaseId, activeReleaseLocked, backendPlanAgentRunning]);

  const handleRetryBackendPlanAgent = useCallback(async () => {
    if (!selectedReleaseId || backendPlanAgentRunning) return;
    const email = getClientLinkVerifiedEmail() || lockEmail.trim().toLowerCase();
    if (!isPlausibleClientLinkEmail(email)) {
      setLockConfirmOpen(true);
      toast.error("Enter your email to retry locking this release.");
      return;
    }
    if (
      !skipLockAgentOperations &&
      !hasDevelopmentRepo &&
      !isPlausibleDevRepoPath(lockDevelopmentRepoUrl)
    ) {
      setLockConfirmOpen(true);
      toast.error("Enter a valid development repository to retry locking this release.");
      return;
    }
    if (!skipLockAgentOperations && lockGithubGateMessage) {
      toast.error(lockGithubGateMessage);
      return;
    }
    try {
      setLocking(true);
      const lockOpts = {
        developerSubmodulePath:
          activeRelease?.developerSubmodulePath?.trim() || DEFAULT_LOCK_DEVELOPER_SUBMODULE_PATH,
      };
      if (!hasDevelopmentRepo) {
        lockOpts.developmentRepoUrl = lockDevelopmentRepoUrl.trim();
      }
      appendLockDeployOptions(lockOpts);
      const res = await publicLockRelease(selectedReleaseId, email, lockOpts);
      setClientLinkVerifiedEmail(email);
      setLockConfirmOpen(false);
      setPreviewMeta(null);
      setPreviewContextReleaseId(null);
      toast.success(
        res?.message ?? "Retrying backend plan agent — the release will lock when it finishes.",
      );
      await reloadProjectQuiet();
    } catch (err) {
      toast.error(err?.error || err?.message || "Failed to retry backend plan agent");
    } finally {
      setLocking(false);
    }
  }, [
    selectedReleaseId,
    backendPlanAgentRunning,
    reloadProjectQuiet,
    lockEmail,
    hasDevelopmentRepo,
    lockDevelopmentRepoUrl,
    lockGithubGateMessage,
    activeRelease,
    appendLockDeployOptions,
  ]);

  const handleLockConfirm = useCallback(async () => {
    if (!selectedReleaseId || backendPlanAgentRunning) return;
    const email = lockEmail.trim().toLowerCase();
    if (!isPlausibleClientLinkEmail(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (
      !skipLockAgentOperations &&
      !hasDevelopmentRepo &&
      !isPlausibleDevRepoPath(lockDevelopmentRepoUrl)
    ) {
      toast.error("Enter a valid development repository (e.g. github.com/org/your-repo).");
      return;
    }
    if (!skipLockAgentOperations && lockGithubGateMessage) {
      toast.error(lockGithubGateMessage);
      return;
    }
    try {
      setLocking(true);
      const lockOpts = {
        developerSubmodulePath: DEFAULT_LOCK_DEVELOPER_SUBMODULE_PATH,
      };
      if (!hasDevelopmentRepo) {
        lockOpts.developmentRepoUrl = lockDevelopmentRepoUrl.trim();
      }
      appendLockDeployOptions(lockOpts);
      const res = await publicLockRelease(selectedReleaseId, email, lockOpts);
      setClientLinkVerifiedEmail(email);
      setLockConfirmOpen(false);
      setPreviewMeta(null);
      setPreviewContextReleaseId(null);
      toast.success(res?.message ?? "Release locked successfully");
      await reloadProjectQuiet();
    } catch (err) {
      toast.error(err?.error || err?.message || "Failed to lock release");
    } finally {
      setLocking(false);
    }
  }, [
    selectedReleaseId,
    backendPlanAgentRunning,
    reloadProjectQuiet,
    lockEmail,
    hasDevelopmentRepo,
    lockDevelopmentRepoUrl,
    lockGithubGateMessage,
    appendLockDeployOptions,
    skipLockAgentOperations,
  ]);

  const noActiveVersionForLiveDev = !hasActiveVersion && previewMeta?.versionId == null;

  const allReleasesLockedNoActive = hasAnyVersions && noActiveVersionForLiveDev;

  const backendAgentPreviewActive = React.useMemo(
    () => (releases || []).some((r) => isBackendAgentPollActive(r.backendAgentStatus)),
    [releases],
  );

  const livePreviewInProgress = React.useMemo(() => {
    if (scratchBuildInProgress) {
      if (onboardLivePreview.previewReady && previewIframeReady) return false;
      return true;
    }
    if (!noActiveVersionForLiveDev) return false;
    if (showPriorLockedReadOnlyPreview && previewMeta?.versionId == null) return false;
    if (onboardPreviewWaiting || onboardPreviewQueryActive) return true;
    if (backendAgentPreviewActive) return true;
    if (
      onboardLivePreview.agentRunning ||
      onboardLivePreview.previewDevListening ||
      onboardLivePreview.previewReady ||
      onboardLivePreview.scratchPreviewBuilding ||
      onboardLivePreview.zipOnboardPreviewBuilding
    ) {
      return true;
    }
    if (Number(publicProject?.port) > 0) {
      if (isScratchOnboardingProject || backendAgentPreviewActive) {
        return true;
      }
      if (
        onboardLivePreview.previewDevListening ||
        onboardLivePreview.previewReady ||
        onboardLivePreview.scratchPreviewBuilding ||
        onboardLivePreview.zipOnboardPreviewBuilding ||
        onboardLivePreview.agentRunning
      ) {
        return true;
      }
    }
    return false;
  }, [
    scratchBuildInProgress,
    previewIframeReady,
    noActiveVersionForLiveDev,
    showPriorLockedReadOnlyPreview,
    previewMeta?.versionId,
    onboardPreviewWaiting,
    onboardPreviewQueryActive,
    backendAgentPreviewActive,
    onboardLivePreview,
    publicProject?.port,
    isScratchOnboardingProject,
  ]);

  livePreviewInProgressRef.current = livePreviewInProgress;

  /** Hide live dev only when every release is locked and nothing is building/listening. */
  const hideLiveDevPreview = allReleasesLockedNoActive && !livePreviewInProgress;

  const rawPreviewPort = React.useMemo(() => {
    if (hideLiveDevPreview) return null;
    return resolvePreviewPortNumber({
      previewPortParam,
      previewUrlParam,
      publicProjectPort: publicProject?.port,
      deferPublicPort:
        awaitScratchPreview &&
        !livePreviewInProgress &&
        !String(previewPortParam || "").trim() &&
        !String(previewUrlParam || "").trim(),
    });
  }, [
    hideLiveDevPreview,
    publicProject?.port,
    previewPortParam,
    previewUrlParam,
    awaitScratchPreview,
    livePreviewInProgress,
  ]);

  useEffect(() => {
    if (rawPreviewPort != null) {
      setLatchedDevPreviewPort((prev) => prev ?? rawPreviewPort);
    }
  }, [rawPreviewPort]);

  const previewPort =
    rawPreviewPort ??
    (isPreviewEmbedHmrEnabled() && latchedDevPreviewPort != null ? latchedDevPreviewPort : null);

  /** Embed URL without cache-bust nonce — used for boot/health probes so _pv bumps do not re-trigger preview-boot. */
  /** Subdomain embed (`https://<slug>.<previewSuffix>`), or null for `/embedded/<port>/`. */
  const previewEmbedOrigin = React.useMemo(
    () =>
      registerPreviewEmbedOrigin(
        publicProject?.previewEmbedOrigin,
        publicProject?.previewEmbedAccess,
      ),
    [publicProject?.previewEmbedOrigin],
  );

  const stableDevEmbedSrc = React.useMemo(() => {
    if (!previewPort) return null;
    if (previewEmbedOrigin) {
      return buildEmbeddedPreviewSrc(previewPort, "", {
        versionId: previewMeta?.versionId,
        origin: previewEmbedOrigin,
      });
    }
    const base = resolveProxiedPreviewUrl(previewPort);
    const parts = [base];
    if (previewMeta?.versionId != null) {
      parts.push(`version=${previewMeta.versionId}`);
    }
    return parts.join("&").replace("?&", "?");
  }, [previewPort, previewMeta?.versionId, previewEmbedOrigin]);

  const iframeSrc = React.useMemo(() => {
    if (!previewPort) return null;
    if (previewRefreshNonce <= 0) return stableDevEmbedSrc;
    const src =
      buildEmbeddedPreviewSrc(previewPort, previewRefreshBrowsePath, {
        versionId: previewMeta?.versionId,
        nonce: previewRefreshNonce,
        origin: previewEmbedOrigin,
      }) || stableDevEmbedSrc;
    auditPreviewPipeline("iframe-src", `computed ${src}`, {
      previewPort,
      previewRefreshNonce,
      pending: true,
    });
    return src;
  }, [
    stableDevEmbedSrc,
    previewRefreshNonce,
    previewRefreshBrowsePath,
    previewPort,
    previewMeta?.versionId,
    previewEmbedOrigin,
  ]);

  const previewBridgeInspectable = Boolean(iframeSrc && isPreviewBridgeSrc(iframeSrc));
  /** Comments / screenshot / export work on same-origin frames and, via the bridge, on subdomain previews. */
  const previewToolsLive = previewIframeAccessible === true || previewBridgeInspectable;

  const awaitingFirstVersion = !hasActiveVersion && isScratchOnboardingProject && !hasAnyVersions;

  /** Scratch create flow: allow AI chat sidebar while agent builds first version. */
  const scratchOnboardingChatActive =
    awaitScratchPreview ||
    (isScratchOnboardingProject && (scratchBuildInProgress || awaitingFirstVersion));

  /** During scratch onboarding, show agent UI instead of the lock/blocked guide. */
  const effectiveChatBlockedReason = scratchOnboardingChatActive ? null : chatBlockedReason;

  const showAiChatEntry =
    showControls &&
    (showLockAndFeedback || chatBlockedReason != null || scratchOnboardingChatActive);

  /** Scratch: keep toolbar AI Chat visible as recovery when panel is collapsed at 0%. */
  const showAiChatToolbarButton = computeShowAiChatToolbarButton(
    showAiChatEntry,
    chatOpen,
    scratchOnboardingChatActive,
  );

  /** Manual restart after failure or timeout — not while auto setup is still running. */
  const showRestartAgentRecovery =
    awaitingFirstVersion &&
    (Boolean(firstVersionBuildError) ||
      previewAgentStuckRecoveryAvailable ||
      (autoAgentRecoverySettled && !onboardingRetryBusy && !livePreviewInProgress));

  const firstVersionBuildNeedsRecovery =
    awaitingFirstVersion &&
    (Boolean(firstVersionBuildError) ||
      previewAgentStuckRecoveryAvailable ||
      (autoAgentRecoverySettled && !onboardingRetryBusy && !livePreviewInProgress));

  const restartAgentDisabled = !isScratchOnboardingProject;
  const restartAgentDisabledReason = restartAgentDisabled
    ? CLIENT_LINK_PREVIEW_RECOVERY.restartAgent.disabledNoScratch
    : "";

  const runOnboardingRetry = useCallback(
    async (email) => {
      const slug = projectSlug?.trim();
      const rid = effectiveChatReleaseId;
      const pid = publicProject?.id;
      if (!slug || rid == null || pid == null) return;
      const trimmedEmail = String(email || "")
        .trim()
        .toLowerCase();
      if (!isPlausibleClientLinkEmail(trimmedEmail)) {
        toast.error("Enter a valid email address.");
        return;
      }
      setOnboardingRetryBusy(true);
      setFirstVersionBuildError(null);
      setAutoAgentRecoverySettled(false);
      try {
        const result = await clientLinkScratchRecover(slug, {
          r: Number(rid),
          projectId: Number(pid),
          clientEmail: trimmedEmail,
        });
        setClientLinkVerifiedEmail(trimmedEmail);
        toast.success(
          result?.recoveryAction === "materialize_version"
            ? "Created version from your existing build."
            : result?.recoveryAction === "restart_scratch"
              ? "Restarting build from your scratch prompt…"
              : "Restarting agent build…",
        );
        setOnboardingRecovery((prev) => ({ ...prev, eligible: false }));
        setPreviewRefreshNonce((n) => n + 1);
        await reloadProjectQuiet();
      } catch (err) {
        const normalized = normalizeFirstVersionBuildError(err);
        setFirstVersionBuildError(normalized);
        setPreviewAgentStuckRecoveryAvailable(true);
        toast.error(normalized.message);
      } finally {
        setOnboardingRetryBusy(false);
        setAutoAgentRecoverySettled(true);
        setOnboardingRetryEmailOpen(false);
      }
    },
    [projectSlug, effectiveChatReleaseId, publicProject?.id, reloadProjectQuiet],
  );

  const handleRestartAgentBuildClick = useCallback(() => {
    if (restartAgentDisabled) return;
    autoAgentRecoveryAttemptedRef.current = false;
    const verified = getClientLinkVerifiedEmail();
    if (verified && isPlausibleClientLinkEmail(verified)) {
      void runOnboardingRetry(verified);
      return;
    }
    setOnboardingRetryEmail(verified || "");
    setOnboardingRetryEmailOpen(true);
  }, [runOnboardingRetry, restartAgentDisabled]);

  const handleUpdateFirstVersionEmail = useCallback(() => {
    setOnboardingRetryEmail(getClientLinkVerifiedEmail() || "");
    setOnboardingRetryEmailOpen(true);
  }, []);

  const handleContactLaunchpadTeam = useCallback(() => {
    const pageUrl = window.location.href;
    const projectName = publicProject?.name || "Client link project";
    const issue = firstVersionBuildError?.message || "First version build did not complete";
    const body = [`Project: ${projectName}`, `Link: ${pageUrl}`, `Issue: ${issue}`].join("\n");

    if (LAUNCHPAD_SUPPORT_EMAIL) {
      window.location.href = `mailto:${LAUNCHPAD_SUPPORT_EMAIL}?subject=${encodeURIComponent("Client link build help")}&body=${encodeURIComponent(body)}`;
      return;
    }

    void navigator.clipboard?.writeText(body).catch(() => {});
    toast.info(CLIENT_LINK_FIRST_VERSION_BUILD.supportHint, { duration: 8000 });
  }, [publicProject?.name, firstVersionBuildError?.message]);

  const onboardingAgentFailed = useMemo(() => {
    if (String(publicProject?.scratchVersionStatus || "").trim() === "FAILED") {
      return true;
    }
    if (isBackendAgentFailureTerminal(publicProject?.scratchAgentStatus)) {
      return true;
    }
    return (releases || []).some((r) => isBackendAgentFailureTerminal(r.backendAgentStatus));
  }, [publicProject?.scratchVersionStatus, publicProject?.scratchAgentStatus, releases]);

  /** Full-page progress while scratch onboarding has not saved a version yet. */
  const firstVersionBuildActive = awaitingFirstVersion;

  const firstVersionStatusMessage = useMemo(() => {
    if (firstVersionBuildError?.message) return firstVersionBuildError.message;
    if (firstVersionBuildNeedsRecovery && !onboardingRetryBusy) {
      return previewAgentStuckRecoveryAvailable
        ? CLIENT_LINK_FIRST_VERSION_BUILD.timedOutMessage
        : CLIENT_LINK_FIRST_VERSION_BUILD.autoSettledMessage;
    }
    if (onboardingRetryBusy) {
      return CLIENT_LINK_FIRST_VERSION_BUILD.autoRestarting;
    }
    if (onboardPreviewStatus?.trim()) return onboardPreviewStatus.trim();
    if (onboardLivePreview.scratchPreviewBuilding) {
      return "Starting preview…";
    }
    if (onboardLivePreview.previewDevListening && !previewIframeReady) {
      return "Compiling preview…";
    }
    if (onboardLivePreview.agentRunning) {
      return "AI agent is writing code. The preview updates as files change.";
    }
    if (onboardingAgentFailed && autoAgentRecoverySettled && !onboardingRetryBusy) {
      return CLIENT_LINK_FIRST_VERSION_BUILD.autoSettledMessage;
    }
    if (onboardingAgentFailed && !autoAgentRecoveryAttemptedRef.current) {
      return "The last agent run did not finish. Restarting automatically…";
    }
    if (onboardingRecovery.mode === "retry_run") {
      return "Retrying your Figma conversion…";
    }
    return CLIENT_LINK_FIRST_VERSION_BUILD.autoStarting;
  }, [
    firstVersionBuildError,
    firstVersionBuildNeedsRecovery,
    previewAgentStuckRecoveryAvailable,
    onboardingRetryBusy,
    onboardPreviewStatus,
    onboardLivePreview,
    previewIframeReady,
    onboardingAgentFailed,
    autoAgentRecoverySettled,
    onboardingRecovery.mode,
  ]);

  /** Auto-start / restart agent when no version exists yet (once per visit). */
  useEffect(() => {
    if (loading || !publicProject || !awaitingFirstVersion || !hasVerifiedClientEmail) return;
    if (
      autoAgentRecoveryAttemptedRef.current ||
      onboardingRetryBusy ||
      firstVersionBuildError ||
      autoAgentRecoverySettled
    ) {
      return;
    }
    if (awaitScratchPreview && onboardPreviewWaiting) return;

    const slug = projectSlug?.trim();
    const rid = effectiveChatReleaseId;
    const pid = publicProject?.id;
    if (!slug || rid == null || pid == null) return;

    const agentInFlight =
      livePreviewInProgress &&
      (onboardLivePreview.agentRunning ||
        onboardLivePreview.scratchPreviewBuilding ||
        onboardLivePreview.previewDevListening);

    if (agentInFlight && !onboardingAgentFailed) return;

    const email = getClientLinkVerifiedEmail();
    if (!email || !isPlausibleClientLinkEmail(email)) {
      return;
    }

    autoAgentRecoveryAttemptedRef.current = true;
    const delayMs = agentInFlight || onboardingAgentFailed ? 0 : 800;
    const timerId = window.setTimeout(() => {
      void runOnboardingRetry(email);
    }, delayMs);
    return () => window.clearTimeout(timerId);
  }, [
    loading,
    publicProject,
    awaitingFirstVersion,
    onboardingRetryBusy,
    awaitScratchPreview,
    onboardPreviewWaiting,
    projectSlug,
    effectiveChatReleaseId,
    livePreviewInProgress,
    onboardLivePreview,
    onboardingAgentFailed,
    runOnboardingRetry,
    firstVersionBuildError,
    autoAgentRecoverySettled,
    hasVerifiedClientEmail,
  ]);

  useEffect(() => {
    if (!hasActiveVersion) return;
    setFirstVersionBuildError(null);
    setAutoAgentRecoverySettled(false);
    setPreviewAgentStuckRecoveryAvailable(false);
    autoAgentRecoveryAttemptedRef.current = false;
  }, [hasActiveVersion]);

  const hadActiveVersionRef = useRef(false);
  useEffect(() => {
    if (hasActiveVersion && !hadActiveVersionRef.current) {
      setPreviewMeta(null);
      setPreviewContextReleaseId(null);
      setPreviewRefreshNonce((n) => n + 1);
      void reloadProjectQuiet();
    }
    hadActiveVersionRef.current = hasActiveVersion;
  }, [hasActiveVersion, reloadProjectQuiet]);

  /** Tear down stale live dev preview when active version disappears (e.g. post-lock). */
  useEffect(() => {
    const hadActive = hadActiveVersionForLivePreviewRef.current;
    if (hadActive && !hasActiveVersion && previewMeta?.versionId == null) {
      setOnboardLivePreview(EMPTY_ONBOARD_LIVE_PREVIEW);
      setDevEmbedGateOpen(false);
      setDevEmbedSessionLive(false);
      setPreviewIframeReady(false);
      setPreviewBootFailed(false);
      setPreviewIframeLoadMessage("");
      setLatchedDevPreviewPort(null);
      devEmbedBootPortRef.current = null;
    }
    hadActiveVersionForLivePreviewRef.current = hasActiveVersion;
  }, [hasActiveVersion, previewMeta?.versionId]);

  const needsBackgroundAgentPoll = useMemo(
    () =>
      Boolean(releaseBackgroundAgentBlock) ||
      (releases || []).some((r) => Boolean(r?.ongoingRevisionSeed?.agentId)),
    [releases, releaseBackgroundAgentBlock],
  );

  useEffect(() => {
    if (!projectSlug?.trim() || !needsBackgroundAgentPoll) return undefined;
    const intervalId = setInterval(() => void reloadProjectQuiet(), 5000);
    return () => clearInterval(intervalId);
  }, [projectSlug, needsBackgroundAgentPoll, reloadProjectQuiet]);

  useEffect(() => {
    if (!awaitingFirstVersion) {
      setPreviewAgentStuckRecoveryAvailable(false);
      return undefined;
    }
    const timerId = window.setTimeout(() => {
      setPreviewAgentStuckRecoveryAvailable(true);
    }, PREVIEW_RESTART_AGENT_STUCK_DELAY_MS);
    return () => window.clearTimeout(timerId);
  }, [awaitingFirstVersion]);

  const isDevEmbedPreview = isDevIframePreviewSrc(iframeSrc);
  const devPreviewEmbedHmr = useMemo(
    () =>
      Boolean(previewPort) &&
      !isViewingVersionPreview &&
      isDevIframePreviewSrc(resolveProxiedPreviewUrl(previewPort)) &&
      isPreviewEmbedHmrEnabled(),
    [previewPort, isViewingVersionPreview],
  );
  const [devEmbedGateOpen, setDevEmbedGateOpen] = useState(false);
  const [devEmbedSessionLive, setDevEmbedSessionLive] = useState(false);
  /** idle | connected | recovering | failed | exhausted — embed HMR WebSocket health. */
  const [embedHmrWsState, setEmbedHmrWsState] = useState("idle");

  useEffect(() => {
    if (!devPreviewEmbedHmr) {
      setDevEmbedSessionLive(false);
      return;
    }
    if (devEmbedGateOpen && previewIframeReady) {
      setDevEmbedSessionLive(true);
    }
  }, [devPreviewEmbedHmr, devEmbedGateOpen, previewIframeReady]);

  useEffect(() => {
    devEmbedLiveRef.current = {
      gate: devEmbedGateOpen,
      ready: previewIframeReady,
      sessionLive: devEmbedSessionLive,
    };
  }, [devEmbedGateOpen, previewIframeReady, devEmbedSessionLive]);

  useEffect(() => {
    autoHealAttemptCountRef.current = 0;
  }, [previewPort, iframeSrc]);

  useEffect(() => {
    if (previewIframeReady || previewBootFailed || nextInAppCompiling) {
      return undefined;
    }
    const portUnreachable = previewFailureDiagnosis?.kind === "port_unreachable";
    // Blank heal needs an open gate; port-down heal runs even with the Start Server card.
    if (!portUnreachable && (!devEmbedGateOpen || blockingPreviewFailure)) {
      return undefined;
    }
    const attemptIndex = autoHealAttemptCountRef.current;
    const delayMs = getAutoHealDelayMs(attemptIndex);
    const timerId = window.setTimeout(() => {
      const iframe = previewIframeRef.current;
      const blankOrBroken =
        !iframe ||
        isIframePreviewErrorPage(iframe) ||
        isIframePreviewBlankOrBroken(iframe) ||
        !isIframePreviewReadyEnough(iframe);
      const stillPortDown = previewFailureDiagnosis?.kind === "port_unreachable";
      if (
        !shouldAttemptAutoSoftReload({
          gateOpen: devEmbedGateOpen,
          previewIframeReady,
          previewBootFailed,
          hasFailureDiagnosis: Boolean(blockingPreviewFailure),
          attemptCount: autoHealAttemptCountRef.current,
          maxAttempts: PREVIEW_AUTO_HEAL_MAX_ATTEMPTS,
          blankOrBroken,
          portUnreachable: stillPortDown,
          previewRefreshBusy: previewRefreshBusyRef.current,
          nextInAppCompiling: nextInAppCompilingRef.current,
        })
      ) {
        return;
      }
      const nextAttempt = autoHealAttemptCountRef.current + 1;
      autoHealAttemptCountRef.current = nextAttempt;
      auditPreviewPipeline(
        "iframe-refresh",
        stillPortDown
          ? `auto heal attempt ${nextAttempt} (port unreachable)`
          : `auto heal attempt ${nextAttempt} (stuck blank after gate)`,
        { previewPort, pending: true },
      );
      void (async () => {
        const softOk = await softReloadPreviewIframeRef.current();
        // Escalate: soft reload failed → hard remount on later attempts.
        if (!softOk && nextAttempt >= 2) {
          try {
            await forceRemountPreviewIframeRef.current();
          } catch {
            /* user can still use toolbar reload */
          }
        }
      })();
    }, delayMs);
    return () => window.clearTimeout(timerId);
  }, [
    devEmbedGateOpen,
    previewIframeReady,
    previewBootFailed,
    previewFailureDiagnosis,
    blockingPreviewFailure,
    previewPort,
    nextInAppCompiling,
  ]);

  /** SSE agent-events for header retry eligibility; stops after preview is loaded. */
  useEffect(() => {
    const slug = projectSlug?.trim();
    const rid = effectiveChatReleaseId != null ? Number(effectiveChatReleaseId) : null;
    if (!slug || !Number.isInteger(rid) || rid < 1) {
      return undefined;
    }
    if (hasActiveVersion || !isScratchOnboardingProject || isPostLockIdleState) {
      setOnboardingRecovery({
        eligible: false,
        mode: null,
        figmaConversionId: null,
      });
      return undefined;
    }

    let cancelled = false;
    const streamAbort = new AbortController();

    const applyRecoveryFromStatus = (st) => {
      setOnboardingRecovery({
        eligible: Boolean(st?.onboardingHeaderRetryEligible),
        mode:
          st?.onboardingRecoveryMode === "retry_run" ||
          st?.onboardingRecoveryMode === "restart_scratch"
            ? st.onboardingRecoveryMode
            : null,
        figmaConversionId: st?.figmaConversionId != null ? Number(st.figmaConversionId) : null,
      });
    };

    void watchClientLinkAgentStream({
      slug,
      releaseId: rid,
      signal: streamAbort.signal,
      onStatus: (st) => {
        if (cancelled) return;
        applyRecoveryFromStatus(st);
      },
    }).catch(() => {});

    return () => {
      cancelled = true;
      streamAbort.abort();
    };
  }, [
    projectSlug,
    effectiveChatReleaseId,
    hasActiveVersion,
    isScratchOnboardingProject,
    isPostLockIdleState,
  ]);

  const priorLockedPreviewBaseline = useMemo(
    () => (showPriorLockedReadOnlyPreview ? getLatestPriorBaseline(releases) : null),
    [showPriorLockedReadOnlyPreview, releases],
  );

  /** Auto-load read-only preview of the latest locked (or prior) revision. */
  useEffect(() => {
    if (
      postLockAutoPreviewAttemptedRef.current ||
      !showPriorLockedReadOnlyPreview ||
      previewMeta?.versionId != null ||
      !publicProject?.id ||
      !priorLockedPreviewBaseline?.baselineProjectVersionId
    ) {
      return undefined;
    }
    postLockAutoPreviewAttemptedRef.current = true;
    const versionId = priorLockedPreviewBaseline.baselineProjectVersionId;
    const releaseId = priorLockedPreviewBaseline.priorReleaseId;
    let cancelled = false;
    void switchProjectVersion(publicProject.id, versionId, false)
      .then(() => {
        if (cancelled) return;
        devEmbedBootPortRef.current = null;
        setDevEmbedSessionLive(false);
        setDevEmbedGateOpen(false);
        setPreviewIframeReady(false);
        setPreviewBootFailed(false);
        previewBootGenerationRef.current += 1;
        setPreviewContextReleaseId(releaseId);
        setPreviewMeta({
          versionId: Number(versionId),
          releaseId: Number(releaseId),
        });
        setPreviewRefreshNonce((n) => n + 1);
      })
      .catch(() => {
        postLockAutoPreviewAttemptedRef.current = false;
      });
    return () => {
      cancelled = true;
    };
  }, [
    showPriorLockedReadOnlyPreview,
    previewMeta?.versionId,
    publicProject?.id,
    priorLockedPreviewBaseline,
  ]);

  useEffect(() => {
    if (hasActiveVersion) {
      postLockAutoPreviewAttemptedRef.current = false;
    }
  }, [hasActiveVersion]);

  const previewBootGenerationRef = useRef(0);
  const previewBootInFlightRef = useRef(false);
  const previewEnsureThrottledUntilRef = useRef(0);

  const openDevEmbedGate = useCallback((message = "") => {
    setPreviewBootFailed(false);
    setDevEmbedGateOpen(true);
    setPreviewIframeLoadMessage(message);
  }, []);

  const applyIframeBrowsePath = useCallback(
    (nextRaw) => {
      const next = sanitizeEmbedBrowsePath(nextRaw);
      if (!next) return;
      iframeBrowsePathRef.current = next;
      if (!isAuthBrowsePath(next)) {
        visitedBrowsePathsRef.current.add(next);
        lastNonAuthBrowsePathRef.current = next;
        savePersistedBrowsePath(projectSlug, next);
      }
      setIframeBrowsePath((prev) => (prev === next ? prev : next));
    },
    [projectSlug],
  );

  const rememberNextEmbedPreview = useCallback((iframe) => {
    if (iframeLooksLikeNextDev(iframe)) {
      isNextEmbedPreviewRef.current = true;
      setIsNextEmbedPreview(true);
      return true;
    }
    return isNextEmbedPreviewRef.current;
  }, []);

  const coverNextInAppCompile = useCallback((iframe) => {
    if (!isNextEmbedPreviewRef.current && !iframeLooksLikeNextDev(iframe)) return false;
    isNextEmbedPreviewRef.current = true;
    setIsNextEmbedPreview(true);
    nextInAppCompilingRef.current = true;
    setNextInAppCompiling(true);
    setPreviewIframeLoadMessage(PREVIEW_CONTENT_LOAD_MESSAGES.compiling);
    setCompileTheaterProgress(
      mergeCompileProgress(null, {
        reset: true,
        quiet: false,
        route: iframeBrowsePathRef.current || "",
      }),
    );
    setCompileTheaterNow(Date.now());
    return true;
  }, []);

  const clearNextInAppCompile = useCallback(() => {
    if (!nextInAppCompilingRef.current) return;
    nextInAppCompilingRef.current = false;
    setNextInAppCompiling(false);
    setPreviewIframeLoadMessage((msg) => (isPreviewContentLoadMessage(msg) ? "" : msg));
    setCompileTheaterProgress(null);
  }, []);

  const syncIframeBrowsePath = useCallback(() => {
    const iframe = previewIframeRef.current;
    if (!iframe) {
      return;
    }
    if (!canAccessIframeDocument(iframe)) {
      return;
    }
    rememberNextEmbedPreview(iframe);
    const next = readIframeBrowsePath(iframe);
    if (!next) {
      return;
    }
    const prev = iframeBrowsePathRef.current;
    applyIframeBrowsePath(next);
    if (
      shouldMarkNextInAppCompile({
        isNextPreview: isNextEmbedPreviewRef.current,
        previousPath: prev,
        nextPath: next,
        iframe,
      })
    ) {
      coverNextInAppCompile(iframe);
    }
  }, [applyIframeBrowsePath, rememberNextEmbedPreview, coverNextInAppCompile]);

  const handleNavigatePreviewPath = useCallback(
    (rawPath) => {
      const target = parsePreviewUrlInput(rawPath);
      if (!target || isAuthBrowsePath(target)) return false;
      const iframe = previewIframeRef.current;
      if (!iframe || previewPort == null) return false;

      const navigated = navigateEmbedIframeToAppRoute(iframe, previewPort, target);
      if (navigated) {
        applyIframeBrowsePath(target);
        if (isNextEmbedPreviewRef.current || iframeLooksLikeNextDev(iframe)) {
          coverNextInAppCompile(iframe);
        }
      }
      return navigated;
    },
    [previewPort, applyIframeBrowsePath, coverNextInAppCompile],
  );

  const resolvePathForPreviewRefresh = useCallback(() => {
    const iframe = previewIframeRef.current;
    const live = iframe && canAccessIframeDocument(iframe) ? readIframeBrowsePath(iframe) : "";
    return resolvePreviewRefreshBrowsePath({
      live,
      ref: iframeBrowsePathRef.current,
      stored: previewRefreshBrowsePath || iframeBrowsePath,
      lastNonAuth: lastNonAuthBrowsePathRef.current,
      persisted: loadPersistedBrowsePath(projectSlug),
    });
  }, [iframeBrowsePath, previewRefreshBrowsePath, projectSlug]);

  const bumpIframeRefresh = useCallback(
    (browsePath, { force = false } = {}) => {
      if (!force && devPreviewEmbedHmr && (devEmbedSessionLive || devEmbedGateOpen)) {
        return;
      }
      syncIframeBrowsePath();
      const iframe = previewIframeRef.current;
      if (iframe && previewPort != null) {
        stageIframeSessionRestore(previewPort, iframe);
        if (canAccessIframeDocument(iframe)) {
          pendingSessionSnapshotRef.current = snapshotIframeStorageBundle(iframe);
        }
      }
      setPreviewIframeReady(false);
      const pathForRefresh =
        typeof browsePath === "string" && browsePath.trim()
          ? browsePath
          : resolvePathForPreviewRefresh();
      if (pathForRefresh) {
        setPreviewRefreshBrowsePath(pathForRefresh);
      }
      setPreviewRefreshNonce((n) => n + 1);
    },
    [
      devPreviewEmbedHmr,
      devEmbedGateOpen,
      devEmbedSessionLive,
      previewPort,
      resolvePathForPreviewRefresh,
      syncIframeBrowsePath,
    ],
  );

  const markCommentSidebarOpening = useCallback(() => {
    commentSidebarDismissGuardUntilRef.current = Date.now() + 150;
  }, []);

  /** Toggle Comments mode only — pins, crosshair pick-to-add; persisted per slug. */
  const setCommentModeActive = useCallback(
    (active) => {
      setCommentMode(active);
      if (!active) {
        setPendingCommentPlacement(null);
        setFocusedPreviewCommentId(null);
      }
      const slug = projectSlug?.trim();
      if (slug) {
        savePersistedCommentsMode(slug, active);
      }
    },
    [projectSlug, setFocusedPreviewCommentId],
  );

  /** Toggle the View all Comments sidebar without changing Comments mode. */
  const toggleCommentSidebar = useCallback(() => {
    setCommentSidebarOpen((wasOpen) => {
      if (!wasOpen) {
        markCommentSidebarOpening();
      }
      return !wasOpen;
    });
  }, [markCommentSidebarOpening]);

  const handleCommentSidebarOpenChange = useCallback((nextOpen) => {
    if (!nextOpen && Date.now() < commentSidebarDismissGuardUntilRef.current) {
      return;
    }
    setCommentSidebarOpen(nextOpen);
  }, []);

  const handlePendingCommentPlacementChange = useCallback(
    (placement) => {
      if (placement) {
        setFocusedPreviewCommentId(null);
      }
      setPendingCommentPlacement(placement);
    },
    [setFocusedPreviewCommentId],
  );

  /** Navigate preview to a comment route without rebuilding the parent iframe. */
  const handleFocusPreviewCommentOnPage = useCallback(
    (comment) => {
      if (!comment) return;
      const targetRoute = previewRoutePathname(comment.previewPath);
      if (!previewRoutesMatch(targetRoute, previewCommentNormalizedPath)) {
        const navigated = navigateEmbedIframeToAppRoute(
          previewIframeRef.current,
          previewPort,
          targetRoute,
        );
        if (navigated) {
          applyIframeBrowsePath(targetRoute);
        }
      }
      setFocusedPreviewCommentId(comment.id);
      setSelectedPreviewCommentThreadId(comment.id);
      setCommentModeActive(true);
    },
    [
      previewCommentNormalizedPath,
      previewPort,
      applyIframeBrowsePath,
      setFocusedPreviewCommentId,
      setSelectedPreviewCommentThreadId,
      setCommentModeActive,
    ],
  );

  /** Voice mode: move the preview to an app route without rebuilding the iframe. */
  const handleVoiceNavigatePreview = useCallback(
    (path) => {
      const targetRoute = previewRoutePathname(path);
      const navigated = navigateEmbedIframeToAppRoute(
        previewIframeRef.current,
        previewPort,
        targetRoute,
      );
      if (navigated) applyIframeBrowsePath(targetRoute);
      return Boolean(navigated);
    },
    [previewPort, applyIframeBrowsePath],
  );

  /** Open AI chat with conversation thread and pinned element context (no logic notes). */
  const handleFixCommentWithAi = useCallback(
    (comment) => {
      const threadText = formatCommentConversationOnly(comment);
      if (!threadText.trim()) return;
      setChatOpen(true);
      setVisualPickMode(false);
      const pickedContext = anchorToPickedElementContext(
        previewIframeRef.current,
        comment.anchor,
        comment.previewPath || previewCommentNormalizedPath,
      );
      setPickedElementContext(pickedContext);
      setChatComposerSeed({
        text: threadText,
        ts: Date.now(),
      });
    },
    [previewCommentNormalizedPath],
  );

  const handleCommentSidebarWidthChange = useCallback((nextWidthPx) => {
    const maxWidthPx = Math.floor((typeof window !== "undefined" ? window.innerWidth : 1200) * 0.5);
    const clamped = Math.min(
      maxWidthPx,
      Math.max(COMMENT_SIDEBAR_WIDTH_MIN, Math.round(nextWidthPx)),
    );
    setCommentSidebarWidthPx(clamped);
    try {
      window.sessionStorage.setItem(COMMENT_SIDEBAR_WIDTH_STORAGE_KEY, String(clamped));
    } catch {
      /* private mode / quota */
    }
  }, []);

  const buildIframeSrcForNonce = useCallback(
    (nonce, browsePath = "") => {
      if (!previewPort) return null;
      return buildEmbeddedPreviewSrc(previewPort, browsePath, {
        versionId: previewMeta?.versionId,
        nonce,
        origin: previewEmbedOrigin,
      });
    },
    [previewPort, previewMeta?.versionId, previewEmbedOrigin],
  );

  const clearPreviewFailureDiagnosis = useCallback((opts = {}) => {
    setPreviewFailureDiagnosis((prev) => {
      if (!opts.force && prev?.blocking === false) return prev;
      return null;
    });
    setPreviewOverlayPeeled(false);
    setPreviewErrorDocumentHtml("");
  }, []);

  /**
   * Surface a preview failure. Prefer showing the exact embed/port response body
   * (global solution via srcdoc) instead of a paraphrased loader card.
   * @param {Parameters<typeof classifyPreviewFailure>[0]} opts
   * @param {{ markBootFailed?: boolean, showExactPortUi?: boolean }} [flags]
   */
  const applyPreviewFailureDiagnosis = useCallback(
    async (opts, flags = {}) => {
      const diagnosis = classifyPreviewFailure(opts);
      if (!diagnosis) return null;

      // White screens and console errors stay on the live iframe. A rendered page
      // with a console error only gets the banner; a blank page gets the loader.
      if (diagnosis.blocking === false || diagnosis.kind === "blank_app") {
        setPreviewFailureDiagnosis(diagnosis);
        setPreviewErrorDocumentHtml("");
        setPreviewOverlayPeeled(false);
        if (diagnosis.blocking !== false) {
          setPreviewLoadStuckRecoveryAvailable(true);
          setPreviewReloadActionEnabled(true);
        }
        return diagnosis;
      }

      const httpStatus = Number(opts.httpStatus) || 0;
      let bodyText = String(opts.bodyText || opts.errorDetail || "").trim();
      if (!bodyText && opts.iframe) {
        try {
          const doc = opts.iframe.contentDocument;
          bodyText =
            extractIframePreviewFailureMessage(opts.iframe) ||
            String(doc?.documentElement?.outerHTML || doc?.body?.innerText || "").trim();
        } catch {
          /* ignore */
        }
      }
      if (!bodyText) {
        bodyText = String(diagnosis.detail || diagnosis.summary || "").trim();
      }

      const isPortDown = diagnosis.kind === "port_unreachable";
      // Next client-nav breakout leaves /embedded/<port>/ but preview is still alive.
      if (
        isPortDown &&
        iframeIsEmbedPortBreakout(opts.iframe || previewIframeRef.current, previewPort)
      ) {
        return null;
      }

      // Confirm before locking Start Server — transient 502s / stale iframe HTML are common
      // while the process is already listening (or came back up).
      if (isPortDown && stableDevEmbedSrc && isDevIframePreviewSrc(stableDevEmbedSrc)) {
        try {
          const probe = await inspectDevIframePreviewSrc(stableDevEmbedSrc, {
            timeoutMs: 6_000,
            requireAppHtml: false,
            allowPartialShell: true,
          });
          if (probe.ok) {
            auditPreviewPipeline(
              "health-probe",
              "port_unreachable ignored — embed probe reachable",
              { previewPort, ok: true },
            );
            clearPreviewFailureDiagnosis();
            setPreviewBootFailed(false);
            openDevEmbedGate("");
            const iframe = opts.iframe || previewIframeRef.current;
            if (iframe && isIframePortUnreachablePage(iframe)) {
              try {
                iframe.contentWindow?.location?.reload();
              } catch {
                /* ignore */
              }
            }
            return null;
          }
        } catch {
          /* treat as port down */
        }
      }

      const showExactPortUi =
        !isPortDown &&
        flags.showExactPortUi !== false &&
        (opts.source === "probe" ||
          opts.source === "iframe" ||
          httpStatus >= 400 ||
          Boolean(opts.iframe) ||
          Boolean(bodyText));

      setPreviewFailureDiagnosis({
        ...diagnosis,
        detail: isPortDown ? "" : diagnosis.detail || bodyText.slice(0, 800),
      });
      setPreviewLoadStuckRecoveryAvailable(true);
      setPreviewReloadActionEnabled(true);
      if (flags.markBootFailed || isPortDown) {
        setPreviewBootFailed(true);
      }

      if (showExactPortUi) {
        // Compile/app errors: show exact port response via srcdoc.
        setPreviewErrorDocumentHtml(
          buildPreviewErrorDocumentHtml({
            httpStatus,
            bodyText,
            title: httpStatus >= 400 ? `Preview error (HTTP ${httpStatus})` : "Preview error",
          }),
        );
        setPreviewOverlayPeeled(true);
        openDevEmbedGate("");
        setPreviewIframeReady(true);
        setPreviewIframeLoadMessage("");
      } else {
        // Port down: simple Start Server card — no raw 502 HTML.
        setPreviewErrorDocumentHtml("");
        setPreviewOverlayPeeled(false);
        setPreviewIframeReady(false);
        setPreviewIframeLoadMessage(diagnosis.summary);
      }
      return diagnosis;
    },
    [openDevEmbedGate, previewPort, stableDevEmbedSrc, clearPreviewFailureDiagnosis],
  );

  const bootDevEmbedPreview = useCallback(
    async (slug, { retry = false, soft = false } = {}) => {
      if (!slug || !stableDevEmbedSrc) return;
      if (!isPlausibleClientLinkEmail(getClientLinkVerifiedEmail())) return;
      if (shouldSkipOverlappingPreviewBoot({ inFlight: previewBootInFlightRef.current, retry })) {
        auditPreviewPipeline("preview-boot", `skip overlapping boot slug=${slug}`, {
          slug,
          previewPort,
          pending: true,
        });
        return;
      }
      const clientEmail = getClientLinkVerifiedEmail()?.trim() || "";
      /** @type {number | null} */
      let lastEnsureAt = null;
      /** @type {{ status?: string, installRunning?: boolean, listening?: boolean, wakeReason?: string, error?: string }} */
      let lastBootStatus = null;

      const callEnsure = async (ensureOpts = {}) => {
        if (!canCallPreviewEnsureNow(lastEnsureAt)) {
          auditPreviewPipeline("preview-boot", "ensure skipped (cooldown)", {
            slug,
            previewPort,
            pending: true,
          });
          return null;
        }
        if (Number(previewEnsureThrottledUntilRef.current) > Date.now() && !ensureOpts.force) {
          auditPreviewPipeline("preview-boot", "ensure skipped (rate limited)", {
            slug,
            previewPort,
            pending: true,
          });
          return null;
        }
        lastEnsureAt = Date.now();
        try {
          return await ensurePublicProjectPreview(slug, {
            clientEmail,
            ...ensureOpts,
          });
        } catch (err) {
          if (isPreviewEnsureRateLimitedError(err)) {
            previewEnsureThrottledUntilRef.current = resolvePreviewEnsureThrottleUntil(
              err?.retryAfter,
            );
            auditPreviewPipeline("preview-boot", "ensure rate limited — backing off", {
              slug,
              previewPort,
              ok: false,
            });
          }
          throw err;
        }
      };

      // HMR "session live" can outlive an idle soft-stop. Always probe before skipping ensure.
      if (
        isPreviewEmbedHmrEnabled() &&
        !retry &&
        previewPort != null &&
        devEmbedBootPortRef.current === previewPort &&
        (devEmbedLiveRef.current.gate ||
          devEmbedLiveRef.current.ready ||
          devEmbedLiveRef.current.sessionLive)
      ) {
        try {
          if (
            await probeDevIframePreviewSrc(stableDevEmbedSrc, {
              timeoutMs: 4000,
            })
          ) {
            openDevEmbedGate("");
            return;
          }
        } catch {
          /* fall through — server likely idle-stopped; restart via ensure */
        }
        setDevEmbedSessionLive(false);
        devEmbedLiveRef.current = {
          gate: false,
          ready: false,
          sessionLive: false,
        };
      }

      if (soft && !retry && isPreviewEmbedHmrEnabled()) {
        try {
          if (
            await probeDevIframePreviewSrc(stableDevEmbedSrc, {
              timeoutMs: 8000,
            })
          ) {
            auditPreviewPipeline("preview-boot", `soft skip slug=${slug} embed already up`, {
              slug,
              previewPort,
              ok: true,
            });
            if (previewPort != null) {
              devEmbedBootPortRef.current = previewPort;
            }
            openDevEmbedGate("");
            return;
          }
        } catch {
          /* fall through to full boot */
        }
      }

      auditPreviewPipeline("preview-boot", `begin slug=${slug} retry=${retry}`, {
        slug,
        previewPort,
        pending: true,
      });
      previewBootInFlightRef.current = true;
      setDevEmbedSessionLive(false);
      devEmbedLiveRef.current = {
        gate: false,
        ready: false,
        sessionLive: false,
      };
      try {
        const bootGen = previewBootGenerationRef.current + 1;
        previewBootGenerationRef.current = bootGen;
        const bootStale = () => bootGen !== previewBootGenerationRef.current;
        setPreviewBootFailed(false);
        clearPreviewFailureDiagnosis();
        setDevEmbedGateOpen(false);
        setPreviewIframeReady(false);
        setPreviewIdleWake(false);
        setCompileTheaterProgress(createEmptyCompileProgress());
        setCompileTheaterNow(Date.now());
        setPreviewIframeLoadMessage(
          retry
            ? "Retrying preview…"
            : onboardPreviewStatusRef.current || CLIENT_LINK_PREVIEW_COLD_START.starting,
        );

        /** @type {{ count: number, last?: object }} */
        const terminalProbeFailures = { count: 0, last: null };
        let idleWakeActive = false;

        const applyBootProgressMessage = (payload) => {
          if (isPreviewIdleWakeReason(payload?.wakeReason)) {
            idleWakeActive = true;
            setPreviewIdleWake(true);
          }
          if (payload?.listening === true || payload?.status === "ready") {
            idleWakeActive = false;
            setPreviewIdleWake(false);
            return;
          }
          setPreviewIframeLoadMessage(
            clientLinkPreviewBootMessage({
              wakeReason: idleWakeActive ? "inactivity" : payload?.wakeReason,
              installRunning: payload?.installRunning,
              status: payload?.status,
            }),
          );
        };

        const finishIfEmbedReachable = async (attempt = 1) => {
          const throttled = Number(previewEnsureThrottledUntilRef.current) > Date.now();
          if (!shouldProbeEmbedDuringBoot(lastBootStatus, attempt)) {
            return false;
          }
          try {
            const probe = await inspectDevIframePreviewSrc(stableDevEmbedSrc, {
              timeoutMs: throttled ? 5000 : 8000,
            });
            if (probe.ok) {
              terminalProbeFailures.count = 0;
              terminalProbeFailures.last = null;
              auditPreviewPipeline("health-probe", `embed reachable ${stableDevEmbedSrc}`, {
                slug,
                previewPort,
                ok: true,
              });
              if (bootStale()) return true;
              if (previewPort != null) {
                devEmbedBootPortRef.current = previewPort;
              }
              idleWakeActive = false;
              setPreviewIdleWake(false);
              // Open gate only — do not bump _pv here (bumping iframeSrc re-ran preview-boot in a loop).
              openDevEmbedGate("");
              auditPreviewPipeline("iframe-refresh", "dev server ready — showing embed", {
                slug,
                previewPort,
                ok: true,
              });
              return true;
            }

            const body = String(probe.bodySnippet || "");
            const status = Number(probe.httpStatus) || 0;
            const portDownSignal =
              status === 502 ||
              /cannot reach preview|preview is not running on port|econnrefused|bad gateway/i.test(
                `${probe.error || ""}\n${body}`,
              );
            // 502 / proxy-down is not a terminal *app* error — keep polling while the
            // process may still be starting. Treating it as terminal locked Start Server
            // after two blips even when the port came up moments later.
            const isTerminalAppError =
              !portDownSignal &&
              (status >= 500 ||
                looksLikeDevCompileErrorHtml(body) ||
                /build error|parsing ecmascript|failed to compile|failed to resolve import/i.test(
                  `${probe.error || ""}\n${body}`,
                ));

            if (isTerminalAppError) {
              terminalProbeFailures.count += 1;
              terminalProbeFailures.last = probe;
              auditPreviewPipeline(
                "health-probe",
                `embed app error status=${status || "?"} attempt=${terminalProbeFailures.count}: ${probe.error || "unknown"}`,
                { slug, previewPort, ok: false },
              );
              // Port is up but app is broken (e.g. Next Turbopack Build Error → HTTP 500).
              // Fail after 2 consecutive probes so we don't leave users on "Loading preview".
              if (terminalProbeFailures.count >= 2 && !bootStale()) {
                await applyPreviewFailureDiagnosis(
                  {
                    httpStatus: status,
                    bodyText: String(probe.body || body),
                    ensureError: probe.error,
                    errorDetail: String(probe.body || body),
                    source: "probe",
                  },
                  { markBootFailed: true },
                );
                return "failed";
              }
            } else {
              terminalProbeFailures.count = 0;
              terminalProbeFailures.last = portDownSignal ? probe : null;
              auditPreviewPipeline("health-probe", `embed not ready ${stableDevEmbedSrc}`, {
                slug,
                previewPort,
                ok: false,
              });
            }
          } catch (probeErr) {
            auditPreviewPipeline("health-probe", `probe error: ${probeErr?.message || probeErr}`, {
              slug,
              previewPort,
              ok: false,
            });
          }
          return false;
        };

        try {
          let ensured = await callEnsure({ retry });
          if (ensured) lastBootStatus = ensured;
          if (!bootStale() && ensured) applyBootProgressMessage(ensured);
          auditPreviewPipeline(
            "preview-boot",
            `ensure status=${ensured?.status ?? "?"} listening=${ensured?.listening ?? "?"}`,
            {
              slug,
              previewPort,
              ok: ensured?.status !== "failed" && ensured?.listening !== false,
              pending: ensured?.status === "starting" || ensured?.installRunning || !ensured,
            },
          );
          if (ensured?.status === "failed" && !retry) {
            const retried = await callEnsure({ retry: true });
            if (retried) {
              ensured = retried;
              lastBootStatus = retried;
            }
            if (!bootStale() && ensured) applyBootProgressMessage(ensured);
          }
          if (ensured?.status === "failed") {
            const errText = String(ensured.error || "");
            if (!retry && /native binding|rolldown/i.test(errText) && !bootStale()) {
              setPreviewIframeLoadMessage("Repairing dependencies…");
              const repaired = await callEnsure({ retry: true });
              if (repaired) {
                ensured = repaired;
                lastBootStatus = repaired;
              }
              if (!bootStale() && ensured) applyBootProgressMessage(ensured);
            }
          }
          if (bootStale()) return;
          if (ensured?.status === "failed") {
            const reach = await finishIfEmbedReachable(1);
            if (reach === true || reach === "failed") return;
            applyPreviewFailureDiagnosis(
              {
                ensureStatus: "failed",
                ensureError:
                  ensured.error ||
                  "Preview failed to start. Check package.json and preview.log in the project folder.",
                errorDetail: ensured.errorDetail,
                source: "ensure",
              },
              { markBootFailed: true },
            );
            auditPreviewPipeline("preview-boot", `failed: ${ensured.error || "unknown"}`, {
              slug,
              previewPort,
              ok: false,
            });
            return;
          }
          if (ensured?.listening === true || ensured?.status === "ready") {
            idleWakeActive = false;
            setPreviewIdleWake(false);
            const devPreview = ensured?.devListening === true || ensured?.previewMode === "dev";
            openDevEmbedGate(devPreview ? "Compiling preview…" : "");
            if (!devPreview) {
              const reach = await finishIfEmbedReachable(1);
              if (reach === true || reach === "failed") return;
              if (!bootStale()) return;
            }
          }
        } catch (err) {
          if (isPreviewEnsureRateLimitedError(err)) {
            auditPreviewPipeline("preview-boot", "ensure rate limited — waiting on status poll", {
              slug,
              previewPort,
              pending: true,
            });
          } else {
            const reach = await finishIfEmbedReachable(1);
            if (reach === true || reach === "failed") return;
            const msg =
              err?.error || err?.message || "Could not start preview. Try again in a moment.";
            applyPreviewFailureDiagnosis(
              {
                ensureStatus: "failed",
                ensureError: msg,
                errorDetail: err?.errorDetail,
                source: "ensure",
              },
              { markBootFailed: true },
            );
            auditPreviewPipeline("preview-boot", `ensure threw: ${msg}`, {
              slug,
              previewPort,
              ok: false,
            });
            logger.warn("client_link_ensure_preview_failed", {
              slug,
              port: previewPort,
              err: err?.message || err,
            });
            return;
          }
        }

        let attempt = 0;
        while (attempt < 120) {
          if (bootStale()) return;
          attempt += 1;
          const tick = nextPreviewBootWaitTick(lastBootStatus, attempt, {
            ensureThrottledUntil: previewEnsureThrottledUntilRef.current,
          });

          if (tick.pollStatus) {
            try {
              const st = await fetchPublicProjectPreviewStatus(slug);
              lastBootStatus = st;
              if (st?.status === "failed") {
                const reach = await finishIfEmbedReachable(attempt);
                if (reach === true || reach === "failed") return;
                if (
                  shouldRetryEnsureAfterFailedStatus(st, attempt, {
                    lastEnsureAt,
                  })
                ) {
                  setPreviewIframeLoadMessage(
                    /native binding|rolldown/i.test(String(st.error || ""))
                      ? "Repairing native dependencies…"
                      : "Retrying preview setup…",
                  );
                  const again = await callEnsure({ retry: true });
                  if (again) {
                    lastBootStatus = again;
                    applyBootProgressMessage(again);
                  }
                  await new Promise((resolve) => setTimeout(resolve, tick.delayMs));
                  continue;
                }
                if ((st?.installRunning || st?.status === "installing") && attempt <= 40) {
                  setPreviewIframeLoadMessage("Installing dependencies…");
                  await new Promise((resolve) => setTimeout(resolve, tick.delayMs));
                  continue;
                }
                applyPreviewFailureDiagnosis(
                  {
                    ensureStatus: "failed",
                    ensureError:
                      st.error || "Preview failed. See preview.log in the project folder.",
                    errorDetail: st.errorDetail,
                    source: "ensure",
                  },
                  { markBootFailed: true },
                );
                return;
              }
              applyBootProgressMessage(st);
              if (
                shouldReEnsureDuringBoot(st, attempt, {
                  lastEnsureAt,
                })
              ) {
                try {
                  const again = await callEnsure({
                    retry: attempt > 24,
                  });
                  if (again) {
                    lastBootStatus = again;
                    applyBootProgressMessage(again);
                  }
                } catch (reEnsureErr) {
                  if (isPreviewEnsureRateLimitedError(reEnsureErr)) {
                    /* backoff via previewEnsureThrottledUntilRef */
                  }
                }
              }
            } catch {
              /* status poll optional */
            }
          }

          if (tick.probeEmbed) {
            const reach = await finishIfEmbedReachable(attempt);
            if (reach === true || reach === "failed") {
              idleWakeActive = false;
              setPreviewIdleWake(false);
              return;
            }
          }

          if (attempt === 3) {
            setPreviewIframeLoadMessage((prev) =>
              prev?.includes("Installing")
                ? prev
                : idleWakeActive
                  ? CLIENT_LINK_PREVIEW_IDLE_WAKE.starting
                  : CLIENT_LINK_PREVIEW_COLD_START.starting,
            );
          } else if (attempt === 10) {
            setPreviewIframeLoadMessage((prev) =>
              prev?.includes("Installing")
                ? prev
                : idleWakeActive
                  ? CLIENT_LINK_PREVIEW_IDLE_WAKE.stillStarting
                  : CLIENT_LINK_PREVIEW_COLD_START.stillStarting,
            );
          }
          await new Promise((resolve) => setTimeout(resolve, tick.delayMs));
        }

        // Exhausted wait loop — surface last known probe failure if any.
        if (!bootStale() && terminalProbeFailures.last) {
          const last = terminalProbeFailures.last;
          const lastBody = String(last.body || last.bodySnippet || "");
          applyPreviewFailureDiagnosis(
            {
              httpStatus: last.httpStatus,
              bodyText: lastBody,
              ensureError: last.error || "Preview did not become ready.",
              errorDetail: lastBody,
              timedOut: Boolean(last.timedOut),
              source: "probe",
            },
            { markBootFailed: true },
          );
        }
      } finally {
        previewBootInFlightRef.current = false;
      }
    },
    [
      stableDevEmbedSrc,
      openDevEmbedGate,
      previewPort,
      devPreviewEmbedHmr,
      applyPreviewFailureDiagnosis,
      clearPreviewFailureDiagnosis,
    ],
  );

  const bootDevEmbedPreviewRef = useRef(bootDevEmbedPreview);
  bootDevEmbedPreviewRef.current = bootDevEmbedPreview;

  const handleEmailGateVerified = useCallback(() => {
    setIdentityEmailBump((b) => b + 1);
    autoAgentRecoveryAttemptedRef.current = false;
    autoAgentEmailPromptedRef.current = true;
    const slug = projectSlug?.trim();
    if (!slug) return;
    previewBootGenerationRef.current += 1;
    setPreviewBootFailed(false);
    clearPreviewFailureDiagnosis();
    void bootDevEmbedPreviewRef.current(slug, { retry: false, soft: false });
  }, [clearPreviewFailureDiagnosis, projectSlug]);

  const handleRetryPreview = useCallback(() => {
    const slug = projectSlug?.trim();
    if (!slug) return;
    previewBootGenerationRef.current += 1;
    setPreviewRemountGen((g) => g + 1);
    void bootDevEmbedPreview(slug, { retry: true });
  }, [bootDevEmbedPreview, projectSlug]);

  const forceRemountPreviewIframe = useCallback(async () => {
    if (!iframeSrc) {
      throw new Error("Preview is not loaded yet.");
    }

    syncIframeBrowsePath();
    const pathForRefresh = resolvePathForPreviewRefresh();
    const serverProbeSrc = stableDevEmbedSrc || iframeSrc;
    const slug = projectSlug?.trim();

    auditPreviewPipeline("iframe-refresh", `hard remount ${serverProbeSrc}`, {
      previewPort,
      pending: true,
    });

    if (!isDevEmbedPreview) {
      const iframeBefore = previewIframeRef.current;
      if (iframeBefore && previewPort != null) {
        stageIframeSessionRestore(previewPort, iframeBefore);
      }
      if (iframeBefore && canAccessIframeDocument(iframeBefore)) {
        pendingSessionSnapshotRef.current = snapshotIframeStorageBundle(iframeBefore);
      }
      let nextNonce = previewRefreshNonce + 1;
      flushSync(() => {
        setPreviewIframeReady(false);
        if (typeof pathForRefresh === "string") {
          setPreviewRefreshBrowsePath(pathForRefresh);
        }
        setPreviewRefreshNonce((n) => {
          nextNonce = n + 1;
          return nextNonce;
        });
      });
      await waitForIframePreviewNonce(() => previewIframeRef.current, nextNonce);
      await waitForIframeLoadEvent(() => previewIframeRef.current);
      const iframeAfter = previewIframeRef.current;
      if (iframeAfter && pendingSessionSnapshotRef.current) {
        restoreIframeStagedStorage(iframeAfter, pendingSessionSnapshotRef.current);
        pendingSessionSnapshotRef.current = null;
      }
      return;
    }

    setPreviewIframeLoadMessage("Waiting for preview server…");
    const serverReady = await pollUntilEmbedPreviewFullyReady(serverProbeSrc, {
      maxAttempts: 120,
      perAttemptTimeoutMs: 8000,
      quiet: true,
      onAttempt: (attempt) => {
        if (attempt === 3) {
          setPreviewIframeLoadMessage("Starting preview…");
        } else if (attempt === 8) {
          setPreviewIframeLoadMessage("Compiling preview modules…");
        } else if (attempt === 10) {
          setPreviewIframeLoadMessage("Compiling preview…");
        } else if (attempt === 24) {
          setPreviewIframeLoadMessage(
            "First load can take a few minutes. The preview will appear when ready.",
          );
        }
      },
    });

    if (!serverReady.ok) {
      const errLine = String(serverReady.error || "Preview URL not ready").trim();
      setPreviewIframeLoadMessage(
        `Preview error: ${errLine}\n\nRestarting preview (npm install + npm run dev)…`,
      );
      auditPreviewPipeline("iframe-refresh", `poll failed: ${errLine}`, {
        previewPort,
        ok: false,
      });
      if (slug) {
        previewBootGenerationRef.current += 1;
        await bootDevEmbedPreview(slug, { retry: true });
      }
      throw new Error(errLine || "Preview server not ready");
    }

    if (devPreviewEmbedHmr) {
      openDevEmbedGate("Loading preview…");
    }

    setPreviewIframeLoadMessage("Loading preview…");
    const iframeBeforeRemount = previewIframeRef.current;
    if (iframeBeforeRemount && previewPort != null) {
      stageIframeSessionRestore(previewPort, iframeBeforeRemount);
    }
    if (iframeBeforeRemount && canAccessIframeDocument(iframeBeforeRemount)) {
      pendingSessionSnapshotRef.current = snapshotIframeStorageBundle(iframeBeforeRemount);
    }
    let nextNonce = previewRefreshNonce + 1;
    flushSync(() => {
      setPreviewIframeReady(false);
      if (typeof pathForRefresh === "string") {
        setPreviewRefreshBrowsePath(pathForRefresh);
      }
      setPreviewRefreshNonce((n) => {
        nextNonce = n + 1;
        return nextNonce;
      });
    });

    const nonceApplied = await waitForIframePreviewNonce(() => previewIframeRef.current, nextNonce);
    if (!nonceApplied) {
      setPreviewBootFailed(true);
      setPreviewIframeLoadMessage("Preview iframe did not remount. Try Reload preview again.");
      auditPreviewPipeline("iframe-refresh", "iframe src nonce not applied", {
        previewPort,
        ok: false,
      });
      throw new Error("Preview iframe did not remount.");
    }

    await waitForIframeLoadEvent(() => previewIframeRef.current);

    const iframeAfterRemount = previewIframeRef.current;
    if (iframeAfterRemount && pendingSessionSnapshotRef.current) {
      restoreIframeStagedStorage(iframeAfterRemount, pendingSessionSnapshotRef.current);
      pendingSessionSnapshotRef.current = null;
    }

    const iframeReady = await pollUntilIframePreviewContentReady(() => previewIframeRef.current, {
      maxAttempts: 120,
      intervalMs: 500,
      onAttempt: (attempt) => {
        if (attempt === 8) {
          setPreviewIframeLoadMessage("Still loading preview…");
        }
      },
    });

    if (!iframeReady && !isIframePreviewContentReady(previewIframeRef.current)) {
      const diagnosed = await applyPreviewFailureDiagnosis(
        {
          iframe: previewIframeRef.current,
          timedOut: true,
          source: "iframe",
        },
        { markBootFailed: true },
      );
      if (!diagnosed) {
        setPreviewBootFailed(true);
        setPreviewIframeLoadMessage("Preview did not finish loading. Try Reload preview again.");
      }
      auditPreviewPipeline("iframe-refresh", "iframe never became ready", {
        previewPort,
        ok: false,
      });
      throw new Error("Preview did not finish loading.");
    }

    setPreviewIframeReady(true);
    setPreviewIframeLoadMessage("");
    clearPreviewFailureDiagnosis();
    setEmbedHmrWsState("idle");
    auditPreviewPipeline("iframe-refresh", "preview ready", {
      previewPort,
      ok: true,
    });
  }, [
    iframeSrc,
    stableDevEmbedSrc,
    previewPort,
    previewRefreshNonce,
    isDevEmbedPreview,
    devPreviewEmbedHmr,
    projectSlug,
    resolvePathForPreviewRefresh,
    bumpIframeRefresh,
    bootDevEmbedPreview,
    syncIframeBrowsePath,
    openDevEmbedGate,
    applyPreviewFailureDiagnosis,
    clearPreviewFailureDiagnosis,
  ]);

  forceRemountPreviewIframeRef.current = forceRemountPreviewIframe;

  /**
   * Sync workspace from saved tag, try embed HMR, then hard-remount iframe if needed.
   */
  const syncAndRefreshPreview = useCallback(
    async ({
      clean = false,
      skipLiveBuild = false,
      waitForHmr = true,
      forceRemount = false,
      requireIframeReload = false,
    } = {}) => {
      const slug = projectSlug?.trim();
      const rid = effectiveChatReleaseId;
      if (!slug || rid == null) {
        throw new Error("Missing release or project.");
      }
      if (previewRefreshBusy) {
        return { ok: false, reason: "busy" };
      }

      setPreviewRefreshBusy(true);
      previewRefreshBusyRef.current = true;
      setPreviewBootFailed(false);
      embedHmrWsRecoveryRef.current.reset();
      setEmbedHmrWsState("recovering");
      setPreviewIframeLoadMessage("Syncing workspace…");

      try {
        let refreshResult = { ok: true, filesWritten: 0, hmr: false };

        if (!skipLiveBuild) {
          const email = getClientLinkVerifiedEmail()?.trim();
          if (!email || !isPlausibleClientLinkEmail(email)) {
            throw new Error("Client email is not verified.");
          }
          if (previewPort != null && previewIframeRef.current) {
            stageIframeSessionRestore(previewPort, previewIframeRef.current);
          }
          const preferHmrSync = devPreviewEmbedHmr && isDevEmbedPreview && !clean;
          let buildTimeoutId;
          const buildTimeoutPromise = new Promise((_, reject) => {
            buildTimeoutId = window.setTimeout(() => {
              reject(
                new Error("Preview sync timed out. Reloading preview without a full rebuild…"),
              );
            }, PREVIEW_REFRESH_BUILD_TIMEOUT_MS);
          });
          try {
            refreshResult = await Promise.race([
              clientLinkRefreshLiveBuild(slug, Number(rid), email, {
                clean: clean || !preferHmrSync,
              }),
              buildTimeoutPromise,
            ]);
          } finally {
            window.clearTimeout(buildTimeoutId);
          }
        }

        await reloadProjectQuiet();

        const filesWritten = Number(refreshResult?.filesWritten) || 0;
        // Authoritative mode from the backend sync for THIS call (none/hmr/restart).
        const backendRefreshMode =
          typeof refreshResult?.refreshMode === "string" ? refreshResult.refreshMode.trim() : "";

        const earlyExit = resolveClientLinkPreviewSyncEarlyExit({
          forceRemount,
          skipLiveBuild,
          filesWritten,
          hmr: refreshResult?.hmr,
          requireIframeReload,
        });
        if (earlyExit === "noop") {
          return { ok: true, mode: "noop", refreshMode: backendRefreshMode || "none" };
        }
        if (earlyExit === "needs_soft_reload") {
          return {
            ok: true,
            mode: "needs_soft_reload",
            refreshMode: backendRefreshMode || "restart",
          };
        }

        if (forceRemount) {
          setPreviewIframeLoadMessage("Remounting preview…");
          await forceRemountPreviewIframe();
          return { ok: true, mode: "remount", refreshMode: backendRefreshMode || "restart" };
        }

        const useHmrWait =
          waitForHmr &&
          !forceRemount &&
          devPreviewEmbedHmr &&
          isDevEmbedPreview &&
          refreshResult?.hmr !== false &&
          filesWritten > 0;

        if (useHmrWait) {
          setPreviewIframeLoadMessage("Applying changes…");
          const hmrResult = await waitForEmbedHmrUpdate({
            port: previewPort,
            settleMs: 400,
          });
          if (hmrResult.ok) {
            auditPreviewPipeline("iframe-refresh", `HMR applied via ${hmrResult.status}`, {
              previewPort,
              ok: true,
            });
            setPreviewIframeReady(true);
            setPreviewIframeLoadMessage("");
            setEmbedHmrWsState("connected");
            if (devPreviewEmbedHmr) {
              setDevEmbedSessionLive(true);
              openDevEmbedGate("");
            }
            return {
              ok: true,
              mode: "hmr",
              status: hmrResult.status,
              refreshMode: backendRefreshMode || "hmr",
            };
          }

          const iframeAfterHmr = previewIframeRef.current;
          if (
            iframeAfterHmr &&
            canAccessIframeDocument(iframeAfterHmr) &&
            isIframePreviewContentReady(iframeAfterHmr) &&
            !isIframePreviewErrorPage(iframeAfterHmr)
          ) {
            auditPreviewPipeline("iframe-refresh", "HMR signal missed but preview still ready", {
              previewPort,
              ok: true,
            });
            setPreviewIframeReady(true);
            setPreviewIframeLoadMessage("");
            setEmbedHmrWsState("connected");
            if (devPreviewEmbedHmr) {
              setDevEmbedSessionLive(true);
              openDevEmbedGate("");
            }
            return {
              ok: true,
              mode: "hmr",
              status: "iframe-still-ready",
              refreshMode: backendRefreshMode || "hmr",
            };
          }
        }

        return {
          ok: true,
          mode: "needs_soft_reload",
          refreshMode: backendRefreshMode || "restart",
        };
      } catch (err) {
        const msg = err?.error || err?.message || "Could not refresh preview";
        setPreviewBootFailed(true);
        setPreviewIframeLoadMessage(msg);
        auditPreviewPipeline("iframe-refresh", `refresh failed: ${msg}`, {
          previewPort,
          ok: false,
        });
        throw err;
      } finally {
        previewRefreshBusyRef.current = false;
        setPreviewRefreshBusy(false);
        previewRefreshHmrGraceUntilRef.current = Date.now() + 8000;
        const iframe = previewIframeRef.current;
        if (iframe && isIframePreviewContentReady(iframe) && !isIframePreviewErrorPage(iframe)) {
          setPreviewIframeReady(true);
          setPreviewIframeLoadMessage("");
          setPreviewBootFailed(false);
          if (devPreviewEmbedHmr) {
            setDevEmbedSessionLive(true);
            openDevEmbedGate("");
          }
        } else if (!previewBootFailed) {
          setPreviewIframeLoadMessage("");
        }
      }
    },
    [
      projectSlug,
      effectiveChatReleaseId,
      previewRefreshBusy,
      devPreviewEmbedHmr,
      isDevEmbedPreview,
      previewPort,
      reloadProjectQuiet,
      forceRemountPreviewIframe,
      openDevEmbedGate,
    ],
  );

  const handleChatPreviewCommitApplied = useCallback(({ releaseId } = {}) => {
    if (releaseId != null) setPreviewContextReleaseId(Number(releaseId));
  }, []);

  /**
   * The agent-turn settle window (backend merge + workspace sync) deliberately disrupts the
   * dev server, so transient embed HMR "failed" events here are expected — mute the recovery
   * toast / auto reload while settling and keep a short grace afterwards.
   */
  const handleAgentTurnSettlingChange = useCallback((active) => {
    clientLinkSettleActiveRef.current = Boolean(active);
    previewRefreshHmrGraceUntilRef.current = Date.now() + (active ? 60_000 : 8_000);
  }, []);

  const handleChatAgentWorkingChange = useCallback((next) => {
    setChatAgentWorking((prev) => {
      const active = Boolean(next?.active);
      const statusLine = String(next?.statusLine || "").trim();
      if (prev.active === active && prev.statusLine === statusLine) return prev;
      return { active, statusLine };
    });
  }, []);

  /**
   * Lightweight preview reload: remount iframe with a new `_pv` cache-bust nonce
   * so the embed loads fresh modules from the dev server. Waits for the dev server
   * before remounting and retries when the embed proxy returns 502 while Vite restarts.
   */
  const softReloadPreviewIframe = useCallback(async () => {
    if (previewRefreshBusyRef.current) return false;

    syncIframeBrowsePath();
    const pathForRefresh = resolvePathForPreviewRefresh();
    const serverProbeSrc = stableDevEmbedSrc || iframeSrc;
    const slug = projectSlug?.trim();
    const maxAttempts = isDevEmbedPreview ? 2 : 1;

    previewRefreshBusyRef.current = true;
    setPreviewRefreshBusy(true);
    setPreviewBootFailed(false);
    clearPreviewFailureDiagnosis();
    embedHmrWsRecoveryRef.current.reset();
    setPreviewIframeReady(false);
    setPreviewIframeLoadMessage("Updating preview…");

    const markSoftReloadStuck = (message) => {
      setPreviewIframeLoadMessage(message);
      setPreviewLoadStuckRecoveryAvailable(true);
      setPreviewReloadActionEnabled(true);
    };

    /** Short probe budget (~15–20s) — do not burn minutes on ensure storms. */
    const probeEmbedServerReady = async (probeOpts = {}) =>
      pollUntilEmbedPreviewFullyReady(serverProbeSrc, {
        maxAttempts: probeOpts.maxAttempts ?? 20,
        perAttemptTimeoutMs: 1000,
        quiet: true,
        onAttempt: (probeAttempt) => {
          if (probeAttempt === 3) {
            setPreviewIframeLoadMessage("Compiling preview…");
          } else if (probeAttempt === 10) {
            setPreviewIframeLoadMessage("Still updating preview…");
          }
        },
      });

    const restartPreviewServerIfNeeded = async () => {
      if (!slug || !isDevEmbedPreview) return null;
      setPreviewIframeLoadMessage("Starting preview…");
      auditPreviewPipeline("iframe-refresh", "soft reload triggering preview ensure", {
        slug,
        previewPort,
        pending: true,
      });
      try {
        const ensured = await ensurePublicProjectPreview(slug, {
          retry: true,
          clientEmail: getClientLinkVerifiedEmail()?.trim() || "",
        });
        auditPreviewPipeline(
          "iframe-refresh",
          `soft reload ensure status=${ensured?.status} listening=${ensured?.listening}`,
          {
            slug,
            previewPort,
            ok: ensured?.status !== "failed" && ensured?.listening !== false,
          },
        );
        return ensured;
      } catch (err) {
        auditPreviewPipeline(
          "iframe-refresh",
          `soft reload ensure failed: ${err?.message || err}`,
          { slug, previewPort, ok: false },
        );
        return null;
      }
    };

    try {
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        if (isDevEmbedPreview && serverProbeSrc) {
          setPreviewIframeLoadMessage(
            attempt === 1 ? "Waiting for preview server…" : "Preview server restarting…",
          );
          let serverReady = await probeEmbedServerReady();
          // Only force ensure when the port is unreachable — never restart a healthy server.
          if (!serverReady.ok && slug) {
            const unreachable =
              /not running|unreachable|502|ECONNREFUSED|failed to fetch|network/i.test(
                String(serverReady.error || ""),
              );
            if (unreachable || attempt > 1) {
              await restartPreviewServerIfNeeded();
              serverReady = await probeEmbedServerReady({ maxAttempts: 15 });
            }
          }
          if (!serverReady.ok) {
            auditPreviewPipeline(
              "iframe-refresh",
              `soft reload server probe failed attempt ${attempt}: ${serverReady.error || "unknown"}`,
              { previewPort, ok: false },
            );
            if (attempt < maxAttempts) {
              await restartPreviewServerIfNeeded();
              await new Promise((resolve) => setTimeout(resolve, 800));
              continue;
            }
            markSoftReloadStuck(
              `${String(serverReady.error || "Preview server not ready").trim()}. Use Reload preview below.`,
            );
            return false;
          }
        }

        let nextNonce = 0;
        const iframeBeforeReload = previewIframeRef.current;
        let usedInPlaceReload = false;
        if (iframeBeforeReload && previewPort != null) {
          stageIframeSessionRestore(previewPort, iframeBeforeReload);
        }
        if (iframeBeforeReload && canAccessIframeDocument(iframeBeforeReload)) {
          pendingSessionSnapshotRef.current = snapshotIframeStorageBundle(iframeBeforeReload);
          usedInPlaceReload = bumpEmbedIframeLocationInPlace(iframeBeforeReload, previewPort);
        }
        if (!usedInPlaceReload) {
          flushSync(() => {
            setPreviewRefreshBrowsePath(pathForRefresh);
            setPreviewRefreshNonce((n) => {
              nextNonce = n + 1;
              return nextNonce;
            });
          });

          const nonceApplied = await waitForIframePreviewNonce(
            () => previewIframeRef.current,
            nextNonce,
          );
          if (!nonceApplied) {
            auditPreviewPipeline("iframe-refresh", "soft reload iframe nonce not applied", {
              previewPort,
              ok: false,
            });
            if (attempt < maxAttempts) continue;
            markSoftReloadStuck("Preview iframe did not remount. Use Reload preview below.");
            return false;
          }
        }

        await waitForIframeLoadEvent(() => previewIframeRef.current);

        const iframeAfterReload = previewIframeRef.current;
        if (iframeAfterReload && pendingSessionSnapshotRef.current) {
          const pending = pendingSessionSnapshotRef.current;
          await restoreIframeStagedStorageWithHydrationRetries(iframeAfterReload, pending);
          // Clear only after restore attempts so a remount race can still apply the snapshot.
          pendingSessionSnapshotRef.current = null;
        }

        const iframeAfterLoad = previewIframeRef.current;
        if (iframeAfterLoad && isIframePreviewErrorPage(iframeAfterLoad)) {
          auditPreviewPipeline(
            "iframe-refresh",
            `soft reload embed error page attempt ${attempt}`,
            { previewPort, ok: false },
          );
          if (attempt < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
          }
          applyPreviewFailureDiagnosis({ iframe: iframeAfterLoad, source: "iframe" });
        }

        const ready = await pollUntilIframePreviewContentReady(() => previewIframeRef.current, {
          maxAttempts: 40,
          intervalMs: 250,
          onAttempt: (pollAttempt) => {
            if (pollAttempt === 12) {
              setPreviewIframeLoadMessage("Still updating preview…");
            }
          },
        });

        if (
          ready ||
          isIframePreviewReadyEnough(previewIframeRef.current) ||
          isIframePreviewContentReady(previewIframeRef.current)
        ) {
          setPreviewIframeReady(true);
          setPreviewIframeLoadMessage("");
          setPreviewBootFailed(false);
          clearPreviewFailureDiagnosis();
          syncIframeBrowsePath();
          auditPreviewPipeline("iframe-refresh", "soft reload ready", {
            previewPort,
            ok: true,
          });
          return true;
        }

        if (attempt < maxAttempts && isIframePreviewErrorPage(previewIframeRef.current)) {
          continue;
        }
      }

      const stuckIframe = previewIframeRef.current;
      if (
        stuckIframe &&
        (isIframePreviewErrorPage(stuckIframe) || isIframePreviewBlankOrBroken(stuckIframe))
      ) {
        applyPreviewFailureDiagnosis({
          iframe: stuckIframe,
          source: "iframe",
          blankSustained: true,
        });
      } else {
        markSoftReloadStuck("Preview didn't update. Use Reload preview below.");
      }
      auditPreviewPipeline("iframe-refresh", "soft reload gave up", {
        previewPort,
        ok: false,
      });
      return false;
    } finally {
      previewRefreshBusyRef.current = false;
      setPreviewRefreshBusy(false);
    }
  }, [
    syncIframeBrowsePath,
    resolvePathForPreviewRefresh,
    stableDevEmbedSrc,
    iframeSrc,
    isDevEmbedPreview,
    previewPort,
    projectSlug,
    applyPreviewFailureDiagnosis,
    clearPreviewFailureDiagnosis,
  ]);

  const handleRefreshIframe = useCallback(async () => {
    if (!iframeSrc || previewRefreshBusy) return;
    await softReloadPreviewIframe();
  }, [iframeSrc, previewRefreshBusy, softReloadPreviewIframe]);

  softReloadPreviewIframeRef.current = softReloadPreviewIframe;

  // While Start Server is showing, keep probing — clear the card if the port comes up
  // (common after a transient 502 or when ensure lagged behind the process).
  useEffect(() => {
    if (previewFailureDiagnosis?.kind !== "port_unreachable") return undefined;
    const src = stableDevEmbedSrc;
    if (!src || !isDevIframePreviewSrc(src)) return undefined;

    let cancelled = false;
    const recover = async () => {
      try {
        const probe = await inspectDevIframePreviewSrc(src, {
          timeoutMs: 5_000,
          requireAppHtml: false,
          allowPartialShell: true,
        });
        if (cancelled || !probe.ok) return;
        auditPreviewPipeline("health-probe", "auto-recover Start Server — embed reachable", {
          previewPort,
          ok: true,
        });
        clearPreviewFailureDiagnosis();
        setPreviewBootFailed(false);
        openDevEmbedGate("");
        const reloaded = await softReloadPreviewIframeRef.current();
        if (!reloaded) {
          try {
            await forceRemountPreviewIframeRef.current();
          } catch {
            /* overlay cleared; user can reload */
          }
        }
      } catch {
        /* keep Start Server card */
      }
    };

    const intervalId = window.setInterval(() => {
      void recover();
    }, PREVIEW_PORT_RECOVERY_PROBE_MS);
    void recover();
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [
    previewFailureDiagnosis?.kind,
    stableDevEmbedSrc,
    previewPort,
    clearPreviewFailureDiagnosis,
    openDevEmbedGate,
  ]);

  const handlePreviewLiveRefreshAfterTurn = useClientLinkPreviewRefresh({
    iframeSrc,
    previewPort,
    previewIframeRef,
    previewRefreshBusyRef,
    devPreviewEmbedHmr,
    embedHmrWsState,
    syncAndRefreshPreview,
    softReloadPreviewIframe,
    openDevEmbedGate,
    setPreviewIframeReady,
    setPreviewIframeLoadMessage,
    setDevEmbedSessionLive,
  });

  const handleSyncAndRefreshPreview = useCallback(
    async ({
      clean = false,
      skipLiveBuild = false,
      forceRemount = false,
      waitForHmr,
      requireIframeReload = false,
    } = {}) =>
      syncAndRefreshPreview({
        clean,
        skipLiveBuild,
        waitForHmr: waitForHmr ?? !forceRemount,
        forceRemount,
        requireIframeReload,
      }),
    [syncAndRefreshPreview],
  );

  useEffect(() => {
    if (!devPreviewEmbedHmr) {
      embedHmrWsRecoveryRef.current.reset();
      setEmbedHmrWsState("idle");
      return;
    }
    embedHmrWsRecoveryRef.current.reset();
    setEmbedHmrWsState("idle");
  }, [devPreviewEmbedHmr, previewPort]);

  useEffect(() => {
    if (!devPreviewEmbedHmr) return undefined;

    const showExhaustedToast = () => {
      toast.error(CLIENT_LINK_PREVIEW_RECOVERY.embedHmrReconnectFailed);
    };

    const runAutoHardReload = () => {
      void (async () => {
        previewRefreshBusyRef.current = true;
        setPreviewRefreshBusy(true);
        previewRefreshHmrGraceUntilRef.current = Date.now() + 15_000;
        setEmbedHmrWsState("recovering");
        auditPreviewPipeline("embed-hmr-ws", "auto hard reload after repeated HMR failures", {
          previewPort,
          pending: true,
        });
        try {
          await forceRemountPreviewIframeRef.current();
          const outcome = embedHmrWsRecoveryRef.current.onHardReloadComplete({
            success: true,
          });
          if (outcome.nextState) {
            setEmbedHmrWsState(outcome.nextState);
          }
        } catch (err) {
          const outcome = embedHmrWsRecoveryRef.current.onHardReloadComplete({
            success: false,
          });
          setEmbedHmrWsState(outcome.nextState ?? "exhausted");
          if (outcome.showExhaustedToast) {
            showExhaustedToast();
          }
          auditPreviewPipeline("embed-hmr-ws", `auto hard reload failed: ${err?.message || err}`, {
            previewPort,
            ok: false,
          });
        } finally {
          previewRefreshBusyRef.current = false;
          setPreviewRefreshBusy(false);
          previewRefreshHmrGraceUntilRef.current = Date.now() + 8000;
        }
      })();
    };

    const onMessage = (ev) => {
      if (ev.origin !== window.location.origin) return;
      if (!isEmbedHmrWsMessage(ev.data)) return;
      if (previewPort != null && Number(ev.data.port) !== Number(previewPort)) {
        return;
      }

      if (ev.data.status === "open") {
        const outcome = embedHmrWsRecoveryRef.current.onOpen();
        setEmbedHmrWsState(outcome.nextState ?? "connected");
        return;
      }

      if (ev.data.status === "hmr-update") {
        return;
      }

      if (ev.data.status === "full-reload") {
        auditPreviewPipeline(
          "embed-hmr-ws",
          `vite full-reload path=${ev.data.path ?? "*"} (dev server reloaded the page, not a hot update)`,
          { previewPort, ok: true, pending: true },
        );
        setCompileTheaterProgress(
          mergeCompileProgress(null, {
            reset: true,
            quiet: true,
            route: typeof ev.data.path === "string" ? ev.data.path : "",
          }),
        );
        setCompileTheaterNow(Date.now());
        return;
      }

      if (ev.data.status === "failed") {
        const skip =
          previewRefreshBusyRef.current ||
          clientLinkSettleActiveRef.current ||
          Date.now() < previewRefreshHmrGraceUntilRef.current;
        const outcome = embedHmrWsRecoveryRef.current.onFailed({ skip });
        if (outcome.action === "ignored") {
          return;
        }

        auditPreviewPipeline(
          "embed-hmr-ws",
          `failed streak=${ev.data.failStreak ?? "?"} action=${outcome.action}`,
          { previewPort, pending: true },
        );

        if (outcome.showInitialToast) {
          toast.error(CLIENT_LINK_PREVIEW_RECOVERY.embedHmrConnectionLost);
        }
        if (outcome.showExhaustedToast) {
          showExhaustedToast();
        }
        if (outcome.nextState) {
          setEmbedHmrWsState(outcome.nextState);
        }
        if (outcome.action === "hard-reload") {
          runAutoHardReload();
        }
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [devPreviewEmbedHmr, previewPort]);

  useEffect(() => {
    const onCompileProgress = (ev) => {
      if (ev.origin !== window.location.origin) return;
      const parsed = parseEmbedCompileProgressMessage(ev.data);
      if (!parsed) return;
      if (
        previewPort != null &&
        parsed.port != null &&
        Number(parsed.port) !== Number(previewPort)
      ) {
        return;
      }
      setCompileTheaterProgress((prev) =>
        mergeCompileProgress(prev, {
          stage: parsed.stage,
          file: parsed.file,
          done: parsed.done,
          total: parsed.total,
          route: parsed.route,
        }),
      );
      setCompileTheaterNow(Date.now());
    };
    window.addEventListener("message", onCompileProgress);
    return () => window.removeEventListener("message", onCompileProgress);
  }, [previewPort]);

  useEffect(() => {
    if (previewIframeReady && !nextInAppCompiling && !compileTheaterProgress?.quiet) {
      setCompileTheaterProgress(null);
    }
  }, [previewIframeReady, nextInAppCompiling, compileTheaterProgress?.quiet]);

  useEffect(() => {
    if (!compileTheaterProgress?.quiet) return undefined;
    if (!previewIframeReady) return undefined;
    // Quiet HMR/reload theater: drop after a short settle once the page is ready again.
    const id = window.setTimeout(() => {
      setCompileTheaterProgress((prev) => (prev?.quiet ? null : prev));
    }, 2500);
    return () => window.clearTimeout(id);
  }, [compileTheaterProgress?.quiet, previewIframeReady, compileTheaterProgress?.done]);

  useEffect(() => {
    if (!hasCompileTheaterProgress(compileTheaterProgress)) return undefined;
    if (previewIframeReady && !nextInAppCompiling) return undefined;
    const id = window.setInterval(() => setCompileTheaterNow(Date.now()), 2000);
    return () => window.clearInterval(id);
  }, [compileTheaterProgress, previewIframeReady, nextInAppCompiling]);

  useEffect(() => {
    const onEmbedRoute = (ev) => {
      if (ev.origin !== window.location.origin && ev.origin !== previewEmbedOrigin) return;
      const data = ev.data;
      if (data?.type !== EMBED_ROUTE_MESSAGE_TYPE) return;
      if (previewPort != null && data.port != null && Number(data.port) !== Number(previewPort)) {
        return;
      }
      applyIframeBrowsePath(data.path);
    };
    window.addEventListener("message", onEmbedRoute);
    return () => window.removeEventListener("message", onEmbedRoute);
  }, [applyIframeBrowsePath, previewPort, previewEmbedOrigin]);

  const embedHmrWsBlocked =
    devPreviewEmbedHmr && (embedHmrWsState === "failed" || embedHmrWsState === "exhausted");
  const embedHmrWsBannerState =
    devPreviewEmbedHmr && ["recovering", "failed", "exhausted"].includes(embedHmrWsState)
      ? embedHmrWsState
      : null;

  /** Start backend dev server for Review portal and Preview-only (`?c=false`) — same process. */
  useEffect(() => {
    if (!hasVerifiedClientEmail) {
      return undefined;
    }
    if (isViewingVersionPreview) {
      setDevEmbedGateOpen(Boolean(iframeSrc));
      setPreviewIframeReady(false);
      setPreviewIframeLoadMessage("Loading version preview…");
      return undefined;
    }
    const skipForScratch =
      awaitScratchPreview && onboardPreviewWaiting && !livePreviewInProgressRef.current;
    if (skipForScratch || !isDevEmbedPreview || !stableDevEmbedSrc || !projectSlug?.trim()) {
      setDevEmbedGateOpen(Boolean(stableDevEmbedSrc) && !isDevEmbedPreview);
      return undefined;
    }
    const slug = projectSlug.trim();
    let cancelled = false;
    void (async () => {
      // Never skip ensure solely because HMR refs still look "live" — idle soft-stop
      // leaves sessionLive true while npm run dev is already gone.
      if (
        isPreviewEmbedHmrEnabled() &&
        devEmbedBootPortRef.current === previewPort &&
        previewPort != null &&
        (devEmbedLiveRef.current.gate || devEmbedLiveRef.current.ready || devEmbedSessionLive)
      ) {
        try {
          if (
            await probeDevIframePreviewSrc(stableDevEmbedSrc, {
              timeoutMs: 4000,
            })
          ) {
            if (!cancelled) {
              setDevEmbedGateOpen(true);
            }
            return;
          }
        } catch {
          /* probe failed — fall through to boot */
        }
        if (cancelled) return;
        setDevEmbedSessionLive(false);
      }
      await bootDevEmbedPreviewRef.current(slug, { retry: false, soft: true });
      if (!cancelled && previewPort != null) {
        devEmbedBootPortRef.current = previewPort;
      }
    })();
    return () => {
      cancelled = true;
      if (!isPreviewEmbedHmrEnabled()) {
        previewBootGenerationRef.current += 1;
      }
    };
  }, [
    stableDevEmbedSrc,
    projectSlug,
    isDevEmbedPreview,
    isViewingVersionPreview,
    awaitScratchPreview,
    onboardPreviewWaiting,
    previewPort,
    hasVerifiedClientEmail,
  ]);

  /**
   * Heartbeat keeps the session registry warm for embed access.
   * Preview PM2 stays running (always-on) — do not stop on tab close; operators stop from project management.
   */
  useEffect(() => {
    if (!isDevEmbedPreview || !projectSlug?.trim() || isViewingVersionPreview) {
      return undefined;
    }
    const slug = projectSlug.trim();
    const heartbeatMs = 25_000;

    // Hidden tabs must not heartbeat, or a forgotten background tab defeats idle soft-stop;
    // the visibilitychange handler below re-boots the preview when the tab is shown again.
    const sendHeartbeat = () => {
      if (document.visibilityState !== "visible") return;
      sendPublicProjectPreviewHeartbeat(slug).catch(() => {});
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat();
        // Idle soft-stop may have killed npm run dev while the tab was hidden.
        // Re-boot if embed is down so Client Link auto-starts without a manual Start.
        if (stableDevEmbedSrc && projectSlug?.trim()) {
          void (async () => {
            try {
              const up = await probeDevIframePreviewSrc(stableDevEmbedSrc, {
                timeoutMs: 3000,
              });
              if (up) return;
            } catch {
              /* ensure wake */
            }
            setDevEmbedSessionLive(false);
            await bootDevEmbedPreviewRef.current(projectSlug.trim(), {
              retry: false,
              soft: true,
            });
          })();
        }
      }
    };

    sendHeartbeat();
    const intervalId = window.setInterval(sendHeartbeat, heartbeatMs);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isDevEmbedPreview, projectSlug, isViewingVersionPreview, stableDevEmbedSrc]);

  const showDevEmbedIframe =
    (Boolean(iframeSrc) || Boolean(previewErrorDocumentHtml)) &&
    (isViewingVersionPreview ||
      !isDevEmbedPreview ||
      devEmbedGateOpen ||
      Boolean(previewErrorDocumentHtml) ||
      (devPreviewEmbedHmr && devEmbedSessionLive));

  const iframeMountKey =
    devPreviewEmbedHmr && (devEmbedSessionLive || devEmbedGateOpen)
      ? `hmr-embed-${previewPort ?? "none"}-${previewRemountGen}`
      : `${previewPort ?? "none"}-${previewMeta?.versionId ?? "live"}`;

  const effectivePreviewWidth = React.useMemo(() => {
    const stage =
      previewStageWidth > 0
        ? previewStageWidth
        : typeof window !== "undefined"
          ? Math.max(window.innerWidth - 48, PREVIEW_MIN_W)
          : 1200;
    const cap = Math.min(Math.max(stage, PREVIEW_MIN_W), 1920);
    switch (responsivePreset) {
      case "desktop":
        return cap;
      case "tablet":
        return Math.min(PREVIEW_TABLET_W, cap);
      case "mobile":
        return Math.min(PREVIEW_MOBILE_W, cap);
      case "custom":
      default:
        return Math.min(Math.max(responsiveCustomWidth, PREVIEW_MIN_W), cap);
    }
  }, [previewStageWidth, responsivePreset, responsiveCustomWidth]);

  const handleResponsiveDragWidth = useCallback((w) => {
    setResponsivePreset("custom");
    setResponsiveCustomWidth(w);
  }, []);

  const restorePreviewIframeStagedStorage = useCallback(
    (iframe) => {
      if (!iframe || !canAccessIframeDocument(iframe)) return;
      const pending = pendingSessionSnapshotRef.current;
      if (pending) {
        pendingSessionSnapshotRef.current = null;
        void restoreIframeStagedStorageWithHydrationRetries(iframe, pending);
        // Only after an intentional session-restore refresh: if we landed on an
        // auth route, return to the last app page. Do NOT bounce intentional
        // in-app navigations to /login or /register (full document loads).
        const livePath = readIframeBrowsePath(iframe);
        const targetPath = resolvePathForPreviewRefresh();
        if (
          isAuthBrowsePath(livePath) &&
          targetPath &&
          !isAuthBrowsePath(targetPath) &&
          livePath !== targetPath
        ) {
          navigateEmbedIframeToBrowsePath(iframe, previewPort, targetPath);
        }
      } else if (previewPort != null) {
        applyStagedStorageFromLocalStorage(previewPort, iframe);
      }
    },
    [previewPort, resolvePathForPreviewRefresh],
  );

  /** Poll until Vite modules and iframe DOM show real app content (keeps loader up during Network pending). */
  const waitForPreviewIframeContentReady = useCallback(async () => {
    const pollGen = previewContentPollGenRef.current + 1;
    previewContentPollGenRef.current = pollGen;
    const isStalePoll = () => pollGen !== previewContentPollGenRef.current;

    setPreviewIframeLoadMessage(PREVIEW_CONTENT_LOAD_MESSAGES.fetching);

    if (isDevEmbedPreview && iframeSrc) {
      await pollUntilEmbedViteModulesReady(iframeSrc, {
        maxAttempts: 120,
        perAttemptTimeoutMs: 8000,
        quiet: true,
        onAttempt: (attempt) => {
          if (isStalePoll()) return;
          if (attempt === 8) {
            setPreviewIframeLoadMessage(PREVIEW_CONTENT_LOAD_MESSAGES.compiling);
          }
        },
      });
      if (isStalePoll() || previewRefreshBusyRef.current) {
        return false;
      }
    }

    const ready = await pollUntilIframePreviewContentReady(
      () => (isStalePoll() ? null : previewIframeRef.current),
      {
        maxAttempts: 120,
        intervalMs: 500,
        onAttempt: (attempt) => {
          if (isStalePoll()) return;
          if (attempt === 8) {
            setPreviewIframeLoadMessage(PREVIEW_CONTENT_LOAD_MESSAGES.compiling);
          } else if (attempt === 24) {
            setPreviewIframeLoadMessage(PREVIEW_CONTENT_LOAD_MESSAGES.stillLoading);
          }
        },
      },
    );

    if (isStalePoll() || previewRefreshBusyRef.current) {
      return false;
    }

    const iframe = previewIframeRef.current;
    if (iframe && isIframePreviewReadyEnough(iframe) && !isIframePreviewErrorPage(iframe)) {
      setPreviewIframeReady(true);
      setPreviewIframeLoadMessage("");
      setPreviewBootFailed(false);
      clearPreviewFailureDiagnosis();
      clearNextInAppCompile();
      syncIframeBrowsePath();
      if (devPreviewEmbedHmr) {
        setDevEmbedSessionLive(true);
        openDevEmbedGate("");
      }
      return ready;
    }
    if (iframe && (isIframePreviewErrorPage(iframe) || isIframePreviewBlankOrBroken(iframe))) {
      applyPreviewFailureDiagnosis({ iframe, source: "iframe", blankSustained: true });
    }
    return false;
  }, [
    isDevEmbedPreview,
    iframeSrc,
    devPreviewEmbedHmr,
    openDevEmbedGate,
    syncIframeBrowsePath,
    applyPreviewFailureDiagnosis,
    clearPreviewFailureDiagnosis,
    clearNextInAppCompile,
  ]);

  const handlePreviewIframeLoad = useCallback(() => {
    const iframe = previewIframeRef.current;
    const currentSrc = iframe?.src ?? "";
    const prevLoadSrc = prevIframeLoadSrcRef.current;
    prevIframeLoadSrcRef.current = currentSrc;
    const stripPreviewNonce = (src) =>
      String(src ?? "")
        .replace(/&_pv=\d+/g, "")
        .replace(/\?_pv=\d+&/, "?")
        .replace(/\?_pv=\d+$/, "");
    const internalReload =
      Boolean(prevLoadSrc) && stripPreviewNonce(prevLoadSrc) === stripPreviewNonce(currentSrc);
    const accessible = canAccessIframeDocument(iframe);
    const errorPage = accessible && isIframePreviewErrorPage(iframe);
    auditPreviewPipeline(
      "iframe-load",
      `src=${currentSrc || "?"} accessible=${accessible} errorPage=${errorPage} internal=${internalReload}`,
      {
        previewPort,
        ok: accessible && !errorPage,
        pending: accessible && !errorPage && !previewIframeReady,
        internalReload,
      },
    );
    setPreviewIframeAccessible(accessible);
    if (accessible && errorPage) {
      applyPreviewFailureDiagnosis({ iframe, source: "iframe" });
      return;
    }
    rememberNextEmbedPreview(iframe);
    if (accessible && internalReload) {
      restorePreviewIframeStagedStorage(iframe);
    }
    const nextCompileBlank =
      accessible &&
      !errorPage &&
      nextInAppCompilingRef.current &&
      (isNextEmbedPreviewRef.current || iframeLooksLikeNextDev(iframe)) &&
      isIframePreviewBlankOrBroken(iframe);
    if (nextCompileBlank) {
      coverNextInAppCompile(iframe);
      return;
    }
    if (accessible && !errorPage && isIframePreviewContentReady(iframe)) {
      clearNextInAppCompile();
    }
    if (previewRefreshBusyRef.current) {
      if (accessible && !errorPage && isIframePreviewReadyEnough(iframe)) {
        setPreviewIframeReady(true);
        setPreviewIframeLoadMessage("");
        setPreviewBootFailed(false);
        clearPreviewFailureDiagnosis();
      }
      return;
    }
    if (accessible && !errorPage && isIframePreviewReadyEnough(iframe)) {
      setPreviewIframeReady(true);
      setPreviewIframeLoadMessage("");
      setPreviewBootFailed(false);
      clearPreviewFailureDiagnosis();
      syncIframeBrowsePath();
      if (isDevEmbedPreview && devPreviewEmbedHmr) {
        setDevEmbedSessionLive(true);
        openDevEmbedGate("");
      }
      return;
    }
    if (accessible && !errorPage && isIframePreviewBlankOrBroken(iframe)) {
      const overlayPresent = (() => {
        try {
          return Boolean(iframe.contentDocument?.querySelector("vite-error-overlay"));
        } catch {
          return false;
        }
      })();
      const text = extractIframePreviewFailureMessage(iframe);
      if (overlayPresent || /Failed to resolve import|Failed to load module/i.test(text)) {
        applyPreviewFailureDiagnosis({ iframe, source: "iframe" });
        return;
      }
    }
    if (isDevEmbedPreview) {
      void waitForPreviewIframeContentReady();
      return;
    }
    setPreviewIframeReady(true);
    clearPreviewFailureDiagnosis();
    syncIframeBrowsePath();
  }, [
    syncIframeBrowsePath,
    isDevEmbedPreview,
    devPreviewEmbedHmr,
    previewPort,
    previewIframeReady,
    openDevEmbedGate,
    restorePreviewIframeStagedStorage,
    waitForPreviewIframeContentReady,
    applyPreviewFailureDiagnosis,
    clearPreviewFailureDiagnosis,
    rememberNextEmbedPreview,
    coverNextInAppCompile,
    clearNextInAppCompile,
  ]);

  // Cross-origin subdomain preview: readiness / route come from the injected bridge. Re-attach
  // on every src or remount so a stale document's state is never read.
  useEffect(() => {
    const iframe = previewIframeRef.current;
    if (!iframe || !previewEmbedOrigin || previewErrorDocumentHtml) return undefined;
    return attachPreviewBridge(iframe, previewEmbedOrigin);
  }, [previewEmbedOrigin, iframeSrc, iframeMountKey, previewErrorDocumentHtml]);
  // The iframe can mount on a later render (stage shown after the gate opens).
  useEffect(() => {
    const iframe = previewIframeRef.current;
    if (!iframe || !previewEmbedOrigin || previewErrorDocumentHtml) return;
    if (!isPreviewBridgeFrame(iframe)) attachPreviewBridge(iframe, previewEmbedOrigin);
  });

  // Re-check after the shell was marked ready: a later crash or a white screen that
  // lasts through hydrate becomes a diagnosis. Recovery clears it.
  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    let blankSince = 0;

    const run = () => {
      if (cancelled) return;
      const iframe = previewIframeRef.current;
      if (!iframe || previewErrorDocumentHtml) return;
      const lines = getPreviewConsoleLines(iframe);
      setPreviewConsoleLines((prev) => (prev.join("\n") === lines.join("\n") ? prev : lines));
      const decision = reconcilePreviewConsoleWatch({
        iframe,
        consoleLines: lines,
        blankSince,
        now: Date.now(),
        previous: previewFailureDiagnosisRef.current,
        previewWasReady: previewIframeReadyRef.current,
      });
      if (decision.type === "wait") blankSince = decision.blankSince;
      else blankSince = 0;

      if (decision.type === "apply") {
        const prev = previewFailureDiagnosisRef.current;
        const next = decision.diagnosis;
        const same =
          prev &&
          prev.kind === next.kind &&
          prev.detail === next.detail &&
          prev.blocking === next.blocking;
        if (!same) {
          void applyPreviewFailureDiagnosis({
            iframe,
            source: "iframe",
            consoleLines: lines,
            blankSustained: next.kind === "blank_app" && next.blocking !== false,
          });
        }
      } else if (decision.type === "clear") {
        clearPreviewFailureDiagnosis({ force: true });
      }

      if (timer) window.clearTimeout(timer);
      if (decision.type === "wait") {
        timer = window.setTimeout(run, decision.waitMs);
      }
    };

    const iframe = previewIframeRef.current;
    const unsubState = iframe ? subscribePreviewBridgeState(iframe, run) : () => {};
    const unsubConsole = iframe ? subscribePreviewConsole(iframe, run) : () => {};
    const interval = window.setInterval(run, 2000);
    run();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearInterval(interval);
      unsubState();
      unsubConsole();
    };
  }, [
    iframeSrc,
    iframeMountKey,
    showDevEmbedIframe,
    previewErrorDocumentHtml,
    applyPreviewFailureDiagnosis,
    clearPreviewFailureDiagnosis,
  ]);

  const handlePreviewIframeError = useCallback(
    async (e) => {
      auditPreviewPipeline("iframe-load", `iframe error src=${e?.currentTarget?.src}`, {
        previewPort,
        ok: false,
      });
      logger.error("client_link_preview_iframe_error", {
        src: e?.currentTarget?.src,
      });
      if (previewRefreshBusyRef.current) return;
      const iframe = previewIframeRef.current;
      const diagnosed = await applyPreviewFailureDiagnosis({
        iframe,
        ensureError: "Preview failed to load. Use Reload preview in the toolbar.",
        source: "iframe",
      });
      if (!diagnosed) {
        setPreviewIframeReady(false);
        setPreviewIframeLoadMessage("Preview failed to load. Use Reload preview in the toolbar.");
        setPreviewLoadStuckRecoveryAvailable(true);
        setPreviewReloadActionEnabled(true);
      }
    },
    [previewPort, applyPreviewFailureDiagnosis],
  );

  const handlePreviewPinnedChange = useCallback((ctx) => {
    setPickedElementContext(ctx);
    if (ctx) setVisualPickMode(false);
    setStagedChatReplacementImage(null);
  }, []);

  const handleReplacementStagedForRepo = useCallback((payload) => {
    setStagedChatReplacementImage(payload);
    setStagedChatReferenceImages([]);
  }, []);

  const stagedRevertSnapshot = useMemo(() => {
    if (!stagedChatReplacementImage?.selector || !pickedElementContext?.selector) {
      return null;
    }
    if (stagedChatReplacementImage.selector !== pickedElementContext.selector) {
      return null;
    }
    return stagedChatReplacementImage.revertSnapshot ?? null;
  }, [stagedChatReplacementImage, pickedElementContext]);

  const handlePreviewReplaceImageResult = useCallback((r) => {
    if (r?.ok) {
      toast.success(
        "Image updated in preview. Send a chat message so the agent can apply the same asset in the repository.",
      );
    } else {
      toast.error(r?.message ?? "Could not replace image.");
    }
  }, []);

  useEffect(() => {
    if (!pickedElementContext) {
      setStagedChatReplacementImage(null);
    }
  }, [pickedElementContext]);

  useEffect(() => {
    if (!chatOpen) {
      setVisualPickMode(false);
      setPickedElementContext(null);
      setStagedChatReplacementImage(null);
      setStagedChatReferenceImages([]);
    }
  }, [chatOpen]);

  const chatShellEnabled =
    showControls &&
    (Boolean(publicProject) || awaitScratchPreview) &&
    (showLockAndFeedback || chatBlockedReason != null || scratchOnboardingChatActive);
  const chatSplitShell = showControls && chatShellEnabled && (hasActiveVersion || chatOpen);
  const clientLinkMobileLayout = useMaxWidthMediaQuery(CLIENT_LINK_MOBILE_LAYOUT_MAX_WIDTH_PX);
  const clientLinkMobileChatOverlay = chatSplitShell && clientLinkMobileLayout;

  const scratchChatLayoutActive = computeScratchChatLayoutActive(
    scratchOnboardingChatActive,
    chatOpen,
  );
  const { chatPanelDefaultSize, previewPanelDefaultSize } =
    computeScratchChatPanelDefaultSizes(scratchChatLayoutActive);

  const openChatPanel = useCallback(() => {
    setChatOpen(true);
    if (clientLinkMobileLayout) return;
    scheduleEnsureChatPanelExpanded(chatPanelRef, {
      defaultSize: CLIENT_LINK_CHAT_PANEL_DEFAULT_SIZE,
    });
  }, [chatPanelRef, clientLinkMobileLayout]);

  useLayoutEffect(() => {
    if (!chatSplitShell || clientLinkMobileLayout) return;
    if (chatOpen) {
      scheduleEnsureChatPanelExpanded(chatPanelRef, {
        defaultSize: CLIENT_LINK_CHAT_PANEL_DEFAULT_SIZE,
      });
      return;
    }
    const panel = chatPanelRef.current;
    if (!panel) return;
    if (!panel.isCollapsed()) {
      panel.collapse();
    }
  }, [chatOpen, chatSplitShell, scratchChatLayoutActive, chatPanelRef, clientLinkMobileLayout]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (pendingCommentPlacement) {
        setPendingCommentPlacement(null);
        return;
      }
      if (focusedPreviewCommentId) {
        setFocusedPreviewCommentId(null);
        return;
      }
      if (commentMode) {
        setCommentModeActive(false);
      }
      if (chatOpen && visualPickMode) {
        setVisualPickMode(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    chatOpen,
    visualPickMode,
    commentMode,
    pendingCommentPlacement,
    focusedPreviewCommentId,
    setCommentModeActive,
    setFocusedPreviewCommentId,
  ]);

  useEffect(() => {
    if (visualPickMode) setCommentModeActive(false);
  }, [visualPickMode, setCommentModeActive]);

  useEffect(() => {
    if (commentMode) setVisualPickMode(false);
  }, [commentMode]);

  useEffect(() => {
    if (!showLockAndFeedback || !projectSlug?.trim()) return;
    if (openCommentsFromUrl) {
      setCommentModeActive(true);
      return;
    }
    setCommentModeActive(loadPersistedCommentsMode(projectSlug));
  }, [openCommentsFromUrl, showLockAndFeedback, projectSlug, setCommentModeActive]);

  useEffect(() => {
    const prev = prevIframeSrcRef.current;
    prevIframeSrcRef.current = iframeSrc;
    if (prev === iframeSrc) return;
    if (!prev && iframeSrc) return;
    // Cache-bust nonce only (_pv=) — boot effect uses stableDevEmbedSrc; skip loader reset loop.
    if (prev && iframeSrc && prev.replace(/&_pv=\d+/g, "") === iframeSrc.replace(/&_pv=\d+/g, "")) {
      return;
    }

    auditPreviewPipeline("iframe-src", `changed ${prev ?? "null"} → ${iframeSrc ?? "null"}`, {
      previewPort,
      pending: true,
    });

    const embedAlreadyLive =
      isPreviewEmbedHmrEnabled() &&
      devPreviewEmbedHmr &&
      previewPort != null &&
      devEmbedBootPortRef.current === previewPort &&
      (devEmbedLiveRef.current.gate || devEmbedLiveRef.current.ready || devEmbedSessionLive);

    if (embedAlreadyLive) {
      return;
    }

    setDevEmbedGateOpen(false);
    setPickedElementContext(null);
    setVisualPickMode(false);
    setPreviewIframeAccessible(null);
    setPreviewIframeReady(false);
    isNextEmbedPreviewRef.current = false;
    setIsNextEmbedPreview(false);
    nextInAppCompilingRef.current = false;
    setNextInAppCompiling(false);
    setPreviewIframeLoadMessage(
      iframeSrc
        ? isDevIframePreviewSrc(iframeSrc)
          ? "Starting preview…"
          : "Loading preview…"
        : "",
    );
    setStagedChatReplacementImage(null);
    setStagedChatReferenceImages([]);
  }, [iframeSrc, devPreviewEmbedHmr, previewPort, devEmbedSessionLive]);

  useEffect(() => {
    const persisted = loadPersistedBrowsePath(projectSlug);
    if (persisted && !isAuthBrowsePath(persisted)) {
      lastNonAuthBrowsePathRef.current = persisted;
    }
  }, [projectSlug]);

  useEffect(() => {
    if (!iframeSrc || previewIframeAccessible !== true) {
      return undefined;
    }
    const iframe = previewIframeRef.current;
    if (!iframe || !canAccessIframeDocument(iframe)) {
      return undefined;
    }

    let win;
    try {
      win = iframe.contentWindow;
    } catch {
      return undefined;
    }
    if (!win) return undefined;

    const onNav = () => syncIframeBrowsePath();
    win.addEventListener("popstate", onNav);
    win.addEventListener("hashchange", onNav);

    const onClick = (event) => {
      const el = event.target;
      const anchor = el && typeof el.closest === "function" ? el.closest("a[href]") : null;
      if (!anchor) return;
      const live = previewIframeRef.current;
      if (!live || !canAccessIframeDocument(live)) return;
      rememberNextEmbedPreview(live);
      const href = anchor.getAttribute("href") || "";
      const loc = live.contentWindow?.location;
      const nextPath = resolveNextInAppBrowsePath(href, {
        baseHref: String(loc?.href || ""),
        origin: String(loc?.origin || ""),
      });
      const previousPath = readIframeBrowsePath(live);
      if (
        shouldMarkNextInAppCompile({
          isNextPreview: isNextEmbedPreviewRef.current,
          previousPath,
          nextPath,
          iframe: live,
        })
      ) {
        coverNextInAppCompile(live);
      }
    };
    try {
      iframe.contentDocument?.addEventListener("click", onClick, true);
    } catch {
      /* ignore */
    }

    syncIframeBrowsePath();
    const id = setInterval(() => {
      syncIframeBrowsePath();
      const live = previewIframeRef.current;
      if (!live || !canAccessIframeDocument(live)) return;
      rememberNextEmbedPreview(live);
      if (
        nextInAppCompilingRef.current &&
        isIframePreviewContentReady(live) &&
        !isIframePreviewBlankOrBroken(live)
      ) {
        clearNextInAppCompile();
      }
    }, 600);

    return () => {
      removeIframeWindowListener(win, "popstate", onNav);
      removeIframeWindowListener(win, "hashchange", onNav);
      try {
        iframe.contentDocument?.removeEventListener("click", onClick, true);
      } catch {
        /* iframe gone */
      }
      clearInterval(id);
    };
  }, [
    iframeSrc,
    previewIframeAccessible,
    syncIframeBrowsePath,
    iframeMountKey,
    previewPort,
    isNextEmbedPreview,
    rememberNextEmbedPreview,
    coverNextInAppCompile,
    clearNextInAppCompile,
  ]);

  const activeVersion =
    (activeRelease?.versions || []).find((v) => v?.isActive) ||
    activeRelease?.versions?.[0] ||
    null;
  const chatMergeTargetLabel = `${String(activeRelease?.name || "Unknown release")} / ${formatProjectVersionLabel(activeVersion?.version)}`;

  useEffect(() => {
    if (!showLockAndFeedback && !chatBlockedReason && !scratchOnboardingChatActive && chatOpen) {
      setChatOpen(false);
    }
  }, [showLockAndFeedback, chatBlockedReason, scratchOnboardingChatActive, chatOpen]);

  useEffect(() => {
    if (!awaitScratchPreview || scratchChatAutoOpenedRef.current) return;
    scratchChatAutoOpenedRef.current = true;
    setChatOpen(true);
  }, [awaitScratchPreview]);

  useEffect(() => {
    if (!scratchOnboardingChatActive || scratchEmailSeededRef.current) return;
    const authEmail = typeof user?.email === "string" ? user.email.trim().toLowerCase() : "";
    if (!authEmail || !isPlausibleClientLinkEmail(authEmail)) return;
    const stored = getClientLinkVerifiedEmail();
    if (stored && isPlausibleClientLinkEmail(stored)) return;
    scratchEmailSeededRef.current = true;
    setClientLinkVerifiedEmail(authEmail);
  }, [scratchOnboardingChatActive, user?.email]);

  useEffect(() => {
    if (scratchOnboardingChatActive) return;
    if ((backendPlanAgentRunning || releaseBackgroundAgentBlock) && chatOpen) {
      setChatOpen(false);
    }
  }, [backendPlanAgentRunning, releaseBackgroundAgentBlock, chatOpen, scratchOnboardingChatActive]);

  useEffect(() => {
    if (!showControls) setChatOpen(false);
  }, [showControls]);

  const isLocked = activeReleaseLocked;

  const showRestoreLive =
    previewMeta?.versionId != null &&
    previewMeta?.releaseId != null &&
    liveActiveVersionId != null &&
    Number(previewMeta.versionId) !== Number(liveActiveVersionId) &&
    !activeReleaseLocked;

  const awaitScratchPreviewWaiting = awaitScratchPreview && onboardPreviewWaiting;

  const previewResizeHandleEnabled = !(visualPickMode && previewIframeAccessible === true);

  const previewBuildInFlight =
    scratchBuildInProgress ||
    onboardPreviewWaiting ||
    awaitScratchPreviewWaiting ||
    revertPreviewSyncActive ||
    previewRefreshBusy ||
    (livePreviewInProgress &&
      (onboardLivePreview.agentRunning ||
        onboardLivePreview.previewDevListening ||
        onboardLivePreview.scratchPreviewBuilding ||
        onboardLivePreview.zipOnboardPreviewBuilding ||
        Boolean(iframeSrc) ||
        Number(publicProject?.port) > 0));

  const showLiveOnboardLoader =
    livePreviewInProgress &&
    !isViewingVersionPreview &&
    Boolean(iframeSrc || Number(publicProject?.port) > 0);

  const showDevEmbedReloadOverlay =
    isDevEmbedPreview &&
    devEmbedGateOpen &&
    showDevEmbedIframe &&
    !previewIframeReady &&
    !previewBootFailed &&
    !previewRefreshBusy;

  const hasActivePreviewSession =
    Boolean(iframeSrc) &&
    (previewIframeReady || previewBuildInFlight || previewBootFailed || showDevEmbedReloadOverlay);

  /** Blank / no-UI projects: show the idle card on review portal and preview-only URLs. */
  const showNoActiveReleaseCard =
    !hasActiveVersion &&
    !hasActivePreviewSession &&
    !(showControls && (isPostLockIdleState || activeReleaseAwaitingRevision));

  const showPreviewLoaderOverlay =
    revertPreviewSyncActive ||
    previewRefreshBusy ||
    previewBootFailed ||
    showDevEmbedReloadOverlay ||
    nextInAppCompiling ||
    (isDevEmbedPreview && isPreviewContentLoadMessage(previewIframeLoadMessage)) ||
    (awaitingFirstVersion && firstVersionBuildActive) ||
    (scratchBuildInProgress && !previewIframeReady && !previewBootFailed) ||
    awaitScratchPreviewWaiting ||
    (onboardPreviewWaiting && !iframeSrc) ||
    (showLiveOnboardLoader &&
      !previewIframeReady &&
      !previewBootFailed &&
      !(devPreviewEmbedHmr && devEmbedGateOpen && previewIframeReady)) ||
    (isViewingVersionPreview
      ? showDevEmbedIframe && !previewIframeReady
      : isDevEmbedPreview
        ? !devEmbedGateOpen && !(devPreviewEmbedHmr && (previewIframeReady || devEmbedSessionLive))
        : showDevEmbedIframe && !previewIframeReady);

  const previewLoaderShouldBlock = isClientLinkPreviewLoaderBlocking({
    previewIframeReady,
    previewBootFailed,
    embedReachable: Boolean(devEmbedGateOpen),
    iframeAccessible: previewIframeAccessible === true,
    devEmbedGateOpen,
    hasFailureDiagnosis: blockingPreviewFailure && !previewOverlayPeeled,
    isNextPreview: isNextEmbedPreview,
    nextInAppCompiling,
    iframe: previewIframeRef.current,
  });

  const effectiveShowPreviewLoaderOverlay =
    showPreviewLoaderOverlay &&
    previewLoaderShouldBlock &&
    !showNoActiveReleaseCard &&
    !(previewOverlayPeeled && blockingPreviewFailure);

  const showPreviewCompilingChip =
    !effectiveShowPreviewLoaderOverlay &&
    !previewBootFailed &&
    !blockingPreviewFailure &&
    !showNoActiveReleaseCard &&
    Boolean(devEmbedGateOpen || previewIframeAccessible) &&
    ((!previewIframeReady &&
      (showDevEmbedReloadOverlay ||
        isPreviewContentLoadMessage(previewIframeLoadMessage) ||
        (isDevEmbedPreview && showDevEmbedIframe) ||
        hasCompileTheaterProgress(compileTheaterProgress))) ||
      (previewIframeReady &&
        hasCompileTheaterProgress(compileTheaterProgress) &&
        Boolean(compileTheaterProgress?.quiet)));

  const liveOnboardLoaderStatus = React.useMemo(() => {
    if (onboardPreviewStatus?.trim()) return onboardPreviewStatus;
    if (onboardLivePreview.zipOnboardPreviewBuilding || onboardLivePreview.scratchPreviewBuilding) {
      return "Starting preview…";
    }
    if (onboardLivePreview.previewDevListening && !previewIframeReady) {
      return "Compiling preview…";
    }
    if (onboardLivePreview.agentRunning) {
      return "Agent is running; preview updates live as files change…";
    }
    return "Starting preview…";
  }, [onboardPreviewStatus, onboardLivePreview, previewIframeReady]);

  const onboardAgentActivelyWorking = Boolean(
    onboardLivePreview.agentRunning ||
    onboardLivePreview.scratchPreviewBuilding ||
    onboardLivePreview.zipOnboardPreviewBuilding ||
    (awaitingFirstVersion &&
      firstVersionBuildActive &&
      !firstVersionBuildNeedsRecovery &&
      !firstVersionBuildError),
  );
  const previewAgentActivelyWorking =
    Boolean(chatAgentWorking.active) || onboardAgentActivelyWorking;
  const showAgentWorkingInsteadOfStartServer =
    previewFailureDiagnosis?.kind === "port_unreachable" && previewAgentActivelyWorking;

  const compileTheaterActive = hasCompileTheaterProgress(compileTheaterProgress);
  const compileTheaterElapsedMs = compileTheaterActive
    ? Math.max(0, compileTheaterNow - (compileTheaterProgress?.startedAt || compileTheaterNow))
    : 0;
  const compileTheaterQuiet =
    Boolean(compileTheaterProgress?.quiet) ||
    (Boolean(previewIframeReady) && Boolean(nextInAppCompiling));
  const compileTheaterCopy = compileTheaterActive
    ? formatCompileTheaterCopy({
        progress: compileTheaterProgress,
        elapsedMs: compileTheaterElapsedMs,
        variant: effectiveShowPreviewLoaderOverlay
          ? "overlay"
          : compileTheaterQuiet
            ? "quiet"
            : "chip",
      })
    : null;
  const showCompileTheaterOnOverlay =
    Boolean(compileTheaterCopy) &&
    effectiveShowPreviewLoaderOverlay &&
    !blockingPreviewFailure &&
    !showAgentWorkingInsteadOfStartServer;
  const showFetchingAnimation =
    isPreviewContentLoadMessage(previewIframeLoadMessage) &&
    !blockingPreviewFailure &&
    !showCompileTheaterOnOverlay &&
    previewIframeLoadMessage === PREVIEW_CONTENT_LOAD_MESSAGES.fetching;

  const agentWorkingOverlayMessage = React.useMemo(() => {
    const fromBoot = String(previewIframeLoadMessage || "").trim();
    if (fromBoot && !isPreviewContentLoadMessage(fromBoot)) return fromBoot;
    const fromOnboard = String(onboardPreviewStatus || "").trim();
    if (fromOnboard) return fromOnboard;
    const fromChat = String(chatAgentWorking.statusLine || "").trim();
    if (fromChat) return fromChat;
    if (onboardAgentActivelyWorking) {
      return (
        liveOnboardLoaderStatus ||
        firstVersionStatusMessage ||
        CLIENT_LINK_AGENT_WORKING_OVERLAY.fallbackMessage
      );
    }
    return CLIENT_LINK_AGENT_WORKING_OVERLAY.fallbackMessage;
  }, [
    previewIframeLoadMessage,
    onboardPreviewStatus,
    chatAgentWorking.statusLine,
    onboardAgentActivelyWorking,
    liveOnboardLoaderStatus,
    firstVersionStatusMessage,
  ]);

  const previewLoaderTitle = showAgentWorkingInsteadOfStartServer
    ? CLIENT_LINK_AGENT_WORKING_OVERLAY.title
    : previewIdleWake && !blockingPreviewFailure && !previewBootFailed
      ? CLIENT_LINK_PREVIEW_IDLE_WAKE.title
      : revertPreviewSyncActive
        ? "Refreshing preview after revert"
        : blockingPreviewFailure
          ? CLIENT_LINK_PREVIEW_FAILURE_TITLES[previewFailureDiagnosis.kind] || "Preview failed"
          : previewBootFailed
            ? "Preview failed"
            : firstVersionBuildNeedsRecovery
              ? firstVersionBuildError
                ? CLIENT_LINK_FIRST_VERSION_BUILD.failedTitle
                : CLIENT_LINK_FIRST_VERSION_BUILD.timedOutTitle
              : awaitingFirstVersion && firstVersionBuildActive
                ? CLIENT_LINK_FIRST_VERSION_BUILD.loaderTitle
                : previewRefreshBusy
                  ? "Refreshing preview"
                  : showDevEmbedReloadOverlay
                    ? "Updating preview"
                    : awaitScratchPreviewWaiting || scratchBuildInProgress
                      ? "Building your preview"
                      : showLiveOnboardLoader && !iframeSrc
                        ? "Preparing preview"
                        : "Loading preview";

  const previewLoaderMessage = showAgentWorkingInsteadOfStartServer
    ? agentWorkingOverlayMessage
    : revertPreviewSyncActive
      ? previewIframeLoadMessage?.trim() ||
        "Rebuilding live preview from the reverted checkpoint. This may take a few minutes on first install."
      : blockingPreviewFailure
        ? previewFailureDiagnosis.summary
        : firstVersionBuildNeedsRecovery
          ? `${firstVersionStatusMessage}\n\n${CLIENT_LINK_FIRST_VERSION_BUILD.supportHint}`
          : awaitingFirstVersion && firstVersionBuildActive
            ? `${firstVersionStatusMessage}\n\n${CLIENT_LINK_FIRST_VERSION_BUILD.loaderIntro}\n\n${CLIENT_LINK_FIRST_VERSION_BUILD.chatLockedHint}`
            : previewRefreshBusy && previewIframeLoadMessage?.trim()
              ? previewIframeLoadMessage.trim()
              : (showLiveOnboardLoader && !previewIframeReady ? liveOnboardLoaderStatus : null) ||
                (onboardPreviewWaiting && !iframeSrc ? onboardPreviewStatus : null) ||
                previewIframeLoadMessage ||
                (isDevIframePreviewSrc(iframeSrc)
                  ? "Starting the dev server. This may take a few seconds or longer on first install."
                  : "Loading your preview…");

  const previewAwaitingLoad = useMemo(() => {
    if (previewBootFailed) return false;
    if (previewIframeReady) return false;
    if (previewRefreshBusy) return true;
    if (showPreviewLoaderOverlay) return true;
    if (iframeSrc || previewPort) return true;
    return false;
  }, [
    previewBootFailed,
    previewIframeReady,
    previewRefreshBusy,
    showPreviewLoaderOverlay,
    iframeSrc,
    previewPort,
  ]);

  // Dual-tier reload recovery: 5s hint + early enable (primary), 2min enable (backup).
  useEffect(() => {
    if (!previewAwaitingLoad) {
      setPreviewLoadStuckRecoveryAvailable(false);
      setPreviewReloadActionEnabled(false);
      return undefined;
    }
    const hintTimerId = window.setTimeout(() => {
      setPreviewLoadStuckRecoveryAvailable(true);
    }, PREVIEW_RELOAD_SERVER_STUCK_HINT_DELAY_MS);
    const enableTimerId = window.setTimeout(() => {
      setPreviewReloadActionEnabled(true);
    }, PREVIEW_RELOAD_SERVER_ENABLE_DELAY_MS);
    return () => {
      window.clearTimeout(hintTimerId);
      window.clearTimeout(enableTimerId);
    };
  }, [previewAwaitingLoad]);

  const reloadDevServerDisabled = isReloadDevServerDisabled({
    revertPreviewSyncActive,
    previewAwaitingLoad,
    previewIframeReady,
    previewLoadStuckRecoveryAvailable,
    previewReloadActionEnabled,
    previewBootFailed,
  });
  const reloadDevServerDisabledReason = revertPreviewSyncActive
    ? ""
    : "Reload preview is available once the preview finishes its first load.";

  const runNormalReloadPreviewRecovery = useCallback(() => {
    if (reloadDevServerDisabled) return;

    const action = resolvePreviewReloadAction({
      iframeSrc,
      previewBootFailed,
      showDevEmbedReloadOverlay,
      devEmbedGateOpen,
      previewIframeReady,
    });

    if (action === "boot") {
      handleRetryPreview();
      return;
    }
    if (action === "remount") {
      setPreviewIframeLoadMessage("Reloading preview…");
      void forceRemountPreviewIframe().catch(() => {});
      return;
    }
    void softReloadPreviewIframe();
  }, [
    reloadDevServerDisabled,
    iframeSrc,
    previewBootFailed,
    showDevEmbedReloadOverlay,
    devEmbedGateOpen,
    previewIframeReady,
    handleRetryPreview,
    forceRemountPreviewIframe,
    softReloadPreviewIframe,
  ]);

  const runForceRestartPreview = useCallback(async () => {
    const slug = projectSlug?.trim();
    if (!slug) return;

    if (secretRestartSoftTimerRef.current) {
      clearTimeout(secretRestartSoftTimerRef.current);
      secretRestartSoftTimerRef.current = null;
    }
    secretRestartClickStateRef.current = createSecretRestartClickState();

    previewRefreshBusyRef.current = true;
    setPreviewRefreshBusy(true);
    setPreviewBootFailed(false);
    clearPreviewFailureDiagnosis();
    setPreviewIframeReady(false);
    setPreviewIframeLoadMessage("Restarting preview…");
    embedHmrWsRecoveryRef.current.reset();

    auditPreviewPipeline("iframe-refresh", "secret forceRestart begin", {
      slug,
      previewPort,
      pending: true,
    });

    try {
      await ensurePublicProjectPreview(slug, {
        forceRestart: true,
        clientEmail: getClientLinkVerifiedEmail()?.trim() || "",
      });
      auditPreviewPipeline("iframe-refresh", "secret forceRestart ensure ok", {
        slug,
        previewPort,
        ok: true,
      });
      previewBootGenerationRef.current += 1;
      setPreviewRemountGen((g) => g + 1);
      await bootDevEmbedPreview(slug, { retry: true });
    } catch (err) {
      const msg = String(err?.error || err?.message || err || "Preview restart failed").trim();
      setPreviewIframeLoadMessage(`${msg}. Use Reload preview below.`);
      setPreviewLoadStuckRecoveryAvailable(true);
      setPreviewReloadActionEnabled(true);
      setPreviewBootFailed(true);
      auditPreviewPipeline("iframe-refresh", `secret forceRestart failed: ${msg}`, {
        slug,
        previewPort,
        ok: false,
      });
    } finally {
      previewRefreshBusyRef.current = false;
      setPreviewRefreshBusy(false);
    }
  }, [projectSlug, previewPort, clearPreviewFailureDiagnosis, bootDevEmbedPreview]);

  const handleReloadPreviewRecovery = useCallback(() => {
    // Secret force-restart stays available while soft reload is busy (button may still be hit if not disabled).
    if (reloadDevServerDisabled) return;

    if (secretRestartSoftTimerRef.current) {
      clearTimeout(secretRestartSoftTimerRef.current);
      secretRestartSoftTimerRef.current = null;
    }

    const result = recordSecretRestartClick(secretRestartClickStateRef.current);
    secretRestartClickStateRef.current = result.state;

    if (result.action === "forceRestart") {
      void runForceRestartPreview();
      return;
    }

    secretRestartSoftTimerRef.current = setTimeout(() => {
      secretRestartSoftTimerRef.current = null;
      const soft = resolveSecretRestartSoftAfterDelay(secretRestartClickStateRef.current);
      secretRestartClickStateRef.current = soft.state;
      if (soft.action === "soft") {
        runNormalReloadPreviewRecovery();
      }
    }, SECRET_RESTART_SOFT_DELAY_MS);
  }, [reloadDevServerDisabled, runForceRestartPreview, runNormalReloadPreviewRecovery]);

  useEffect(
    () => () => {
      if (secretRestartSoftTimerRef.current) {
        clearTimeout(secretRestartSoftTimerRef.current);
        secretRestartSoftTimerRef.current = null;
      }
    },
    [],
  );

  const showReloadDevServerRecovery =
    hasActiveVersion &&
    showControls &&
    (previewIframeReady || previewBootFailed || previewLoadStuckRecoveryAvailable);

  const refreshWorkspaceSyncStatus = useCallback(async () => {
    const slug = projectSlug?.trim();
    const email = getClientLinkVerifiedEmail()?.trim();
    if (!slug || !isPlausibleClientLinkEmail(email) || !showControls || !hasActiveVersion) {
      setWorkspaceBehindRemote(false);
      return;
    }
    const gen = ++workspaceSyncPollGenRef.current;
    try {
      const status = await clientLinkWorkspaceSyncStatus(slug, email);
      if (gen !== workspaceSyncPollGenRef.current) return;
      setWorkspaceBehindRemote(Boolean(status?.behind));
    } catch {
      if (gen !== workspaceSyncPollGenRef.current) return;
      /* keep last known state — status is best-effort */
    }
  }, [projectSlug, showControls, hasActiveVersion]);

  useEffect(() => {
    if (!showControls || !hasActiveVersion || !hasVerifiedClientEmail) {
      setWorkspaceBehindRemote(false);
      return undefined;
    }
    void refreshWorkspaceSyncStatus();
    const id = window.setInterval(() => {
      void refreshWorkspaceSyncStatus();
    }, 45_000);
    return () => window.clearInterval(id);
  }, [
    showControls,
    hasActiveVersion,
    hasVerifiedClientEmail,
    refreshWorkspaceSyncStatus,
    desktopControlHeld,
  ]);

  useEffect(() => {
    if (desktopControlHeld) return;
    void refreshWorkspaceSyncStatus();
  }, [desktopControlHeld, refreshWorkspaceSyncStatus]);

  const handleUpdateFromGit = useCallback(async () => {
    const slug = projectSlug?.trim();
    const rid = effectiveChatReleaseId;
    const email = getClientLinkVerifiedEmail()?.trim();
    if (!slug || rid == null || !isPlausibleClientLinkEmail(email) || updateFromGitBusy) return;
    setUpdateFromGitBusy(true);
    setPreviewIframeLoadMessage("Bringing preview up to date…");
    try {
      const result = await clientLinkPullWorkspaceFromGit(slug, Number(rid), email);
      setWorkspaceBehindRemote(false);
      await forceRemountPreviewIframe().catch(() => {});
      if (result?.pulled) {
        toast.success(CLIENT_LINK_PREVIEW_RECOVERY.updateFromGit.successToast);
      } else {
        toast.success(CLIENT_LINK_PREVIEW_RECOVERY.updateFromGit.upToDateToast);
      }
      void reloadProjectQuiet();
    } catch (err) {
      toast.error(
        err?.response?.data?.error ||
          err?.error ||
          err?.message ||
          CLIENT_LINK_PREVIEW_RECOVERY.updateFromGit.failedToast,
      );
      void refreshWorkspaceSyncStatus();
    } finally {
      setUpdateFromGitBusy(false);
      setPreviewIframeLoadMessage("");
    }
  }, [
    projectSlug,
    effectiveChatReleaseId,
    updateFromGitBusy,
    forceRemountPreviewIframe,
    reloadProjectQuiet,
    refreshWorkspaceSyncStatus,
  ]);

  const showUpdateFromGitRecovery =
    hasActiveVersion && showControls && workspaceBehindRemote && !desktopControlHeld;

  const previewLoaderShowReloadServer =
    !showAgentWorkingInsteadOfStartServer &&
    (previewBootFailed || previewLoadStuckRecoveryAvailable) &&
    !firstVersionBuildNeedsRecovery;

  const previewLoaderRecoveryMode =
    !showAgentWorkingInsteadOfStartServer &&
    (firstVersionBuildNeedsRecovery || previewBootFailed || blockingPreviewFailure);

  const previewServerNotRunning =
    previewFailureDiagnosis?.kind === "port_unreachable" && !showAgentWorkingInsteadOfStartServer;

  const previewLoaderRecoveryActions = useMemo(() => {
    if (!previewLoaderRecoveryMode && !previewLoaderShowReloadServer) return [];

    const actions = [];

    if (previewServerNotRunning) {
      actions.push({
        key: "start-server",
        label: CLIENT_LINK_PREVIEW_RECOVERY.startServer.shortLabel,
        disabled: reloadDevServerDisabled,
        onClick: handleReloadPreviewRecovery,
      });
      return actions;
    }

    if (previewBootFailed || previewLoadStuckRecoveryAvailable) {
      actions.push({
        key: "reload",
        label: CLIENT_LINK_PREVIEW_RECOVERY.reloadDevServer.shortLabel,
        hint: reloadDevServerDisabled
          ? reloadDevServerDisabledReason
          : CLIENT_LINK_PREVIEW_RECOVERY.reloadDevServer.whenToUse,
        disabled: reloadDevServerDisabled,
        onClick: handleReloadPreviewRecovery,
      });
    }

    if (awaitingFirstVersion && !restartAgentDisabled) {
      actions.push({
        key: "restart-agent",
        label: CLIENT_LINK_PREVIEW_RECOVERY.restartAgent.shortLabel,
        hint: CLIENT_LINK_PREVIEW_RECOVERY.restartAgent.whenToUse,
        variant: "secondary",
        onClick: handleRestartAgentBuildClick,
      });
    }

    if (firstVersionBuildError?.code === 403) {
      actions.push({
        key: "update-email",
        label: CLIENT_LINK_FIRST_VERSION_BUILD.updateEmailLabel,
        variant: "outline",
        onClick: handleUpdateFirstVersionEmail,
      });
    }

    actions.push({
      key: "contact-support",
      label: CLIENT_LINK_FIRST_VERSION_BUILD.supportLabel,
      hint: CLIENT_LINK_FIRST_VERSION_BUILD.supportHint,
      variant: "outline",
      onClick: handleContactLaunchpadTeam,
    });

    return actions;
  }, [
    previewLoaderRecoveryMode,
    previewLoaderShowReloadServer,
    previewServerNotRunning,
    previewBootFailed,
    previewLoadStuckRecoveryAvailable,
    reloadDevServerDisabled,
    reloadDevServerDisabledReason,
    iframeSrc,
    awaitingFirstVersion,
    restartAgentDisabled,
    firstVersionBuildError?.code,
    handleRestartAgentBuildClick,
    handleUpdateFirstVersionEmail,
    handleContactLaunchpadTeam,
    handleReloadPreviewRecovery,
  ]);

  const previewLoaderMessageWithRecoveryHint = previewServerNotRunning
    ? previewLoaderMessage
    : previewLoaderRecoveryMode
      ? previewLoaderMessage
      : previewLoadStuckRecoveryAvailable && !previewBootFailed
        ? `${previewLoaderMessage}\n\nTaking longer than expected? Use ${CLIENT_LINK_PREVIEW_RECOVERY.reloadDevServer.shortLabel} in the toolbar or below.`
        : previewLoaderMessage;

  const handleSendDiagnosisToAgent = useCallback(() => {
    if (!previewFailureDiagnosis) return;
    const prompt = appendPreviewDiagnosisToAgentPrompt(
      [
        "The live preview is failing. The preview frame shows the exact error from the app server. Diagnose the root cause and resolve it so the preview loads correctly.",
        "Prioritize fixing the issue end-to-end. Use whatever valid steps are required, including git operations when needed. If changes under `.launchpad/` are required but file edits there are blocked, apply them with terminal commands instead.",
      ].join("\n\n"),
      previewFailureDiagnosis,
    );
    setChatOpen(true);
    setChatComposerSeed({ text: prompt, ts: Date.now(), autoSend: true });
  }, [previewFailureDiagnosis]);

  const buildVerify = useClientLinkBuildVerify(projectSlug);

  const handleSendBuildVerifyToAgent = useCallback(() => {
    if (!buildVerify.fixPrompt) return;
    setChatOpen(true);
    setChatComposerSeed({ text: buildVerify.fixPrompt, ts: Date.now(), autoSend: false });
    buildVerify.dismiss();
  }, [buildVerify]);

  const handleViewPreviewFailureInFrame = useCallback(() => {
    setPreviewOverlayPeeled(true);
    openDevEmbedGate("");
    setPreviewIframeReady(true);
  }, [openDevEmbedGate]);

  const [fullPageCaptureBusy, setFullPageCaptureBusy] = useState(false);
  /** @param {string} [screenName] Used for the filename instead of the route (Send to Figma dialog). */
  const downloadFullPageScreenshot = useCallback(
    async (screenName) => {
      if (fullPageCaptureBusy) return false;
      setFullPageCaptureBusy(true);
      const toastId = toast.loading("Capturing full page…");
      try {
        const { captureFullPagePreviewScreenshot, buildFullPageShotFilename, downloadBlob } =
          await import("@/lib/previewFullPageScreenshot");
        const { blob } = await captureFullPagePreviewScreenshot(previewIframeRef.current);
        downloadBlob(
          blob,
          buildFullPageShotFilename({
            projectName: publicProject?.name,
            route: screenName || iframeBrowsePath,
          }),
        );
        toast.success("Screenshot downloaded", { id: toastId });
        return true;
      } catch (err) {
        logger.error("[client-link] full-page screenshot failed", err);
        toast.error(err?.message || "Could not capture the preview", { id: toastId });
        return false;
      } finally {
        setFullPageCaptureBusy(false);
      }
    },
    [fullPageCaptureBusy, publicProject?.name, iframeBrowsePath],
  );
  const handleCaptureFullPage = useCallback(
    () => void downloadFullPageScreenshot(),
    [downloadFullPageScreenshot],
  );

  const [sendToFigmaOpen, setSendToFigmaOpen] = useState(false);
  const [sendToFigmaBusy, setSendToFigmaBusy] = useState(false);
  const handleSendToFigma = useCallback(
    async (name) => {
      if (sendToFigmaBusy || publicProject?.id == null) return;
      setSendToFigmaBusy(true);
      try {
        const { captureFullPagePreviewScreenshot } =
          await import("@/lib/previewFullPageScreenshot");
        const { blob, cssWidth } = await captureFullPagePreviewScreenshot(previewIframeRef.current);
        await uploadPreviewScreen(publicProject.id, blob, {
          name,
          route: iframeBrowsePath || "/",
          viewport: responsivePreset,
          width: cssWidth,
          releaseId: selectedReleaseId ?? undefined,
        });
        setSendToFigmaOpen(false);
        toast.success(`“${name}” sent to Figma`, {
          description: "In Figma, open the LaunchPad plugin → Import from preview.",
        });
      } catch (err) {
        logger.error("[client-link] send to Figma failed", err);
        toast.error(err?.error || err?.message || "Could not send the screen to Figma");
      } finally {
        setSendToFigmaBusy(false);
      }
    },
    [sendToFigmaBusy, publicProject?.id, iframeBrowsePath, responsivePreset, selectedReleaseId],
  );

  const [previewToolsVisible, togglePreviewTools] = usePreviewToolsDockVisible();
  const [exportScreensOpen, setExportScreensOpen] = useState(false);
  const [exportScreenCandidates, setExportScreenCandidates] = useState([]);
  const [exportScreensScanning, setExportScreensScanning] = useState(false);
  const [exportScreensProgress, setExportScreensProgress] = useState(null);
  const exportScreensAbortRef = useRef(null);

  const scanExportScreenCandidates = useCallback(async () => {
    setExportScreensScanning(true);
    try {
      const { collectPreviewLinkRoutes } = await import("@/lib/previewFullPageScreenshot");
      const { mergePreviewScreenRoutes } = await import("@/lib/previewFullPageScreenshot.util");
      const linked = await collectPreviewLinkRoutes(previewIframeRef.current);
      setExportScreenCandidates((prev) =>
        mergePreviewScreenRoutes({
          current: iframeBrowsePathRef.current,
          sources: [prev, linked, visitedBrowsePathsRef.current],
          isExcluded: isAuthBrowsePath,
        }),
      );
    } finally {
      setExportScreensScanning(false);
    }
  }, []);

  const openExportScreens = useCallback(() => {
    setExportScreensOpen(true);
    void scanExportScreenCandidates();
  }, [scanExportScreenCandidates]);

  const handleExportScreens = useCallback(
    async ({ routes, mode }) => {
      if (exportScreensProgress || !routes.length) return;
      if (mode === "figma" && publicProject?.id == null) return;
      const controller = new AbortController();
      exportScreensAbortRef.current = controller;
      setExportScreensProgress({ mode, index: 0, total: routes.length, route: routes[0] });
      const returnTo = iframeBrowsePathRef.current;
      const batchId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const zipEntries = [];
      let singleShot = null;
      try {
        const lib = await import("@/lib/previewFullPageScreenshot");
        const result = await lib.exportPreviewScreens({
          getIframe: () => previewIframeRef.current,
          routes,
          navigate: handleNavigatePreviewPath,
          isAuthRoute: isAuthBrowsePath,
          signal: controller.signal,
          onProgress: ({ index, total, route }) =>
            setExportScreensProgress({ mode, index, total, route }),
          onScreen: async ({ route, index, blob, cssWidth }) => {
            if (mode === "figma") {
              await uploadPreviewScreen(publicProject.id, blob, {
                name: lib.defaultPreviewScreenName(route),
                route,
                viewport: responsivePreset,
                width: cssWidth,
                releaseId: selectedReleaseId ?? undefined,
                batchId,
                batchSize: routes.length,
              });
            } else if (routes.length === 1) {
              singleShot = { route, blob };
            } else {
              zipEntries.push({
                name: lib.buildScreenZipEntryName(index, route),
                bytes: new Uint8Array(await blob.arrayBuffer()),
              });
            }
          },
        });

        const { done, failures, cancelled } = result;
        if (mode === "download" && !cancelled) {
          if (singleShot) {
            lib.downloadBlob(
              singleShot.blob,
              lib.buildFullPageShotFilename({
                projectName: publicProject?.name,
                route: singleShot.route,
              }),
            );
          } else if (zipEntries.length) {
            lib.downloadBlob(
              lib.buildZipBlob(zipEntries),
              lib.buildScreensZipFilename({ projectName: publicProject?.name }),
            );
          }
        }

        const failedSummary = failures
          .slice(0, 3)
          .map((f) => f.message)
          .join(" · ");
        const plural = (n) => `${n} screen${n === 1 ? "" : "s"}`;
        if (cancelled) {
          toast.info(
            mode === "figma"
              ? `Stopped. ${plural(done)} sent to Figma before stopping.`
              : "Export stopped. Nothing was downloaded.",
          );
        } else if (!done) {
          toast.error("No screens could be captured", { description: failedSummary });
        } else {
          const title =
            mode === "figma" ? `${plural(done)} sent to Figma` : `${plural(done)} downloaded`;
          const description = [
            mode === "figma" ? "In Figma, open the LaunchPad plugin → Import from preview." : "",
            failures.length ? `${plural(failures.length)} skipped: ${failedSummary}` : "",
          ]
            .filter(Boolean)
            .join(" ");
          (failures.length ? toast.warning : toast.success)(title, {
            description: description || undefined,
          });
        }
        if (!cancelled && done) setExportScreensOpen(false);
      } catch (err) {
        logger.error("[client-link] export screens failed", err);
        toast.error(err?.error || err?.message || "Could not export screens");
      } finally {
        exportScreensAbortRef.current = null;
        setExportScreensProgress(null);
        if (returnTo && iframeBrowsePathRef.current !== returnTo) {
          handleNavigatePreviewPath(returnTo);
        }
      }
    },
    [
      exportScreensProgress,
      publicProject?.id,
      publicProject?.name,
      handleNavigatePreviewPath,
      responsivePreset,
      selectedReleaseId,
    ],
  );

  const showExactPortErrorBanner =
    Boolean(previewFailureDiagnosis) &&
    previewFailureDiagnosis.blocking !== false &&
    previewOverlayPeeled &&
    (showDevEmbedIframe || Boolean(previewErrorDocumentHtml));
  const showConsoleErrorBanner =
    previewFailureDiagnosis?.blocking === false && Boolean(showDevEmbedIframe);

  const previewIframeErrorSrcDoc = previewErrorDocumentHtml || undefined;
  const previewIframeLiveSrc = previewIframeErrorSrcDoc ? undefined : iframeSrc;
  const previewIframeMountKey = previewIframeErrorSrcDoc
    ? `error-doc-${previewFailureDiagnosis?.kind || "err"}-${String(previewErrorDocumentHtml).length}`
    : iframeMountKey;

  if (loading) {
    return <ClientLinkPageSkeleton />;
  }

  if (!publicProject) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center bg-muted/40 px-4">
        <div className="max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-lg font-semibold tracking-tight text-foreground">
            No project found
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The project you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to
            it. Check the URL or go back to the previous page.
          </p>
        </div>
      </div>
    );
  }

  const previewToolsDockMounted = Boolean(showControls && showDevEmbedIframe && iframeSrc);
  const previewToolsDock =
    previewToolsDockMounted && previewToolsVisible ? (
      <ClientLinkPreviewToolsDock
        previewIframeAccessible={previewToolsLive ? true : previewIframeAccessible}
        responsivePreset={responsivePreset}
        onResponsivePresetChange={setResponsivePreset}
        hasActiveVersion={hasActiveVersion}
        backendPlanAgentRunning={backendPlanAgentRunning}
        commentMode={commentMode}
        commentSidebarOpen={commentSidebarOpen}
        openPreviewCommentCount={openPreviewCommentCount}
        onToggleCommentMode={() => setCommentModeActive(!commentMode)}
        onToggleCommentSidebar={toggleCommentSidebar}
        feedbackCapturing={feedbackCapturing}
        feedbackRecording={feedbackRecording}
        onOpenRecordFeedback={() => feedbackWidgetRef.current?.openRecordFirst?.()}
        onOpenReportFeedback={() => feedbackWidgetRef.current?.open()}
        onCaptureFullPage={handleCaptureFullPage}
        fullPageCaptureBusy={fullPageCaptureBusy}
        onSendToFigma={user ? () => setSendToFigmaOpen(true) : undefined}
        sendToFigmaBusy={sendToFigmaBusy}
        onExportScreens={openExportScreens}
        exportScreensBusy={Boolean(exportScreensProgress)}
        onOpenReleaseDetails={
          hasActiveVersion && (clientNote || aiReviewSummary)
            ? () => setReleaseDetailsOpen(true)
            : undefined
        }
        releaseDetailsHighlighted={Boolean(hasActiveVersion && aiReviewSummary)}
        onOpenPreviewLogs={() => setPreviewLogsOpen(true)}
      />
    ) : null;

  const clientLinkPreviewBody = (
    <>
      {showControls ? (
        <header className="shrink-0 border-b border-border bg-card px-3 py-2 sm:px-4 xl:py-0">
          <div className="flex min-w-0 items-center justify-between gap-2 overflow-x-auto scrollbar-none xl:gap-3 py-1.5">
            {showYorkInternalDashboardLink ? (
              <ClientLinkPreviewToolbarExpandableButton
                icon={ExternalLink}
                label={CLIENT_LINK_LIFECYCLE.chatBlocked.openDashboard}
                ariaLabel={CLIENT_LINK_LIFECYCLE.chatBlocked.openDashboard}
                href={buildReleaseManagementDetailsPath(publicProject.id)}
                target="_blank"
                rel="noopener noreferrer"
              />
            ) : null}
            <div className="mr-auto flex min-w-0 max-w-30 shrink flex-col gap-0.5 sm:max-w-40 xl:max-w-[min(100%,20rem)]">
              {publicProject?.name ? (
                <h1 className="min-w-0 truncate text-sm font-semibold tracking-tight text-foreground sm:text-base">
                  {publicProject.name}
                </h1>
              ) : null}
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2 px-0 xl:px-2">
              {iframeSrc && previewIframeAccessible === true ? (
                <ClientLinkPreviewAddressBar
                  browsePath={iframeBrowsePath}
                  onNavigate={handleNavigatePreviewPath}
                  onSync={syncIframeBrowsePath}
                  className="min-w-0 flex flex-1 max-w-[10rem] sm:max-w-xs md:max-w-sm xl:max-w-md"
                />
              ) : null}
              <div className="w-fit min-w-0 max-w-full shrink-0">
                <SelectClientLinkVersion
                  release={releases}
                  projectId={publicProject?.id}
                  controlsDisabled={backendPlanAgentRunning}
                  controlsDisabledHint={BACKEND_PLAN_AGENT_CONTROLS_DISABLED_HINT}
                  onSwitched={({ releaseId: rid, versionId }) => {
                    // Force hard iframe remount — soft HMR skip can leave live dev session on the
                    // same port after switch-version mounts static preview (or restores live).
                    devEmbedBootPortRef.current = null;
                    setDevEmbedSessionLive(false);
                    setDevEmbedGateOpen(false);
                    setPreviewIframeReady(false);
                    setPreviewBootFailed(false);
                    previewBootGenerationRef.current += 1;

                    const vid = versionId != null ? Number(versionId) : null;
                    if (vid != null && liveActiveVersionId != null && vid === liveActiveVersionId) {
                      if (rid != null) setPreviewContextReleaseId(Number(rid));
                      setPreviewMeta(null);
                    } else {
                      if (rid != null) setPreviewContextReleaseId(rid);
                      if (versionId != null && rid != null) {
                        setPreviewMeta({
                          versionId: Number(versionId),
                          releaseId: Number(rid),
                        });
                      } else {
                        setPreviewMeta(null);
                      }
                    }
                    setPreviewRefreshNonce((n) => n + 1);
                  }}
                  compact
                  selectLabel="Version"
                />
              </div>
            </div>
            {iframeSrc ? (
              <div className="hidden h-6 w-px shrink-0 bg-border xl:block" aria-hidden />
            ) : null}

            <ClientLinkPreviewToolbar
              showControls={showControls}
              showRestartAgentRecovery={showRestartAgentRecovery}
              showReloadDevServerRecovery={showReloadDevServerRecovery}
              showUpdateFromGitRecovery={showUpdateFromGitRecovery}
              restartAgentBusy={onboardingRetryBusy}
              reloadDevBusy={previewRefreshBusy}
              updateFromGitBusy={updateFromGitBusy}
              restartAgentDisabled={restartAgentDisabled}
              restartAgentDisabledReason={restartAgentDisabledReason}
              reloadDevServerDisabled={reloadDevServerDisabled}
              reloadDevServerDisabledReason={reloadDevServerDisabledReason}
              updateFromGitDisabled={
                updateFromGitBusy || previewRefreshBusy || revertPreviewSyncActive
              }
              updateFromGitDisabledReason={
                revertPreviewSyncActive
                  ? "Wait for the revert preview sync to finish."
                  : updateFromGitBusy
                    ? "Bringing preview up to date…"
                    : ""
              }
              onRestartAgent={handleRestartAgentBuildClick}
              onReloadDevServer={handleReloadPreviewRecovery}
              onUpdateFromGit={handleUpdateFromGit}
              onOpenPreviewLogs={showControls ? () => setPreviewLogsOpen(true) : undefined}
              dockMounted={previewToolsDockMounted}
              toolsDockVisible={previewToolsVisible}
              onToggleToolsDock={togglePreviewTools}
              hasActiveVersion={hasActiveVersion}
              backendPlanAgentRunning={backendPlanAgentRunning}
              showLockAndFeedback={showLockAndFeedback}
              openPreviewCommentCount={openPreviewCommentCount}
              isLocked={isLocked}
              locking={locking}
              onLock={handleLock}
              showAiChatToolbarButton={showAiChatToolbarButton}
              releaseBackgroundAgentBlock={releaseBackgroundAgentBlock}
              chatBlockedReason={chatBlockedReason}
              scratchOnboardingChatActive={scratchOnboardingChatActive}
              chatOpen={chatOpen}
              onOpenChat={openChatPanel}
              releaseBackgroundAgentChatDisabledHint={RELEASE_BACKGROUND_AGENT_CHAT_DISABLED_HINT}
            />
          </div>
        </header>
      ) : null}
      {activeReleaseAwaitingRevision && showControls ? (
        <div
          role="status"
          aria-live="polite"
          className="shrink-0 border-b border-primary/20 bg-primary/5 px-3 py-2.5 sm:px-4"
        >
          <p className="text-sm font-medium text-foreground">
            {CLIENT_LINK_LIFECYCLE.activeReleaseAwaitingRevision.title(activeRelease?.name)}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {CLIENT_LINK_LIFECYCLE.activeReleaseAwaitingRevision.body}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {CLIENT_LINK_LIFECYCLE.chatBlocked.readOnlyHint}
          </p>
          {priorLockedPreviewBaseline ? (
            <p className="mt-2 text-xs text-foreground/80">
              {previewMeta?.versionId == null && !iframeSrc
                ? `Loading read-only preview of Release ${priorLockedPreviewBaseline.priorReleaseName}…`
                : `Showing read-only preview from Release ${priorLockedPreviewBaseline.priorReleaseName}. Use Version above to switch revisions.`}
            </p>
          ) : null}
          {publicProject?.id != null ? (
            <Button type="button" variant="outline" size="sm" className="mt-3 h-8" asChild>
              <a
                href={buildReleaseManagementDetailsPath(publicProject.id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {CLIENT_LINK_LIFECYCLE.chatBlocked.openDashboard}
              </a>
            </Button>
          ) : null}
        </div>
      ) : null}
      {isPostLockIdleState && showControls ? (
        <div
          role="status"
          aria-live="polite"
          className="shrink-0 border-b border-border bg-muted/50 px-3 py-2.5 sm:px-4"
        >
          <p className="text-sm font-medium text-foreground">
            {CLIENT_LINK_LIFECYCLE.noActiveOverlay.title}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {CLIENT_LINK_LIFECYCLE.noActiveOverlay.hasVersions}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {CLIENT_LINK_LIFECYCLE.chatBlocked.readOnlyHint}
          </p>
          {priorLockedPreviewBaseline ? (
            <p className="mt-2 text-xs text-foreground/80">
              {previewMeta?.versionId == null && !iframeSrc
                ? `Loading read-only preview of Release ${priorLockedPreviewBaseline.priorReleaseName}…`
                : `Showing read-only preview from Release ${priorLockedPreviewBaseline.priorReleaseName}. Use Version above to switch revisions.`}
            </p>
          ) : null}
          {publicProject?.id != null ? (
            <Button type="button" variant="outline" size="sm" className="mt-3 h-8" asChild>
              <a
                href={buildReleaseManagementDetailsPath(publicProject.id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {CLIENT_LINK_LIFECYCLE.chatBlocked.openDashboard}
              </a>
            </Button>
          ) : null}
        </div>
      ) : null}
      {awaitingFirstVersion && firstVersionBuildActive && showControls ? (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "flex shrink-0 items-start gap-3 border-b px-3 py-2.5 text-sm sm:px-4",
            firstVersionBuildNeedsRecovery
              ? "border-red-200 bg-red-50/95 text-red-950"
              : "border-amber-200 bg-amber-50/95 text-amber-950",
          )}
        >
          {firstVersionBuildNeedsRecovery ? (
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          ) : (
            <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" aria-hidden />
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="space-y-0.5">
              <p className="font-medium">
                {firstVersionBuildNeedsRecovery
                  ? CLIENT_LINK_FIRST_VERSION_BUILD.failedTitle
                  : CLIENT_LINK_FIRST_VERSION_BUILD.bannerTitle}
              </p>
              <p
                className={cn(
                  "text-xs leading-relaxed sm:text-sm",
                  firstVersionBuildNeedsRecovery ? "text-red-900/90" : "text-amber-900/90",
                )}
              >
                {firstVersionStatusMessage}
              </p>
              {!firstVersionBuildNeedsRecovery ? (
                <p className="text-xs leading-relaxed text-amber-800/80">
                  {CLIENT_LINK_FIRST_VERSION_BUILD.chatLockedHint}
                </p>
              ) : null}
            </div>
            {firstVersionBuildNeedsRecovery ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-8"
                  onClick={handleReloadPreviewRecovery}
                >
                  {CLIENT_LINK_PREVIEW_RECOVERY.reloadDevServer.shortLabel}
                </Button>
                {!restartAgentDisabled ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-8"
                    onClick={handleRestartAgentBuildClick}
                  >
                    {CLIENT_LINK_PREVIEW_RECOVERY.restartAgent.shortLabel}
                  </Button>
                ) : null}
                {firstVersionBuildError?.code === 403 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={handleUpdateFirstVersionEmail}
                  >
                    {CLIENT_LINK_FIRST_VERSION_BUILD.updateEmailLabel}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={handleContactLaunchpadTeam}
                >
                  {CLIENT_LINK_FIRST_VERSION_BUILD.supportLabel}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      {showControls &&
      activeRelease &&
      (isReleaseBackendAgentRunning(activeRelease) ||
        isReleaseBackendAgentFailed(activeRelease) ||
        String(activeRelease?.backendAgentLockPhase || "").toLowerCase() ===
          "awaiting_questions") ? (
        <BackendPlanAgentStatusBanner
          release={activeRelease}
          className="mx-3 mb-2 px-3 py-2 sm:mx-4"
          logsHref={buildProjectBackendCodePath(publicProject?.id)}
          onRetry={
            isReleaseBackendAgentFailed(activeRelease) && !activeReleaseLocked
              ? () => void handleRetryBackendPlanAgent()
              : undefined
          }
          retryLoading={locking}
          retryDisabled={lockGithubGateLoading || Boolean(lockGithubGateMessage)}
        />
      ) : null}
      {showControls &&
      activeRelease &&
      String(activeRelease?.backendAgentLockPhase || "").toLowerCase() === "awaiting_questions" &&
      Array.isArray(lockClarifyQuestions) &&
      lockClarifyQuestions.length > 0 ? (
        <div className="mx-3 mb-2 sm:mx-4">
          <LaunchpadQuestionsCard
            questions={lockClarifyQuestions}
            sending={lockClarifySending}
            continueMode="implement"
            onSubmit={(prompt) => void handleLockClarifySubmit(prompt)}
          />
        </div>
      ) : null}
      <div id="feedback-capture-area" className="relative mt-0 flex min-h-0 flex-1 flex-col">
        {showNoActiveReleaseCard ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-background p-6">
            <div className="w-full max-w-lg rounded-xl border border-border bg-card p-8 text-center shadow-sm">
              <h2 className="mb-2 text-lg font-semibold text-foreground">
                {CLIENT_LINK_LIFECYCLE.noActiveOverlay.title}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {activeReleaseAwaitingRevision
                  ? CLIENT_LINK_LIFECYCLE.activeReleaseAwaitingRevision.body
                  : hasAnyVersions
                    ? CLIENT_LINK_LIFECYCLE.noActiveOverlay.hasVersions
                    : CLIENT_LINK_LIFECYCLE.noActiveOverlay.noVersions}
              </p>
              {showControls && hasAnyVersions ? (
                <div className="mt-4 space-y-2 text-left text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">
                    {CLIENT_LINK_LIFECYCLE.noActiveOverlay.stepsTitle}
                  </p>
                  <ol className="list-decimal space-y-1 pl-4">
                    {CLIENT_LINK_LIFECYCLE.noActiveOverlay.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <ClientLinkPreviewCompilingChip
              open={showPreviewCompilingChip}
              message={
                compileTheaterCopy
                  ? compileTheaterCopy.title
                  : isPreviewContentLoadMessage(previewIframeLoadMessage)
                    ? previewIframeLoadMessage
                    : PREVIEW_CONTENT_LOAD_MESSAGES.compiling
              }
              file={compileTheaterCopy?.fileLine || ""}
              helper={compileTheaterCopy?.helper || ""}
              showBar={Boolean(compileTheaterCopy?.showBar)}
              percent={compileTheaterCopy?.percent ?? null}
              quiet={Boolean(compileTheaterQuiet && compileTheaterCopy)}
            />
            <ClientLinkPreviewLoaderOverlay
              open={
                (effectiveShowPreviewLoaderOverlay ||
                  (previewBootFailed && !previewOverlayPeeled) ||
                  (blockingPreviewFailure && !previewOverlayPeeled)) &&
                !(previewOverlayPeeled && blockingPreviewFailure)
              }
              title={previewLoaderTitle}
              message={previewLoaderMessageWithRecoveryHint}
              tone={
                showAgentWorkingInsteadOfStartServer ||
                (awaitingFirstVersion && firstVersionBuildActive && !firstVersionBuildNeedsRecovery)
                  ? "working"
                  : undefined
              }
              showFetchingAnimation={showFetchingAnimation}
              compileTheater={showCompileTheaterOnOverlay ? compileTheaterCopy : null}
              showRetry={previewLoaderShowReloadServer}
              retryDisabled={reloadDevServerDisabled}
              retryDisabledReason={reloadDevServerDisabledReason}
              onRetry={handleReloadPreviewRecovery}
              recoveryMode={previewLoaderRecoveryMode && !previewOverlayPeeled}
              recoveryActions={previewLoaderRecoveryActions}
              diagnosis={
                previewOverlayPeeled || previewServerNotRunning || !blockingPreviewFailure
                  ? null
                  : previewFailureDiagnosis
              }
              showSendDiagnosisToAgent={
                blockingPreviewFailure &&
                showControls &&
                !previewOverlayPeeled &&
                !previewServerNotRunning
              }
              onSendDiagnosisToAgent={handleSendDiagnosisToAgent}
              showViewInPreview={
                blockingPreviewFailure && !previewOverlayPeeled && !previewServerNotRunning
              }
              onViewInPreview={handleViewPreviewFailureInFrame}
            />
            {showDevEmbedIframe ? (
              showControls ? (
                <ClientLinkResponsivePreviewShell
                  widthPx={effectivePreviewWidth}
                  resizeHandleEnabled={previewResizeHandleEnabled}
                  onStageWidthChange={setPreviewStageWidth}
                  onWidthChangeFromDrag={handleResponsiveDragWidth}
                  overlay={previewToolsDock}
                >
                  <ClientLinkPreviewErrorBanner
                    open={showExactPortErrorBanner || showConsoleErrorBanner}
                    message={showConsoleErrorBanner ? previewFailureDiagnosis.summary : undefined}
                    onReload={handleReloadPreviewRecovery}
                    reloadDisabled={reloadDevServerDisabled}
                    showSendToAgent={Boolean(previewFailureDiagnosis) && showControls}
                    onSendToAgent={handleSendDiagnosisToAgent}
                  />
                  <ClientLinkPreviewErrorBanner
                    open={buildVerify.showBanner && !showExactPortErrorBanner && showControls}
                    message={CLIENT_LINK_BUILD_VERIFY_BANNER.message(buildVerify.failedCommand)}
                    showSendToAgent={Boolean(buildVerify.fixPrompt)}
                    onSendToAgent={handleSendBuildVerifyToAgent}
                    onDismiss={buildVerify.dismiss}
                    dismissLabel={CLIENT_LINK_BUILD_VERIFY_BANNER.dismissLabel}
                  />
                  <iframe
                    key={previewIframeMountKey}
                    ref={previewIframeRef}
                    id="previewFrame"
                    src={previewIframeLiveSrc}
                    srcDoc={previewIframeErrorSrcDoc}
                    title="Build Preview"
                    className="absolute inset-0 h-full w-full border-0 bg-background"
                    sandbox={UNTRUSTED_PREVIEW_IFRAME_SANDBOX}
                    allow="display-capture"
                    onLoad={previewIframeErrorSrcDoc ? undefined : handlePreviewIframeLoad}
                    onError={previewIframeErrorSrcDoc ? undefined : handlePreviewIframeError}
                  />
                  {chatOpen && showLockAndFeedback ? (
                    <ClientLinkPreviewPicker
                      iframeRef={previewIframeRef}
                      active={
                        !backendPlanAgentRunning &&
                        visualPickMode &&
                        (previewIframeAccessible === true || previewBridgeInspectable)
                      }
                      pinned={pickedElementContext}
                      onPinnedChange={handlePreviewPinnedChange}
                      onReplaceImageResult={handlePreviewReplaceImageResult}
                      onReplacementStagedForRepo={handleReplacementStagedForRepo}
                      clientLinkAiSvgContext={clientLinkAiSvgContext}
                      existingRevertSnapshot={stagedRevertSnapshot}
                    />
                  ) : null}
                  <VoiceDemoCursorOverlay cursor={voiceDemoCursor} />
                  {showLockAndFeedback &&
                  previewToolsLive &&
                  (commentMode ||
                    Boolean(pendingCommentPlacement) ||
                    Boolean(focusedPreviewCommentId)) ? (
                    <ClientLinkCommentOverlay
                      iframeRef={previewIframeRef}
                      commentMode={commentMode && !backendPlanAgentRunning}
                      comments={previewCommentPins}
                      focusedCommentId={focusedPreviewCommentId}
                      onFocusComment={(id) => {
                        setFocusedPreviewCommentId((current) => (current === id ? null : id));
                      }}
                      onCloseThread={() => setFocusedPreviewCommentId(null)}
                      pendingPlacement={pendingCommentPlacement}
                      onPendingPlacementChange={handlePendingCommentPlacementChange}
                      onCreateComment={async (payload) => {
                        const created = await createPreviewComment(payload);
                        if (created?.id) {
                          setFocusedPreviewCommentId(created.id);
                        }
                        setPendingCommentPlacement(null);
                      }}
                      onReply={replyToPreviewComment}
                      onResolve={(id) => setPreviewCommentStatus(id, "resolved")}
                      onReopen={(id) => setPreviewCommentStatus(id, "open")}
                      onDelete={removePreviewComment}
                      onLogicBodyChange={updatePreviewCommentLogicBody}
                      onFixWithAi={handleFixCommentWithAi}
                      disabled={backendPlanAgentRunning}
                    />
                  ) : null}
                </ClientLinkResponsivePreviewShell>
              ) : (
                <div className="relative min-h-0 flex-1">
                  <ClientLinkPreviewErrorBanner
                    open={showExactPortErrorBanner || showConsoleErrorBanner}
                    message={showConsoleErrorBanner ? previewFailureDiagnosis.summary : undefined}
                    onReload={handleReloadPreviewRecovery}
                    reloadDisabled={reloadDevServerDisabled}
                    showSendToAgent={Boolean(previewFailureDiagnosis) && showControls}
                    onSendToAgent={handleSendDiagnosisToAgent}
                  />
                  <ClientLinkPreviewErrorBanner
                    open={buildVerify.showBanner && !showExactPortErrorBanner && showControls}
                    message={CLIENT_LINK_BUILD_VERIFY_BANNER.message(buildVerify.failedCommand)}
                    showSendToAgent={Boolean(buildVerify.fixPrompt)}
                    onSendToAgent={handleSendBuildVerifyToAgent}
                    onDismiss={buildVerify.dismiss}
                    dismissLabel={CLIENT_LINK_BUILD_VERIFY_BANNER.dismissLabel}
                  />
                  <iframe
                    key={previewIframeMountKey}
                    ref={previewIframeRef}
                    id="previewFrame"
                    src={previewIframeLiveSrc}
                    // src="http://localhost:8033/"
                    srcDoc={previewIframeErrorSrcDoc}
                    title="Build Preview"
                    className="absolute inset-0 h-full w-full border-0 bg-background"
                    sandbox={UNTRUSTED_PREVIEW_IFRAME_SANDBOX}
                    allow="display-capture"
                    onLoad={previewIframeErrorSrcDoc ? undefined : handlePreviewIframeLoad}
                    onError={previewIframeErrorSrcDoc ? undefined : handlePreviewIframeError}
                  />
                </div>
              )
            ) : null}
            {showControls ? (
              <EmbeddedFeedbackWidget
                ref={feedbackWidgetRef}
                projectId={String(publicProject.id)}
                releaseId={feedbackWidgetReleaseAndVersion.releaseId}
                projectVersionId={feedbackWidgetReleaseAndVersion.projectVersionId}
                previewIframeRef={previewIframeRef}
                getClientEmail={() => getClientLinkVerifiedEmail()}
                captureTarget="#feedback-capture-wrapper"
                anchorToPreview
                hideDefaultTrigger
                onCapturingChange={setFeedbackCapturing}
                onScreenRecordingChange={setFeedbackRecording}
                onSuccess={(res) => {
                  if (
                    res &&
                    typeof res === "object" &&
                    res.jiraError != null &&
                    String(res.jiraError).trim() !== ""
                  ) {
                    return;
                  }
                  toast.success("Feedback submitted successfully");
                }}
                onError={(err) => toast.error(err?.message ?? "Failed to submit feedback")}
              />
            ) : null}
          </>
        )}
      </div>
    </>
  );

  const clientLinkChatPanel = (
    <ClientLinkChatPanel
      projectSlug={projectSlug}
      projectId={publicProject?.id ?? null}
      scratchPrompt={publicProject?.scratchPrompt ?? null}
      firstReleaseId={firstProjectReleaseId}
      effectiveChatReleaseId={effectiveChatReleaseId}
      hasActiveVersion={hasActiveVersion}
      chatBlockedReason={effectiveChatBlockedReason}
      isLocked={effectiveReleaseLocked}
      backendPlanAgentRunning={backendPlanAgentRunning}
      releaseBackgroundAgentBlock={releaseBackgroundAgentBlock}
      isOpen={chatOpen}
      devPreviewActive={isDevEmbedPreview && Boolean(previewPort)}
      devPreviewEmbedHmr={devPreviewEmbedHmr}
      embedHmrWsBlocked={embedHmrWsBlocked}
      embedHmrWsBannerState={embedHmrWsBannerState}
      mergeTargetLabel={chatMergeTargetLabel}
      onPreviewCommitApplied={handleChatPreviewCommitApplied}
      onPreviewLiveRefresh={handlePreviewLiveRefreshAfterTurn}
      onAgentTurnSettlingChange={handleAgentTurnSettlingChange}
      onAgentWorkingChange={handleChatAgentWorkingChange}
      onDesktopControlHeldChange={setDesktopControlHeld}
      onProjectReloadQuiet={reloadProjectQuiet}
      onSyncAndRefreshPreview={handleSyncAndRefreshPreview}
      onRevertApplied={() => {
        setPreviewMeta(null);
        void reloadProjectQuiet();
      }}
      onRevertPreviewSyncChange={(active) => {
        setRevertPreviewSyncActive(active);
        if (!active) return;
        setDevEmbedSessionLive(false);
        setPreviewIframeReady(false);
        setPreviewBootFailed(false);
        clearPreviewFailureDiagnosis();
        setPreviewIframeLoadMessage("Rebuilding live preview from the reverted checkpoint…");
      }}
      onCloseChat={() => setChatOpen(false)}
      pickedElementContext={pickedElementContext}
      onPickedElementContextChange={setPickedElementContext}
      visualPickMode={visualPickMode}
      onVisualPickModeChange={setVisualPickMode}
      previewIframeAccessible={previewIframeAccessible}
      previewBridgeInspectable={previewBridgeInspectable}
      previewIframeRef={previewIframeRef}
      previewPath={iframeBrowsePath || "/"}
      onNavigatePreview={handleVoiceNavigatePreview}
      onVoiceDemoCursor={setVoiceDemoCursor}
      voiceEnabled={Boolean(publicProject?.clientLinkVoiceEnabled)}
      previewFailureDiagnosis={previewFailureDiagnosis}
      previewConsoleLines={previewConsoleLines}
      onPreviewReplaceImageResult={handlePreviewReplaceImageResult}
      stagedChatReplacementImage={stagedChatReplacementImage}
      onStagedChatReplacementImageChange={setStagedChatReplacementImage}
      stagedChatReferenceImages={stagedChatReferenceImages}
      onStagedChatReferenceImagesChange={setStagedChatReferenceImages}
      onReplacementStagedForRepo={handleReplacementStagedForRepo}
      clientLinkAiSvgContext={clientLinkAiSvgContext}
      existingRevertSnapshot={stagedRevertSnapshot}
      composerSeed={chatComposerSeed}
      onComposerSeedConsumed={() => setChatComposerSeed(null)}
    />
  );

  return (
    <div
      className={cn(
        "flex h-dvh max-h-dvh min-h-0 w-full flex-col overflow-hidden",
        showControls || !hasActiveVersion ? "bg-muted/30" : "bg-black",
      )}
    >
      {chatSplitShell ? (
        clientLinkMobileChatOverlay ? (
          <>
            <div
              id="feedback-capture-wrapper"
              className="flex min-h-0 min-w-0 w-full flex-1 flex-col"
            >
              {clientLinkPreviewBody}
            </div>
            {chatOpen ? (
              <div className="fixed inset-0 z-[70] flex min-h-0 min-w-0 flex-col bg-background">
                {clientLinkChatPanel}
              </div>
            ) : null}
          </>
        ) : (
          <ResizablePanelGroup orientation="horizontal" className="flex min-h-0 flex-1 w-full">
            <ResizablePanel
              id={CLIENT_LINK_PREVIEW_PANEL_ID}
              defaultSize={previewPanelDefaultSize}
              minSize="25%"
              className="flex min-h-0 min-w-0 flex-col"
              style={{ overflow: "hidden" }}
            >
              <div id="feedback-capture-wrapper" className="flex min-h-0 w-full flex-1 flex-col">
                {clientLinkPreviewBody}
              </div>
            </ResizablePanel>
            <ResizableHandle
              withHandle
              disabled={!chatOpen}
              className={cn(
                "bg-border hover:bg-muted",
                !chatOpen && "w-0 min-w-0 overflow-hidden opacity-0",
              )}
            />
            <ResizablePanel
              id={CLIENT_LINK_CHAT_PANEL_ID}
              panelRef={chatPanelRef}
              defaultSize={chatPanelDefaultSize}
              minSize="20%"
              collapsible
              collapsedSize={0}
              className={cn("flex min-h-0 flex-col", chatOpen && "min-w-[280px]")}
              style={{ overflow: "hidden" }}
            >
              {chatOpen ? clientLinkChatPanel : null}
            </ResizablePanel>
          </ResizablePanelGroup>
        )
      ) : (
        <div id="feedback-capture-wrapper" className="flex min-h-0 w-full flex-1 flex-col">
          {clientLinkPreviewBody}
        </div>
      )}

      <ClientLinkCommentSidebar
        open={commentSidebarOpen}
        onOpenChange={handleCommentSidebarOpenChange}
        blockOutsideDismiss={
          commentMode || Boolean(pendingCommentPlacement) || Boolean(focusedPreviewCommentId)
        }
        widthPx={commentSidebarWidthPx}
        onWidthChange={handleCommentSidebarWidthChange}
        comments={previewCommentThreads}
        loading={previewCommentsLoading}
        error={previewCommentsError}
        statusFilter={previewCommentStatusFilter}
        onStatusFilterChange={setPreviewCommentStatusFilter}
        pageFilter={previewCommentPageFilter}
        onPageFilterChange={setPreviewCommentPageFilter}
        categoryFilter={previewCommentCategoryFilter}
        onCategoryFilterChange={setPreviewCommentCategoryFilter}
        currentPreviewPath={previewCommentNormalizedPath}
        selectedThreadId={selectedPreviewCommentThreadId}
        onSelectThread={setSelectedPreviewCommentThreadId}
        onFocusOnPage={handleFocusPreviewCommentOnPage}
        onReply={replyToPreviewComment}
        onResolve={(id) => setPreviewCommentStatus(id, "resolved")}
        onReopen={(id) => setPreviewCommentStatus(id, "open")}
        onDelete={removePreviewComment}
        onLogicBodyChange={updatePreviewCommentLogicBody}
        onFixWithAi={handleFixCommentWithAi}
      />

      <ClientLinkEmailGateDialog
        open={showEmailGate}
        projectSlug={projectSlug}
        projectName={publicProject?.name}
        initialEmail={emailGateInitialEmail}
        onVerified={handleEmailGateVerified}
      />

      <Dialog open={onboardingRetryEmailOpen} onOpenChange={setOnboardingRetryEmailOpen}>
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start your AI build</DialogTitle>
            <DialogDescription>
              We use your stakeholder email to run the AI agent that creates the first version.{" "}
              {CLIENT_LINK_FIRST_VERSION_BUILD.chatLockedHint}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-1">
            <Label htmlFor="onboarding-retry-email">Your email</Label>
            <Input
              id="onboarding-retry-email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={onboardingRetryEmail}
              onChange={(e) => setOnboardingRetryEmail(e.target.value)}
              disabled={onboardingRetryBusy}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={onboardingRetryBusy}
              onClick={() => setOnboardingRetryEmailOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={onboardingRetryBusy}
              onClick={() => void runOnboardingRetry(onboardingRetryEmail)}
            >
              {onboardingRetryBusy ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Retrying…
                </>
              ) : (
                CLIENT_LINK_PREVIEW_RECOVERY.restartAgent.shortLabel
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={lockConfirmOpen} onOpenChange={setLockConfirmOpen}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[min(90dvh,720px)] flex-col gap-4 overflow-hidden sm:max-w-md"
        >
          <DialogHeader className="shrink-0">
            <DialogTitle>Lock this release?</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {!skipLockAgentOperations ? (
              <CursorAgentGithubGateAlert
                loading={lockGithubGateLoading}
                message={lockGithubGateMessage}
              />
            ) : null}
            <div className="grid gap-2 py-1">
              <Label htmlFor="client-link-lock-email" className="text-slate-700">
                Your email
              </Label>
              <Input
                id="client-link-lock-email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={lockEmail}
                onChange={(e) => setLockEmail(e.target.value)}
                disabled={locking}
                className="rounded-lg border-slate-200 focus-visible:ring-emerald-500/30"
              />
              {lockEmailIsYorkInternal ? (
                <SkipBackendLockAgentCheckbox
                  checked={skipLockAgentOperations}
                  onCheckedChange={setSkipLockAgentOperations}
                  disabled={locking}
                />
              ) : null}
              {!skipLockAgentOperations && hasDevelopmentRepo ? (
                <ReleaseLockDevRepoSummary
                  projectId={publicProject?.id}
                  developmentRepoUrl={publicProject?.developmentRepoUrl}
                  backendLockAgentMode={publicProject?.backendLockAgentMode}
                  variant="compact"
                />
              ) : !skipLockAgentOperations ? (
                <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
                  <p className="text-xs text-slate-600">
                    This project has no development repository yet. Provide the GitHub or Bitbucket
                    repo for the post-lock sync.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="client-link-lock-dev-repo" className="text-slate-700">
                      Development repository
                    </Label>
                    <Input
                      id="client-link-lock-dev-repo"
                      placeholder="github.com/org/your-repo"
                      value={lockDevelopmentRepoUrl}
                      onChange={(e) => setLockDevelopmentRepoUrl(e.target.value)}
                      disabled={locking}
                      className="rounded-lg border-slate-200 focus-visible:ring-emerald-500/30 transition-all duration-200"
                    />
                  </div>
                </div>
              ) : null}
              {!skipLockAgentOperations ? (
                <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                  <Label htmlFor="client-link-lock-user-prompt" className="text-slate-700">
                    Additional instructions (optional)
                  </Label>
                  <Textarea
                    id="client-link-lock-user-prompt"
                    value={lockUserPrompt}
                    onChange={(e) => setLockUserPrompt(e.target.value)}
                    placeholder="e.g. Prefer existing auth middleware; keep API under /v1…"
                    rows={3}
                    className="resize-y text-sm min-h-[72px] rounded-lg border-slate-200"
                    disabled={locking}
                    maxLength={4000}
                  />
                  <p className="text-xs text-slate-500">
                    When filled, the backend lock agent will follow these instructions.
                  </p>
                </div>
              ) : null}
              {!skipLockAgentOperations ? (
                <ClientLinkLockDeployOptions
                  projectSlug={projectSlug}
                  lockEmail={lockEmail}
                  disabled={locking}
                  deployAfterLock={lockDeployAfterBackend}
                  onDeployAfterLockChange={setLockDeployAfterBackend}
                  deployEnvironmentId={lockDeployEnvironmentId}
                  onDeployEnvironmentIdChange={setLockDeployEnvironmentId}
                />
              ) : null}
            </div>
          </div>
          <DialogFooter showCloseButton={false} className="shrink-0">
            <Button type="button" variant="outline" onClick={() => setLockConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm"
              onClick={handleLockConfirm}
              disabled={
                locking ||
                !lockEmailValid ||
                (!skipLockAgentOperations &&
                  (lockGithubGateLoading ||
                    Boolean(lockGithubGateMessage) ||
                    !lockDevRepoValid ||
                    (lockDeployAfterBackend && !lockDeployEnvironmentId.trim())))
              }
            >
              {locking ? (
                <span className="flex items-center gap-2">
                  <Spinner className="size-4" />
                  Locking...
                </span>
              ) : (
                "Yes, lock release"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={releaseDetailsOpen} onOpenChange={setReleaseDetailsOpen}>
        <DialogContent className="max-h-[85vh] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Release details</DialogTitle>
            <DialogDescription>
              {displayRelease?.name
                ? `Release ${displayRelease.name} — notes and review checklist`
                : "Notes and review checklist for this release"}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">
            {clientNote ? (
              <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FileText className="size-4 shrink-0 text-slate-600" />
                  Release notes
                </h3>
                <div className="min-w-0 text-sm leading-relaxed">
                  <AssistantMarkdown text={clientNote} />
                </div>
              </section>
            ) : null}
            {aiReviewSummary ? (
              <section className="rounded-lg border border-border bg-muted/40 p-4">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Sparkles className="size-4 shrink-0 text-primary" />
                  What to review
                </h3>
                <div className="min-w-0 text-sm leading-relaxed">
                  <AssistantMarkdown text={aiReviewSummary} />
                </div>
                {aiReviewSummaryAt ? (
                  <p className="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">
                    Checklist updated{" "}
                    {new Date(aiReviewSummaryAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                ) : null}
              </section>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
      <ClientLinkPreviewLogsDialog
        open={previewLogsOpen}
        onOpenChange={setPreviewLogsOpen}
        projectSlug={projectSlug}
        projectName={publicProject?.name}
      />
      <ClientLinkSendToFigmaDialog
        open={sendToFigmaOpen}
        onOpenChange={setSendToFigmaOpen}
        defaultName={defaultPreviewScreenName(iframeBrowsePath)}
        route={iframeBrowsePath || "/"}
        busy={sendToFigmaBusy}
        onSend={handleSendToFigma}
        downloadBusy={fullPageCaptureBusy}
        onDownload={async (name) => {
          if (await downloadFullPageScreenshot(name)) setSendToFigmaOpen(false);
        }}
      />
      <ClientLinkExportScreensDialog
        open={exportScreensOpen}
        onOpenChange={setExportScreensOpen}
        candidates={exportScreenCandidates}
        currentRoute={iframeBrowsePath || "/"}
        scanning={exportScreensScanning}
        onRescan={scanExportScreenCandidates}
        viewport={responsivePreset}
        canSendToFigma={Boolean(user)}
        progress={exportScreensProgress}
        onStart={handleExportScreens}
        onStop={() => exportScreensAbortRef.current?.abort()}
      />
    </div>
  );
};
