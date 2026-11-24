import React, { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { PageShell } from "@/components/common/PageShell";
import { createJob, fetchProjectAutomationRepos, fetchProjectNamesForDropdown } from "@/api";
import { toast } from "sonner";
import {
  JobFormFields,
  buildInitialForm,
  validateJobFormFields,
  buildAutomationApiBody,
} from "./JobFormFields";
import { AUTOMATION_LABELS } from "./automationDisplay";
import { duplicateAutomationNameError } from "./utils/automationName.util";
import { useAuth } from "@/context/AuthContext";
import { recipientHasValue, reportRecipientEmailForApi } from "@/utils/jobReportRecipient";

export function CreateJobButton({ className }) {
  const navigate = useNavigate();
  return (
    <Button
      type="button"
      className={className ?? "text-white transition-all duration-200"}
      onClick={() => navigate("/jobs/new")}
    >
      + New project report
    </Button>
  );
}

export default function CreateJob() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefilledProjectId = searchParams.get("projectId");
  const projectPrefillAppliedRef = useRef(false);
  const { user } = useAuth();
  const [form, setForm] = useState(() => {
    const base = buildInitialForm();
    const em = typeof user?.email === "string" ? user.email.trim() : "";
    if (em) return { ...base, reportRecipientEmail: em };
    return base;
  });
  const [errors, setErrors] = useState({});
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchProjectNamesForDropdown();
        if (!cancelled) setProjects(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!cancelled) {
          setProjects([]);
          toast.error(e?.error || "Could not load projects");
        }
      } finally {
        if (!cancelled) setProjectsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const em = typeof user?.email === "string" ? user.email.trim() : "";
    if (!em) return;
    setForm((prev) => {
      if (recipientHasValue(prev.reportRecipientEmail)) return prev;
      return { ...prev, reportRecipientEmail: em };
    });
  }, [user?.email]);

  useEffect(() => {
    if (projectPrefillAppliedRef.current || projectsLoading) return;
    const pid = Number(prefilledProjectId);
    if (!Number.isInteger(pid) || pid < 1) return;

    const project = projects.find((p) => Number(p.id) === pid);
    if (!project) return;

    let cancelled = false;
    const applyPrefill = async () => {
      try {
        const res = await fetchProjectAutomationRepos(pid);
        const repos = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        if (cancelled || repos.length === 0) return;
        const firstRepo = repos[0];
        const repoPath = String(firstRepo.path ?? "").trim();
        if (!repoPath) return;
        const branch = String(firstRepo.defaultRef ?? "main").trim() || "main";
        projectPrefillAppliedRef.current = true;
        setForm((prev) => {
          if ((prev.targets ?? []).length > 0) return prev;
          return {
            ...prev,
            targets: [
              {
                projectId: pid,
                repoPath,
                branch,
                projectName: project.name,
              },
            ],
          };
        });
      } catch {
        /* user can pick targets manually */
      }
    };

    void applyPrefill();
    return () => {
      cancelled = true;
    };
  }, [prefilledProjectId, projects, projectsLoading]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = validateJobFormFields(form);
    if (
      form.reportEmailNotificationsEnabled !== false &&
      !reportRecipientEmailForApi(form.reportRecipientEmail)
    ) {
      next.reportRecipientEmail = "Enter a valid recipient email";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const body = buildAutomationApiBody(form);
      body.reportRecipientEmail = reportRecipientEmailForApi(form.reportRecipientEmail);
      await createJob(body);
      toast.success(
        form.hubSkillId ? AUTOMATION_LABELS.createSuccessSkill : AUTOMATION_LABELS.createSuccess,
      );
      navigate("/jobs");
    } catch (err) {
      const duplicateNameError = duplicateAutomationNameError(err);
      const message = duplicateNameError ?? (typeof err?.error === "string" ? err.error : AUTOMATION_LABELS.createError);
      if (duplicateNameError) {
        setErrors((prev) => ({ ...prev, name: duplicateNameError }));
      }
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell width="full" className="pb-10">
      <PageHeader
        title={AUTOMATION_LABELS.newTitle}
        description="Choose what runs and when—on your own schedule."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-border shadow-sm">
          <CardContent className="pt-6">
            <JobFormFields
              form={form}
              setField={setField}
              errors={errors}
              projects={projects}
              projectsLoading={projectsLoading}
              idPrefix="job"
            />
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/jobs")}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="gap-2 px-8 text-white transition-all duration-200"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              AUTOMATION_LABELS.createButton
            )}
          </Button>
        </div>
      </form>
    </PageShell>
  );
}
