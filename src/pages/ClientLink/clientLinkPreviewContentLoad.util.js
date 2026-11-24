/** Progressive copy while the embed iframe shell is loaded but the app is still compiling. */
export const PREVIEW_CONTENT_LOAD_MESSAGES = {
  fetching: "Fetching Website Contents for You",
  compiling: "Compiling preview modules…",
  stillLoading: "Still loading preview…",
};

/** True while the iframe content poll is active (shell loaded, app still hydrating). */
export const isPreviewContentLoadMessage = (message) =>
  Object.values(PREVIEW_CONTENT_LOAD_MESSAGES).includes(String(message ?? "").trim());
