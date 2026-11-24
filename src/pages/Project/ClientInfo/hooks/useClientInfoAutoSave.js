import { useCallback, useRef } from "react";
import { patchClientDetails } from "@/api";
import { toast } from "sonner";

export function useClientInfoAutoSave(projectId) {
  const timerRef = useRef(null);

  const saveField = useCallback(
    (field, value) => {
      if (!projectId) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        try {
          await patchClientDetails(projectId, { field, value });
        } catch (err) {
          toast.error(err?.error || "Failed to auto-save");
        }
      }, 400);
    },
    [projectId],
  );

  const saveBulk = useCallback(
    async (clientDetails) => {
      if (!projectId) return;
      try {
        await patchClientDetails(projectId, { clientDetails });
        toast.success("Draft saved");
      } catch (err) {
        toast.error(err?.error || "Failed to save draft");
      }
    },
    [projectId],
  );

  return { saveField, saveBulk };
}
