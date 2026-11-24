import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_SCALE,
  MIN_SCALE,
  ZOOM_STEP,
  clampPan,
  createImageZoomState,
  resetImageZoom,
  scaleFromPinchDistance,
  zoomBy,
} from "../src/lib/imagePreviewZoom.js";

test("zoom-in increases scale by ZOOM_STEP and zoom-out clamps at fit with zero pan", () => {
  const start = createImageZoomState();
  assert.deepEqual(start, { scale: 1, x: 0, y: 0 });
  const zoomed = zoomBy(start, ZOOM_STEP);
  assert.equal(zoomed.scale, ZOOM_STEP);
  const back = zoomBy({ scale: 1.1, x: 40, y: -20 }, 0.5);
  assert.equal(back.scale, MIN_SCALE);
  assert.deepEqual({ x: back.x, y: back.y }, { x: 0, y: 0 });
});

test("zoom clamps at MAX_SCALE and reset returns fit", () => {
  assert.equal(zoomBy({ scale: 4.9, x: 0, y: 0 }, ZOOM_STEP).scale, MAX_SCALE);
  assert.deepEqual(resetImageZoom(), { scale: 1, x: 0, y: 0 });
});

test("pinch distance doubling scales proportionally and clamps", () => {
  assert.equal(scaleFromPinchDistance({ scale: 1.5, x: 0, y: 0 }, 100, 200).scale, 3);
  assert.equal(scaleFromPinchDistance({ scale: 4, x: 0, y: 0 }, 100, 300).scale, MAX_SCALE);
  assert.deepEqual(scaleFromPinchDistance({ scale: 2, x: 1, y: 1 }, 0, 100), { scale: 2, x: 1, y: 1 });
});

test("clampPan keeps image within bounds and centres at fit", () => {
  const clamped = clampPan({ scale: 2, x: 999, y: -999 }, { width: 200, height: 100 }, { width: 200, height: 100 });
  assert.deepEqual(clamped, { scale: 2, x: 100, y: -50 });
  assert.deepEqual(clampPan({ scale: 1, x: 50, y: 50 }, { width: 200, height: 100 }, { width: 200, height: 100 }), {
    scale: 1,
    x: 0,
    y: 0,
  });
});

test("zoom helpers do not mutate input state", () => {
  const input = { scale: 2, x: 10, y: 5 };
  zoomBy(input, ZOOM_STEP);
  scaleFromPinchDistance(input, 10, 20);
  clampPan(input, { width: 100, height: 100 }, { width: 100, height: 100 });
  assert.deepEqual(input, { scale: 2, x: 10, y: 5 });
});
