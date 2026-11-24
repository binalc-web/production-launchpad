import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FileText,
  Globe,
  MessageSquare,
  Mic,
  Video,
  ClipboardList,
  Send,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Trash2,
  Archive,
  BookOpen,
} from "lucide-react";
import {
  isConfluenceTimelineEntry,
  isGranolaTimelineEntry,
  isWebsiteEnrichTimelineEntry,
  QUESTIONNAIRE_TIMELINE_TYPES,
} from "../constants";
import { getCaptureTypeLabel } from "@/lib/captureEntryPreview";
import { formatRelativeTime } from "@/pages/DiscoveryQuestionnaire/discoveryUtils";
import { deleteDiscoveryDocument } from "@/api";
import { toast } from "sonner";
import { useClientInfoContext } from "@/pages/Project/ClientInfo/hooks/useClientInfoContext";
import {
  buildQuestionnaireShareUrl,
  formatQuestionnaireShareBody,
  getQuestionnaireAnswerStats,
  getQuestionnaireLifecycleStatus,
  getQuestionnaireStatusLabel,
} from "../utils/questionnaireLifecycle";

const TYPE_META = {
  text_note: { icon: MessageSquare, label: "Note" },
  file_upload: { icon: FileText, label: "File" },
  hub_meeting: { icon: Video, label: "Hub meeting" },
  website_enrich: { icon: Globe, label: "Website" },
  questionnaire_created: {
    icon: ClipboardList,
    label: "Questionnaire created",
  },
  questionnaire_generated: { icon: Sparkles, label: "Questions generated" },
  questionnaire_response: {
    icon: ClipboardList,
    label: "Questionnaire response",
  },
  questionnaire_published: { icon: Send, label: "Questionnaire published" },
  questionnaire_captured: { icon: Archive, label: "Questionnaire captured" },
};

const QUESTIONNAIRE_TYPES = new Set(QUESTIONNAIRE_TIMELINE_TYPES);

function QuestionnaireEntryStatus({ questionnaire, stakeholders }) {
  if (!questionnaire) return null;

  const status = getQuestionnaireLifecycleStatus(questionnaire);
  const stats = getQuestionnaireAnswerStats(questionnaire, stakeholders);
  const isLive = status === "live";
  const shareUrl =
    status !== "draft" && questionnaire.publicPath
      ? buildQuestionnaireShareUrl(questionnaire.publicPath)
      : "";

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant={isLive ? "default" : status === "captured" ? "secondary" : "outline"}
          className={cn("text-[10px] gap-1", isLive && "pl-1.5")}
        >
          {isLive ? (
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
          ) : null}
          {getQuestionnaireStatusLabel(status)}
        </Badge>
      </div>
      {status !== "draft" ? (
        <div className="space-y-0.5 text-[11px] text-muted-foreground tabular-nums">
          <p>
            Questions: {stats.questionsAnswered} answered · {stats.questionsUnanswered} unanswered
          </p>
          {stats.totalStakeholders > 0 ? (
            <p>
              Stakeholders: {stats.stakeholdersAnswered} answered · {stats.stakeholdersPending}{" "}
              pending
            </p>
          ) : null}
          {shareUrl ? (
            <p className="break-all">
              Share link:{" "}
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline-offset-2 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {shareUrl}
              </a>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function TimelineEntryCard({ entry, projectId, onRefresh }) {
  const { profileUpdate, discoveryData, isProfileUpdating, setClientDetails, updateLocal } =
    useClientInfoContext();
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isProcessing =
    isProfileUpdating && (profileUpdate?.pendingEntryIds || []).includes(entry.id);
  const meta = isGranolaTimelineEntry(entry)
    ? { icon: Mic, label: "Granola meeting" }
    : isConfluenceTimelineEntry(entry)
      ? { icon: BookOpen, label: "Confluence import" }
      : isWebsiteEnrichTimelineEntry(entry)
        ? { icon: Globe, label: "Website enriched" }
        : TYPE_META[entry.type] || TYPE_META.text_note;
  const Icon = meta.icon;
  const typeLabel = getCaptureTypeLabel(entry);
  const isPdfFile = entry.type === "file_upload" && entry.meta?.mimeType === "application/pdf";
  const hasStoredText = Boolean(entry.meta?.extractedTextS3Key);
  const tags = Object.entries(entry.extractedData || {}).flatMap(([type, items]) =>
    (items || []).slice(0, 3).map((text) => ({ type, text })),
  );

  const questionnaire = useMemo(() => {
    const questionnaireId = entry.meta?.questionnaireId;
    if (!questionnaireId || !QUESTIONNAIRE_TYPES.has(entry.type)) return null;
    return (discoveryData?.questionnaires || []).find((qn) => qn.id === questionnaireId) || null;
  }, [discoveryData?.questionnaires, entry.meta?.questionnaireId, entry.type]);

  const stakeholders = discoveryData?.stakeholders || [];

  const handleDelete = async () => {
    if (deleting || QUESTIONNAIRE_TYPES.has(entry.type)) return;
    setDeleting(true);
    updateLocal((prev) => ({
      ...prev,
      documents: (prev?.documents || []).filter((d) => d.id !== entry.id),
      timeline: (prev?.timeline || []).filter((e) => e.id !== entry.id),
    }));
    try {
      const data = await deleteDiscoveryDocument(projectId, entry.id);
      if (data?.clientDetails) {
        setClientDetails(data.clientDetails);
      } else {
        await onRefresh?.();
      }
      toast.success("Removed", { id: "timeline-entry-removed" });
    } catch (err) {
      await onRefresh?.();
      toast.error(err?.error || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="relative min-w-0 pl-8 pb-6 last:pb-0">
      <span className="absolute left-[11px] top-0 bottom-0 w-px bg-border" />
      <span className="absolute left-0 top-1 flex size-6 items-center justify-center rounded-full border bg-background">
        <Icon className="size-3.5 text-muted-foreground" />
      </span>
      <div className="ds-inset min-w-0 overflow-hidden p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className="h-auto max-w-full min-w-0 whitespace-normal break-words rounded-md text-left text-[10px] leading-snug"
              >
                <span className="min-w-0 max-w-full break-words whitespace-normal">
                  {typeLabel}
                </span>
              </Badge>
              {isPdfFile ? (
                <Badge variant="secondary" className="text-[10px]">
                  PDF
                </Badge>
              ) : null}
              {isProcessing ? (
                <Badge variant="secondary" className="text-[10px]">
                  Processing…
                </Badge>
              ) : null}
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(entry.createdAt)}
              </span>
            </div>
            <h4 className="font-medium text-sm mt-1 truncate">{entry.title}</h4>
            {questionnaire ? (
              <QuestionnaireEntryStatus questionnaire={questionnaire} stakeholders={stakeholders} />
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {!QUESTIONNAIRE_TYPES.has(entry.type) ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-destructive"
                disabled={deleting}
                aria-busy={deleting}
                onClick={handleDelete}
              >
                <Trash2 className="size-4" />
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </Button>
          </div>
        </div>
        {tags.length > 0 ? (
          <div className="mt-2 flex max-w-full flex-wrap gap-1.5">
            {tags.map((t, i) => (
              <Badge
                key={`${t.type}-${i}`}
                variant="secondary"
                className="h-auto max-w-full shrink justify-start whitespace-normal break-words rounded-md px-2 py-1 text-left text-[10px] font-normal leading-snug"
              >
                {t.text}
              </Badge>
            ))}
          </div>
        ) : null}
        {expanded && entry.body ? (
          <div className="mt-3 min-w-0 space-y-1 border-t pt-3">
            <p className={cn("break-words text-xs text-muted-foreground whitespace-pre-wrap")}>
              {QUESTIONNAIRE_TYPES.has(entry.type)
                ? formatQuestionnaireShareBody(
                    entry.body,
                    questionnaire?.publicPath || entry.meta?.publicPath,
                  )
                : entry.body}
            </p>
            {hasStoredText ? (
              <p className="text-[10px] text-muted-foreground">
                Preview only — full text loads when imported into documents or suggestions.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
