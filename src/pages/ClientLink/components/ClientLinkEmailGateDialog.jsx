import { useCallback, useEffect, useState } from "react";
import { ensurePublicProjectPreview } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import {
  isPlausibleClientLinkEmail,
  setClientLinkVerifiedEmail,
} from "@/lib/clientLinkVerifiedEmail";

/**
 * Blocks Client Link / preview-only until a stakeholder email is verified and stored.
 */
export function ClientLinkEmailGateDialog({
  open,
  projectSlug,
  projectName,
  initialEmail = "",
  onVerified,
}) {
  const [email, setEmail] = useState(initialEmail);
  const [inlineError, setInlineError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmail(initialEmail);
    setInlineError("");
  }, [open, initialEmail]);

  const handleContinue = useCallback(
    async (event) => {
      event.preventDefault();
      const slug = String(projectSlug || "").trim();
      const normalized = email.trim().toLowerCase();
      if (!slug) return;
      if (!isPlausibleClientLinkEmail(normalized)) {
        setInlineError("Please enter a valid email address.");
        return;
      }

      setBusy(true);
      setInlineError("");
      try {
        await ensurePublicProjectPreview(slug, { clientEmail: normalized });
        setClientLinkVerifiedEmail(normalized);
        onVerified?.(normalized);
      } catch (err) {
        const status = Number(err?.status || err?.response?.status || 0);
        const raw = String(err?.error || err?.message || "");
        // Allowlist miss — dedicated empty-state copy (not a preview/runtime error).
        if (status === 403 || /not authorized|stakeholder|forbidden/i.test(raw)) {
          setInlineError(
            "Ask your product manager to add your email to this project's stakeholder list, then try again.",
          );
        } else if (status === 401 || /unauthorized|agent/i.test(raw)) {
          setInlineError(
            raw || "Could not authorize this session. Check your email or try again in a moment.",
          );
        } else {
          setInlineError(
            raw || "Could not verify access. Check your email or contact your product manager.",
          );
        }
      } finally {
        setBusy(false);
      }
    },
    [email, onVerified, projectSlug],
  );

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md"
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <form onSubmit={(event) => void handleContinue(event)}>
          <DialogHeader>
            <DialogTitle>Enter your email to continue</DialogTitle>
            <DialogDescription>
              {projectName
                ? `Access to ${projectName} is limited to invited stakeholders. Enter your email to load the preview.`
                : "Access is limited to invited stakeholders. Enter your email to load the preview."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            <Label htmlFor="client-link-email-gate">Your email</Label>
            <Input
              id="client-link-email-gate"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setInlineError("");
              }}
              disabled={busy}
              autoFocus
              required
            />
            {inlineError ? <p className="text-xs text-destructive">{inlineError}</p> : null}
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={busy || !isPlausibleClientLinkEmail(email.trim().toLowerCase())}
              className="w-full sm:w-auto"
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Verifying…
                </>
              ) : (
                "Continue to preview"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
