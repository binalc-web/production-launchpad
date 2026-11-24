import { useEffect, useState } from "react";
import { isEmbedVisibleOnPage } from "@/lib/embedDomainRules.js";

export function readPageLocation() {
  if (typeof window === "undefined") {
    return { hostname: "", pathname: "/" };
  }
  return {
    hostname: window.location.hostname,
    pathname: window.location.pathname || "/",
  };
}

export function usePageLocation() {
  const [{ hostname, pathname }, setLocation] = useState(readPageLocation);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const sync = () => setLocation(readPageLocation());

    window.addEventListener("popstate", sync);

    const { history } = window;
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);

    history.pushState = (...args) => {
      originalPushState(...args);
      sync();
    };
    history.replaceState = (...args) => {
      originalReplaceState(...args);
      sync();
    };

    return () => {
      window.removeEventListener("popstate", sync);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []);

  return { hostname, pathname };
}

export function useEmbedPageVisibility(allowedDomains) {
  const { hostname, pathname } = usePageLocation();
  return isEmbedVisibleOnPage(hostname, pathname, allowedDomains);
}
