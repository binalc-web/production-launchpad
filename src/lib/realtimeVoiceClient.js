const OPENAI_REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";

function createLevelMeter(audioCtx, stream) {
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);
  const buf = new Uint8Array(analyser.fftSize);
  return () => {
    analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i += 1) {
      const v = (buf[i] - 128) / 128;
      sum += v * v;
    }
    return Math.min(1, Math.sqrt(sum / buf.length) * 3);
  };
}

/**
 * Browser WebRTC connection to OpenAI Realtime using an ephemeral client secret.
 * @param {{ clientSecret: string, onEvent: (evt: any) => void, onDisconnect?: () => void }} opts
 */
export async function connectRealtimeVoice({ clientSecret, onEvent, onDisconnect }) {
  if (!navigator?.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
    throw new Error("This browser does not support voice mode.");
  }

  const mic = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      // Auto gain boosts quiet background chatter up to speech level between sentences.
      autoGainControl: true,
    },
  });

  const pc = new RTCPeerConnection();
  const audioEl = document.createElement("audio");
  audioEl.autoplay = true;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audioCtx = AudioCtx ? new AudioCtx() : null;
  const readMicLevel = audioCtx ? createLevelMeter(audioCtx, mic) : () => 0;
  let readRemoteLevel = () => 0;

  pc.ontrack = (e) => {
    const [remote] = e.streams;
    audioEl.srcObject = remote;
    if (audioCtx && remote) readRemoteLevel = createLevelMeter(audioCtx, remote);
  };
  for (const track of mic.getTracks()) pc.addTrack(track, mic);

  const dc = pc.createDataChannel("oai-events");
  dc.addEventListener("message", (e) => {
    try {
      onEvent(JSON.parse(e.data));
    } catch {
      /* non-JSON frame */
    }
  });

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    try {
      dc.close();
    } catch {
      /* ignore */
    }
    try {
      pc.close();
    } catch {
      /* ignore */
    }
    for (const t of mic.getTracks()) t.stop();
    audioEl.srcObject = null;
    void audioCtx?.close().catch(() => {});
    onDisconnect?.();
  };

  pc.addEventListener("connectionstatechange", () => {
    if (pc.connectionState === "failed" || pc.connectionState === "closed") close();
  });

  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const res = await fetch(OPENAI_REALTIME_CALLS_URL, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${clientSecret}`,
        "Content-Type": "application/sdp",
      },
    });
    if (!res.ok) {
      throw new Error(`Voice connection was rejected (${res.status}).`);
    }
    await pc.setRemoteDescription({ type: "answer", sdp: await res.text() });
    await new Promise((resolve, reject) => {
      if (dc.readyState === "open") return resolve();
      const timer = setTimeout(() => reject(new Error("Voice channel timed out.")), 15000);
      dc.addEventListener(
        "open",
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
    });
  } catch (err) {
    close();
    throw err;
  }

  return {
    send(evt) {
      if (dc.readyState === "open") dc.send(JSON.stringify(evt));
    },
    setMuted(muted) {
      for (const t of mic.getAudioTracks()) t.enabled = !muted;
    },
    getLevels() {
      return { mic: readMicLevel(), agent: readRemoteLevel() };
    },
    close,
  };
}
