import { useCallback, useMemo, useRef, useState } from "react";
import {
  postPublicDiscoveryChat,
  transcribePublicDiscoveryAudio,
  uploadPublicDiscoveryChatAttachment,
} from "@/api";
import { ChatAttachControl } from "@/components/chat/ChatAttachControl";
import { ChatAttachmentChips } from "@/components/chat/ChatAttachmentChips";
import { ChatMessageAttachments } from "@/components/chat/ChatMessageAttachments";
import { useChatAttachments } from "@/hooks/useChatAttachments";
import {
  CHAT_ASSISTANT_COLLAPSED_MAX_HEIGHT,
  CHAT_USER_COLLAPSED_MAX_HEIGHT,
  ChatExpandableContent,
} from "@/components/chat/ChatExpandableContent";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Loader2, MessageSquare, Mic, MicOff, Send, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { startDiscoveryAudioRecording } from "../discoveryAudioRecorder.js";
import { stakeholderAnsweredQuestionIds } from "./discoveryThreadUtils";

export function PublicAnswerChatPanel({
  publicPath,
  email,
  questions = [],
  responses = [],
  onResponsesUpdate,
}) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Type anything — notes, fragments, or rough ideas. AI will generate a polished answer and add it to the matching question on the left.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [hintQuestionId, setHintQuestionId] = useState(null);
  const recordingSessionRef = useRef(null);
  const attach = useChatAttachments({
    upload: (file) => uploadPublicDiscoveryChatAttachment(publicPath, email, file),
  });

  const answeredIds = useMemo(
    () => stakeholderAnsweredQuestionIds(responses, email),
    [responses, email],
  );

  const unanswered = useMemo(
    () => (questions || []).filter((q) => !answeredIds.has(q.id)),
    [questions, answeredIds],
  );

  const hintQuestion = questions.find((q) => q.id === hintQuestionId);
  const hintIndex = hintQuestion ? questions.findIndex((q) => q.id === hintQuestion.id) : -1;
  const nextUnanswered = unanswered[0];
  const nextIndex = nextUnanswered ? questions.findIndex((q) => q.id === nextUnanswered.id) : -1;

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = (text || "").trim();
      const attachmentIds = attach.ids;
      if ((!trimmed && !attachmentIds.length) || sending || attach.uploading) return;

      setSending(true);
      const userMsg = { role: "user", content: trimmed, attachments: attach.readyItems };
      setMessages((m) => [...m, userMsg]);
      setInput("");
      attach.clear();
      try {
        const history = messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .slice(-10)
          .map((m) => ({ role: m.role, content: m.content }));
        const data = await postPublicDiscoveryChat(publicPath, {
          email,
          message: trimmed,
          conversationHistory: history,
          hintQuestionId: hintQuestionId || undefined,
          ...(attachmentIds.length ? { attachmentIds } : {}),
        });
        setMessages((m) => [...m, { role: "assistant", content: data.reply || "Got it." }]);
        if (data.responses) onResponsesUpdate?.(data.responses);
        if (data.matched?.length) {
          const labels = data.matched
            .map((row) => {
              const idx = questions.findIndex((q) => q.id === row.questionId);
              return idx >= 0 ? `Q${idx + 1}` : null;
            })
            .filter(Boolean);
          if (labels.length) toast.success(`Added to ${labels.join(", ")}`);
        }
      } catch (err) {
        toast.error(err?.error || "Chat failed");
        setMessages((m) => [...m, { role: "assistant", content: "Sorry, something went wrong." }]);
      } finally {
        setSending(false);
      }
    },
    [sending, messages, publicPath, email, onResponsesUpdate, hintQuestionId, questions, attach],
  );

  const toggleRecording = async () => {
    if (recording) {
      setRecording(false);
      const session = recordingSessionRef.current;
      recordingSessionRef.current = null;
      if (!session) return;

      setTranscribing(true);
      try {
        const { blob, filename } = await session.stop();
        const data = await transcribePublicDiscoveryAudio(publicPath, email, blob, filename);
        if (data?.text) setInput((prev) => (prev ? `${prev} ${data.text}` : data.text));
      } catch (err) {
        toast.error(err?.error || err?.message || "Transcription failed");
      } finally {
        setTranscribing(false);
      }
      return;
    }

    try {
      const session = await startDiscoveryAudioRecording();
      recordingSessionRef.current = session;
      setRecording(true);
    } catch (err) {
      toast.error(err?.message || "Microphone access denied");
    }
  };

  const draftPrompt =
    nextUnanswered && nextIndex >= 0
      ? `Help me draft an answer for Q${nextIndex + 1}`
      : "Help me improve my last answer";

  return (
    <aside className="w-full lg:w-[240px] shrink-0 border-t lg:border-t-0 lg:border-l flex flex-col bg-card/50 min-h-[280px] lg:min-h-0">
      <div className="flex items-center justify-between gap-1 border-b px-3 py-2.5 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <MessageSquare className="size-3.5 text-primary shrink-0" />
          <span className="text-xs font-semibold truncate">AI chat</span>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            OpenAI
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={toggleRecording}
            disabled={transcribing}
            title={recording ? "Stop and transcribe" : "Record audio"}
          >
            {transcribing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : recording ? (
              <MicOff className="size-3.5 text-destructive" />
            ) : (
              <Mic className="size-3.5" />
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "rounded-lg px-2.5 py-2 text-xs leading-relaxed",
              m.role === "user" ? "bg-primary/10 ml-4" : "bg-muted/60 mr-2",
            )}
          >
            {m.role === "assistant" && (
              <span className="font-medium text-[10px] text-muted-foreground block mb-0.5">
                AI assistant
              </span>
            )}
            <ChatExpandableContent
              collapsedMaxHeight={
                m.role === "user"
                  ? CHAT_USER_COLLAPSED_MAX_HEIGHT
                  : CHAT_ASSISTANT_COLLAPSED_MAX_HEIGHT
              }
              className="whitespace-pre-wrap"
            >
              <span>{m.content}</span>
            </ChatExpandableContent>
            {m.role === "user" ? <ChatMessageAttachments attachments={m.attachments} /> : null}
          </div>
        ))}
      </div>

      <div className="border-t p-2 space-y-2 shrink-0">
        {hintQuestion && (
          <div className="flex items-start gap-1 rounded-md border bg-primary/5 px-2 py-1.5">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium text-primary">
                Context: {hintIndex >= 0 ? `Q${hintIndex + 1}` : "question"}
              </p>
              <p className="text-[10px] text-muted-foreground line-clamp-2">{hintQuestion.text}</p>
            </div>
            <button
              type="button"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => setHintQuestionId(null)}
              aria-label="Clear context"
            >
              <X className="size-3" />
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className="text-[10px] rounded-full border px-2 py-0.5 text-muted-foreground hover:bg-muted/60 transition-colors"
            onClick={() => sendMessage("What's left?")}
          >
            What&apos;s left?
          </button>
          <button
            type="button"
            className="text-[10px] rounded-full border px-2 py-0.5 text-muted-foreground hover:bg-muted/60 transition-colors inline-flex items-center gap-0.5"
            onClick={() => sendMessage(draftPrompt)}
          >
            <Sparkles className="size-2.5" />
            Draft
          </button>
          {questions.slice(0, 6).map((q, qi) => (
            <button
              key={q.id}
              type="button"
              className={cn(
                "text-[10px] rounded-full border px-2 py-0.5 transition-colors",
                q.id === hintQuestionId
                  ? "bg-primary/10 border-primary/40 text-primary font-medium"
                  : answeredIds.has(q.id)
                    ? "text-muted-foreground/70 hover:bg-muted/60"
                    : "text-muted-foreground hover:bg-muted/60",
              )}
              onClick={() => setHintQuestionId((prev) => (prev === q.id ? null : q.id))}
              title={q.text}
            >
              Q{qi + 1}
            </button>
          ))}
        </div>

        <ChatAttachmentChips items={attach.items} onRemove={attach.remove} disabled={sending} />
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type anything — AI generates the answer…"
          rows={2}
          className="text-xs resize-none min-h-[52px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage(input);
            }
          }}
        />
        <div className="flex items-center gap-1">
          <ChatAttachControl
            disabled={sending || !email}
            uploading={attach.uploading}
            onFiles={(files) => void attach.addFiles(files)}
          />
        </div>
        <Button
          type="button"
          size="sm"
          className="w-full"
          disabled={sending || attach.uploading || (!input.trim() && !attach.ids.length)}
          onClick={() => sendMessage(input)}
        >
          {sending ? (
            <Loader2 className="size-3.5 animate-spin mr-1" />
          ) : (
            <Send className="size-3.5 mr-1" />
          )}
          Send
        </Button>
      </div>
    </aside>
  );
}
