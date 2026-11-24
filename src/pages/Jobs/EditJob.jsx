import React, { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { PageShell } from "@/components/common/PageShell";
import { fetchJobById, fetchProjectNamesForDropdown, updateJob } from "@/api";
import { toast } from "sonner";
import {
  JobFormFields,
  buildInitialForm,
  mapApiJobToEditForm,
  validateJobFormFields,
  buildAutomationApiBody,
} from "./JobFormFields";
import { reportRecipientEmailForApi } from "@/utils/jobReportRecipient";
import { AUTOMATION_LABELS } from "./automationDisplay";
import { duplicateAutomationNameError } from "./utils/automationName.util";

function EditJobSkeleton() {
  return (
    <PageShell width="full" className="pb-10">
      <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading automation">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56 rounded-md" />
          <Skeleton className="h-4 w-96 max-w-full rounded-md" />
        </div>
        <Card className="border-border shadow-sm">
          <CardContent className="space-y-5 pt-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32 rounded-sm" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            ))}
            <Skeleton className="h-40 w-full rounded-md" />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

export default function EditJob() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(buildInitialForm);
  const [errors, setErrors] = useState({});
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [jobLoading, setJobLoading] = useState(true);
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
    let cancelled = false;
    (async () => {
      if (!id) {
        if (!cancelled) setJobLoading(false);
        return;
      }
      setJobLoading(true);
      try {
        const job = await fetchJobById(id);
        if (!cancelled && !job) {
          toast.error(AUTOMATION_LABELS.loadOneError);
          navigate("/jobs");
          return;
        }
        if (!cancelled && job) {
          setForm(mapApiJobToEditForm(job));
        }
      } catch (e) {
        if (!cancelled) {
          toast.error(typeof e?.error === "string" ? e.error : AUTOMATION_LABELS.loadOneError);
          navigate("/jobs");
        }
      } finally {
        if (!cancelled) setJobLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const setField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const applyFormPatch = useCallback((patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setErrors((prev) => {
      const keys = Object.keys(patch);
      let next = prev;
      for (const k of keys) {
        if (next[k]) {
          if (next === prev) next = { ...prev };
          delete next[k];
        }
      }
      return next;
    });
  }, []);

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
      await updateJob(id, body);
      toast.success(
        form.hubSkillId ? AUTOMATION_LABELS.updateSuccessSkill : AUTOMATION_LABELS.updateSuccess,
      );
      navigate(`/jobs/${id}`);
    } catch (err) {
      const duplicateNameError = duplicateAutomationNameError(err);
      const message =
        duplicateNameError ??
        (typeof err?.error === "string" ? err.error : AUTOMATION_LABELS.updateError);
      if (duplicateNameError) {
        setErrors((prev) => ({ ...prev, name: duplicateNameError }));
      }
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (jobLoading) {
    return <EditJobSkeleton />;
  }

  return (
    <PageShell width="full" className="pb-10">
      <PageHeader
        title={AUTOMATION_LABELS.editTitle}
        description="Change targets, schedule, and what runs on each repository."
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
              idPrefix="edit-job"
              monacoDocumentKey={id ? String(id) : undefined}
              formVariant="edit"
              applyFormPatch={applyFormPatch}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/jobs/${id}`)}
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
              "Save changes"
            )}
          </Button>
        </div>
      </form>
    </PageShell>
  );
}
