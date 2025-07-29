import { describe, it, expect } from 'vitest';
import { streamMessage } from '../../src/core/api.js';
import { 
  mockStreamingChunks,
  createMockFetch,
  testMessages,
  testTools
} from '../utils/mock-responses.js';
import type { StreamChunk } from '../../src/types/index.js';

describe('Streaming with Tool Calls and Reasoning', () => {
  describe('OpenAI Provider', () => {
    it('should handle basic streaming', async () => {
      const mockFetch = createMockFetch({}, {
        streaming: true,
        chunks: mockStreamingChunks.openai.basic
      });

      const config = {
        service: 'openai' as const,
        apiKey: 'test-key',
        model: 'gpt-3.5-turbo',
        messages: testMessages
      };

      const response = await streamMessage(config, { fetch: mockFetch });

      const chunks: StreamChunk[] = [];
      for await (const chunk of response.chunks) {
        chunks.push(chunk);
      }

      // Should have content chunks
      const contentChunks = chunks.filter(c => c.type === 'content');
      expect(contentChunks.length).toBeGreaterThan(0);
      expect(contentChunks.some(c => c.content?.includes('Hello'))).toBe(true);
    });

    it('should handle streaming with tool calls', async () => {
      const mockFetch = createMockFetch({}, {
        streaming: true,
        chunks: mockStreamingChunks.openai.withTools
      });

      const config = {
        service: 'openai' as const,
        apiKey: 'test-key',
        model: 'gpt-4',
        messages: testMessages,
        tools: testTools
      };

      const response = await streamMessage(config, { fetch: mockFetch });

      const chunks: StreamChunk[] = [];
      for await (const chunk of response.chunks) {
        chunks.push(chunk);
      }

      // Should have tool_call chunks
      const toolCallChunks = chunks.filter(c => c.type === 'tool_call');
      expect(toolCallChunks).toHaveLength(1);
      expect(toolCallChunks[0].toolCall?.name).toBe('get_weather');
      expect(toolCallChunks[0].toolCall?.input).toEqual({ location: 'San Francisco' });
    });

    // Note: OpenAI reasoning is not yet implemented in the provider
  });

  describe('Anthropic Provider', () => {
    it('should handle streaming with thinking mode', async () => {
      const mockFetch = createMockFetch({}, {
        streaming: true,
        chunks: mockStreamingChunks.anthropic.withThinking
      });

      const config = {
        service: 'anthropic' as const,
        apiKey: 'test-key',
        model: 'claude-3-7-sonnet-20250224',
        messages: testMessages,
        budgetTokens: 8192
      };

      const response = await streamMessage(config, { fetch: mockFetch });

      const chunks: StreamChunk[] = [];
      for await (const chunk of response.chunks) {
        chunks.push(chunk);
      }

      // Should have reasoning chunks (thinking)
      const reasoningChunks = chunks.filter(c => c.type === 'reasoning');
      expect(reasoningChunks.length).toBeGreaterThan(0);
      expect(reasoningChunks.some(c => c.reasoning?.includes('think about this problem'))).toBe(true);

      // Should also have content chunks
      const contentChunks = chunks.filter(c => c.type === 'content');
      expect(contentChunks.length).toBeGreaterThan(0);
    });

    it('should handle streaming with thinking and tool calls', async () => {
      const mockFetch = createMockFetch({}, {
        streaming: true,
        chunks: mockStreamingChunks.anthropic.withThinkingAndTools
      });

      const config = {
        service: 'anthropic' as const,
        apiKey: 'test-key',
        model: 'claude-3-7-sonnet-20250224',
        messages: testMessages,
        tools: testTools,
        budgetTokens: 8192
      };

      const response = await streamMessage(config, { fetch: mockFetch });

      const chunks: StreamChunk[] = [];
      for await (const chunk of response.chunks) {
        chunks.push(chunk);
      }

      // Should have both reasoning and tool call chunks
      const reasoningChunks = chunks.filter(c => c.type === 'reasoning');
      const toolCallChunks = chunks.filter(c => c.type === 'tool_call');

      expect(reasoningChunks.length).toBeGreaterThan(0);
      expect(reasoningChunks.some(c => c.reasoning?.includes('asking about weather'))).toBe(true);

      expect(toolCallChunks).toHaveLength(1);
      expect(toolCallChunks[0].toolCall?.name).toBe('get_weather');
    });
  });

  describe('DeepSeek Provider', () => {
    it('should handle streaming with reasoning', async () => {
      const mockFetch = createMockFetch({}, {
        streaming: true,
        chunks: mockStreamingChunks.deepseek.withReasoning
      });

      const config = {
        service: 'deepseek' as const,
        apiKey: 'test-key',
        model: 'deepseek-chat',
        messages: testMessages
      };

      const response = await streamMessage(config, { fetch: mockFetch });

      const chunks: StreamChunk[] = [];
      for await (const chunk of response.chunks) {
        chunks.push(chunk);
      }

      // Should have reasoning chunks
      const reasoningChunks = chunks.filter(c => c.type === 'reasoning');
      expect(reasoningChunks.length).toBeGreaterThan(0);
      expect(reasoningChunks.some(c => c.reasoning?.includes('analyze this step by step'))).toBe(true);
    });

    it('should handle streaming with reasoning and tool calls', async () => {
      const mockFetch = createMockFetch({}, {
        streaming: true,
        chunks: mockStreamingChunks.deepseek.withReasoningAndTools
      });

      const config = {
        service: 'deepseek' as const,
        apiKey: 'test-key',
        model: 'deepseek-chat',
        messages: testMessages,
        tools: testTools
      };

      const response = await streamMessage(config, { fetch: mockFetch });

      const chunks: StreamChunk[] = [];
      for await (const chunk of response.chunks) {
        chunks.push(chunk);
      }

      // Should have both reasoning and tool call chunks
      const reasoningChunks = chunks.filter(c => c.type === 'reasoning');
      const toolCallChunks = chunks.filter(c => c.type === 'tool_call');

      expect(reasoningChunks.length).toBeGreaterThan(0);
      expect(toolCallChunks).toHaveLength(1);
      expect(toolCallChunks[0].toolCall?.name).toBe('get_weather');
    });
  });

  describe('Stream Collection', () => {
    it('should collect complete response from stream with reasoning and tools', async () => {
      const mockFetch = createMockFetch({}, {
        streaming: true,
        chunks: mockStreamingChunks.anthropic.withThinkingAndTools
      });

      const config = {
        service: 'anthropic' as const,
        apiKey: 'test-key',
        model: 'claude-3-7-sonnet-20250224',
        messages: testMessages,
        tools: testTools,
        budgetTokens: 8192
      };

      const streamResponse = await streamMessage(config, { fetch: mockFetch });
      const finalResponse = await streamResponse.collect();

      expect(finalResponse.service).toBe('anthropic');
      expect(finalResponse.model).toBe('claude-3-7-sonnet-20250224');
      expect(finalResponse.capabilities.hasReasoning).toBe(true);
      expect(finalResponse.capabilities.hasToolCalls).toBe(true);
      expect(finalResponse.reasoning).toBeTruthy();
      expect(finalResponse.toolCalls).toHaveLength(1);
      expect(finalResponse.toolCalls?.[0].name).toBe('get_weather');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed streaming chunks gracefully', async () => {
      const malformedChunks = [
        'data: {"type":"message_start","message":{"id":"msg_123"}}\n\n',
        'data: invalid json\n\n',
        'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}\n\n',
        'data: {"type":"message_stop"}\n\n'
      ];

      const mockFetch = createMockFetch({}, {
        streaming: true,
        chunks: malformedChunks
      });

      const config = {
        service: 'anthropic' as const,
        apiKey: 'test-key',
        model: 'claude-3-sonnet-20240229',
        messages: testMessages
      };

      const response = await streamMessage(config, { fetch: mockFetch });

      const chunks: StreamChunk[] = [];
      for await (const chunk of response.chunks) {
        chunks.push(chunk);
      }

      // Should still process valid chunks despite malformed ones
      const contentChunks = chunks.filter(c => c.type === 'content');
      expect(contentChunks.length).toBeGreaterThan(0);
      expect(contentChunks.some(c => c.content === 'Hello')).toBe(true);
    });
  });
}); 