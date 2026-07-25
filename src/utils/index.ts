import { logError } from "../api";

/**
 * Runs a backend call, forwarding any failure to the plugin log instead of
 * letting it escape into Steam's UI. Returns `undefined` when the call failed.
 */
export const safeAsync = async <T>(
  operation: () => Promise<T>,
  context: string,
): Promise<T | undefined> => {
  try {
    return await operation();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    void logError(`${context}: ${message}`);
    console.error(`[CachyOS Update] ${context}`, e);
    return undefined;
  }
};
