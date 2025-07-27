import type { LLMResponse } from '../../src/types/index.js';

// ===== MOCK API RESPONSES =====

/**
 * Mock OpenAI chat completions response
 */
export const mockOpenAIResponse = {
  id: "chatcmpl-123",
  object: "chat.completion",
  created: 1677652288,
  model: "gpt-3.5-turbo",
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

/**
 * Mock OpenAI streaming response chunks - basic text
 */
export const mockOpenAIStreamingChunks = [
  'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}\n\n',
  'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}\n\n',
  'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"content":"!"},"finish_reason":null}]}\n\n',
  'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":10,"completion_tokens":2,"total_tokens":12}}\n\n',
  'data: [DONE]\n\n'
];

/**
 * Mock OpenAI streaming response chunks with tool calls
 */
export const mockOpenAIStreamingWithToolsChunks = [
  'data: {"id":"chatcmpl-tool-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-4","choices":[{"index":0,"delta":{"role":"assistant","content":null,"tool_calls":[{"index":0,"id":"call_123","type":"function","function":{"name":"get_weather","arguments":"{\\"location\\": \\"San Francisco\\"}"}}]},"finish_reason":null}]}\n\n',
  'data: {"id":"chatcmpl-tool-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-4","choices":[{"index":0,"delta":{},"finish_reason":"tool_calls"}],"usage":{"prompt_tokens":15,"completion_tokens":25,"total_tokens":40}}\n\n',
  'data: [DONE]\n\n'
];

/**
 * Mock OpenAI streaming response chunks with reasoning (simulated o1-style)
 */
export const mockOpenAIStreamingWithReasoningChunks = [
  'data: {"id":"chatcmpl-reasoning-123","object":"chat.completion.chunk","created":1677652288,"model":"o1-preview","choices":[{"index":0,"delta":{"role":"assistant","content":"","reasoning":"I need to think about this step by step."},"finish_reason":null}]}\n\n',
  'data: {"id":"chatcmpl-reasoning-123","object":"chat.completion.chunk","created":1677652288,"model":"o1-preview","choices":[{"index":0,"delta":{"reasoning":" First, let me consider the problem..."},"finish_reason":null}]}\n\n',
  'data: {"id":"chatcmpl-reasoning-123","object":"chat.completion.chunk","created":1677652288,"model":"o1-preview","choices":[{"index":0,"delta":{"reasoning":" Now I can provide my answer."},"finish_reason":null}]}\n\n',
  'data: {"id":"chatcmpl-reasoning-123","object":"chat.completion.chunk","created":1677652288,"model":"o1-preview","choices":[{"index":0,"delta":{"content":"Based on my analysis, "},"finish_reason":null}]}\n\n',
  'data: {"id":"chatcmpl-reasoning-123","object":"chat.completion.chunk","created":1677652288,"model":"o1-preview","choices":[{"index":0,"delta":{"content":"the answer is 42."},"finish_reason":null}]}\n\n',
  'data: {"id":"chatcmpl-reasoning-123","object":"chat.completion.chunk","created":1677652288,"model":"o1-preview","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":20,"completion_tokens":35,"total_tokens":55}}\n\n',
  'data: [DONE]\n\n'
];

/**
 * Mock Anthropic messages response
 */
export const mockAnthropicResponse = {
  id: "msg_123",
  type: "message",
  role: "assistant",
  model: "claude-3-sonnet-20240229",
  content: [{
    type: "text",
    text: "Hello! How can I help you today?"
  }],
  stop_reason: "end_turn",
  stop_sequence: null,
  usage: {
    input_tokens: 10,
    output_tokens: 9
  }
};

/**
 * Mock Anthropic streaming response chunks - basic text
 */
export const mockAnthropicStreamingChunks = [
  'data: {"type":"message_start","message":{"id":"msg_123","type":"message","role":"assistant","model":"claude-3-sonnet-20240229","content":[],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":10,"output_tokens":0}}}\n\n',
  'data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n',
  'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}\n\n',
  'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"!"}}\n\n',
  'data: {"type":"content_block_stop","index":0}\n\n',
  'data: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":2}}\n\n',
  'data: {"type":"message_stop"}\n\n'
];

/**
 * Mock Anthropic streaming response chunks with thinking mode (Claude 3.7 Sonnet)
 */
export const mockAnthropicStreamingWithThinkingChunks = [
  'data: {"type":"message_start","message":{"id":"msg_thinking_123","type":"message","role":"assistant","model":"claude-3-7-sonnet-20250224","content":[],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":15,"output_tokens":0}}}\n\n',
  'data: {"type":"content_block_start","index":0,"content_block":{"type":"thinking"}}\n\n',
  'data: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","text":"Let me think about this problem carefully."}}\n\n',
  'data: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","text":" I need to consider multiple factors..."}}\n\n',
  'data: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","text":" After analyzing the situation, I believe the best approach is..."}}\n\n',
  'data: {"type":"content_block_stop","index":0}\n\n',
  'data: {"type":"content_block_start","index":1,"content_block":{"type":"text","text":""}}\n\n',
  'data: {"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"After careful consideration, "}}\n\n',
  'data: {"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"I recommend the following approach."}}\n\n',
  'data: {"type":"content_block_stop","index":1}\n\n',
  'data: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":45}}\n\n',
  'data: {"type":"message_stop"}\n\n'
];

/**
 * Mock Anthropic streaming response chunks with tool calls
 */
export const mockAnthropicStreamingWithToolsChunks = [
  'data: {"type":"message_start","message":{"id":"msg_tools_123","type":"message","role":"assistant","model":"claude-3-5-sonnet-20241022","content":[],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":25,"output_tokens":0}}}\n\n',
  'data: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"toolu_123","name":"get_weather","input":{"location":"San Francisco"}}}\n\n',
  'data: {"type":"content_block_stop","index":0}\n\n',
  'data: {"type":"message_delta","delta":{"stop_reason":"tool_use","stop_sequence":null},"usage":{"output_tokens":15}}\n\n',
  'data: {"type":"message_stop"}\n\n'
];

/**
 * Mock Anthropic streaming response chunks with thinking and tool calls
 */
export const mockAnthropicStreamingWithThinkingAndToolsChunks = [
  'data: {"type":"message_start","message":{"id":"msg_thinking_tools_123","type":"message","role":"assistant","model":"claude-3-7-sonnet-20250224","content":[],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":30,"output_tokens":0}}}\n\n',
  'data: {"type":"content_block_start","index":0,"content_block":{"type":"thinking"}}\n\n',
  'data: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","text":"The user is asking about weather. I should use the get_weather function to get current information."}}\n\n',
  'data: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","text":" I\'ll call it with San Francisco as the location."}}\n\n',
  'data: {"type":"content_block_stop","index":0}\n\n',
  'data: {"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"toolu_456","name":"get_weather","input":{"location":"San Francisco"}}}\n\n',
  'data: {"type":"content_block_stop","index":1}\n\n',
  'data: {"type":"message_delta","delta":{"stop_reason":"tool_use","stop_sequence":null},"usage":{"output_tokens":35}}\n\n',
  'data: {"type":"message_stop"}\n\n'
];

/**
 * Mock Google Gemini response
 */
export const mockGoogleResponse = {
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

/**
 * Mock Google streaming response chunks with tool calls
 */
export const mockGoogleStreamingWithToolsChunks = [
  'data: {"candidates":[{"content":{"parts":[{"functionCall":{"name":"get_weather","args":{"location":"San Francisco"}}}],"role":"model"},"finishReason":"STOP","index":0,"safetyRatings":[]}],"usageMetadata":{"promptTokenCount":20,"candidatesTokenCount":10,"totalTokenCount":30}}\n\n'
];

/**
 * Mock Groq response (OpenAI-compatible)
 */
export const mockGroqResponse = {
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

/**
 * Mock DeepSeek response (OpenAI-compatible)
 */
export const mockDeepSeekResponse = {
  id: "chatcmpl-123",
  object: "chat.completion",
  created: 1677652288,
  model: "deepseek-chat",
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

/**
 * Mock DeepSeek streaming response chunks with reasoning
 */
export const mockDeepSeekStreamingWithReasoningChunks = [
  'data: {"id":"chatcmpl-deepseek-123","object":"chat.completion.chunk","created":1677652288,"model":"deepseek-chat","choices":[{"index":0,"delta":{"role":"assistant","content":"","reasoning":"I need to analyze this step by step."},"finish_reason":null}]}\n\n',
  'data: {"id":"chatcmpl-deepseek-123","object":"chat.completion.chunk","created":1677652288,"model":"deepseek-chat","choices":[{"index":0,"delta":{"reasoning":" Let me break down the problem..."},"finish_reason":null}]}\n\n',
  'data: {"id":"chatcmpl-deepseek-123","object":"chat.completion.chunk","created":1677652288,"model":"deepseek-chat","choices":[{"index":0,"delta":{"reasoning":" Now I can formulate my response."},"finish_reason":null}]}\n\n',
  'data: {"id":"chatcmpl-deepseek-123","object":"chat.completion.chunk","created":1677652288,"model":"deepseek-chat","choices":[{"index":0,"delta":{"content":"Based on my reasoning, "},"finish_reason":null}]}\n\n',
  'data: {"id":"chatcmpl-deepseek-123","object":"chat.completion.chunk","created":1677652288,"model":"deepseek-chat","choices":[{"index":0,"delta":{"content":"here\'s my answer."},"finish_reason":null}]}\n\n',
  'data: {"id":"chatcmpl-deepseek-123","object":"chat.completion.chunk","created":1677652288,"model":"deepseek-chat","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":25,"completion_tokens":30,"total_tokens":55}}\n\n',
  'data: [DONE]\n\n'
];

/**
 * Mock DeepSeek streaming response chunks with reasoning and tool calls
 */
export const mockDeepSeekStreamingWithReasoningAndToolsChunks = [
  'data: {"id":"chatcmpl-deepseek-tools-123","object":"chat.completion.chunk","created":1677652288,"model":"deepseek-chat","choices":[{"index":0,"delta":{"role":"assistant","content":"","reasoning":"The user wants weather information. I should use the get_weather function."},"finish_reason":null}]}\n\n',
  'data: {"id":"chatcmpl-deepseek-tools-123","object":"chat.completion.chunk","created":1677652288,"model":"deepseek-chat","choices":[{"index":0,"delta":{"reasoning":" I\'ll call it with the location parameter."},"finish_reason":null}]}\n\n',
  'data: {"id":"chatcmpl-deepseek-tools-123","object":"chat.completion.chunk","created":1677652288,"model":"deepseek-chat","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"id":"call_456","type":"function","function":{"name":"get_weather","arguments":"{\\"location\\": \\"San Francisco\\"}"}}]},"finish_reason":null}]}\n\n',
  'data: {"id":"chatcmpl-deepseek-tools-123","object":"chat.completion.chunk","created":1677652288,"model":"deepseek-chat","choices":[{"index":0,"delta":{},"finish_reason":"tool_calls"}],"usage":{"prompt_tokens":30,"completion_tokens":25,"total_tokens":55}}\n\n',
  'data: [DONE]\n\n'
];

/**
 * Mock xAI response (OpenAI-compatible)
 */
export const mockXAIResponse = {
  id: "chatcmpl-123",
  object: "chat.completion",
  created: 1677652288,
  model: "grok-beta",
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

/**
 * Mock Ollama response
 */
export const mockOllamaResponse = {
  model: "llama2",
  created_at: "2023-12-12T14:13:43.416799Z",
  message: {
    role: "assistant",
    content: "Hello! How can I help you today?"
  },
  done: true,
  total_duration: 5191566416,
  load_duration: 2154458,
  prompt_eval_count: 26,
  prompt_eval_duration: 383809000,
  eval_count: 298,
  eval_duration: 4799921000
};

/**
 * Mock responses with tool calls
 */
export const mockOpenAIWithToolsResponse = {
  ...mockOpenAIResponse,
  choices: [{
    index: 0,
    message: {
      role: "assistant",
      content: null,
      tool_calls: [{
        id: "call_123",
        type: "function",
        function: {
          name: "get_weather",
          arguments: '{"location": "San Francisco"}'
        }
      }]
    },
    finish_reason: "tool_calls"
  }]
};

export const mockAnthropicWithToolsResponse = {
  ...mockAnthropicResponse,
  content: [{
    type: "tool_use",
    id: "toolu_123",
    name: "get_weather",
    input: {
      location: "San Francisco"
    }
  }]
};

export const mockToolCallChainResponse = [
  // Round 1: Assistant requests tool calls
  {
    id: 'chatcmpl-1',
    object: 'chat.completion',
    created: 1677652288,
    model: 'gpt-4-turbo',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              id: 'call_123',
              type: 'function',
              function: {
                name: 'get_weather',
                arguments: '{"location": "San Francisco"}',
              },
            },
          ],
        },
        finish_reason: 'tool_calls',
      },
    ],
    usage: {
      prompt_tokens: 8,
      completion_tokens: 19,
      total_tokens: 27,
    },
  },
  // Round 2: Assistant provides final answer
  {
    id: 'chatcmpl-2',
    object: 'chat.completion',
    created: 1677652289,
    model: 'gpt-4-turbo',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: 'The weather in San Francisco is 72°F and sunny.',
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 35,
      completion_tokens: 20,
      total_tokens: 55,
    },
  },
];

/**
 * Expected unified response format
 */
export const expectedUnifiedResponse: Omit<LLMResponse, 'service' | 'model'> = {
  content: "Hello! How can I help you today?",
  capabilities: {
    hasText: true,
    hasReasoning: false,
    hasToolCalls: false
  },
  usage: {
    input_tokens: 10,
    output_tokens: 9,
    total_tokens: 19
  },
  messages: [
    { role: "user", content: "Hello!" },
    { role: "assistant", content: "Hello! How can I help you today?" }
  ]
};

/**
 * Expected unified response with tool calls
 */
export const expectedUnifiedResponseWithTools: Omit<LLMResponse, 'service' | 'model'> = {
  content: "",
  toolCalls: [{
    id: "call_123",
    name: "get_weather",
    input: { location: "San Francisco" }
  }],
  capabilities: {
    hasText: false,
    hasReasoning: false,
    hasToolCalls: true
  },
  usage: {
    input_tokens: 10,
    output_tokens: 9,
    total_tokens: 19
  },
  messages: [
    { role: "user", content: "Hello!" },
    { role: "assistant", content: "" }
  ]
};

/**
 * Expected unified response with reasoning
 */
export const expectedUnifiedResponseWithReasoning: Omit<LLMResponse, 'service' | 'model'> = {
  content: "After careful consideration, here's my response.",
  reasoning: "I need to think through this systematically. The user is asking for help, so I should provide a thoughtful and useful answer.",
  capabilities: {
    hasText: true,
    hasReasoning: true,
    hasToolCalls: false
  },
  usage: {
    input_tokens: 15,
    output_tokens: 35,
    total_tokens: 50
  },
  messages: [
    { role: "user", content: "What should I do?" },
    { role: "assistant", content: "After careful consideration, here's my response." }
  ]
};

/**
 * Expected unified response with reasoning and tool calls
 */
export const expectedUnifiedResponseWithReasoningAndTools: Omit<LLMResponse, 'service' | 'model'> = {
  content: "",
  reasoning: "The user wants weather information. I should use the get_weather function to get current data.",
  toolCalls: [{
    id: "call_456",
    name: "get_weather",
    input: { location: "San Francisco" }
  }],
  capabilities: {
    hasText: false,
    hasReasoning: true,
    hasToolCalls: true
  },
  usage: {
    input_tokens: 25,
    output_tokens: 30,
    total_tokens: 55
  },
  messages: [
    { role: "user", content: "What's the weather like?" },
    { role: "assistant", content: "" }
  ]
};

/**
 * Expected stream chunks for different scenarios
 */
export const expectedStreamChunks = {
  content: {
    type: "content" as const,
    content: "Hello!"
  },
  toolCall: {
    type: "tool_call" as const,
    toolCall: {
      id: "call_123",
      name: "get_weather",
      input: { location: "San Francisco" }
    }
  },
  reasoning: {
    type: "reasoning" as const,
    reasoning: "Let me think about this step by step."
  },
  usage: {
    type: "usage" as const,
    usage: {
      input_tokens: 10,
      output_tokens: 5,
      total_tokens: 15
    }
  }
};

/**
 * Common test messages
 */
export const testMessages = [
  { role: "user" as const, content: "Hello!" }
];

export const testTools = [
  {
    name: "get_weather",
    description: "Get weather information for a location",
    parameters: {
      type: "object" as const,
      properties: {
        location: { type: "string" as const, description: "City name" }
      },
      required: ["location"]
    }
  }
];

/**
 * Create a mock fetch function that returns the specified response
 */
export function createMockFetch(responseData: any, options?: {
  status?: number;
  headers?: Record<string, string>;
  streaming?: boolean;
  chunks?: string[];
}) {
  return async (input: any, init: any): Promise<Response> => {
    const status = options?.status || 200;
    const headers = options?.headers || { "Content-Type": "application/json" };
    
    if (options?.streaming && options?.chunks) {
      // Create a ReadableStream for streaming responses
      const stream = new ReadableStream({
        start(controller) {
          options.chunks!.forEach((chunk, index) => {
            setTimeout(() => {
              controller.enqueue(new TextEncoder().encode(chunk));
              if (index === options.chunks!.length - 1) {
                controller.close();
              }
            }, index * 10); // Small delay between chunks
          });
        }
      });
      
      return new Response(stream, { status, headers });
    }
    
    return new Response(JSON.stringify(responseData), { status, headers });
  };
}

/**
 * Mock streaming chunks collections for easy testing
 */
export const mockStreamingChunks = {
  openai: {
    basic: mockOpenAIStreamingChunks,
    withTools: mockOpenAIStreamingWithToolsChunks,
    withReasoning: mockOpenAIStreamingWithReasoningChunks,
  },
  anthropic: {
    basic: mockAnthropicStreamingChunks,
    withThinking: mockAnthropicStreamingWithThinkingChunks,
    withTools: mockAnthropicStreamingWithToolsChunks,
    withThinkingAndTools: mockAnthropicStreamingWithThinkingAndToolsChunks,
  },
  deepseek: {
    withReasoning: mockDeepSeekStreamingWithReasoningChunks,
    withReasoningAndTools: mockDeepSeekStreamingWithReasoningAndToolsChunks,
  },
  google: {
    withTools: mockGoogleStreamingWithToolsChunks,
  }
}; 