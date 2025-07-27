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
}

// ===== FETCH DEPENDENCY INJECTION =====

/**
 * Fetch function type for dependency injection
 * Allows overriding the fetch implementation for testing or custom networking
 */
export type FetchFunction = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

// Global default fetch - can be overridden
let globalFetch: FetchFunction = globalThis.fetch;

/**
 * Set the default fetch implementation for all LLM calls
 * Useful for testing, custom networking, or adding middleware
 * @param fetchImpl - The fetch implementation to use as default
 * @example setDefaultFetch(mockFetch)
 */
export function setDefaultFetch(fetchImpl: FetchFunction): void {
  globalFetch = fetchImpl;
}

/**
 * Get the current default fetch implementation
 * @returns The current default fetch function
 */
export function getDefaultFetch(): FetchFunction {
  return globalFetch;
}

// ===== TOOL DEFINITIONS =====

/**
 * JSON Schema property definition for function parameters
 * Defines the structure and validation rules for tool parameters
 */
export interface JSONSchemaProperty {
  /** The data type of the property */
  type: "string" | "number" | "boolean" | "array" | "object";
  /** Human-readable description of what this property represents */
  description?: string;
  /** Allowed values for string/number types */
  enum?: (string | number)[];
  /** For array types, defines the structure of array items */
  items?: JSONSchemaProperty;
  /** For object types, defines nested properties */
  properties?: Record<string, JSONSchemaProperty>;
  /** List of required property names for object types */
  required?: string[];
}

/**
 * JSON Schema definition for function parameters
 * Used to validate and describe tool function parameters
 */
export interface JSONSchema {
  /** Must be "object" for function parameters */
  type: "object";
  /** Object properties and their definitions */
  properties: Record<string, JSONSchemaProperty>;
  /** Names of required properties */
  required?: string[];
  /** Whether additional properties beyond those defined are allowed */
  additionalProperties?: boolean;
}

/**
 * Definition of a tool/function that can be called by the LLM
 */
export interface Tool {
  /** Unique name for the tool */
  name: string;
  /** Description of what the tool does */
  description: string;
  /** JSON Schema defining the expected parameters */
  parameters: JSONSchema;
}

/**
 * A tool call made by the LLM
 * Contains the tool name and arguments to execute
 */
export interface ToolCall {
  /** Unique identifier for this tool call */
  id: string;
  /** Name of the tool being called */
  name: string;
  /** Arguments/parameters passed to the tool */
  input: Record<string, unknown>;
}

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
}

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

// ===== TYPE GUARDS & UTILITIES =====

/**
 * Check if the response contains text content
 * @param response - The LLM response to check
 * @returns True if the response has meaningful text content
 */
export function hasTextContent(response: LLMResponse): boolean {
  return response.capabilities.hasText && !!response.content;
}

/**
 * Check if the response contains reasoning/thinking content
 * @param response - The LLM response to check
 * @returns True if the response has reasoning content
 */
export function hasReasoning(response: LLMResponse): boolean {
  return response.capabilities.hasReasoning && !!response.reasoning;
}

/**
 * Check if the response contains tool calls
 * @param response - The LLM response to check
 * @returns True if the response has tool calls
 */
export function hasToolCalls(response: LLMResponse): boolean {
  return response.capabilities.hasToolCalls && !!response.toolCalls && response.toolCalls.length > 0;
}

/**
 * Check if the response is a simple text-only response
 * For backwards compatibility and clarity
 * @param response - The LLM response to check
 * @returns True if response only contains text (no reasoning or tool calls)
 */
export function isTextResponse(response: LLMResponse): boolean {
  return hasTextContent(response) && !hasReasoning(response) && !hasToolCalls(response);
}

/**
 * Check if the response contains tool calls
 * @param response - The LLM response to check
 * @returns True if the response contains tool calls
 */
export function isToolCallResponse(response: LLMResponse): boolean {
  return hasToolCalls(response);
}

/**
 * Check if the response contains reasoning content
 * @param response - The LLM response to check
 * @returns True if the response contains reasoning/thinking
 */
export function isReasoningResponse(response: LLMResponse): boolean {
  return hasReasoning(response);
}

/**
 * Check if the response contains multiple types of content
 * @param response - The LLM response to check
 * @returns True if response has more than one type of content
 */
export function isComplexResponse(response: LLMResponse): boolean {
  const capabilityCount = [
    response.capabilities.hasText,
    response.capabilities.hasReasoning, 
    response.capabilities.hasToolCalls
  ].filter(Boolean).length;
  
  return capabilityCount > 1;
}

/**
 * Get a string description of the response content types
 * @param response - The LLM response to analyze
 * @returns String describing the types of content in the response
 * @example "text", "reasoning + tool_calls", "text + reasoning + tool_calls"
 */
export function getResponseType(response: LLMResponse): string {
  const types = [];
  if (response.capabilities.hasReasoning) types.push("reasoning");
  if (response.capabilities.hasToolCalls) types.push("tool_calls");
  if (response.capabilities.hasText) types.push("text");
  
  return types.join(" + ") || "empty";
}

// ===== SERVICE CAPABILITY CHECKS =====

/**
 * Check if a service uses OpenAI-compatible API format
 * @param service - The service name to check
 * @returns True if the service uses OpenAI-compatible format
 */
export function isOpenAICompatible(service: ServiceName): boolean {
  return ["openai", "groq", "deepseek", "xai"].includes(service);
}

/**
 * Check if a service requires an API key for authentication
 * @param service - The service name to check
 * @returns True if the service requires an API key
 */
export function requiresApiKey(service: ServiceName): boolean {
  return service !== "ollama";
}

/**
 * Check if a service uses Bearer token authentication
 * @param service - The service name to check
 * @returns True if the service uses Bearer auth
 */
export function supportsBearerAuth(service: ServiceName): boolean {
  return isOpenAICompatible(service);
}

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
    fetch: options?.fetch || config.fetch || globalFetch,
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
    fetch: options?.fetch || config.fetch || globalFetch,
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
    fetch: options?.fetch || config.fetch || globalFetch,
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
    fetch: options?.fetch || config.fetch || globalFetch,
  } as ServiceConfig;
  
  return streamMessage(fullConfig, {
    tools: options?.tools,
    temperature: options?.temperature,
    maxTokens: options?.maxTokens,
    fetch: options?.fetch,
  });
}

// ===== CLEAN ADAPTER INTERFACE =====
/**
 * Simple adapter interface - each provider implements this
 * No shared base class, no mixed concerns
 * Internal interface used by the library
 */
interface LLMAdapter {
  /** Make a non-streaming call to the LLM */
  call(config: LLMConfig): Promise<LLMResponse>;
  /** Make a streaming call to the LLM */
  stream(config: LLMConfig): Promise<StreamingResponse>;
  /** Validate the configuration for this adapter */
  validateConfig(config: LLMConfig): boolean;
}

// ===== ADAPTER FACTORY =====
/**
 * Create an adapter for the specified service
 * Internal function that routes to provider-specific implementations
 * @param config - Service configuration
 * @returns Adapter instance for the service
 */
function createAdapter(config: ServiceConfig): LLMAdapter {
  validateServiceConfig(config);
  
  switch (config.service) {
    case "openai":
      return createOpenAIAdapter(config);
    case "anthropic":
      return createAnthropicAdapter(config);
    case "google":
      return createGoogleAdapter(config);
    case "ollama":
      return createOllamaAdapter(config);
    case "groq":
      return createGroqAdapter(config);
    case "deepseek": 
      return createDeepSeekAdapter(config);
    case "xai":
      return createXAIAdapter(config);
    default:
      // Exhaustive check - TypeScript will catch missing cases
      const _exhaustive: never = config;
      throw new Error("Unsupported service");
  }
}

// ===== CONFIGURATION VALIDATION =====
/**
 * Validate a service-specific configuration
 * @param config - The service configuration to validate
 * @throws Error if configuration is invalid
 */
function validateServiceConfig(config: ServiceConfig): void {
  if (!config.service) {
    throw new Error("Service name is required");
  }
  
  if (requiresApiKey(config.service) && !config.apiKey) {
    throw new Error(`API key is required for ${config.service}`);
  }
  
  if (!config.model) {
    throw new Error("Model is required");
  }
  
  if (config.messages && config.messages.length === 0) {
    throw new Error("At least one message is required");
  }
}

/**
 * Validate a general LLM configuration
 * @param config - The LLM configuration to validate  
 * @throws Error if configuration is invalid
 */
function validateLLMConfig(config: LLMConfig): void {
  if (!config.service) {
    throw new Error("Service name is required");
  }
  
  if (requiresApiKey(config.service) && !config.apiKey) {
    throw new Error(`API key is required for ${config.service}`);
  }
  
  if (!config.model) {
    throw new Error("Model is required");
  }
  
  if (config.messages && config.messages.length === 0) {
    throw new Error("At least one message is required");
  }
}

// ===== STREAMING UTILITIES =====
/**
 * Parse Server-Sent Events (SSE) stream
 * Internal utility for processing streaming responses
 * @param reader - Stream reader
 * @returns Async generator of parsed data strings
 */
async function* parseSSEStream(reader: ReadableStreamDefaultReader<Uint8Array>): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  let buffer = '';
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          if (data.trim()) yield data;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ===== FUNCTIONAL ADAPTER IMPLEMENTATIONS =====
// Each provider handles its own specifics - no shared base class

/**
 * OpenAI adapter - handles Bearer auth, OpenAI API format
 * Internal function that creates an OpenAI-compatible adapter
 * @param config - OpenAI configuration
 * @returns LLM adapter for OpenAI
 */
function createOpenAIAdapter(config: OpenAIConfig): LLMAdapter {
  const baseUrl = config.baseUrl || "https://api.openai.com/v1";
  
  return {
    async call(requestConfig: LLMConfig): Promise<LLMResponse> {
      const fetchFn = requestConfig.fetch || globalFetch;
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`,
      };
      
      const body = formatOpenAIRequest(requestConfig, config.model);
      
      const response = await fetchFn(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return parseOpenAIResponse(data, requestConfig);
    },
    
    async stream(requestConfig: LLMConfig): Promise<StreamingResponse> {
      const fetchFn = requestConfig.fetch || globalFetch;
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`,
      };
      
      const body = formatOpenAIRequest(requestConfig, config.model, true);
      
      const response = await fetchFn(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }
      
      return createOpenAIStreamingResponse(requestConfig, reader);
    },
    
    validateConfig(requestConfig: LLMConfig): boolean {
      try {
        validateLLMConfig(requestConfig);
        return true;
      } catch {
        return false;
      }
    },
  };
}

/**
 * Anthropic adapter - handles x-api-key auth, Anthropic format, thinking support
 * Internal function that creates an Anthropic adapter
 * @param config - Anthropic configuration
 * @returns LLM adapter for Anthropic
 */
function createAnthropicAdapter(config: AnthropicConfig): LLMAdapter {
  const baseUrl = config.baseUrl || "https://api.anthropic.com/v1";
  
  return {
    async call(requestConfig: LLMConfig): Promise<LLMResponse> {
      const fetchFn = requestConfig.fetch || globalFetch;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
      };
      
      if (config.enableThinking) {
        headers["anthropic-beta"] = "thinking-2024-12-03";
      }
      
      const body = formatAnthropicRequest(requestConfig, config.model, config.enableThinking);
      
      const response = await fetchFn(`${baseUrl}/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return parseAnthropicResponse(data, requestConfig);
    },
    
    async stream(requestConfig: LLMConfig): Promise<StreamingResponse> {
      const fetchFn = requestConfig.fetch || globalFetch;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
      };
      
      if (config.enableThinking) {
        headers["anthropic-beta"] = "thinking-2024-12-03";
      }
      
      const body = formatAnthropicRequest(requestConfig, config.model, config.enableThinking, true);
      
      const response = await fetchFn(`${baseUrl}/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }
      
      return createAnthropicStreamingResponse(requestConfig, reader);
    },
    
    validateConfig(requestConfig: LLMConfig): boolean {
      try {
        validateLLMConfig(requestConfig);
        return true;
      } catch {
        return false;
      }
    },
  };
}

/**
 * Google adapter - handles query param auth, Gemini format
 * Internal function that creates a Google adapter
 * @param config - Google configuration
 * @returns LLM adapter for Google
 */
function createGoogleAdapter(config: GoogleConfig): LLMAdapter {
  const baseUrl = config.baseUrl || "https://generativelanguage.googleapis.com/v1beta";
  
  return {
    async call(requestConfig: LLMConfig): Promise<LLMResponse> {
      const fetchFn = requestConfig.fetch || globalFetch;
      const url = `${baseUrl}/models/${config.model}:generateContent?key=${config.apiKey}`;
      
      const headers = {
        "Content-Type": "application/json",
      };
      
      const body = formatGoogleRequest(requestConfig);
      
      const response = await fetchFn(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        throw new Error(`Google API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return parseGoogleResponse(data, requestConfig, config.model);
    },
    
    async stream(requestConfig: LLMConfig): Promise<StreamingResponse> {
      const fetchFn = requestConfig.fetch || globalFetch;
      const url = `${baseUrl}/models/${config.model}:streamGenerateContent?key=${config.apiKey}`;
      
      const headers = {
        "Content-Type": "application/json",
      };
      
      const body = formatGoogleRequest(requestConfig, true);
      
      const response = await fetchFn(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        throw new Error(`Google API error: ${response.status} ${response.statusText}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }
      
      return createGoogleStreamingResponse(requestConfig, reader, config.model);
    },
    
    validateConfig(requestConfig: LLMConfig): boolean {
      try {
        validateLLMConfig(requestConfig);
        return true;
      } catch {
        return false;
      }
    },
  };
}

/**
 * Ollama adapter - no auth, local deployment, different API format
 * Internal function that creates an Ollama adapter
 * @param config - Ollama configuration
 * @returns LLM adapter for Ollama
 */
function createOllamaAdapter(config: OllamaConfig): LLMAdapter {
  const baseUrl = config.baseUrl || "http://localhost:11434";
  
  return {
    async call(requestConfig: LLMConfig): Promise<LLMResponse> {
      const fetchFn = requestConfig.fetch || globalFetch;
      const headers = {
        "Content-Type": "application/json",
      };
      
      const body = formatOllamaRequest(requestConfig, config.model);
      
      const response = await fetchFn(`${baseUrl}/api/chat`, {
        method: "POST", 
        headers,
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return parseOllamaResponse(data, requestConfig, config.model);
    },
    
    async stream(requestConfig: LLMConfig): Promise<StreamingResponse> {
      const fetchFn = requestConfig.fetch || globalFetch;
      const headers = {
        "Content-Type": "application/json",
      };
      
      const body = formatOllamaRequest(requestConfig, config.model, true);
      
      const response = await fetchFn(`${baseUrl}/api/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }
      
      return createOllamaStreamingResponse(requestConfig, reader, config.model);
    },
    
    validateConfig(requestConfig: LLMConfig): boolean {
      try {
        validateLLMConfig(requestConfig);
        return true;
      } catch {
        return false;
      }
    },
  };
}

/**
 * Groq adapter - OpenAI-compatible but different base URL
 * Internal function that creates a Groq adapter
 * @param config - Groq configuration
 * @returns LLM adapter for Groq
 */
function createGroqAdapter(config: GroqConfig): LLMAdapter {
  const baseUrl = config.baseUrl || "https://api.groq.com/openai/v1";
  
  return {
    async call(requestConfig: LLMConfig): Promise<LLMResponse> {
      const fetchFn = requestConfig.fetch || globalFetch;
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`,
      };
      
      const body = formatOpenAIRequest(requestConfig, config.model);
      
      const response = await fetchFn(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return parseOpenAIResponse(data, requestConfig);
    },
    
    async stream(requestConfig: LLMConfig): Promise<StreamingResponse> {
      const fetchFn = requestConfig.fetch || globalFetch;
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`,
      };
      
      const body = formatOpenAIRequest(requestConfig, config.model, true);
      
      const response = await fetchFn(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }
      
      return createOpenAIStreamingResponse(requestConfig, reader);
    },
    
    validateConfig(requestConfig: LLMConfig): boolean {
      try {
        validateLLMConfig(requestConfig);
        return true;
      } catch {
        return false;
      }
    },
  };
}

/**
 * DeepSeek adapter - OpenAI-compatible
 * Internal function that creates a DeepSeek adapter
 * @param config - DeepSeek configuration
 * @returns LLM adapter for DeepSeek
 */
function createDeepSeekAdapter(config: DeepSeekConfig): LLMAdapter {
  const baseUrl = config.baseUrl || "https://api.deepseek.com/v1";
  
  return {
    async call(requestConfig: LLMConfig): Promise<LLMResponse> {
      const fetchFn = requestConfig.fetch || globalFetch;
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`,
      };
      
      const body = formatOpenAIRequest(requestConfig, config.model);
      
      const response = await fetchFn(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return parseDeepSeekResponse(data, requestConfig);
    },
    
    async stream(requestConfig: LLMConfig): Promise<StreamingResponse> {
      const fetchFn = requestConfig.fetch || globalFetch;
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`,
      };
      
      const body = formatOpenAIRequest(requestConfig, config.model, true);
      
      const response = await fetchFn(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }
      
      return createDeepSeekStreamingResponse(requestConfig, reader);
    },
    
    validateConfig(requestConfig: LLMConfig): boolean {
      try {
        validateLLMConfig(requestConfig);
        return true;
      } catch {
        return false;
      }
    },
  };
}

/**
 * xAI adapter - OpenAI-compatible
 * Internal function that creates an xAI adapter
 * @param config - xAI configuration
 * @returns LLM adapter for xAI
 */
function createXAIAdapter(config: XAIConfig): LLMAdapter {
  const baseUrl = config.baseUrl || "https://api.x.ai/v1";
  
  return {
    async call(requestConfig: LLMConfig): Promise<LLMResponse> {
      const fetchFn = requestConfig.fetch || globalFetch;
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`,
      };
      
      const body = formatOpenAIRequest(requestConfig, config.model);
      
      const response = await fetchFn(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        throw new Error(`xAI API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return parseOpenAIResponse(data, requestConfig);
    },
    
    async stream(requestConfig: LLMConfig): Promise<StreamingResponse> {
      const fetchFn = requestConfig.fetch || globalFetch;
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`,
      };
      
      const body = formatOpenAIRequest(requestConfig, config.model, true);
      
      const response = await fetchFn(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        throw new Error(`xAI API error: ${response.status} ${response.statusText}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }
      
      return createOpenAIStreamingResponse(requestConfig, reader);
    },
    
    validateConfig(requestConfig: LLMConfig): boolean {
      try {
        validateLLMConfig(requestConfig);
        return true;
      } catch {
        return false;
      }
    },
  };
}

// ===== REQUEST/RESPONSE FORMATTERS =====
// Each provider has its own request/response format handlers

/**
 * Format request for OpenAI API
 * Internal function to convert unified config to OpenAI format
 * @param config - Unified LLM configuration
 * @param defaultModel - Default model name
 * @param stream - Whether this is a streaming request
 * @returns OpenAI API request body
 */
function formatOpenAIRequest(config: LLMConfig, defaultModel: string, stream = false): any {
  return {
    model: config.model || defaultModel,
    messages: config.messages.map(msg => ({
      role: msg.role === "tool_call" ? "assistant" : 
            msg.role === "tool_result" ? "tool" : msg.role,
      content: typeof msg.content === "string" ? msg.content : 
               msg.content.map(c => ({ type: c.type, text: c.content })),
    })),
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    tools: config.tools ? config.tools.map(tool => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    })) : undefined,
    stream,
  };
}

/**
 * Parse OpenAI API response
 * Internal function to convert OpenAI response to unified format
 * @param data - Raw OpenAI API response
 * @param requestConfig - Original request configuration
 * @returns Unified LLM response
 */
function parseOpenAIResponse(data: any, requestConfig: LLMConfig): LLMResponse {
  const choice = data.choices[0];
  const message = choice.message;
  
  const hasToolCalls = !!(message.tool_calls && message.tool_calls.length > 0);
  const hasText = !!(message.content && message.content.trim());
  
  return {
    service: requestConfig.service,
    model: data.model,
    content: message.content || "",
    toolCalls: hasToolCalls ? message.tool_calls.map((tc: any) => ({
      id: tc.id,
      name: tc.function.name,
      input: JSON.parse(tc.function.arguments),
    })) : undefined,
    capabilities: {
      hasText,
      hasReasoning: false, // OpenAI doesn't support reasoning
      hasToolCalls,
    },
    usage: {
      input_tokens: data.usage.prompt_tokens,
      output_tokens: data.usage.completion_tokens,
      total_tokens: data.usage.total_tokens,
    },
    messages: [
      ...requestConfig.messages,
      {
        role: "assistant",
        content: message.content || "",
      },
    ],
  };
}

/**
 * Create streaming response handler for OpenAI
 * Internal function to handle OpenAI streaming responses
 * @param requestConfig - Original request configuration
 * @param reader - Response stream reader
 * @returns Streaming response wrapper
 */
function createOpenAIStreamingResponse(
  requestConfig: LLMConfig, 
  reader: ReadableStreamDefaultReader<Uint8Array>
): StreamingResponse {
  let collectedContent = "";
  let collectedToolCalls: ToolCall[] = [];
  let usage: Usage | undefined;
  
  const chunks = async function* (): AsyncGenerator<StreamChunk> {
    for await (const chunk of parseSSEStream(reader)) {
      try {
        const data = JSON.parse(chunk);
        const choice = data.choices?.[0];
        
        if (!choice) continue;
        
        const delta = choice.delta;
        
        if (delta.content) {
          collectedContent += delta.content;
          yield {
            type: "content",
            content: delta.content,
          };
        }
        
        if (delta.tool_calls) {
          // Handle tool call streaming
          for (const toolCall of delta.tool_calls) {
            if (toolCall.function?.name) {
              const newToolCall: ToolCall = {
                id: toolCall.id,
                name: toolCall.function.name,
                input: JSON.parse(toolCall.function.arguments || "{}"),
              };
              collectedToolCalls.push(newToolCall);
              yield {
                type: "tool_call",
                toolCall: newToolCall,
              };
            }
          }
        }
        
        if (data.usage) {
          usage = {
            input_tokens: data.usage.prompt_tokens,
            output_tokens: data.usage.completion_tokens,
            total_tokens: data.usage.total_tokens,
          };
          yield {
            type: "usage",
            usage,
          };
        }
        
        if (choice.finish_reason) {
          const finalResponse: LLMResponse = {
            service: requestConfig.service,
            model: data.model,
            content: collectedContent,
            toolCalls: collectedToolCalls.length > 0 ? collectedToolCalls : undefined,
            capabilities: {
              hasText: !!collectedContent.trim(),
              hasReasoning: false,
              hasToolCalls: collectedToolCalls.length > 0,
            },
            usage: usage || { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
            messages: [
              ...requestConfig.messages,
              {
                role: "assistant",
                content: collectedContent,
              },
            ],
          };
          
          yield {
            type: "complete",
            finalResponse,
          };
        }
      } catch (error) {
        console.error("Error parsing OpenAI stream chunk:", error);
      }
    }
  };
  
  return {
    service: requestConfig.service,
    model: requestConfig.model,
    chunks: chunks(),
    async collect(): Promise<LLMResponse> {
      let finalResponse: LLMResponse | undefined;
      
      for await (const chunk of chunks()) {
        if (chunk.type === "complete" && chunk.finalResponse) {
          finalResponse = chunk.finalResponse;
          break;
        }
      }
      
      if (!finalResponse) {
        throw new Error("Stream ended without final response");
      }
      
      return finalResponse;
    },
  };
}

/**
 * Format request for Anthropic API
 * Internal function to convert unified config to Anthropic format
 * @param config - Unified LLM configuration
 * @param defaultModel - Default model name
 * @param enableThinking - Whether to enable thinking mode
 * @param stream - Whether this is a streaming request
 * @returns Anthropic API request body
 */
function formatAnthropicRequest(config: LLMConfig, defaultModel: string, enableThinking?: boolean, stream = false): any {
  // Separate system messages from regular messages
  const systemMessages = config.messages.filter(msg => msg.role === "system");
  const chatMessages = config.messages.filter(msg => msg.role !== "system");
  
  return {
    model: config.model || defaultModel,
    messages: chatMessages.map(msg => ({
      role: msg.role === "tool_call" ? "assistant" : 
            msg.role === "tool_result" ? "user" : msg.role,
      content: typeof msg.content === "string" ? msg.content : 
               msg.content.map(c => ({ type: c.type, text: c.content })),
    })),
    system: systemMessages.map(msg => msg.content).join("\n") || undefined,
    temperature: config.temperature,
    max_tokens: config.maxTokens || 4096,
    tools: config.tools ? config.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters,
    })) : undefined,
    stream,
  };
}

/**
 * Parse Anthropic API response
 * Internal function to convert Anthropic response to unified format
 * @param data - Raw Anthropic API response
 * @param requestConfig - Original request configuration
 * @returns Unified LLM response
 */
function parseAnthropicResponse(data: any, requestConfig: LLMConfig): LLMResponse {
  const hasThinking = !!(data.content.find((c: any) => c.type === "thinking"));
  const textContent = data.content.find((c: any) => c.type === "text");
  const toolUseContent = data.content.filter((c: any) => c.type === "tool_use");
  
  const hasText = !!(textContent && textContent.text.trim());
  const hasToolCalls = toolUseContent.length > 0;
  
  return {
    service: requestConfig.service,
    model: data.model,
    content: textContent ? textContent.text : "",
    reasoning: hasThinking ? data.content.find((c: any) => c.type === "thinking").content : undefined,
    toolCalls: hasToolCalls ? toolUseContent.map((tc: any) => ({
      id: tc.id,
      name: tc.name,
      input: tc.input,
    })) : undefined,
    capabilities: {
      hasText,
      hasReasoning: hasThinking,
      hasToolCalls,
    },
    usage: {
      input_tokens: data.usage.input_tokens,
      output_tokens: data.usage.output_tokens,
      total_tokens: data.usage.input_tokens + data.usage.output_tokens,
    },
    messages: [
      ...requestConfig.messages,
      {
        role: "assistant",
        content: textContent ? textContent.text : "",
      },
    ],
  };
}

/**
 * Create streaming response handler for Anthropic
 * Internal function to handle Anthropic streaming responses
 * @param requestConfig - Original request configuration
 * @param reader - Response stream reader
 * @returns Streaming response wrapper
 */
function createAnthropicStreamingResponse(
  requestConfig: LLMConfig, 
  reader: ReadableStreamDefaultReader<Uint8Array>
): StreamingResponse {
  let collectedContent = "";
  let collectedReasoning = "";
  let collectedToolCalls: ToolCall[] = [];
  let usage: Usage | undefined;
  
  const chunks = async function* (): AsyncGenerator<StreamChunk> {
    for await (const chunk of parseSSEStream(reader)) {
      try {
        const data = JSON.parse(chunk);
        
        if (data.type === "content_block_delta" && data.delta) {
          if (data.delta.type === "text_delta") {
            collectedContent += data.delta.text;
            yield {
              type: "content",
              content: data.delta.text,
            };
          } else if (data.delta.type === "thinking_delta") {
            collectedReasoning += data.delta.text;
            yield {
              type: "reasoning",
              reasoning: data.delta.text,
            };
          }
        }
        
        if (data.type === "content_block_start" && data.content_block?.type === "tool_use") {
          const toolCall: ToolCall = {
            id: data.content_block.id,
            name: data.content_block.name,
            input: data.content_block.input,
          };
          collectedToolCalls.push(toolCall);
          yield {
            type: "tool_call",
            toolCall,
          };
        }
        
        if (data.type === "message_delta" && data.usage) {
          usage = {
            input_tokens: data.usage.input_tokens || 0,
            output_tokens: data.usage.output_tokens || 0,
            total_tokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
          };
          yield {
            type: "usage",
            usage,
          };
        }
        
        if (data.type === "message_stop") {
          const finalResponse: LLMResponse = {
            service: requestConfig.service,
            model: requestConfig.model,
            content: collectedContent,
            reasoning: collectedReasoning || undefined,
            toolCalls: collectedToolCalls.length > 0 ? collectedToolCalls : undefined,
            capabilities: {
              hasText: !!collectedContent.trim(),
              hasReasoning: !!collectedReasoning.trim(),
              hasToolCalls: collectedToolCalls.length > 0,
            },
            usage: usage || { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
            messages: [
              ...requestConfig.messages,
              {
                role: "assistant",
                content: collectedContent,
              },
            ],
          };
          
          yield {
            type: "complete",
            finalResponse,
          };
        }
      } catch (error) {
        console.error("Error parsing Anthropic stream chunk:", error);
      }
    }
  };
  
  return {
    service: requestConfig.service,
    model: requestConfig.model,
    chunks: chunks(),
    async collect(): Promise<LLMResponse> {
      let finalResponse: LLMResponse | undefined;
      
      for await (const chunk of chunks()) {
        if (chunk.type === "complete" && chunk.finalResponse) {
          finalResponse = chunk.finalResponse;
          break;
        }
      }
      
      if (!finalResponse) {
        throw new Error("Stream ended without final response");
      }
      
      return finalResponse;
    },
  };
}

/**
 * Format request for Google API
 * Internal function to convert unified config to Google format
 * @param config - Unified LLM configuration
 * @param stream - Whether this is a streaming request
 * @returns Google API request body
 */
function formatGoogleRequest(config: LLMConfig, stream = false): any {
  return {
    contents: config.messages.filter(msg => msg.role !== "system").map(msg => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: typeof msg.content === "string" ? msg.content : msg.content[0]?.content }],
    })),
    systemInstruction: config.messages.find(msg => msg.role === "system")?.content,
    generationConfig: {
      temperature: config.temperature,
      maxOutputTokens: config.maxTokens,
    },
  };
}

/**
 * Parse Google API response
 * Internal function to convert Google response to unified format
 * @param data - Raw Google API response
 * @param requestConfig - Original request configuration
 * @param model - Model name
 * @returns Unified LLM response
 */
function parseGoogleResponse(data: any, requestConfig: LLMConfig, model: string): LLMResponse {
  const candidate = data.candidates[0];
  const content = candidate.content.parts[0].text || "";
  
  return {
    service: requestConfig.service,
    model: model,
    content,
    capabilities: {
      hasText: !!content.trim(),
      hasReasoning: false,
      hasToolCalls: false,
    },
    usage: {
      input_tokens: data.usageMetadata.promptTokenCount || 0,
      output_tokens: data.usageMetadata.candidatesTokenCount || 0,
      total_tokens: data.usageMetadata.totalTokenCount || 0,
    },
    messages: [
      ...requestConfig.messages,
      {
        role: "assistant",
        content,
      },
    ],
  };
}

/**
 * Create streaming response handler for Google
 * Internal function to handle Google streaming responses
 * @param requestConfig - Original request configuration
 * @param reader - Response stream reader
 * @param model - Model name
 * @returns Streaming response wrapper
 */
function createGoogleStreamingResponse(
  requestConfig: LLMConfig, 
  reader: ReadableStreamDefaultReader<Uint8Array>,
  model: string
): StreamingResponse {
  let collectedContent = "";
  let usage: Usage | undefined;
  
  const chunks = async function* (): AsyncGenerator<StreamChunk> {
    for await (const chunk of parseSSEStream(reader)) {
      try {
        const data = JSON.parse(chunk);
        const candidate = data.candidates?.[0];
        
        if (candidate?.content?.parts?.[0]?.text) {
          const content = candidate.content.parts[0].text;
          collectedContent += content;
          yield {
            type: "content",
            content,
          };
        }
        
        if (data.usageMetadata) {
          usage = {
            input_tokens: data.usageMetadata.promptTokenCount || 0,
            output_tokens: data.usageMetadata.candidatesTokenCount || 0,
            total_tokens: data.usageMetadata.totalTokenCount || 0,
          };
          yield {
            type: "usage",
            usage,
          };
        }
        
        if (candidate?.finishReason) {
          const finalResponse: LLMResponse = {
            service: requestConfig.service,
            model,
            content: collectedContent,
            capabilities: {
              hasText: !!collectedContent.trim(),
              hasReasoning: false,
              hasToolCalls: false,
            },
            usage: usage || { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
            messages: [
              ...requestConfig.messages,
              {
                role: "assistant",
                content: collectedContent,
              },
            ],
          };
          
          yield {
            type: "complete",
            finalResponse,
          };
        }
      } catch (error) {
        console.error("Error parsing Google stream chunk:", error);
      }
    }
  };
  
  return {
    service: requestConfig.service,
    model,
    chunks: chunks(),
    async collect(): Promise<LLMResponse> {
      let finalResponse: LLMResponse | undefined;
      
      for await (const chunk of chunks()) {
        if (chunk.type === "complete" && chunk.finalResponse) {
          finalResponse = chunk.finalResponse;
          break;
        }
      }
      
      if (!finalResponse) {
        throw new Error("Stream ended without final response");
      }
      
      return finalResponse;
    },
  };
}

/**
 * Format request for Ollama API
 * Internal function to convert unified config to Ollama format
 * @param config - Unified LLM configuration
 * @param model - Model name
 * @param stream - Whether this is a streaming request
 * @returns Ollama API request body
 */
function formatOllamaRequest(config: LLMConfig, model: string, stream = false): any {
  return {
    model: model,
    messages: config.messages.map(msg => ({
      role: msg.role,
      content: typeof msg.content === "string" ? msg.content : msg.content[0]?.content,
    })),
    stream,
    options: {
      temperature: config.temperature,
      num_predict: config.maxTokens,
    },
    tools: config.tools ? config.tools.map(tool => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    })) : undefined,
  };
}

/**
 * Parse Ollama API response
 * Internal function to convert Ollama response to unified format
 * @param data - Raw Ollama API response
 * @param requestConfig - Original request configuration
 * @param model - Model name
 * @returns Unified LLM response
 */
function parseOllamaResponse(data: any, requestConfig: LLMConfig, model: string): LLMResponse {
  const content = data.message.content || "";
  const hasToolCalls = !!(data.message.tool_calls && data.message.tool_calls.length > 0);
  
  return {
    service: requestConfig.service,
    model: model,
    content,
    toolCalls: hasToolCalls ? data.message.tool_calls.map((tc: any) => ({
      id: tc.id || `tool_${Date.now()}`,
      name: tc.function.name,
      input: JSON.parse(tc.function.arguments),
    })) : undefined,
    capabilities: {
      hasText: !!content.trim(),
      hasReasoning: false,
      hasToolCalls,
    },
    usage: {
      input_tokens: data.prompt_eval_count || 0,
      output_tokens: data.eval_count || 0,
      total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
    },
    messages: [
      ...requestConfig.messages,
      {
        role: "assistant",
        content,
      },
    ],
  };
}

/**
 * Create streaming response handler for Ollama
 * Internal function to handle Ollama streaming responses
 * @param requestConfig - Original request configuration
 * @param reader - Response stream reader
 * @param model - Model name
 * @returns Streaming response wrapper
 */
function createOllamaStreamingResponse(
  requestConfig: LLMConfig, 
  reader: ReadableStreamDefaultReader<Uint8Array>,
  model: string
): StreamingResponse {
  let collectedContent = "";
  let collectedToolCalls: ToolCall[] = [];
  let usage: Usage | undefined;
  
  const chunks = async function* (): AsyncGenerator<StreamChunk> {
    const decoder = new TextDecoder();
    let buffer = '';
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              
              if (data.message?.content) {
                collectedContent += data.message.content;
                yield {
                  type: "content",
                  content: data.message.content,
                };
              }
              
              if (data.message?.tool_calls) {
                for (const toolCall of data.message.tool_calls) {
                  const newToolCall: ToolCall = {
                    id: toolCall.id || `tool_${Date.now()}`,
                    name: toolCall.function.name,
                    input: JSON.parse(toolCall.function.arguments || "{}"),
                  };
                  collectedToolCalls.push(newToolCall);
                  yield {
                    type: "tool_call",
                    toolCall: newToolCall,
                  };
                }
              }
              
              if (data.done) {
                usage = {
                  input_tokens: data.prompt_eval_count || 0,
                  output_tokens: data.eval_count || 0,
                  total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
                };
                
                yield {
                  type: "usage",
                  usage,
                };
                
                const finalResponse: LLMResponse = {
                  service: requestConfig.service,
                  model,
                  content: collectedContent,
                  toolCalls: collectedToolCalls.length > 0 ? collectedToolCalls : undefined,
                  capabilities: {
                    hasText: !!collectedContent.trim(),
                    hasReasoning: false,
                    hasToolCalls: collectedToolCalls.length > 0,
                  },
                  usage: usage || { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
                  messages: [
                    ...requestConfig.messages,
                    {
                      role: "assistant",
                      content: collectedContent,
                    },
                  ],
                };
                
                yield {
                  type: "complete",
                  finalResponse,
                };
                break;
              }
            } catch (error) {
              console.error("Error parsing Ollama stream chunk:", error);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  };
  
  return {
    service: requestConfig.service,
    model,
    chunks: chunks(),
    async collect(): Promise<LLMResponse> {
      let finalResponse: LLMResponse | undefined;
      
      for await (const chunk of chunks()) {
        if (chunk.type === "complete" && chunk.finalResponse) {
          finalResponse = chunk.finalResponse;
          break;
        }
      }
      
      if (!finalResponse) {
        throw new Error("Stream ended without final response");
      }
      
      return finalResponse;
    },
  };
}

/**
 * Parse DeepSeek API response
 * Internal function to convert DeepSeek response to unified format
 * @param data - Raw DeepSeek API response
 * @param requestConfig - Original request configuration
 * @returns Unified LLM response
 */
function parseDeepSeekResponse(data: any, requestConfig: LLMConfig): LLMResponse {
  const choice = data.choices[0];
  const message = choice.message;
  
  const hasToolCalls = !!(message.tool_calls && message.tool_calls.length > 0);
  const hasText = !!(message.content && message.content.trim());
  const hasReasoning = !!(message.reasoning_content && message.reasoning_content.trim());
  
  return {
    service: requestConfig.service,
    model: data.model,
    content: message.content || "",
    reasoning: message.reasoning_content || undefined,
    toolCalls: hasToolCalls ? message.tool_calls.map((tc: any) => ({
      id: tc.id,
      name: tc.function.name,
      input: JSON.parse(tc.function.arguments),
    })) : undefined,
    capabilities: {
      hasText,
      hasReasoning,
      hasToolCalls,
    },
    usage: {
      input_tokens: data.usage.prompt_tokens,
      output_tokens: data.usage.completion_tokens,
      total_tokens: data.usage.total_tokens,
      reasoning_tokens: data.usage.completion_tokens_details?.reasoning_tokens,
    },
    messages: [
      ...requestConfig.messages,
      {
        role: "assistant",
        content: message.content || "",
      },
    ],
  };
}

/**
 * Create streaming response handler for DeepSeek
 * Internal function to handle DeepSeek streaming responses
 * @param requestConfig - Original request configuration
 * @param reader - Response stream reader
 * @returns Streaming response wrapper
 */
function createDeepSeekStreamingResponse(
  requestConfig: LLMConfig, 
  reader: ReadableStreamDefaultReader<Uint8Array>
): StreamingResponse {
  let collectedContent = "";
  let collectedReasoning = "";
  let collectedToolCalls: ToolCall[] = [];
  let usage: Usage | undefined;
  
  const chunks = async function* (): AsyncGenerator<StreamChunk> {
    for await (const chunk of parseSSEStream(reader)) {
      try {
        const data = JSON.parse(chunk);
        const choice = data.choices?.[0];
        
        if (!choice) continue;
        
        const delta = choice.delta;
        
        if (delta.content) {
          collectedContent += delta.content;
          yield {
            type: "content",
            content: delta.content,
          };
        }
        
        if (delta.reasoning_content) {
          collectedReasoning += delta.reasoning_content;
          yield {
            type: "reasoning",
            reasoning: delta.reasoning_content,
          };
        }
        
        if (delta.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            if (toolCall.function?.name) {
              const newToolCall: ToolCall = {
                id: toolCall.id,
                name: toolCall.function.name,
                input: JSON.parse(toolCall.function.arguments || "{}"),
              };
              collectedToolCalls.push(newToolCall);
              yield {
                type: "tool_call",
                toolCall: newToolCall,
              };
            }
          }
        }
        
        if (data.usage) {
          usage = {
            input_tokens: data.usage.prompt_tokens,
            output_tokens: data.usage.completion_tokens,
            total_tokens: data.usage.total_tokens,
            reasoning_tokens: data.usage.completion_tokens_details?.reasoning_tokens,
          };
          yield {
            type: "usage",
            usage,
          };
        }
        
        if (choice.finish_reason) {
          const finalResponse: LLMResponse = {
            service: requestConfig.service,
            model: data.model,
            content: collectedContent,
            reasoning: collectedReasoning || undefined,
            toolCalls: collectedToolCalls.length > 0 ? collectedToolCalls : undefined,
            capabilities: {
              hasText: !!collectedContent.trim(),
              hasReasoning: !!collectedReasoning.trim(),
              hasToolCalls: collectedToolCalls.length > 0,
            },
            usage: usage || { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
            messages: [
              ...requestConfig.messages,
              {
                role: "assistant",
                content: collectedContent,
              },
            ],
          };
          
          yield {
            type: "complete",
            finalResponse,
          };
        }
      } catch (error) {
        console.error("Error parsing DeepSeek stream chunk:", error);
      }
    }
  };
  
  return {
    service: requestConfig.service,
    model: requestConfig.model,
    chunks: chunks(),
    async collect(): Promise<LLMResponse> {
      let finalResponse: LLMResponse | undefined;
      
      for await (const chunk of chunks()) {
        if (chunk.type === "complete" && chunk.finalResponse) {
          finalResponse = chunk.finalResponse;
          break;
        }
      }
      
      if (!finalResponse) {
        throw new Error("Stream ended without final response");
      }
      
      return finalResponse;
    },
  };
}
