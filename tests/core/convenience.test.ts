import { describe, it, expect } from 'vitest';
import { askQuestion, streamQuestion } from '../../src/core/api.js';
import { mockOpenAIResponse, mockOpenAIStreamingChunks, createMockFetch } from '../utils/mock-responses.js';

describe('Convenience Functions', () => {
  const baseConfig = {
    service: "openai" as const,
    apiKey: "test-key",
    model: "gpt-3.5-turbo"
  };

  describe('askQuestion', () => {
    it('should handle simple question without system prompt', async () => {
      const mockFetch = createMockFetch(mockOpenAIResponse);
      
      const response = await askQuestion(
        baseConfig,
        "What is the capital of France?",
        { fetch: mockFetch }
      );
      
      expect(response).toBeDefined();
      expect(response.content).toBe("Hello! How can I help you today?");
      expect(response.messages).toHaveLength(2);
      expect(response.messages[0]).toEqual({
        role: "user",
        content: "What is the capital of France?"
      });
    });

    it('should handle question with system prompt', async () => {
      const mockFetch = createMockFetch(mockOpenAIResponse);
      
      const response = await askQuestion(
        baseConfig,
        "What is the capital of France?",
        {
          systemPrompt: "You are a helpful geography teacher.",
          fetch: mockFetch
        }
      );
      
      expect(response).toBeDefined();
      expect(response.messages).toHaveLength(3); // system + user + assistant
      expect(response.messages[0]).toEqual({
        role: "system",
        content: "You are a helpful geography teacher."
      });
      expect(response.messages[1]).toEqual({
        role: "user",
        content: "What is the capital of France?"
      });
    });

    it('should pass through additional options', async () => {
      const mockFetch = createMockFetch(mockOpenAIResponse);
      
      const response = await askQuestion(
        baseConfig,
        "What is the weather like?",
        {
          temperature: 0.7,
          maxTokens: 100,
          fetch: mockFetch
        }
      );
      
      expect(response).toBeDefined();
      expect(response.content).toBe("Hello! How can I help you today?");
    });

    it('should handle errors from underlying sendMessage', async () => {
      const errorFetch = createMockFetch(
        { error: 'API Error' },
        { status: 500 }
      );
      
      await expect(
        askQuestion(
          baseConfig,
          "What is the capital of France?",
          { fetch: errorFetch }
        )
      ).rejects.toThrow();
    });
  });

  describe('streamQuestion', () => {
    it('should handle simple streaming question without system prompt', async () => {
      const mockFetch = createMockFetch(null, {
        streaming: true,
        chunks: mockOpenAIStreamingChunks
      });
      
      const streamResponse = await streamQuestion(
        baseConfig,
        "Tell me a story",
        { fetch: mockFetch }
      );
      
      expect(streamResponse).toBeDefined();
      expect(streamResponse.service).toBe("openai");
      expect(typeof streamResponse.collect).toBe('function');
      expect(typeof streamResponse.chunks[Symbol.asyncIterator]).toBe('function');
    });

    it('should handle streaming question with system prompt', async () => {
      const mockFetch = createMockFetch(null, {
        streaming: true,
        chunks: mockOpenAIStreamingChunks
      });
      
      const streamResponse = await streamQuestion(
        baseConfig,
        "Tell me a story",
        {
          systemPrompt: "You are a creative storyteller.",
          fetch: mockFetch
        }
      );
      
      expect(streamResponse).toBeDefined();
      expect(streamResponse.service).toBe("openai");
      
      // Collect the full response to check message structure
      const fullResponse = await streamResponse.collect();
      expect(fullResponse.messages).toHaveLength(3); // system + user + assistant
      expect(fullResponse.messages[0]).toEqual({
        role: "system",
        content: "You are a creative storyteller."
      });
      expect(fullResponse.messages[1]).toEqual({
        role: "user",
        content: "Tell me a story"
      });
    });

    it('should process streaming chunks correctly', async () => {
      const mockFetch = createMockFetch(null, {
        streaming: true,
        chunks: mockOpenAIStreamingChunks
      });
      
      const streamResponse = await streamQuestion(
        baseConfig,
        "Tell me a story",
        { fetch: mockFetch }
      );
      
      let chunkCount = 0;
      let contentChunks: string[] = [];
      
      for await (const chunk of streamResponse.chunks) {
        chunkCount++;
        if (chunk.type === 'content' && chunk.content) {
          contentChunks.push(chunk.content);
        }
        
        // Break after reasonable number of chunks
        if (chunkCount > 10) break;
      }
      
      expect(chunkCount).toBeGreaterThan(0);
      expect(contentChunks.length).toBeGreaterThan(0);
    });

    it('should pass through streaming options', async () => {
      const mockFetch = createMockFetch(null, {
        streaming: true,
        chunks: mockOpenAIStreamingChunks
      });
      
      const streamResponse = await streamQuestion(
        baseConfig,
        "What is the weather like?",
        {
          temperature: 0.8,
          maxTokens: 200,
          fetch: mockFetch
        }
      );
      
      expect(streamResponse).toBeDefined();
      expect(streamResponse.service).toBe("openai");
    });

    it('should handle streaming errors gracefully', async () => {
      const errorFetch = createMockFetch(null, { status: 500 });
      
      await expect(
        streamQuestion(
          baseConfig,
          "Tell me a story",
          { fetch: errorFetch }
        )
      ).rejects.toThrow();
    });
  });

  describe('Convenience vs Core Function Consistency', () => {
    it('should produce equivalent results to sendMessage', async () => {
      const mockFetch = createMockFetch(mockOpenAIResponse);
      
      // Using convenience function
      const convenienceResponse = await askQuestion(
        baseConfig,
        "Hello!",
        { fetch: mockFetch }
      );
      
      // Using core function with equivalent setup
      const coreResponse = await import('../../src/core/api.js').then(api => 
        api.sendMessage({
          ...baseConfig,
          messages: [{ role: "user", content: "Hello!" }]
        }, { fetch: mockFetch })
      );
      
      // Should have same structure and content
      expect(convenienceResponse.service).toBe(coreResponse.service);
      expect(convenienceResponse.content).toBe(coreResponse.content);
      expect(convenienceResponse.capabilities).toEqual(coreResponse.capabilities);
      expect(convenienceResponse.usage).toEqual(coreResponse.usage);
    });

    it('should produce equivalent streaming results to streamMessage', async () => {
      const mockFetch = createMockFetch(null, {
        streaming: true,
        chunks: mockOpenAIStreamingChunks
      });
      
      // Using convenience function
      const convenienceStream = await streamQuestion(
        baseConfig,
        "Hello!",
        { fetch: mockFetch }
      );
      
      // Using core function with equivalent setup
      const coreStream = await import('../../src/core/api.js').then(api => 
        api.streamMessage({
          ...baseConfig,
          messages: [{ role: "user", content: "Hello!" }]
        }, { fetch: mockFetch })
      );
      
      // Should have same interface
      expect(convenienceStream.service).toBe(coreStream.service);
      expect(typeof convenienceStream.collect).toBe('function');
      expect(typeof convenienceStream.chunks[Symbol.asyncIterator]).toBe('function');
      
      // Collected responses should be equivalent
      const convenienceResult = await convenienceStream.collect();
      const coreResult = await coreStream.collect();
      
      expect(convenienceResult.service).toBe(coreResult.service);
      expect(convenienceResult.content).toBe(coreResult.content);
    });
  });
}); 