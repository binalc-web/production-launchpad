import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronRight,
  ClipboardCheck,
  KeyRound,
  Cloud,
  LayoutGrid,
  Server,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReleaseManagement from "./ReleaseManagement";
import { WebAppPreviewTabContent } from "./WebAppPreviewTabContent";
import { ProjectClientFeedbackPanel } from "@/pages/ClientFeedbacks/ProjectClientFeedbackPanel";
import { ProjectQaSectionTabs } from "./ProjectQaSectionTabs";
import { BackendCodeTabContent } from "./BackendCodeTabContent";
import { CloudInfraTabContent } from "./CloudInfraTabContent";
import { EnvironmentTabContent } from "./EnvironmentTabContent";

function buildFeedbackProjectSummary(project, projectName) {
  const jc = project?.jiraConnection;
  if (!jc && !projectName) return null;
  let jiraSiteHost = "";
  if (jc?.jiraBaseUrl) {
    try {
      jiraSiteHost = new URL(jc.jiraBaseUrl).host;
    } catch {
      jiraSiteHost = String(jc.jiraBaseUrl);
    }
  }
  return {
    projectName,
    jiraProjectKey: jc?.jiraProjectKey ?? null,
    jiraProjectDisplayName: null,
    jiraConnectionId: jc?.id ?? null,
    jiraConnectionLabel: jc?.atlassianAccountEmail ?? null,
    jiraSiteHost: jiraSiteHost || null,
  };
}

function SubTabBar({ parentLabel, parentIcon: ParentIcon, children, className }) {
  return (
    <div className={cn("mb-6 space-y-2", className)}>
      <div className="flex items-center gap-1.5 px-0.5 text-[11px] text-muted-foreground">
        <ParentIcon className="size-3 shrink-0 text-primary/70" aria-hidden />
        <span className="font-medium text-muted-foreground/80">{parentLabel}</span>
        <ChevronRight className="size-3 shrink-0 opacity-30" aria-hidden />
        <span className="uppercase tracking-wide opacity-60">Sections</span>
      </div>
      <div className="overflow-x-auto scroll-smooth pl-1">{children}</div>
    </div>
  );
}

function TabPanel({ children, className }) {
  return (
    <div className={cn("min-w-0 outline-none focus-visible:ring-0", className)}>{children}</div>
  );
}

export function ProjectDetailsTabs({
  project,
  projectName,
  clientUrl,
  releaseManagementRef,
  onProjectUpdated,
  canManageReleases,
  hasDeveloperRepo,
  addCursorRulesDisabledHint,
}) {
  const feedbackSummary = buildFeedbackProjectSummary(project, projectName);

  return (
    <section aria-label="Project workspace" className="min-w-0">
      <Tabs defaultValue="product-experience" className="gap-0">
        <div className="overflow-x-auto scroll-smooth">
          <TabsList variant="segmented" aria-label="Primary project sections" className="min-w-max">
            <TabsTrigger value="product-experience">
              <LayoutGrid className="size-4 shrink-0" aria-hidden />
              Product Experience
            </TabsTrigger>
            <TabsTrigger value="backend-platform">
              <Server className="size-4 shrink-0" aria-hidden />
              Backend Platform
            </TabsTrigger>
            <TabsTrigger value="quality">
              <ShieldCheck className="size-4 shrink-0" aria-hidden />
              Quality
            </TabsTrigger>
            <TabsTrigger value="environment">
              <KeyRound className="size-4 shrink-0" aria-hidden />
              Environment
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="product-experience"
          forceMount
          className="mt-6 data-[state=inactive]:hidden"
        >
          <Tabs defaultValue="product-management" className="gap-0">
            <SubTabBar parentLabel="Product Experience" parentIcon={LayoutGrid}>
              <TabsList
                variant="segmented-sub"
                aria-label="Product experience sections"
                className="min-w-max"
              >
                <TabsTrigger value="product-management">Product Management</TabsTrigger>
                <TabsTrigger value="web-app">Web App</TabsTrigger>
              </TabsList>
            </SubTabBar>

            <TabsContent value="product-management" className="mt-0">
              <TabPanel>
                <ReleaseManagement
                  ref={releaseManagementRef}
                  embedded
                  projectId={project.id}
                  projectName={projectName}
                  project={project}
                />
              </TabPanel>
            </TabsContent>

            <TabsContent value="web-app" className="mt-0">
              <TabPanel>
                <WebAppPreviewTabContent projectId={project?.id} clientUrl={clientUrl} />
              </TabPanel>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="backend-platform" className="mt-6">
          <Tabs defaultValue="backend-code" className="gap-0">
            <SubTabBar parentLabel="Backend Platform" parentIcon={Server}>
              <TabsList
                variant="segmented-sub"
                aria-label="Backend platform sections"
                className="min-w-max"
              >
                <TabsTrigger value="backend-code">Chat</TabsTrigger>
                <TabsTrigger value="cloud-infra">Cloud Infra</TabsTrigger>
              </TabsList>
            </SubTabBar>

            <TabsContent value="backend-code" className="mt-0">
              <TabPanel>
                <BackendCodeTabContent
                  project={project}
                  onProjectUpdated={onProjectUpdated}
                  canManageReleases={canManageReleases}
                  hasDeveloperRepo={hasDeveloperRepo}
                  addCursorRulesDisabledHint={addCursorRulesDisabledHint}
                />
              </TabPanel>
            </TabsContent>

            <TabsContent value="cloud-infra" className="mt-0">
              <TabPanel>
                <CloudInfraTabContent
                  project={project}
                  onProjectUpdated={onProjectUpdated}
                  hasDeveloperRepo={hasDeveloperRepo}
                  canManageReleases={canManageReleases}
                  addCursorRulesDisabledHint={addCursorRulesDisabledHint}
                />
              </TabPanel>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="quality" className="mt-6">
          <Tabs defaultValue="client-feedback" className="gap-0">
            <SubTabBar parentLabel="Quality" parentIcon={ShieldCheck}>
              <TabsList variant="segmented-sub" aria-label="Quality sections" className="min-w-max">
                <TabsTrigger value="client-feedback">Client Feedback</TabsTrigger>
                <TabsTrigger value="qa-reports">Failed Playwright runs</TabsTrigger>
                <TabsTrigger value="export-test-cases">Export Test Cases</TabsTrigger>
              </TabsList>
            </SubTabBar>

            <TabsContent value="client-feedback" className="mt-0">
              <TabPanel>
                <ProjectClientFeedbackPanel
                  embedded
                  projectId={project.id}
                  projectName={projectName}
                  projectSummary={feedbackSummary}
                />
              </TabPanel>
            </TabsContent>

            <TabsContent value="qa-reports" className="mt-0">
              <TabPanel>
                <ProjectQaSectionTabs embedded activeTab="reports" projectId={project.id} />
              </TabPanel>
            </TabsContent>

            <TabsContent value="export-test-cases" className="mt-0">
              <TabPanel>
                <ProjectQaSectionTabs embedded activeTab="export" projectId={project.id} />
              </TabPanel>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="environment" className="mt-6">
          <TabPanel>
            <EnvironmentTabContent
              project={project}
              hasDeveloperRepo={hasDeveloperRepo}
              onProjectUpdated={onProjectUpdated}
            />
          </TabPanel>
        </TabsContent>
      </Tabs>
    </section>
  );
}
