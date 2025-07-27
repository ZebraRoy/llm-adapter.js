# LLM Adapter

A unified TypeScript library for working with multiple LLM providers through a consistent interface.

## Features

- 🔗 **Unified Interface** - One API for OpenAI, Anthropic, Google, Ollama, Groq, DeepSeek, and xAI
- 🔄 **Streaming Support** - Real-time response streaming for all providers
- 🛠️ **Tool Calling** - Function calling support where available
- 🧠 **Reasoning Support** - Access to reasoning/thinking content (Anthropic, DeepSeek)
- 🌐 **Browser Support** - Built-in browser compatibility with provider-specific CORS handling
- 🎯 **Type Safety** - Full TypeScript support with detailed types
- 🔌 **Dependency Injection** - Customizable fetch implementation for testing and advanced use cases
- ⚡ **Modern** - Built with modern ES modules and async/await

## Installation

```bash
npm install llm-adapter
```

## Quick Start

```typescript
import { sendMessage } from "llm-adapter";

const response = await sendMessage({
  service: "openai",
  apiKey: "your-api-key",
  model: "gpt-3.5-turbo",
  messages: [{ role: "user", content: "Hello!" }],
});

console.log(response.content);
```

## Core API Functions

### `sendMessage(config, options?)` - Main conversation function

Send a conversation to an LLM provider (non-streaming).

```typescript
import { sendMessage, type ServiceConfig, type Tool } from "llm-adapter";

const config: ServiceConfig = {
  service: "openai",
  apiKey: "your-api-key",
  model: "gpt-4",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Hello!" },
  ],
};

const response = await sendMessage(config, {
  temperature: 0.7,
  maxTokens: 1000,
  tools: [
    /* tool definitions */
  ],
});
```

### `streamMessage(config, options?)` - Streaming conversation

Send a conversation to an LLM provider with streaming response.

```typescript
import { streamMessage } from "llm-adapter";

const streamResponse = await streamMessage({
  service: "openai",
  apiKey: "your-api-key",
  model: "gpt-3.5-turbo",
  messages: [{ role: "user", content: "Write a short story" }],
});

// Process chunks as they arrive
for await (const chunk of streamResponse.chunks) {
  if (chunk.type === "content") {
    process.stdout.write(chunk.content || "");
  }
}

// Or collect the full response
const fullResponse = await streamResponse.collect();
console.log(fullResponse.content);
```

### `askQuestion(config, question, options?)` - Convenience function

Ask a single question without managing conversation history.

```typescript
import { askQuestion } from "llm-adapter";

const response = await askQuestion(
  {
    service: "anthropic",
    apiKey: "your-api-key",
    model: "claude-3-sonnet-20240229",
  },
  "What is the capital of France?",
  {
    systemPrompt: "You are a helpful geography teacher.",
    temperature: 0.7,
  }
);

console.log(response.content); // "Paris"
```

## Supported Providers

### Provider Configuration Examples

```typescript
import type {
  OpenAIConfig,
  AnthropicConfig,
  GoogleConfig,
  OllamaConfig,
  GroqConfig,
  DeepSeekConfig,
  XAIConfig,
} from "llm-adapter";

// OpenAI
const openaiConfig: OpenAIConfig = {
  service: "openai",
  apiKey: "your-openai-key",
  model: "gpt-4",
  messages: [
    /* messages */
  ],
};

// Anthropic Claude (with thinking support)
const anthropicConfig: AnthropicConfig = {
  service: "anthropic",
  apiKey: "your-anthropic-key",
  model: "claude-3-sonnet-20240229",
  enableThinking: true, // Enable reasoning/thinking mode
  messages: [
    /* messages */
  ],
};

// Google Gemini
const googleConfig: GoogleConfig = {
  service: "google",
  apiKey: "your-google-key",
  model: "gemini-pro",
  messages: [
    /* messages */
  ],
};

// Local Ollama
const ollamaConfig: OllamaConfig = {
  service: "ollama",
  model: "llama2",
  baseUrl: "http://localhost:11434", // optional, defaults to localhost:11434
  messages: [
    /* messages */
  ],
};

// Groq
const groqConfig: GroqConfig = {
  service: "groq",
  apiKey: "your-groq-key",
  model: "mixtral-8x7b-32768",
  messages: [
    /* messages */
  ],
};

// DeepSeek
const deepseekConfig: DeepSeekConfig = {
  service: "deepseek",
  apiKey: "your-deepseek-key",
  model: "deepseek-chat",
  messages: [
    /* messages */
  ],
};

// xAI
const xaiConfig: XAIConfig = {
  service: "xai",
  apiKey: "your-xai-key",
  model: "grok-beta",
  messages: [
    /* messages */
  ],
};
```

### Provider Capabilities

| Provider  | Tool Calling | Reasoning | Streaming | Notes                                |
| --------- | ------------ | --------- | --------- | ------------------------------------ |
| OpenAI    | ✅           | ❌        | ✅        | Full tool calling support            |
| Anthropic | ✅           | ✅        | ✅        | Reasoning via `enableThinking: true` |
| Google    | ✅           | ❌        | ✅        | Gemini models                        |
| Ollama    | ❌           | ❌        | ✅        | Local deployment                     |
| Groq      | ✅           | ❌        | ✅        | Fast inference                       |
| DeepSeek  | ✅           | ✅        | ✅        | Reasoning models                     |
| xAI       | ✅           | ❌        | ✅        | Grok models                          |

## Advanced Features

### Tool Calling

```typescript
import { sendMessage, hasToolCalls, type Tool } from "llm-adapter";

const tools: Tool[] = [
  {
    name: "get_weather",
    description: "Get weather information for a location",
    parameters: {
      type: "object",
      properties: {
        location: { type: "string", description: "City name" },
        unit: { type: "string", enum: ["celsius", "fahrenheit"] },
      },
      required: ["location"],
    },
  },
];

const response = await sendMessage(
  {
    service: "openai",
    apiKey: "your-api-key",
    model: "gpt-4",
    messages: [{ role: "user", content: "What's the weather in Paris?" }],
  },
  { tools }
);

// Check for tool calls using type guard
if (hasToolCalls(response)) {
  for (const toolCall of response.toolCalls) {
    console.log(`Tool: ${toolCall.name}`);
    console.log(`Arguments:`, toolCall.input);

    if (toolCall.name === "get_weather") {
      // Handle weather tool call
      const weather = await getWeather(toolCall.input.location);
      console.log(`Weather: ${weather}`);
    }
  }
}
```

### Complete Tool Call Flow with Conversation History

Here's a complete example showing how to properly handle tool calls with conversation history management:

```typescript
import {
  sendMessage,
  hasToolCalls,
  hasTextContent,
  type Tool,
  type Message,
  type ServiceConfig,
} from "llm-adapter";

// Define available tools
const tools: Tool[] = [
  {
    name: "get_weather",
    description: "Get current weather information for a location",
    parameters: {
      type: "object",
      properties: {
        location: { type: "string", description: "City name" },
        unit: {
          type: "string",
          enum: ["celsius", "fahrenheit"],
          default: "celsius",
        },
      },
      required: ["location"],
    },
  },
  {
    name: "calculate",
    description: "Perform basic mathematical calculations",
    parameters: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description: "Mathematical expression to evaluate",
        },
      },
      required: ["expression"],
    },
  },
];

// Mock tool implementations
async function getWeather(
  location: string,
  unit: string = "celsius"
): Promise<string> {
  // In real implementation, call actual weather API
  return `The weather in ${location} is 22°${
    unit === "celsius" ? "C" : "F"
  } and sunny.`;
}

async function calculate(expression: string): Promise<string> {
  // In real implementation, use safe math evaluation
  try {
    const result = eval(expression); // Don't use eval in production!
    return `${expression} = ${result}`;
  } catch (error) {
    return `Error calculating ${expression}: ${error.message}`;
  }
}

async function handleToolCallConversation() {
  const config: ServiceConfig = {
    service: "openai",
    apiKey: "your-api-key",
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant with access to weather and calculation tools.",
      },
      {
        role: "user",
        content: "What's the weather in Tokyo? Also, what's 15 * 24?",
      },
    ],
  };

  console.log("🤖 Sending initial request with tools...");

  // Step 1: Send initial request with tools
  let response = await sendMessage(config, { tools });

  // Step 2: Check if LLM wants to call tools
  if (hasToolCalls(response)) {
    console.log("🔧 LLM wants to call tools:");

    // Add the assistant's tool call message to conversation history
    config.messages.push({
      role: "assistant",
      content: response.content || "", // May be empty if only tool calls
    });

    // Step 3: Execute each tool call and add results to conversation
    for (const toolCall of response.toolCalls) {
      console.log(`  - Calling ${toolCall.name} with:`, toolCall.input);

      let toolResult: string;

      // Execute the appropriate tool
      switch (toolCall.name) {
        case "get_weather":
          toolResult = await getWeather(
            toolCall.input.location,
            toolCall.input.unit
          );
          break;
        case "calculate":
          toolResult = await calculate(toolCall.input.expression);
          break;
        default:
          toolResult = `Unknown tool: ${toolCall.name}`;
      }

      console.log(`  - Result: ${toolResult}`);

      // Add tool call to conversation history
      config.messages.push({
        role: "tool_call",
        content: `Called ${toolCall.name} with ${JSON.stringify(
          toolCall.input
        )}`,
      });

      // Add tool result to conversation history
      config.messages.push({
        role: "tool_result",
        content: toolResult,
      });
    }

    // Step 4: Send conversation back to LLM with tool results
    console.log("📤 Sending conversation with tool results...");
    response = await sendMessage(config);
  }

  // Step 5: Handle final response
  if (hasTextContent(response)) {
    console.log("✅ Final response:", response.content);

    // Add final response to conversation history for future turns
    config.messages.push({
      role: "assistant",
      content: response.content,
    });
  }

  // The conversation history now contains the complete exchange
  console.log("\n📝 Complete conversation history:");
  config.messages.forEach((msg, i) => {
    console.log(`${i + 1}. ${msg.role}: ${msg.content}`);
  });

  return config; // Return updated conversation for further interaction
}

// Usage
handleToolCallConversation()
  .then((conversation) => {
    console.log("Conversation completed successfully!");
    // You can continue the conversation by adding more user messages
    // and calling handleToolCallConversation again
  })
  .catch((error) => {
    console.error("Error in tool call conversation:", error);
  });
```

### Multi-Turn Tool Call Conversation

Here's how to handle ongoing conversations with tool calls:

```typescript
import { sendMessage, hasToolCalls, type ServiceConfig } from "llm-adapter";

class ToolCallConversation {
  private config: ServiceConfig;
  private tools: Tool[];

  constructor(config: Omit<ServiceConfig, "messages">, tools: Tool[]) {
    this.config = {
      ...config,
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant with access to various tools.",
        },
      ],
    };
    this.tools = tools;
  }

  async sendMessage(userMessage: string): Promise<string> {
    // Add user message to conversation
    this.config.messages.push({
      role: "user",
      content: userMessage,
    });

    let response = await sendMessage(this.config, { tools: this.tools });

    // Handle tool calls if present
    while (hasToolCalls(response)) {
      // Add assistant's message (may contain both text and tool calls)
      this.config.messages.push({
        role: "assistant",
        content: response.content || "",
      });

      // Execute all tool calls
      for (const toolCall of response.toolCalls) {
        const result = await this.executeTool(toolCall.name, toolCall.input);

        // Add tool call and result to conversation
        this.config.messages.push({
          role: "tool_call",
          content: `Called ${toolCall.name} with ${JSON.stringify(
            toolCall.input
          )}`,
        });

        this.config.messages.push({
          role: "tool_result",
          content: result,
        });
      }

      // Get LLM's response to the tool results
      response = await sendMessage(this.config);
    }

    // Add final response to conversation
    this.config.messages.push({
      role: "assistant",
      content: response.content || "",
    });

    return response.content || "";
  }

  private async executeTool(name: string, input: any): Promise<string> {
    switch (name) {
      case "get_weather":
        return await getWeather(input.location, input.unit);
      case "calculate":
        return await calculate(input.expression);
      default:
        return `Unknown tool: ${name}`;
    }
  }

  getConversationHistory(): Message[] {
    return [...this.config.messages];
  }
}

// Usage example
async function multiTurnExample() {
  const conversation = new ToolCallConversation(
    {
      service: "openai",
      apiKey: "your-api-key",
      model: "gpt-4",
    },
    tools
  );

  // First interaction
  let response1 = await conversation.sendMessage(
    "What's the weather in New York and what's 50 + 75?"
  );
  console.log("Response 1:", response1);

  // Second interaction - conversation history is maintained
  let response2 = await conversation.sendMessage(
    "Now tell me the weather in London and multiply the previous calculation by 2"
  );
  console.log("Response 2:", response2);

  // View full conversation history
  console.log("Full conversation:", conversation.getConversationHistory());
}
```

### Key Points for Tool Call Success:

1. **Always check for tool calls** using `hasToolCalls(response)` before accessing `response.toolCalls`

2. **Maintain conversation history** by adding all messages in the correct order:

   - User message
   - Assistant message (may be empty if only tool calls)
   - Tool call messages (`role: "tool_call"`)
   - Tool result messages (`role: "tool_result"`)
   - Final assistant response

3. **Handle multiple tool calls** - The LLM might call several tools at once

4. **Continue the conversation** after tool execution by sending the updated message history back

5. **Use proper message roles**:
   - `"tool_call"` for the tool invocation
   - `"tool_result"` for the tool's response

This pattern ensures that the LLM has full context of what tools were called and their results, enabling natural follow-up conversations.

### Reasoning Access (Anthropic & DeepSeek)

```typescript
import { sendMessage, hasReasoning, type AnthropicConfig } from "llm-adapter";

const config: AnthropicConfig = {
  service: "anthropic",
  apiKey: "your-api-key",
  model: "claude-3-sonnet-20240229",
  enableThinking: true, // Enable reasoning mode
  messages: [
    { role: "user", content: "Solve this complex math problem: 2^8 + 3^4" },
  ],
};

const response = await sendMessage(config);

// Check for reasoning content using type guard
if (hasReasoning(response)) {
  console.log("Reasoning:", response.reasoning);
}
console.log("Final answer:", response.content);
```

### Response Type Checking

```typescript
import {
  sendMessage,
  hasTextContent,
  hasToolCalls,
  hasReasoning,
  getResponseType,
  type LLMResponse,
} from "llm-adapter";

function handleResponse(response: LLMResponse) {
  console.log(`Response type: ${getResponseType(response)}`);

  if (hasTextContent(response)) {
    console.log("Text:", response.content);
  }

  if (hasToolCalls(response)) {
    console.log("Tool calls:", response.toolCalls);
  }

  if (hasReasoning(response)) {
    console.log("Reasoning:", response.reasoning);
  }
}
```

## Fetch Dependency Injection

The library supports dependency injection for the fetch function, allowing you to customize HTTP requests for testing, logging, retries, and more.

### Setting Global Default Fetch

```typescript
import { setDefaultFetch, getDefaultFetch } from "llm-adapter";

// Set a global custom fetch with logging
setDefaultFetch(async (input, init) => {
  console.log(`Making request to: ${input}`);
  const response = await fetch(input, init);
  console.log(`Response status: ${response.status}`);
  return response;
});

// All subsequent calls will use this fetch implementation
const response = await sendMessage(config);
```

### Per-Call Fetch Override

```typescript
import { sendMessage, type FetchFunction } from "llm-adapter";

// Override fetch for a specific function call
const customFetch: FetchFunction = async (input, init) => {
  // Custom fetch logic here
  return fetch(input, init);
};

const response = await sendMessage(config, {
  fetch: customFetch,
});
```

### Configuration-Level Fetch

```typescript
import type { OpenAIConfig, FetchFunction } from "llm-adapter";

const customFetch: FetchFunction = async (input, init) => {
  // Custom logic here
  return fetch(input, init);
};

const config: OpenAIConfig = {
  service: "openai",
  apiKey: "your-api-key",
  model: "gpt-3.5-turbo",
  messages: [{ role: "user", content: "Hello!" }],
  fetch: customFetch, // Set at config level
};
```

### Fetch Priority Order

The library uses fetch implementations in this priority order:

1. **Function call level** - `sendMessage(config, { fetch: ... })`
2. **Configuration level** - `config.fetch`
3. **Global default** - Set via `setDefaultFetch()`
4. **Native fetch** - Browser/Node.js default

### Common Use Cases

#### Testing with Mock Fetch

```typescript
import { sendMessage, type FetchFunction } from "llm-adapter";

function createMockFetch(mockResponse: any): FetchFunction {
  return async (input: any, init: any) => {
    return new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
}

const mockFetch = createMockFetch({
  choices: [{ message: { content: "Mocked response!" } }],
  usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  model: "gpt-3.5-turbo",
});

const response = await sendMessage(config, { fetch: mockFetch });
```

#### Retry Logic

```typescript
import { setDefaultFetch, type FetchFunction } from "llm-adapter";

const retryFetch: FetchFunction = async (input: any, init: any) => {
  const maxRetries = 3;
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(input, init);
      if (response.ok || response.status < 500) {
        return response;
      }

      // Retry on 5xx errors
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  throw lastError!;
};

setDefaultFetch(retryFetch);
```

#### Request/Response Logging

```typescript
import { setDefaultFetch, type FetchFunction } from "llm-adapter";

const loggingFetch: FetchFunction = async (input: any, init: any) => {
  console.log("🚀 Request:", {
    url: input,
    method: init?.method,
    headers: init?.headers,
  });

  const start = Date.now();
  const response = await fetch(input, init);
  const duration = Date.now() - start;

  console.log("✅ Response:", {
    status: response.status,
    duration: `${duration}ms`,
  });

  return response;
};

setDefaultFetch(loggingFetch);
```

#### Rate Limiting

```typescript
import { setDefaultFetch, type FetchFunction } from "llm-adapter";

let lastRequestTime = 0;
const minInterval = 1000; // 1 second between requests

const rateLimitedFetch: FetchFunction = async (input: any, init: any) => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < minInterval) {
    const waitTime = minInterval - timeSinceLastRequest;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
  return fetch(input, init);
};

setDefaultFetch(rateLimitedFetch);
```

## Type Safety

The library provides comprehensive TypeScript types:

```typescript
import type {
  // Core response types
  LLMResponse,
  StreamingResponse,
  StreamChunk,

  // Configuration types
  ServiceConfig,
  LLMConfig,

  // Provider-specific configs
  OpenAIConfig,
  AnthropicConfig,
  GoogleConfig,
  OllamaConfig,
  GroqConfig,
  DeepSeekConfig,
  XAIConfig,

  // Tool and message types
  Tool,
  Message,
  ToolCall,
  Usage,

  // Utility types
  FetchFunction,
  ServiceName,
  MessageRole,
} from "llm-adapter";

// Type-safe service configurations
const openaiConfig: OpenAIConfig = {
  service: "openai",
  apiKey: "key",
  model: "gpt-4",
  messages: [{ role: "user", content: "Hello" }],
  // TypeScript will validate all properties
};

// Response type checking with type guards
import { hasToolCalls, hasReasoning, hasTextContent } from "llm-adapter";

function handleResponse(response: LLMResponse) {
  if (hasToolCalls(response)) {
    // response.toolCalls is now properly typed
    response.toolCalls.forEach((call) => {
      console.log(call.name, call.input);
    });
  }

  if (hasReasoning(response)) {
    // response.reasoning is now properly typed
    console.log(response.reasoning);
  }

  if (hasTextContent(response)) {
    // response.content is guaranteed to exist
    console.log(response.content);
  }
}
```

## Browser Support

The library includes built-in browser support with provider-specific CORS handling. Use the `isBrowser` parameter to enable browser-specific optimizations and headers.

### Anthropic Browser Usage

Anthropic supports direct browser usage with the required header:

```typescript
import { sendMessage } from "llm-adapter";

const response = await sendMessage({
  service: "anthropic",
  apiKey: "your-api-key",
  model: "claude-3-sonnet-20240229",
  messages: [{ role: "user", content: "Hello from browser!" }],
  isBrowser: true, // Adds anthropic-dangerous-direct-browser-access header
});
```

### Other Providers in Browser

Most other providers have CORS restrictions for direct browser usage. The library will show helpful warnings:

```typescript
const response = await sendMessage({
  service: "openai", // Will show CORS warning
  apiKey: "your-api-key",
  model: "gpt-4",
  messages: [{ role: "user", content: "Hello" }],
  isBrowser: true, // Shows warning about proxy server usage
});
```

### Browser-Compatible Providers

- **✅ Anthropic**: Full support with `isBrowser: true`
- **✅ Ollama**: Works if your local server has CORS enabled
- **⚠️ OpenAI, Google, Groq, DeepSeek, xAI**: Require proxy server due to CORS policy

### Using with Ask Functions

```typescript
import { askQuestion } from "llm-adapter";

const response = await askQuestion(
  {
    service: "anthropic",
    apiKey: "your-api-key",
    model: "claude-3-sonnet-20240229",
  },
  "What is TypeScript?",
  {
    isBrowser: true, // Enable browser-specific handling
    systemPrompt: "Be concise and helpful",
  }
);
```

## Complete API Reference

### Main Functions

- `sendMessage(config, options?)` - Send conversation (non-streaming)
- `streamMessage(config, options?)` - Send conversation (streaming)
- `askQuestion(config, question, options?)` - Ask single question

### Fetch Management

- `setDefaultFetch(fetchFn)` - Set global default fetch implementation
- `getDefaultFetch()` - Get current global fetch implementation

### Type Guards & Utilities

- `hasTextContent(response)` - Check if response has text content
- `hasToolCalls(response)` - Check if response has tool calls
- `hasReasoning(response)` - Check if response has reasoning content
- `getResponseType(response)` - Get string description of response content types

### Configuration Options

All functions support these options:

- `tools?: Tool[]` - Available functions for the LLM to call
- `temperature?: number` - Response randomness (0.0 to 1.0)
- `maxTokens?: number` - Maximum tokens to generate
- `fetch?: FetchFunction` - Custom fetch implementation for this call
- `isBrowser?: boolean` - Enable browser-specific API handling and headers

## Examples Repository

For more comprehensive examples, see the `src/examples.ts` file in the repository which includes:

- Advanced fetch dependency injection patterns
- Mock testing setups
- Retry and error handling strategies
- Rate limiting implementations
- Logging and debugging utilities

## License

MIT
