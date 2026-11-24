import { useState } from "react";
import { AiSummaryTab } from "@/pages/Project/ClientInfo/tabs/AiSummaryTab";
import { useClientInfoContext } from "@/pages/Project/ClientInfo/hooks/useClientInfoContext";
import { SmartFieldsSection } from "../components/SmartFieldsSection";
import { Badge } from "@/components/ui/badge";

export function BriefPanel({ onNavigate }) {
  const { discoveryData } = useClientInfoContext();
  const openQs = (discoveryData?.openQuestionsRegister || []).filter((q) => q.status === "open");

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Open questions</h3>
          {openQs.length > 0 ? (
            <Badge variant="secondary" className="text-[10px]">
              {openQs.length}
            </Badge>
          ) : null}
        </div>
        {openQs.length > 0 ? (
          <ul className="rounded-xl border bg-card p-4 space-y-1.5 shadow-sm">
            {openQs.map((q) => (
              <li key={q.id} className="flex items-start gap-2 text-sm">
                <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">
                  Open
                </Badge>
                <span>{q.text}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border bg-card px-4 py-6 text-sm text-muted-foreground shadow-sm">
            No open questions right now.
          </p>
        )}
      </div>

      <div className="space-y-6">
        <AiSummaryTab accordion onNavigate={onNavigate} />
        <SmartFieldsSection personaType="brief" />
      </div>
    </div>
  );
}
