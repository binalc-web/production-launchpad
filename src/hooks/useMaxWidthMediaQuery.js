import { useEffect, useState } from "react";

/**
 * @param {number} maxWidthPx inclusive max width (matches CSS max-width media query)
 */
export function useMaxWidthMediaQuery(maxWidthPx) {
  const query = `(max-width: ${maxWidthPx}px)`;
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
