import type { FetchFunction } from '../types/index.js';

// ===== FETCH DEPENDENCY INJECTION =====

// Global default fetch - can be overridden
let globalFetch: FetchFunction | undefined = undefined;

/**
 * Set the default fetch implementation for all LLM calls
 * Useful for testing, custom networking, or adding middleware
 * @param fetchImpl - The fetch implementation to use as default
 * @example setDefaultFetch(mockFetch)
 */
export function setDefaultFetch(fetchImpl: FetchFunction): void {
  globalFetch = fetchImpl;
}

/**
 * Get the current default fetch implementation
 * @returns The current default fetch function
 */
export function getDefaultFetch(): FetchFunction {
  return globalFetch || globalThis.fetch;
} 