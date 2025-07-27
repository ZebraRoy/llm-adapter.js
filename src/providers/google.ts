import type { GoogleConfig } from '../types/index.js';
import type { LLMAdapter } from '../core/adapter.js';

/**
 * Google adapter - handles query param auth, Gemini format
 * TODO: Move full implementation from original index.ts
 * @param config - Google configuration
 * @returns LLM adapter for Google
 */
export function createGoogleAdapter(config: GoogleConfig): LLMAdapter {
  // Temporary stub - full implementation would be moved from original file
  throw new Error("Google adapter not yet fully implemented in refactored structure");
} 