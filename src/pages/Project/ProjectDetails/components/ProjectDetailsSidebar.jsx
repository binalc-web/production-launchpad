import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { DiscoverySubmenu } from "@/pages/Project/ProductManagement/components/DiscoverySubmenu";
import { BacklogSubmenu } from "@/pages/Project/ProductManagement/components/BacklogSubmenu";
import { CloudInfraSubmenu } from "@/pages/Project/ProductManagement/components/CloudInfraSubmenu";
import { WebAppSubmenu } from "@/pages/Project/ProductManagement/components/WebAppSubmenu";
import { BackendSubmenu } from "@/pages/Project/ProductManagement/components/BackendSubmenu";
import { ReleaseSubmenu } from "@/pages/Project/ProductManagement/components/ReleaseSubmenu";
import {
  normalizeBacklogArea,
  normalizeBackendArea,
  normalizeCloudInfraArea,
  normalizeDiscoveryArea,
  normalizeReleaseArea,
  normalizeWebAppArea,
} from "@/pages/Project/ProductManagement/constants";
import { isLegacyPromptSkillsSection, PROJECT_SECTIONS } from "../constants/projectSections";
import { AGENT_ANALYTICS_SECTION } from "../constants/projectAgentAnalyticsSection";
import { isProjectJiraBacklogReady } from "@/lib/jiraBacklogReady";
import { useAuth } from "@/context/AuthContext";
import { isLaunchpadAdmin } from "@/utils/launchpadRole";
import { useProjectAgentAnalyticsContext } from "../context/ProjectAgentAnalyticsContext";

const GROUP_LABELS = {
  product: "Product",
  platform: "Platform",
  quality: "Quality",
};

export function ProjectDetailsSidebar({ activeSection, onSectionChange, project, className }) {
  const { user } = useAuth();
  const isAdmin = isLaunchpadAdmin(user?.role);
  const analytics = useProjectAgentAnalyticsContext();
  const [searchParams] = useSearchParams();
  const rawSection = searchParams.get("section");
  const activeArea = normalizeDiscoveryArea(searchParams.get("area"));
  const activeBacklogArea = normalizeBacklogArea(searchParams.get("area"), {
    jiraReady: isProjectJiraBacklogReady(project),
  });
  const activeReleaseArea = normalizeReleaseArea(searchParams.get("area"));
  const activeCloudInfraArea = normalizeCloudInfraArea(searchParams.get("area"));
  const activeWebAppArea = normalizeWebAppArea(
    isLegacyPromptSkillsSection(rawSection) ? "agent-config" : searchParams.get("area"),
  );
  const activeBackendArea = normalizeBackendArea(searchParams.get("area"));
  const activeProfile = searchParams.get("profile") || "company";
  const groups = ["product", "platform", "quality"];

  return (
    <nav aria-label="Project sections" className={cn("flex flex-col gap-4 min-w-0", className)}>
      {groups.map((group) => {
        const items = PROJECT_SECTIONS.filter((s) => s.group === group);
        if (items.length === 0) return null;
        const adminItems = isAdmin && group === "quality" ? [AGENT_ANALYTICS_SECTION] : [];
        const allItems = [...items, ...adminItems];
        return (
          <div key={group} className="space-y-1">
            <p className="px-3 text-xs font-medium text-muted-foreground">{GROUP_LABELS[group]}</p>
            <ul className="space-y-0.5">
              {allItems.map(({ id, label, icon: Icon }) => {
                const active = activeSection === id;
                const activeAgentCount =
                  id === AGENT_ANALYTICS_SECTION.id ? (analytics?.activeCount ?? 0) : 0;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => onSectionChange(id)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
                        active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/60",
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      <span className="truncate">{label}</span>
                      {activeAgentCount > 0 ? (
                        <span className="ml-auto shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold tabular-nums text-primary-foreground">
                          {activeAgentCount}
                        </span>
                      ) : null}
                    </button>
                    {id === "discovery" && active ? (
                      <DiscoverySubmenu activeArea={activeArea} activeProfile={activeProfile} />
                    ) : null}
                    {id === "backlog" && active ? (
                      <BacklogSubmenu
                        activeArea={activeBacklogArea}
                        jiraReady={isProjectJiraBacklogReady(project)}
                      />
                    ) : null}
                    {id === "releases" && active ? (
                      <ReleaseSubmenu activeArea={activeReleaseArea} />
                    ) : null}
                    {id === "cloud-infra" && active ? (
                      <CloudInfraSubmenu activeArea={activeCloudInfraArea} />
                    ) : null}
                    {id === "web-app" && active ? (
                      <WebAppSubmenu activeArea={activeWebAppArea} />
                    ) : null}
                    {id === "backend" && active ? (
                      <BackendSubmenu activeArea={activeBackendArea} />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
