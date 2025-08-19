import type { 
  OpenAIConfig, 
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
 * OpenAI adapter - handles Bearer auth, OpenAI API format
 * Internal function that creates an OpenAI-compatible adapter
 * @param config - OpenAI configuration
 * @returns LLM adapter for OpenAI
 */
export function createOpenAIAdapter(config: OpenAIConfig): LLMAdapter {
  const baseUrl = config.baseUrl || "https://api.openai.com/v1";
  
  return {
    async call(requestConfig: LLMConfig): Promise<LLMResponse> {
      const fetchFn = requestConfig.fetch || globalThis.fetch;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`,
      };
      
      // OpenAI API doesn't officially support CORS for browser requests
      // Users may need to use a proxy server for browser-based applications
      if (requestConfig.isBrowser || config.isBrowser) {
        // No specific headers needed, but CORS may still be blocked
        console.warn("OpenAI API may not work directly from browsers due to CORS policy. Consider using a proxy server.");
      }
      
      const body = formatOpenAIRequest(requestConfig, config.model);
      
      // Make the request
      const response = await fetchFn(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        // Handle error response body if available
        let errorMessage = `OpenAI API error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage += ` - ${errorData.error?.message || response.statusText}`;
        } catch {
          errorMessage += ` ${response.statusText}`;
        }
        throw new Error(errorMessage);
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
      
      // OpenAI API doesn't officially support CORS for browser requests
      if (requestConfig.isBrowser || config.isBrowser) {
        console.warn("OpenAI API may not work directly from browsers due to CORS policy. Consider using a proxy server.");
      }
      
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
 * Format request for OpenAI API
 * Internal function to convert unified config to OpenAI format
 * @param config - Unified LLM configuration
 * @param defaultModel - Default model name
 * @param stream - Whether this is a streaming request
 * @returns OpenAI API request body
 */
function formatOpenAIRequest(config: LLMConfig, defaultModel: string, stream = false): any {
  // Validate tool result messages
  config.messages.forEach(msg => validateToolResultMessage(msg, 'openai'));
  
  // Validate conversation flow for OpenAI API
  validateOpenAIConversationFlow(config.messages, "OpenAI");

  const body: any = {
    model: config.model || defaultModel,
    messages: config.messages.map(msg => {
      // Handle tool result messages (role: "tool_result" -> "tool")
      if (msg.role === "tool_result") {
        if (!msg.tool_call_id) {
          throw new Error("Tool result message must have tool_call_id for OpenAI API");
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

  // Add reasoning effort for o1/o3 models
  const isReasoningModel = /^(o1|o3)/.test(config.model || defaultModel);
  if (isReasoningModel && 'reasoningEffort' in config && config.reasoningEffort) {
    body.reasoning_effort = config.reasoningEffort;
  }

  // Request token usage in streaming responses when streaming is enabled
  if (stream) {
    body.stream_options = { include_usage: true };
  }

  return body;
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
  const hasReasoning = !!(message.reasoning_content && message.reasoning_content.trim());

  const toolCalls = hasToolCalls ? message.tool_calls.map((tc: any) => ({
    id: tc.id,
    name: tc.function.name,
    input: JSON.parse(tc.function.arguments),
  })) : undefined;
  
  return {
    service: requestConfig.service,
    model: data.model,
    content: message.content || "",
    reasoning: message.reasoning_content || undefined,
    toolCalls: toolCalls,
    capabilities: {
      hasText,
      hasReasoning,
      hasToolCalls,
    },
    usage: {
      input_tokens: data.usage.prompt_tokens,
      output_tokens: data.usage.completion_tokens,
      total_tokens: data.usage.total_tokens,
      reasoning_tokens: data.usage.reasoning_tokens || undefined,
    },
    messages: [
      ...requestConfig.messages,
      {
        role: "assistant",
        content: message.content || "",
        tool_calls: toolCalls,
        reasoning: message.reasoning_content || undefined,
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
  let collectedReasoning = "";
  let collectedToolCalls: ToolCall[] = [];
  // Accumulate tool call deltas keyed by id, with index fallback
  const toolCallAccumulatorsById: Record<string, { id: string; name?: string; args: string; emitted?: boolean }> = {};
  const indexToToolCallId: Record<number, string> = {};
  let usage: Usage | undefined;
  let finalResponseStored: LLMResponse | undefined;
  let streamModel: string | undefined;
  let sawFinishSignal = false;
  
  const chunks = async function* (): AsyncGenerator<StreamChunk> {
    for await (const chunk of parseSSEStream(reader)) {
      try {
        const data = JSON.parse(chunk);
        // Track model if present
        if (data.model) {
          streamModel = data.model;
        }

        // Handle usage chunks even if choices are empty (OpenAI sends usage after finish)
        if (data.usage) {
          usage = {
            input_tokens: data.usage.prompt_tokens,
            output_tokens: data.usage.completion_tokens,
            total_tokens: data.usage.total_tokens,
            reasoning_tokens: data.usage.reasoning_tokens || undefined,
          };
          yield {
            type: "usage",
            usage,
          };

          // If we already saw finish, finalize any pending tool calls and emit final response now
          if (sawFinishSignal && !finalResponseStored) {
            // Finalize tool calls before completing (arguments may have streamed in fragments)
            for (const acc of Object.values(toolCallAccumulatorsById)) {
              if (!acc.emitted && acc.name) {
                try {
                  const parsed = JSON.parse(acc.args || "{}");
                  const newToolCall: ToolCall = { id: acc.id, name: acc.name, input: parsed };
                  collectedToolCalls.push(newToolCall);
                  acc.emitted = true;
                  // Emit tool_call chunk prior to completion so consumers can act on it
                  yield { type: "tool_call", toolCall: newToolCall };
                } catch {
                  // Ignore if args are not valid JSON
                }
              }
            }

            const hasReasoning = !!collectedReasoning.trim();
            const finalResponse: LLMResponse = {
              service: requestConfig.service,
              model: streamModel || data.model || requestConfig.model,
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
                  tool_calls: collectedToolCalls.length > 0 ? collectedToolCalls : undefined,
                  reasoning: collectedReasoning || undefined,
                },
              ],
            };
            finalResponseStored = finalResponse;
            yield {
              type: "complete",
              finalResponse,
            };
            break;
          }
        }

        const choice = data.choices?.[0];
        const delta = choice?.delta || {};

        if (!choice && !data.usage) {
          // Nothing actionable in this chunk
          continue;
        }

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
            const idx: number = (toolCall as any).index ?? 0;
            const incomingId: string | undefined = (toolCall as any).id;

            // Resolve or create an id for this index
            let accId = incomingId || indexToToolCallId[idx];
            if (!accId) {
              accId = `pending_${idx}`;
              indexToToolCallId[idx] = accId;
            }
            // If this chunk carries a concrete id and the index wasn't mapped yet, bind it now
            if (incomingId && !indexToToolCallId[idx]) {
              indexToToolCallId[idx] = incomingId;
              accId = incomingId;
            }

            // If a real id arrives later, migrate accumulator
            if (incomingId && indexToToolCallId[idx] && indexToToolCallId[idx].startsWith('pending_') && indexToToolCallId[idx] !== incomingId) {
              const oldId = indexToToolCallId[idx];
              if (toolCallAccumulatorsById[oldId]) {
                const existing = toolCallAccumulatorsById[oldId];
                delete toolCallAccumulatorsById[oldId];
                toolCallAccumulatorsById[incomingId] = {
                  id: incomingId,
                  name: existing.name,
                  args: existing.args,
                  emitted: existing.emitted,
                };
              }
              indexToToolCallId[idx] = incomingId;
              accId = incomingId;
            }

            if (!toolCallAccumulatorsById[accId]) {
              toolCallAccumulatorsById[accId] = { id: accId, args: "" };
            }
            const acc = toolCallAccumulatorsById[accId];

            if (toolCall.function?.name) acc.name = toolCall.function.name;
            if (typeof toolCall.function?.arguments === "string") {
              acc.args += toolCall.function.arguments;
            }
          }
        }

        if (data.usage) {
          usage = {
            input_tokens: data.usage.prompt_tokens,
            output_tokens: data.usage.completion_tokens,
            total_tokens: data.usage.total_tokens,
            reasoning_tokens: data.usage.reasoning_tokens || undefined,
          };
          yield {
            type: "usage",
            usage,
          };
        }

        if (choice && choice.finish_reason) {
          // Mark that we reached finish; usage may arrive in a later chunk
          sawFinishSignal = true;

          if (usage && !finalResponseStored) {
            // Finalize tool calls before completing
            for (const acc of Object.values(toolCallAccumulatorsById)) {
              if (!acc.emitted && acc.name) {
                try {
                  const parsed = JSON.parse(acc.args || "{}");
                  const newToolCall: ToolCall = { id: acc.id, name: acc.name, input: parsed };
                  collectedToolCalls.push(newToolCall);
                  acc.emitted = true;
                  // Emit tool_call chunk now that we have complete arguments
                  yield { type: "tool_call", toolCall: newToolCall };
                } catch {
                  // Skip if args are not valid JSON
                }
              }
            }
            const hasReasoning = !!collectedReasoning.trim();
            const finalResponse: LLMResponse = {
              service: requestConfig.service,
              model: streamModel || data.model || requestConfig.model,
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
                  tool_calls: collectedToolCalls.length > 0 ? collectedToolCalls : undefined,
                  reasoning: collectedReasoning || undefined,
                },
              ],
            };
            finalResponseStored = finalResponse;
            yield {
              type: "complete",
              finalResponse,
            };
            break;
          }
        }
      } catch (error) {
        console.error("Error parsing OpenAI stream chunk:", error);
      }
    }

    // If stream ended (e.g., [DONE]) but we haven't emitted final response yet, emit now
    if (!finalResponseStored) {
      // Finalize any pending tool calls
      for (const acc of Object.values(toolCallAccumulatorsById)) {
        if (!acc.emitted && acc.name) {
          try {
            const parsed = JSON.parse(acc.args || "{}");
            const newToolCall: ToolCall = { id: acc.id, name: acc.name, input: parsed };
            collectedToolCalls.push(newToolCall);
            acc.emitted = true;
            yield { type: "tool_call", toolCall: newToolCall };
          } catch {
            // Ignore unparsable leftovers
          }
        }
      }
      const hasReasoning = !!collectedReasoning.trim();
      const finalResponse: LLMResponse = {
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
            tool_calls: collectedToolCalls.length > 0 ? collectedToolCalls : undefined,
            reasoning: collectedReasoning || undefined,
          },
        ],
      };
      finalResponseStored = finalResponse;
      yield {
        type: "complete",
        finalResponse,
      };
    }
  };
  
  return {
    service: requestConfig.service,
    model: requestConfig.model,
    chunks: chunks(),
    async collect(): Promise<LLMResponse> {
      if (finalResponseStored) return finalResponseStored;
      for await (const chunk of chunks()) {
        if (chunk.type === "complete" && chunk.finalResponse) {
          finalResponseStored = chunk.finalResponse;
          break;
        }
      }
      if (!finalResponseStored) {
        throw new Error("Stream ended without final response");
      }
      return finalResponseStored;
    },
  };
} 