export const PROJECT_LISTING_LABELS = Object.freeze({
  showInactive: "Show inactive",
  activeCount: (n) => `${n} active`,
  inactiveCount: (n) => `${n} inactive`,
  noActiveProjects: "No active projects",
  noActiveHint: "Turn on Show inactive to see archived projects.",
  inactiveBadge: "Inactive",
  markInactive: "Mark inactive",
  markActive: "Mark active",
  deactivatedToast: "Project marked inactive",
  reactivatedToast: "Project marked active",
  statusUpdateError: "Could not update project status",
  projectStatusLabel: "Project status",
  projectStatusHint:
    "Inactive projects are hidden from the main list but remain accessible by link.",
  projectStatusActive: "Active",
  projectStatusInactive: "Inactive",
});

/** True when project is in the active (non-archived) listing state. */
export function isProjectListingActive(project) {
  return project?.isActive !== false;
}
