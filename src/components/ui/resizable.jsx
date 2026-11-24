import * as React from "react";
import { GripVertical } from "lucide-react";
import { Group, Panel, Separator } from "react-resizable-panels";

import { cn } from "@/lib/utils";

function ResizablePanelGroup({ className, ...props }) {
  return (
    <Group
      data-slot="resizable-panel-group"
      className={cn("flex h-full w-full", className)}
      {...props}
    />
  );
}

function ResizablePanel({ className, ...props }) {
  return <Panel data-slot="resizable-panel" className={cn(className)} {...props} />;
}

function ResizableHandle({ withHandle, className, ...props }) {
  return (
    <Separator
      data-slot="resizable-handle"
      className={cn(
        "relative flex shrink-0 items-center justify-center bg-border",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1",
        // Horizontal group → vertical bar (aria-orientation=vertical)
        "aria-[orientation=vertical]:w-px",
        "aria-[orientation=vertical]:after:absolute aria-[orientation=vertical]:after:inset-y-0",
        "aria-[orientation=vertical]:after:left-1/2 aria-[orientation=vertical]:after:w-3",
        "aria-[orientation=vertical]:after:-translate-x-1/2",
        // Vertical group → horizontal bar (aria-orientation=horizontal)
        "aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full",
        "aria-[orientation=horizontal]:after:absolute aria-[orientation=horizontal]:after:inset-x-0",
        "aria-[orientation=horizontal]:after:top-1/2 aria-[orientation=horizontal]:after:left-0",
        "aria-[orientation=horizontal]:after:h-3 aria-[orientation=horizontal]:after:w-full",
        "aria-[orientation=horizontal]:after:translate-x-0 aria-[orientation=horizontal]:after:-translate-y-1/2",
        "aria-[orientation=horizontal]:[&>div]:rotate-90",
        className,
      )}
      {...props}
    >
      {withHandle ? (
        <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border border-border bg-muted shadow-sm">
          <GripVertical className="size-2.5 text-muted-foreground" />
        </div>
      ) : null}
    </Separator>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
