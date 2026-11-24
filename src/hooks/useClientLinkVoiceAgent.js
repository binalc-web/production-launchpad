import { useCallback, useEffect, useRef, useState } from "react";
import { clientLinkCreateVoiceSession, clientLinkVoiceDecide, clientLinkVoiceTool } from "@/api";
import { connectRealtimeVoice } from "@/lib/realtimeVoiceClient";
import {
  capturePreviewScreenshot,
  collectNavigateTargets,
  snapshotPreviewScreen,
  summarizeScreenSnapshot,
} from "@/lib/previewScreenContext";
import {
  buildDemoCandidates,
  fallbackDemoSteps,
  orderDemoSteps,
  performDemoClick,
  prepareDemoStep,
} from "@/lib/voiceDemoRunner";
import {
  VOICE_MARKERS,
  WORKING_DIRECTIVE,
  buildTurnDirective,
  fallbackResultOutcome,
  isLikelyNoiseTranscript,
} from "@/lib/clientLinkVoiceDirectives.util";

const SETTLE_REPORT_DELAY_MS = 1500;
const EXTERNAL_BUSY_CONFIRM_MS = 2000;
const SCREEN_PUSH_DEBOUNCE_MS = 1200;
const SPEAK_TIMEOUT_MS = 25000;
const WORK_START_GRACE_MS = 20000;
const MAX_TRANSCRIPT_ENTRIES = 80;
const JEV_TRANSCRIPT_TURNS = 12;

/** Fallback only; the voice-session response carries the server's turn detection config. */
const DEFAULT_TURN_DETECTION = {
  type: "server_vad",
  threshold: 0.6,
  prefix_padding_ms: 300,
  silence_duration_ms: 600,
  create_response: false,
  interrupt_response: false,
};

/**
 * UI status:
 * idle | connecting | listening | user-speaking | thinking | speaking | waiting | demo | error
 * @typedef {string} VoiceStatus
 */

/** @typedef {'conversation'|'working'|'reporting'|'demo'} VoicePhase */

function safeParseArgs(raw) {
  if (!raw || typeof raw !== "string") return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

/**
 * Hands-free voice loop for Client Link. Jev decides every step (via /voice-decide); OpenAI Realtime
 * only listens and speaks. While the Cursor agent runs the mic is off; afterwards the preview is demoed.
 *
 * @param {{
 *   projectSlug: string,
 *   releaseId: number | null,
 *   clientEmail: string,
 *   agentBusy: boolean,
 *   previewIframeRef: { current: HTMLIFrameElement | null } | null,
 *   previewPath: string,
 *   onStartWork: (prompt: string) => Promise<{ ok: boolean, queued?: boolean, error?: string } | undefined>,
 *   onStopWork: () => Promise<void> | void,
 *   getWorkStatus: () => Record<string, unknown>,
 *   onNavigatePreview: (path: string) => boolean,
 *   getPickedElementText: () => string | null,
 *   getCompletionReport: () => Promise<string> | string,
 *   onDemoCursor?: (cursor: object | null) => void,
 * }} opts
 */
export function useClientLinkVoiceAgent(opts) {
  const [status, setStatus] = useState(/** @type {VoiceStatus} */ ("idle"));
  const [phase, setPhaseState] = useState(/** @type {VoicePhase} */ ("conversation"));
  const [error, setError] = useState("");
  const [muted, setMutedState] = useState(false);
  const [transcript, setTranscript] = useState([]);

  const optsRef = useRef(opts);
  optsRef.current = opts;

  const connRef = useRef(null);
  const phaseRef = useRef(/** @type {VoicePhase} */ ("conversation"));
  const mutedRef = useRef(false);
  const responseActiveRef = useRef(false);
  const pendingResponseRef = useRef(null);
  const audioPlayingRef = useRef(false);
  const speechWaitersRef = useRef([]);
  const handledCallIdsRef = useRef(new Set());
  const jevTranscriptRef = useRef([]);
  const screenRef = useRef(null);
  const screenBeforeWorkRef = useRef(null);
  const lastPushedSummaryRef = useRef("");
  const lastRequestRef = useRef("");
  const pendingStopRef = useRef(false);
  const sawBusyRef = useRef(false);
  const workGraceTimerRef = useRef(null);
  const demoSignalRef = useRef({ cancelled: false });
  const turnSeqRef = useRef(0);
  const turnDetectionRef = useRef(DEFAULT_TURN_DETECTION);
  /** Read-only tool definitions from the session; the only tools offered on Jev "answer" turns. */
  const readToolsRef = useRef([]);

  const setPhase = useCallback((next) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  const pushEntry = useCallback((entry) => {
    setTranscript((prev) => {
      const next = [...prev, entry];
      return next.length > MAX_TRANSCRIPT_ENTRIES ? next.slice(-MAX_TRANSCRIPT_ENTRIES) : next;
    });
  }, []);

  const upsertEntry = useCallback((id, role, patch) => {
    setTranscript((prev) => {
      const idx = prev.findIndex((e) => e.id === id);
      if (idx < 0) {
        const next = [...prev, { id, role, text: "", final: false, ...patch(null) }];
        return next.length > MAX_TRANSCRIPT_ENTRIES ? next.slice(-MAX_TRANSCRIPT_ENTRIES) : next;
      }
      const next = prev.slice();
      next[idx] = { ...next[idx], ...patch(next[idx]) };
      return next;
    });
  }, []);

  const removeEntry = useCallback((id) => {
    setTranscript((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const rememberTurn = useCallback((role, text) => {
    const t = String(text || "").trim();
    if (!t) return;
    jevTranscriptRef.current = [...jevTranscriptRef.current, { role, text: t }].slice(
      -JEV_TRANSCRIPT_TURNS,
    );
  }, []);

  const send = useCallback((evt) => connRef.current?.send(evt), []);

  const applyMic = useCallback(() => {
    connRef.current?.setMuted(mutedRef.current || phaseRef.current !== "conversation");
  }, []);

  const setListening = useCallback(
    (on) => {
      send({
        type: "session.update",
        session: {
          type: "realtime",
          audio: {
            input: { turn_detection: on && !mutedRef.current ? turnDetectionRef.current : null },
          },
        },
      });
      if (!on || mutedRef.current) send({ type: "input_audio_buffer.clear" });
      applyMic();
    },
    [applyMic, send],
  );

  const resolveSpeechWaiters = useCallback(() => {
    const waiters = speechWaitersRef.current;
    speechWaitersRef.current = [];
    for (const w of waiters) w();
  }, []);

  const requestResponse = useCallback(
    (response) => {
      const evt = response ? { type: "response.create", response } : { type: "response.create" };
      if (responseActiveRef.current) {
        pendingResponseRef.current = evt;
        return;
      }
      responseActiveRef.current = true;
      send(evt);
    },
    [send],
  );

  /** Response override that only exposes read-only tools, so start_work is unreachable. */
  const readOnlyResponse = useCallback(
    () =>
      readToolsRef.current.length
        ? { tools: readToolsRef.current, tool_choice: "auto" }
        : { tool_choice: "none" },
    [],
  );

  const addContextMessage = useCallback(
    (text, imageUrl = null) => {
      const content = [{ type: "input_text", text }];
      if (imageUrl) content.push({ type: "input_image", image_url: imageUrl });
      send({ type: "conversation.item.create", item: { type: "message", role: "user", content } });
    },
    [send],
  );

  /**
   * Speak per a decision directive; resolves once playback finishes (or times out).
   * Tools are off unless the caller opts in, so the model cannot start work on its own.
   */
  const speak = useCallback(
    (directive, response = { tool_choice: "none" }) =>
      new Promise((resolve) => {
        if (!connRef.current) return resolve();
        const timer = setTimeout(resolve, SPEAK_TIMEOUT_MS);
        speechWaitersRef.current.push(() => {
          clearTimeout(timer);
          resolve();
        });
        addContextMessage(`${VOICE_MARKERS.DECISION} ${directive}`);
        requestResponse(response);
      }),
    [addContextMessage, requestResponse],
  );

  const takeSnapshot = useCallback(() => {
    const o = optsRef.current;
    const snap = snapshotPreviewScreen(o.previewIframeRef?.current ?? null, {
      pickedElement: o.getPickedElementText?.() || null,
    });
    const next = snap || { route: o.previewPath || "/", title: "", text: "", elements: [] };
    screenRef.current = next;
    return next;
  }, []);

  const pushScreenContext = useCallback(
    async ({ force = false, withImage = true } = {}) => {
      if (!connRef.current) return;
      const snap = takeSnapshot();
      const summary = summarizeScreenSnapshot(snap);
      if (!force && summary === lastPushedSummaryRef.current) return;
      lastPushedSummaryRef.current = summary;
      const image = withImage
        ? await capturePreviewScreenshot(optsRef.current.previewIframeRef?.current ?? null)
        : null;
      if (!connRef.current) return;
      addContextMessage(`${VOICE_MARKERS.SCREEN}\n${summary}`, image);
    },
    [addContextMessage, takeSnapshot],
  );

  const decide = useCallback(async (stage, extra = {}) => {
    const o = optsRef.current;
    const snap = screenRef.current;
    try {
      const res = await clientLinkVoiceDecide(o.projectSlug, o.clientEmail, {
        stage,
        transcript: jevTranscriptRef.current,
        screen: {
          route: snap?.route || o.previewPath || "/",
          title: snap?.title || "",
          text: summarizeScreenSnapshot(snap),
          pickedElement: snap?.pickedElement || null,
        },
        navigateTargets: collectNavigateTargets(snap),
        agent: (() => {
          const s = o.getWorkStatus();
          return {
            busy: Boolean(s.busy),
            phase: String(s.phase || ""),
            progress: String(s.progress || ""),
          };
        })(),
        pendingStop: pendingStopRef.current,
        lastRequest: lastRequestRef.current,
        ...extra,
      });
      return res?.source === "jev" ? res.decision : null;
    } catch {
      return null;
    }
  }, []);

  const resumeListening = useCallback(() => {
    optsRef.current.onDemoCursor?.(null);
    setPhase("conversation");
    setListening(true);
    setStatus("listening");
  }, [setListening, setPhase]);

  const enterWorking = useCallback(
    ({ announce }) => {
      if (phaseRef.current === "working") return;
      setPhase("working");
      screenBeforeWorkRef.current = screenRef.current || takeSnapshot();
      sawBusyRef.current = Boolean(optsRef.current.agentBusy);
      setListening(false);
      setStatus("waiting");
      clearTimeout(workGraceTimerRef.current);
      workGraceTimerRef.current = setTimeout(() => {
        if (phaseRef.current === "working" && !sawBusyRef.current) {
          void speak("The change didn't start. Say so briefly and ask whether to try again.").then(
            resumeListening,
          );
        }
      }, WORK_START_GRACE_MS);
      if (announce) void speak(WORKING_DIRECTIVE);
    },
    [resumeListening, setListening, setPhase, speak, takeSnapshot],
  );

  const runDemo = useCallback(
    async (report) => {
      const o = optsRef.current;
      const after = screenRef.current;
      const candidates = buildDemoCandidates({
        before: screenBeforeWorkRef.current,
        after,
        report,
      });
      let steps = [];
      if (candidates.length) {
        const decision = await decide("demo", { candidates, report });
        steps = decision?.steps
          ? orderDemoSteps(candidates, decision.steps)
          : fallbackDemoSteps(candidates);
      }
      if (!connRef.current) return;
      setPhase("demo");
      setStatus("demo");
      if (!steps.length) {
        await speak("Summarize what changed in two sentences using the run report and the screen.");
        return;
      }
      await speak(
        `In one sentence, summarize what changed, then say you'll walk them through it on the preview (${steps.length} stop${steps.length > 1 ? "s" : ""}).`,
      );
      const signal = { cancelled: false };
      demoSignalRef.current = signal;
      const iframe = () => o.previewIframeRef?.current ?? null;
      const setCursor = (c) => o.onDemoCursor?.(c);
      let stop = 0;
      for (const step of steps) {
        if (signal.cancelled || !connRef.current) break;
        const prepared = await prepareDemoStep({
          iframe: iframe(),
          step,
          navigate: (route) => o.onNavigatePreview(route),
          setCursor,
          signal,
        });
        if (!prepared || signal.cancelled) continue;
        stop += 1;
        const verb = step.action === "click" ? "clicking" : "pointing at";
        await Promise.all([
          speak(
            `Demo stop ${stop}: you are ${verb} "${step.label}" on ${step.route} (${step.reason}). Narrate it in one sentence, focused on what changed.`,
          ),
          performDemoClick({ iframe: iframe(), prepared, setCursor, signal }),
        ]);
        takeSnapshot();
      }
      o.onDemoCursor?.(null);
      if (!stop && connRef.current && !signal.cancelled) {
        await speak("Summarize what changed in two sentences using the run report and the screen.");
      }
    },
    [decide, setPhase, speak, takeSnapshot],
  );

  const finishWork = useCallback(async () => {
    clearTimeout(workGraceTimerRef.current);
    setPhase("reporting");
    setStatus("thinking");
    let report = "";
    try {
      report = String((await optsRef.current.getCompletionReport()) || "").trim();
    } catch {
      report = "";
    }
    if (!connRef.current) return;
    pushEntry({
      id: `done-${Date.now()}`,
      role: "event",
      text: "Coding agent finished",
      final: true,
    });
    await pushScreenContext({ force: true });
    addContextMessage(
      `${VOICE_MARKERS.WORK_FINISHED}\n${report || "The run finished but returned no summary."}`,
    );

    const decision = await decide("result", { report });
    const outcome = decision?.outcome || fallbackResultOutcome(report);
    if (outcome === "demo") {
      await runDemo(report);
      if (!connRef.current) return;
      await speak("Wrap up in one sentence and ask what they'd like to change next.");
    } else if (outcome === "report_failure") {
      await speak(
        "Explain plainly that the run failed, using the report, and suggest one next step.",
      );
    } else {
      await speak(
        "Say the run finished without visible changes, and ask how they'd like to proceed.",
      );
    }
    if (!connRef.current) return;
    void pushScreenContext();
    resumeListening();
  }, [
    addContextMessage,
    decide,
    pushEntry,
    pushScreenContext,
    resumeListening,
    runDemo,
    setPhase,
    speak,
  ]);

  const handleUserTurn = useCallback(
    async (text) => {
      if (phaseRef.current !== "conversation") return;
      rememberTurn("user", text);
      const seq = ++turnSeqRef.current;
      setStatus("thinking");
      takeSnapshot();
      const decision = await decide("turn");
      if (seq !== turnSeqRef.current || phaseRef.current !== "conversation" || !connRef.current)
        return;

      const o = optsRef.current;
      if (decision?.action === "navigate" && decision.navigateTarget) {
        o.onNavigatePreview(decision.navigateTarget);
      }
      if (decision?.action === "stop_confirmed") {
        await o.onStopWork();
      }
      pendingStopRef.current = decision?.action === "confirm_stop";

      const { directive, forceStartWork, allowReadTools } = buildTurnDirective(decision);
      void speak(
        directive,
        forceStartWork
          ? { tool_choice: { type: "function", name: "start_work" } }
          : allowReadTools
            ? readOnlyResponse()
            : decision
              ? undefined
              : { tool_choice: "auto" },
      );
    },
    [decide, readOnlyResponse, rememberTurn, speak, takeSnapshot],
  );

  const runTool = useCallback(
    async (name, args) => {
      const o = optsRef.current;
      if (name === "get_preview_context") {
        return { ok: true, screen: summarizeScreenSnapshot(takeSnapshot()) };
      }
      if (readToolsRef.current.some((t) => t.name === name)) {
        const res = await clientLinkVoiceTool(
          o.projectSlug,
          o.releaseId,
          o.clientEmail,
          name,
          args,
        );
        return res?.ok ? res.result : { ok: false, error: "Could not load that information." };
      }
      if (name !== "start_work") return { ok: false, error: `Unknown tool ${name}` };
      const prompt = typeof args.prompt === "string" ? args.prompt.trim() : "";
      if (!prompt) return { ok: false, error: "prompt is required" };
      pushEntry({
        id: `work-${Date.now()}`,
        role: "event",
        text: args.spoken_summary?.trim() || "Sent the change to the coding agent",
        final: true,
      });
      takeSnapshot();
      const result = await o.onStartWork(prompt);
      if (!result?.ok) {
        return { ok: false, error: result?.error || "The request could not be sent." };
      }
      lastRequestRef.current = prompt;
      return { ok: true, status: result.queued ? "queued" : "working" };
    },
    [pushEntry, takeSnapshot],
  );

  const handleFunctionCalls = useCallback(
    async (calls) => {
      let started = false;
      let failure = "";
      for (const call of calls) {
        let output;
        try {
          output = await runTool(call.name, safeParseArgs(call.arguments));
        } catch (err) {
          output = { ok: false, error: err?.message || String(err) };
        }
        if (call.name === "start_work") {
          if (output.ok) started = true;
          else failure = output.error;
        }
        send({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: call.call_id,
            output: JSON.stringify(output),
          },
        });
      }
      if (started) {
        enterWorking({ announce: true });
      } else if (failure) {
        void speak(`Tell the user the change could not be sent: ${failure}`);
      } else if (calls.every((c) => readToolsRef.current.some((t) => t.name === c.name))) {
        requestResponse(readOnlyResponse());
      } else {
        requestResponse();
      }
    },
    [enterWorking, readOnlyResponse, requestResponse, runTool, send, speak],
  );

  const handleEvent = useCallback(
    (evt) => {
      const conversing = phaseRef.current === "conversation";
      switch (evt?.type) {
        case "input_audio_buffer.speech_started":
          if (conversing) {
            setStatus("user-speaking");
            if (evt.item_id) upsertEntry(evt.item_id, "user", () => ({}));
          }
          break;
        case "input_audio_buffer.speech_stopped":
          if (conversing) setStatus("thinking");
          break;
        case "input_audio_buffer.committed":
          if (conversing && evt.item_id) upsertEntry(evt.item_id, "user", () => ({}));
          break;
        case "conversation.item.input_audio_transcription.delta":
          if (conversing && evt.item_id) {
            upsertEntry(evt.item_id, "user", (cur) => ({
              text: (cur?.text || "") + (evt.delta || ""),
            }));
          }
          break;
        case "conversation.item.input_audio_transcription.failed":
          if (evt.item_id) removeEntry(evt.item_id);
          if (conversing && !responseActiveRef.current) setStatus("listening");
          break;
        case "conversation.item.input_audio_transcription.completed": {
          if (!evt.item_id) break;
          const text = (evt.transcript || "").trim();
          if (isLikelyNoiseTranscript(text)) {
            removeEntry(evt.item_id);
            if (conversing && !responseActiveRef.current) setStatus("listening");
            break;
          }
          upsertEntry(evt.item_id, "user", () => ({ text, final: true }));
          void handleUserTurn(text);
          break;
        }
        case "response.created":
          responseActiveRef.current = true;
          break;
        case "response.output_audio_transcript.delta":
        case "response.audio_transcript.delta":
          if (evt.item_id) {
            upsertEntry(evt.item_id, "assistant", (cur) => ({
              text: (cur?.text || "") + (evt.delta || ""),
            }));
          }
          break;
        case "response.output_audio_transcript.done":
        case "response.audio_transcript.done":
          if (evt.item_id) {
            const text = (evt.transcript || "").trim();
            upsertEntry(evt.item_id, "assistant", (cur) => ({
              text: text || cur?.text || "",
              final: true,
            }));
            rememberTurn("assistant", text);
          }
          break;
        case "output_audio_buffer.started":
          audioPlayingRef.current = true;
          if (conversing) setStatus("speaking");
          break;
        case "output_audio_buffer.stopped":
        case "output_audio_buffer.cleared":
          audioPlayingRef.current = false;
          resolveSpeechWaiters();
          if (conversing) setStatus("listening");
          break;
        case "response.done": {
          responseActiveRef.current = false;
          const output = Array.isArray(evt.response?.output) ? evt.response.output : [];
          const calls = output.filter(
            (item) =>
              item?.type === "function_call" &&
              item.call_id &&
              !handledCallIdsRef.current.has(item.call_id),
          );
          for (const c of calls) handledCallIdsRef.current.add(c.call_id);
          if (pendingResponseRef.current) {
            const next = pendingResponseRef.current;
            pendingResponseRef.current = null;
            responseActiveRef.current = true;
            send(next);
          }
          if (calls.length) {
            void handleFunctionCalls(calls);
          } else {
            setTimeout(() => {
              if (!audioPlayingRef.current) resolveSpeechWaiters();
            }, 400);
            if (conversing) setStatus((s) => (s === "thinking" ? "listening" : s));
          }
          break;
        }
        case "error": {
          const msg = evt.error?.message || "Voice error";
          if (/active response/i.test(msg)) break;
          pushEntry({
            id: `err-${Date.now()}`,
            role: "event",
            text: msg,
            final: true,
            tone: "error",
          });
          break;
        }
        default:
          break;
      }
    },
    [
      handleFunctionCalls,
      handleUserTurn,
      pushEntry,
      rememberTurn,
      removeEntry,
      resolveSpeechWaiters,
      send,
      upsertEntry,
    ],
  );

  const stop = useCallback(() => {
    const conn = connRef.current;
    connRef.current = null;
    conn?.close();
    demoSignalRef.current.cancelled = true;
    clearTimeout(workGraceTimerRef.current);
    optsRef.current.onDemoCursor?.(null);
    responseActiveRef.current = false;
    pendingResponseRef.current = null;
    audioPlayingRef.current = false;
    resolveSpeechWaiters();
    mutedRef.current = false;
    setMutedState(false);
    phaseRef.current = "conversation";
    setPhaseState("conversation");
    setStatus("idle");
  }, [resolveSpeechWaiters]);

  const start = useCallback(async () => {
    if (connRef.current) return;
    const o = optsRef.current;
    if (!o.projectSlug || o.releaseId == null) {
      setError("Select a version before starting voice mode.");
      setStatus("error");
      return;
    }
    setError("");
    setStatus("connecting");
    try {
      const session = await clientLinkCreateVoiceSession(o.projectSlug, o.releaseId, o.clientEmail);
      turnDetectionRef.current =
        session?.turnDetection && typeof session.turnDetection === "object"
          ? session.turnDetection
          : DEFAULT_TURN_DETECTION;
      readToolsRef.current = Array.isArray(session?.readTools) ? session.readTools : [];
      const conn = await connectRealtimeVoice({
        clientSecret: session.clientSecret,
        onEvent: (evt) => handleEvent(evt),
        onDisconnect: () => {
          if (connRef.current === conn) stop();
        },
      });
      connRef.current = conn;
      handledCallIdsRef.current = new Set();
      jevTranscriptRef.current = [];
      lastPushedSummaryRef.current = "";
      pendingStopRef.current = false;
      phaseRef.current = "conversation";
      setPhaseState("conversation");
      applyMic();
      setStatus("listening");
      await pushScreenContext({ force: true, withImage: false });
      if (optsRef.current.agentBusy) {
        enterWorking({ announce: true });
      } else {
        void speak(
          "Greet the user in one short sentence, mention what you see on their current page, and ask what they'd like to change.",
        ).then(() => pushScreenContext({ force: true }));
      }
    } catch (err) {
      connRef.current = null;
      const msg =
        err?.name === "NotAllowedError"
          ? "Microphone access was blocked. Allow it in the browser to use voice mode."
          : err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            "Could not start voice mode.";
      setError(String(msg));
      setStatus("error");
    }
  }, [applyMic, enterWorking, handleEvent, pushScreenContext, speak, stop]);

  const setMuted = useCallback(
    (next) => {
      mutedRef.current = next;
      setMutedState(next);
      if (!connRef.current) return;
      if (phaseRef.current !== "conversation") {
        applyMic();
        return;
      }
      setListening(!next);
      if (next) {
        setTranscript((prev) => prev.filter((e) => e.role !== "user" || e.final || e.text));
        setStatus((s) => (s === "user-speaking" ? "listening" : s));
      }
    },
    [applyMic, setListening],
  );

  const getLevels = useCallback(() => connRef.current?.getLevels() ?? { mic: 0, agent: 0 }, []);

  const { agentBusy, previewPath } = opts;
  const finishWorkRef = useRef(finishWork);
  finishWorkRef.current = finishWork;
  const enterWorkingRef = useRef(enterWorking);
  enterWorkingRef.current = enterWorking;

  useEffect(() => {
    if (!connRef.current) return;
    if (agentBusy) {
      if (phaseRef.current !== "conversation") {
        sawBusyRef.current = true;
        return;
      }
      // Busy we didn't dispatch (e.g. the chat's post-turn reconnect) must hold before it counts.
      const timer = setTimeout(() => {
        if (phaseRef.current !== "conversation" || !optsRef.current.agentBusy) return;
        sawBusyRef.current = true;
        enterWorkingRef.current({ announce: true });
      }, EXTERNAL_BUSY_CONFIRM_MS);
      return () => clearTimeout(timer);
    }
    if (phaseRef.current !== "working" || !sawBusyRef.current) return;
    const timer = setTimeout(() => {
      if (phaseRef.current !== "working" || optsRef.current.agentBusy) return;
      sawBusyRef.current = false;
      void finishWorkRef.current();
    }, SETTLE_REPORT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [agentBusy]);

  useEffect(() => {
    if (!connRef.current || phaseRef.current !== "conversation") return;
    const timer = setTimeout(() => void pushScreenContext(), SCREEN_PUSH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [previewPath, pushScreenContext]);

  useEffect(
    () => () => {
      clearTimeout(workGraceTimerRef.current);
      connRef.current?.close();
    },
    [],
  );

  return {
    status,
    phase,
    error,
    muted,
    transcript,
    active: status !== "idle" && status !== "error",
    start,
    stop,
    setMuted,
    getLevels,
  };
}
