import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useMatch, useParams } from "react-router-dom";
import {
  editPublicDiscoveryResponse,
  fetchPublicDiscovery,
  fetchPublicProjectBySlug,
  respondPublicDiscovery,
  transcribePublicDiscoveryAudio,
  uploadPublicDiscoveryFile,
} from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  getClientLinkVerifiedEmail,
  isPlausibleClientLinkEmail,
  setClientLinkVerifiedEmail,
} from "@/lib/clientLinkVerifiedEmail";
import { toast } from "sonner";
import { getInitials } from "./discoveryUtils";
import { QuestionThreadBubble } from "./components/QuestionThreadBubble";
import { QuestionAnswerInput } from "./components/QuestionAnswerInput";
import { QuestionProgressFooter } from "./components/QuestionProgressFooter";
import { answerCountForQuestion, responsesForQuestion } from "./components/discoveryThreadUtils";

function DiscoveryQuestionnaireSkeleton() {
  return (
    <div
      className="min-h-screen bg-muted/20 flex flex-col"
      role="status"
      aria-busy="true"
      aria-label="Loading questionnaire"
    >
      <header className="border-b bg-card/80 px-4 py-4 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-3">
          <Skeleton className="h-5 w-72 rounded-md" />
          <Skeleton className="h-3 w-96 max-w-full rounded-md" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-32 rounded-full" />
            <Skeleton className="h-7 w-32 rounded-full" />
          </div>
        </div>
      </header>
      <main className="max-w-3xl w-full mx-auto px-4 py-6 sm:px-6 space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
            <Skeleton className="h-4 w-[70%] rounded-md" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        ))}
      </main>
    </div>
  );
}

const LEGACY_DISCOVERY_EMAIL_KEY = "discovery_verified_email";

function resolveInitialClientLinkEmail() {
  const fromClientLink = getClientLinkVerifiedEmail();
  if (fromClientLink) return fromClientLink;
  try {
    const legacy = localStorage.getItem(LEGACY_DISCOVERY_EMAIL_KEY);
    if (typeof legacy === "string" && legacy.includes("@")) {
      const normalized = legacy.trim().toLowerCase();
      setClientLinkVerifiedEmail(normalized);
      localStorage.removeItem(LEGACY_DISCOVERY_EMAIL_KEY);
      return normalized;
    }
  } catch {
    /* storage unavailable */
  }
  return "";
}

function EmailGate({ initialEmail = "", onContinue }) {
  const [email, setEmail] = useState(initialEmail);
  const [inlineError, setInlineError] = useState("");

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  const handleContinue = (e) => {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!isPlausibleClientLinkEmail(normalized)) {
      setInlineError("Please enter a valid email address.");
      return;
    }
    setClientLinkVerifiedEmail(normalized);
    setInlineError("");
    onContinue(normalized);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
      <form
        onSubmit={handleContinue}
        className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm space-y-4"
      >
        <h1 className="text-xl font-semibold">Discovery questionnaire</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email to continue. Access is verified securely on the server.
        </p>
        <Input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setInlineError("");
          }}
          placeholder="you@company.com"
          required
          autoFocus
          autoComplete="email"
        />
        {inlineError ? <p className="text-xs text-destructive">{inlineError}</p> : null}
        <Button
          type="submit"
          className="w-full"
          disabled={!isPlausibleClientLinkEmail(email.trim().toLowerCase())}
        >
          Continue
        </Button>
      </form>
    </div>
  );
}

export function DiscoveryQuestionnairePublic() {
  const { publicPath } = useParams();
  const location = useLocation();
  /** `/q/:publicPath` is questionnaire-only; bare `/:publicPath` may be a Next app route or client-link slug. */
  const isExplicitQuestionnaireRoute = Boolean(useMatch({ path: "/q/:publicPath", end: true }));
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState(null);
  const [responses, setResponses] = useState([]);
  const [clientLinkRedirectSlug, setClientLinkRedirectSlug] = useState(null);
  const [notFoundKind, setNotFoundKind] = useState("questionnaire");
  const [verifiedEmail, setVerifiedEmail] = useState(() => resolveInitialClientLinkEmail());

  const load = useCallback(
    async (emailForFetch = "", { preserveMetaOnError = false } = {}) => {
      setLoading(true);
      if (!preserveMetaOnError) {
        setMeta(null);
        setClientLinkRedirectSlug(null);
        setNotFoundKind("questionnaire");
      }
      try {
        const data = await fetchPublicDiscovery(publicPath, {
          email: emailForFetch || undefined,
        });
        setMeta(data);
        setResponses(data.responses || []);
        setNotFoundKind("questionnaire");
      } catch (err) {
        if (preserveMetaOnError) {
          setVerifiedEmail("");
          try {
            setClientLinkVerifiedEmail("");
          } catch {
            /* storage unavailable */
          }
          toast.error(err?.error || "Access denied for that email.");
          return;
        }
        const slug = String(publicPath || "").trim();
        if (!isExplicitQuestionnaireRoute && slug) {
          try {
            await fetchPublicProjectBySlug(slug);
            setClientLinkRedirectSlug(slug);
            return;
          } catch {
            /* not a public project */
          }
          // Bare path that is not a questionnaire or client link (e.g. Next /dashboard breakout).
          setNotFoundKind("page");
          return;
        }
        toast.error(err?.error || "Questionnaire unavailable");
      } finally {
        setLoading(false);
      }
    },
    [publicPath, isExplicitQuestionnaireRoute],
  );

  useEffect(() => {
    // Shell load without email (no answers leaked). Full payload loads after gate.
    void load(verifiedEmail && isPlausibleClientLinkEmail(verifiedEmail) ? verifiedEmail : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-fetch shell when path changes
  }, [publicPath, isExplicitQuestionnaireRoute]);

  useEffect(() => {
    if (!verifiedEmail || !isPlausibleClientLinkEmail(verifiedEmail)) return;
    void load(verifiedEmail, { preserveMetaOnError: true });
  }, [verifiedEmail, load]);

  useEffect(() => {
    const onIdentityUpdated = () => {
      setVerifiedEmail(getClientLinkVerifiedEmail());
    };
    window.addEventListener("client-link-identity-updated", onIdentityUpdated);
    return () => window.removeEventListener("client-link-identity-updated", onIdentityUpdated);
  }, []);

  const identityLooksValid = useMemo(
    () => Boolean(verifiedEmail) && isPlausibleClientLinkEmail(verifiedEmail),
    [verifiedEmail],
  );

  const normalizedEmail = identityLooksValid ? verifiedEmail.trim().toLowerCase() : "";

  const stakeholder = useMemo(() => {
    if (!identityLooksValid || !meta) return null;
    const match = (meta.stakeholders || []).find(
      (s) =>
        String(s.email || "")
          .trim()
          .toLowerCase() === normalizedEmail,
    );
    return match || { email: normalizedEmail, name: normalizedEmail.split("@")[0] };
  }, [identityLooksValid, normalizedEmail, meta]);

  const answerCountByEmail = useMemo(() => {
    const map = {};
    for (const r of responses) {
      if (!r.questionId || r.type === "ai_followup" || r.type === "thank_you") continue;
      if (r.stakeholderEmail === "ai@discovery") continue;
      const key = String(r.stakeholderEmail || "")
        .trim()
        .toLowerCase();
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [responses]);

  const myAnsweredCount = useMemo(() => {
    if (!identityLooksValid) return 0;
    return new Set(
      responses
        .filter(
          (r) =>
            String(r.stakeholderEmail || "")
              .trim()
              .toLowerCase() === normalizedEmail &&
            r.questionId &&
            r.type !== "ai_followup" &&
            r.type !== "thank_you",
        )
        .map((r) => r.questionId),
    ).size;
  }, [responses, normalizedEmail, identityLooksValid]);

  const totalQuestions = meta?.questions?.length || 0;
  const isCaptured = Boolean(meta?.isCaptured || meta?.capturedAt);

  const handleSend = async (questionId, text) => {
    if (isCaptured) {
      throw new Error("This questionnaire is closed and no longer accepting responses.");
    }
    if (!identityLooksValid) {
      throw new Error("Please enter your email to continue.");
    }
    const data = await respondPublicDiscovery(publicPath, {
      email: normalizedEmail,
      questionId,
      text,
    });
    setResponses(data.responses || []);
  };

  const handleEdit = async (responseId, text) => {
    if (isCaptured) {
      throw new Error("This questionnaire is closed and responses cannot be edited.");
    }
    if (!identityLooksValid) {
      throw new Error("Please enter your email to continue.");
    }
    const data = await editPublicDiscoveryResponse(publicPath, responseId, {
      email: normalizedEmail,
      text,
    });
    setResponses(data.responses || []);
  };

  const handleTranscribe = async (blob, filename) => {
    if (!identityLooksValid) {
      throw new Error("Please enter your email to continue.");
    }
    return transcribePublicDiscoveryAudio(publicPath, normalizedEmail, blob, filename);
  };

  const handleUpload = async (questionId, file, note) => {
    if (isCaptured) {
      throw new Error("This questionnaire is closed and no longer accepting responses.");
    }
    if (!identityLooksValid) {
      throw new Error("Please enter your email to continue.");
    }
    const data = await uploadPublicDiscoveryFile(publicPath, {
      email: normalizedEmail,
      questionId,
      file,
      note,
    });
    setResponses(data.responses || []);
  };
  if (clientLinkRedirectSlug) {
    return (
      <Navigate
        to={`/projects/${encodeURIComponent(clientLinkRedirectSlug)}${location.search}${location.hash}`}
        replace
      />
    );
  }

  if (loading) {
    return <DiscoveryQuestionnaireSkeleton />;
  }

  if (!meta) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-muted-foreground">
        {notFoundKind === "page" ? "Page not found." : "Questionnaire not found or not published."}
      </div>
    );
  }

  if (!identityLooksValid) {
    return <EmailGate initialEmail={verifiedEmail} onContinue={setVerifiedEmail} />;
  }

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-10 px-4 py-4 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="font-semibold">Discovery questionnaire · {meta.projectName}</h1>
              <p className="text-xs text-muted-foreground">
                Presales · Project: {meta.projectName} · Shared thread — all stakeholders see all
                responses
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {!isCaptured ? (
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Type or record your answers below
                </p>
              ) : (
                <Badge variant="secondary">Closed — view only</Badge>
              )}
              <span className="text-sm font-medium">
                Logged in as {stakeholder?.name || normalizedEmail}
              </span>
            </div>
          </div>
          {isCaptured ? (
            <div className="rounded-lg border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Response collection has ended. You can review prior answers below, but new responses
              are no longer accepted.
            </div>
          ) : null}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Responding</p>
            <div className="flex flex-wrap gap-2">
              {(meta.stakeholders || []).map((s) => {
                const emailKey = String(s.email || "")
                  .trim()
                  .toLowerCase();
                const isMe = emailKey === normalizedEmail;
                return (
                  <Badge
                    key={s.email}
                    variant={isMe ? "default" : "outline"}
                    className={cn("gap-1 py-1", isMe && "ring-2 ring-primary/30")}
                  >
                    <span className="inline-flex size-5 items-center justify-center rounded-full bg-background/80 text-[10px] font-medium">
                      {getInitials(s.name)}
                    </span>
                    {s.name}
                    {isMe && " (you)"}
                    <span className="opacity-70">{answerCountByEmail[emailKey] || 0} answers</span>
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex min-h-0 max-w-3xl w-full mx-auto">
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 space-y-6 w-full">
            {(meta.questions || []).map((q, qi) => {
              const qResponses = responsesForQuestion(responses, q.id);
              const answerCount = answerCountForQuestion(responses, q.id);
              return (
                <section key={q.id} className="rounded-xl border bg-card p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <p className="font-semibold text-sm flex-1">
                      <Badge variant="secondary" className="mr-2 text-[10px]">
                        Q{qi + 1}
                      </Badge>
                      {q.text}
                    </p>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {answerCount === 1
                        ? "1 message"
                        : answerCount === 0
                          ? "0 messages"
                          : `${answerCount} messages`}
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    {qResponses.map((r) => (
                      <QuestionThreadBubble
                        key={r.id}
                        response={r}
                        isMe={
                          String(r.stakeholderEmail || "")
                            .trim()
                            .toLowerCase() === normalizedEmail
                        }
                        onEdit={isCaptured ? undefined : handleEdit}
                      />
                    ))}
                  </div>

                  {!isCaptured ? (
                    <QuestionAnswerInput
                      placeholder={
                        qResponses.some(
                          (r) =>
                            String(r.stakeholderEmail || "")
                              .trim()
                              .toLowerCase() === normalizedEmail,
                        )
                          ? "Continue the discussion…"
                          : q.type === "fileupload"
                            ? "Add a note…"
                            : "Type or record your answer…"
                      }
                      onSend={(text) => handleSend(q.id, text)}
                      onTranscribe={handleTranscribe}
                      onUpload={
                        q.type === "fileupload"
                          ? (file, note) => handleUpload(q.id, file, note)
                          : undefined
                      }
                      type={
                        q.type === "fileupload"
                          ? "fileupload"
                          : qResponses.length === 0
                            ? q.type || "text"
                            : "text"
                      }
                      options={qResponses.length === 0 ? q.options || [] : []}
                    />
                  ) : null}
                </section>
              );
            })}
          </main>

          <QuestionProgressFooter
            answeredCount={myAnsweredCount}
            totalQuestions={totalQuestions}
            footerNote={
              isCaptured
                ? "This questionnaire is closed — responses are read-only"
                : "Answers auto-saved · editable · shared with all stakeholders"
            }
          />
        </div>
      </div>
    </div>
  );
}
