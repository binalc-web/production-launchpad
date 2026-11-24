import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildStoredZipParts, crc32 } from "../src/lib/zipStore.util.js";

test("crc32 matches the standard check value", () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
});

function hasCommand(cmd, args) {
  try {
    execFileSync(cmd, args, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const READ_ZIP_PY = `
import json, sys, zipfile
with zipfile.ZipFile(sys.argv[1]) as z:
    assert z.testzip() is None
    print(json.dumps({i.filename: z.read(i).decode("latin-1") for i in z.infolist()}))
`;

test("buildStoredZipParts produces an archive zip readers verify and extract", (t) => {
  if (!hasCommand("python3", ["--version"])) {
    t.skip("python3 not installed");
    return;
  }
  const dir = mkdtempSync(path.join(tmpdir(), "zipstore-"));
  try {
    const first = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
    const second = new TextEncoder().encode("second screen ✓");
    const parts = buildStoredZipParts([
      { name: "01-home.png", bytes: first },
      { name: "02-deals-ü.png", bytes: second },
    ]);
    const zipPath = path.join(dir, "screens.zip");
    writeFileSync(zipPath, Buffer.concat(parts.map((p) => Buffer.from(p))));
    if (hasCommand("unzip", ["-v"])) execFileSync("unzip", ["-tq", zipPath]);
    const out = JSON.parse(
      execFileSync("python3", ["-c", READ_ZIP_PY, zipPath], { encoding: "utf8" }),
    );
    assert.deepEqual(Object.keys(out), ["01-home.png", "02-deals-ü.png"]);
    assert.deepEqual(Buffer.from(out["01-home.png"], "latin1"), Buffer.from(first));
    assert.equal(Buffer.from(out["02-deals-ü.png"], "latin1").toString("utf8"), "second screen ✓");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
