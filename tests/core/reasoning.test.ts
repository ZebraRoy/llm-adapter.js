import { describe, it, expect, beforeEach } from 'vitest';
import { sendMessage, streamMessage } from '../../src/core/api.js';
import { hasReasoning } from '../../src/utils/type-guards.js';
import type { ServiceConfig } from '../../src/types/index.js';
import {
  mockOpenAIStreamingWithReasoningChunks,
  mockGroqReasoningResponse,
  mockGroqStreamingWithReasoningChunks,
  mockXAIReasoningResponse,
  mockXAIStreamingWithReasoningChunks,
  mockGoogleThinkingResponse,
  mockGoogleStreamingWithThinkingChunks,
  mockDeepSeekStreamingWithReasoningChunks,
  testMessages,
  createMockFetch
} from '../utils/mock-responses.js';

// ===== REASONING CONFIGURATIONS =====

const reasoningConfigs = {
  openai: {
    service: "openai" as const,
    apiKey: "test-openai-key",
    model: "o1-preview",
    messages: testMessages,
    reasoningEffort: "high" as const
  },
  groq: {
    service: "groq" as const,
    apiKey: "test-groq-key", 
    model: "qwen-qwq-32b",
    messages: testMessages,
    reasoningFormat: "parsed" as const,
    reasoningEffort: "default" as const
  },
  xai: {
    service: "xai" as const,
    apiKey: "test-xai-key",
    model: "grok-3",
    messages: testMessages,
    reasoningEffort: "high" as const
  },
  google: {
    service: "google" as const,
    apiKey: "test-google-key",
    model: "gemini-2.5-pro",
    messages: testMessages,
    thinkingBudget: 8192,
    includeThoughts: true
  },
  deepseek: {
    service: "deepseek" as const,
    apiKey: "test-deepseek-key",
    model: "deepseek-reasoner",
    messages: testMessages
  }
};

describe('Reasoning Support', () => {
  beforeEach(() => {
    // Reset any global state before each test
  });

  describe('OpenAI Reasoning Models (o1/o3 series)', () => {
    it('should handle reasoning parameters for o1 models', async () => {
      const mockResponse = {
        id: "chatcmpl-reasoning-123",
        object: "chat.completion", 
        created: 1677652288,
        model: "o1-preview",
        choices: [{
          index: 0,
          message: {
            role: "assistant",
            content: "Based on my analysis, the answer is 42.",
            reasoning_content: "I need to think about this step by step. First, let me consider the problem... Now I can provide my answer."
          },
          finish_reason: "stop"
        }],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 35,
          total_tokens: 55,
          reasoning_tokens: 15
        }
      };

      const mockFetch = createMockFetch(mockResponse);
      const response = await sendMessage(reasoningConfigs.openai, { fetch: mockFetch });

      expect(response.service).toBe("openai");
      expect(response.model).toBe("o1-preview");
      expect(response.content).toBe("Based on my analysis, the answer is 42.");
      expect(response.reasoning).toBe("I need to think about this step by step. First, let me consider the problem... Now I can provide my answer.");
      expect(response.capabilities.hasReasoning).toBe(true);
      expect(response.usage.reasoning_tokens).toBe(15);
      expect(hasReasoning(response)).toBe(true);
    });

    it('should stream reasoning content for o1 models', async () => {
      const mockFetch = createMockFetch(null, {
        streaming: true,
        chunks: mockOpenAIStreamingWithReasoningChunks
      });

      const streamResponse = await streamMessage(reasoningConfigs.openai, { fetch: mockFetch });
      
      const chunks = [];
      for await (const chunk of streamResponse.chunks) {
        chunks.push(chunk);
      }

      // Should have reasoning chunks
      const reasoningChunks = chunks.filter(c => c.type === "reasoning");
      expect(reasoningChunks.length).toBeGreaterThan(0);
      expect(reasoningChunks[0].reasoning).toContain("I need to think about this");

      // Should have content chunks  
      const contentChunks = chunks.filter(c => c.type === "content");
      expect(contentChunks.length).toBeGreaterThan(0);

      // Final response should have reasoning
      const finalResponse = await streamResponse.collect();
      expect(finalResponse.capabilities.hasReasoning).toBe(true);
      expect(finalResponse.reasoning).toBeTruthy();
    });
  });

  describe('Groq Reasoning Models', () => {
    it('should handle reasoning format for Qwen models', async () => {
      const mockFetch = createMockFetch(mockGroqReasoningResponse);
      const response = await sendMessage(reasoningConfigs.groq, { fetch: mockFetch });

      expect(response.service).toBe("groq");
      expect(response.model).toBe("qwen-qwq-32b");
      expect(response.content).toBe("Based on my thinking, here's the answer.");
      expect(response.reasoning).toBe("Let me think step by step. The user is asking for help, so I need to analyze what they need and provide a thoughtful response.");
      expect(response.capabilities.hasReasoning).toBe(true);
      expect(hasReasoning(response)).toBe(true);
    });

    it('should stream reasoning content for Qwen models', async () => {
      const mockFetch = createMockFetch(null, {
        streaming: true,
        chunks: mockGroqStreamingWithReasoningChunks
      });

      const streamResponse = await streamMessage(reasoningConfigs.groq, { fetch: mockFetch });
      
      const chunks = [];
      for await (const chunk of streamResponse.chunks) {
        chunks.push(chunk);
      }

      const reasoningChunks = chunks.filter(c => c.type === "reasoning");
      expect(reasoningChunks.length).toBeGreaterThan(0);
      expect(reasoningChunks[0].reasoning).toContain("I need to think about this");

      const finalResponse = await streamResponse.collect();
      expect(finalResponse.capabilities.hasReasoning).toBe(true);
    });
  });

  describe('xAI Grok Reasoning', () => {
    it('should handle reasoning effort for Grok 3', async () => {
      const mockFetch = createMockFetch(mockXAIReasoningResponse);
      const response = await sendMessage(reasoningConfigs.xai, { fetch: mockFetch });

      expect(response.service).toBe("xai");
      expect(response.model).toBe("grok-3");
      expect(response.content).toBe("After reasoning through this, here's my answer.");
      expect(response.reasoning).toBe("Let me think about this systematically. The user needs help, so I should provide a clear and helpful response based on my analysis.");
      expect(response.capabilities.hasReasoning).toBe(true);
      expect(response.usage.reasoning_tokens).toBe(22);
      expect(hasReasoning(response)).toBe(true);
    });

    it('should stream reasoning content for Grok 3', async () => {
      const mockFetch = createMockFetch(null, {
        streaming: true,
        chunks: mockXAIStreamingWithReasoningChunks
      });

      const streamResponse = await streamMessage(reasoningConfigs.xai, { fetch: mockFetch });
      
      const chunks = [];
      for await (const chunk of streamResponse.chunks) {
        chunks.push(chunk);
      }

      const reasoningChunks = chunks.filter(c => c.type === "reasoning");
      expect(reasoningChunks.length).toBeGreaterThan(0);
      
      const finalResponse = await streamResponse.collect();
      expect(finalResponse.capabilities.hasReasoning).toBe(true);
    });
  });

  describe('Google Gemini 2.5 Thinking', () => {
    it('should handle thinking budget and thoughts', async () => {
      const mockFetch = createMockFetch(mockGoogleThinkingResponse);
      const response = await sendMessage(reasoningConfigs.google, { fetch: mockFetch });

      expect(response.service).toBe("google");
      expect(response.model).toBe("gemini-2.5-pro");
      expect(response.content).toBe("After thinking about your request, here's how I can help you.");
      expect(response.reasoning).toContain("User needs assistance");
      expect(response.capabilities.hasReasoning).toBe(true);
      expect(hasReasoning(response)).toBe(true);
    });

    it('should stream thinking content for Gemini 2.5', async () => {
      const mockFetch = createMockFetch(null, {
        streaming: true, 
        chunks: mockGoogleStreamingWithThinkingChunks
      });

      const streamResponse = await streamMessage(reasoningConfigs.google, { fetch: mockFetch });
      
      const chunks = [];
      for await (const chunk of streamResponse.chunks) {
        chunks.push(chunk);
      }

      const reasoningChunks = chunks.filter(c => c.type === "reasoning");
      expect(reasoningChunks.length).toBeGreaterThan(0);
      
      const finalResponse = await streamResponse.collect();
      expect(finalResponse.capabilities.hasReasoning).toBe(true);
    });
  });

  describe('DeepSeek Reasoning Models', () => {
    it('should stream reasoning content for DeepSeek models', async () => {
      const mockFetch = createMockFetch(null, {
        streaming: true,
        chunks: mockDeepSeekStreamingWithReasoningChunks
      });

      const streamResponse = await streamMessage(reasoningConfigs.deepseek, { fetch: mockFetch });
      
      const chunks = [];
      for await (const chunk of streamResponse.chunks) {
        chunks.push(chunk);
      }

      const reasoningChunks = chunks.filter(c => c.type === "reasoning");
      expect(reasoningChunks.length).toBeGreaterThan(0);
      
      const finalResponse = await streamResponse.collect();
      expect(finalResponse.capabilities.hasReasoning).toBe(true);
    });
  });

  describe('Reasoning Parameters Validation', () => {
    it('should only add reasoning effort for compatible OpenAI models', async () => {
      const regularConfig = {
        ...reasoningConfigs.openai,
        model: "gpt-4", // Not a reasoning model
      };

      const mockResponse = {
        id: "chatcmpl-123",
        object: "chat.completion",
        created: 1677652288,
        model: "gpt-4",
        choices: [{
          index: 0,
          message: {
            role: "assistant",
            content: "Hello! How can I help you today?"
          },
          finish_reason: "stop"
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 9,
          total_tokens: 19
        }
      };

      const mockFetch = createMockFetch(mockResponse);
      const response = await sendMessage(regularConfig, { fetch: mockFetch });

      expect(response.capabilities.hasReasoning).toBe(false);
      expect(response.reasoning).toBeUndefined();
    });

    it('should only add reasoning format for compatible Groq models', async () => {
      const regularConfig = {
        ...reasoningConfigs.groq,
        model: "mixtral-8x7b-32768", // Not a reasoning model
      };

      const mockResponse = {
        id: "chatcmpl-123",
        object: "chat.completion", 
        created: 1677652288,
        model: "mixtral-8x7b-32768",
        choices: [{
          index: 0,
          message: {
            role: "assistant",
            content: "Hello! How can I help you today?"
          },
          finish_reason: "stop"
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 9,
          total_tokens: 19
        }
      };

      const mockFetch = createMockFetch(mockResponse);
      const response = await sendMessage(regularConfig, { fetch: mockFetch });

      expect(response.capabilities.hasReasoning).toBe(false);
      expect(response.reasoning).toBeUndefined();
    });

    it('should only add thinking parameters for Gemini 2.5 models', async () => {
      const regularConfig = {
        ...reasoningConfigs.google,
        model: "gemini-pro", // Not a thinking model
      };

      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: "Hello! How can I help you today?"
            }],
            role: "model"
          },
          finishReason: "STOP",
          index: 0,
          safetyRatings: []
        }],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 9,
          totalTokenCount: 19
        }
      };

      const mockFetch = createMockFetch(mockResponse);
      const response = await sendMessage(regularConfig, { fetch: mockFetch });

      expect(response.capabilities.hasReasoning).toBe(false);
      expect(response.reasoning).toBeUndefined();
    });
  });

  describe('Message History with Reasoning', () => {
    it('should include reasoning in message history', async () => {
      const mockResponse = {
        id: "chatcmpl-reasoning-123",
        object: "chat.completion",
        created: 1677652288,
        model: "o1-preview",
        choices: [{
          index: 0,
          message: {
            role: "assistant",
            content: "Here's my answer.",
            reasoning_content: "Let me think about this..."
          },
          finish_reason: "stop"
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 15,
          total_tokens: 25,
          reasoning_tokens: 8
        }
      };

      const mockFetch = createMockFetch(mockResponse);
      const response = await sendMessage(reasoningConfigs.openai, { fetch: mockFetch });

      const assistantMessage = response.messages.find(m => m.role === "assistant");
      expect(assistantMessage).toBeDefined();
      expect(assistantMessage?.content).toBe("Here's my answer.");
      expect(assistantMessage?.reasoning).toBe("Let me think about this...");
    });
  });
});