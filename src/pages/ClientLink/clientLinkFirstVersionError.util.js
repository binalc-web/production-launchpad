/** @param {unknown} err */
export function normalizeFirstVersionBuildError(err) {
  const status =
    err?.status ??
    err?.response?.status ??
    (/\b403\b/.test(String(err?.message || "")) ? 403 : null);

  const apiMsg =
    err?.response?.data?.error ||
    err?.error ||
    err?.message ||
    "Could not start the AI build.";

  const text = String(apiMsg || "").trim();

  if (status === 403 || /403|forbidden|not authorized|stakeholder/i.test(text)) {
    return {
      code: 403,
      message:
        "Access denied (403). Your email may not be on this project's stakeholder list. Update your email and try again, or contact your Launchpad team.",
    };
  }

  return {
    code: status || null,
    message: text || "Could not start the AI build.",
  };
}
