import React from "react";
import { Check, Compass, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import figmaAppIcon from "@/assets/apps/Figma.svg";
import githubAppIcon from "@/assets/apps/GitHub.svg";

const START_CARDS = [
  {
    id: "figma",
    title: "Start from a Figma design",
    description: "Turn your design into a working app.",
    iconSrc: figmaAppIcon,
    matches: ["figma", "zip"],
  },
  {
    id: "migrate",
    title: "Start from existing code",
    description: "Connect your GitHub repo and continue building where you left off.",
    iconSrc: githubAppIcon,
    matches: ["migrate"],
  },
  {
    id: "scratch",
    title: "Start from an idea",
    description: "Describe what you want and we'll generate a first version.",
    icon: Lightbulb,
    matches: ["scratch"],
  },
  {
    id: "blank",
    title: "Initiate product discovery",
    description:
      "Not sure what to build yet? Define the problem, users and scope first, then move into building.",
    icon: Compass,
    matches: ["blank"],
  },
];

export const InitMethodSelector = ({ method, onSelect, disabled = false }) => {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Where are you starting from?
        </h3>
        <p className="text-sm text-muted-foreground md:text-base">
          Choose the option that fits best. You can change it later.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {START_CARDS.map((card) => {
          const isActive = card.matches.includes(method);
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              role="button"
              tabIndex={disabled ? -1 : 0}
              aria-pressed={isActive}
              aria-disabled={disabled}
              onClick={() => {
                if (disabled || isActive) return;
                onSelect(card.id);
              }}
              onKeyDown={(e) => {
                if (disabled) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (!isActive) onSelect(card.id);
                }
              }}
              className={cn(
                "relative flex min-h-[9.5rem] cursor-pointer flex-col gap-3 rounded-2xl border p-5 text-left transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "border-primary bg-primary/5 shadow-[0_0_0_1px_var(--primary)]"
                  : "border-border bg-card hover:border-primary/40 hover:bg-muted/20",
                disabled && "pointer-events-none opacity-60",
              )}
            >
              {isActive ? (
                <span
                  className="absolute right-4 top-4 inline-flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  aria-hidden
                >
                  <Check className="size-3.5 stroke-[3]" />
                </span>
              ) : null}
              {card.iconSrc ? (
                <img
                  src={card.iconSrc}
                  alt=""
                  className="size-6 shrink-0 object-contain"
                  aria-hidden
                />
              ) : Icon ? (
                <Icon className="size-6 shrink-0 text-foreground" aria-hidden />
              ) : null}
              <div className="min-w-0 space-y-1.5 pr-8">
                <p className="text-base font-semibold leading-snug text-foreground">{card.title}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{card.description}</p>
                {card.id === "figma" ? (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(method === "zip" ? "figma" : "zip");
                    }}
                    className="mt-1 text-left text-sm font-medium text-primary underline underline-offset-2 hover:opacity-90"
                  >
                    {method === "zip"
                      ? "Use the Figma plugin instead"
                      : "Using Figma Make? Upload the ZIP file instead."}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground">
        Just need the feedback widget?{" "}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelect("feedback")}
          className={cn(
            "font-semibold underline underline-offset-2",
            method === "feedback" ? "text-primary" : "text-foreground hover:text-primary",
          )}
        >
          {method === "feedback" ? "Feedback selected" : "Set it up from Jira."}
        </button>
      </p>
    </div>
  );
};
