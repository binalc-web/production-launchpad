import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

/** Masked placeholder — never embed a real lp_mcp_ key in this snippet. */
const MASKED_MCP_KEY = "lp_mcp_••••••••";

/** macOS path to Claude Desktop MCP config. */
const CLAUDE_DESKTOP_CONFIG_PATH =
  "~/Library/Application Support/Claude/claude_desktop_config.json";

/**
 * Builds the Launchpad mcpServers entry for Claude Desktop (mcp-remote).
 * @param {string} mcpUrl — absolute /mcp endpoint for the current host
 * @returns {string} Pretty-printed JSON object fragment for mcpServers
 */
function buildClaudeMcpServersSnippet(mcpUrl) {
  const config = {
    mcpServers: {
      Launchpad: {
        command: "npx",
        args: ["-y", "mcp-remote", mcpUrl, "--header", `Authorization: Bearer ${MASKED_MCP_KEY}`],
      },
    },
  };
  return JSON.stringify(config, null, 2);
}

/** Production MCP endpoint used when the app is opened on localhost. */
const PRODUCTION_MCP_URL = "https://launchpad.yorkdevs.link/mcp";

/**
 * Resolves the public MCP HTTP endpoint from the browser origin.
 * Localhost falls back to production so the Claude Desktop example is usable.
 * @returns {string}
 */
function resolveMcpRemoteUrl() {
  if (typeof window === "undefined") return PRODUCTION_MCP_URL;
  const origin = window.location.origin.replace(/\/$/, "");
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    return PRODUCTION_MCP_URL;
  }
  return `${origin}/mcp`;
}

/**
 * Claude Desktop MCP setup help for Connected accounts.
 * Shows Node 22 prereq, config path, and a copyable mcpServers example with a masked key.
 */
export function McpClaudeSetupGuide() {
  const [copiedConfig, setCopiedConfig] = useState(false);

  const mcpUrl = useMemo(() => resolveMcpRemoteUrl(), []);
  const configSnippet = useMemo(() => buildClaudeMcpServersSnippet(mcpUrl), [mcpUrl]);

  const copyConfigSnippet = async () => {
    try {
      await navigator.clipboard.writeText(configSnippet);
      setCopiedConfig(true);
      toast.success("Config copied — replace the masked key with yours");
      window.setTimeout(() => setCopiedConfig(false), 2000);
    } catch {
      toast.error("Could not copy — select and copy manually");
    }
  };

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Connect Claude Desktop</p>
        <p className="text-xs text-muted-foreground">
          Requires Node.js <span className="font-medium text-foreground">22</span> (
          <code className="rounded bg-muted px-1 py-0.5">node -v</code> should show{" "}
          <code className="rounded bg-muted px-1 py-0.5">v22.x</code>). Cursor can use the same{" "}
          <code className="rounded bg-muted px-1 py-0.5">mcpServers</code> entry.
        </p>
      </div>

      <ol className="list-decimal space-y-1.5 pl-5 text-xs text-muted-foreground">
        <li>Create an MCP API key in this card and copy it when shown.</li>
        <li>
          Open Claude Desktop config at{" "}
          <code className="break-all rounded bg-muted px-1 py-0.5 text-foreground">
            {CLAUDE_DESKTOP_CONFIG_PATH}
          </code>
          .
        </li>
        <li>
          Add the <code className="rounded bg-muted px-1 py-0.5 text-foreground">Launchpad</code>{" "}
          block under{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-foreground">mcpServers</code>, then
          replace the masked key with your real{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-foreground">lp_mcp_…</code> key.
        </li>
        <li>Restart Claude Desktop.</li>
      </ol>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-foreground">Example config</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={copyConfigSnippet}
          >
            {copiedConfig ? (
              <Check className="mr-1 h-3.5 w-3.5" aria-hidden />
            ) : (
              <Copy className="mr-1 h-3.5 w-3.5" aria-hidden />
            )}
            {copiedConfig ? "Copied" : "Copy"}
          </Button>
        </div>
        <pre className="max-h-64 overflow-auto rounded-md border border-border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed text-foreground">
          {configSnippet}
        </pre>
      </div>
    </div>
  );
}
