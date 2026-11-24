import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Per-character 3D shimmer wave (Motion). `children` must be a plain string.
 */
export function TextShimmerWave({
  children,
  className,
  duration = 1,
  zDistance = 10,
  xDistance = 2,
  yDistance = -2,
  spread = 1,
  scaleDistance = 1.1,
  rotateYDistance = 10,
  transition,
}) {
  const text = typeof children === "string" ? children : String(children ?? "");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const sync = () =>
      setIsDark(document.documentElement.classList.contains("dark"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const baseColor = "var(--muted-foreground)";
  const gradientColor = isDark ? "var(--foreground)" : "var(--primary)";

  if (!text.length) return null;

  return (
    <motion.p
      className={cn(
        "relative inline-block [perspective:500px] text-sm font-medium leading-relaxed md:text-base",
        className,
      )}
      style={{ color: baseColor }}
    >
      {text.split("").map((char, i) => {
        const delay = (i * duration * (1 / spread)) / text.length;
        return (
          <motion.span
            key={`${char}-${i}-${isDark}`}
            className="inline-block whitespace-pre [transform-style:preserve-3d]"
            initial={{
              translateZ: 0,
              scale: 1,
              rotateY: 0,
              color: baseColor,
            }}
            animate={{
              translateZ: [0, zDistance, 0],
              translateX: [0, xDistance, 0],
              translateY: [0, yDistance, 0],
              scale: [1, scaleDistance, 1],
              rotateY: [0, rotateYDistance, 0],
              color: [baseColor, gradientColor, baseColor],
            }}
            transition={{
              duration,
              repeat: Infinity,
              repeatDelay: (text.length * 0.05) / spread,
              delay,
              ease: "easeInOut",
              ...transition,
            }}
          >
            {char}
          </motion.span>
        );
      })}
    </motion.p>
  );
}
