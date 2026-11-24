export const AUDIO_MIN_BYTES = 400;
export const RECORD_TIMESLICE_MS = 250;

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
  "audio/wav",
];

export function pickAudioRecorderMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  for (const mimeType of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mimeType)) return mimeType;
  }
  return "";
}

export function extensionForAudioMime(mimeType) {
  const base = String(mimeType || "").split(";")[0].trim().toLowerCase();
  if (base.includes("webm")) return "webm";
  if (base.includes("mp4") || base.includes("m4a")) return "m4a";
  if (base.includes("ogg")) return "ogg";
  if (base.includes("wav")) return "wav";
  if (base.includes("mpeg") || base.includes("mp3")) return "mp3";
  return "webm";
}

export function isAudioRecordingSupported() {
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== "undefined"
  );
}

/**
 * Start microphone capture. Call stop() on the returned handle to finish and get a blob.
 */
export async function startDiscoveryAudioRecording() {
  if (!isAudioRecordingSupported()) {
    throw new Error("Audio recording is not supported in this browser");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const mimeType = pickAudioRecorderMimeType();
  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  const effectiveMime = mimeType || recorder.mimeType || "audio/webm";
  const chunks = [];

  recorder.ondataavailable = (event) => {
    if (event.data?.size > 0) chunks.push(event.data);
  };

  recorder.start(RECORD_TIMESLICE_MS);

  return {
    stop() {
      return new Promise((resolve, reject) => {
        if (recorder.state === "inactive") {
          stream.getTracks().forEach((t) => t.stop());
          reject(new Error("Recording already stopped"));
          return;
        }

        recorder.onerror = () => {
          stream.getTracks().forEach((t) => t.stop());
          reject(new Error("Recording failed"));
        };

        recorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(chunks, { type: effectiveMime });
          if (blob.size < AUDIO_MIN_BYTES) {
            reject(new Error("Recording too short — speak a little longer, then stop"));
            return;
          }
          resolve({
            blob,
            mimeType: effectiveMime,
            filename: `recording.${extensionForAudioMime(effectiveMime)}`,
          });
        };

        try {
          recorder.stop();
        } catch (err) {
          stream.getTracks().forEach((t) => t.stop());
          reject(err instanceof Error ? err : new Error("Failed to stop recording"));
        }
      });
    },
    cancel() {
      if (recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          /* ignore */
        }
      }
      stream.getTracks().forEach((t) => t.stop());
      chunks.length = 0;
    },
  };
}
