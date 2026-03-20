import { Layers3 } from "lucide-react";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function Logo({ className = "", size = "md", showText = true }: LogoProps) {
  const iconSizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10", 
    lg: "w-12 h-12"
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-3xl"
  };

  const iconSize = iconSizes[size];
  const textSize = textSizes[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Layered Stack Logo Icon */}
      <div className={`${iconSize} rounded-xl bg-gradient-to-br from-primary to-cyan-400 p-1`}>
        <div className="w-full h-full rounded-lg bg-background flex items-center justify-center">
          <Layers3 className="w-5 h-5 text-primary" />
        </div>
      </div>

      {/* Logo Text */}
      {showText && (
        <span className={`${textSize} font-bold tracking-tight`}>
          <span className="text-foreground">N8N</span>
          <span className="text-primary ml-1">Bazar</span>
        </span>
      )}
    </div>
  );
}