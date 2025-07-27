import type { ServiceName } from './core.js';
import type { Usage } from './usage.js';
import type { ToolCall } from './tools.js';
import type { LLMResponse } from './response.js';

// ===== STREAMING TYPES =====

/**
 * A chunk of data from a streaming LLM response
 * Different chunk types represent different parts of the response
 */
export interface StreamChunk {
  /** The type of content in this chunk */
  type: "content" | "tool_call" | "usage" | "reasoning" | "complete";
  /** Text content (for content chunks) */
  content?: string;
  /** Tool call information (for tool_call chunks) */
  toolCall?: Partial<ToolCall>;
  /** Usage statistics (for usage chunks) */
  usage?: Usage;
  /** Reasoning content (for reasoning chunks) */
  reasoning?: string;
  /** Complete response (for complete chunks) */
  finalResponse?: LLMResponse;
}

/**
 * Streaming response from an LLM provider
 * Allows processing response data as it arrives
 */
export interface StreamingResponse {
  /** The service that is generating this response */
  service: ServiceName;
  /** The model that is generating this response */
  model: string;
  /** Async iterable of response chunks */
  chunks: AsyncIterable<StreamChunk>;
  
  /** Utility method to collect the full response from the stream */
  collect(): Promise<LLMResponse>;
} 