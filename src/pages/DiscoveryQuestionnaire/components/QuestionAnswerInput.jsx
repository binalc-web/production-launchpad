import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Mic, MicOff, Send, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { startDiscoveryAudioRecording } from "../discoveryAudioRecorder.js";

function normalizeOptions(options) {
  if (Array.isArray(options)) {
    return options.map((o) => String(o ?? "").trim()).filter(Boolean);
  }
  if (typeof options === "string" && options.trim()) {
    return options
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function MultiselectAnswer({ options, disabled, sending, onSend }) {
  const [selected, setSelected] = useState([]);

  const toggle = (opt) => {
    setSelected((prev) => (prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt]));
  };

  const submit = async () => {
    if (selected.length === 0 || sending) return;
    await onSend(selected.join(", "));
    setSelected([]);
  };

  return (
    <div className="mt-3 space-y-3">
      <ul className="space-y-2">
        {options.map((opt, index) => {
          const checked = selected.includes(opt);
          const id = `multiselect-opt-${index}`;
          return (
            <li key={`${index}-${opt}`} className="flex items-center gap-2">
              <Checkbox
                id={id}
                checked={checked}
                disabled={disabled}
                onCheckedChange={() => toggle(opt)}
              />
              <label
                htmlFor={id}
                className="text-sm cursor-pointer select-none leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {opt}
              </label>
            </li>
          );
        })}
      </ul>
      <Button type="button" size="sm" disabled={disabled || selected.length === 0} onClick={submit}>
        {sending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
        Submit selection
      </Button>
    </div>
  );
}

export function QuestionAnswerInput({
  placeholder,
  onSend,
  onSuggest,
  onTranscribe,
  onUpload,
  disabled,
  type = "text",
  options = [],
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const recordingSessionRef = useRef(null);
  const fileInputRef = useRef(null);

  const choiceOptions = normalizeOptions(options);

  const send = async (value) => {
    const payload = value ?? text;
    if (!payload?.trim() || sending) return;
    setSending(true);
    try {
      await onSend(payload.trim());
      setText("");
      setSuggestion(null);
    } catch (err) {
      toast.error(err?.error || err?.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const toggleRecording = async () => {
    if (!onTranscribe) return;

    if (recording) {
      setRecording(false);
      const session = recordingSessionRef.current;
      recordingSessionRef.current = null;
      if (!session) return;

      setTranscribing(true);
      try {
        const { blob, filename } = await session.stop();
        const result = await onTranscribe(blob, filename);
        if (result?.text) setText((prev) => (prev ? `${prev} ${result.text}` : result.text));
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

  const loadSuggestion = async () => {
    if (!onSuggest || suggesting) return;
    setSuggesting(true);
    try {
      const result = await onSuggest(text.trim() || undefined);
      if (result?.suggestion) {
        setSuggestion(result.suggestion);
      } else {
        toast.error("No suggestion generated");
      }
    } catch (err) {
      toast.error(err?.error || err?.message || "Failed to generate suggestion");
    } finally {
      setSuggesting(false);
    }
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !onUpload || uploading) return;
    setUploading(true);
    try {
      await onUpload(file, text.trim() || undefined);
      setText("");
      setSuggestion(null);
      toast.success(`Uploaded ${file.name}`);
    } catch (err) {
      toast.error(err?.error || err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (type === "yesno") {
    return (
      <div className="flex gap-2 mt-3">
        {["Yes", "No"].map((opt) => (
          <Button
            key={opt}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || sending}
            onClick={() => send(opt)}
          >
            {opt}
          </Button>
        ))}
      </div>
    );
  }

  if (type === "singleselect" && choiceOptions.length > 0) {
    return (
      <div className="flex flex-wrap gap-2 mt-3" role="radiogroup" aria-label="Select one option">
        {choiceOptions.map((opt) => (
          <Button
            key={opt}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || sending}
            onClick={() => send(opt)}
            aria-pressed={false}
          >
            {opt}
          </Button>
        ))}
      </div>
    );
  }

  if (type === "multiselect" && choiceOptions.length > 0) {
    return (
      <MultiselectAnswer
        options={choiceOptions}
        disabled={disabled || sending}
        sending={sending}
        onSend={send}
      />
    );
  }

  return (
    <div className="mt-3 space-y-2">
      {suggestion && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-medium text-primary flex items-center gap-1">
              <Sparkles className="size-3" />
              AI suggestion
            </p>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setSuggestion(null)}
              aria-label="Dismiss suggestion"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <p className="text-sm leading-relaxed">{suggestion}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setText(suggestion)}>
              Use in box
            </Button>
            <Button type="button" size="sm" onClick={() => send(suggestion)} disabled={sending}>
              Apply & send
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || sending || transcribing || uploading}
          rows={2}
          className="min-h-[52px] text-sm resize-none flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <div className="flex flex-col gap-1 shrink-0">
          {onTranscribe && (
            <Button
              type="button"
              size="icon"
              variant={recording ? "destructive" : "outline"}
              disabled={disabled || transcribing || uploading}
              title={recording ? "Stop and transcribe" : "Record answer"}
              onClick={toggleRecording}
            >
              {transcribing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : recording ? (
                <MicOff className="size-4" />
              ) : (
                <Mic className="size-4" />
              )}
            </Button>
          )}
          {onSuggest && (
            <Button
              type="button"
              size="icon"
              variant="outline"
              disabled={disabled || suggesting || uploading}
              title="AI suggestion"
              onClick={loadSuggestion}
            >
              {suggesting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
            </Button>
          )}
          {type === "fileupload" && onUpload ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={handleFileSelected}
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                disabled={disabled || sending || uploading}
                title="Upload a file"
                aria-label="Upload a file"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
              </Button>
            </>
          ) : null}
          <Button
            type="button"
            size="icon"
            onClick={() => send()}
            disabled={disabled || sending || transcribing || uploading || !text.trim()}
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
