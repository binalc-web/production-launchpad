import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  fetchPreviewDesktopControl,
  fetchPreviewDesktopControlPublic,
  forceReleasePreviewDesktopControl,
  openPreviewDesktopControlSocket,
} from "@/api";

/**
 * Shows who holds Preview Desktop control and while it is held.
 * Live agent progress stays on the desktop app.
 */
export function PreviewDesktopControlBanner({ projectId, onHeldChange }) {
  const [control, setControl] = useState(null);
  const [canForce, setCanForce] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [error, setError] = useState("");
  const onHeldChangeRef = useRef(onHeldChange);
  useEffect(() => {
    onHeldChangeRef.current = onHeldChange;
  }, [onHeldChange]);

  const applyControl = useCallback((pub) => {
    setControl(pub || null);
    onHeldChangeRef.current?.(Boolean(pub?.active));
  }, []);

  /** One-off snapshot (after a force release, or while the socket is down). Not a poll. */
  const refresh = useCallback(async () => {
    const id = Number(projectId);
    if (!Number.isInteger(id) || id < 1) {
      applyControl(null);
      return;
    }
    try {
      applyControl(await fetchPreviewDesktopControlPublic(id));
    } catch {
      applyControl(null);
    }
  }, [projectId, applyControl]);

  // The socket pushes the current state on connect and every take/release afterwards.
  useEffect(() => {
    const id = Number(projectId);
    if (!Number.isInteger(id) || id < 1) {
      applyControl(null);
      return undefined;
    }
    return openPreviewDesktopControlSocket(id, {
      onControl: applyControl,
      // Reconnects with backoff; take a single snapshot so the banner is not stale meanwhile.
      onDisconnect: () => void refresh(),
    });
  }, [projectId, applyControl, refresh]);

  // Only needed while the banner is showing, and it changes only when control changes hands.
  const takenAt = control?.takenAt ?? null;
  const active = Boolean(control?.active);
  useEffect(() => {
    const id = Number(projectId);
    if (!active || !Number.isInteger(id) || id < 1) {
      setCanForce(false);
      return undefined;
    }
    let cancelled = false;
    fetchPreviewDesktopControl(id)
      .then((auth) => {
        if (!cancelled) setCanForce(Boolean(auth?.canForceRelease));
      })
      .catch(() => {
        if (!cancelled) setCanForce(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, active, takenAt]);

  if (!control?.active) return null;
  const name = control.holder?.name || "Someone";
  const since = control.takenAt ? new Date(control.takenAt).toLocaleString() : "";

  return (
    <div className="mx-4 mt-3 rounded-lg border border-amber-300/80 bg-amber-50 px-3 py-3 text-xs leading-relaxed text-amber-950">
      <p>
        <span className="font-semibold">{name}</span> has taken preview control
        {since ? ` since ${since}` : ""}. Chat on the website is paused until they release it. Their
        prompts and replies appear in this chat after each run finishes.
      </p>
      {canForce ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-2"
          disabled={releasing}
          onClick={() => {
            setReleasing(true);
            setError("");
            forceReleasePreviewDesktopControl(projectId)
              .then(() => refresh())
              .catch((err) => setError(err?.response?.data?.error || "Could not release control."))
              .finally(() => setReleasing(false));
          }}
        >
          {releasing ? "Releasing…" : "Force release"}
        </Button>
      ) : null}
      {error ? <p className="mt-2 text-destructive">{error}</p> : null}
    </div>
  );
}
