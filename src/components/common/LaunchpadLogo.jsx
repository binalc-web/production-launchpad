import logoLight from "@/assets/launchpad-logo-svg.svg";
import logoDark from "@/assets/york-launchpad-dark.svg";
import { cn } from "@/lib/utils";

export function LaunchpadLogo({ className, alt = "Launchpad" }) {
  return (
    <>
      <img
        src={logoLight}
        alt={alt}
        className={cn("h-8 w-auto shrink-0 object-contain dark:hidden", className)}
      />
      <img
        src={logoDark}
        alt={alt}
        className={cn("hidden h-8 w-auto shrink-0 object-contain dark:block", className)}
      />
    </>
  );
}
