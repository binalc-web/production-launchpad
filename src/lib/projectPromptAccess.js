import { userCanManageReleasesForProject } from "@/lib/releasePresentation";

/** Admin, project creator, or assigned user — same access as release management. */
export function userCanManageProjectPromptConfig(user, project) {
  return userCanManageReleasesForProject(user, project);
}
