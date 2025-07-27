import type { GroqConfig } from '../types/index.js';
import type { LLMAdapter } from '../core/adapter.js';

/**
 * Groq adapter - OpenAI-compatible but different base URL
 * TODO: Move full implementation from original index.ts
 * @param config - Groq configuration
 * @returns LLM adapter for Groq
 */
export function createGroqAdapter(config: GroqConfig): LLMAdapter {
  // Temporary stub - full implementation would be moved from original file
  throw new Error("Groq adapter not yet fully implemented in refactored structure");
} 