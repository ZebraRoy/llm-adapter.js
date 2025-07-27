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
    }
  }
  
  const hasToolCalls = toolCalls.length > 0;
  const hasText = !!responseText.trim();
  
  return {
    service: requestConfig.service,
    model: requestConfig.model || "gemini-pro",
    content: responseText,
    reasoning: undefined, // Google doesn't expose reasoning in standard API
    toolCalls: hasToolCalls ? toolCalls : undefined,
    capabilities: {
      hasText,
      hasReasoning: false, // Google doesn't expose reasoning in standard API
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
  let collectedToolCalls: ToolCall[] = [];
  let usage: Usage | undefined;
  
  const chunks = async function* (): AsyncGenerator<StreamChunk> {
    for await (const chunk of parseSSEStream(reader)) {
      try {
        const data = JSON.parse(chunk);
        const candidate = data.candidates?.[0];
        
        if (!candidate?.content?.parts) continue;
        
        for (const part of candidate.content.parts) {
          if (part.text) {
            collectedContent += part.text;
            yield {
              type: "content",
              content: part.text,
            };
          }
          
          if (part.functionCall) {
            const newToolCall: ToolCall = {
              id: `google_${part.functionCall.name}_${Date.now()}`, // Generate ID based on function name for matching
              name: part.functionCall.name,
              input: part.functionCall.args || {},
            };
            collectedToolCalls.push(newToolCall);
            yield {
              type: "tool_call",
              toolCall: newToolCall,
            };
          }
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
        
        if (candidate.finishReason) {
          const finalResponse: LLMResponse = {
            service: requestConfig.service,
            model: requestConfig.model || "gemini-pro",
            content: collectedContent,
            reasoning: undefined, // Google doesn't expose reasoning in standard API
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
        console.error("Error parsing Google stream chunk:", error);
      }
    }
  };
  
  return {
    service: requestConfig.service,
    model: requestConfig.model || "gemini-pro",
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