import { ChevronDown, Download, ExternalLink, Loader2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  FIGMA_ACCOUNT_SETTINGS_URL,
  FIGMA_PAT_CREATION_STEPS,
  FIGMA_PAT_HELP_URL,
  FIGMA_PAT_SCOPE_GROUPS,
  FIGMA_PLUGIN_DOWNLOAD_URL,
} from "@/components/integrations/figmaPat.constants";

/**
 * Shared Figma PAT instructions for Connected accounts and project onboarding.
 * Supports optional token input when the parent handles save logic.
 */
export function FigmaPatSetupGuide({
  className,
  inputId = "figma-pat-input",
  patValue = "",
  onPatChange,
  onSavePat,
  saveBusy = false,
  saveDisabled = false,
  showPatInput = true,
  showOAuthHint = true,
  showPluginDownload = false,
  scopesDefaultOpen = false,
  compact = false,
}) {
  const requiredScopeCount = FIGMA_PAT_SCOPE_GROUPS.reduce(
    (count, group) => count + group.scopes.filter((scope) => scope.required).length,
    0,
  );

  return (
    <div className={cn("space-y-3", className)}>
      {showOAuthHint ? (
        <p className="text-xs text-muted-foreground">
          Optional if you use <span className="font-medium text-foreground">Add account</span> (Sign
          in with Figma) instead. Otherwise, create a personal access token below.
        </p>
      ) : null}

      <div className="rounded-md border border-border bg-muted/20 p-3 space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">How to create your token</p>
          <p className="text-xs text-muted-foreground">
            In Figma, go to your profile → Settings → Security → Personal access tokens.
          </p>
        </div>

        <ol className="list-decimal space-y-1.5 pl-5 text-xs text-muted-foreground">
          {FIGMA_PAT_CREATION_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs" asChild>
            <a href={FIGMA_ACCOUNT_SETTINGS_URL} target="_blank" rel="noopener noreferrer">
              Open Figma settings
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden />
            </a>
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" asChild>
            <a href={FIGMA_PAT_HELP_URL} target="_blank" rel="noopener noreferrer">
              Figma help article
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden />
            </a>
          </Button>
          {showPluginDownload ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              asChild
            >
              <a
                href={FIGMA_PLUGIN_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                download="LaunchPad.zip"
              >
                <Download className="h-3.5 w-3.5" aria-hidden />
                Download plugin
              </a>
            </Button>
          ) : null}
        </div>

        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-500" />
          <p>
            Personal access tokens let apps read your Figma data. Only paste tokens into LaunchPad —
            never share them in chat, email, or public docs.
          </p>
        </div>
      </div>

      <Collapsible defaultOpen={scopesDefaultOpen}>
        <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/40 [&[data-state=open]>svg]:rotate-180">
          <span>
            Scopes to enable
            <span className="ml-2 font-normal text-muted-foreground">
              ({requiredScopeCount} read permissions)
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <p className="mb-3 text-xs text-muted-foreground">
            On the token screen, under <span className="font-medium text-foreground">Scopes</span>,
            turn on every permission marked{" "}
            <Badge variant="secondary" className="mx-0.5 h-5 px-1.5 text-[10px] font-medium">
              Enable
            </Badge>
            . Leave write/delete scopes off unless your admin asks for them.
          </p>
          <div className="space-y-3">
            {FIGMA_PAT_SCOPE_GROUPS.map((group) => (
              <div key={group.category} className="rounded-md border border-border p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  {group.category}
                </p>
                <ul className="mt-2 space-y-2">
                  {group.scopes.map((scope) => (
                    <li
                      key={scope.label}
                      className="flex items-start justify-between gap-2 text-xs text-muted-foreground"
                    >
                      <span>{scope.label}</span>
                      <Badge
                        variant={scope.required ? "secondary" : "outline"}
                        className="shrink-0 h-5 px-1.5 text-[10px] font-medium"
                      >
                        {scope.required ? "Enable" : "Skip"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {showPatInput ? (
        <div className="space-y-2">
          <Label htmlFor={inputId} className="text-sm font-medium">
            Personal access token
          </Label>
          <Input
            id={inputId}
            type="password"
            autoComplete="off"
            placeholder="Paste token here"
            value={patValue}
            onChange={onPatChange}
            className="transition-all duration-200"
            disabled={saveDisabled || saveBusy}
          />
          {onSavePat ? (
            <Button type="button" size="sm" disabled={saveDisabled || saveBusy} onClick={onSavePat}>
              {saveBusy ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                "Save token"
              )}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
