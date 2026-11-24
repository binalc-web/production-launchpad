import { useCallback, useEffect, useState } from "react";
import { fetchAllPublicAiSkills } from "@/api/hubAiSkillsLibrary";

/**
 * Load public Hub AI skills for pickers (documents and other features).
 */
export function useHubAiSkills({ enabled = true } = {}) {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchAllPublicAiSkills();
      setSkills(rows);
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || "Failed to load skills";
      setError(message);
      setSkills([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { skills, loading, error, reload };
}
