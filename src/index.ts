// ===== CORE TYPES =====
export type ServiceName = 
  | "openai" 
  | "anthropic" 
  | "google" 
  | "ollama" 
  | "groq" 
  | "deepseek" 
  | "xai";

// Message system with provider-agnostic roles
export type MessageRole = "user" | "assistant" | "system" | "tool_call" | "tool_result";

export interface MessageContent {
  type: "text" | "image" | "audio" | "video" | "file";
  content: string;
  metadata?: Record<string, unknown>;
}

export interface Message {
  role: MessageRole;
  content: string | MessageContent[];
}

// ===== FETCH DEPENDENCY INJECTION =====
export type FetchFunction = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

// Global default fetch - can be overridden
let globalFetch: FetchFunction = globalThis.fetch;

/**
 * Set the default fetch implementation for all LLM calls
 * @param fetchImpl - The fetch implementation to use as default
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
export interface JSONSchemaProperty {
  type: "string" | "number" | "boolean" | "array" | "object";
  description?: string;
  enum?: (string | number)[];
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
}

export interface JSONSchema {
  type: "object";
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface Tool {
  name: string;
  description: string;
  parameters: JSONSchema;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

// ===== USAGE & METRICS =====
export interface Usage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  input_cost?: number;
  output_cost?: number;
  total_cost?: number;
  reasoning_tokens?: number; // For providers that support reasoning
}

// ===== CONFIGURATION =====
export interface LLMConfig {
  service: ServiceName;
  model: string;
  messages: Message[];
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: Tool[];
  systemPrompt?: string;
  fetch?: FetchFunction; // Optional fetch override
}

// ===== UNIFIED RESPONSE TYPE =====
interface BaseResponse {
  service: ServiceName;
  model: string;
  usage: Usage;
  messages: Message[];
}

export interface LLMResponse extends BaseResponse {
  /** The primary text content of the response */
  content: string;
  
  /** Reasoning/thinking content (when supported by provider) */
  reasoning?: string;
  
  /** Tool calls made during this response (when tools are used) */
  toolCalls?: ToolCall[];
  
  /** Indicates what types of content this response contains */
  capabilities: {
    hasText: boolean;
    hasReasoning: boolean;
    hasToolCalls: boolean;
  };
}

// ===== STREAMING TYPES =====
export interface StreamChunk {
  type: "content" | "tool_call" | "usage" | "reasoning" | "complete";
  content?: string;
  toolCall?: Partial<ToolCall>;
  usage?: Usage;
  reasoning?: string;
  finalResponse?: LLMResponse;
}

export interface StreamingResponse {
  service: ServiceName;
  model: string;
  chunks: AsyncIterable<StreamChunk>;
  
  // Utility method to collect the full response
  collect(): Promise<LLMResponse>;
}

// ===== TYPE GUARDS & UTILITIES =====
export function hasTextContent(response: LLMResponse): boolean {
  return response.capabilities.hasText && !!response.content;
}

export function hasReasoning(response: LLMResponse): boolean {
  return response.capabilities.hasReasoning && !!response.reasoning;
}

export function hasToolCalls(response: LLMResponse): boolean {
  return response.capabilities.hasToolCalls && !!response.toolCalls && response.toolCalls.length > 0;
}

// For backwards compatibility and clarity
export function isTextResponse(response: LLMResponse): boolean {
  return hasTextContent(response) && !hasReasoning(response) && !hasToolCalls(response);
}

export function isToolCallResponse(response: LLMResponse): boolean {
  return hasToolCalls(response);
}

export function isReasoningResponse(response: LLMResponse): boolean {
  return hasReasoning(response);
}

export function isComplexResponse(response: LLMResponse): boolean {
  const capabilityCount = [
    response.capabilities.hasText,
    response.capabilities.hasReasoning, 
    response.capabilities.hasToolCalls
  ].filter(Boolean).length;
  
  return capabilityCount > 1;
}

export function getResponseType(response: LLMResponse): string {
  const types = [];
  if (response.capabilities.hasReasoning) types.push("reasoning");
  if (response.capabilities.hasToolCalls) types.push("tool_calls");
  if (response.capabilities.hasText) types.push("text");
  
  return types.join(" + ") || "empty";
}

// ===== SERVICE CAPABILITY CHECKS =====
export function isOpenAICompatible(service: ServiceName): boolean {
  return ["openai", "groq", "deepseek", "xai"].includes(service);
}

export function requiresApiKey(service: ServiceName): boolean {
  return service !== "ollama";
}

export function supportsBearerAuth(service: ServiceName): boolean {
  return isOpenAICompatible(service);
}

// ===== PROVIDER-SPECIFIC CONFIGURATIONS =====
export interface OpenAIConfig extends Omit<LLMConfig, 'service'> {
  service: "openai";
  apiKey: string;
  model: string;
  baseUrl?: string; // defaults to official API
  fetch?: FetchFunction; // Optional fetch override
}

export interface AnthropicConfig extends Omit<LLMConfig, 'service'> {
  service: "anthropic";
  apiKey: string;
  model: string;
  baseUrl?: string;
  enableThinking?: boolean;
  fetch?: FetchFunction; // Optional fetch override
}

export interface GoogleConfig extends Omit<LLMConfig, 'service'> {
  service: "google";
  apiKey: string;
  model: string;
  baseUrl?: string;
  fetch?: FetchFunction; // Optional fetch override
}

export interface OllamaConfig extends Omit<LLMConfig, 'service'> {
  service: "ollama";
  model: string; // required for local models
  baseUrl?: string; // defaults to localhost:11434
  fetch?: FetchFunction; // Optional fetch override
}

export interface GroqConfig extends Omit<LLMConfig, 'service'> {
  service: "groq";
  apiKey: string;
  model: string;
  baseUrl?: string;
  fetch?: FetchFunction; // Optional fetch override
}

export interface DeepSeekConfig extends Omit<LLMConfig, 'service'> {
  service: "deepseek";
  apiKey: string;
  model: string;
  baseUrl?: string;
  fetch?: FetchFunction; // Optional fetch override
}

export interface XAIConfig extends Omit<LLMConfig, 'service'> {
  service: "xai";
  apiKey: string;
  model: string;
  baseUrl?: string;
  fetch?: FetchFunction; // Optional fetch override
}

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
 */
interface LLMAdapter {
  // Core methods
  call(config: LLMConfig): Promise<LLMResponse>;
  stream(config: LLMConfig): Promise<StreamingResponse>;
  
  // Utility methods
  validateConfig(config: LLMConfig): boolean;
}

// ===== ADAPTER FACTORY =====
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
