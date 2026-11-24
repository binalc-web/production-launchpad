import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProjectSettingsSaveBar({ saving, checkingServerlessCompatibility, onCancel }) {
  return (
    <div className="mt-8 flex flex-col-reverse gap-2 border-t border-border pt-6 sm:flex-row sm:justify-end sm:gap-3">
      <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
        Cancel
      </Button>
      <Button type="submit" variant="default" disabled={saving}>
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {checkingServerlessCompatibility ? "Checking serverless compatibility…" : "Saving…"}
          </>
        ) : (
          "Save changes"
        )}
      </Button>
    </div>
  );
}
