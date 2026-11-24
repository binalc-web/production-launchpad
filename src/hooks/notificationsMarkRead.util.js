/**
 * Build POST /api/notifications/read body from markRead() arguments.
 * @param {true | { all?: boolean } | string | string[] | number | number[]} idsOrAll
 * @returns {{ all: true } | { ids: Array<string|number> }}
 */
export function buildMarkNotificationsReadBody(idsOrAll) {
  if (idsOrAll === true || idsOrAll?.all) {
    return { all: true };
  }
  return {
    ids: Array.isArray(idsOrAll) ? idsOrAll : [idsOrAll].filter(Boolean),
  };
}

/**
 * Run mark-read against the API. Callers use fire-and-forget (`void markRead(...)`),
 * so auth/network failures must not reject — otherwise they surface as Sentry
 * unhandledrejection (e.g. AxiosError 401 after session expiry).
 *
 * @param {(body: object) => Promise<object>} markApi
 * @param {Parameters<typeof buildMarkNotificationsReadBody>[0]} idsOrAll
 * @returns {Promise<{ ok: true, body: object, data: object } | { ok: false, body: object, error: unknown }>}
 */
export async function runMarkNotificationsRead(markApi, idsOrAll) {
  const body = buildMarkNotificationsReadBody(idsOrAll);
  try {
    const data = await markApi(body);
    return { ok: true, body, data };
  } catch (error) {
    return { ok: false, body, error };
  }
}
