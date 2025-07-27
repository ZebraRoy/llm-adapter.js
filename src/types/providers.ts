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
  /** Model name (e.g., "gpt-4", "gpt-3.5-turbo") */
  model: string;
  /** Custom API base URL (defaults to official OpenAI API) */
  baseUrl?: string;
  /** Custom fetch implementation */
  fetch?: FetchFunction;
  /** Enable browser-specific API handling */
  isBrowser?: boolean;
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
  /** Model name (e.g., "gemini-pro") */
  model: string;
  /** Custom API base URL */
  baseUrl?: string;
  /** Custom fetch implementation */
  fetch?: FetchFunction;
  /** Enable browser-specific API handling */
  isBrowser?: boolean;
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
  /** Model name available on Groq */
  model: string;
  /** Custom API base URL */
  baseUrl?: string;
  /** Custom fetch implementation */
  fetch?: FetchFunction;
  /** Enable browser-specific API handling */
  isBrowser?: boolean;
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
  /** xAI model name (e.g., "grok-beta") */
  model: string;
  /** Custom API base URL */
  baseUrl?: string;
  /** Custom fetch implementation */
  fetch?: FetchFunction;
  /** Enable browser-specific API handling */
  isBrowser?: boolean;
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