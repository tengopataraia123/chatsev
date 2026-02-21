/**
 * Request Deduplicator
 * Prevents duplicate concurrent API calls to the same endpoint.
 * Saves bandwidth by reusing in-flight promises.
 */

const inflightRequests = new Map<string, Promise<any>>();

export const deduplicatedFetch = <T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = 2000
): Promise<T> => {
  const existing = inflightRequests.get(key);
  if (existing) return existing;

  const promise = fetcher().finally(() => {
    setTimeout(() => inflightRequests.delete(key), ttlMs);
  });

  inflightRequests.set(key, promise);
  return promise;
};

// Clear all in-flight tracking
export const clearInflight = () => inflightRequests.clear();
