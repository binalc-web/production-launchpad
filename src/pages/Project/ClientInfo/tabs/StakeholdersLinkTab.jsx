import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchDiscoveryThreadStatus,
  patchDiscoveryStakeholders,
  resendDiscoveryStakeholderLink,
} from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Mail, Plus, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { getInitials } from "@/pages/DiscoveryQuestionnaire/discoveryUtils";
import { buildQuestionnaireShareUrl } from "@/pages/Project/ProductManagement/utils/questionnaireLifecycle";
import { useClientInfoContext } from "../hooks/useClientInfoContext";

function statusBadge(status) {
  if (status === "responded") return <Badge className="bg-emerald-600/90">Responded</Badge>;
  if (status === "verified") return <Badge variant="secondary">Verified</Badge>;
  return <Badge variant="outline">Pending</Badge>;
}

function StakeholdersLinkSkeleton() {
  return (
    <div
      className="space-y-8 max-w-3xl"
      role="status"
      aria-busy="true"
      aria-label="Loading stakeholders"
    >
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-5 space-y-4 shadow-sm">
          <Skeleton className="h-5 w-48" />
          {Array.from({ length: 3 }).map((__, j) => (
            <Skeleton key={j} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function StakeholdersLinkTab({ onNavigateTab, view = "full" }) {
  const { projectId, discoveryData, refresh } = useClientInfoContext();
  const [loading, setLoading] = useState(true);
  const [stakeholders, setStakeholders] = useState([]);
  const [threadStatusByQuestionnaire, setThreadStatusByQuestionnaire] = useState({});
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");

  const questionnaires = discoveryData?.questionnaires || [];
  const publishedQuestionnaires = useMemo(
    () => questionnaires.filter((q) => q.publishedAt && q.publicPath),
    [questionnaires],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStakeholders(discoveryData?.stakeholders || []);
      const statusEntries = await Promise.all(
        publishedQuestionnaires.map(async (qn) => {
          const status = await fetchDiscoveryThreadStatus(projectId, qn.id).catch(() => []);
          return [qn.id, Array.isArray(status) ? status : []];
        }),
      );
      setThreadStatusByQuestionnaire(Object.fromEntries(statusEntries));
    } catch (err) {
      toast.error(err?.error || "Failed to load stakeholders");
    } finally {
      setLoading(false);
    }
  }, [projectId, discoveryData, publishedQuestionnaires]);

  useEffect(() => {
    load();
  }, [load]);

  const addStakeholder = async () => {
    if (!emailInput.trim()) return;
    try {
      const data = await patchDiscoveryStakeholders(projectId, {
        action: "add",
        name: nameInput.trim(),
        email: emailInput.trim(),
      });
      setStakeholders(data.stakeholders);
      setNameInput("");
      setEmailInput("");
      await refresh();
      await load();
    } catch (err) {
      toast.error(err?.error || "Failed to add stakeholder");
    }
  };

  const removeStakeholder = async (email) => {
    try {
      await patchDiscoveryStakeholders(projectId, { action: "remove", email });
      await refresh();
      await load();
    } catch (err) {
      toast.error(err?.error || "Failed to remove stakeholder");
    }
  };

  const copyLink = async (publicPath) => {
    const url = buildQuestionnaireShareUrl(publicPath);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const resend = async (email, questionnaireId) => {
    try {
      const data = await resendDiscoveryStakeholderLink(projectId, email, questionnaireId);
      if (data?.skipped) toast.message("Email not configured on server");
      else toast.success("Reminder sent");
    } catch (err) {
      toast.error(err?.error || "Failed to resend");
    }
  };

  if (loading) {
    return <StakeholdersLinkSkeleton />;
  }

  const showLinks = view === "full" || view === "distribute";
  const showStakeholders = view === "full" || view === "distribute";
  const showProgress = view === "full" || view === "track";

  return (
    <div className="space-y-8 max-w-3xl">
      {showLinks ? (
        <div className="rounded-xl border bg-card p-5 space-y-4 shadow-sm">
          <h3 className="font-semibold">Questionnaire links</h3>
          {publishedQuestionnaires.length > 0 ? (
            <ul className="space-y-3">
              {publishedQuestionnaires.map((qn) => (
                <li
                  key={qn.id}
                  className="flex flex-wrap gap-2 items-center rounded-lg border px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{qn.name}</p>
                    <code className="text-xs text-muted-foreground break-all block">
                      {buildQuestionnaireShareUrl(qn.publicPath)}
                    </code>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyLink(qn.publicPath)}
                  >
                    <Copy className="size-4 mr-2" /> Copy
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Publish a questionnaire in the Build step to configure links and stakeholders here.
            </p>
          )}
        </div>
      ) : null}

      {showStakeholders ? (
        <div className="rounded-xl border bg-card p-5 space-y-4 shadow-sm">
          <h3 className="font-semibold">Stakeholders &amp; access</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Jane Smith"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="jane@acme.com"
                type="email"
              />
            </div>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={addStakeholder}>
            <Plus className="size-4 mr-2" /> Add stakeholder
          </Button>

          {stakeholders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stakeholders yet.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {stakeholders.map((s) => (
                <li key={s.email} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">
                    {getInitials(s.name || s.email)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{s.name || s.email}</p>
                    <p className="text-muted-foreground truncate">{s.email}</p>
                  </div>
                  {statusBadge(s.status)}
                  {publishedQuestionnaires.length === 1 ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => resend(s.email, publishedQuestionnaires[0].id)}
                      title="Resend link"
                    >
                      <Mail className="size-4" />
                    </Button>
                  ) : publishedQuestionnaires.length > 1 ? (
                    <div className="flex flex-wrap gap-1">
                      {publishedQuestionnaires.map((qn) => (
                        <Button
                          key={qn.id}
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          onClick={() => resend(s.email, qn.id)}
                          title={`Resend ${qn.name}`}
                        >
                          <Mail className="size-3.5 mr-1" />
                          {qn.name}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => removeStakeholder(s.email)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {showProgress ? (
        <div className="rounded-xl border bg-card p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">Response progress</h3>
            {view === "full" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onNavigateTab?.("questionnaire")}
              >
                Open questionnaire editor
                <ArrowRight className="size-4 ml-2" />
              </Button>
            ) : null}
          </div>
          {publishedQuestionnaires.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Publish a questionnaire to track responses.
            </p>
          ) : (
            <div className="space-y-4">
              {publishedQuestionnaires.map((qn) => {
                const threadStatus = threadStatusByQuestionnaire[qn.id] || [];
                return (
                  <div key={qn.id} className="space-y-2">
                    <p className="text-sm font-medium">{qn.name}</p>
                    {threadStatus.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No responses yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {threadStatus.map((row) => (
                          <li
                            key={`${qn.id}-${row.email}`}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3 text-sm"
                          >
                            <span>{row.name || row.email}</span>
                            <span className="text-muted-foreground">
                              {row.answeredCount} of {row.totalQuestions} questions with messages
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
