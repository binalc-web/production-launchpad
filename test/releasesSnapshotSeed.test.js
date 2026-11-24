import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("useSeedReleasesSnapshot seeds releases without Releases section mount", () => {
  const ctx = readFileSync(
    join(root, "src/pages/Project/ProductManagement/ReleasesSnapshotContext.jsx"),
    "utf8",
  );
  assert.match(ctx, /export function useSeedReleasesSnapshot/);
  assert.match(ctx, /fetchReleases/);

  const journey = readFileSync(
    join(root, "src/pages/Project/ProjectDetails/components/ProjectJourneyShell.jsx"),
    "utf8",
  );
  assert.match(journey, /useSeedReleasesSnapshot\(project\?\.id/);

  const implement = readFileSync(
    join(
      root,
      "src/pages/Project/ProjectDetails/components/console/ConsoleImplementPage.jsx",
    ),
    "utf8",
  );
  assert.match(implement, /Loading active release/);
  assert.match(implement, /snapshot\?\.loading/);
});
