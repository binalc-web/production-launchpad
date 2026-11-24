import { themesToMarkdown } from "@/lib/releaseDescriptionThemes";

/** @param {number} epicIdx */
export function releaseDescriptionEpicExcludedPath(epicIdx) {
  return `e:${epicIdx}`;
}

/** @param {number} epicIdx @param {number} storyIdx */
export function releaseDescriptionStoryExcludedPath(epicIdx, storyIdx) {
  return `e:${epicIdx}:s:${storyIdx}`;
}

/**
 * @param {Array<{ title: string, epicDescriptionMarkdown: string, features: Array<{ name: string, bodyMarkdown: string }> }>} themes
 * @param {Set<string>|Iterable<string>} excludedPaths
 * @returns {{
 *   effectiveMarkdown: string,
 *   effectiveThemes: Array<unknown>,
 *   parseFull: { ok: boolean, themes?: unknown, reason?: string, detail?: string },
 *   jiraParseEffective: { ok: boolean, themes?: unknown, reason?: string, detail?: string },
 *   isEmptyAfterExclusions: boolean,
 * }}
 */
export function buildEffectiveReleaseDescriptionResult(themes, excludedPaths) {
  const raw = Array.isArray(themes) ? themes : [];
  const set =
    excludedPaths instanceof Set
      ? excludedPaths
      : new Set(excludedPaths ? [...excludedPaths] : []);

  if (raw.length === 0) {
    return {
      effectiveMarkdown: "",
      effectiveThemes: [],
      parseFull: { ok: false, reason: "empty" },
      jiraParseEffective: { ok: false, reason: "empty" },
      isEmptyAfterExclusions: true,
    };
  }

  const parseFull = { ok: true, themes: raw };

  if (set.size === 0) {
    const effectiveMarkdown = themesToMarkdown(raw);
    return {
      effectiveMarkdown,
      effectiveThemes: raw,
      parseFull,
      jiraParseEffective: parseFull,
      isEmptyAfterExclusions: !String(effectiveMarkdown).trim(),
    };
  }

  const filtered = [];
  for (let i = 0; i < raw.length; i++) {
    const epicKey = releaseDescriptionEpicExcludedPath(i);
    if (set.has(epicKey)) continue;

    const t = raw[i];
    const feats = Array.isArray(t.features) ? t.features : [];
    const keptStories = feats.filter(
      (_, j) => !set.has(releaseDescriptionStoryExcludedPath(i, j)),
    );
    if (keptStories.length === 0) continue;

    filtered.push({
      ...t,
      features: keptStories,
    });
  }

  const effectiveMarkdown = themesToMarkdown(filtered);
  const jiraParseEffective =
    filtered.length > 0
      ? { ok: true, themes: filtered }
      : { ok: false, reason: "empty" };

  return {
    effectiveMarkdown,
    effectiveThemes: filtered,
    parseFull,
    jiraParseEffective,
    isEmptyAfterExclusions: filtered.length === 0,
  };
}

/**
 * @param {Array<{ title: string, epicDescriptionMarkdown: string, features: Array<{ name: string, bodyMarkdown: string }> }>} themes
 * @param {Set<string>|Iterable<string>} excludedPaths
 * @returns {string}
 */
export function buildEffectiveReleaseDescriptionMarkdown(
  themes,
  excludedPaths,
) {
  return buildEffectiveReleaseDescriptionResult(themes, excludedPaths)
    .effectiveMarkdown;
}

/**
 * @param {Array<{ title: string, features?: Array<unknown> }>} themes
 * @param {Set<string>} excludedPaths
 * @returns {Set<string>}
 */
export function pruneReleaseDescriptionExcludedPaths(themes, excludedPaths) {
  const list = Array.isArray(themes) ? themes : [];
  if (!excludedPaths?.size) {
    return new Set();
  }

  const next = new Set();
  for (const key of excludedPaths) {
    const epicOnly = /^e:(\d+)$/.exec(key);
    const withStory = /^e:(\d+):s:(\d+)$/.exec(key);
    if (epicOnly) {
      const i = Number(epicOnly[1]);
      if (i >= 0 && i < list.length) next.add(key);
    } else if (withStory) {
      const i = Number(withStory[1]);
      const j = Number(withStory[2]);
      const theme = list[i];
      const nStories = Array.isArray(theme?.features)
        ? theme.features.length
        : 0;
      if (i >= 0 && i < list.length && j >= 0 && j < nStories) {
        next.add(key);
      }
    }
  }
  return next;
}
