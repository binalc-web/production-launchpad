import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Copy, Loader2, Share2 } from "lucide-react";
import {
  buildQuestionnaireShareUrl,
  getQuestionnaireAnswerStats,
  getQuestionnaireLifecycleStatus,
  getQuestionnaireStatusLabel,
} from "../utils/questionnaireLifecycle";

export function QuestionnaireShareBar({
  questionnaire,
  questionnaireName,
  publicPath,
  stakeholders = [],
  questionCount,
  publishing,
  capturing,
  onPublish,
  onCapture,
  onCopyLink,
}) {
  const status = getQuestionnaireLifecycleStatus(questionnaire);
  const isLive = status === "live";
  const isCaptured = status === "captured";
  const isDraft = status === "draft";
  const canPublish = questionCount > 0;
  const stats = getQuestionnaireAnswerStats(questionnaire, stakeholders);
  const shareUrl = publicPath ? buildQuestionnaireShareUrl(publicPath) : "";

  return (
    <div className="rounded-xl border bg-muted/30 px-4 py-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-semibold text-sm truncate">{questionnaireName || "Questionnaire"}</h3>
          <Badge
            variant={isLive ? "default" : isCaptured ? "secondary" : "outline"}
            className={cn(
              isLive && "gap-1.5",
              isCaptured && "bg-muted text-muted-foreground",
            )}
          >
            {isLive ? (
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
            ) : null}
            {getQuestionnaireStatusLabel(status)}
          </Badge>
          {!isDraft && stats.responseCount > 0 ? (
            <span className="text-xs text-muted-foreground tabular-nums">
              · {stats.responseCount} {stats.responseCount === 1 ? "response" : "responses"}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {isLive ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={onCopyLink}>
                <Copy className="size-4 mr-2" />
                Copy link
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCapture}
                disabled={capturing}
              >
                {capturing ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                End & capture
              </Button>
            </>
          ) : isCaptured ? (
            <Button type="button" variant="outline" size="sm" onClick={onCopyLink}>
              <Copy className="size-4 mr-2" />
              Copy link
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={onPublish}
              disabled={publishing || !canPublish}
            >
              {publishing ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <Share2 className="size-4 mr-2" />
              )}
              Publish & generate link
            </Button>
          )}
        </div>
      </div>

      {!isDraft ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums">
          <span>
            Questions: {stats.questionsAnswered} answered · {stats.questionsUnanswered} unanswered
          </span>
          {stats.totalStakeholders > 0 ? (
            <span>
              Stakeholders: {stats.stakeholdersAnswered} answered · {stats.stakeholdersPending} pending
            </span>
          ) : null}
        </div>
      ) : null}

      {isLive && shareUrl ? (
        <div className="flex flex-wrap items-center gap-2 text-sm min-w-0">
          <span className="text-muted-foreground shrink-0">Share with client</span>
          <code className="text-xs bg-background px-2 py-1 rounded-md break-all border min-w-0">
            {shareUrl}
          </code>
        </div>
      ) : isCaptured && publicPath ? (
        <p className="text-xs text-muted-foreground">
          Response collection is closed. The link remains available for viewing prior answers.
        </p>
      ) : isDraft ? (
        <p className="text-xs text-muted-foreground">
          {canPublish
            ? "Publish to get a unique link you can send to your client."
            : "Add at least one question before publishing."}
        </p>
      ) : null}
    </div>
  );
}
