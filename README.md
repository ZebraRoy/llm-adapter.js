# LLM Adapter

A unified TypeScript library for working with multiple LLM providers through a consistent interface.

## Features

- 🔗 **Unified Interface** - One API for OpenAI, Anthropic, Google, Ollama, Groq, DeepSeek, and xAI
- 🔄 **Streaming Support** - Real-time response streaming for all providers
- 🛠️ **Tool Calling** - Function calling support where available
- 🧠 **Reasoning Support** - Access to reasoning/thinking content (Anthropic, DeepSeek)
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
// Override fetch for a specific function call
const response = await sendMessage(config, {
  fetch: async (input, init) => {
    // Custom fetch logic here
    return fetch(input, init);
  },
});
```

### Configuration-Level Fetch

```typescript
const config = {
  service: "openai",
  apiKey: "your-api-key",
  model: "gpt-3.5-turbo",
  messages: [{ role: "user", content: "Hello!" }],
  fetch: customFetchImplementation, // Set at config level
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
function createMockFetch(mockResponse: any) {
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
const retryFetch = async (input: any, init: any) => {
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
const loggingFetch = async (input: any, init: any) => {
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
```

#### Rate Limiting

```typescript
let lastRequestTime = 0;
const minInterval = 1000; // 1 second between requests

const rateLimitedFetch = async (input: any, init: any) => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < minInterval) {
    const waitTime = minInterval - timeSinceLastRequest;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
  return fetch(input, init);
};
```

## Basic Usage

### Simple Question

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

console.log(response.content);
```

### Conversation History

```typescript
import { sendMessage } from "llm-adapter";

const response = await sendMessage({
  service: "openai",
  apiKey: "your-api-key",
  model: "gpt-4",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Hello!" },
    { role: "assistant", content: "Hi there! How can I help you today?" },
    { role: "user", content: "Tell me about TypeScript" },
  ],
});
```

### Streaming Responses

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

## Supported Providers

- **OpenAI** - GPT models with tool calling
- **Anthropic** - Claude models with thinking support
- **Google** - Gemini models
- **Ollama** - Local model deployment
- **Groq** - Fast inference
- **DeepSeek** - Reasoning models
- **xAI** - Grok models

## Advanced Features

### Tool Calling

```typescript
const tools = [
  {
    name: "get_weather",
    description: "Get weather information for a location",
    parameters: {
      type: "object",
      properties: {
        location: { type: "string", description: "City name" },
      },
      required: ["location"],
    },
  },
];

const response = await sendMessage(config, { tools });

if (response.toolCalls) {
  for (const toolCall of response.toolCalls) {
    console.log(`Tool: ${toolCall.name}`);
    console.log(`Args:`, toolCall.input);
  }
}
```

### Reasoning Access (Anthropic & DeepSeek)

```typescript
const response = await sendMessage({
  service: "anthropic",
  // ... other config
  enableThinking: true,
});

if (response.reasoning) {
  console.log("Reasoning:", response.reasoning);
}
console.log("Final answer:", response.content);
```

## Type Safety

The library provides comprehensive TypeScript types:

```typescript
import type {
  LLMResponse,
  StreamingResponse,
  ServiceConfig,
  Tool,
  Message,
  FetchFunction,
} from "llm-adapter";

// Type-safe service configurations
const openaiConfig: OpenAIConfig = {
  service: "openai",
  apiKey: "key",
  model: "gpt-4",
  // ... TypeScript will validate all properties
};

// Response type checking
function handleResponse(response: LLMResponse) {
  if (hasToolCalls(response)) {
    // response.toolCalls is now typed
  }
  if (hasReasoning(response)) {
    // response.reasoning is now typed
  }
}
```

## License

MIT
