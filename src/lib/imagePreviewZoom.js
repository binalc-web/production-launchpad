export const MIN_SCALE = 1;
export const MAX_SCALE = 5;
export const ZOOM_STEP = 1.25;

function clampScale(scale) {
  const n = Number(scale);
  if (!Number.isFinite(n)) return MIN_SCALE;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, n));
}

function normalize(state) {
  const scale = clampScale(state?.scale);
  if (scale === MIN_SCALE) return { scale, x: 0, y: 0 };
  return {
    scale,
    x: Number.isFinite(Number(state?.x)) ? Number(state.x) : 0,
    y: Number.isFinite(Number(state?.y)) ? Number(state.y) : 0,
  };
}

export function createImageZoomState() {
  return { scale: MIN_SCALE, x: 0, y: 0 };
}

export function resetImageZoom() {
  return createImageZoomState();
}

export function zoomBy(state, factor) {
  const current = normalize(state);
  const f = Number(factor);
  if (!Number.isFinite(f) || f <= 0) return { ...current };
  return normalize({ scale: current.scale * f, x: current.x, y: current.y });
}

export function scaleFromPinchDistance(state, startDistance, currentDistance) {
  const current = normalize(state);
  const start = Number(startDistance);
  const now = Number(currentDistance);
  if (!Number.isFinite(start) || !Number.isFinite(now) || start <= 0 || now <= 0) {
    return { ...current };
  }
  return normalize({ scale: current.scale * (now / start), x: current.x, y: current.y });
}

export function clampPan(state, viewport, content) {
  const current = normalize(state);
  if (current.scale === MIN_SCALE) return { ...current };
  const vw = Number(viewport?.width);
  const vh = Number(viewport?.height);
  const cw = Number(content?.width);
  const ch = Number(content?.height);
  if (![vw, vh, cw, ch].every((v) => Number.isFinite(v) && v > 0)) return { ...current };
  const maxX = Math.max(0, (cw * current.scale - vw) / 2);
  const maxY = Math.max(0, (ch * current.scale - vh) / 2);
  return {
    scale: current.scale,
    x: Math.min(maxX, Math.max(-maxX, current.x)),
    y: Math.min(maxY, Math.max(-maxY, current.y)),
  };
}