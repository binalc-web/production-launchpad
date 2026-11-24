import { createContext, useContext } from "react";

const EmbedPortalContainerContext = createContext(null);

export function EmbedPortalContainerProvider({ container, children }) {
  return (
    <EmbedPortalContainerContext.Provider value={container}>
      {children}
    </EmbedPortalContainerContext.Provider>
  );
}

export function useEmbedPortalContainer() {
  return useContext(EmbedPortalContainerContext);
}
