import type { ServiceName, Message } from './core.js';
import type { Usage } from './usage.js';
import type { ToolCall } from './tools.js';

// ===== UNIFIED RESPONSE TYPE =====

/**
 * Base response properties shared by all LLM responses
 */
interface BaseResponse {
  /** The service that generated this response */
  service: ServiceName;
  /** The model that generated this response */
  model: string;
  /** Token usage and cost information */
  usage: Usage;
  /** Full conversation history including this response */
  messages: Message[];
}

/**
 * Unified response format from any LLM provider
 * Normalizes different provider response formats into a consistent structure
 */
export interface LLMResponse extends BaseResponse {
  /** The primary text content of the response */
  content: string;
  
  /** Reasoning/thinking content (when supported by provider) */
  reasoning?: string;
  
  /** Tool calls made during this response (when tools are used) */
  toolCalls?: ToolCall[];
  
  /** Indicates what types of content this response contains */
  capabilities: {
    /** Whether the response contains text content */
    hasText: boolean;
    /** Whether the response contains reasoning/thinking */
    hasReasoning: boolean;
    /** Whether the response contains tool calls */
    hasToolCalls: boolean;
  };
} 