import { useEffect, useState } from "react";
import { fetchProjectQaConfig } from "@/api";

/**
 * QA App environments from project qa-config (same source as Settings drawer).
 * @param {number|string|undefined|null} projectId
 */
export function useQaProjectEnvironments(projectId) {
  const [environments, setEnvironments] = useState([]);
  const [loading, setLoading] = useState(Boolean(projectId));

  useEffect(() => {
    const pid = Number(projectId);
    if (!Number.isInteger(pid) || pid < 1) {
      setEnvironments([]);
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);

    fetchProjectQaConfig(pid, { signal: controller.signal })
      .then((data) => {
        const envs = data?.qaConfigurations?.environments ?? [];
        setEnvironments(
          envs
            .map((env) => ({
              id: String(env?.id ?? "").trim(),
              name: String(env?.name ?? env?.id ?? "").trim(),
            }))
            .filter((env) => env.id),
        );
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setEnvironments([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [projectId]);

  return { environments, loading };
}
