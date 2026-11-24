import axios from "axios";
import { isAbortError } from "../lib/abortError.util.js";

export { isAbortError };

function isAbortedAxiosRequest(error) {
  if (!error || typeof error !== "object") return false;
  if (axios.isCancel?.(error)) return true;
  return isAbortError(error);
}

/** True when the backend is unreachable (no HTTP response), e.g. server not started. */
export function isApiConnectionError(error) {
  if (!error || typeof error !== "object") return false;
  if (isAbortedAxiosRequest(error)) return false;
  if (error.response) return false;

  const code = String(error.code ?? "").toUpperCase();
  if (
    code === "ERR_NETWORK" ||
    code === "ECONNREFUSED" ||
    code === "ECONNRESET" ||
    code === "ERR_CONNECTION_REFUSED" ||
    code === "ERR_CONNECTION_RESET"
  ) {
    return true;
  }

  if (error.request) return true;

  const message = String(error.message ?? "").toLowerCase();
  return message.includes("network error") || message.includes("connection");
}
