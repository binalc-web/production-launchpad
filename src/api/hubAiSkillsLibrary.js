import axios from "axios";
import config from "../config/index.js";

const API_URL = config.API_URL;
const MAX_SKILL_PAGES = 25;

function getHubAccessToken() {
  return (localStorage.getItem("access_token") || localStorage.getItem("token") || "").trim();
}

function launchpadRequestHeaders() {
  const headers = { Accept: "application/json" };
  const launchpadToken = localStorage.getItem("token");
  if (launchpadToken) {
    headers.Authorization = `Bearer ${launchpadToken}`;
  }
  const hubToken = getHubAccessToken();
  if (hubToken) {
    headers["X-Hub-Access-Token"] = hubToken;
  }
  return headers;
}

/**
 * @param {unknown} hubJson
 * @returns {{ data: object[], meta: object }}
 */
export function normalizeAiSkillsListResponse(hubJson) {
  const envelope = hubJson?.data ?? hubJson;
  const inner = envelope?.data ?? envelope;
  const rows = Array.isArray(inner?.data)
    ? inner.data
    : Array.isArray(inner)
      ? inner
      : Array.isArray(envelope)
        ? envelope
        : [];
  const meta = inner?.meta ?? envelope?.meta ?? hubJson?.meta ?? {};
  return { data: rows, meta };
}

/**
 * @param {{ page?: number, limit?: number, tab?: string }} [opts]
 */
export async function listPublicAiSkills(opts = {}) {
  const page = Number(opts.page) > 0 ? Number(opts.page) : 1;
  const limit = Number(opts.limit) > 0 ? Number(opts.limit) : 20;
  const tab = typeof opts.tab === "string" && opts.tab.trim() ? opts.tab.trim() : "public";

  const { data: res } = await axios.get(`${API_URL}/api/hub/ai-skills-library`, {
    headers: launchpadRequestHeaders(),
    params: { page, limit, tab },
  });

  return normalizeAiSkillsListResponse(res);
}

/** Paginate public skills until hasNext is false or page cap reached. */
export async function fetchAllPublicAiSkills() {
  const all = [];
  let page = 1;
  const limit = 20;

  for (let i = 0; i < MAX_SKILL_PAGES; i += 1) {
    const { data, meta } = await listPublicAiSkills({
      page,
      limit,
      tab: "public",
    });
    all.push(...data);
    if (!meta?.hasNext) break;
    page += 1;
  }

  return all;
}

/** @param {Array<{ id?: string, title?: string }>} skills */
export function getSkillLabel(skills, skillId) {
  if (!skillId) return null;
  const match = skills.find((s) => s.id === skillId);
  if (match?.title) return match.title;
  return skillId;
}

/** @param {Array<{ id?: string, description?: string }>} skills */
export function getSkillDescription(skills, skillId) {
  if (!skillId) return null;
  return skills.find((s) => s.id === skillId)?.description || null;
}

export function getHubAccessTokenForApi() {
  return getHubAccessToken();
}
