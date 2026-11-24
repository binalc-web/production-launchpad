import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  buildDevelopmentRepoAccessMessage,
  enrichMigrateGithubAccessPayload,
} from "@/lib/migrateGithubAccess.util";

/**
 * @typedef {{
 *   error?: string|null,
 *   launchpadRepoUrl?: string|null,
 *   launchpadRepoLabel?: string|null,
 *   repoAccess?: Array<{ role?: string, label?: string, url?: string|null, issue?: string }>,
 * }} MigrateFrontendRepoAccessPayload
 */

/**
 * GitHub repo access gate for Build Frontend App (invitation + dev repo copy).
 * @param {{
 *   open: boolean,
 *   onOpenChange: (open: boolean) => void,
 *   payload?: MigrateFrontendRepoAccessPayload|null,
 *   fallbackGitRepoPath?: unknown,
 * }} props
 */
export function MigrateFrontendRepoAccessDialog({
  open,
  onOpenChange,
  payload,
  fallbackGitRepoPath,
}) {
  const enriched = enrichMigrateGithubAccessPayload(payload, {
    gitRepoPath: fallbackGitRepoPath,
  });

  const message =
    (typeof enriched?.error === "string" && enriched.error.trim()) ||
    "GitHub access is required before Build Frontend App can start.";

  const repoAccess = Array.isArray(enriched?.repoAccess) ? enriched.repoAccess : [];
  const launchpadBlocked = repoAccess.filter(
    (row) => row?.role === "launchpad" && row?.issue === "inaccessible" && row?.label,
  );
  const developmentBlocked = repoAccess.filter(
    (row) => row?.role === "development" && row?.issue === "inaccessible" && row?.label,
  );
  const hasRoleSections = launchpadBlocked.length > 0 || developmentBlocked.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>GitHub access required</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-1 text-left text-sm text-muted-foreground">
              {!hasRoleSections ? (
                <p className="text-foreground">{message}</p>
              ) : (
                <>
                  {launchpadBlocked.map((row) => {
                    const url = typeof row.url === "string" ? row.url.trim() : "";
                    return (
                      <p key={`launchpad-${row.label}`} className="text-foreground">
                        Please accept the GitHub project invitation at{" "}
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary underline underline-offset-2"
                          >
                            {row.label}
                          </a>
                        ) : (
                          row.label
                        )}{" "}
                        or check your mail for the invitation.
                      </p>
                    );
                  })}
                  {developmentBlocked.map((row) => {
                    const url = typeof row.url === "string" ? row.url.trim() : "";
                    return (
                      <p key={`development-${row.label}`} className="text-foreground">
                        {buildDevelopmentRepoAccessMessage(row.label, url)}
                      </p>
                    );
                  })}
                </>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" asChild>
            <Link to="/settings/integrations" onClick={() => onOpenChange(false)}>
              I need help
            </Link>
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Understood
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
