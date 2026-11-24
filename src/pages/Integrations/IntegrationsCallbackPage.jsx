import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { INTEGRATION_PROVIDERS } from "@/constants/integrationProviders";
import {
  completeIntegrationOAuth,
  fetchJiraOAuthPendingSites,
  finishJiraOAuthSiteSelection,
} from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import jiraMarkSvg from "@/assets/apps/Jira.svg";

const PROVIDER_LABEL_BY_NAME = Object.freeze({
  [INTEGRATION_PROVIDERS.GITHUB.name]: INTEGRATION_PROVIDERS.GITHUB.label,
  [INTEGRATION_PROVIDERS.BITBUCKET.name]: INTEGRATION_PROVIDERS.BITBUCKET.label,
  [INTEGRATION_PROVIDERS.JIRA.name]: INTEGRATION_PROVIDERS.JIRA.label,
  [INTEGRATION_PROVIDERS.FIGMA.name]: INTEGRATION_PROVIDERS.FIGMA.label,
});

/** Same rules as backend sanitizeOAuthReturnPath — internal SPA paths only. */
function safeOAuthReturnTo(raw) {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim();
  if (!s.startsWith("/") || s.startsWith("//")) return null;
  if (/[\r\n\0]/.test(s)) return null;
  if (s.includes("://") || s.includes("\\") || s.includes("@")) return null;
  if (s.length > 512) return null;
  const q = s.indexOf("?");
  if (q === -1) return s;
  const path = s.slice(0, q);
  const query = s.slice(q + 1);
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  if (query.length > 256) return null;
  if (query && !/^[a-zA-Z0-9_=&.,%-]+$/.test(query)) return null;
  return s;
}

const OAUTH_CALLBACK_ERROR_MESSAGES = {
  oauth_failed: "Something went wrong finishing the connection. Try again from Connected accounts.",
  missing_code_or_state:
    "The sign-in flow was interrupted. Try connecting again from Connected accounts.",
  invalid_state:
    "This sign-in link expired or is invalid. Try connecting again from Connected accounts.",
  access_denied: "Access was not granted. You can try again from Connected accounts.",
  jira_sites_already_connected: "All available Jira sites are already connected to LaunchPad.",
  oauth_state_user_mismatch:
    "This connection was started from a different LaunchPad account. Start it again from Connected accounts.",
};

function integrationCallbackErrorUserMessage(raw) {
  const key = decodeURIComponent(String(raw || "").trim()).toLowerCase();
  if (OAUTH_CALLBACK_ERROR_MESSAGES[key]) return OAUTH_CALLBACK_ERROR_MESSAGES[key];
  if (/^[a-z0-9_.-]+$/i.test(key) && key.length <= 80) {
    const human = key.replace(/_/g, " ");
    return `Could not complete connection (${human}). Try again from Connected accounts.`;
  }
  return "Could not complete the connection. Try again from Connected accounts.";
}

function jiraSiteHostname(site) {
  const raw = String(site?.jiraBaseUrl || "").trim();
  if (!raw) return "";
  try {
    return new URL(raw.startsWith("http") ? raw : `https://${raw}`).hostname;
  } catch {
    return raw.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  }
}

function jiraSiteOptionLabel(site) {
  const hostname = jiraSiteHostname(site);
  const name = String(site?.name || "").trim();
  if (name && hostname && name.toLowerCase() !== hostname.toLowerCase()) {
    return `${name} (${hostname})`;
  }
  return hostname || name || "Jira site";
}

function JiraSitePicker({ pendingToken, returnTo, onCancel }) {
  const navigate = useNavigate();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCloudId, setSelectedCloudId] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rows = await fetchJiraOAuthPendingSites(pendingToken);
        if (cancelled) return;
        setSites(rows);
        if (rows.length === 1) {
          setSelectedCloudId(String(rows[0].atlassianCloudId || ""));
        }
      } catch (e) {
        if (!cancelled) {
          toast.error(e?.response?.data?.error || e?.message || "Could not load Jira sites");
          onCancel();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pendingToken, onCancel]);

  const siteOptions = useMemo(
    () =>
      sites.map((site) => ({
        cloudId: String(site.atlassianCloudId || ""),
        label: jiraSiteOptionLabel(site),
      })),
    [sites],
  );

  const finish = useCallback(async () => {
    if (!selectedCloudId) {
      toast.error("Select the site you want to connect.");
      return;
    }
    setSubmitting(true);
    try {
      await finishJiraOAuthSiteSelection(pendingToken, selectedCloudId);
      toast.success("Jira connected");
      navigate(returnTo || "/settings/integrations", { replace: true });
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || "Could not connect Jira site");
    } finally {
      setSubmitting(false);
    }
  }, [navigate, pendingToken, returnTo, selectedCloudId]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md border-0 bg-transparent shadow-none">
        <CardHeader className="space-y-4 text-center">
          <img
            src={jiraMarkSvg}
            alt=""
            aria-hidden
            draggable={false}
            className="mx-auto size-14 object-contain"
          />
          <div className="space-y-2">
            <CardTitle className="text-xl">Choose Jira site</CardTitle>
            <CardDescription>Select the site you want to connect to LaunchPad.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div
              className="w-full space-y-2"
              role="status"
              aria-busy="true"
              aria-label="Loading sites"
            >
              <Skeleton className="h-4 w-20 rounded-sm" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          ) : siteOptions.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              No new Jira sites are available to connect.
            </p>
          ) : (
            <div className="w-full space-y-2">
              <Label htmlFor="jira-site-select">Jira site</Label>
              <Select value={selectedCloudId || undefined} onValueChange={setSelectedCloudId}>
                <SelectTrigger id="jira-site-select" className="w-full bg-white">
                  <SelectValue placeholder="Choose a site" />
                </SelectTrigger>
                <SelectContent>
                  {siteOptions.map((site) => (
                    <SelectItem key={site.cloudId} value={site.cloudId}>
                      {site.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={submitting} onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={loading || submitting || !selectedCloudId}
              onClick={finish}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect site"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function IntegrationsCallbackSkeleton() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background px-4 py-10"
      role="status"
      aria-busy="true"
      aria-label="Finishing connection"
    >
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <Skeleton className="size-14 rounded-xl" />
        <Skeleton className="h-6 w-48 rounded-md" />
        <Skeleton className="h-4 w-64 rounded-md" />
      </div>
    </div>
  );
}

/**
 * OAuth return URL (GitHub / Bitbucket / Jira / Figma). Backend redirects here with
 * ?provider=&code=&state= (finished here as the signed-in user) or ?error=.
 */
const IntegrationsCallbackPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [jiraPendingToken, setJiraPendingToken] = useState("");
  const completeStartedRef = useRef(false);
  const pickSite = params.get("pick_site") === "1" || Boolean(jiraPendingToken);
  const pendingToken = jiraPendingToken || params.get("pending") || "";
  const returnTo = safeOAuthReturnTo(params.get("return_to"));
  const code = params.get("code") || "";
  const state = params.get("state") || "";

  const goBack = useCallback(() => {
    navigate(returnTo || "/settings/integrations", { replace: true });
  }, [navigate, returnTo]);

  useEffect(() => {
    if (loading || !user || !code || !state || completeStartedRef.current) return;
    completeStartedRef.current = true;
    const provider = params.get("provider") || "";
    const label = PROVIDER_LABEL_BY_NAME[provider] || "Integration";
    (async () => {
      try {
        const result = await completeIntegrationOAuth(provider, code, state);
        if (result?.pendingToken) {
          setJiraPendingToken(result.pendingToken);
          return;
        }
        toast.success(`${label} connected`);
        navigate(safeOAuthReturnTo(result?.returnPath) || returnTo || "/settings/integrations", {
          replace: true,
        });
      } catch (e) {
        const errCode = e?.response?.data?.code || "oauth_failed";
        toast.error(`${label}: ${integrationCallbackErrorUserMessage(errCode)}`);
        navigate(returnTo || "/settings/integrations", { replace: true });
      }
    })();
  }, [loading, user, code, state, params, navigate, returnTo]);

  useEffect(() => {
    if (loading || pickSite) return;
    if (user && code && state) return;

    const err = params.get("error");
    const provider = params.get("provider") || "integration";
    const ok = params.get("ok");
    const label = PROVIDER_LABEL_BY_NAME[provider] || "Integration";
    if (err) {
      toast.error(`${label}: ${integrationCallbackErrorUserMessage(err)}`);
    } else if (ok === "1") {
      toast.success(`${label} connected`);
    }

    if (!user) {
      toast.error(
        `Session not found — log in again, then retry connecting ${INTEGRATION_PROVIDERS.GITHUB.label}, ${INTEGRATION_PROVIDERS.BITBUCKET.label}, ${INTEGRATION_PROVIDERS.JIRA.label}, or ${INTEGRATION_PROVIDERS.FIGMA.label}.`,
      );
      navigate("/login", { replace: true });
      return;
    }
    navigate(returnTo || "/settings/integrations", { replace: true });
  }, [params, navigate, user, loading, pickSite, returnTo, code, state]);

  if (loading) {
    return <IntegrationsCallbackSkeleton />;
  }

  if (!user) {
    return null;
  }

  if (pickSite && pendingToken) {
    return <JiraSitePicker pendingToken={pendingToken} returnTo={returnTo} onCancel={goBack} />;
  }

  return <IntegrationsCallbackSkeleton />;
};

export default IntegrationsCallbackPage;
