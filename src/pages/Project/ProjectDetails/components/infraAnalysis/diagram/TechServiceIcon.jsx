import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { LucideTechIcon } from "./LucideTechIcon.jsx";

const ICONIFY_PREFIXES = ["logos:", "devicon:", "mdi:", "skill-icons:", "simple-icons:"];

function isIconifyKey(icon) {
  return ICONIFY_PREFIXES.some((prefix) => icon.startsWith(prefix));
}

/** Brand or generic tech icon with Iconify + lucide fallback. */
export function TechServiceIcon({ icon, className, title }) {
  const candidates = useMemo(() => [icon], [icon]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [icon]);

  const activeIcon = candidates[Math.min(index, candidates.length - 1)] ?? icon;

  if (!isIconifyKey(activeIcon)) {
    return <LucideTechIcon icon={activeIcon} className={className} />;
  }

  return (
    <Icon
      icon={activeIcon}
      className={className}
      title={title}
      onError={() => {
        if (index < candidates.length - 1) {
          setIndex((value) => value + 1);
        }
      }}
    />
  );
}
