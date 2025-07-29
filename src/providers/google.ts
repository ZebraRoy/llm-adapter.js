import type { 
  GoogleConfig, 
  LLMConfig, 
  LLMResponse, 
  StreamingResponse, 
  StreamChunk,
  ToolCall,
  Usage 
} from '../types/index.js';
import type { LLMAdapter } from '../core/adapter.js';
import { validateLLMConfig, sanitizeTools, validateToolResultMessage } from '../utils/validation.js';
import { parseSSEStream } from '../utils/streaming.js';

/**
 * Google adapter - handles API key auth, Gemini format
 * Internal function that creates a Google Gemini-compatible adapter
 * @param config - Google configuration
 * @returns LLM adapter for Google
 */
export function createGoogleAdapter(config: GoogleConfig): LLMAdapter {
  const baseUrl = config.baseUrl || "https://generativelanguage.googleapis.com/v1beta";
  
  return {
    async call(requestConfig: LLMConfig): Promise<LLMResponse> {
      const fetchFn = requestConfig.fetch || globalThis.fetch;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-goog-api-key": config.apiKey,
      };
      
      // Google Gemini API has CORS restrictions for browser requests
      if (requestConfig.isBrowser || config.isBrowser) {
        console.warn("Google Gemini API may not work directly from browsers due to CORS policy. Consider using a proxy server or server-side implementation.");
      }
      
      const body = formatGoogleRequest(requestConfig, config.model);
      
      const response = await fetchFn(`${baseUrl}/models/${config.model}:generateContent`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        throw new Error(`Google API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return parseGoogleResponse(data, requestConfig);
    },
    
    async stream(requestConfig: LLMConfig): Promise<StreamingResponse> {
      const fetchFn = requestConfig.fetch || globalThis.fetch;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-goog-api-key": config.apiKey,
      };
      
      // Google Gemini API has CORS restrictions for browser requests
      if (requestConfig.isBrowser || config.isBrowser) {
        console.warn("Google Gemini API may not work directly from browsers due to CORS policy. Consider using a proxy server or server-side implementation.");
      }
      
      const body = formatGoogleRequest(requestConfig, config.model);
      
      const response = await fetchFn(`${baseUrl}/models/${config.model}:streamGenerateContent?alt=sse`, {
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
      
      return createGoogleStreamingResponse(requestConfig, reader);
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
 * Format request for Google API
 * Internal function to convert unified config to Google format
 * @param config - Unified LLM configuration
 * @param defaultModel - Default model name
 * @returns Google API request body
 */
function formatGoogleRequest(config: LLMConfig, defaultModel: string): any {
  // Validate tool result messages with Google-specific rules
  config.messages.forEach(msg => validateToolResultMessage(msg, 'google'));

  const contents = config.messages.map(msg => {
    if (msg.role === "system") {
      // System messages go in systemInstruction, not contents
      return null;
    }
    
    // Handle tool result messages
    if (msg.role === "tool_result") {
      // Google matches by function name, not tool_call_id
      if (!msg.name) {
        throw new Error("Tool result message must have function name for Google API");
      }
      return {
        role: "user",
        parts: [
          {
            functionResponse: {
              name: msg.name, // Function name for matching
              response: typeof msg.content === "string" ? 
                { result: msg.content } : msg.content,
            }
          }
        ]
      };
    }

    // Handle assistant messages with tool calls
    if (msg.role === "assistant" && msg.tool_calls) {
      const parts = [];
      
      // Add text content if present
      if (msg.content && typeof msg.content === "string" && msg.content.trim()) {
        parts.push({ text: msg.content });
      }
      
      // Add function calls
      msg.tool_calls.forEach(tc => {
        parts.push({
          functionCall: {
            name: tc.name,
            args: tc.input,
          }
        });
      });
      
      return {
        role: "model",
        parts,
      };
    }
    
    // Handle regular messages
    const role = msg.role === "assistant" ? "model" : "user";
    const parts = [{ 
      text: typeof msg.content === "string" ? msg.content : 
            JSON.stringify(msg.content) 
    }];
    
    return {
      role,
      parts
    };
  }).filter(Boolean);

  // Extract system instruction if present
  const systemMessage = config.messages.find(msg => msg.role === "system");
  const systemInstruction = systemMessage ? {
    parts: [{ text: systemMessage.content }]
  } : undefined;
  
  const body: any = {
    contents,
    generationConfig: {
      temperature: config.temperature,
      maxOutputTokens: config.maxTokens,
    }
  };
  
  if (systemInstruction) {
    body.systemInstruction = systemInstruction;
  }
  
  // Add tools if provided - use Google-specific sanitization
  if (config.tools && config.tools.length > 0) {
    body.tools = [{
      function_declarations: sanitizeTools(config.tools, 'google').map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      }))
    }];
  }

  // Add thinking parameters for Gemini 2.5 series
  const isThinkingModel = /gemini-2\.5/.test(defaultModel);
  if (isThinkingModel) {
    if ('thinkingBudget' in config && config.thinkingBudget) {
      body.generationConfig.thinkingBudget = config.thinkingBudget;
    }
    if ('includeThoughts' in config && config.includeThoughts) {
      body.generationConfig.includeThoughts = config.includeThoughts;
    }
  }

  return body;
}

/**
 * Parse Google API response
 * Internal function to convert Google response to unified format
 * @param data - Raw Google API response
 * @param requestConfig - Original request configuration
 * @returns Unified LLM response
 */
function parseGoogleResponse(data: any, requestConfig: LLMConfig): LLMResponse {
  const candidate = data.candidates?.[0];
  if (!candidate) {
    throw new Error("No candidates in response");
  }
  
  const content = candidate.content;
  let responseText = "";
  let thinkingContent = "";
  let toolCalls: ToolCall[] = [];
  
  if (content?.parts) {
    for (const part of content.parts) {
      if (part.text) {
        responseText += part.text;
      }
      if (part.functionCall) {
        toolCalls.push({
          id: `google_${part.functionCall.name}_${Date.now()}`, // Generate ID based on function name for matching
          name: part.functionCall.name,
          input: part.functionCall.args || {},
        });
      }
      if (part.thinking) {
        thinkingContent += part.thinking;
      }
    }
  }
  
  // Check for thought summaries in Gemini 2.5 response
  if (data.thoughtSummaries && data.thoughtSummaries.length > 0) {
    thinkingContent = data.thoughtSummaries.map((summary: any) => summary.content).join('\n');
  }
  
  const hasToolCalls = toolCalls.length > 0;
  const hasText = !!responseText.trim();
  const hasReasoning = !!thinkingContent.trim();
  
  return {
    service: requestConfig.service,
    model: requestConfig.model || "gemini-pro",
    content: responseText,
    reasoning: thinkingContent || undefined,
    toolCalls: hasToolCalls ? toolCalls : undefined,
    capabilities: {
      hasText,
      hasReasoning,
      hasToolCalls,
    },
    usage: {
      input_tokens: data.usageMetadata?.promptTokenCount || 0,
      output_tokens: data.usageMetadata?.candidatesTokenCount || 0,
      total_tokens: data.usageMetadata?.totalTokenCount || 0,
    },
    messages: [
      ...requestConfig.messages,
      {
        role: "assistant",
        content: responseText,
        reasoning: thinkingContent || undefined,
      },
    ],
  };
}

/**
 * Create streaming response handler for Google
 * Internal function to handle Google streaming responses
 * @param requestConfig - Original request configuration
 * @param reader - Response stream reader
 * @returns Streaming response wrapper
 */
function createGoogleStreamingResponse(
  requestConfig: LLMConfig, 
  reader: ReadableStreamDefaultReader<Uint8Array>
): StreamingResponse {
  let collectedContent = "";
  let collectedThinking = "";
  let collectedToolCalls: ToolCall[] = [];
  let usage: Usage | undefined;
  let finalResponse: LLMResponse | undefined;
  let chunksCache: StreamChunk[] = [];
  let isStreamComplete = false;
  
  const processStream = async () => {
    if (isStreamComplete) return;
    
    for await (const chunk of parseSSEStream(reader)) {
      try {
        const data = JSON.parse(chunk);
        const candidate = data.candidates?.[0];
        
        if (!candidate?.content?.parts) continue;
        
        for (const part of candidate.content.parts) {
          if (part.text) {
            collectedContent += part.text;
            const contentChunk = {
              type: "content" as const,
              content: part.text,
            };
            chunksCache.push(contentChunk);
          }
          
          if (part.functionCall) {
            const newToolCall: ToolCall = {
              id: `google_${part.functionCall.name}_${Date.now()}`, // Generate ID based on function name for matching
              name: part.functionCall.name,
              input: part.functionCall.args || {},
            };
            collectedToolCalls.push(newToolCall);
            const toolCallChunk = {
              type: "tool_call" as const,
              toolCall: newToolCall,
            };
            chunksCache.push(toolCallChunk);
          }
          
          if (part.thinking) {
            collectedThinking += part.thinking;
            const reasoningChunk = {
              type: "reasoning" as const,
              reasoning: part.thinking,
            };
            chunksCache.push(reasoningChunk);
          }
        }
        
        // Handle thought summaries for Gemini 2.5
        if (data.thoughtSummaries && data.thoughtSummaries.length > 0) {
          const thinkingSummary = data.thoughtSummaries.map((summary: any) => summary.content).join('\n');
          collectedThinking += thinkingSummary;
          const reasoningChunk = {
            type: "reasoning" as const,
            reasoning: thinkingSummary,
          };
          chunksCache.push(reasoningChunk);
        }
        
        if (data.usageMetadata) {
          usage = {
            input_tokens: data.usageMetadata.promptTokenCount || 0,
            output_tokens: data.usageMetadata.candidatesTokenCount || 0,
            total_tokens: data.usageMetadata.totalTokenCount || 0,
          };
          const usageChunk = {
            type: "usage" as const,
            usage,
          };
          chunksCache.push(usageChunk);
        }
        
        if (candidate.finishReason) {
          const hasReasoning = !!collectedThinking.trim();
          finalResponse = {
            service: requestConfig.service,
            model: requestConfig.model || "gemini-pro",
            content: collectedContent,
            reasoning: collectedThinking || undefined,
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
                reasoning: collectedThinking || undefined,
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
      } catch (error) {
        console.error("Error parsing Google stream chunk:", error);
      }
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
    model: requestConfig.model || "gemini-pro",
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