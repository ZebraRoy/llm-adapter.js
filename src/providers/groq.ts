import type { 
  GroqConfig, 
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
 * Groq adapter - handles Bearer auth, OpenAI-compatible format
 * Internal function that creates a Groq-compatible adapter
 * @param config - Groq configuration
 * @returns LLM adapter for Groq
 */
export function createGroqAdapter(config: GroqConfig): LLMAdapter {
  const baseUrl = config.baseUrl || "https://api.groq.com/openai/v1";
  
  return {
    async call(requestConfig: LLMConfig): Promise<LLMResponse> {
      const fetchFn = requestConfig.fetch || globalThis.fetch;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`,
      };
      
      // Groq API may have CORS restrictions for browser requests
      if (requestConfig.isBrowser || config.isBrowser) {
        console.warn("Groq API may not work directly from browsers due to CORS policy. Consider using a proxy server.");
      }
      
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
      const fetchFn = requestConfig.fetch || globalThis.fetch;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`,
      };
      
      // Groq API may have CORS restrictions for browser requests
      if (requestConfig.isBrowser || config.isBrowser) {
        console.warn("Groq API may not work directly from browsers due to CORS policy. Consider using a proxy server.");
      }
      
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
 * Format request for OpenAI-compatible API
 * Internal function to convert unified config to OpenAI format
 * @param config - Unified LLM configuration
 * @param defaultModel - Default model name
 * @param stream - Whether this is a streaming request
 * @returns OpenAI API request body
 */
function formatOpenAIRequest(config: LLMConfig, defaultModel: string, stream = false): any {
  // Validate tool result messages
  config.messages.forEach(msg => validateToolResultMessage(msg, 'groq'));
  
  // Validate conversation flow for Groq API
  validateOpenAIConversationFlow(config.messages, "Groq");

  const body: any = {
    model: config.model || defaultModel,
    messages: config.messages.map(msg => {
      // Handle tool result messages (role: "tool_result" -> "tool")
      if (msg.role === "tool_result") {
        if (!msg.tool_call_id) {
          throw new Error("Tool result message must have tool_call_id for Groq API");
        }
        return {
          role: "tool",
          content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
          tool_call_id: msg.tool_call_id, // CRITICAL: Required field
          name: msg.name, // Optional function name
        };
      }
      
      // Handle assistant messages with tool calls
      if (msg.role === "assistant" && msg.tool_calls) {
        return {
          role: "assistant",
          content: typeof msg.content === "string" ? msg.content : null,
          tool_calls: msg.tool_calls.map(tc => ({
            id: tc.id,
            type: "function",
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.input),
            },
          })),
        };
      }
      
      // Handle regular messages
      return {
        role: msg.role === "tool_call" ? "assistant" : msg.role,
        content: typeof msg.content === "string" ? msg.content : 
                 msg.content.map(c => ({ type: c.type, text: c.content })),
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

  // Add reasoning parameters for reasoning models
  const isReasoningModel = /qwen|deepseek/.test(config.model || defaultModel);
  if (isReasoningModel) {
    if ('reasoningFormat' in config && config.reasoningFormat) {
      body.reasoning_format = config.reasoningFormat;
    }
    if ('reasoningEffort' in config && config.reasoningEffort) {
      body.reasoning_effort = config.reasoningEffort;
    }
    // Set required temperature for thinking mode
    if (config.reasoningEffort === "default") {
      body.temperature = config.temperature ?? 0.6;
    }
  }

  return body;
}

/**
 * Parse OpenAI-compatible API response
 * Internal function to convert OpenAI response to unified format
 * @param data - Raw API response
 * @param requestConfig - Original request configuration
 * @returns Unified LLM response
 */
function parseOpenAIResponse(data: any, requestConfig: LLMConfig): LLMResponse {
  const choice = data.choices[0];
  const message = choice.message;
  
  const hasToolCalls = !!(message.tool_calls && message.tool_calls.length > 0);
  const hasText = !!(message.content && message.content.trim());
  const hasReasoning = !!(message.reasoning && message.reasoning.trim());
  
  return {
    service: requestConfig.service,
    model: data.model,
    content: message.content || "",
    reasoning: message.reasoning || undefined,
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
    },
    messages: [
      ...requestConfig.messages,
      {
        role: "assistant",
        content: message.content || "",
        reasoning: message.reasoning || undefined,
      },
    ],
  };
}

/**
 * Create streaming response handler for OpenAI-compatible API
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
  let collectedReasoning = "";
  let collectedToolCalls: ToolCall[] = [];
  let usage: Usage | undefined;
  let finalResponse: LLMResponse | undefined;
  let chunksCache: StreamChunk[] = [];
  let isStreamComplete = false;
  let streamModel: string | undefined;
  let sawFinishSignal = false;
  
  const processStream = async () => {
    if (isStreamComplete) return;
    
    for await (const chunk of parseSSEStream(reader)) {
      try {
        const data = JSON.parse(chunk);
        if (data.model) {
          streamModel = data.model;
        }

        // Handle usage-only chunks even if choices are absent
        if (data.usage) {
          usage = {
            input_tokens: data.usage.prompt_tokens,
            output_tokens: data.usage.completion_tokens,
            total_tokens: data.usage.total_tokens,
          };
          const usageChunk = {
            type: "usage" as const,
            usage,
          };
          chunksCache.push(usageChunk);

          if (sawFinishSignal && !finalResponse) {
            const hasReasoning = !!collectedReasoning.trim();
            finalResponse = {
              service: requestConfig.service,
              model: streamModel || requestConfig.model,
              content: collectedContent,
              reasoning: collectedReasoning || undefined,
              toolCalls: collectedToolCalls.length > 0 ? collectedToolCalls : undefined,
              capabilities: {
                hasText: !!collectedContent.trim(),
                hasReasoning,
                hasToolCalls: collectedToolCalls.length > 0,
              },
              usage: usage || { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
              messages: [
                ...requestConfig.messages,
                {
                  role: "assistant",
                  content: collectedContent,
                  reasoning: collectedReasoning || undefined,
                },
              ],
            };
            const completeChunk = {
              type: "complete" as const,
              finalResponse,
            };
            chunksCache.push(completeChunk);
            isStreamComplete = true;
            break;
          }
        }

        const choice = data.choices?.[0];
        const delta = choice?.delta;
        
        if (!choice && !data.usage) continue;
        
        if (delta.content) {
          collectedContent += delta.content;
          const contentChunk = {
            type: "content" as const,
            content: delta.content,
          };
          chunksCache.push(contentChunk);
        }
        
        if (delta.reasoning) {
          collectedReasoning += delta.reasoning;
          const reasoningChunk = {
            type: "reasoning" as const,
            reasoning: delta.reasoning,
          };
          chunksCache.push(reasoningChunk);
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
              const toolCallChunk = {
                type: "tool_call" as const,
                toolCall: newToolCall,
              };
              chunksCache.push(toolCallChunk);
            }
          }
        }
        
        if (choice && choice.finish_reason) {
          sawFinishSignal = true;
          if (usage && !finalResponse) {
            const hasReasoning = !!collectedReasoning.trim();
            finalResponse = {
              service: requestConfig.service,
              model: streamModel || requestConfig.model,
              content: collectedContent,
              reasoning: collectedReasoning || undefined,
              toolCalls: collectedToolCalls.length > 0 ? collectedToolCalls : undefined,
              capabilities: {
                hasText: !!collectedContent.trim(),
                hasReasoning,
                hasToolCalls: collectedToolCalls.length > 0,
              },
              usage: usage || { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
              messages: [
                ...requestConfig.messages,
                {
                  role: "assistant",
                  content: collectedContent,
                  reasoning: collectedReasoning || undefined,
                },
              ],
            };
            const completeChunk = {
              type: "complete" as const,
              finalResponse,
            };
            chunksCache.push(completeChunk);
            isStreamComplete = true;
            break;
          }
        }
      } catch (error) {
        console.error("Error parsing Groq stream chunk:", error);
      }
    }

    // If stream ended without emitting complete, emit it now
    if (!isStreamComplete) {
      const hasReasoning = !!collectedReasoning.trim();
      finalResponse = {
        service: requestConfig.service,
        model: streamModel || requestConfig.model,
        content: collectedContent,
        reasoning: collectedReasoning || undefined,
        toolCalls: collectedToolCalls.length > 0 ? collectedToolCalls : undefined,
        capabilities: {
          hasText: !!collectedContent.trim(),
          hasReasoning,
          hasToolCalls: collectedToolCalls.length > 0,
        },
        usage: usage || { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
        messages: [
          ...requestConfig.messages,
          {
            role: "assistant",
            content: collectedContent,
            reasoning: collectedReasoning || undefined,
          },
        ],
      };
      const completeChunk = {
        type: "complete" as const,
        finalResponse,
      };
      chunksCache.push(completeChunk);
      isStreamComplete = true;
    }
  };
  
  const chunks = async function* (): AsyncGenerator<StreamChunk> {
    await processStream();
    for (const chunk of chunksCache) {
      yield chunk;
    }
  };
  
  return {
    service: requestConfig.service,
    model: requestConfig.model,
    chunks: chunks(),
    async collect(): Promise<LLMResponse> {
      await processStream();
      
      if (!finalResponse) {
        throw new Error("Stream ended without final response");
      }
      
      return finalResponse;
    },
  };
} 