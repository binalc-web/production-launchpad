import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import config from "@/config";
import { isTokenExpired } from "@/utils/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { LaunchpadLogo } from "@/components/common/LaunchpadLogo";
import { AUTH_CARD_CLASS, AUTH_PAGE_SHELL_CLASS } from "./authPageStyles";
import DesktopConnectConsent from "./DesktopConnectConsent";
import { completeDesktopConnect } from "./desktopConnect";
import {
  consentDescription,
  desktopClientFor,
  readDesktopOAuthFromSearch,
  shouldReturnSignedInUserHome,
  stashPendingDesktopState,
} from "./desktopConnectClients.util";

const HUB_API_URL = config.HUB_API_URL;

const LoginPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Read URL params synchronously so a logged-in user is not redirected away before
  // the "Connect" screen can render (?state=&client=qa-automation|figma|figcraft).
  const [desktopOAuth, setDesktopOAuth] = useState(() =>
    readDesktopOAuthFromSearch(typeof window === "undefined" ? "" : window.location.search),
  );
  const [desktopDone, setDesktopDone] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(() => {
    if (typeof localStorage === "undefined") return false;
    const token = localStorage.getItem("token");
    return Boolean(token) && !isTokenExpired(token);
  });
  const [connectingDesktop, setConnectingDesktop] = useState(false);
  const autoConnectStartedRef = useRef(false);

  useEffect(() => {
    setDesktopOAuth(readDesktopOAuthFromSearch(window.location.search));
    const token = localStorage.getItem("token");
    setHasActiveSession(Boolean(token) && !isTokenExpired(token));
  }, []);

  useEffect(() => {
    if (shouldReturnSignedInUserHome(user, window.location.search)) {
      navigate("/projects");
    }
  }, [user, navigate]);

  useEffect(() => {
    const { state, client } = desktopOAuth;
    // FigCraft asks first (see handleApproveDesktopConnect); Figma and QA Automation connect on
    // their own once someone is signed in.
    if (
      !state ||
      !client ||
      client === "figcraft" ||
      !hasActiveSession ||
      desktopDone ||
      autoConnectStartedRef.current
    ) {
      return;
    }
    const token = localStorage.getItem("token");
    if (!token || isTokenExpired(token)) {
      setHasActiveSession(false);
      return;
    }
    autoConnectStartedRef.current = true;
    setConnectingDesktop(true);
    setError("");
    const refreshToken = localStorage.getItem("cognito_refresh_token");
    (async () => {
      try {
        const result = await completeDesktopConnect(client, state, token, refreshToken);
        if (result.error) {
          setError(result.error);
          autoConnectStartedRef.current = false;
        } else {
          setDesktopDone(true);
        }
      } catch {
        setError(desktopClientFor(client).failure);
        autoConnectStartedRef.current = false;
      } finally {
        setConnectingDesktop(false);
      }
    })();
  }, [desktopOAuth, hasActiveSession, desktopDone]);

  // FigCraft only: the person clicks Connect on the consent page.
  const handleApproveDesktopConnect = async () => {
    const { state, client } = desktopOAuth;
    if (!state || !client) return;
    const token = localStorage.getItem("token");
    if (!token || isTokenExpired(token)) {
      setHasActiveSession(false);
      return;
    }
    setConnectingDesktop(true);
    setError("");
    const refreshToken = localStorage.getItem("cognito_refresh_token");
    try {
      const result = await completeDesktopConnect(client, state, token, refreshToken);
      if (result.error) {
        setError(result.error);
      } else {
        setDesktopDone(true);
      }
    } catch {
      setError(desktopClientFor(client).failure);
    } finally {
      setConnectingDesktop(false);
    }
  };

  const handleCancelDesktopConnect = () => {
    setDesktopOAuth({ state: null, client: null });
    navigate("/projects", { replace: true });
  };

  const handleGoogleSignIn = async () => {
    const { state, client } = readDesktopOAuthFromSearch(window.location.search);
    stashPendingDesktopState(client, state);

    const redirectUrl = config.HUB_OAUTH_REDIRECT_URL;
    const apiUrl = `${HUB_API_URL}/api/auth/google?redirect_url=${redirectUrl}`;

    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl);
      const json = await res.json();
      const authUrl = json?.data?.url;
      if (!authUrl) {
        setError("Invalid response from sign-in service");
        stashPendingDesktopState(null, null);
        setLoading(false);
        return;
      }
      window.location.assign(authUrl);
    } catch {
      setError("Could not start Google sign-in. Try again.");
      stashPendingDesktopState(null, null);
      setLoading(false);
    }
  };

  const desktopClient = desktopClientFor(desktopOAuth.client);
  const desktopReturnLabel = desktopClient.label;
  const desktopConnectLabel = desktopClient.signInPrompt;

  if (desktopDone) {
    return (
      <div className={AUTH_PAGE_SHELL_CLASS}>
        <Card className={AUTH_CARD_CLASS}>
          <CardHeader className="space-y-1 px-0 text-center">
            <CardTitle className="text-xl text-green-600">Authentication complete</CardTitle>
            <CardDescription>
              You can close this window and return to {desktopReturnLabel}.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (desktopOAuth.state && hasActiveSession) {
    if (desktopOAuth.client === "figcraft") {
      return (
        <DesktopConnectConsent
          clientLabel={desktopReturnLabel}
          accountEmail={user?.email}
          description={consentDescription(desktopClient, user?.email)}
          error={error}
          submitting={connectingDesktop}
          onApprove={handleApproveDesktopConnect}
          onCancel={handleCancelDesktopConnect}
        />
      );
    }
    return (
      <div className={AUTH_PAGE_SHELL_CLASS}>
        <Card className={AUTH_CARD_CLASS}>
          <CardHeader className="space-y-1 px-0 text-center">
            {connectingDesktop ? (
              <>
                <div className="mb-4 flex justify-center">
                  <Loader2 className="size-10 animate-spin text-primary" />
                </div>
                <CardTitle className="text-xl">Connecting {desktopReturnLabel}…</CardTitle>
                <CardDescription>One moment…</CardDescription>
              </>
            ) : error ? (
              <>
                <CardTitle className="text-xl text-destructive">Could not connect</CardTitle>
                <CardDescription>
                  Try closing this tab and sign in again from {desktopReturnLabel}.
                </CardDescription>
              </>
            ) : (
              <>
                <div className="mb-4 flex justify-center">
                  <Loader2 className="size-10 animate-spin text-primary" />
                </div>
                <CardTitle className="text-xl">Connecting {desktopReturnLabel}…</CardTitle>
              </>
            )}
          </CardHeader>
          {error && (
            <CardContent className="px-0 pt-2">
              <Alert variant="destructive" className="rounded-lg">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className={AUTH_PAGE_SHELL_CLASS}>
      <Card className={AUTH_CARD_CLASS}>
        <CardHeader className="px-0 text-center">
          <a
            href="/"
            className="mb-6 flex items-center justify-center gap-2 font-medium text-foreground no-underline hover:opacity-90"
          >
            <LaunchpadLogo alt="launchpad logo" className="w-36" />
          </a>
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>
            {desktopOAuth.state ? desktopConnectLabel : "Continue with your Google account"}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pt-2">
          <div className="flex flex-col gap-4">
            {error && (
              <Alert variant="destructive" className="rounded-lg">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="flex items-center gap-2 w-full"
              variant="outline"
            >
              {loading ? (
                <Loader2 className="size-5 animate-spin shrink-0" />
              ) : (
                <img
                  className="h-4"
                  src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48cGF0aCBkPSJNMTcuNiA5LjJsLS4xLTEuOEg5djMuNGg0LjhDMTMuNiAxMiAxMyAxMyAxMiAxMy42djIuMmgzYTguOCA4LjggMCAwIDAgMi42LTYuNnoiIGZpbGw9IiM0Mjg1RjQiIGZpbGwtcnVsZT0ibm9uemVybyIvPjxwYXRoIGQ9Ik05IDE4YzIuNCAwIDQuNS0uOCA2LTIuMmwtMy0yLjJhNS40IDUuNCAwIDAgMS04LTIuOUgxVjEzYTkgOSAwIDAgMCA4IDV6IiBmaWxsPSIjMzRBODUzIiBmaWxsLXJ1bGU9Im5vbnplcm8iLz48cGF0aCBkPSJNNCAxMC43YTUuNCA1LjQgMCAwIDEgMC0zLjRWNUgxYTkgOSAwIDAgMCAwIDhsMy0yLjN6IiBmaWxsPSIjRkJCQzA1IiBmaWxsLXJ1bGU9Im5vbnplcm8iLz48cGF0aCBkPSJNOSAzLjZjMS4zIDAgMi41LjQgMy40IDEuM0wxNSAyLjNBOSA5IDAgMCAwIDEgNWwzIDIuNGE1LjQgNS40IDAgMCAxIDUtMy43eiIgZmlsbD0iI0VBNDMzNSIgZmlsbC1ydWxlPSJub256ZXJvIi8+PHBhdGggZD0iTTAgMGgxOHYxOEgweiIvPjwvZz48L3N2Zz4="
                  alt=""
                />
              )}
              <div>{loading ? "Signing in…" : "Sign in with Google"}</div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
