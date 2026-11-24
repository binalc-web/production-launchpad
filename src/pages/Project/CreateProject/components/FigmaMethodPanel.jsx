import React, { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FigmaPatSetupGuide } from "@/components/integrations/FigmaPatSetupGuide";
import { fetchIntegrationsStatus, getFigmaOAuthAuthorizeUrl, saveFigmaIntegrationPat } from "@/api";
import { integrationToastFromAxios } from "@/utils/integrationErrors";
import {
  FIGMA_PLUGIN_DOWNLOAD_URL,
  FIGMA_PLUGIN_GUIDE_URL,
} from "@/pages/Project/CreateProject/constants/constants";

/** Vertical step marker with optional connector line to the next step. */
function FigmaSetupStep({ stepNumber, showConnector = false, children }) {
  return (
    <li className="relative flex items-start gap-4">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
        {stepNumber}
      </span>
      {showConnector ? (
        <span className="absolute left-5 top-10 h-full min-h-12 w-0.5 bg-border" aria-hidden />
      ) : null}
      <div className="min-w-0 flex-1 space-y-2 pb-2">{children}</div>
    </li>
  );
}

export const FigmaMethodPanel = () => {
  const location = useLocation();
  const [figmaPatInput, setFigmaPatInput] = useState("");
  const [figmaConnected, setFigmaConnected] = useState(false);
  const [busy, setBusy] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const loadFigmaStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const data = await fetchIntegrationsStatus({ checkHealth: false });
      const connections = data?.figma?.connections ?? [];
      setFigmaConnected(connections.length > 0);
    } catch {
      setFigmaConnected(false);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFigmaStatus();
  }, [loadFigmaStatus]);

  const connectFigmaOAuth = async () => {
    setBusy("oauth");
    try {
      const returnTo = `${location.pathname}${location.search}`;
      window.location.href = await getFigmaOAuthAuthorizeUrl(undefined, { returnTo });
    } catch (e) {
      toast.error(e.message || "Could not start Figma sign-in");
      setBusy(null);
    }
  };

  const saveFigmaPat = async () => {
    const trimmed = figmaPatInput.trim();
    if (!trimmed) {
      toast.error("Paste your Figma token first");
      return;
    }
    setBusy("pat");
    try {
      await saveFigmaIntegrationPat(trimmed);
      setFigmaPatInput("");
      toast.success("Figma connected");
      await loadFigmaStatus();
    } catch (e) {
      toast.error(integrationToastFromAxios(e, "Could not save token"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-xl border bg-muted/20 p-5 md:p-6">
      <h3 className="text-base font-semibold text-foreground">Figma setup</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Connect Figma for API access, then install the plugin to send designs into LaunchPad.
      </p>

      <ol className="mt-6 space-y-6">
        <FigmaSetupStep stepNumber={1} showConnector>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground">Connect Figma for API access</p>
            {statusLoading ? (
              <Skeleton
                className="h-5 w-20 rounded-full"
                role="status"
                aria-busy="true"
                aria-label="Loading Figma connection status"
              />
            ) : figmaConnected ? (
              <Badge variant="secondary">Connected</Badge>
            ) : (
              <Badge variant="outline">Not connected</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            LaunchPad reads your Figma files through the REST API. This is separate from signing
            into the plugin later.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" size="sm" asChild>
              <Link to="/settings/integrations">Open Connected accounts</Link>
            </Button>
          </div>
          <FigmaPatSetupGuide
            className="mt-3"
            inputId="figma-onboarding-pat-input"
            patValue={figmaPatInput}
            onPatChange={(e) => setFigmaPatInput(e.target.value)}
            onSavePat={saveFigmaPat}
            saveBusy={busy === "pat"}
            saveDisabled={Boolean(busy)}
            showOAuthHint={false}
            compact
          />
        </FigmaSetupStep>

        <FigmaSetupStep stepNumber={2} showConnector>
          <p className="text-sm font-medium text-foreground">Download the LaunchPad plugin</p>
          <Button type="button" variant="outline" className="gap-2" asChild>
            <a
              href={FIGMA_PLUGIN_DOWNLOAD_URL}
              target="_blank"
              rel="noreferrer"
              download="LaunchPad.zip"
            >
              <Download className="h-4 w-4" aria-hidden />
              Download plugin
            </a>
          </Button>
        </FigmaSetupStep>

        <FigmaSetupStep stepNumber={3}>
          <p className="text-sm font-medium text-foreground">Install the plugin in Figma Desktop</p>
          <p className="text-sm text-muted-foreground">
            Follow the setup guide to import the plugin, sign in, and send your design to LaunchPad.
          </p>
          <Button type="button" variant="outline" className="gap-2" asChild>
            <a href={FIGMA_PLUGIN_GUIDE_URL} target="_blank" rel="noreferrer">
              Open setup guide
            </a>
          </Button>
        </FigmaSetupStep>
      </ol>
    </div>
  );
};
