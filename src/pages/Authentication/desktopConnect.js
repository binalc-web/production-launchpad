import {
  figcraftComplete,
  figmaComplete,
  previewDesktopComplete,
  qaAutomationComplete,
} from "@/api";
import { desktopClientFor } from "./desktopConnectClients.util";

/**
 * Hand the pending device login (`state`) and the person's LaunchPad session to the backend for
 * `clientId`. Resolves to the backend's body, or `{ error }`.
 */
export function completeDesktopConnect(clientId, state, token, refreshToken) {
  switch (desktopClientFor(clientId).id) {
    case "qa-automation":
      return qaAutomationComplete(state, token, refreshToken);
    case "preview-desktop":
      return previewDesktopComplete(state, token);
    case "figcraft":
      return figcraftComplete(state, token);
    default:
      return figmaComplete(state, token, refreshToken);
  }
}
