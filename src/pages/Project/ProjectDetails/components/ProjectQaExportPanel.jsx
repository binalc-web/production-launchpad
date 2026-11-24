import { useCallback, useState } from "react";
import { downloadQaTestsZip } from "@/api";
import { qaExportStatusLabel, triggerQaExportPresignedDownload } from "@/lib/qaDownloadExportFlow";
import { QaExportDownloadCard } from "@/pages/Project/ProjectDetails/components/QaExportDownloadCard";
import { QaExportGithubPrCard } from "@/pages/Project/ProjectDetails/components/QaExportGithubPrCard";
import { toast } from "sonner";

/**
 * @param {unknown} err
 * @returns {string}
 */
function formatQaDownloadError(err) {
  if (typeof err === "string" && err.trim()) return err.trim();
  if (err && typeof err === "object") {
    const row = /** @type {{ error?: unknown, message?: unknown, status?: number }} */ (err);
    if (typeof row.error === "string" && row.error.trim()) return row.error.trim();
    if (typeof row.message === "string" && row.message.trim()) {
      const msg = row.message.trim();
      if (!/^Request failed with status code \d+$/i.test(msg)) return msg;
    }
    if (row.status === 404) {
      return "No test cases found for this project yet. Generate test cases in the QA App first, then return here to download them.";
    }
  }
  return "Could not download test cases. Check your connection and try again.";
}

/**
 * Export Test Cases — download ZIP and create GitHub PR for QA App test cases.
 * @param {{ projectId?: number | string | null, embedded?: boolean }} props
 */
export function ProjectQaExportPanel({ projectId, embedded = false }) {
  const [loading, setLoading] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");
  const [downloadError, setDownloadError] = useState("");

  const handleDownload = useCallback(async () => {
    const pid = Number(projectId);
    if (!Number.isInteger(pid) || pid < 1) {
      setDownloadError("Project is not loaded. Refresh the page and try again.");
      return;
    }
    if (loading) return;
    setLoading(true);
    setProgressMessage("Preparing test cases folder…");
    setDownloadError("");
    try {
      const { downloadUrl, filename } = await downloadQaTestsZip(pid, {
        onProgress: (status) => {
          setProgressMessage(qaExportStatusLabel(status));
        },
      });
      triggerQaExportPresignedDownload(downloadUrl, filename);
      toast.success("Test cases downloaded");
    } catch (err) {
      setDownloadError(formatQaDownloadError(err));
    } finally {
      setLoading(false);
      setProgressMessage("");
    }
  }, [loading, projectId]);

  return (
    <div className={embedded ? "min-w-0 space-y-4" : "mx-auto max-w-6xl space-y-6 px-4 py-6"}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Export test cases</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Download Playwright test cases or open a GitHub pull request with the latest QA App
          workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
        <QaExportDownloadCard
          loading={loading}
          progressMessage={progressMessage}
          error={downloadError}
          disabled={projectId == null}
          onDownload={handleDownload}
        />
        <QaExportGithubPrCard projectId={projectId} />
      </div>
    </div>
  );
}
