import type { LLMConfig } from './config.js';
import type { FetchFunction } from './core.js';

// ===== PROVIDER-SPECIFIC CONFIGURATIONS =====

/**
 * Configuration for OpenAI API requests
 */
export interface OpenAIConfig extends Omit<LLMConfig, 'service'> {
  service: "openai";
  /** OpenAI API key */
  apiKey: string;
  /** Model name (e.g., "gpt-4", "gpt-3.5-turbo", "o1-preview", "o3-mini") */
  model: string;
  /** Custom API base URL (defaults to official OpenAI API) */
  baseUrl?: string;
  /** Custom fetch implementation */
  fetch?: FetchFunction;
  /** Enable browser-specific API handling */
  isBrowser?: boolean;
  /** Reasoning effort level for o1/o3 models ("low", "medium", "high") */
  reasoningEffort?: "low" | "medium" | "high";
}

/**
 * Configuration for Anthropic Claude API requests
 */
export interface AnthropicConfig extends Omit<LLMConfig, 'service'> {
  service: "anthropic";
  /** Anthropic API key */
  apiKey: string;
  /** Model name (e.g., "claude-3-sonnet-20240229") */
  model: string;
  /** Custom API base URL */
  baseUrl?: string;
  /** Enable thinking/reasoning mode for supported models */
  enableThinking?: boolean;
  /** Custom fetch implementation */
  fetch?: FetchFunction;
  /** Enable browser-specific API handling */
  isBrowser?: boolean;
}

/**
 * Configuration for Google Gemini API requests
 */
export interface GoogleConfig extends Omit<LLMConfig, 'service'> {
  service: "google";
  /** Google API key */
  apiKey: string;
  /** Model name (e.g., "gemini-pro", "gemini-2.5-pro", "gemini-2.5-flash") */
  model: string;
  /** Custom API base URL */
  baseUrl?: string;
  /** Custom fetch implementation */
  fetch?: FetchFunction;
  /** Enable browser-specific API handling */
  isBrowser?: boolean;
  /** Maximum tokens for thinking process (Gemini 2.5 series) */
  thinkingBudget?: number;
  /** Include thought summaries in response (Gemini 2.5 series) */
  includeThoughts?: boolean;
}

/**
 * Configuration for local Ollama requests
 */
export interface OllamaConfig extends Omit<LLMConfig, 'service'> {
  service: "ollama";
  /** Local model name (e.g., "llama2", "codellama") */
  model: string;
  /** Ollama server URL (defaults to localhost:11434) */
  baseUrl?: string;
  /** Custom fetch implementation */
  fetch?: FetchFunction;
  /** Enable browser-specific API handling */
  isBrowser?: boolean;
}

/**
 * Configuration for Groq API requests
 */
export interface GroqConfig extends Omit<LLMConfig, 'service'> {
  service: "groq";
  /** Groq API key */
  apiKey: string;
  /** Model name available on Groq (e.g., "qwen-qwq-32b", "deepseek-r1-distill-llama-70b") */
  model: string;
  /** Custom API base URL */
  baseUrl?: string;
  /** Custom fetch implementation */
  fetch?: FetchFunction;
  /** Enable browser-specific API handling */
  isBrowser?: boolean;
  /** Reasoning output format ("raw" or "parsed") */
  reasoningFormat?: "raw" | "parsed";
  /** Reasoning effort level ("default" or "none") */
  reasoningEffort?: "default" | "none";
}

/**
 * Configuration for DeepSeek API requests
 */
export interface DeepSeekConfig extends Omit<LLMConfig, 'service'> {
  service: "deepseek";
  /** DeepSeek API key */
  apiKey: string;
  /** DeepSeek model name */
  model: string;
  /** Custom API base URL */
  baseUrl?: string;
  /** Custom fetch implementation */
  fetch?: FetchFunction;
  /** Enable browser-specific API handling */
  isBrowser?: boolean;
}

/**
 * Configuration for xAI API requests
 */
export interface XAIConfig extends Omit<LLMConfig, 'service'> {
  service: "xai";
  /** xAI API key */
  apiKey: string;
  /** xAI model name (e.g., "grok-3", "grok-4", "grok-beta") */
  model: string;
  /** Custom API base URL */
  baseUrl?: string;
  /** Custom fetch implementation */
  fetch?: FetchFunction;
  /** Enable browser-specific API handling */
  isBrowser?: boolean;
  /** Reasoning effort level for Grok 3 ("low" or "high") */
  reasoningEffort?: "low" | "high";
}

/**
 * Union type of all service-specific configurations
 */
export type ServiceConfig = 
  | OpenAIConfig 
  | AnthropicConfig 
  | GoogleConfig 
  | OllamaConfig 
  | GroqConfig 
  | DeepSeekConfig 
  | XAIConfig; 