import type { 
  OllamaConfig, 
  LLMConfig, 
  LLMResponse, 
  StreamingResponse, 
  StreamChunk,
  ToolCall,
  Usage 
} from '../types/index.js';
import type { LLMAdapter } from '../core/adapter.js';
import { validateLLMConfig } from '../utils/validation.js';

/**
 * Ollama adapter - handles local deployment, Ollama-specific format
 * Internal function that creates an Ollama-compatible adapter
 * @param config - Ollama configuration
 * @returns LLM adapter for Ollama
 */
export function createOllamaAdapter(config: OllamaConfig): LLMAdapter {
  const baseUrl = config.baseUrl || "http://localhost:11434";
  
  return {
    async call(requestConfig: LLMConfig): Promise<LLMResponse> {
      const fetchFn = requestConfig.fetch || globalThis.fetch;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      
      // Ollama is typically used locally and should work in browsers if the server allows CORS
      if (requestConfig.isBrowser || config.isBrowser) {
        // No special headers needed for Ollama, but user should ensure CORS is configured on their Ollama server
        console.info("Using Ollama in browser mode. Ensure your Ollama server has CORS enabled if needed.");
      }
      
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
      return parseOllamaResponse(data, requestConfig);
    },
    
    async stream(requestConfig: LLMConfig): Promise<StreamingResponse> {
      const fetchFn = requestConfig.fetch || globalThis.fetch;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      
      // Ollama is typically used locally and should work in browsers if the server allows CORS
      if (requestConfig.isBrowser || config.isBrowser) {
        console.info("Using Ollama in browser mode. Ensure your Ollama server has CORS enabled if needed.");
      }
      
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
      
      return createOllamaStreamingResponse(requestConfig, reader);
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
 * Format request for Ollama API
 * Internal function to convert unified config to Ollama format
 * @param config - Unified LLM configuration
 * @param defaultModel - Default model name
 * @param stream - Whether this is a streaming request
 * @returns Ollama API request body
 */
function formatOllamaRequest(config: LLMConfig, defaultModel: string, stream = false): any {
  const messages = config.messages.map(msg => ({
    role: msg.role === "assistant" ? "assistant" : "user",
    content: msg.content,
  }));

  const body: any = {
    model: config.model || defaultModel,
    messages,
    stream,
  };

  // Add generation options if provided
  if (config.temperature !== undefined || config.maxTokens !== undefined) {
    body.options = {};
    if (config.temperature !== undefined) {
      body.options.temperature = config.temperature;
    }
    if (config.maxTokens !== undefined) {
      body.options.num_predict = config.maxTokens;
    }
  }

  return body;
}

/**
 * Parse Ollama API response
 * Internal function to convert Ollama response to unified format
 * @param data - Raw Ollama API response
 * @param requestConfig - Original request configuration
 * @returns Unified LLM response
 */
function parseOllamaResponse(data: any, requestConfig: LLMConfig): LLMResponse {
  const content = data.message?.content || "";
  const hasText = !!content.trim();
  
  return {
    service: requestConfig.service,
    model: data.model || requestConfig.model || "unknown",
    content,
    reasoning: undefined, // Ollama doesn't support reasoning
    toolCalls: undefined, // Basic Ollama doesn't support tool calls
    capabilities: {
      hasText,
      hasReasoning: false, // Ollama doesn't support reasoning
      hasToolCalls: false, // Basic Ollama doesn't support tool calls
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
 * @returns Streaming response wrapper
 */
function createOllamaStreamingResponse(
  requestConfig: LLMConfig, 
  reader: ReadableStreamDefaultReader<Uint8Array>
): StreamingResponse {
  let collectedContent = "";
  let usage: Usage | undefined;
  
  const chunks = async function* (): AsyncGenerator<StreamChunk> {
    const decoder = new TextDecoder();
    let buffer = "";
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              
              if (data.message?.content) {
                const content = data.message.content;
                collectedContent += content;
                yield {
                  type: "content",
                  content,
                };
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
                  model: data.model || requestConfig.model || "unknown",
                  content: collectedContent,
                  reasoning: undefined, // Ollama doesn't support reasoning
                  toolCalls: undefined, // Ollama doesn't support tool calls
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
                
                return;
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