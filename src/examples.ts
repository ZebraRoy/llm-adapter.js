import {
  sendMessage,
  streamMessage,
  askQuestion,
  setDefaultFetch,
  getDefaultFetch,
  type FetchFunction,
  type ServiceConfig,
  type OpenAIConfig
} from './index.js';

// ===== FETCH DEPENDENCY INJECTION EXAMPLES =====

// Example 1: Setting a global custom fetch implementation
function setupGlobalFetch() {
  // Custom fetch with logging and timeout
  const customFetch: FetchFunction = async (input, init) => {
    console.log(`Making request to: ${input}`);
    
    // Add timeout
    const timeoutMs = 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      });
      
      console.log(`Response status: ${response.status}`);
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  };
  
  // Set as global default
  setDefaultFetch(customFetch);
  
  console.log('Custom fetch set as global default');
}

// Example 2: Using the global default fetch
async function exampleWithGlobalFetch() {
  // This will use whatever fetch was set globally
  const config: OpenAIConfig = {
    service: "openai",
    apiKey: "your-api-key",
    model: "gpt-3.5-turbo",
    messages: [
      { role: "user", content: "Hello!" }
    ]
  };
  
  const response = await sendMessage(config);
  console.log(response.content);
}

// Example 3: Overriding fetch per function call
async function exampleWithPerCallFetch() {
  const config: ServiceConfig = {
    service: "openai",
    apiKey: "your-api-key", 
    model: "gpt-3.5-turbo",
    messages: [
      { role: "user", content: "Hello!" }
    ]
  };
  
  // Custom fetch just for this call
  const debugFetch: FetchFunction = async (input, init) => {
    console.log('🚀 Debug fetch called with:', {
      url: input,
      method: init?.method,
      headers: init?.headers
    });
    
    const response = await fetch(input, init);
    console.log('✅ Debug fetch response:', response.status);
    return response;
  };
  
  // Override fetch for this specific call
  const response = await sendMessage(config, {
    fetch: debugFetch
  });
  
  console.log(response.content);
}

// Example 4: Setting fetch in service config
async function exampleWithConfigFetch() {
  // Custom fetch with retry logic
  const retryFetch: FetchFunction = async (input, init) => {
    const maxRetries = 3;
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries}`);
        const response = await fetch(input, init);
        
        if (response.ok) {
          return response;
        }
        
        // If it's a 5xx error, retry
        if (response.status >= 500 && attempt < maxRetries) {
          console.log(`Server error ${response.status}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        
        return response;
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries) {
          console.log(`Network error, retrying in ${1000 * attempt}ms...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    throw lastError!;
  };
  
  const config: OpenAIConfig = {
    service: "openai",
    apiKey: "your-api-key",
    model: "gpt-3.5-turbo", 
    messages: [
      { role: "user", content: "Hello!" }
    ],
    fetch: retryFetch // Set in config
  };
  
  const response = await sendMessage(config);
  console.log(response.content);
}

// Example 5: Using with streaming
async function exampleStreamingWithCustomFetch() {
  const rateLimitFetch: FetchFunction = async (input, init) => {
    // Simple rate limiting example
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('Rate-limited fetch executing...');
    return fetch(input, init);
  };
  
  const config: ServiceConfig = {
    service: "openai",
    apiKey: "your-api-key",
    model: "gpt-3.5-turbo",
    messages: [
      { role: "user", content: "Tell me a story" }
    ]
  };
  
  const streamResponse = await streamMessage(config, {
    fetch: rateLimitFetch
  });
  
  for await (const chunk of streamResponse.chunks) {
    if (chunk.type === "content") {
              console.log(chunk.content || '');
    }
  }
}

// Example 6: Mock fetch for testing
function createMockFetch(mockResponse: any): FetchFunction {
  return async (input, init) => {
    console.log(`Mock fetch called with: ${input}`);
    
    return new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };
}

async function exampleWithMockFetch() {
  const mockResponse = {
    choices: [{
      message: {
        content: "This is a mocked response!"
      }
    }],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 5,
      total_tokens: 15
    },
    model: "gpt-3.5-turbo"
  };
  
  const mockFetch = createMockFetch(mockResponse);
  
  const config: OpenAIConfig = {
    service: "openai",
    apiKey: "mock-key",
    model: "gpt-3.5-turbo",
    messages: [
      { role: "user", content: "Hello!" }
    ]
  };
  
  const response = await sendMessage(config, {
    fetch: mockFetch
  });
  
  console.log('Mocked response:', response.content);
}

// Example 7: Fetch priority order demonstration
async function demonstrateFetchPriority() {
  // 1. Set global default
  setDefaultFetch(async (input, init) => {
    console.log('🌍 Global fetch called');
    return fetch(input, init);
  });
  
  // 2. Config-level fetch
  const configFetch: FetchFunction = async (input, init) => {
    console.log('⚙️ Config fetch called');
    return fetch(input, init);
  };
  
  // 3. Call-level fetch (highest priority)
  const callFetch: FetchFunction = async (input, init) => {
    console.log('📞 Call fetch called');
    return fetch(input, init);
  };
  
  const config: OpenAIConfig = {
    service: "openai",
    apiKey: "your-api-key",
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: "Test priority" }],
    fetch: configFetch
  };
  
  console.log('\n--- Test 1: Using call-level fetch (highest priority) ---');
  await sendMessage(config, { fetch: callFetch });
  
  console.log('\n--- Test 2: Using config-level fetch ---');
  await sendMessage(config);
  
  console.log('\n--- Test 3: Using global fetch ---');
  delete (config as any).fetch;
  await sendMessage(config);
}

// ===== BROWSER USAGE EXAMPLES =====

/**
 * Example: Browser usage with Anthropic (requires browser-specific header)
 */
export async function browserAnthropicExample() {
  const response = await sendMessage(
    {
      service: "anthropic",
      apiKey: "your-anthropic-api-key",
      model: "claude-3-sonnet-20240229",
      messages: [{ role: "user", content: "Hello from the browser!" }],
      isBrowser: true, // Adds anthropic-dangerous-direct-browser-access header
    }
  );
  
  console.log("Browser response:", response.content);
  return response;
}

/**
 * Example: Browser usage with other providers (with CORS warnings)
 */
export async function browserWarningExample() {
  // This will show a warning about CORS restrictions
  const response = await sendMessage(
    {
      service: "openai",
      apiKey: "your-openai-api-key", 
      model: "gpt-4",
      messages: [{ role: "user", content: "This may not work in browsers" }],
      isBrowser: true, // Shows CORS warning
    }
  );
  
  return response;
}

/**
 * Example: Ask a question directly from browser
 */
export async function browserQuestionExample() {
  const response = await askQuestion(
    {
      service: "anthropic",
      apiKey: "your-anthropic-api-key",
      model: "claude-3-sonnet-20240229",
    },
    "What are the benefits of using TypeScript?",
    {
      isBrowser: true, // Enable browser-specific handling
      systemPrompt: "Be concise and practical",
    }
  );
  
  console.log("Browser answer:", response.content);
  return response;
}

/**
 * Example: Streaming in browser (with proper headers)
 */
export async function browserStreamingExample() {
  const stream = await streamMessage(
    {
      service: "anthropic",
      apiKey: "your-anthropic-api-key",
      model: "claude-3-sonnet-20240229",
      messages: [{ role: "user", content: "Tell me a story" }],
      isBrowser: true,
    }
  );
  
  // Process streaming chunks
  for await (const chunk of stream.chunks) {
    if (chunk.type === "content") {
      console.log(chunk.content);
    }
  }
  
  return stream;
}

// ===== TOOL CALL CHAIN EXAMPLE =====

/**
 * Executes a tool call and returns a mock result.
 * In a real application, this would call your actual tools.
 * @param toolCall - The tool call to execute
 * @returns A mock result for the tool
 */
async function executeMockTool(toolCall: { name: string; input: any }): Promise<string> {
  console.log(`Executing tool: ${toolCall.name} with input:`, toolCall.input);
  switch (toolCall.name) {
    case 'get_weather':
      return `The weather in ${toolCall.input.location} is 72°F and sunny.`;
    case 'get_stock_price':
      return `The stock price of ${toolCall.input.symbol} is $${(Math.random() * 1000).toFixed(2)}.`;
    default:
      return `Unknown tool: ${toolCall.name}`;
  }
}

/**
 * Example: Complete tool call chain with multiple rounds
 */
export async function toolCallChainExample() {
  const config: ServiceConfig = {
    service: 'openai',
    apiKey: 'your-openai-api-key',
    model: 'gpt-4',
    messages: [
      {
        role: 'user',
        content: "What's the weather in San Francisco and what's the stock price of GOOG?",
      },
    ],
    tools: [
      {
        name: 'get_weather',
        description: 'Get the current weather in a given location',
        parameters: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'The city and state, e.g. San Francisco, CA',
            },
          },
          required: ['location'],
        },
      },
      {
        name: 'get_stock_price',
        description: 'Get the current stock price for a given symbol',
        parameters: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'The stock symbol, e.g. GOOG',
            },
          },
          required: ['symbol'],
        },
      },
    ],
  };

  let round = 1;
  const maxRounds = 5;

  while (round <= maxRounds) {
    console.log(`--- Round ${round} ---`);
    const response = await sendMessage(config);

    if (response.toolCalls && response.toolCalls.length > 0) {
      // IMPORTANT: Update history with the assistant's message, including tool calls
      config.messages = response.messages;

      for (const toolCall of response.toolCalls) {
        const result = await executeMockTool(toolCall);
        config.messages.push({
          role: 'tool_result',
          content: result,
          tool_call_id: toolCall.id,
          name: toolCall.name, // Required for Google provider
        });
      }
    } else {
      console.log('Final Response:', response.content);
      break;
    }

    round++;
  }
}


// Export all examples
export {
  setupGlobalFetch,
  exampleWithGlobalFetch,
  exampleWithPerCallFetch,
  exampleWithConfigFetch,
  exampleStreamingWithCustomFetch,
  createMockFetch,
  exampleWithMockFetch,
  demonstrateFetchPriority,
};

// Example usage demonstration
async function runExamples() {
  console.log('=== Fetch Dependency Injection Examples ===\n');
  
  try {
    // Set up global fetch
    setupGlobalFetch();
    
    // Show current global fetch
    console.log('Current global fetch:', getDefaultFetch().name || 'anonymous');
    
    // Run various examples
    await exampleWithMockFetch();
    await demonstrateFetchPriority();
    
  } catch (error) {
    console.error('Example error:', error);
  }
}

// Uncomment to run examples
// runExamples(); 