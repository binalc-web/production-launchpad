export function EditProjectIntegrationsTab() {
  return (
    <div className="space-y-1 mb-6 max-w-3xl">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">Integrations</h2>
      <p className="text-sm text-muted-foreground">
        Pick the GitHub or Bitbucket account and Jira site this project uses. Connect those accounts
        under Connected accounts first. A Jira project key is optional (needed for tickets).
        Repository paths are on the App repositories tab. Link a Sentry project below to turn new
        errors into fix PRs.
      </p>
    </div>
  );
}
