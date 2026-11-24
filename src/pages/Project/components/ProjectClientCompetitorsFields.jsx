import React, { memo } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WebsiteUrlMultiSelect } from "@/pages/Project/CreateProject/components/WebsiteUrlMultiSelect";

/**
 * Client profile, websites, and competitor context (shared by create + edit project flows).
 *
 * @param {object} props
 * @param {string} props.idPrefix - Prefix for stable `id` / `htmlFor` pairs (e.g. `create`, `edit`).
 * @param {string} props.hintText - Short helper under the section title.
 * @param {boolean} [props.boxed] - When true, draws the bordered muted panel used on create project.
 * @param {string} [props.className] - Extra classes on the section root.
 * @param {string} props.clientProfile
 * @param {(value: string) => void} props.onClientProfileChange
 * @param {string[]} props.clientWebsiteTags
 * @param {(value: string[]) => void} props.onClientWebsiteTagsChange
 * @param {string} props.competitorsNotes
 * @param {(value: string) => void} props.onCompetitorsNotesChange
 * @param {string[]} props.competitorWebsiteTags
 * @param {(value: string[]) => void} props.onCompetitorWebsiteTagsChange
 * @param {string} [props.clientWebsitesError]
 * @param {string} [props.competitorWebsitesError]
 */
function ProjectClientCompetitorsFieldsInner({
  idPrefix,
  hintText,
  boxed = true,
  className,
  clientProfile,
  onClientProfileChange,
  clientWebsiteTags,
  onClientWebsiteTagsChange,
  competitorsNotes,
  onCompetitorsNotesChange,
  competitorWebsiteTags,
  onCompetitorWebsiteTagsChange,
  clientWebsitesError,
  competitorWebsitesError,
}) {
  const profileId = `${idPrefix}-client-profile`;
  const clientSitesId = `${idPrefix}-client-websites`;
  const competitorsId = `${idPrefix}-competitors`;
  const competitorSitesId = `${idPrefix}-competitor-urls`;

  return (
    <div
      className={cn(
        "space-y-3",
        boxed && "rounded-lg border border-border bg-muted/20 p-4",
        className,
      )}
    >
      <p className="text-sm font-medium text-foreground">
        Client &amp; competitors (optional)
      </p>
      <p className="text-xs text-muted-foreground">{hintText}</p>
      <div className="space-y-2">
        <Label htmlFor={profileId}>Client / stakeholder context</Label>
        <Textarea
          id={profileId}
          placeholder="Company, industry, priorities…"
          value={clientProfile}
          onChange={(e) => onClientProfileChange(e.target.value)}
          rows={3}
          className="resize-y min-h-[72px] bg-background"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={clientSitesId}>Client websites (optional)</Label>
        <WebsiteUrlMultiSelect
          id={clientSitesId}
          value={clientWebsiteTags}
          onChange={onClientWebsiteTagsChange}
          error={clientWebsitesError}
          placeholder="https://…, then Enter"
        />
        {clientWebsitesError && (
          <p className="text-sm text-destructive mt-1">{clientWebsitesError}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor={competitorsId}>Competitors / market notes</Label>
        <Textarea
          id={competitorsId}
          placeholder="Named competitors or positioning…"
          value={competitorsNotes}
          onChange={(e) => onCompetitorsNotesChange(e.target.value)}
          rows={3}
          className="resize-y min-h-[72px] bg-background"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={competitorSitesId}>Competitor websites (optional)</Label>
        <WebsiteUrlMultiSelect
          id={competitorSitesId}
          value={competitorWebsiteTags}
          onChange={onCompetitorWebsiteTagsChange}
          error={competitorWebsitesError}
          placeholder="https://…, then Enter"
        />
        {competitorWebsitesError && (
          <p className="text-sm text-destructive mt-1">{competitorWebsitesError}</p>
        )}
      </div>
    </div>
  );
}

export const ProjectClientCompetitorsFields = memo(ProjectClientCompetitorsFieldsInner);
