import { refreshCompetitorResearch } from "@/api";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useClientInfoContext } from "@/pages/Project/ClientInfo/hooks/useClientInfoContext";
import { CompetitorsTab } from "@/pages/Project/ClientInfo/tabs/CompetitorsTab";
import { SmartFieldsSection } from "../components/SmartFieldsSection";

function hasCompanyContext(clientDetails) {
  return Boolean(
    clientDetails?.personas?.company?.name ||
      clientDetails?.personas?.company?.website ||
      clientDetails?.persona?.company?.name ||
      clientDetails?.companyName ||
      clientDetails?.website,
  );
}

export function CompetitorsPersonaView() {
  const { projectId, clientDetails, refresh } = useClientInfoContext();
  const autoRan = useRef(false);

  useEffect(() => {
    if (autoRan.current) return;
    const empty = (clientDetails?.competitors || []).length === 0;
    if (!hasCompanyContext(clientDetails) || !empty) return;
    autoRan.current = true;
    refreshCompetitorResearch(projectId)
      .then(() => refresh())
      .catch((err) => {
        toast.error(err?.error || "Failed to refresh competitor research");
      });
  }, [projectId, clientDetails, refresh]);

  return (
    <div className="space-y-4">
      <CompetitorsTab showRefresh />
      <SmartFieldsSection personaType="competitors" />
    </div>
  );
}
