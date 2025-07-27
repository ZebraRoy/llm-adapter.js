import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setDefaultFetch, getDefaultFetch } from '../../src/core/fetch.js';
import { sendMessage } from '../../src/core/api.js';
import { mockOpenAIResponse, createMockFetch, testMessages } from '../utils/mock-responses.js';

describe('Fetch Dependency Injection', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    // Store original fetch and reset to clean state
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    // Restore default state
    globalThis.fetch = originalFetch;
    setDefaultFetch(undefined as any); // Reset to default
  });

  describe('setDefaultFetch and getDefaultFetch', () => {
    it('should set and get default fetch implementation', () => {
      const customFetch = async (input: any, init: any) => new Response('test');
      
      setDefaultFetch(customFetch);
      
      expect(getDefaultFetch()).toBe(customFetch);
    });

    it('should return global fetch when no default is set', () => {
      setDefaultFetch(undefined as any); // Reset to default
      
      expect(getDefaultFetch()).toBe(globalThis.fetch);
    });

    it('should use custom default fetch in sendMessage', async () => {
      let defaultFetchCalled = false;
      const customDefaultFetch = async (input: any, init: any) => {
        defaultFetchCalled = true;
        return createMockFetch(mockOpenAIResponse)(input, init);
      };

      setDefaultFetch(customDefaultFetch);

      const config = {
        service: "openai" as const,
        apiKey: "test-key",
        model: "gpt-3.5-turbo",
        messages: testMessages
      };

      await sendMessage(config);

      expect(defaultFetchCalled).toBe(true);
    });
  });

  describe('Fetch priority order', () => {
    it('should prioritize function-level fetch over config fetch', async () => {
      let functionFetchCalled = false;
      let configFetchCalled = false;

      const functionFetch = async (input: any, init: any) => {
        functionFetchCalled = true;
        return createMockFetch(mockOpenAIResponse)(input, init);
      };

      const configFetch = async (input: any, init: any) => {
        configFetchCalled = true;
        return createMockFetch(mockOpenAIResponse)(input, init);
      };

      const config = {
        service: "openai" as const,
        apiKey: "test-key",
        model: "gpt-3.5-turbo",
        messages: testMessages,
        fetch: configFetch
      };

      await sendMessage(config, { fetch: functionFetch });

      expect(functionFetchCalled).toBe(true);
      expect(configFetchCalled).toBe(false);
    });

    it('should prioritize config fetch over default fetch', async () => {
      let configFetchCalled = false;
      let defaultFetchCalled = false;

      const configFetch = async (input: any, init: any) => {
        configFetchCalled = true;
        return createMockFetch(mockOpenAIResponse)(input, init);
      };

      const defaultFetch = async (input: any, init: any) => {
        defaultFetchCalled = true;
        return createMockFetch(mockOpenAIResponse)(input, init);
      };

      setDefaultFetch(defaultFetch);

      const config = {
        service: "openai" as const,
        apiKey: "test-key",
        model: "gpt-3.5-turbo",
        messages: testMessages,
        fetch: configFetch
      };

      await sendMessage(config);

      expect(configFetchCalled).toBe(true);
      expect(defaultFetchCalled).toBe(false);
    });

    it('should use default fetch when no other fetch is provided', async () => {
      let defaultFetchCalled = false;

      const defaultFetch = async (input: any, init: any) => {
        defaultFetchCalled = true;
        return createMockFetch(mockOpenAIResponse)(input, init);
      };

      setDefaultFetch(defaultFetch);

      const config = {
        service: "openai" as const,
        apiKey: "test-key",
        model: "gpt-3.5-turbo",
        messages: testMessages
      };

      await sendMessage(config);

      expect(defaultFetchCalled).toBe(true);
    });
  });

  describe('Custom fetch use cases', () => {
    it('should support retry logic with custom fetch', async () => {
      let attempts = 0;
      const maxRetries = 3;

      const retryFetch = async (input: any, init: any): Promise<Response> => {
        let lastError: Error;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          attempts++;
          
          try {
            // Simulate server error on first two attempts
            if (attempt < maxRetries) {
              const errorResponse = new Response('Server Error', { status: 500 });
              if (errorResponse.status >= 500) {
                // Retry on server errors
                if (attempt < maxRetries) {
                  await new Promise(resolve => setTimeout(resolve, 10)); // Small delay for tests
                  continue;
                }
              }
              return errorResponse; // This won't be reached due to continue above
            }
            
            // Return success on final attempt
            return createMockFetch(mockOpenAIResponse)(input, init);
          } catch (error) {
            lastError = error as Error;
            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 10));
            }
          }
        }
        
        throw lastError!;
      };

      const config = {
        service: "openai" as const,
        apiKey: "test-key",
        model: "gpt-3.5-turbo",
        messages: testMessages
      };

      const response = await sendMessage(config, { fetch: retryFetch });

      expect(attempts).toBe(maxRetries);
      expect(response.content).toBe("Hello! How can I help you today?");
    });

    it('should support request logging with custom fetch', async () => {
      const logs: Array<{ url: string; method: string }> = [];

      const loggingFetch = async (input: any, init: any) => {
        logs.push({
          url: typeof input === 'string' ? input : input.url,
          method: init?.method || 'GET'
        });
        
        return createMockFetch(mockOpenAIResponse)(input, init);
      };

      const config = {
        service: "openai" as const,
        apiKey: "test-key",
        model: "gpt-3.5-turbo",
        messages: testMessages
      };

      await sendMessage(config, { fetch: loggingFetch });

      expect(logs).toHaveLength(1);
      expect(logs[0].method).toBe('POST');
      expect(logs[0].url).toContain('openai.com');
    });

    it('should support rate limiting with custom fetch', async () => {
      const requestTimes: number[] = [];
      const minInterval = 100; // 100ms between requests

      let lastRequestTime = 0;

      const rateLimitedFetch = async (input: any, init: any) => {
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTime;

        if (timeSinceLastRequest < minInterval) {
          const waitTime = minInterval - timeSinceLastRequest;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        lastRequestTime = Date.now();
        requestTimes.push(lastRequestTime);
        
        return createMockFetch(mockOpenAIResponse)(input, init);
      };

      const config = {
        service: "openai" as const,
        apiKey: "test-key",
        model: "gpt-3.5-turbo",
        messages: testMessages
      };

      // Make multiple requests
      await sendMessage(config, { fetch: rateLimitedFetch });
      await sendMessage(config, { fetch: rateLimitedFetch });

      expect(requestTimes).toHaveLength(2);
      expect(requestTimes[1] - requestTimes[0]).toBeGreaterThanOrEqual(minInterval);
    });

    it('should support custom headers with fetch wrapper', async () => {
      let capturedHeaders: Record<string, string> = {};

             const headerCapturingFetch = async (input: any, init: any) => {
         capturedHeaders = init?.headers ? { ...init.headers } : {};
         return createMockFetch(mockOpenAIResponse)(input, init);
       };

      const config = {
        service: "openai" as const,
        apiKey: "test-key",
        model: "gpt-3.5-turbo",
        messages: testMessages
      };

      await sendMessage(config, { fetch: headerCapturingFetch });

      expect(capturedHeaders['Authorization']).toBe('Bearer test-key');
      expect(capturedHeaders['Content-Type']).toBe('application/json');
    });
  });

  describe('Error handling', () => {
    it('should handle fetch errors gracefully', async () => {
      const errorFetch = async (input: any, init: any) => {
        throw new Error('Network error');
      };

      const config = {
        service: "openai" as const,
        apiKey: "test-key",
        model: "gpt-3.5-turbo",
        messages: testMessages
      };

      await expect(
        sendMessage(config, { fetch: errorFetch })
      ).rejects.toThrow('Network error');
    });

    it('should handle HTTP error responses', async () => {
      const httpErrorFetch = createMockFetch(
        { error: 'Unauthorized' },
        { status: 401 }
      );

      const config = {
        service: "openai" as const,
        apiKey: "invalid-key",
        model: "gpt-3.5-turbo",
        messages: testMessages
      };

      await expect(
        sendMessage(config, { fetch: httpErrorFetch })
      ).rejects.toThrow();
    });
  });
}); 