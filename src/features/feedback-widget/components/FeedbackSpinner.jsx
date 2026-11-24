import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function FeedbackSpinner({ className, size = 48 }) {
  return (
    <Loader2
      role="status"
      aria-label="Loading"
      className={cn("shrink-0 animate-spin text-[#00b48a]", className)}
      style={{ width: size, height: size }}
    />
  );
}
