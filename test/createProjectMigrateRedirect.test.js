import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

test("CreateProject migrate onboarding redirects to Project Details, not client preview link", () => {
  const createProjectPath = fileURLToPath(
    new URL("../src/pages/Project/CreateProject/CreateProject.jsx", import.meta.url),
  );
  const source = readFileSync(createProjectPath, "utf8");

  assert.match(
    source,
    /buildMigrateOnboardingDetailsPath/,
    "migrate onboarding must use shared Details path helper",
  );
  assert.doesNotMatch(
    source,
    /waitForOnboardMigratePreviewWithStream/,
    "migrate onboarding must not poll preview before redirect",
  );

  const migratePreviewRedirect = source.match(
    /method\s*===\s*["']migrate["'][\s\S]{0,1200}buildOnboardPreviewQueryString/,
  );
  assert.equal(
    migratePreviewRedirect,
    null,
    "migrate method must not pair with buildOnboardPreviewQueryString client-link redirect",
  );
});

test("handleMigrateInvitationAccepted passes pending state and persists stream handoff", () => {
  const createProjectPath = fileURLToPath(
    new URL("../src/pages/Project/CreateProject/CreateProject.jsx", import.meta.url),
  );
  const source = readFileSync(createProjectPath, "utf8");
  const fnStart = source.indexOf("const handleMigrateInvitationAccepted = useCallback");
  assert.ok(fnStart >= 0);
  const fnEnd = source.indexOf("const handleInitialize = useCallback", fnStart);
  assert.ok(fnEnd > fnStart);
  const fnBody = source.slice(fnStart, fnEnd);
  assert.match(fnBody, /migrateOnboardingPending:\s*\{\s*releaseId\s*\}/);
  assert.match(fnBody, /persistMigrateOnboardingStreamHandoff/);
  assert.match(fnBody, /startMigrateOnboardingAgent/);
});

test("handleInitialize captures migrate form before setStep(5)", () => {
  const createProjectPath = fileURLToPath(
    new URL("../src/pages/Project/CreateProject/CreateProject.jsx", import.meta.url),
  );
  const source = readFileSync(createProjectPath, "utf8");
  const fnStart = source.indexOf("const handleInitialize = useCallback");
  assert.ok(fnStart >= 0);
  const fnEnd = source.indexOf("const migrateIntegrationCard = useMemo", fnStart);
  assert.ok(fnEnd > fnStart);
  const fnBody = source.slice(fnStart, fnEnd);
  const migrateSnapshotIdx = fnBody.indexOf("let migrateInitSnapshot");
  const setStepIdx = fnBody.indexOf("\n      setStep(5);");
  assert.ok(migrateSnapshotIdx >= 0, "migrate snapshot must exist");
  assert.ok(setStepIdx > migrateSnapshotIdx, "migrate snapshot must be captured before setStep(5)");
  assert.match(fnBody, /payload\.branch = branch/);
});

test("buildProjectBackendCodePath returns backend code tab URL", async () => {
  const { buildProjectBackendCodePath } = await import("../src/lib/onboardPreviewUrl.js");
  assert.equal(
    buildProjectBackendCodePath(60),
    "/projects/details/60?section=backend&area=backend-code",
  );
  assert.equal(buildProjectBackendCodePath("bad"), null);
});

test("ClientLink preview passes backend plan agent logs link", () => {
  const clientLinkPath = fileURLToPath(
    new URL("../src/pages/ClientLink/ClientLink.jsx", import.meta.url),
  );
  const source = readFileSync(clientLinkPath, "utf8");
  assert.match(source, /buildProjectBackendCodePath/);
  assert.match(source, /logsHref=\{buildProjectBackendCodePath\(publicProject\?\.id\)\}/);
});

test("CreateProject persists backend cloud prefs at create time", () => {
  const createProjectPath = fileURLToPath(
    new URL("../src/pages/Project/CreateProject/CreateProject.jsx", import.meta.url),
  );
  const source = readFileSync(createProjectPath, "utf8");

  assert.match(source, /withBackendCloudPrefs/);
  assert.match(
    source,
    /createProject\(\s*withBackendCloudPrefs/,
    "onboarding must send backend prefs on createProject, not only via updateProject",
  );
  assert.match(
    source,
    /await applyBackendCloudPreferences\(ensuredProject\.id, backendCloudPrefs\)/,
    "onboarding must re-apply prefs after init when migrate links a dev repo",
  );
});

test("CreateProject sends Hub projectId whenever hubProjectId is selected", () => {
  const createProjectPath = fileURLToPath(
    new URL("../src/pages/Project/CreateProject/CreateProject.jsx", import.meta.url),
  );
  const source = readFileSync(createProjectPath, "utf8");

  assert.match(source, /function withHubProjectId\(/);
  assert.match(source, /withHubProjectId\([\s\S]{0,400}hubProjectId/);
  assert.doesNotMatch(
    source,
    /hubMode === "hub" && hubProjectId \? String\(hubProjectId\)/,
    "Hub id must not be gated on hubMode at submit time",
  );
});
