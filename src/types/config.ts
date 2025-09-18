import type { ServiceName, Message, FetchFunction } from './core.js';
import type { Tool } from './tools.js';

// ===== CONFIGURATION =====

/**
 * Base configuration for making LLM requests
 * Contains all settings needed to call any LLM provider
 */
export interface LLMConfig {
  /** The LLM service to use */
  service: ServiceName;
  /** The specific model to use */
  model: string;
  /** Array of messages in the conversation */
  messages: Message[];
  /** API key for authentication (not needed for Ollama) */
  apiKey?: string;
  /** Custom base URL for the API endpoint */
  baseUrl?: string;
  /** Additional HTTP headers to include with the request (merged after auth headers) */
  headers?: Record<string, string>;
  /** Temperature for response randomness (0.0 to 1.0) */
  temperature?: number;
  /** Maximum number of tokens to generate */
  maxTokens?: number;
  /** Available tools/functions the LLM can call */
  tools?: Tool[];
  /** System prompt to set context */
  systemPrompt?: string;
  /** Custom fetch implementation for this request */
  fetch?: FetchFunction;
  /** Enable browser-specific API handling (adds required headers for browser requests) */
  isBrowser?: boolean;
  /** Reasoning effort level for supported models */
  reasoningEffort?: "low" | "medium" | "high" | "default" | "none";
  /** Reasoning output format for supported models */
  reasoningFormat?: "raw" | "parsed";
} 