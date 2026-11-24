import React from "react";
import { Info, Mail } from "lucide-react";
import Editor from "@/lib/monacoEditor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { EmailMultiSelect } from "@/pages/Project/CreateProject/components/EmailMultiSelect";
import { recipientTagsFromFormValue, reportRecipientFormIsValid } from "@/utils/jobReportRecipient";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatRepeatsLine } from "@/utils/jobSchedule";
import { JobScheduleType } from "@/pages/Project/CreateProject/constants/constants.js";
import { cn } from "@/lib/utils";
import { JobFormRadio } from "./components/JobFormRadio";
import { format } from "date-fns";
import { DatePickerSingle } from "@/components/ui/date-picker-single";
import { AutomationTargetPicker } from "./components/AutomationTargetPicker";
import { AutomationDocumentPicker } from "./components/AutomationDocumentPicker";
import { HubSkillSelect } from "@/components/HubSkillSelect";
import {
  AUTOMATION_TYPE_OPTIONS,
  AUTOMATION_TYPE_AI,
  AUTOMATION_TYPE_SCRIPT,
  AUTOMATION_TYPE_SCRIPT_AI,
} from "./automationFormShared";

export const WEEKDAY_OPTIONS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

export const DAY_INDEX_TO_API = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

export const API_DAY_TO_INDEX = {
  SUNDAY: "0",
  MONDAY: "1",
  TUESDAY: "2",
  WEDNESDAY: "3",
  THURSDAY: "4",
  FRIDAY: "5",
  SATURDAY: "6",
};

export const BASH_SCRIPT_TEMPLATE = `#!/usr/bin/env bash
set -euo pipefail
# Your steps go here. Runs from the cloned development repository.
echo "hello"
`;

export const SCRIPT_INLINE = "inline";

const MONACO_SHELL = "shell";

const INFO_TRIGGER_CLASS =
  "inline-flex shrink-0 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const InfoIconButton = React.forwardRef(function InfoIconButton({ className, ...props }, ref) {
  return (
    <button ref={ref} type="button" className={cn(INFO_TRIGGER_CLASS, className)} {...props}>
      <Info className="h-3.5 w-3.5" strokeWidth={2} />
    </button>
  );
});

function useAppDarkMode() {
  const [dark, setDark] = React.useState(() =>
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : false,
  );
  React.useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => {
      setDark(el.classList.contains("dark"));
    });
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    setDark(el.classList.contains("dark"));
    return () => obs.disconnect();
  }, []);
  return dark;
}

function LabelWithInfo({ htmlFor, label, hint }) {
  return (
    <div className="flex items-center gap-1 mb-2">
      <Label {...(htmlFor ? { htmlFor } : {})} className="text-foreground">
        {label}
      </Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <InfoIconButton aria-label={`About ${label}`} />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px] text-xs">
          {hint}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export function JobFormFields({
  form,
  setField,
  errors,
  projects,
  projectsLoading,
  idPrefix,
  monacoDocumentKey,
  formVariant = "create",
  applyFormPatch,
}) {
  const p = idPrefix || "job";
  const dark = useAppDarkMode();
  const monacoPath = monacoDocumentKey
    ? `${p}-inline-${monacoDocumentKey}`
    : `${p}-job-inline-script`;

  const applyForm = React.useCallback(
    (patch) => {
      if (applyFormPatch) {
        applyFormPatch(patch);
        return;
      }
      for (const [k, v] of Object.entries(patch)) {
        setField(k, v);
      }
    },
    [applyFormPatch, setField],
  );

  const patchScheduleType = React.useCallback(
    (type) => {
      if (type === JobScheduleType.CUSTOM) {
        applyForm({ scheduleType: type, scheduleDate: "" });
      } else if (type === JobScheduleType.ONETIME) {
        applyForm({ scheduleType: type, scheduleCron: "" });
      } else {
        applyForm({ scheduleType: type, scheduleDate: "", scheduleCron: "" });
      }
    },
    [applyForm],
  );

  const automationType = form.automationType ?? AUTOMATION_TYPE_SCRIPT_AI;
  const showScript =
    automationType === AUTOMATION_TYPE_SCRIPT || automationType === AUTOMATION_TYPE_SCRIPT_AI;
  const showAiInstructions =
    automationType === AUTOMATION_TYPE_AI || automationType === AUTOMATION_TYPE_SCRIPT_AI;

  const editorValue =
    typeof form.scriptDrafts?.bash === "string" ? form.scriptDrafts.bash : BASH_SCRIPT_TEMPLATE;

  const needsScheduleCron = form.scheduleType === JobScheduleType.CUSTOM;
  const needsScheduleDate = form.scheduleType === JobScheduleType.ONETIME;
  const needsScheduleTime = form.scheduleType !== JobScheduleType.CUSTOM;

  const customScheduleDate = React.useMemo(() => {
    const s = String(form.scheduleDate ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
    const [y, mo, d] = s.split("-").map(Number);
    return new Date(y, mo - 1, d);
  }, [form.scheduleDate]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <LabelWithInfo
          htmlFor={`${p}-name`}
          label="Name"
          hint="A short label so you can find this project report in your list later."
        />
        <Input
          id={`${p}-name`}
          placeholder="e.g. Weekly repo scan"
          value={form.name}
          onChange={(e) => setField("name", e.target.value)}
          className={errors.name ? "border-destructive" : ""}
          autoComplete="off"
        />
        {errors.name ? <p className="text-sm text-destructive">{errors.name}</p> : null}
      </div>

      <div>
        <div className="mb-3">
          <span className="text-sm font-medium text-foreground">Project report type</span>
          <p className="text-xs text-muted-foreground mt-1">
            All types run against selected development repositories (not Launchpad).
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {AUTOMATION_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => applyForm({ automationType: opt.value })}
              className={cn(
                "rounded-xl border p-4 text-left transition-all duration-200",
                automationType === opt.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border hover:border-primary/40 hover:bg-muted/30",
              )}
            >
              <span className="text-sm font-medium text-foreground">{opt.label}</span>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {opt.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <LabelWithInfo
          label="Targets"
          hint="Pick projects and development repos. Each target gets its own run."
        />
        <AutomationTargetPicker
          projects={projects}
          projectsLoading={projectsLoading}
          targets={form.targets ?? []}
          onChange={(next) => setField("targets", next)}
          error={errors.targets}
        />
      </div>

      {showAiInstructions ? (
        <>
          <div>
            <LabelWithInfo
              label="Skill (optional)"
              hint="Pick a skill from the AI library to define how the model analyzes the repository. Additional instructions below are optional."
            />
            <HubSkillSelect
              id={`${p}-hub-skill`}
              value={form.hubSkillId ?? null}
              onChange={(skillId) => setField("hubSkillId", skillId)}
              enabled={showAiInstructions}
              noneLabel="None — use default prompt"
              label=""
            />
          </div>
          <div>
            <LabelWithInfo
              htmlFor={`${p}-report-prompt`}
              label="Additional AI instructions"
              hint="Optional extra instructions on top of the selected skill (or default prompt)."
            />
            <Textarea
              id={`${p}-report-prompt`}
              placeholder="e.g. Focus on dependency security risks in the last release."
              value={form.reportPrompt ?? ""}
              onChange={(e) => setField("reportPrompt", e.target.value)}
              rows={4}
              className={cn("min-h-[100px] resize-y", errors.reportPrompt && "border-destructive")}
            />
            {errors.reportPrompt ? (
              <p className="text-sm text-destructive">{errors.reportPrompt}</p>
            ) : null}
          </div>
        </>
      ) : null}

      {showScript ? (
        <div className="space-y-1">
          <LabelWithInfo
            label="Bash script"
            hint="Runs inside the cloned development repository workspace."
          />
          <div className="overflow-hidden rounded-md border border-border">
            <Editor
              key={monacoPath}
              height="280px"
              theme={dark ? "vs-dark" : "vs"}
              path={monacoPath}
              defaultLanguage={MONACO_SHELL}
              language={MONACO_SHELL}
              value={editorValue}
              onChange={(val) => setField("scriptDrafts", { bash: val ?? "" })}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
              }}
            />
          </div>
          {errors.scriptContent ? (
            <p className="text-sm text-destructive">{errors.scriptContent}</p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-4 rounded-lg border border-border p-4">
        <div>
          <span className="text-sm font-medium text-foreground">Schedule</span>
        </div>
        <div
          className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-x-6"
          role="radiogroup"
          aria-label="Schedule type"
        >
          {[
            [JobScheduleType.DAILY, "Daily"],
            [JobScheduleType.WEEKLY, "Weekly"],
            [JobScheduleType.CUSTOM, "Custom"],
            [JobScheduleType.ONETIME, "One time"],
          ].map(([type, label]) => (
            <JobFormRadio
              key={type}
              id={`${p}-schedule-${type}`}
              name={`${p}-scheduleType`}
              checked={form.scheduleType === type}
              onChange={() => patchScheduleType(type)}
            >
              {label}
            </JobFormRadio>
          ))}
        </div>
        {needsScheduleTime ? (
          <div>
            <LabelWithInfo
              htmlFor={`${p}-schedule-time`}
              label="Time"
              hint="Local time in the project report timezone."
            />
            <Input
              id={`${p}-schedule-time`}
              type="time"
              value={form.scheduleTime}
              onChange={(e) => setField("scheduleTime", e.target.value)}
              className={errors.scheduleTime ? "border-destructive" : ""}
            />
            {errors.scheduleTime ? (
              <p className="text-sm text-destructive">{errors.scheduleTime}</p>
            ) : null}
          </div>
        ) : null}
        {needsScheduleCron ? (
          <div>
            <LabelWithInfo
              htmlFor={`${p}-schedule-cron`}
              label="Cron expression"
              hint='5 fields: minute hour day-of-month month weekday. Example: "0 9 * * 1" is Mondays at 9:00 in the timezone below.'
            />
            <Input
              id={`${p}-schedule-cron`}
              placeholder="0 9 * * 1"
              value={form.scheduleCron ?? ""}
              onChange={(e) => setField("scheduleCron", e.target.value)}
              className={cn("font-mono text-sm", errors.scheduleCron && "border-destructive")}
              autoComplete="off"
              spellCheck={false}
            />
            {errors.scheduleCron ? (
              <p className="text-sm text-destructive">{errors.scheduleCron}</p>
            ) : null}
          </div>
        ) : null}
        {form.scheduleType === JobScheduleType.WEEKLY ? (
          <div>
            <LabelWithInfo
              htmlFor={`${p}-schedule-day`}
              label="Day"
              hint="Weekday for weekly runs."
            />
            <select
              id={`${p}-schedule-day`}
              className={cn(
                "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm",
                errors.scheduleDay && "border-destructive",
              )}
              value={form.scheduleDay}
              onChange={(e) => setField("scheduleDay", e.target.value)}
            >
              {WEEKDAY_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {needsScheduleDate ? (
          <div>
            <LabelWithInfo label="Date" hint="Calendar date for this one-time run." />
            <DatePickerSingle
              className={errors.scheduleDate ? "border-destructive" : ""}
              date={customScheduleDate}
              onDateChange={(d) => setField("scheduleDate", d ? format(d, "yyyy-MM-dd") : "")}
              placeholder="Pick a date"
              displayFormat="MMM d yyyy"
            />
            {errors.scheduleDate ? (
              <p className="text-sm text-destructive">{errors.scheduleDate}</p>
            ) : null}
          </div>
        ) : null}
        {(needsScheduleTime ? form.scheduleTime : true) &&
        (needsScheduleCron ? String(form.scheduleCron ?? "").trim() : true) ? (
          <p className="text-sm text-muted-foreground">
            {formatRepeatsLine(
              form.scheduleType,
              form.scheduleTime || "00:00",
              form.scheduleType === JobScheduleType.WEEKLY
                ? (DAY_INDEX_TO_API[Number(form.scheduleDay)] ?? "MONDAY")
                : null,
              String(form.timezone ?? "Asia/Kolkata").trim() || "Asia/Kolkata",
              needsScheduleDate ? String(form.scheduleDate ?? "").trim() || null : null,
              needsScheduleCron ? String(form.scheduleCron ?? "").trim() || null : null,
            )}
          </p>
        ) : null}
      </div>

      <div
        className={cn(
          "space-y-3 rounded-lg border border-border p-4",
          form.reportEmailNotificationsEnabled !== false ? "bg-primary/5" : "bg-muted/30",
        )}
      >
        <div className="flex items-start gap-3">
          <Switch
            id={`${p}-email-notify`}
            checked={form.reportEmailNotificationsEnabled !== false}
            onCheckedChange={(v) => setField("reportEmailNotificationsEnabled", v === true)}
            className="mt-0.5"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Mail className="size-4 text-primary" aria-hidden />
              <Label htmlFor={`${p}-email-notify`} className="cursor-pointer">
                Email report after each target run
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Sends the generated report or summary to the recipients below.
            </p>
          </div>
        </div>
        {form.reportEmailNotificationsEnabled !== false ? (
          <EmailMultiSelect
            id={`${p}-report-recipient-emails`}
            value={recipientTagsFromFormValue(form.reportRecipientEmail)}
            onChange={(tags) => {
              const list = Array.isArray(tags)
                ? tags.map((t) => String(t ?? "").trim()).filter(Boolean)
                : [];
              setField(
                "reportRecipientEmail",
                list.length === 0 ? "" : list.length === 1 ? list[0] : list,
              );
            }}
            suggestions={[]}
            error={errors.reportRecipientEmail}
          />
        ) : null}
        {errors.reportRecipientEmail ? (
          <p className="text-sm text-destructive">{errors.reportRecipientEmail}</p>
        ) : null}
      </div>

      <div>
        <LabelWithInfo
          label="Discovery documents"
          hint="Optional. After each run, apply the same report content as email to selected workspace documents."
        />
        <AutomationDocumentPicker
          repoTargets={form.targets ?? []}
          projects={projects}
          documentTargets={form.documentTargets ?? []}
          onChange={(next) => setField("documentTargets", next)}
          error={errors.documentTargets}
        />
      </div>
    </div>
  );
}

export {
  buildInitialForm,
  mapApiJobToEditForm,
  validateAutomationForm as validateJobFormFields,
  buildAutomationApiBody,
} from "./automationFormShared";
