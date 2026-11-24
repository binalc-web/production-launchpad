/**
 * Normalize agent/workspace absolute paths to repo-relative paths for browse/compare.
 * @param {unknown} rawPath
 * @returns {string}
 */
export function normalizeAgentRepoPath(rawPath) {
  let path = String(rawPath || "")
    .trim()
    .replace(/\\/g, "/");
  if (!path) return "";

  path = path.replace(/^\.\//, "");

  // Cloud/agent workdirs: …/repo/development-1/backend/… → backend/…
  const afterDevMount = path.match(/(?:^|\/)development(?:-\d+)?\/(.+)$/i);
  if (afterDevMount?.[1]) {
    path = afterDevMount[1];
  } else {
    const repoIdx = path.search(/\/repo\//i);
    if (repoIdx >= 0) {
      path = path.slice(repoIdx + "/repo/".length);
      path = path.replace(/^development(?:-\d+)?\//i, "");
    } else {
      const prefixes = ["/workspace/", "/app/", "/home/ubuntu/", "/home/user/", "/repo/", "/src/"];
      for (const prefix of prefixes) {
        if (path.startsWith(prefix)) {
          path = path.slice(prefix.length);
          break;
        }
      }
      path = path.replace(/^development(?:-\d+)?\//i, "");
    }
  }

  if (path.startsWith("/")) {
    path = path.replace(/^\/+/, "");
  }

  path = path.replace(/^(?:repo|project|workspace)\//i, "");

  return path;
}
