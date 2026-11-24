import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { OVERLAY_LAYERS } from "../src/components/ui/overlayLayers.js";

const z = (cls) => Number(cls.match(/z-\[(\d+)\]/)[1]);

test("modal layer is above IDE; menus are above modals", () => {
  assert.equal(OVERLAY_LAYERS.modal, "z-[100]");
  assert.ok(z(OVERLAY_LAYERS.modal) > 60);
  assert.ok(z(OVERLAY_LAYERS.floating) > z(OVERLAY_LAYERS.modal));
  const select = readFileSync(
    fileURLToPath(new URL("../src/components/ui/select.jsx", import.meta.url)),
    "utf8",
  );
  assert.match(select, /OVERLAY_LAYERS\.floating/);
});

test("dialog, sheet, and drawer overlay+content share the modal layer", () => {
  for (const rel of [
    "../src/components/ui/dialog.jsx",
    "../src/components/ui/sheet.jsx",
    "../src/components/ui/drawer.jsx",
  ]) {
    const file = readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
    assert.equal(
      file.split("OVERLAY_LAYERS.modal").length - 1,
      2,
      `${rel} overlay and content must use the same modal layer`,
    );
  }
});
