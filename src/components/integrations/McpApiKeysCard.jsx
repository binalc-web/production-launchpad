import { useCallback, useEffect, useState } from "react";
import {
  createMcpApiKey,
  downloadLaunchpadMcpSdlcSkillZip,
  fetchMcpApiKeys,
  revokeMcpApiKey,
} from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { McpClaudeSetupGuide } from "@/components/integrations/McpClaudeSetupGuide";
import { integrationToastFromAxios } from "@/utils/integrationErrors";
import { logger } from "@/utils/logger";
import { Check, Copy, Download, KeyRound, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

function McpKeysListSkeleton() {
  return (
    <ul className="space-y-3" role="status" aria-busy="true" aria-label="Loading MCP keys">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="flex items-center justify-between gap-2 rounded-md border border-border p-3"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-8 w-20" />
        </li>
      ))}
    </ul>
  );
}

/**
 * Formats a date for display in the MCP key list.
 * @param {string | Date | null | undefined} value
 */
function formatKeyDate(value) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

/**
 * Triggers a browser download for a Blob with the given filename.
 * @param {Blob} blob
 * @param {string} filename
 */
function saveBlobAsFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Connected accounts card: create, list, and revoke LaunchPad MCP API keys (lp_mcp_…).
 * Always exposes Download for the build-time launchpad-mcp-sdlc skill zip.
 */
export function McpApiKeysCard() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [keyName, setKeyName] = useState("");
  const [createdApiKey, setCreatedApiKey] = useState(null);
  const [copied, setCopied] = useState(false);

  const loadKeys = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const rows = await fetchMcpApiKeys();
      setKeys(Array.isArray(rows) ? rows : []);
    } catch (error) {
      logger.error("mcp_api_keys_load", error);
      if (!silent) {
        toast.error(integrationToastFromAxios(error, "Could not load MCP keys"));
        setKeys([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const createKey = async () => {
    const name = keyName.trim();
    if (!name) {
      toast.error("Enter a name for this key");
      return;
    }
    setBusy("create");
    try {
      const created = await createMcpApiKey({ name });
      setKeyName("");
      setCreatedApiKey(created?.apiKey || null);
      setCopied(false);
      toast.success("MCP key created — copy it now");
      await loadKeys({ silent: true });
    } catch (error) {
      toast.error(integrationToastFromAxios(error, "Could not create MCP key"));
    } finally {
      setBusy(null);
    }
  };

  const revokeKey = async (keyId) => {
    setBusy(`revoke-${keyId}`);
    try {
      await revokeMcpApiKey(keyId);
      toast.success("MCP key revoked");
      await loadKeys({ silent: true });
    } catch (error) {
      toast.error(integrationToastFromAxios(error, "Could not revoke MCP key"));
    } finally {
      setBusy(null);
    }
  };

  const copyCreatedKey = async () => {
    if (!createdApiKey) return;
    try {
      await navigator.clipboard.writeText(createdApiKey);
      setCopied(true);
      toast.success("Key copied");
    } catch {
      toast.error("Could not copy — select and copy manually");
    }
  };

  /** Always available — not gated on having MCP keys. */
  const downloadSdlcSkill = async () => {
    setBusy("download-sdlc");
    try {
      const { blob, filename } = await downloadLaunchpadMcpSdlcSkillZip();
      saveBlobAsFile(blob, filename);
      toast.success("Skill pack downloaded");
    } catch (error) {
      logger.error("mcp_sdlc_skill_download", error);
      toast.error(integrationToastFromAxios(error, "Skill pack unavailable"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-w-0">
      <Card>
        <CardHeader className="flex flex-col gap-2 space-y-0 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <KeyRound className="size-6 shrink-0 text-muted-foreground" aria-hidden />
            <CardTitle className="truncate text-lg">LaunchPad MCP</CardTitle>
          </div>
          {keys.length > 0 ? (
            <Badge variant="secondary" className="shrink-0">
              {keys.length} active
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Create API keys for ChatGPT, Cursor, or other MCP clients. Use{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              Authorization: Bearer lp_mcp_…
            </code>{" "}
            against <code className="rounded bg-muted px-1 py-0.5 text-xs">/mcp</code>. The full key
            is shown only once.
          </p>

          <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
            <p className="text-sm font-medium text-foreground">LaunchPad MCP SDLC skill</p>
            <p className="text-xs text-muted-foreground">
              Download the latest skill pack ZIP, then unzip into{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-foreground">
                .cursor/skills/launchpad-mcp-sdlc
              </code>
              .
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy === "download-sdlc"}
              onClick={downloadSdlcSkill}
            >
              {busy === "download-sdlc" ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Download className="mr-1 h-4 w-4" aria-hidden />
              )}
              Download SDLC skill
            </Button>
          </div>

          <McpClaudeSetupGuide />

          <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
            <Label htmlFor="mcp-key-name" className="text-sm font-medium">
              Key name
            </Label>
            <Input
              id="mcp-key-name"
              autoComplete="off"
              placeholder="e.g. OpenAI Chat"
              value={keyName}
              onChange={(event) => setKeyName(event.target.value)}
              disabled={Boolean(busy)}
              maxLength={100}
            />
            <Button type="button" size="sm" disabled={Boolean(busy) || loading} onClick={createKey}>
              {busy === "create" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="mr-1 h-4 w-4" />
                  Create key
                </>
              )}
            </Button>
          </div>

          {loading ? (
            <McpKeysListSkeleton />
          ) : keys.length === 0 ? (
            <p className="text-muted-foreground">No MCP keys yet.</p>
          ) : (
            <ul className="space-y-3">
              {keys.map((key) => (
                <li
                  key={key.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">{key.name}</span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {key.prefix}…
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Created {formatKeyDate(key.createdAt)} · Last used{" "}
                      {formatKeyDate(key.lastUsedAt)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    disabled={Boolean(busy)}
                    onClick={() => revokeKey(key.id)}
                  >
                    {busy === `revoke-${key.id}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="mr-1 h-4 w-4" />
                        Revoke
                      </>
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(createdApiKey)}
        onOpenChange={(open) => {
          if (!open) {
            setCreatedApiKey(null);
            setCopied(false);
          }
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Copy your MCP key</DialogTitle>
            <DialogDescription>
              This is the only time the full key is shown. Store it securely — you cannot view it
              again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="mcp-created-key">API key</Label>
            <div className="flex gap-2">
              <Input
                id="mcp-created-key"
                readOnly
                value={createdApiKey || ""}
                className="font-mono text-xs"
              />
              <Button type="button" size="icon" variant="outline" onClick={copyCreatedKey}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="sr-only">Copy key</span>
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                setCreatedApiKey(null);
                setCopied(false);
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
