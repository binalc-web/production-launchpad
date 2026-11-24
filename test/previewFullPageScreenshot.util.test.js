import test from "node:test";
import assert from "node:assert/strict";
import {
  FULL_PAGE_SHOT_MAX_AREA_SAFARI,
  buildFullPageShotFilename,
  buildScreenZipEntryName,
  buildScreensZipFilename,
  computeFullPageShotScale,
  defaultPreviewScreenName,
  isSafariUserAgent,
  mergePreviewScreenRoutes,
  previewRouteFromHref,
  previewScreenRouteKey,
} from "../src/lib/previewFullPageScreenshot.util.js";

test("previewScreenRouteKey keeps hash routes and drops queries and anchors", () => {
  assert.equal(previewScreenRouteKey("/deals/?tab=open"), "/deals");
  assert.equal(previewScreenRouteKey("/pricing#faq"), "/pricing");
  assert.equal(previewScreenRouteKey("/#/deals/42?x=1"), "/#/deals/42");
  assert.equal(previewScreenRouteKey("/#/"), "/");
  assert.equal(previewScreenRouteKey("settings//team/"), "/settings/team");
  assert.equal(previewScreenRouteKey(""), "");
});

test("previewRouteFromHref keeps in-app links only", () => {
  const origin = "https://app.launchpad.test";
  assert.equal(previewRouteFromHref(`${origin}/embedded/5173/deals?x=1`, origin), "/deals");
  assert.equal(previewRouteFromHref(`${origin}/embedded/5173`, origin), "/");
  assert.equal(previewRouteFromHref("/settings/team", origin), "/settings/team");
  assert.equal(previewRouteFromHref("https://google.com/a", origin), "");
  assert.equal(previewRouteFromHref("mailto:a@b.c", origin), "");
  assert.equal(previewRouteFromHref(`${origin}/files/report.pdf`, origin), "");
  assert.equal(previewRouteFromHref(`${origin}/api/health`, origin), "");
});

test("mergePreviewScreenRoutes dedupes, drops excluded and orders home, current, A→Z", () => {
  const routes = mergePreviewScreenRoutes({
    current: "/deals?tab=1",
    sources: [["/settings", "/deals", "/login"], new Set(["/", "/about/", "/settings"])],
    isExcluded: (r) => r === "/login",
  });
  assert.deepEqual(routes, ["/", "/deals", "/about", "/settings"]);
});

test("ZIP filenames keep export order", () => {
  const date = new Date(2026, 9, 7, 18, 5, 9);
  assert.equal(
    buildScreensZipFilename({ projectName: "Acme CRM", date }),
    "acme-crm-screens-20261007-180509.zip",
  );
  assert.equal(buildScreenZipEntryName(0, "/"), "01-home.png");
  assert.equal(buildScreenZipEntryName(11, "/deals/new-deal"), "12-deals-new-deal.png");
});

test("defaultPreviewScreenName turns routes into frame names", () => {
  assert.equal(defaultPreviewScreenName("/"), "Home");
  assert.equal(defaultPreviewScreenName(""), "Home");
  assert.equal(defaultPreviewScreenName("/deals/new-deal?tab=1"), "Deals / New deal");
  assert.equal(defaultPreviewScreenName("/team_settings/%E2%9C%93"), "Team settings / ✓");
});

test("computeFullPageShotScale uses 2x for normal pages", () => {
  assert.equal(computeFullPageShotScale(1440, 4000), 2);
});

test("computeFullPageShotScale keeps very long pages under the max dimension", () => {
  const scale = computeFullPageShotScale(1440, 40000);
  assert.ok(40000 * scale <= 32000);
});

test("computeFullPageShotScale respects the Safari area cap", () => {
  const scale = computeFullPageShotScale(1440, 6000, { maxArea: FULL_PAGE_SHOT_MAX_AREA_SAFARI });
  assert.ok(1440 * scale * 6000 * scale <= FULL_PAGE_SHOT_MAX_AREA_SAFARI);
  assert.ok(scale < 2);
});

test("isSafariUserAgent distinguishes Safari from Chrome", () => {
  assert.equal(
    isSafariUserAgent(
      "Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
    ),
    true,
  );
  assert.equal(
    isSafariUserAgent(
      "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
    ),
    false,
  );
});

test("buildFullPageShotFilename slugs project and route", () => {
  const date = new Date(2026, 9, 7, 18, 5, 9);
  assert.equal(
    buildFullPageShotFilename({ projectName: "Acme CRM!", route: "/deals/42?tab=x", date }),
    "acme-crm-deals-42-20261007-180509.png",
  );
  assert.equal(
    buildFullPageShotFilename({ projectName: "", route: "/", date }),
    "preview-home-20261007-180509.png",
  );
});
