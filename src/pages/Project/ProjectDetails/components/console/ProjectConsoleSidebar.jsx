import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  Braces,
  ChevronDown,
  ClipboardCheck,
  Cpu,
  ExternalLink,
  History,
  KeyRound,
  LineChart,
  LogOut,
  Maximize2,
  MessageSquare,
  Plug,
  Settings,
  Shield,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LaunchpadLogo } from "@/components/common/LaunchpadLogo";
import { HubProfileAvatar } from "@/components/common/HubProfileAvatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/context/AuthContext";
import { buildProjectClientUrls } from "@/lib/projectClientLinkUrls";
import { buildProjectDetailsPathWithResume } from "@/lib/projectJourneyResume";
import { readLastProjectId } from "@/lib/lastProject";
import { isLaunchpadAdmin } from "@/utils/launchpadRole";
import { CompletenessRing } from "@/pages/Project/ProductManagement/components/CompletenessRing";
import { PERSONA_TABS } from "@/pages/Project/ProductManagement/constants";
import { personaCompleteness } from "@/pages/Project/ProductManagement/utils/personaCompleteness";
import { useOptionalClientInfoContext } from "@/pages/Project/ClientInfo/hooks/useClientInfoContext";
import { buildProjectSettingsPath } from "@/pages/Project/ProjectSettings/constants";
import {
  ADMIN_CONSOLE_LINKS,
  CONSOLE_SETTINGS_SERVICE,
  DEFAULT_PAGE_BY_SERVICE,
  PLATFORM_CONSOLE_LINKS,
  SIDEBAR_CONSOLE_SERVICES,
} from "../../constants/projectServices";
import { AGENT_ANALYTICS_SECTION } from "../../constants/projectAgentAnalyticsSection";
import { ALL_PROJECT_REPORTS_SECTION } from "../../constants/projectAllReportsSection";
import { QA_ANALYTICS_SECTION } from "../../constants/projectQaAnalyticsSection";
import { buildProjectChatPath } from "../../lib/consoleQuickNavCatalog";
import { ProjectSwitcher } from "./ProjectSwitcher";

const LINK_ICONS = {
  "/settings/integrations": Plug,
  "/settings/notifications": Bell,
  "/jobs": Zap,
  "/prompt-management": Braces,
  "/deployments": History,
  "/platform-analytics": LineChart,
  "/cost-analytics": BarChart3,
  "/qa-analytics": ClipboardCheck,
  "/model-router": Cpu,
  "/cursor-api-keys": KeyRound,
};

function logoHref(projectId) {
  if (projectId) return buildProjectDetailsPathWithResume(projectId);
  const last = readLastProjectId();
  if (last) return buildProjectDetailsPathWithResume(last);
  return "/projects";
}

function workspacePath(projectId, section) {
  const base = `/projects/details/${encodeURIComponent(projectId)}`;
  if (!section) return base;
  const qs = new URLSearchParams();
  qs.set("section", section);
  return `${base}?${qs.toString()}`;
}

function SectionLabel({ label }) {
  return (
    <div className="px-5 pb-1 pt-4">
      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70">
        {label}
      </span>
    </div>
  );
}

function Rule() {
  return <div className="mx-3 my-1.5 h-px bg-sidebar-border" aria-hidden />;
}

function SubTabButton({
  label,
  active,
  onClick,
  icon: Icon,
  badge,
  indent = false,
  /** When false, the tab is not rendered. Defaults to true for all non-gated tabs. */
  visible = true,
}) {
  // Project settings: keep the row mounted while its route is selected even if the
  // access flag briefly reads false during PlatformConsoleChrome project load.
  const keepWhileActive = label === "Project settings" && active;
  if (!visible && !keepWhileActive) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13.5px] font-medium transition-colors duration-100",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
        indent && "pl-3",
      )}
    >
      {Icon ? (
        <Icon
          className={cn("size-3.5 shrink-0", active ? "text-primary" : "text-muted-foreground/70")}
          aria-hidden
        />
      ) : null}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge != null && badge > 0 ? (
        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-[10px] font-semibold text-primary">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function AccordionHeader({ icon: Icon, label, expanded, onToggle, accent = false, dataTour }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      data-tour={dataTour}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[14px] font-medium transition-colors duration-100",
        accent
          ? "text-primary"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
      )}
    >
      {Icon ? (
        <Icon
          className={cn("size-[15px] shrink-0", accent ? "text-primary" : "text-muted-foreground")}
          aria-hidden
        />
      ) : null}
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      <ChevronDown
        className={cn(
          "size-3 shrink-0 text-muted-foreground/60 transition-transform duration-150",
          expanded && "rotate-180",
        )}
        aria-hidden
      />
    </button>
  );
}

function ProfileFooter() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative shrink-0 border-t border-sidebar-border bg-sidebar p-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-sidebar-accent/70"
            aria-expanded={open}
            aria-label="Account menu"
          >
            <HubProfileAvatar
              email={user?.email}
              name={user?.name}
              alt={user?.name || user?.email || "Account"}
              fallbackImageUrl={user?.image}
              className="size-8 shrink-0 rounded-full"
              fallbackClassName="rounded-full bg-primary/15 text-primary"
              iconClassName="size-4"
            />
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-[13.5px] font-semibold text-sidebar-foreground">
                {user?.name || "Account"}
              </p>
              <p className="truncate text-[12px] text-muted-foreground">{user?.email}</p>
            </div>
            <ChevronDown
              className={cn(
                "size-3 shrink-0 text-muted-foreground/60 transition-transform duration-150",
                open && "rotate-180",
              )}
              aria-hidden
            />
          </button>
        </PopoverTrigger>

        <PopoverContent
          side="top"
          align="end"
          sideOffset={8}
          alignOffset={-4}
          collisionPadding={12}
          className="w-[260px] overflow-hidden rounded-lg border-sidebar-border p-0 shadow-lg"
        >
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center gap-3">
              <HubProfileAvatar
                email={user?.email}
                name={user?.name}
                alt={user?.name || user?.email || "Account"}
                fallbackImageUrl={user?.image}
                className="size-8 shrink-0 rounded-full"
                fallbackClassName="rounded-full bg-primary/15 text-primary"
                iconClassName="size-4"
              />
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold">{user?.name || "Account"}</p>
                <p className="truncate text-[12px] text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </div>

          <div className="py-1">
            <p className="px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70">
              Account
            </p>
            {PLATFORM_CONSOLE_LINKS.map((link) => {
              const Icon = LINK_ICONS[link.href];
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2 text-[14px] text-foreground/80 transition-colors hover:bg-muted/60"
                  onClick={() => setOpen(false)}
                >
                  {Icon ? <Icon className="size-3.5 text-muted-foreground" aria-hidden /> : null}
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="border-t border-border py-1">
            <button
              type="button"
              className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2 text-[14px] text-red-500 transition-colors hover:bg-red-500/10"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              <LogOut className="size-3.5" aria-hidden />
              Log out
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/**
 * Full project console sidebar — Services tree (incl. Settings), Admin, profile.
 */
export function ProjectConsoleSidebar({
  project,
  projectName,
  serviceId,
  pageId,
  activeProfile = "company",
  overlayKey = null,
  forceExpandSettings = false,
  forceExpandAdmin = false,
  projectSettingsActive = false,
  activeAdminHref = null,
  isAdmin = false,
  canAccessProjectSettings = false,
  agentAnalyticsActiveCount = 0,
  onNavigateServicePage,
  onNavigateProfile,
  onNavigateCollaboration,
  onNavigateAgentAnalytics,
  onNavigateQaAnalytics,
  onNavigateAllReports,
  onEditProject,
  tourExpandServiceId = null,
  tourActive = false,
  tourStepId = null,
  onOpenReviewPortal,
  onOpenPreviewOnly,
  reviewPortalDisabled = false,
  previewOnlyDisabled = false,
  className,
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const projectId = project?.id ?? null;
  const { clientDetails } = useOptionalClientInfoContext() ?? {};
  const { clientUrl, previewOnlyUrl } = buildProjectClientUrls(project);
  const reviewDisabled = Boolean(onOpenReviewPortal) ? reviewPortalDisabled : !clientUrl;
  const previewDisabled = Boolean(onOpenPreviewOnly) ? previewOnlyDisabled : !previewOnlyUrl;
  const showAdmin = isAdmin || isLaunchpadAdmin(user?.role);

  const settingsServiceId = CONSOLE_SETTINGS_SERVICE.id;
  const [expanded, setExpanded] = useState(() => {
    if (forceExpandAdmin || overlayKey === "all-reports") {
      return new Set();
    }
    if (forceExpandSettings || (overlayKey && overlayKey !== "all-reports")) {
      return new Set([settingsServiceId]);
    }
    return new Set(serviceId ? [serviceId] : []);
  });
  const [adminExpanded, setAdminExpanded] = useState(showAdmin);

  useEffect(() => {
    if (tourExpandServiceId) return;
    if (!serviceId || overlayKey) return;
    // Keep only the active service open (exclusive accordion).
    setExpanded((prev) => {
      if (prev.has(serviceId) && prev.size === 1) return prev;
      return new Set([serviceId]);
    });
  }, [serviceId, overlayKey, tourExpandServiceId]);

  useEffect(() => {
    if (forceExpandSettings) {
      setExpanded(new Set([settingsServiceId]));
    }
    if (overlayKey && overlayKey !== "all-reports") {
      setExpanded(new Set([settingsServiceId]));
    }
    if (overlayKey === "all-reports" || forceExpandAdmin) {
      setAdminExpanded(true);
      setExpanded(new Set());
    }
  }, [overlayKey, forceExpandSettings, forceExpandAdmin, settingsServiceId]);

  // Accordion: only one service section open at a time.
  const toggleService = (id) => {
    setExpanded((prev) => {
      if (prev.has(id)) return new Set();
      return new Set([id]);
    });
  };

  const showPersonas = !overlayKey && serviceId === "product-strategy" && pageId === "profiles";
  const tourExpandedSet = tourExpandServiceId ? new Set([tourExpandServiceId]) : null;

  useEffect(() => {
    if (!tourActive) return undefined;
    const selector = tourExpandServiceId
      ? `[data-tour="project-console-service-${tourExpandServiceId}"]`
      : tourStepId === "project-switcher"
        ? '[data-tour="project-console-switcher"]'
        : null;
    if (!selector) return undefined;
    const frame = requestAnimationFrame(() => {
      document.querySelector(selector)?.scrollIntoView({ block: "nearest", behavior: "auto" });
    });
    return () => cancelAnimationFrame(frame);
  }, [tourActive, tourExpandServiceId, tourStepId]);

  return (
    <aside
      data-tour="project-console-sidebar"
      className={cn(
        "flex h-full min-h-0 w-[270px] shrink-0 flex-col self-stretch overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
        className,
      )}
    >
      <div className="flex h-12 shrink-0 items-center px-4">
        <Link
          to={logoHref(projectId)}
          className="flex min-w-0 items-center rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          aria-label="Go to project"
        >
          <LaunchpadLogo alt="Launchpad" className="h-[30px] w-auto max-w-[9rem] object-contain" />
        </Link>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="sidebar-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="px-3 pb-1 pt-2" data-tour="project-console-switcher">
            <ProjectSwitcher
              projectId={projectId}
              projectName={projectName || project?.name}
              variant="sidebar"
            />
          </div>

          <SectionLabel label="Services" />
          <div className="mt-1 space-y-0.5 px-3 pb-1">
            {SIDEBAR_CONSOLE_SERVICES.map((service) => {
              const Icon = service.icon;
              const isSettings = service.id === settingsServiceId;
              const isExpanded = tourExpandedSet
                ? tourExpandedSet.has(service.id)
                : expanded.has(service.id);
              const serviceActive = isSettings
                ? Boolean(overlayKey) && overlayKey !== "all-reports"
                : !overlayKey && serviceId === service.id;
              return (
                <div key={service.id}>
                  <AccordionHeader
                    icon={Icon}
                    label={service.label}
                    expanded={isExpanded}
                    accent={serviceActive}
                    dataTour={`project-console-service-${service.id}`}
                    onToggle={() => {
                      const opening = !expanded.has(service.id);
                      toggleService(service.id);
                      if (opening) {
                        if (!isSettings) {
                          onNavigateServicePage?.(
                            service.id,
                            DEFAULT_PAGE_BY_SERVICE[service.id] ?? service.pages[0]?.id,
                          );
                        }
                      }
                    }}
                  />
                  {isExpanded ? (
                    <div className="mb-0.5 ml-4 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-4">
                      {isSettings ? (
                        <>
                          <SubTabButton
                            label="Project settings"
                            icon={Settings}
                            active={projectSettingsActive}
                            visible={canAccessProjectSettings}
                            onClick={() => {
                              if (onEditProject) onEditProject();
                              else if (projectId) navigate(buildProjectSettingsPath(projectId));
                            }}
                          />
                          <SubTabButton
                            label="Project chat"
                            icon={MessageSquare}
                            onClick={() => projectId && navigate(buildProjectChatPath(projectId))}
                          />
                          <SubTabButton
                            label="Review portal"
                            icon={ExternalLink}
                            onClick={() => {
                              if (reviewDisabled) return;
                              if (onOpenReviewPortal) onOpenReviewPortal();
                              else if (clientUrl)
                                window.open(clientUrl, "_blank", "noopener,noreferrer");
                            }}
                          />
                          <SubTabButton
                            label="Preview only"
                            icon={Maximize2}
                            onClick={() => {
                              if (previewDisabled) return;
                              if (onOpenPreviewOnly) onOpenPreviewOnly();
                              else if (previewOnlyUrl)
                                window.open(previewOnlyUrl, "_blank", "noopener,noreferrer");
                            }}
                          />
                          <SubTabButton
                            label="Team Activity"
                            icon={Activity}
                            active={overlayKey === "collaboration"}
                            onClick={() => onNavigateCollaboration?.()}
                          />
                          <SubTabButton
                            label={QA_ANALYTICS_SECTION.label}
                            icon={BarChart3}
                            active={overlayKey === "qa-analytics"}
                            onClick={() => {
                              if (onNavigateQaAnalytics) onNavigateQaAnalytics();
                              else if (projectId)
                                navigate(workspacePath(projectId, QA_ANALYTICS_SECTION.id));
                            }}
                          />
                          {showAdmin ? (
                            <SubTabButton
                              label={AGENT_ANALYTICS_SECTION.label}
                              icon={Bot}
                              active={overlayKey === "agent-analytics"}
                              badge={agentAnalyticsActiveCount}
                              onClick={() => onNavigateAgentAnalytics?.()}
                            />
                          ) : null}
                        </>
                      ) : (
                        service.pages.map((page) => {
                          const active = serviceActive && pageId === page.id;
                          return (
                            <div key={page.id}>
                              <SubTabButton
                                label={page.label}
                                active={active}
                                onClick={() => onNavigateServicePage?.(service.id, page.id)}
                              />
                              {showPersonas && page.id === "profiles" && active ? (
                                <div className="ml-1 mt-0.5 space-y-0.5 border-l border-sidebar-border/70 pl-2">
                                  {PERSONA_TABS.map(({ id, label }) => {
                                    const personaActive = activeProfile === id;
                                    return (
                                      <button
                                        key={id}
                                        type="button"
                                        aria-current={personaActive ? "page" : undefined}
                                        onClick={() => onNavigateProfile?.(id)}
                                        className={cn(
                                          "flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13.5px] font-medium transition-colors duration-100",
                                          personaActive
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
                                        )}
                                      >
                                        <CompletenessRing
                                          value={personaCompleteness(clientDetails?.personas, id)}
                                          size={14}
                                        />
                                        <span className="min-w-0 flex-1 truncate">{label}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {showAdmin ? (
            <>
              <Rule />
              <SectionLabel label="Admin" />
              <div className="mb-2 mt-1 space-y-0.5 px-3">
                <AccordionHeader
                  icon={Shield}
                  label="Admin"
                  expanded={adminExpanded}
                  accent={overlayKey === "all-reports" || Boolean(activeAdminHref)}
                  onToggle={() => {
                    setAdminExpanded((v) => {
                      const next = !v;
                      if (next) {
                        setExpanded(new Set());
                      }
                      return next;
                    });
                  }}
                />
                {adminExpanded ? (
                  <div className="mb-0.5 ml-4 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-4">
                    {ADMIN_CONSOLE_LINKS.map((link) => {
                      const Icon = LINK_ICONS[link.href] || Zap;
                      const isAllReports = link.workspaceSection === ALL_PROJECT_REPORTS_SECTION.id;
                      const adminActive =
                        (isAllReports && overlayKey === "all-reports") ||
                        (activeAdminHref && link.href === activeAdminHref);
                      return (
                        <SubTabButton
                          key={link.href}
                          label={link.label}
                          icon={Icon}
                          active={adminActive}
                          onClick={() => {
                            if (isAllReports && onNavigateAllReports) {
                              onNavigateAllReports();
                              return;
                            }
                            if (link.workspaceSection && projectId) {
                              navigate(workspacePath(projectId, link.workspaceSection));
                              return;
                            }
                            navigate(link.href);
                          }}
                        />
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </div>

        <ProfileFooter />
      </div>
    </aside>
  );
}
