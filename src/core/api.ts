import type { 
  ServiceConfig, 
  LLMResponse, 
  StreamingResponse, 
  Tool, 
  Message, 
  LLMConfig,
  FetchFunction 
} from '../types/index.js';
import { createAdapter } from './adapter.js';
import { getDefaultFetch } from './fetch.js';

// ===== MAIN API FUNCTIONS =====

/**
 * Send a conversation to an LLM provider (non-streaming)
 * This is the primary function - most LLM usage involves conversation history
 * @param config - Provider configuration with messages
 * @param options - Additional options like tools, temperature, etc.
 * @returns Promise resolving to the LLM response
 * @example
 * ```typescript
 * const response = await sendMessage({
 *   service: "openai",
 *   apiKey: "your-key",
 *   model: "gpt-4",
 *   messages: [{ role: "user", content: "Hello!" }]
 * });
 * console.log(response.content);
 * ```
 */
export async function sendMessage(
  config: ServiceConfig,
  options?: {
    tools?: Tool[];
    temperature?: number;
    maxTokens?: number;
    fetch?: FetchFunction; // Optional fetch override for this call
  }
): Promise<LLMResponse> {
  const adapter = createAdapter(config);
  
  const requestConfig: LLMConfig = {
    ...config,
    tools: options?.tools || config.tools,
    temperature: options?.temperature ?? config.temperature,
    maxTokens: options?.maxTokens ?? config.maxTokens,
    fetch: options?.fetch || config.fetch || getDefaultFetch(),
  };
  
  return adapter.call(requestConfig);
}

/**
 * Send a conversation to an LLM provider (streaming)
 * @param config - Provider configuration with messages
 * @param options - Additional options like tools, temperature, etc.
 * @returns Promise resolving to a streaming response
 * @example
 * ```typescript
 * const stream = await streamMessage({
 *   service: "openai",
 *   apiKey: "your-key", 
 *   model: "gpt-4",
 *   messages: [{ role: "user", content: "Tell me a story" }]
 * });
 * 
 * for await (const chunk of stream.chunks) {
 *   if (chunk.type === "content") {
 *     process.stdout.write(chunk.content);
 *   }
 * }
 * ```
 */
export async function streamMessage(
  config: ServiceConfig,
  options?: {
    tools?: Tool[];
    temperature?: number;
    maxTokens?: number;
    fetch?: FetchFunction; // Optional fetch override for this call
  }
): Promise<StreamingResponse> {
  const adapter = createAdapter(config);
  
  const requestConfig: LLMConfig = {
    ...config,
    tools: options?.tools || config.tools,
    temperature: options?.temperature ?? config.temperature,
    maxTokens: options?.maxTokens ?? config.maxTokens,
    fetch: options?.fetch || config.fetch || getDefaultFetch(),
  };
  
  return adapter.stream(requestConfig);
}

/**
 * Convenience function for asking a single question (non-streaming)
 * Use this for one-off questions without conversation history
 * @param config - Provider configuration (without messages)
 * @param question - The question to ask
 * @param options - Additional options
 * @returns Promise resolving to the LLM response
 * @example
 * ```typescript
 * const response = await askQuestion({
 *   service: "openai",
 *   apiKey: "your-key",
 *   model: "gpt-4"
 * }, "What is the capital of France?");
 * console.log(response.content); // "Paris"
 * ```
 */
export async function askQuestion(
  config: Omit<ServiceConfig, 'messages'>,
  question: string,
  options?: {
    systemPrompt?: string;
    tools?: Tool[];
    temperature?: number;
    maxTokens?: number;
    fetch?: FetchFunction; // Optional fetch override for this call
  }
): Promise<LLMResponse> {
  const messages: Message[] = [];
  
  // Add system prompt if provided
  if (options?.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }
  
  // Add the user question
  messages.push({ role: "user", content: question });
  
  const fullConfig: ServiceConfig = {
    ...config,
    messages,
    fetch: options?.fetch || config.fetch || getDefaultFetch(),
  } as ServiceConfig;
  
  return sendMessage(fullConfig, {
    tools: options?.tools,
    temperature: options?.temperature,
    maxTokens: options?.maxTokens,
    fetch: options?.fetch,
  });
}

/**
 * Convenience function for asking a single question (streaming)
 * Use this for one-off questions without conversation history
 * @param config - Provider configuration (without messages)
 * @param question - The question to ask
 * @param options - Additional options
 * @returns Promise resolving to a streaming response
 * @example
 * ```typescript
 * const stream = await streamQuestion({
 *   service: "anthropic",
 *   apiKey: "your-key",
 *   model: "claude-3-sonnet-20240229"
 * }, "Explain quantum computing", {
 *   systemPrompt: "Be concise and clear"
 * });
 * 
 * const response = await stream.collect();
 * console.log(response.content);
 * ```
 */
export async function streamQuestion(
  config: Omit<ServiceConfig, 'messages'>,
  question: string,
  options?: {
    systemPrompt?: string;
    tools?: Tool[];
    temperature?: number;
    maxTokens?: number;
    fetch?: FetchFunction; // Optional fetch override for this call
  }
): Promise<StreamingResponse> {
  const messages: Message[] = [];
  
  // Add system prompt if provided
  if (options?.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }
  
  // Add the user question
  messages.push({ role: "user", content: question });
  
  const fullConfig: ServiceConfig = {
    ...config,
    messages,
    fetch: options?.fetch || config.fetch || getDefaultFetch(),
  } as ServiceConfig;
  
  return streamMessage(fullConfig, {
    tools: options?.tools,
    temperature: options?.temperature,
    maxTokens: options?.maxTokens,
    fetch: options?.fetch,
  });
} 