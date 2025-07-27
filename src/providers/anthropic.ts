import type { 
  AnthropicConfig, 
  LLMConfig, 
  LLMResponse, 
  StreamingResponse, 
  StreamChunk,
  ToolCall,
  Usage 
} from '../types/index.js';
import type { LLMAdapter } from '../core/adapter.js';
import { validateLLMConfig } from '../utils/validation.js';
import { parseSSEStream } from '../utils/streaming.js';

/**
 * Anthropic adapter - handles x-api-key auth, Anthropic format, thinking support
 * Internal function that creates an Anthropic adapter
 * @param config - Anthropic configuration
 * @returns LLM adapter for Anthropic
 */
export function createAnthropicAdapter(config: AnthropicConfig): LLMAdapter {
  const baseUrl = config.baseUrl || "https://api.anthropic.com/v1";
  
  return {
    async call(requestConfig: LLMConfig): Promise<LLMResponse> {
      const fetchFn = requestConfig.fetch || globalThis.fetch;
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
      const fetchFn = requestConfig.fetch || globalThis.fetch;
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