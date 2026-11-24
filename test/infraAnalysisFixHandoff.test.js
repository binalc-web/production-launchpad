import test from "node:test";
import assert from "node:assert/strict";
import { buildInfraAnalysisFixPrompt } from "../src/utils/infraAnalysisFixHandoff.util.js";

test("buildInfraAnalysisFixPrompt includes all suggestion fields", () => {
  const prompt = buildInfraAnalysisFixPrompt({
    title: "Add ALB health checks",
    detail: "Targets lack health check configuration.",
    reason: "Failed targets stay in rotation.",
    severity: "high",
    category: "reliability",
    actionType: "add_health_check",
    affectedFiles: ["infra/alb.yml", "infra/asg.yml"],
    relatedNodeIds: ["alb-1", "asg-1"],
    relatedNodeLabels: ["Application Load Balancer", "Auto Scaling Group"],
  });
  assert.match(prompt, /Add ALB health checks/);
  assert.match(prompt, /Severity: high/);
  assert.match(prompt, /Category: reliability/);
  assert.match(prompt, /Action type: add_health_check/);
  assert.match(prompt, /Targets lack health check configuration/);
  assert.match(prompt, /Failed targets stay in rotation/);
  assert.match(prompt, /infra\/alb\.yml, infra\/asg\.yml/);
  assert.match(prompt, /Application Load Balancer, Auto Scaling Group/);
  assert.match(prompt, /alb-1, asg-1/);
  assert.match(prompt, /Implement the infrastructure improvement/);
});

test("buildInfraAnalysisFixPrompt falls back to description then reason", () => {
  const fromDescription = buildInfraAnalysisFixPrompt({
    title: "Secure S3",
    description: "Bucket is public.",
  });
  assert.match(fromDescription, /Bucket is public/);

  const fromReason = buildInfraAnalysisFixPrompt({
    title: "Secure S3",
    reason: "Public access not needed.",
  });
  assert.match(fromReason, /Public access not needed/);
  assert.doesNotMatch(fromReason, /\nReason:/);
});
