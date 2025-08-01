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
import { validateLLMConfig, sanitizeTools, validateToolResultMessage, validateOpenAIConversationFlow } from '../utils/validation.js';
import { parseSSEStream } from '../utils/streaming.js';

/**
 * Ollama adapter - handles local deployment, OpenAI-compatible format
 * Internal function that creates an Ollama adapter using OpenAI API format
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
      
      const response = await fetchFn(`${baseUrl}/v1/chat/completions`, {
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
      
      const response = await fetchFn(`${baseUrl}/v1/chat/completions`, {
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
 * Format request for Ollama API (OpenAI compatible)
 * Internal function to convert unified config to OpenAI format
 * @param config - Unified LLM configuration
 * @param defaultModel - Default model name
 * @param stream - Whether this is a streaming request
 * @returns OpenAI compatible API request body
 */
function formatOllamaRequest(config: LLMConfig, defaultModel: string, stream = false): any {
  // Validate tool result messages
  config.messages.forEach(msg => validateToolResultMessage(msg, 'openai'));
  
  // Validate conversation flow for OpenAI API
  validateOpenAIConversationFlow(config.messages, "Ollama");

  return {
    model: config.model || defaultModel,
    messages: config.messages.map(msg => {
      // Handle tool result messages (role: "tool_result" -> "tool")
      if (msg.role === "tool_result") {
        if (!msg.tool_call_id) {
          throw new Error("Tool result message must have tool_call_id for Ollama OpenAI API");
        }
        return {
          role: "tool",
          content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
          tool_call_id: msg.tool_call_id,
        };
      }
      
      // Handle assistant messages with tool calls
      if (msg.role === "assistant" && msg.tool_calls) {
        return {
          role: "assistant",
          content: msg.content || null,
          tool_calls: msg.tool_calls.map(tc => ({
            id: tc.id,
            type: "function",
            function: {
              name: tc.name,
              arguments: typeof tc.input === 'string' ? tc.input : JSON.stringify(tc.input),
            },
          })),
        };
      }
      
      // Handle regular messages
      return {
        role: msg.role,
        content: typeof msg.content === "string" ? msg.content : 
                 (Array.isArray(msg.content) ? msg.content.map(c => ({ type: c.type, text: c.content })) : msg.content),
      };
    }),
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    tools: config.tools ? sanitizeTools(config.tools).map(tool => ({
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
 * Parse Ollama API response (OpenAI compatible)
 * Internal function to convert OpenAI-compatible response to unified format
 * @param data - Raw Ollama API response
 * @param requestConfig - Original request configuration
 * @returns Unified LLM response
 */
function parseOllamaResponse(data: any, requestConfig: LLMConfig): LLMResponse {
  const choice = data.choices[0];
  const message = choice.message;
  
  const hasToolCalls = !!(message.tool_calls && message.tool_calls.length > 0);
  const hasText = !!(message.content && message.content.trim());

  const toolCalls = hasToolCalls ? message.tool_calls.map((tc: any) => ({
    id: tc.id,
    name: tc.function.name,
    input: JSON.parse(tc.function.arguments),
  })) : undefined;
  
  return {
    service: requestConfig.service,
    model: data.model,
    content: message.content || "",
    reasoning: undefined, // Ollama doesn't support reasoning
    toolCalls: toolCalls,
    capabilities: {
      hasText,
      hasReasoning: false, // Ollama doesn't support reasoning
      hasToolCalls,
    },
    usage: {
      input_tokens: data.usage?.prompt_tokens || 0,
      output_tokens: data.usage?.completion_tokens || 0,
      total_tokens: data.usage?.total_tokens || 0,
    },
    messages: [
      ...requestConfig.messages,
      {
        role: "assistant",
        content: message.content || "",
        tool_calls: toolCalls,
      },
    ],
  };
}

/**
 * Create streaming response handler for Ollama (OpenAI compatible)
 * Internal function to handle OpenAI-compatible streaming responses
 * @param requestConfig - Original request configuration
 * @param reader - Response stream reader
 * @returns Streaming response wrapper
 */
function createOllamaStreamingResponse(
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
            reasoning: undefined, // Ollama doesn't support reasoning
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
                tool_calls: collectedToolCalls.length > 0 ? collectedToolCalls : undefined,
              },
            ],
          };
          
          yield {
            type: "complete",
            finalResponse,
          };
        }
      } catch (error) {
        console.error("Error parsing Ollama stream chunk:", error);
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