import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import {
  getQuestionnaireAnswerStats,
  getQuestionnaireLifecycleStatus,
  getQuestionnaireStatusLabel,
} from "../utils/questionnaireLifecycle";

export function QuestionnaireList({
  questionnaires,
  activeId,
  stakeholders = [],
  onSelect,
  onCreate,
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {questionnaires.map((qn) => {
        const status = getQuestionnaireLifecycleStatus(qn);
        const stats = getQuestionnaireAnswerStats(qn, stakeholders);
        const isActive = qn.id === activeId;

        return (
          <button
            key={qn.id}
            type="button"
            onClick={() => onSelect(qn.id)}
            className={cn(
              "shrink-0 rounded-xl border px-3 py-2 text-left transition-colors min-w-[140px] max-w-[220px]",
              isActive
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "bg-card hover:bg-muted/50",
            )}
          >
            <p className="text-sm font-medium truncate">{qn.name}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 py-0 h-4 gap-1",
                  status === "live" && "border-emerald-300 text-emerald-700",
                  status === "captured" && "text-muted-foreground",
                  status === "draft" && "text-muted-foreground",
                )}
              >
                {status === "live" ? (
                  <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                ) : null}
                {getQuestionnaireStatusLabel(status)}
              </Badge>
            </div>
            {status !== "draft" ? (
              <p className="text-[10px] text-muted-foreground tabular-nums mt-1 truncate">
                {stats.questionsAnswered}/{stats.totalQuestions} Q
                {stats.totalStakeholders > 0
                  ? ` · ${stats.stakeholdersAnswered}/${stats.totalStakeholders} stakeholders`
                  : ""}
              </p>
            ) : null}
          </button>
        );
      })}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="shrink-0 h-auto min-h-[52px] rounded-xl border-dashed px-3"
        onClick={onCreate}
      >
        <Plus className="size-3.5 mr-1" />
        New
      </Button>
    </div>
  );
}
