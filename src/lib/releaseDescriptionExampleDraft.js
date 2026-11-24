import { createEmptyThemes } from "@/lib/releaseDescriptionThemes";
import { parseReleaseDescriptionForJira } from "@/utils/releaseDescriptionJiraDisplayParse";

/**
 * Markdown skeleton for the release description draft (headers/structure only).
 * Each `###` line becomes a Jira Epic title; feature bullets become Stories under that Epic.
 */
export const RELEASE_DESCRIPTION_EXAMPLE_MARKDOWN = `### Epic 1

**Client fit:**

**Risk / assumption:**

**Features:**
- **Story 1** —
- **Story 2** —

### Epic 2

**Client fit:**

**Risk / assumption:**

**Features:**
- **Story 1** —
`;

/** Themes for Create / Edit release “Insert example draft” (parsed from {@link RELEASE_DESCRIPTION_EXAMPLE_MARKDOWN}). */
export function getReleaseDescriptionExampleThemes() {
  const ex = parseReleaseDescriptionForJira(
    RELEASE_DESCRIPTION_EXAMPLE_MARKDOWN,
  );
  return ex.ok ? ex.themes : createEmptyThemes();
}
