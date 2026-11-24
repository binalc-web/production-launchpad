import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function CollapsibleDescription({ description }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [canToggle, setCanToggle] = useState(false);
  const descRef = useRef(null);

  useEffect(() => {
    setModalOpen(false);
  }, [description]);

  useLayoutEffect(() => {
    const el = descRef.current;
    if (!el) return;
    setCanToggle(el.scrollHeight > el.clientHeight + 1);
  }, [description]);

  return (
    <div className="space-y-1.5">
      <p
        ref={descRef}
        className="line-clamp-4 wrap-break-word whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground"
      >
        {description}
      </p>
      {canToggle ? (
        <>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 text-sm font-medium text-primary"
            aria-haspopup="dialog"
            onClick={() => setModalOpen(true)}
          >
            Read more
          </Button>
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogContent className="flex max-h-[min(90vh,40rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
              <DialogHeader className="shrink-0 border-b px-6 py-4 text-left">
                <DialogTitle>Description</DialogTitle>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                <p className="wrap-break-word whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </div>
  );
}

export const PageHeader = ({ title, description, children, compact = false }) => {
  return (
    <div className={cn("w-full", compact ? "mb-0" : "mb-8 space-y-3")}>
      <div
        className={cn(
          compact
            ? "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
            : "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
        )}
      >
        <h1
          className={cn(
            "min-w-0 font-bold tracking-tight text-foreground",
            compact ? "min-w-0 flex-1 text-lg" : "min-w-0 flex-1 text-xl",
          )}
        >
          {title}
        </h1>
        {children ? (
          <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">{children}</div>
        ) : null}
      </div>
      {description ? (
        <div className={cn(compact && "mt-1 mb-3")}>
          <CollapsibleDescription description={description} />
        </div>
      ) : null}
    </div>
  );
};
