import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

/**
 * Inline SCM access / push gate for migrate-frontend and lock-release dialogs.
 */
export function CursorAgentGithubGateAlert({ message, loading = false }) {
  if (loading) {
    return (
      <div
        className="flex items-center gap-2"
        role="status"
        aria-busy="true"
        aria-label="Checking repository access"
      >
        <Skeleton className="size-4 shrink-0 rounded-full" />
        <Skeleton className="h-4 w-48" />
      </div>
    );
  }
  if (!message) return null;
  return (
    <Alert variant="destructive" className="border-rose-200 bg-rose-50/90">
      <AlertCircle className="size-4 text-rose-700" />
      <AlertTitle className="text-rose-950">Repository access required</AlertTitle>
      <AlertDescription className="text-rose-900/90">{message}</AlertDescription>
    </Alert>
  );
}
