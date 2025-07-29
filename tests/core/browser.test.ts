import { describe, it, expect, vi } from 'vitest';
import { sendMessage, askQuestion } from '../../src/core/api.js';

describe('Browser Support', () => {
  it('should add anthropic-dangerous-direct-browser-access header for Anthropic when isBrowser is true', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: 'Hello from browser!' }],
        model: 'claude-3-sonnet-20240229',
        usage: { input_tokens: 10, output_tokens: 20 }
      })
    });

    await sendMessage({
      service: 'anthropic',
      apiKey: 'test-key',
      model: 'claude-3-sonnet-20240229',
      messages: [{ role: 'user', content: 'Hello' }],
      isBrowser: true,
      fetch: mockFetch
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        headers: expect.objectContaining({
          'anthropic-dangerous-direct-browser-access': 'true'
        })
      })
    );
  });

  it('should not add anthropic header when isBrowser is false', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: 'Hello from server!' }],
        model: 'claude-3-sonnet-20240229',
        usage: { input_tokens: 10, output_tokens: 20 }
      })
    });

    await sendMessage({
      service: 'anthropic',
      apiKey: 'test-key',
      model: 'claude-3-sonnet-20240229',
      messages: [{ role: 'user', content: 'Hello' }],
      isBrowser: false,
      fetch: mockFetch
    });

    const callArgs = mockFetch.mock.calls[0];
    const headers = callArgs[1].headers;
    expect(headers).not.toHaveProperty('anthropic-dangerous-direct-browser-access');
  });

  it('should show warning for OpenAI when isBrowser is true', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'Hello!' } }],
        model: 'gpt-4',
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
      })
    });

    await sendMessage({
      service: 'openai',
      apiKey: 'test-key',
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello' }],
      isBrowser: true,
      fetch: mockFetch
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('OpenAI API may not work directly from browsers due to CORS policy')
    );
    
    consoleSpy.mockRestore();
  });

  it('should work with askQuestion and isBrowser parameter', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: 'TypeScript provides type safety!' }],
        model: 'claude-3-sonnet-20240229',
        usage: { input_tokens: 15, output_tokens: 25 }
      })
    });

    const response = await askQuestion(
      {
        service: 'anthropic',
        apiKey: 'test-key',
        model: 'claude-3-sonnet-20240229',
      },
      'What are the benefits of TypeScript?',
      {
        isBrowser: true,
        fetch: mockFetch
      }
    );

    expect(response.content).toBe('TypeScript provides type safety!');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        headers: expect.objectContaining({
          'anthropic-dangerous-direct-browser-access': 'true'
        })
      })
    );
  });

  it('should show info message for Ollama in browser mode', async () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        id: "chatcmpl-ollama-123",
        object: "chat.completion",
        created: 1677652288,
        model: "llama3.2",
        choices: [{
          index: 0,
          message: {
            role: "assistant",
            content: "Local response!"
          },
          finish_reason: "stop"
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 9,
          total_tokens: 19
        }
      })
    });

    await sendMessage({
      service: 'ollama',
      model: 'llama3.2',
      messages: [{ role: 'user', content: 'Hello' }],
      isBrowser: true,
      fetch: mockFetch
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Using Ollama in browser mode')
    );
    
    consoleSpy.mockRestore();
  });
}); 