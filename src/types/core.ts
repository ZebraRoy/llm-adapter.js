import type { ToolCall } from './tools.js';

// ===== CORE TYPES =====

/**
 * Supported LLM service providers
 * @example "openai" | "anthropic" | "google" | "ollama" | "groq" | "deepseek" | "xai"
 */
export type ServiceName = 
  | "openai" 
  | "anthropic" 
  | "google" 
  | "ollama" 
  | "groq" 
  | "deepseek" 
  | "xai";

/**
 * Message roles in a conversation
 * Provider-agnostic roles that work across all LLM services
 */
export type MessageRole = "user" | "assistant" | "system" | "tool_call" | "tool_result";

/**
 * Content within a message that can be text, image, audio, video, or file
 */
export interface MessageContent {
  /** The type of content being sent */
  type: "text" | "image" | "audio" | "video" | "file";
  /** The actual content (text, base64 encoded data, etc.) */
  content: string;
  /** Optional metadata for the content */
  metadata?: Record<string, unknown>;
}

/**
 * A single message in a conversation
 */
export interface Message {
  /** The role of the message sender */
  role: MessageRole;
  /** The content of the message - can be simple text or structured content */
  content: string | MessageContent[];
  /** Tool call ID for tool result messages (OpenAI-compatible APIs) */
  tool_call_id?: string;
  /** Tool calls made by assistant (for OpenAI-compatible APIs) */
  tool_calls?: ToolCall[];
  /** Function name for tool result messages (OpenAI legacy) */
  name?: string;
}

/**
 * Fetch function type for dependency injection
 * Allows overriding the fetch implementation for testing or custom networking
 */
export type FetchFunction = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>; 