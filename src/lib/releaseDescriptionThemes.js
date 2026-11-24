/**
 * Serialize a theme tree (one epic + stories per item) to release description markdown.
 * Output must match `parseReleaseDescriptionForJira` in
 * `frontend/src/utils/releaseDescriptionJiraDisplayParse.js` / backend Jira parser (round-trip and sync).
 *
 * When every epic has no title, no body, and no story text, returns `""` so callers can persist
 * `description: null` instead of an empty **Features:** shell.
 */

/** One epic with one empty story row for new drafts. */
export function createEmptyThemes() {
  return [
    {
      title: "",
      epicDescriptionMarkdown: "",
      features: [{ name: "", bodyMarkdown: "" }],
    },
  ];
}

/**
 * True when there is no user-facing text in any epic title/body or story name/body.
 * Ignores `jiraIssueKey` and other non-text metadata used for Jira sync.
 *
 * @param {unknown} themes
 * @returns {boolean}
 */
export function themesEffectivelyEmpty(themes) {
  if (!Array.isArray(themes) || themes.length === 0) return true;
  return themes.every((t) => {
    if (!t || typeof t !== "object") return true;
    const title = typeof t.title === "string" ? t.title.trim() : "";
    const body =
      typeof t.epicDescriptionMarkdown === "string"
        ? t.epicDescriptionMarkdown.trim()
        : "";
    if (title || body) return false;
    const feats = Array.isArray(t.features) ? t.features : [];
    if (feats.length === 0) return true;
    return feats.every((f) => {
      if (!f || typeof f !== "object") return true;
      const n = typeof f.name === "string" ? f.name.trim() : "";
      const b = typeof f.bodyMarkdown === "string" ? f.bodyMarkdown.trim() : "";
      return !n && !b;
    });
  });
}

/**
 * @param {Array<{ title: string, epicDescriptionMarkdown: string, features: Array<{ name: string, bodyMarkdown: string }> }>} themes
 * @returns {string}
 */
export function themesToMarkdown(themes) {
  if (!Array.isArray(themes) || themes.length === 0) {
    return "";
  }
  if (themesEffectivelyEmpty(themes)) {
    return "";
  }
  const lines = [];
  lines.push("");
  for (const t of themes) {
    const title = typeof t.title === "string" ? t.title.trim() : "";
    lines.push(`### ${title}`);
    lines.push("");
    const body =
      typeof t.epicDescriptionMarkdown === "string"
        ? t.epicDescriptionMarkdown.trim()
        : "";
    if (body) {
      lines.push(body);
      lines.push("");
    }
    lines.push("**Features:**");
    const feats = Array.isArray(t.features) ? t.features : [];
    for (const f of feats) {
      const n = typeof f.name === "string" ? f.name.trim() : "";
      const b = typeof f.bodyMarkdown === "string" ? f.bodyMarkdown.trim() : "";
      lines.push(`- **${n}** — ${b}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

/**
 * After loading a release from DB, attach `jiraIssueKey` to each theme/story that maps to
 * `jiraReleaseSync` by index (used when saving edits to push to the correct Jira issues).
 *
 * @param {Array<Record<string, unknown>>} themes
 * @param {null|{ epics?: Array<{ key?: string, url?: string, stories?: Array<{ key?: string, url?: string, summary?: string }> }> } | undefined} jiraReleaseSync
 * @returns {Array<Record<string, unknown>>}
 */
export function mergeJiraKeysFromReleaseSync(themes, jiraReleaseSync) {
  const list = Array.isArray(themes) ? themes : [];
  const epics = jiraReleaseSync?.epics;
  if (!Array.isArray(epics) || epics.length === 0) {
    return list;
  }
  return list.map((t, i) => {
    const e = epics[i];
    if (!e) return t;
    const ek =
      e.key && typeof e.key === "string" && e.key.trim() ? e.key.trim() : "";
    const nextFeatures = (Array.isArray(t.features) ? t.features : []).map(
      (f, j) => {
        const st = e.stories?.[j];
        const sk =
          st?.key && typeof st.key === "string" && st.key.trim()
            ? st.key.trim()
            : "";
        if (!sk) return f;
        return { ...f, jiraIssueKey: sk };
      },
    );
    if (!ek) {
      return { ...t, features: nextFeatures };
    }
    return { ...t, jiraIssueKey: ek, features: nextFeatures };
  });
}

/**
 * One API suggestion row → one canonical theme (same shape as the release description editor).
 *
 * @param {{ releaseTheme?: string, elevatorPitch?: string, clientFit?: string, riskOrAssumption?: string, features?: Array<{ name?: string, userValue?: string, competitiveAngle?: string }> }} s
 * @returns {{ title: string, epicDescriptionMarkdown: string, features: Array<{ name: string, bodyMarkdown: string }> }}
 */
export function suggestionApiRowToTheme(s) {
  const t = s && typeof s === "object" ? s : {};
  if (t.epic && typeof t.epic === "object") {
    const title = typeof t.epic.title === "string" ? t.epic.title.trim() : "";
    const epicDescriptionMarkdown =
      typeof t.epic.description === "string" ? t.epic.description.trim() : "";
    const clientFit = typeof t.clientFit === "string" ? t.clientFit.trim() : "";
    const risk =
      typeof t.riskOrAssumption === "string" ? t.riskOrAssumption.trim() : "";
    const bodyLines = [];
    if (epicDescriptionMarkdown) bodyLines.push(epicDescriptionMarkdown);
    if (clientFit) bodyLines.push(`**Client fit:** ${clientFit}`);
    if (risk) {
      bodyLines.push("");
      bodyLines.push(`**Risk / assumption:** ${risk}`);
    }
    const stories = Array.isArray(t.stories) ? t.stories : [];
    const features = stories.map((st) => ({
      name: typeof st?.title === "string" ? st.title : "",
      bodyMarkdown: typeof st?.body === "string" ? st.body : "",
    }));
    return {
      title,
      epicDescriptionMarkdown: bodyLines.join("\n\n"),
      features: features.length ? features : [{ name: "", bodyMarkdown: "" }],
    };
  }
  const title = typeof t.releaseTheme === "string" ? t.releaseTheme.trim() : "";
  const pitch =
    typeof t.elevatorPitch === "string" ? t.elevatorPitch.trim() : "";
  const clientFit = typeof t.clientFit === "string" ? t.clientFit.trim() : "";
  const risk =
    typeof t.riskOrAssumption === "string" ? t.riskOrAssumption.trim() : "";
  const bodyLines = [];
  if (pitch) {
    bodyLines.push(pitch);
  }
  bodyLines.push(`**Client fit:** ${clientFit || "—"}`);
  if (risk) {
    bodyLines.push("");
    bodyLines.push(`**Risk / assumption:** ${risk}`);
  }
  const epicDescriptionMarkdown = bodyLines.join("\n\n");
  const feats = Array.isArray(t.features) ? t.features : [];
  const features = feats.map((f) => {
    const name = typeof f?.name === "string" ? f.name : "";
    const userValue = typeof f?.userValue === "string" ? f.userValue : "";
    const angleRaw =
      f?.competitiveAngle != null ? String(f.competitiveAngle).trim() : "";
    const angle = angleRaw ? ` *(${angleRaw})*` : "";
    return {
      name,
      bodyMarkdown: `${userValue}${angle}`,
    };
  });
  return {
    title,
    epicDescriptionMarkdown,
    features: features.length ? features : [{ name: "", bodyMarkdown: "" }],
  };
}
