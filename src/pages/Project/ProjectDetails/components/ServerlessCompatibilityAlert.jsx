import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * Visible refusal when a With Server → Serverless save is blocked.
 * @param {{
 *   error: { summary: string, blockers: string[] } | null,
 *   onFix: () => void,
 *   canFix?: boolean,
 * }} props
 */
export function ServerlessCompatibilityAlert({ error, onFix, canFix = true }) {
  if (!error) return null;
  const blockers = Array.isArray(error.blockers) ? error.blockers : [];

  return (
    <Alert variant="destructive" className="border-destructive/40 bg-destructive/5">
      <AlertCircle />
      <AlertTitle className="line-clamp-none">Cannot switch to Serverless</AlertTitle>
      <AlertDescription className="text-foreground">
        <p>{error.summary}</p>
        {blockers.length ? (
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        ) : null}
        <p className="mt-2 text-sm">
          Hosting is still With Server. Fix sends these blockers to the app repository chat.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" onClick={onFix} disabled={!canFix}>
            Fix
          </Button>
          {!canFix ? (
            <span className="text-xs">Add an app repository before running a fix.</span>
          ) : null}
        </div>
      </AlertDescription>
    </Alert>
  );
}
