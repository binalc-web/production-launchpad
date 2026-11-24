import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { AUTH_CARD_CLASS, AUTH_PAGE_SHELL_CLASS } from "./authPageStyles";

/**
 * Explicit approval before handing the session to a desktop client. The `state` writeKey
 * comes from the URL, so anyone can craft the link — never complete without a user click.
 */
export default function DesktopConnectConsent({
  clientLabel,
  accountEmail,
  description,
  error,
  submitting,
  onApprove,
  onCancel,
}) {
  return (
    <div className={AUTH_PAGE_SHELL_CLASS}>
      <Card className={AUTH_CARD_CLASS}>
        <CardHeader className="space-y-1 px-0 text-center">
          <CardTitle className="text-xl">Connect {clientLabel}?</CardTitle>
          <CardDescription>
            {description ||
              (accountEmail
                ? `${clientLabel} will get full access to your LaunchPad account (${accountEmail}).`
                : `${clientLabel} will get full access to your LaunchPad account.`)}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pt-2">
          <div className="flex flex-col gap-4">
            <Alert className="rounded-lg">
              <AlertDescription>
                Only continue if you just clicked &quot;Sign in&quot; in {clientLabel} on this
                computer. If someone sent you this link, cancel.
              </AlertDescription>
            </Alert>
            {error && (
              <Alert variant="destructive" className="rounded-lg">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button onClick={onApprove} disabled={submitting} className="w-full">
              {submitting && <Loader2 className="size-4 animate-spin shrink-0" />}
              {submitting ? "Connecting…" : `Connect ${clientLabel}`}
            </Button>
            <Button variant="outline" onClick={onCancel} disabled={submitting} className="w-full">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
