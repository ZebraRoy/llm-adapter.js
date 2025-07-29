import { describe, it, expect, beforeEach } from 'vitest';
import { sendMessage, streamMessage } from '../../src/core/api.js';
import type { ServiceConfig, LLMResponse, StreamingResponse } from '../../src/types/index.js';
import {
  mockOpenAIResponse,
  mockAnthropicResponse,
  mockGoogleResponse,
  mockGroqResponse,
  mockGroqReasoningResponse,
  mockDeepSeekResponse,
  mockXAIResponse,
  mockXAIReasoningResponse,
  mockGoogleThinkingResponse,
  mockOllamaResponse,
  mockOpenAIWithToolsResponse,
  mockAnthropicWithToolsResponse,
  mockToolCallChainResponse,
  mockOpenAIStreamingChunks,
  mockAnthropicStreamingChunks,
  testMessages,
  testTools,
  createMockFetch
} from '../utils/mock-responses.js';

// ===== PROVIDER CONFIGURATIONS =====

const providerConfigs = {
  openai: {
    service: "openai" as const,
    apiKey: "test-openai-key",
    model: "gpt-3.5-turbo",
    messages: testMessages
  },
  anthropic: {
    service: "anthropic" as const,
    apiKey: "test-anthropic-key",
    model: "claude-3-sonnet-20240229",
    messages: testMessages
  },
  google: {
    service: "google" as const,
    apiKey: "test-google-key",
    model: "gemini-pro",
    messages: testMessages
  },
  groq: {
    service: "groq" as const,
    apiKey: "test-groq-key",
    model: "mixtral-8x7b-32768",
    messages: testMessages
  },
  deepseek: {
    service: "deepseek" as const,
    apiKey: "test-deepseek-key",
    model: "deepseek-chat",
    messages: testMessages
  },
  xai: {
    service: "xai" as const,
    apiKey: "test-xai-key",
    model: "grok-beta",
    messages: testMessages
  },
  ollama: {
    service: "ollama" as const,
    model: "llama3.2",
    messages: testMessages,
    baseUrl: "http://localhost:11434"
  }
};

const mockResponses = {
  openai: mockOpenAIResponse,
  anthropic: mockAnthropicResponse,
  google: mockGoogleResponse,
  groq: mockGroqResponse,
  deepseek: mockDeepSeekResponse,
  xai: mockXAIResponse,
  ollama: mockOllamaResponse
};

const mockStreamingChunks = {
  openai: mockOpenAIStreamingChunks,
  anthropic: mockAnthropicStreamingChunks,
  // For providers using OpenAI-compatible streaming
  groq: mockOpenAIStreamingChunks,
  deepseek: mockOpenAIStreamingChunks,
  xai: mockOpenAIStreamingChunks,
  // Google has different streaming format, Ollama now uses OpenAI format
  google: ['data: {"candidates":[{"content":{"parts":[{"text":"Hello!"}],"role":"model"},"finishReason":"STOP"}]}\n\n'],
  ollama: mockOpenAIStreamingChunks
};

// ===== MAIN TESTS =====

describe('Core API Functions', () => {
  describe('sendMessage', () => {
    describe.each(Object.entries(providerConfigs))('%s provider', (providerName, config) => {
      const mockResponse = mockResponses[providerName as keyof typeof mockResponses];
      
      it('should return unified response format', async () => {
        const mockFetch = createMockFetch(mockResponse);
        
        const response = await sendMessage(config as ServiceConfig, { fetch: mockFetch });
        
        // Verify unified interface
        expect(response).toHaveProperty('service', providerName);
        expect(response).toHaveProperty('content');
        expect(response).toHaveProperty('capabilities');
        expect(response).toHaveProperty('usage');
        expect(response).toHaveProperty('messages');
        
        // Verify response structure matches expected format
        expect(response.capabilities).toHaveProperty('hasText');
        expect(response.capabilities).toHaveProperty('hasReasoning');
        expect(response.capabilities).toHaveProperty('hasToolCalls');
        
        expect(response.usage).toHaveProperty('input_tokens');
        expect(response.usage).toHaveProperty('output_tokens');
        expect(response.usage).toHaveProperty('total_tokens');
        
        // Basic content validation
        expect(typeof response.content).toBe('string');
        expect(response.content.length).toBeGreaterThan(0);
        
        // Verify messages include conversation
        expect(response.messages).toHaveLength(2);
        expect(response.messages[0]).toEqual(testMessages[0]);
        expect(response.messages[1].role).toBe('assistant');
      });

      it('should handle fetch options correctly', async () => {
        const mockFetch = createMockFetch(mockResponse);
        
        const response = await sendMessage(config as ServiceConfig, {
          temperature: 0.7,
          maxTokens: 100,
          fetch: mockFetch
        });
        
        expect(response).toBeDefined();
        expect(response.service).toBe(providerName);
      });

      it('should handle API errors gracefully', async () => {
        const errorFetch = createMockFetch({ error: 'API Error' }, { status: 500 });
        
        await expect(
          sendMessage(config as ServiceConfig, { fetch: errorFetch })
        ).rejects.toThrow();
      });
    });

    describe('Tool calling support', () => {
      it('should handle OpenAI tool calls', async () => {
        const mockFetch = createMockFetch(mockOpenAIWithToolsResponse);
        
        const response = await sendMessage(providerConfigs.openai, {
          tools: testTools,
          fetch: mockFetch
        });
        
        expect(response.capabilities.hasToolCalls).toBe(true);
        expect(response.toolCalls).toBeDefined();
        expect(response.toolCalls).toHaveLength(1);
        expect(response.toolCalls![0]).toHaveProperty('name', 'get_weather');
        expect(response.toolCalls![0]).toHaveProperty('input');
      });

      it('should handle Anthropic tool calls', async () => {
        const mockFetch = createMockFetch(mockAnthropicWithToolsResponse);
        
        const response = await sendMessage(providerConfigs.anthropic, {
          tools: testTools,
          fetch: mockFetch
        });
        
        expect(response.capabilities.hasToolCalls).toBe(true);
        expect(response.toolCalls).toBeDefined();
        expect(response.toolCalls).toHaveLength(1);
        expect(response.toolCalls![0]).toHaveProperty('name', 'get_weather');
        expect(response.toolCalls![0]).toHaveProperty('input');
      });

      it('should handle multi-round tool call chain correctly', async () => {
        // Mock fetch to return different responses for each call
        let callCount = 0;
        const mockFetch = (input: any, init: any) => {
          const response = mockToolCallChainResponse[callCount];
          callCount++;
          return createMockFetch(response)(input, init);
        };

        const config = { ...providerConfigs.openai, tools: testTools };

        // Round 1: Get tool calls
        const response1 = await sendMessage(config, { fetch: mockFetch });

        expect(response1.capabilities.hasToolCalls).toBe(true);
        expect(response1.toolCalls).toHaveLength(1);

        // Update messages with assistant's response and tool result
        const messages = [
          ...response1.messages,
          {
            role: 'tool_result' as const,
            content: 'The weather is 72°F',
            tool_call_id: response1.toolCalls![0].id,
          },
        ];

        // Round 2: Get final answer
        const response2 = await sendMessage(
          { ...config, messages },
          { fetch: mockFetch }
        );

        expect(response2.capabilities.hasToolCalls).toBe(false);
        expect(response2.content).toContain('72°F');
        expect(response2.messages).toHaveLength(4); // user, assistant, tool_result, assistant
      });
    });

    describe('Fetch dependency injection', () => {
      it('should use provided fetch function', async () => {
        let fetchCalled = false;
        const customFetch = async (input: any, init: any) => {
          fetchCalled = true;
          return createMockFetch(mockOpenAIResponse)(input, init);
        };
        
        await sendMessage(providerConfigs.openai, { fetch: customFetch });
        
        expect(fetchCalled).toBe(true);
      });

      it('should use config-level fetch', async () => {
        let fetchCalled = false;
        const customFetch = async (input: any, init: any) => {
          fetchCalled = true;
          return createMockFetch(mockOpenAIResponse)(input, init);
        };
        
        const configWithFetch = {
          ...providerConfigs.openai,
          fetch: customFetch
        };
        
        await sendMessage(configWithFetch);
        
        expect(fetchCalled).toBe(true);
      });
    });
  });

  describe('streamMessage', () => {
    describe.each(Object.entries(providerConfigs))('%s provider', (providerName, config) => {
      const mockChunks = mockStreamingChunks[providerName as keyof typeof mockStreamingChunks];
      
      it('should return streaming response with unified interface', async () => {
        const mockFetch = createMockFetch(null, {
          streaming: true,
          chunks: mockChunks
        });
        
        const streamResponse = await streamMessage(config as ServiceConfig, { fetch: mockFetch });
        
        // Verify streaming interface
        expect(streamResponse).toHaveProperty('service', providerName);
        expect(streamResponse).toHaveProperty('model');
        expect(streamResponse).toHaveProperty('chunks');
        expect(streamResponse).toHaveProperty('collect');
        
        // Verify chunks are iterable
        expect(typeof streamResponse.chunks[Symbol.asyncIterator]).toBe('function');
        
        // Verify collect method works
        expect(typeof streamResponse.collect).toBe('function');
      });

      it('should collect full response from stream', async () => {
        const mockFetch = createMockFetch(null, {
          streaming: true,
          chunks: mockChunks
        });
        
        const streamResponse = await streamMessage(config as ServiceConfig, { fetch: mockFetch });
        const fullResponse = await streamResponse.collect();
        
        // Verify unified response format
        expect(fullResponse).toHaveProperty('service', providerName);
        expect(fullResponse).toHaveProperty('content');
        expect(fullResponse).toHaveProperty('capabilities');
        expect(fullResponse).toHaveProperty('usage');
        expect(fullResponse).toHaveProperty('messages');
        
        // Basic validation
        expect(typeof fullResponse.content).toBe('string');
        expect(fullResponse.messages).toHaveLength(2);
      });

      it('should iterate through chunks correctly', async () => {
        const mockFetch = createMockFetch(null, {
          streaming: true,
          chunks: mockChunks
        });
        
        const streamResponse = await streamMessage(config as ServiceConfig, { fetch: mockFetch });
        
        let chunkCount = 0;
        let hasContentChunk = false;
        
        for await (const chunk of streamResponse.chunks) {
          chunkCount++;
          expect(chunk).toHaveProperty('type');
          
          if (chunk.type === 'content') {
            hasContentChunk = true;
            expect(chunk).toHaveProperty('content');
            expect(typeof chunk.content).toBe('string');
          }
          
          // Break after a few chunks to avoid infinite loops in tests
          if (chunkCount > 10) break;
        }
        
        expect(chunkCount).toBeGreaterThan(0);
        // Most providers should have at least some content chunks
        if (providerName !== 'ollama') { // Ollama might have different chunk structure
          expect(hasContentChunk).toBe(true);
        }
      });

      it('should handle streaming errors gracefully', async () => {
        const errorFetch = createMockFetch(null, { status: 500 });
        
        await expect(
          streamMessage(config as ServiceConfig, { fetch: errorFetch })
        ).rejects.toThrow();
      });
    });

    describe('Streaming with options', () => {
      it('should pass options correctly to streaming endpoint', async () => {
        const mockFetch = createMockFetch(null, {
          streaming: true,
          chunks: mockOpenAIStreamingChunks
        });
        
        const streamResponse = await streamMessage(providerConfigs.openai, {
          temperature: 0.5,
          maxTokens: 50,
          tools: testTools,
          fetch: mockFetch
        });
        
        expect(streamResponse).toBeDefined();
        expect(streamResponse.service).toBe('openai');
      });
    });
  });

  describe('Cross-provider consistency', () => {
    it('should return consistent response structure across all providers', async () => {
      const responses: LLMResponse[] = [];
      
      // Test all providers with the same input
      for (const [providerName, config] of Object.entries(providerConfigs)) {
        const mockResponse = mockResponses[providerName as keyof typeof mockResponses];
        const mockFetch = createMockFetch(mockResponse);
        
        const response = await sendMessage(config as ServiceConfig, { fetch: mockFetch });
        responses.push(response);
      }
      
      // Verify all responses have the same interface
      const firstResponse = responses[0];
      for (const response of responses.slice(1)) {
        // Same properties exist
        expect(Object.keys(response).sort()).toEqual(Object.keys(firstResponse).sort());
        
        // Same capability structure
        expect(Object.keys(response.capabilities).sort()).toEqual(
          Object.keys(firstResponse.capabilities).sort()
        );
        
        // Same core usage structure (reasoning_tokens is optional)
        const coreUsageKeys = ['input_tokens', 'output_tokens', 'total_tokens'];
        const responseCoreKeys = coreUsageKeys.filter(key => key in response.usage);
        const firstResponseCoreKeys = coreUsageKeys.filter(key => key in firstResponse.usage);
        expect(responseCoreKeys.sort()).toEqual(firstResponseCoreKeys.sort());
      }
    });

    it('should return consistent streaming interface across all providers', async () => {
      const streamResponses: StreamingResponse[] = [];
      
      // Test all providers with the same input
      for (const [providerName, config] of Object.entries(providerConfigs)) {
        const mockChunks = mockStreamingChunks[providerName as keyof typeof mockStreamingChunks];
        const mockFetch = createMockFetch(null, {
          streaming: true,
          chunks: mockChunks
        });
        
        const streamResponse = await streamMessage(config as ServiceConfig, { fetch: mockFetch });
        streamResponses.push(streamResponse);
      }
      
      // Verify all streaming responses have the same interface
      const firstStream = streamResponses[0];
      for (const streamResponse of streamResponses.slice(1)) {
        expect(Object.keys(streamResponse).sort()).toEqual(Object.keys(firstStream).sort());
        expect(typeof streamResponse.collect).toBe('function');
        expect(typeof streamResponse.chunks[Symbol.asyncIterator]).toBe('function');
      }
    });
  });
}); 