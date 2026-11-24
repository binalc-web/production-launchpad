import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

function Tabs({ className, orientation = "horizontal", ...props }) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn("group/tabs flex gap-2 data-[orientation=horizontal]:flex-col", className)}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  "rounded-lg p-[3px] group-data-[orientation=horizontal]/tabs:h-9 data-[variant=line]:rounded-none data-[variant=underline]:rounded-none data-[variant=underline-sub]:rounded-none data-[variant=underline-tertiary]:rounded-none data-[variant=pill]:rounded-none group/tabs-list text-muted-foreground inline-flex w-fit items-center justify-center group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
        underline:
          "h-auto w-full justify-start gap-0 rounded-none border-b border-border bg-transparent p-0",
        "underline-sub":
          "h-auto w-full justify-start gap-0 rounded-none border-b border-border bg-transparent p-0",
        "underline-tertiary":
          "h-auto w-full justify-start gap-0 rounded-none border-b border-border/60 bg-transparent p-0",
        pill: "h-auto flex-wrap gap-2 bg-transparent p-0",
        segmented:
          "h-auto group-data-[orientation=horizontal]/tabs:h-auto w-full justify-start gap-1 rounded-xl border border-border/70 bg-muted/40 p-1.5 shadow-none sm:w-auto",
        "segmented-nav":
          "h-auto group-data-[orientation=horizontal]/tabs:h-auto w-full justify-start gap-0.5 rounded-xl border border-border/70 bg-muted/40 p-1.5 shadow-none sm:w-auto",
        "segmented-sub":
          "h-auto group-data-[orientation=horizontal]/tabs:h-auto w-full justify-start gap-1 rounded-xl border border-border/50 bg-muted/20 p-1.5 shadow-none",
        "segmented-compact":
          "h-auto group-data-[orientation=horizontal]/tabs:h-auto w-full justify-start gap-1 rounded-xl border border-border/70 bg-muted/40 p-1 shadow-none sm:w-auto",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function TabsList({ className, variant = "default", ...props }) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "cursor-pointer focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring text-muted-foreground hover:text-foreground relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-2 rounded-md border border-transparent px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors duration-200 group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=default]/tabs-list:data-[state=active]:bg-primary group-data-[variant=default]/tabs-list:data-[state=active]:text-primary-foreground group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:text-primary dark:group-data-[variant=line]/tabs-list:data-[state=active]:text-primary",
        "group-data-[variant=underline]/tabs-list:rounded-none group-data-[variant=underline]/tabs-list:border-0 group-data-[variant=underline]/tabs-list:border-b-2 group-data-[variant=underline]/tabs-list:border-transparent group-data-[variant=underline]/tabs-list:bg-transparent group-data-[variant=underline]/tabs-list:px-3 group-data-[variant=underline]/tabs-list:pb-2.5 group-data-[variant=underline]/tabs-list:pt-1 group-data-[variant=underline]/tabs-list:text-sm group-data-[variant=underline]/tabs-list:font-normal group-data-[variant=underline]/tabs-list:shadow-none group-data-[variant=underline]/tabs-list:after:hidden group-data-[variant=underline]/tabs-list:hover:text-foreground group-data-[variant=underline]/tabs-list:data-[state=active]:border-primary group-data-[variant=underline]/tabs-list:data-[state=active]:bg-transparent group-data-[variant=underline]/tabs-list:data-[state=active]:font-medium group-data-[variant=underline]/tabs-list:data-[state=active]:text-primary group-data-[variant=underline]/tabs-list:flex-none sm:group-data-[variant=underline]/tabs-list:px-4",
        "group-data-[variant=underline-sub]/tabs-list:rounded-none group-data-[variant=underline-sub]/tabs-list:border-0 group-data-[variant=underline-sub]/tabs-list:border-b-2 group-data-[variant=underline-sub]/tabs-list:border-transparent group-data-[variant=underline-sub]/tabs-list:bg-transparent group-data-[variant=underline-sub]/tabs-list:px-2.5 group-data-[variant=underline-sub]/tabs-list:pb-2 group-data-[variant=underline-sub]/tabs-list:pt-1 group-data-[variant=underline-sub]/tabs-list:text-[13px] group-data-[variant=underline-sub]/tabs-list:font-normal group-data-[variant=underline-sub]/tabs-list:leading-5 group-data-[variant=underline-sub]/tabs-list:shadow-none group-data-[variant=underline-sub]/tabs-list:after:hidden group-data-[variant=underline-sub]/tabs-list:hover:text-foreground group-data-[variant=underline-sub]/tabs-list:data-[state=active]:border-primary group-data-[variant=underline-sub]/tabs-list:data-[state=active]:bg-transparent group-data-[variant=underline-sub]/tabs-list:data-[state=active]:font-medium group-data-[variant=underline-sub]/tabs-list:data-[state=active]:text-primary group-data-[variant=underline-sub]/tabs-list:flex-none sm:group-data-[variant=underline-sub]/tabs-list:px-3",
        "group-data-[variant=underline-tertiary]/tabs-list:rounded-none group-data-[variant=underline-tertiary]/tabs-list:border-0 group-data-[variant=underline-tertiary]/tabs-list:border-b-2 group-data-[variant=underline-tertiary]/tabs-list:border-transparent group-data-[variant=underline-tertiary]/tabs-list:bg-transparent group-data-[variant=underline-tertiary]/tabs-list:px-2 group-data-[variant=underline-tertiary]/tabs-list:pb-1.5 group-data-[variant=underline-tertiary]/tabs-list:pt-1 group-data-[variant=underline-tertiary]/tabs-list:text-xs group-data-[variant=underline-tertiary]/tabs-list:font-normal group-data-[variant=underline-tertiary]/tabs-list:leading-4 group-data-[variant=underline-tertiary]/tabs-list:shadow-none group-data-[variant=underline-tertiary]/tabs-list:after:hidden group-data-[variant=underline-tertiary]/tabs-list:hover:text-foreground group-data-[variant=underline-tertiary]/tabs-list:data-[state=active]:border-primary group-data-[variant=underline-tertiary]/tabs-list:data-[state=active]:bg-transparent group-data-[variant=underline-tertiary]/tabs-list:data-[state=active]:font-medium group-data-[variant=underline-tertiary]/tabs-list:data-[state=active]:text-foreground group-data-[variant=underline-tertiary]/tabs-list:flex-none",
        "group-data-[variant=pill]/tabs-list:rounded-full group-data-[variant=pill]/tabs-list:border group-data-[variant=pill]/tabs-list:border-border group-data-[variant=pill]/tabs-list:bg-background group-data-[variant=pill]/tabs-list:px-4 group-data-[variant=pill]/tabs-list:py-2 group-data-[variant=pill]/tabs-list:shadow-none group-data-[variant=pill]/tabs-list:after:hidden group-data-[variant=pill]/tabs-list:hover:bg-muted group-data-[variant=pill]/tabs-list:hover:text-foreground group-data-[variant=pill]/tabs-list:data-[state=active]:border-primary group-data-[variant=pill]/tabs-list:data-[state=active]:bg-primary group-data-[variant=pill]/tabs-list:data-[state=active]:font-semibold group-data-[variant=pill]/tabs-list:data-[state=active]:text-primary-foreground group-data-[variant=pill]/tabs-list:data-[state=active]:hover:bg-primary group-data-[variant=pill]/tabs-list:flex-none",
        "group-data-[variant=segmented]/tabs-list:h-auto group-data-[variant=segmented]/tabs-list:min-h-9 group-data-[variant=segmented]/tabs-list:rounded-lg group-data-[variant=segmented]/tabs-list:border-0 group-data-[variant=segmented]/tabs-list:bg-transparent group-data-[variant=segmented]/tabs-list:gap-2 group-data-[variant=segmented]/tabs-list:px-3 group-data-[variant=segmented]/tabs-list:py-2 group-data-[variant=segmented]/tabs-list:text-sm group-data-[variant=segmented]/tabs-list:leading-5 group-data-[variant=segmented]/tabs-list:shadow-none group-data-[variant=segmented]/tabs-list:after:hidden group-data-[variant=segmented]/tabs-list:hover:bg-background/80 group-data-[variant=segmented]/tabs-list:hover:text-foreground group-data-[variant=segmented]/tabs-list:data-[state=active]:bg-background group-data-[variant=segmented]/tabs-list:data-[state=active]:font-semibold group-data-[variant=segmented]/tabs-list:data-[state=active]:text-primary group-data-[variant=segmented]/tabs-list:data-[state=active]:shadow-sm group-data-[variant=segmented]/tabs-list:data-[state=active]:ring-1 group-data-[variant=segmented]/tabs-list:data-[state=active]:ring-primary/20 group-data-[variant=segmented]/tabs-list:flex-none sm:group-data-[variant=segmented]/tabs-list:px-3.5",
        "group-data-[variant=segmented-nav]/tabs-list:h-auto group-data-[variant=segmented-nav]/tabs-list:min-h-8 group-data-[variant=segmented-nav]/tabs-list:rounded-md group-data-[variant=segmented-nav]/tabs-list:border-0 group-data-[variant=segmented-nav]/tabs-list:bg-transparent group-data-[variant=segmented-nav]/tabs-list:gap-2 group-data-[variant=segmented-nav]/tabs-list:px-2.5 group-data-[variant=segmented-nav]/tabs-list:py-1.5 group-data-[variant=segmented-nav]/tabs-list:text-[13.5px] group-data-[variant=segmented-nav]/tabs-list:font-medium group-data-[variant=segmented-nav]/tabs-list:leading-normal group-data-[variant=segmented-nav]/tabs-list:shadow-none group-data-[variant=segmented-nav]/tabs-list:duration-100 group-data-[variant=segmented-nav]/tabs-list:after:hidden group-data-[variant=segmented-nav]/tabs-list:text-muted-foreground group-data-[variant=segmented-nav]/tabs-list:hover:bg-muted/60 group-data-[variant=segmented-nav]/tabs-list:hover:text-foreground group-data-[variant=segmented-nav]/tabs-list:data-[state=active]:bg-primary/10 group-data-[variant=segmented-nav]/tabs-list:data-[state=active]:text-primary group-data-[variant=segmented-nav]/tabs-list:data-[state=active]:font-medium group-data-[variant=segmented-nav]/tabs-list:data-[state=active]:shadow-none group-data-[variant=segmented-nav]/tabs-list:flex-none group-data-[variant=segmented-nav]/tabs-list:[&_svg:not([class*='text-'])]:text-muted-foreground/70 group-data-[variant=segmented-nav]/tabs-list:data-[state=active]:[&_svg:not([class*='text-'])]:text-primary",
        "group-data-[variant=segmented-sub]/tabs-list:h-auto group-data-[variant=segmented-sub]/tabs-list:min-h-9 group-data-[variant=segmented-sub]/tabs-list:rounded-lg group-data-[variant=segmented-sub]/tabs-list:border-0 group-data-[variant=segmented-sub]/tabs-list:bg-transparent group-data-[variant=segmented-sub]/tabs-list:gap-1.5 group-data-[variant=segmented-sub]/tabs-list:px-3 group-data-[variant=segmented-sub]/tabs-list:py-2 group-data-[variant=segmented-sub]/tabs-list:text-sm group-data-[variant=segmented-sub]/tabs-list:leading-5 group-data-[variant=segmented-sub]/tabs-list:shadow-none group-data-[variant=segmented-sub]/tabs-list:after:hidden group-data-[variant=segmented-sub]/tabs-list:hover:bg-background/80 group-data-[variant=segmented-sub]/tabs-list:hover:text-foreground sm:group-data-[variant=segmented-sub]/tabs-list:px-3.5 group-data-[variant=segmented-sub]/tabs-list:data-[state=active]:bg-background group-data-[variant=segmented-sub]/tabs-list:data-[state=active]:font-semibold group-data-[variant=segmented-sub]/tabs-list:data-[state=active]:text-primary group-data-[variant=segmented-sub]/tabs-list:data-[state=active]:shadow-none group-data-[variant=segmented-sub]/tabs-list:data-[state=active]:ring-1 group-data-[variant=segmented-sub]/tabs-list:data-[state=active]:ring-primary/20 group-data-[variant=segmented-sub]/tabs-list:flex-none",
        "group-data-[variant=segmented-compact]/tabs-list:h-auto group-data-[variant=segmented-compact]/tabs-list:min-h-8 group-data-[variant=segmented-compact]/tabs-list:rounded-lg group-data-[variant=segmented-compact]/tabs-list:border-0 group-data-[variant=segmented-compact]/tabs-list:bg-transparent group-data-[variant=segmented-compact]/tabs-list:gap-1 group-data-[variant=segmented-compact]/tabs-list:px-2 group-data-[variant=segmented-compact]/tabs-list:py-1 group-data-[variant=segmented-compact]/tabs-list:text-xs group-data-[variant=segmented-compact]/tabs-list:leading-4 group-data-[variant=segmented-compact]/tabs-list:font-medium group-data-[variant=segmented-compact]/tabs-list:shadow-none group-data-[variant=segmented-compact]/tabs-list:after:hidden group-data-[variant=segmented-compact]/tabs-list:hover:bg-background/80 group-data-[variant=segmented-compact]/tabs-list:hover:text-foreground group-data-[variant=segmented-compact]/tabs-list:data-[state=active]:bg-background group-data-[variant=segmented-compact]/tabs-list:data-[state=active]:font-semibold group-data-[variant=segmented-compact]/tabs-list:data-[state=active]:text-primary group-data-[variant=segmented-compact]/tabs-list:data-[state=active]:shadow-sm group-data-[variant=segmented-compact]/tabs-list:data-[state=active]:ring-1 group-data-[variant=segmented-compact]/tabs-list:data-[state=active]:ring-primary/20 group-data-[variant=segmented-compact]/tabs-list:flex-none sm:group-data-[variant=segmented-compact]/tabs-list:px-2.5",
        "after:absolute after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:after:bg-primary group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
