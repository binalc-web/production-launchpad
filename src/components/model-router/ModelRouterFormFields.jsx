import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCursorModelPriceHint, sortCursorModelCatalog } from "@/constants/cursorModelCatalog";
import { CURSOR_AGENT_TOKEN_PRICE_PER_MILLION } from "@/constants/cursorAgentPricing";

export const MODEL_ROUTER_MODE_OPTIONS = [
  { value: "fixed", label: "Fixed model (entire project)" },
  { value: "self_select", label: "Smart self-select (OpenAI picks)" },
  { value: "fixed_by_part", label: "Fixed per part (FE / BE / Cloud)" },
];

/**
 * Shared admin form fields for platform or project model router.
 */
export function ModelRouterFormFields({
  mode,
  fixedPlanModelId,
  fixedBuildModelId,
  frontendPlanModelId,
  frontendBuildModelId,
  backendPlanModelId,
  backendBuildModelId,
  cloudPlanModelId,
  cloudBuildModelId,
  catalog = [],
  onChange,
  disabled = false,
}) {
  const modelOptions = Array.isArray(catalog) ? catalog : [];

  const setField = (field, value) => {
    onChange?.({ [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="model-router-mode">Routing mode</Label>
        <Select value={mode} onValueChange={(value) => setField("mode", value)} disabled={disabled}>
          <SelectTrigger id="model-router-mode" className="w-full">
            <SelectValue placeholder="Choose a mode" />
          </SelectTrigger>
          <SelectContent>
            {MODEL_ROUTER_MODE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {mode === "fixed" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="model-router-fixed-plan">Plan model</Label>
            <ModelSelect
              id="model-router-fixed-plan"
              value={fixedPlanModelId}
              options={modelOptions}
              disabled={disabled}
              onChange={(value) => setField("fixedPlanModelId", value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model-router-fixed-build">Build model</Label>
            <ModelSelect
              id="model-router-fixed-build"
              value={fixedBuildModelId}
              options={modelOptions}
              disabled={disabled}
              onChange={(value) => setField("fixedBuildModelId", value)}
            />
          </div>
        </div>
      ) : null}

      {mode === "self_select" ? (
        <p className="text-sm text-muted-foreground">
          OpenAI picks a catalog model from the agent part (Frontend / Backend / Cloud), task tier
          inferred from the agent source, and a short prompt excerpt. Plan mode biases toward
          stronger (premium) models. Ask mode always uses Auto. Falls back to a cost-aware default
          if selection fails. Catalog ids must match Cursor CLI{" "}
          <code className="text-xs">agent models</code>.
        </p>
      ) : null}

      {mode === "fixed_by_part" ? (
        <div className="space-y-4">
          <PartPlanBuildSelects
            partLabel="Frontend"
            planId="model-router-fe-plan"
            buildId="model-router-fe-build"
            planValue={frontendPlanModelId}
            buildValue={frontendBuildModelId}
            planField="frontendPlanModelId"
            buildField="frontendBuildModelId"
            options={modelOptions}
            disabled={disabled}
            setField={setField}
          />
          <PartPlanBuildSelects
            partLabel="Backend"
            planId="model-router-be-plan"
            buildId="model-router-be-build"
            planValue={backendPlanModelId}
            buildValue={backendBuildModelId}
            planField="backendPlanModelId"
            buildField="backendBuildModelId"
            options={modelOptions}
            disabled={disabled}
            setField={setField}
          />
          <PartPlanBuildSelects
            partLabel="Cloud"
            planId="model-router-cloud-plan"
            buildId="model-router-cloud-build"
            planValue={cloudPlanModelId}
            buildValue={cloudBuildModelId}
            planField="cloudPlanModelId"
            buildField="cloudBuildModelId"
            options={modelOptions}
            disabled={disabled}
            setField={setField}
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Plan + Build model selects for one FE/BE/Cloud part.
 */
function PartPlanBuildSelects({
  partLabel,
  planId,
  buildId,
  planValue,
  buildValue,
  planField,
  buildField,
  options,
  disabled,
  setField,
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{partLabel}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={planId}>Plan</Label>
          <ModelSelect
            id={planId}
            value={planValue}
            options={options}
            disabled={disabled}
            onChange={(value) => setField(planField, value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={buildId}>Build</Label>
          <ModelSelect
            id={buildId}
            value={buildValue}
            options={options}
            disabled={disabled}
            onChange={(value) => setField(buildField, value)}
          />
        </div>
      </div>
    </div>
  );
}

const AUTO_COST_PRICE_HINT = formatCursorModelPriceHint(CURSOR_AGENT_TOKEN_PRICE_PER_MILLION);

/**
 * @param {{ id: string, label?: string, provider?: string, pricing?: object|null }} entry
 * @returns {string}
 */
function modelSelectItemText(entry) {
  const base = `${entry.label || entry.id}${entry.provider ? ` (${entry.provider})` : ""}`;
  const hint =
    entry.id === "Auto" || !entry.pricing
      ? AUTO_COST_PRICE_HINT
      : formatCursorModelPriceHint(entry.pricing);
  return hint ? `${base} · ${hint}` : base;
}

/**
 * Single model dropdown from the LaunchPad catalog.
 */
function ModelSelect({
  id,
  value,
  options,
  onChange,
  disabled,
  fallbackValue = "Auto",
  extraItems = [],
}) {
  const sortedOptions = useMemo(() => sortCursorModelCatalog(options), [options]);

  return (
    <Select value={value || fallbackValue} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder="Choose a model" />
      </SelectTrigger>
      <SelectContent>
        {extraItems.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
        {sortedOptions.map((entry) => (
          <SelectItem key={entry.id} value={entry.id}>
            {modelSelectItemText(entry)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Select value for "no project override" (Radix Select cannot use an empty string). */
export const OPENCODE_INHERIT_VALUE = "__platform__";

/**
 * OpenCode plan/build model pickers (projects whose agent runtime is OpenCode).
 * With `platformDefaults`, each picker offers "Platform default" and reports `null` for it.
 */
export function OpenCodeModelFields({
  planModelId,
  buildModelId,
  catalog = [],
  platformDefaults = null,
  onChange,
  disabled = false,
  idPrefix = "opencode-model",
}) {
  const options = Array.isArray(catalog) ? catalog : [];
  const labelFor = (id) => options.find((entry) => entry.id === id)?.label || id;
  const extraItems = (field) =>
    platformDefaults
      ? [
          {
            value: OPENCODE_INHERIT_VALUE,
            label: `Platform default (${labelFor(platformDefaults[field])})`,
          },
        ]
      : [];
  const fallback = platformDefaults ? OPENCODE_INHERIT_VALUE : options[0]?.id;
  const emit = (field, value) =>
    onChange?.({ [field]: value === OPENCODE_INHERIT_VALUE ? null : value });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-plan`}>Plan model (ask &amp; plan)</Label>
        <ModelSelect
          id={`${idPrefix}-plan`}
          value={planModelId}
          options={options}
          disabled={disabled}
          fallbackValue={fallback}
          extraItems={extraItems("opencodePlanModelId")}
          onChange={(value) => emit("opencodePlanModelId", value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-build`}>Build model</Label>
        <ModelSelect
          id={`${idPrefix}-build`}
          value={buildModelId}
          options={options}
          disabled={disabled}
          fallbackValue={fallback}
          extraItems={extraItems("opencodeBuildModelId")}
          onChange={(value) => emit("opencodeBuildModelId", value)}
        />
      </div>
    </div>
  );
}
