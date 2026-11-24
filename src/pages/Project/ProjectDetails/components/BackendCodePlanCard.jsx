import { BackendCodePlanDocument } from "./BackendCodePlanDocument";

/**
 * Pending plan above the chat composer (non-IDE). Thin wrapper around BackendCodePlanDocument.
 */
export function BackendCodePlanCard(props) {
  return <BackendCodePlanDocument {...props} title="plan.md" />;
}
