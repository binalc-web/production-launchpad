import React, { memo, useCallback } from "react";
import { Globe, Plus, Route, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { normalizeEmbedDomain } from "@/lib/embedDomainRules.js";
import { PathTagMultiSelect } from "./PathTagMultiSelect.jsx";

const MAX_DOMAINS = 20;

function emptyDomainRule() {
  return {
    enabled: true,
    domain: "",
    restrictPaths: [],
    jiraPrefix: "",
  };
}

const DomainRuleRow = memo(function DomainRuleRow({
  rule,
  index,
  disabled,
  onChange,
  onRemove,
  canRemove,
}) {
  const domainError =
    rule.domain.trim() && !normalizeEmbedDomain(rule.domain) ? "Enter a valid hostname" : "";

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="space-y-2">
            <Label htmlFor={`embed-domain-${index}`} className="flex items-center gap-2 text-sm">
              <Globe className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              Allowed domain
            </Label>
            <Input
              id={`embed-domain-${index}`}
              value={rule.domain}
              disabled={disabled}
              placeholder="app.company.com"
              onChange={(e) => onChange({ ...rule, domain: e.target.value })}
              className="font-mono text-sm"
            />
            {domainError ? <p className="text-xs text-destructive">{domainError}</p> : null}
          </div>

          <div className="flex items-center justify-between gap-4 rounded-md border border-border/80 bg-background/60 px-3 py-2">
            <div>
              <p className="text-sm font-medium text-foreground">Enabled on this domain</p>
              <p className="text-xs text-muted-foreground">
                When off, the widget is hidden on this hostname.
              </p>
            </div>
            <Switch
              checked={rule.enabled !== false}
              disabled={disabled}
              onCheckedChange={(v) => onChange({ ...rule, enabled: v === true })}
              aria-label={`Enable widget on ${rule.domain || "domain"}`}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`embed-paths-${index}`} className="flex items-center gap-2 text-sm">
              <Route className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              Restrict paths
            </Label>
            <p className="text-xs text-muted-foreground">
              Hide the widget on these URL paths. Use{" "}
              <code className="rounded bg-muted px-1 font-mono text-[11px]">
                /projects/:projectSlug
              </code>{" "}
              for dynamic routes, or{" "}
              <code className="rounded bg-muted px-1 font-mono text-[11px]">/admin/*</code> for
              prefixes.
            </p>
            <PathTagMultiSelect
              id={`embed-paths-${index}`}
              value={Array.isArray(rule.restrictPaths) ? rule.restrictPaths : []}
              disabled={disabled}
              onChange={(restrictPaths) => onChange({ ...rule, restrictPaths })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`embed-prefix-${index}`} className="text-sm">
              Jira title prefix (optional)
            </Label>
            <Input
              id={`embed-prefix-${index}`}
              maxLength={64}
              value={rule.jiraPrefix ?? ""}
              disabled={disabled}
              placeholder="e.g. Acme — used as [Acme] in the Jira summary"
              onChange={(e) => onChange({ ...rule, jiraPrefix: e.target.value })}
            />
          </div>
        </div>

        {canRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            onClick={onRemove}
            className="shrink-0 text-muted-foreground hover:text-destructive"
            aria-label="Remove domain rule"
          >
            <Trash2 className="size-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
});

function EmbedDomainRulesEditor({ value, onChange, disabled = false, headerEnd = null }) {
  const rules = Array.isArray(value) ? value : [];

  const updateRule = useCallback(
    (index, nextRule) => {
      const copy = [...rules];
      copy[index] = nextRule;
      onChange(copy);
    },
    [onChange, rules],
  );

  const addRule = useCallback(() => {
    if (rules.length >= MAX_DOMAINS) return;
    onChange([...rules, emptyDomainRule()]);
  }, [onChange, rules]);

  const removeRule = useCallback(
    (index) => {
      onChange(rules.filter((_, i) => i !== index));
    },
    [onChange, rules],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Label className="text-sm font-medium">Allowed domains</Label>
          <p className="mt-1 text-sm text-muted-foreground">
            The snippet only appears on listed hostnames. Add at least one domain for the widget to
            show anywhere.
          </p>
        </div>
        {headerEnd ? <div className="shrink-0 sm:max-w-[min(100%,22rem)]">{headerEnd}</div> : null}
      </div>

      {rules.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/10 px-4 py-6 text-center text-sm text-muted-foreground">
          No domains configured — the Report Issue button will not appear on any site until you add
          one.
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule, index) => (
            <DomainRuleRow
              key={`domain-rule-${index}`}
              rule={rule}
              index={index}
              disabled={disabled}
              onChange={(next) => updateRule(index, next)}
              onRemove={() => removeRule(index)}
              canRemove={rules.length > 0}
            />
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || rules.length >= MAX_DOMAINS}
        onClick={addRule}
        className="gap-1.5"
      >
        <Plus className="size-4" aria-hidden />
        Add domain
      </Button>
    </div>
  );
}

export default memo(EmbedDomainRulesEditor);
