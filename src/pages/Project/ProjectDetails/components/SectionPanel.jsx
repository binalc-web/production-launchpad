import { cn } from "@/lib/utils";

/** Renders children only while active — unmount on leave so panels refetch on return. */
export function SectionPanel({ visible, children, className }) {
  if (!visible) return null;
  return <div className={cn("min-w-0 outline-none", className)}>{children}</div>;
}
