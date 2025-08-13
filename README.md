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

Requirements:

- Node.js >= 22 (per `package.json` engines)

## Quick Start

```typescript
import { sendMessage } from "llm-adapter";

const response = await sendMessage({
  service: "openai",
  apiKey: "your-api-key",
  model: "gpt-4o-mini", // or another available model
  messages: [{ role: "user", content: "Hello!" }],
});

console.log(response.content);
```

### Response shape at a glance

All providers return a unified response object:

```typescript
type LLMResponse = {
  service:
    | "openai"
    | "anthropic"
    | "google"
    | "ollama"
    | "groq"
    | "deepseek"
    | "xai";
  model: string;
  content: string; // Primary text content
  reasoning?: string; // Provider-supported reasoning/thinking, when available
  toolCalls?: Array<{
    // Tool calls the assistant wants you to run
    id: string;
    name: string;
    input: Record<string, unknown>;
  }>;
  capabilities: {
    hasText: boolean;
    hasReasoning: boolean;
    hasToolCalls: boolean;
  };
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    reasoning_tokens?: number; // When provided by the service
  };
  messages: Array<{
    // Your original messages plus the assistant reply
    role: "user" | "assistant" | "system" | "tool_call" | "tool_result";
    content: string | any[];
    tool_call_id?: string;
    tool_calls?: LLMResponse["toolCalls"];
    name?: string;
    reasoning?: string;
  }>;
};
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

const stream = await streamMessage({
  service: "openai",
  apiKey: "your-api-key",
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Write a short story" }],
});

// Process chunks as they arrive
for await (const chunk of stream.chunks) {
  switch (chunk.type) {
    case "content":
      process.stdout.write(chunk.content ?? "");
      break;
    case "reasoning":
      // Optional: stream reasoning/thinking when supported
      break;
    case "tool_call":
      // The assistant is asking you to run a tool
      break;
    case "usage":
      // Token usage updates during stream
      break;
    case "complete":
      // Final assembled response available at chunk.finalResponse
      break;
  }
}

// Or collect the full response
const full = await stream.collect();
console.log(full.content);
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
  budgetTokens: 8192, // Enable extended thinking with budget
  messages: [
    /* messages */
  ],
};

// Google Gemini
const googleConfig: GoogleConfig = {
  service: "google",
  apiKey: "your-google-key",
  model: "gemini-2.5-pro", // or "gemini-2.5-flash"
  messages: [
    /* messages */
  ],
};

// Local Ollama (OpenAI compatible)
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
  model: "deepseek-r1-distill-llama-70b", // or other Groq-hosted models
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

| Provider  | Tool Calling | Reasoning | Streaming | Notes                                            |
| --------- | ------------ | --------- | --------- | ------------------------------------------------ |
| OpenAI    | ✅           | ✅        | ✅        | o1/o3 series expose reasoning when supported     |
| Anthropic | ✅           | ✅        | ✅        | Extended thinking via `budgetTokens`             |
| Google    | ✅           | ✅        | ✅        | Gemini 2.5 series supports thought summaries     |
| Ollama    | ✅\*         | ✅\*      | ✅        | OpenAI-compatible; depends on the selected model |
| Groq      | ✅           | ✅        | ✅        | Reasoning models like DeepSeek-R1, Qwen QwQ/3    |
| DeepSeek  | ✅           | ✅        | ✅        | DeepSeek-R1 reasoning models                     |
| xAI       | ✅           | ✅        | ✅        | Grok 3/4                                         |

\* Ollama exposes capabilities supported by the underlying model.

### Ollama OpenAI Compatibility

**Important:** This library uses Ollama's OpenAI-compatible API endpoints instead of the native Ollama format. This provides better tool calling support and consistency with other providers.

#### Endpoint Requirements

The library automatically appends `/v1/chat/completions` to your base URL:

```typescript
// ✅ Correct - specify base URL without /v1
const config: OllamaConfig = {
  service: "ollama",
  model: "llama3.2",
  baseUrl: "http://localhost:11434", // Library adds /v1/chat/completions
  messages: [{ role: "user", content: "Hello!" }],
};

// ❌ Incorrect - don't include /v1 or /api/chat in baseUrl
const badConfig: OllamaConfig = {
  service: "ollama",
  model: "llama3.2",
  baseUrl: "http://localhost:11434/v1", // Wrong - will result in /v1/v1/chat/completions
  messages: [{ role: "user", content: "Hello!" }],
};
```

#### Ollama Server Setup

Ensure your Ollama server exposes OpenAI-compatible endpoints (modern versions include this by default). Test that `/v1/chat/completions` works:

```bash
# Test Ollama OpenAI compatibility
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

#### Migration from v1.x

If upgrading from v1.x of this library:

- **No code changes needed** - configurations remain the same
- **Endpoint automatically updated** - library now uses `/v1/chat/completions`
- **Better tool support** - OpenAI format provides more robust tool calling
- **Improved streaming** - Uses SSE format like other providers

#### Tool Calling with Ollama

Tool calling now works with any Ollama model that supports it:

```typescript
import { sendMessage, hasToolCalls, type Tool } from "llm-adapter";

const tools: Tool[] = [
  {
    name: "get_time",
    description: "Get current time",
    parameters: {
      type: "object",
      properties: {},
    },
  },
];

const response = await sendMessage(
  {
    service: "ollama",
    model: "mistral:latest", // or any tool-capable model
    baseUrl: "http://localhost:11434",
    messages: [{ role: "user", content: "What time is it?" }],
  },
  { tools }
);

if (hasToolCalls(response)) {
  console.log("Tool calls:", response.toolCalls);
}
```

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
      tool_calls: response.toolCalls, // CRITICAL: Include structured tool calls
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

      // Add tool result to conversation history
      config.messages.push({
        role: "tool_result",
        content: toolResult,
        tool_call_id: toolCall.id, // CRITICAL: Required for most providers
        name: toolCall.name, // REQUIRED for Google provider, optional for others
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
      // Add assistant's message with tool calls
      this.config.messages.push({
        role: "assistant",
        content: response.content || "",
        tool_calls: response.toolCalls, // CRITICAL: Include structured tool calls
      });

      // Execute all tool calls
      for (const toolCall of response.toolCalls) {
        const result = await this.executeTool(toolCall.name, toolCall.input);

        // Add tool result to conversation
        this.config.messages.push({
          role: "tool_result",
          content: result,
          tool_call_id: toolCall.id, // CRITICAL: Required for most providers
          name: toolCall.name, // REQUIRED for Google provider, optional for others
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
   - Assistant message with `tool_calls` property (contains structured tool call data)
   - Tool result messages (`role: "tool_result"` with `tool_call_id` linking to specific calls)
   - Final assistant response

3. **Handle multiple tool calls** - The LLM might call several tools at once

4. **Continue the conversation** after tool execution by sending the updated message history back

5. **Use proper message structure**:
   - Assistant messages include `tool_calls` array for tool invocations
   - Tool result messages must include `tool_call_id` for most providers (OpenAI, Anthropic, Groq, DeepSeek, xAI)
   - Tool result messages must include `name` for Google provider (function name matching)
   - Tool result messages use `role: "tool_result"`

This pattern ensures that the LLM has full context of what tools were called and their results, enabling natural follow-up conversations.

### Provider-Specific Tool Call Requirements

| Provider      | Tool Call ID  | Required Fields        | Notes                               |
| ------------- | ------------- | ---------------------- | ----------------------------------- |
| **OpenAI**    | Real IDs      | `tool_call_id`         | Standard OpenAI format              |
| **Anthropic** | Real IDs      | `tool_call_id`         | Converted from `tool_use_id`        |
| **Google**    | Generated IDs | `name` (function name) | Matches by function name, not ID    |
| **Groq**      | Real IDs      | `tool_call_id`         | OpenAI-compatible                   |
| **DeepSeek**  | Real IDs      | `tool_call_id`         | OpenAI-compatible                   |
| **xAI**       | Real IDs      | `tool_call_id`         | OpenAI-compatible                   |
| **Ollama**    | Real IDs      | `tool_call_id`         | OpenAI-compatible (model-dependent) |

**Important for Google users**: When using Google Gemini, ensure your tool result messages include the `name` field matching the function name, as Google's API uses function names rather than IDs for matching.

### Reasoning Access (Multiple Providers)

#### Anthropic Claude (Thinking Mode)

```typescript
import { sendMessage, hasReasoning, type AnthropicConfig } from "llm-adapter";

const config: AnthropicConfig = {
  service: "anthropic",
  apiKey: "your-api-key",
  model: "claude-3-sonnet-20240229",
  budgetTokens: 8192, // Enable extended thinking with budget
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

#### OpenAI Reasoning Models (o1/o3 Series)

```typescript
import { sendMessage, hasReasoning, type OpenAIConfig } from "llm-adapter";

const config: OpenAIConfig = {
  service: "openai",
  apiKey: "your-api-key",
  model: "o3-mini", // or other supported reasoning models
  messages: [
    {
      role: "user",
      content:
        "Write a complex algorithm to solve the traveling salesman problem",
    },
  ],
};

const response = await sendMessage(config, { reasoningEffort: "high" });

if (hasReasoning(response)) {
  console.log("Reasoning tokens:", response.usage.reasoning_tokens);
  console.log("Reasoning process:", response.reasoning);
}
```

#### Google Gemini Thinking (2.5 Series)

```typescript
import { sendMessage, hasReasoning, type GoogleConfig } from "llm-adapter";

const config: GoogleConfig = {
  service: "google",
  apiKey: "your-api-key",
  model: "gemini-2.5-pro", // or "gemini-2.5-flash"
  messages: [
    {
      role: "user",
      content: "Analyze this complex data pattern and find anomalies",
    },
  ],
};

const response = await sendMessage(config, {
  thinkingBudget: 8192, // Control thinking token limit
  includeThoughts: true, // Get thought summaries
});

if (hasReasoning(response)) {
  console.log("Thinking process:", response.reasoning);
}
```

#### xAI Grok Reasoning (3/4 Series)

```typescript
import { sendMessage, hasReasoning, type XAIConfig } from "llm-adapter";

const config: XAIConfig = {
  service: "xai",
  apiKey: "your-api-key",
  model: "grok-3", // or "grok-4" (always reasoning mode)
  messages: [
    {
      role: "user",
      content: "Debug this complex code and explain the logic flow",
    },
  ],
};

const response = await sendMessage(config, {
  reasoningEffort: "high", // "low" for minimal thinking, "high" for maximum
});

if (hasReasoning(response)) {
  console.log("Reasoning content:", response.reasoning);
}
```

#### Groq Reasoning Models

```typescript
import { sendMessage, hasReasoning, type GroqConfig } from "llm-adapter";

const config: GroqConfig = {
  service: "groq",
  apiKey: "your-api-key",
  model: "qwen-qwq-32b", // or "deepseek-r1-distill-llama-70b"
  messages: [
    {
      role: "user",
      content:
        "Solve this step-by-step: How would you optimize a database query?",
    },
  ],
};

const response = await sendMessage(config, {
  reasoningFormat: "parsed", // Get structured reasoning output
  reasoningEffort: "default", // Enable thinking mode
  temperature: 0.6,
});

if (hasReasoning(response)) {
  console.log("Reasoning steps:", response.reasoning);
}
```

#### DeepSeek Reasoning

```typescript
import { sendMessage, hasReasoning, type DeepSeekConfig } from "llm-adapter";

const config: DeepSeekConfig = {
  service: "deepseek",
  apiKey: "your-api-key",
  model: "deepseek-reasoner", // DeepSeek-R1 series
  messages: [
    { role: "user", content: "Plan a comprehensive software architecture" },
  ],
};

const response = await sendMessage(config);

if (hasReasoning(response)) {
  console.log("Reasoning process:", response.reasoning);
}
```

### Key Reasoning Features by Provider

| Provider      | Reasoning Models        | Control Parameters                   | Special Features            |
| ------------- | ----------------------- | ------------------------------------ | --------------------------- |
| **OpenAI**    | o1, o3 series           | `reasoningEffort`                    | Reasoning token counting    |
| **Anthropic** | All models              | `budgetTokens`                       | Extended thinking budget    |
| **Google**    | Gemini 2.5 Pro/Flash    | `thinkingBudget`, `includeThoughts`  | Thought summaries           |
| **xAI**       | Grok 3, Grok 4          | `reasoningEffort`                    | Built-in reasoning (Grok 4) |
| **Groq**      | Qwen QwQ/3, DeepSeek-R1 | `reasoningFormat`, `reasoningEffort` | Ultra-fast reasoning        |
| **DeepSeek**  | DeepSeek-R1 series      | Built-in                             | Native reasoning models     |

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

CORS behavior for other providers can vary by endpoint and over time. The library will show helpful warnings; avoid exposing API keys in the client and prefer server-side or a lightweight proxy:

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
- **⚠️ OpenAI, Google, Groq, DeepSeek, xAI**: CORS behavior varies and may work in some environments. Regardless, exposing API keys in the browser is insecure—prefer server-side or a lightweight proxy, or use provider-recommended browser auth/ephemeral tokens.

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
