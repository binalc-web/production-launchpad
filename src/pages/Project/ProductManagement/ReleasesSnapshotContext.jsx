import { createContext, useContext, useEffect } from "react";
import { fetchReleases } from "@/api";

export const ReleasesSnapshotContext = createContext({
  releases: [],
  loading: true,
  revisionSeedProgressByRelease: {},
  canManageReleases: false,
});

export function useReleasesSnapshot() {
  return useContext(ReleasesSnapshotContext);
}

/**
 * Seed releases into the shell snapshot without waiting for the Releases section to mount.
 * Skips overwrite once ReleaseManagement (or a prior seed) has populated releases.
 */
export function useSeedReleasesSnapshot(projectId, canManageReleases, setSnapshot) {
  useEffect(() => {
    setSnapshot((prev) => ({
      ...prev,
      canManageReleases: Boolean(canManageReleases),
    }));
  }, [canManageReleases, setSnapshot]);

  useEffect(() => {
    const pid = Number(projectId);
    if (!Number.isFinite(pid) || pid <= 0) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchReleases(pid);
        if (cancelled) return;
        setSnapshot((prev) => {
          // ReleaseManagement already pushed a richer snapshot — keep it.
          if (Array.isArray(prev.releases) && prev.releases.length > 0 && prev.loading === false) {
            return prev;
          }
          return {
            ...prev,
            releases: Array.isArray(data) ? data : [],
            loading: false,
            canManageReleases: Boolean(canManageReleases),
          };
        });
      } catch {
        if (!cancelled) {
          setSnapshot((prev) => ({ ...prev, loading: false }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, canManageReleases, setSnapshot]);
}
