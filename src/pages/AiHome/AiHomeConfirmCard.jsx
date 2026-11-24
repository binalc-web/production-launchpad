import { Button } from "@/components/ui/button";

export function AiHomeConfirmCard({ pending, onAccept, onAllowAll, onReject, busy }) {
  const tools = Array.isArray(pending) ? pending : [];
  if (!tools.length) return null;
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
      <p className="font-semibold">Confirm these actions</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {tools.some((t) => t.milestone)
          ? "This is a delivery milestone. Confirm to continue the goal."
          : "Writes wait for you. Specialized chats (backend, infra, cloud debug, QA) start the same way."}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
        {tools.map((t, i) => (
          <li key={`${t.name}-${i}`}>
            <code className="rounded bg-muted/80 px-1 py-0.5 text-[11px]">{t.name}</code>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={onAccept} disabled={busy}>
          Run
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onAllowAll} disabled={busy}>
          Allow all for this chat
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onReject} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
