// ===== USAGE & METRICS =====

/**
 * Token usage and cost information for an LLM request
 * Provides detailed metrics about the API call
 */
export interface Usage {
  /** Number of tokens in the input/prompt */
  input_tokens: number;
  /** Number of tokens in the output/response */
  output_tokens: number;
  /** Total tokens used (input + output) */
  total_tokens: number;
  /** Cost for input tokens (when available) */
  input_cost?: number;
  /** Cost for output tokens (when available) */
  output_cost?: number;
  /** Total cost for the request (when available) */
  total_cost?: number;
  /** Number of reasoning tokens (for providers that support reasoning) */
  reasoning_tokens?: number;
} 