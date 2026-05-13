import { logError } from "../api";

export const safeAsyncOperation = async <T,>(
  operation: () => Promise<T>,
  errorContext: string
): Promise<T | undefined> => {
  try {
    return await operation();
  } catch (e) {
    logError(`${errorContext}: ${String(e)}`);
    console.error(e);
    return undefined;
  }
};
