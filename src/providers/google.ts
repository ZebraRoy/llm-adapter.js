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
      // Google matches by function name, not tool_call_id.
      // Accept either msg.name (native) or msg.tool_call_id (unified). Resolve name when needed.
      let functionName = msg.name;
      if (!functionName && msg.tool_call_id) {
        // Try to find a preceding assistant message with matching tool_call id
        for (let i = config.messages.length - 1; i >= 0; i--) {
          const prior = config.messages[i];
          if (prior.role === "assistant" && prior.tool_calls && prior.tool_calls.length > 0) {
            const match = prior.tool_calls.find(tc => tc.id === msg.tool_call_id);
            if (match) {
              functionName = match.name;
              break;
            }
          }
        }
        // Fallback: our Google adapter generates ids as `google_${name}_${timestamp}`
        if (!functionName && msg.tool_call_id.startsWith('google_')) {
          const lastUnderscore = msg.tool_call_id.lastIndexOf('_');
          if (lastUnderscore > 'google_'.length) {
            functionName = msg.tool_call_id.substring('google_'.length, lastUnderscore);
          }
        }
      }

      if (!functionName) {
        throw new Error("Tool result for Google must include a name or resolvable tool_call_id");
      }

      return {
        role: "user",
        parts: [
          {
            functionResponse: {
              name: functionName, // Function name for matching
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
    
    // Handle regular messages (support multimodal image parts)
    const role = msg.role === "assistant" ? "model" : "user";
    let parts: any[];
    if (typeof msg.content === "string") {
      parts = [{ text: msg.content }];
    } else if (Array.isArray(msg.content)) {
      parts = msg.content.map(part => {
        if (part.type === "text") {
          return { text: part.content };
        }
        if (part.type === "image") {
          // Gemini supports inlineData (base64 + mimeType) or fileData{fileUri}
          if (/^data:/.test(part.content)) {
            const m = part.content.match(/^data:([^;]+);base64,(.*)$/);
            if (m) {
              return { inlineData: { mimeType: m[1], data: m[2] } };
            }
            // fallback to text if parse fails
            return { text: "[image]" };
          }
          if (part.metadata && typeof (part.metadata as any).mimeType === 'string' && /^[A-Za-z0-9+/=]+$/.test(part.content)) {
            return { inlineData: { mimeType: (part.metadata as any).mimeType, data: part.content } };
          }
          // treat as URL reference
          return { fileData: { fileUri: part.content } };
        }
        return { text: String(part.content) };
      });
    } else {
      parts = [{ text: JSON.stringify(msg.content) }];
    }
    
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
  let idCounter = 0;
  
  if (content?.parts) {
    for (const part of content.parts) {
      if (part.text) {
        responseText += part.text;
      }
      if (part.functionCall) {
        toolCalls.push({
          id: `google_${part.functionCall.name}_${Date.now()}_${++idCounter}`,
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
        tool_calls: hasToolCalls ? toolCalls : undefined,
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
  let idCounter = 0;
  let usage: Usage | undefined;
  let finalResponseStored: LLMResponse | undefined;
  
  const chunks = async function* (): AsyncGenerator<StreamChunk> {
    for await (const chunk of parseSSEStream(reader)) {
      try {
        const data = JSON.parse(chunk);
        const candidate = data.candidates?.[0];
        if (!candidate) continue;

        if (candidate.content?.parts) {
          for (const part of candidate.content.parts) {
            if (part.text) {
              collectedContent += part.text;
              yield { type: "content", content: part.text };
            }
            if (part.functionCall) {
              const newToolCall: ToolCall = {
                id: `google_${part.functionCall.name}_${Date.now()}_${++idCounter}`,
                name: part.functionCall.name,
                input: part.functionCall.args || {},
              };
              collectedToolCalls.push(newToolCall);
              yield { type: "tool_call", toolCall: newToolCall };
            }
            if (part.thinking) {
              collectedThinking += part.thinking;
              yield { type: "reasoning", reasoning: part.thinking };
            }
          }
        }

        if (data.thoughtSummaries && data.thoughtSummaries.length > 0) {
          const thinkingSummary = data.thoughtSummaries.map((summary: any) => summary.content).join('\n');
          collectedThinking += thinkingSummary;
          yield { type: "reasoning", reasoning: thinkingSummary };
        }

        if (data.usageMetadata) {
          usage = {
            input_tokens: data.usageMetadata.promptTokenCount || 0,
            output_tokens: data.usageMetadata.candidatesTokenCount || 0,
            total_tokens: data.usageMetadata.totalTokenCount || 0,
          };
          yield { type: "usage", usage };
        }

        if (candidate.finishReason) {
          const hasReasoning = !!collectedThinking.trim();
          const finalResponse: LLMResponse = {
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
                tool_calls: collectedToolCalls.length > 0 ? collectedToolCalls : undefined,
              },
            ],
          };
          finalResponseStored = finalResponse;
          yield { type: "complete", finalResponse };
          break;
        }
      } catch (error) {
        console.error("Error parsing Google stream chunk:", error);
      }
    }
  };
  
  return {
    service: requestConfig.service,
    model: requestConfig.model || "gemini-pro",
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