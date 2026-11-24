/** @param {{ key?: string, category?: string }} row */
export function isWebAppProjectPrompt(row) {
  const key = String(row?.key ?? "");
  const category = String(row?.category ?? "");
  return category === "client_link" || key === "cursor.follow_up_base";
}

/** @param {{ key?: string }} row */
export function isBackendProjectPrompt(row) {
  const key = String(row?.key ?? "");
  return (
    key.startsWith("cursor.backend") ||
    key.startsWith("cursor.understand") ||
    key.startsWith("cursor.cloud_deploy") ||
    key.startsWith("cursor.infra_analysis") ||
    key.startsWith("cursor.environment") ||
    key.startsWith("cursor.deploy_mode")
  );
}
