import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { exchangeHubAuthCode } from "@/api";
import config from "@/config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import {
  AUTH_CARD_COMPACT_CLASS,
  AUTH_CARD_WIDE_CLASS,
  AUTH_PAGE_SHELL_CLASS,
} from "./authPageStyles";
import DesktopConnectConsent from "./DesktopConnectConsent";
import { completeDesktopConnect } from "./desktopConnect";
import {
  consentDescription,
  desktopClientFor,
  takePendingDesktopState,
} from "./desktopConnectClients.util";

/** loading | desktop_ok | error */
export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { checkAuth, user } = useAuth();
  const checkAuthRef = useRef(checkAuth);
  checkAuthRef.current = checkAuth;
  const [phase, setPhase] = useState("loading");
  const [error, setError] = useState("");
  const [desktopReturnLabel, setDesktopReturnLabel] = useState("the app");
  // FigCraft only: the device login waiting for the person's approval.
  const [pendingDesktop, setPendingDesktop] = useState(null);
  const [connectingDesktop, setConnectingDesktop] = useState(false);
  const [consentError, setConsentError] = useState("");

  useEffect(() => {
    const oauthErr = searchParams.get("error");
    const code = searchParams.get("code");

    if (oauthErr) {
      setPhase("error");
      setError(searchParams.get("error_description")?.replace(/\+/g, " ") || oauthErr);
      return;
    }
    if (!code) {
      setPhase("error");
      setError("Missing sign-in code.");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { token } = await exchangeHubAuthCode(code, config.HUB_OAUTH_REDIRECT_URL);
        if (cancelled) return;

        await checkAuthRef.current();
        if (cancelled) return;

        const pending = takePendingDesktopState();
        if (pending) {
          const client = desktopClientFor(pending.client);
          setDesktopReturnLabel(client.label);
          if (client.id === "figcraft") {
            // FigCraft asks first: the link's `state` is in the URL, so anyone can craft it.
            setPendingDesktop({ client: client.id, state: pending.state, token });
            setPhase("desktop_confirm");
          } else {
            // Figma and QA Automation connect on their own after Google sign-in.
            const refreshToken = localStorage.getItem("cognito_refresh_token");
            const r = await completeDesktopConnect(client.id, pending.state, token, refreshToken);
            if (cancelled) return;
            if (r.error) {
              setPhase("error");
              setError(r.error);
              return;
            }
            setPhase("desktop_ok");
          }
          return;
        }
        navigate("/projects", { replace: true });
      } catch (e) {
        if (cancelled) return;
        const d = e?.response?.data;
        const msg =
          (typeof d?.message === "string" && d.message) ||
          (typeof d?.error === "string" && d.error) ||
          (typeof e?.message === "string" && e.message) ||
          "Sign-in failed";
        setPhase("error");
        setError(msg);
      }
    })();

    return () => {
      cancelled = true;
    };
    // checkAuth via ref — must not re-run when AuthProvider re-renders after setUser
  }, [searchParams, navigate]);

  const handleApproveDesktopConnect = async () => {
    if (!pendingDesktop) return;
    const { client, state, token } = pendingDesktop;
    setConnectingDesktop(true);
    setConsentError("");
    const refreshToken = localStorage.getItem("cognito_refresh_token");
    try {
      const r = await completeDesktopConnect(client, state, token, refreshToken);
      if (r.error) {
        setConsentError(r.error);
        return;
      }
      setPendingDesktop(null);
      setPhase("desktop_ok");
    } catch {
      setConsentError(`Failed to connect to ${desktopReturnLabel}.`);
    } finally {
      setConnectingDesktop(false);
    }
  };

  const handleCancelDesktopConnect = () => {
    setPendingDesktop(null);
    navigate("/projects", { replace: true });
  };

  if (phase === "desktop_confirm") {
    return (
      <DesktopConnectConsent
        clientLabel={desktopReturnLabel}
        accountEmail={user?.email}
        description={consentDescription(pendingDesktop?.client, user?.email)}
        error={consentError}
        submitting={connectingDesktop}
        onApprove={handleApproveDesktopConnect}
        onCancel={handleCancelDesktopConnect}
      />
    );
  }

  if (phase === "desktop_ok") {
    return (
      <div className={AUTH_PAGE_SHELL_CLASS}>
        <Card className={AUTH_CARD_COMPACT_CLASS}>
          <CardHeader className="text-center space-y-1">
            <CardTitle className="text-xl text-green-600">Authentication complete</CardTitle>
            <CardDescription>
              You can close this window and return to {desktopReturnLabel}.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className={AUTH_PAGE_SHELL_CLASS}>
        <Card className={AUTH_CARD_WIDE_CLASS}>
          <CardHeader>
            <CardTitle className="text-xl text-destructive">Sign-in failed</CardTitle>
            <CardDescription>Something went wrong.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <button
              type="button"
              className="text-sm text-primary underline"
              onClick={() => navigate("/login", { replace: true })}
            >
              Back to login
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={AUTH_PAGE_SHELL_CLASS}>
      <Card className={AUTH_CARD_COMPACT_CLASS}>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Loader2 className="size-10 animate-spin text-primary" />
          </div>
          <CardTitle className="text-xl">Signing you in</CardTitle>
          <CardDescription>One moment…</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
