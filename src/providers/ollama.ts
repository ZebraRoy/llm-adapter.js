import type { OllamaConfig } from '../types/index.js';
import type { LLMAdapter } from '../core/adapter.js';

/**
 * Ollama adapter - no auth, local deployment, different API format
 * TODO: Move full implementation from original index.ts
 * @param config - Ollama configuration
 * @returns LLM adapter for Ollama
 */
export function createOllamaAdapter(config: OllamaConfig): LLMAdapter {
  // Temporary stub - full implementation would be moved from original file
  throw new Error("Ollama adapter not yet fully implemented in refactored structure");
} 