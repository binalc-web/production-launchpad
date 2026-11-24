import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (rel) =>
  readFileSync(new URL(`../src/pages/QaAnalytics/${rel}`, import.meta.url), "utf8");

import { withoutQaTargetReference } from "../src/pages/QaAnalytics/qaAnalyticsDisplay.js";

const PORTFOLIO_FILES = [
  "QaAnalyticsPortfolioPage.jsx",
  "components/QaAnalyticsKpiBand.jsx",
  "components/QaAnalyticsMatrix.jsx",
  "components/charts/QaAnalyticsActionMatrixChart.jsx",
  "components/charts/QaAnalyticsProjectsBarChart.jsx",
];

test("QA Analytics Portfolio renders no benchmark element", () => {
  for (const rel of PORTFOLIO_FILES) {
    const source = readSource(rel);
    assert.doesNotMatch(source, /benchmark/i, `${rel} must not render a benchmark`);
    assert.doesNotMatch(source, /leadership target/i, `${rel} must not reference the target line`);
  }
});

test("portfolio narrative renders without the pass-rate target reference", () => {
  const rendered = withoutQaTargetReference(
    "Quality needs attention: test-case pass rate is 56.6%, below the 85% target. " +
      "18 users were active in the QA App during this window.",
  );
  assert.equal(
    rendered,
    "Quality needs attention: test-case pass rate is 56.6%. " +
      "18 users were active in the QA App during this window.",
  );
  assert.doesNotMatch(rendered, /target|benchmark/i);

  const band = readSource("components/QaAnalyticsKpiBand.jsx");
  assert.match(band, /withoutQaTargetReference\(narrative\?\.text\)/);
});

test("portfolio charts still render their data without the benchmark line", () => {
  const projectsChart = readSource("components/charts/QaAnalyticsProjectsBarChart.jsx");
  assert.match(projectsChart, /<BarChart/);
  assert.match(projectsChart, /Top projects by test-case pass rate \(n ≥ 5\)\./);

  const matrixChart = readSource("components/charts/QaAnalyticsActionMatrixChart.jsx");
  assert.match(matrixChart, /<ScatterChart/);
  assert.doesNotMatch(matrixChart, /ReferenceLine/);

  const matrix = readSource("components/QaAnalyticsMatrix.jsx");
  assert.match(matrix, /Portfolio action matrix/);
  assert.match(matrix, /<QaAnalyticsActionMatrixChart points=\{points\} onSelect=\{onSelect\} \/>/);
});
