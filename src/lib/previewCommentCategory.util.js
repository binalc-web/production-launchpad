/** Preview UI comment category values (matches backend enum). */
export const PREVIEW_COMMENT_CATEGORIES = ["comments", "logic"];

/** @typedef {"comments" | "logic"} PreviewCommentCategory */

/** Thread panel / composer section keys (same values as category). */
export const PREVIEW_COMMENT_SECTIONS = PREVIEW_COMMENT_CATEGORIES;

/** @typedef {PreviewCommentCategory} PreviewCommentSection */

/** Human-readable labels for comment categories. */
export const PREVIEW_COMMENT_CATEGORY_LABELS = {
  comments: "What to change",
  logic: "How it should work",
};

/** Short helper text shown under section tabs in composer and thread panels. */
export const PREVIEW_COMMENT_CATEGORY_HELPER_TEXT = {
  comments: "Describe what looks wrong or what you'd like different.",
  logic: "Describe the rules or behavior this element should follow.",
};

/** Textarea placeholders by section. */
export const PREVIEW_COMMENT_CATEGORY_PLACEHOLDERS = {
  comments: "What should change here?",
  logic: "Describe the logic or rules for this element…",
};

/** Validation messages when posting empty content. */
export const PREVIEW_COMMENT_CATEGORY_VALIDATION = {
  comments: "Please describe what should change.",
  logic: "Please describe how this should work.",
};

/** Primary submit button labels by section. */
export const PREVIEW_COMMENT_CATEGORY_SUBMIT_LABELS = {
  comments: "Post feedback",
  logic: "Save rules",
};

/** Floating panel width shared by composer and thread panels. */
export const PREVIEW_COMMENT_PANEL_WIDTH_CLASS = "w-[min(92vw,420px)]";

/** Badge styling for sidebar list chips. */
export const PREVIEW_COMMENT_CATEGORY_BADGE_CLASS = {
  comments: "border-border bg-muted text-foreground",
  logic: "border-border bg-muted text-foreground",
};

/** Outer panel / composer shell by section. */
export const PREVIEW_COMMENT_CATEGORY_PANEL_CLASS = {
  comments: "border-border bg-card ring-1 ring-sky-500/20",
  logic: "border-border bg-card ring-1 ring-violet-500/20",
};

/** Inner message list background by section. */
export const PREVIEW_COMMENT_CATEGORY_MESSAGE_CLASS = {
  comments: "border-border bg-muted",
  logic: "border-border bg-muted",
};

/** Active tab fill in horizontal section toggle. */
export const PREVIEW_COMMENT_CATEGORY_TAB_ACTIVE_CLASS = {
  comments: "border border-border bg-muted text-foreground shadow-sm dark:text-foreground",
  logic: "border border-border bg-muted text-foreground shadow-sm dark:text-foreground",
};

/** Sidebar list card accent by category. */
export const PREVIEW_COMMENT_CATEGORY_LIST_BORDER_CLASS = {
  comments: "ring-1 ring-inset ring-sky-500/25",
  logic: "ring-1 ring-inset ring-violet-500/25",
};

/** Maps legacy API values to current categories. */
const LEGACY_CATEGORY_MAP = {
  functionality: "comments",
  other: "comments",
};

/**
 * @param {unknown} value
 * @returns {PreviewCommentCategory}
 */
export function normalizePreviewCommentCategory(value) {
  const key = typeof value === "string" ? value.trim().toLowerCase() : "comments";
  const mapped = LEGACY_CATEGORY_MAP[key] || key;
  return PREVIEW_COMMENT_CATEGORIES.includes(mapped) ? mapped : "comments";
}

/**
 * @param {unknown} section
 * @returns {PreviewCommentSection}
 */
export function normalizePreviewCommentSection(section) {
  return normalizePreviewCommentCategory(section);
}

/**
 * @param {unknown} category
 * @returns {string}
 */
export function previewCommentCategoryLabel(category) {
  const key = normalizePreviewCommentCategory(category);
  return PREVIEW_COMMENT_CATEGORY_LABELS[key] || PREVIEW_COMMENT_CATEGORY_LABELS.comments;
}

/**
 * Element label from anchor payload for panel headers.
 * @param {{ anchor?: { reactComponentStack?: string[], tag?: string } } | null | undefined} commentOrAnchor
 * @returns {string}
 */
export function previewCommentElementLabel(commentOrAnchor) {
  const anchor = commentOrAnchor?.anchor ?? commentOrAnchor;
  const stack = anchor?.reactComponentStack;
  if (Array.isArray(stack) && stack[0]) return stack[0];
  if (typeof anchor?.tag === "string" && anchor.tag.trim()) return anchor.tag.trim();
  return "Element";
}

/**
 * @param {unknown} email
 * @returns {string}
 */
function formatCommentAuthorLabel(email) {
  return typeof email === "string" && email.trim() ? email.trim() : "Team";
}

/**
 * @param {{ authorEmail?: string | null, body?: string | null }} message
 * @param {number} index
 * @returns {string}
 */
function formatThreadMessageBlock(message, index) {
  const body = typeof message?.body === "string" ? message.body.trim() : "";
  if (!body) return "";
  const author = formatCommentAuthorLabel(message.authorEmail);
  return `${index}. ${author}:\n${body}`;
}

/**
 * Conversation only (root body + replies) for Fix with AI — excludes logicBody and category.
 * @param {{ body?: string, authorEmail?: string | null, replies?: Array<{ body?: string, authorEmail?: string | null }> } | null | undefined} comment
 * @returns {string}
 */
export function formatCommentConversationOnly(comment) {
  if (!comment) return "";

  const blocks = [];
  const rootBlock = formatThreadMessageBlock(comment, 1);
  if (rootBlock) blocks.push(rootBlock);

  const replies = Array.isArray(comment.replies) ? comment.replies : [];
  let nextIndex = blocks.length + 1;
  replies.forEach((reply) => {
    const block = formatThreadMessageBlock(reply, nextIndex);
    if (block) {
      blocks.push(block);
      nextIndex += 1;
    }
  });

  const conversation = blocks.join("\n\n");
  if (!conversation) return "";

  return `UI comment thread:\n\n${conversation}`;
}

/** @deprecated Use formatCommentConversationOnly for Fix with AI. */
export function formatCommentThreadForAiComposer(comment) {
  return formatCommentConversationOnly(comment);
}
