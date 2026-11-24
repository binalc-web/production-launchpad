import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

function Switch({ className, ...props }) {
  return (
    <SwitchPrimitives.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=unchecked]:border-[color-mix(in_oklch,var(--foreground)_14%,transparent)]",
        "data-[state=unchecked]:bg-[color-mix(in_oklch,var(--muted-foreground)_24%,var(--muted))]",
        "dark:data-[state=unchecked]:border-[color-mix(in_oklch,var(--foreground)_22%,transparent)]",
        "dark:data-[state=unchecked]:bg-[color-mix(in_oklch,var(--foreground)_20%,var(--surface-inset))]",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary",
        className,
      )}
      {...props}
    >
      <SwitchPrimitives.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-5 rounded-full bg-background shadow-sm ring-0 transition-transform",
          "data-[state=unchecked]:translate-x-0.5 data-[state=checked]:translate-x-5",
        )}
      />
    </SwitchPrimitives.Root>
  );
}

export { Switch };
