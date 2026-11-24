import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { PlatformDeployBanner } from "@/components/common/PlatformDeployBanner";
import { PlatformConsoleChrome } from "@/layouts/PlatformConsoleChrome";

function MainContent({ isOnboardingRoute, isProjectDetailsRoute, usePlatformChrome }) {
  return (
    <div
      className={
        isOnboardingRoute
          ? "relative flex min-h-0 flex-1 flex-col rounded-xl bg-card p-0"
          : isProjectDetailsRoute || usePlatformChrome
            ? "relative flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/40"
            : "relative flex min-h-0 flex-1 flex-col rounded-xl bg-card p-4 md:p-5"
      }
    >
      <div
        className={
          isProjectDetailsRoute || usePlatformChrome
            ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
            : "min-h-0 min-w-0 flex-1"
        }
      >
        <PlatformDeployBanner />
        {usePlatformChrome ? (
          <PlatformConsoleChrome>
            <Outlet />
          </PlatformConsoleChrome>
        ) : (
          <Outlet />
        )}
      </div>
    </div>
  );
}

export const MainLayout = () => {
  const { pathname } = useLocation();
  const isOnboardingRoute = pathname.startsWith("/projects/onboarding");
  const isProjectsHome = pathname === "/projects" || pathname === "/projects/";
  const isAiHome = pathname === "/chat" || pathname.startsWith("/chat/");
  /** Full console workspace (sidebar + top bar via ProjectJourneyShell). */
  const isProjectWorkspace = /^\/projects\/details\/[^/]+\/?$/.test(pathname);
  const usePlatformChrome =
    !isOnboardingRoute && !isProjectsHome && !isProjectWorkspace && !isAiHome;
  const fullHeightConsoleShell = isAiHome || isProjectWorkspace || usePlatformChrome;

  return (
    <main
      className={
        fullHeightConsoleShell
          ? "flex h-svh min-h-0 w-full flex-1 flex-col overflow-hidden bg-muted/40"
          : "flex min-h-screen w-full flex-1 flex-col overflow-hidden bg-muted/40"
      }
    >
      <div
        className={
          isProjectWorkspace || usePlatformChrome || isAiHome
            ? "flex min-h-0 flex-1 flex-col overflow-hidden"
            : "flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-3 pt-2 md:px-4 md:pb-4 md:pt-3"
        }
      >
        <MainContent
          isOnboardingRoute={isOnboardingRoute}
          isProjectDetailsRoute={isProjectWorkspace || isAiHome}
          usePlatformChrome={usePlatformChrome}
        />
      </div>
    </main>
  );
};
