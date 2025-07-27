# Complete Tool Call Chain Management

You've identified a critical gap! The current examples only show **single tool calls**, but real-world agents need **multi-round tool calling** with proper conversation history management.

## 🚨 The Missing Piece: Tool Call Chains

### What Actually Happens in Real Agent Usage:

```
1. User asks complex question
2. LLM responds with tool calls
3. You execute tools → get results
4. You add results to conversation history
5. LLM may make MORE tool calls based on results
6. Repeat until LLM provides final answer
```

### ❌ Current Examples Only Show Step 1-2:

```typescript
// Current examples stop here - no chain management!
const response = await sendMessage(config);

if (isToolCallResponse(response)) {
  console.log("Tool calls:", response.toolCalls);
  // 🚨 MISSING: How to continue the conversation!
}
```

## ✅ Complete Tool Call Chain Implementation

### Core Pattern: Loop Until Final Answer

```typescript
async function completeToolCallChain(initialConfig: ServiceConfig) {
  let config = { ...initialConfig };
  let roundNumber = 1;
  const maxRounds = 5; // Prevent infinite loops

  while (roundNumber <= maxRounds) {
    console.log(`--- ROUND ${roundNumber} ---`);

    const response = await sendMessage(config);

    if (hasToolCalls(response) && response.toolCalls) {
      // 🔑 CRITICAL: Update conversation with LLM's response
      config.messages = response.messages;

      // Execute all tool calls
      for (const toolCall of response.toolCalls) {
        const result = await executeRealTool(toolCall);

        // 🔑 CRITICAL: Add tool results to conversation
        config.messages.push({
          role: "tool_result",
          content: `${toolCall.name}: ${result}`,
          tool_call_id: toolCall.id, // Required for most providers
          name: toolCall.name, // Required for Google provider
        });
      }

      roundNumber++; // Continue to next round
    } else {
      // ✅ Final answer received - chain complete!
      console.log("Final answer:", response.content);
      return response.messages; // Return complete conversation
    }
  }
}
```

## 📋 Real-World Example: Research Assistant

### Scenario: "Analyze renewable energy market trends"

```typescript
// Initial request
const config = {
  service: "openai",
  apiKey: "your-key",
  messages: [
    { role: "system", content: "Research assistant with web search tools" },
    {
      role: "user",
      content:
        "Give me a comprehensive analysis of renewable energy market trends",
    },
  ],
  tools: [
    { name: "search_web" /* ... */ },
    { name: "analyze_data" /* ... */ },
    { name: "generate_summary" /* ... */ },
  ],
};

// The conversation will look like this:
```

### Round 1: Initial Tool Calls

```
LLM: "I need to search for recent renewable energy data"
Tools called:
- search_web("renewable energy market 2024")
- search_web("solar wind adoption statistics")

Messages after Round 1:
1. [system]: Research assistant...
2. [user]: Give me comprehensive analysis...
3. [assistant]: I need to search... [TOOL_CALLS]
4. [tool_result]: search_web: Found 15 articles about renewable energy...
5. [tool_result]: search_web: Solar capacity increased 25% in 2024...
```

### Round 2: Analysis Tool Calls

```
LLM: "Now I need to analyze this data for trends"
Tools called:
- analyze_data(previous_results, focus: "growth trends")
- analyze_data(previous_results, focus: "regional differences")

Messages after Round 2:
6. [assistant]: Now analyzing the data... [TOOL_CALLS]
7. [tool_result]: analyze_data: Growth trend shows 15% global increase...
8. [tool_result]: analyze_data: Asia leads with 40% of new capacity...
```

### Round 3: Final Summary

```
LLM: "Let me create a comprehensive summary"
Tools called:
- generate_summary(all_sources, topic: "renewable energy trends")

Messages after Round 3:
9. [assistant]: Creating final summary... [TOOL_CALLS]
10. [tool_result]: generate_summary: Renewable energy sector showing strong growth...
```

### Round 4: Final Answer (No More Tools)

```
LLM: "Based on my research, here's the comprehensive analysis..."
✅ FINAL TEXT RESPONSE - Chain Complete!

Final message count: 11 messages
Total rounds: 4
```

## 🌊 Streaming Tool Call Chains

```typescript
async function streamingToolChain(config: ServiceConfig) {
  let roundNumber = 1;

  while (roundNumber <= 5) {
    const stream = await streamMessage(config);
    const pendingToolCalls: ToolCall[] = [];

    for await (const chunk of stream.chunks) {
      switch (chunk.type) {
        case "content":
          process.stdout.write(chunk.content); // Real-time text
          break;

        case "tool_call":
          // Collect tool calls as they stream in
          if (chunk.toolCall?.name && chunk.toolCall?.input) {
            pendingToolCalls.push(chunk.toolCall as ToolCall);
          }
          break;

        case "complete":
          if (pendingToolCalls.length > 0) {
            // Update conversation history
            config.messages = chunk.finalResponse!.messages;

            // Execute all pending tools
            for (const toolCall of pendingToolCalls) {
              const result = await executeRealTool(toolCall);
              config.messages.push({
                role: "tool_result",
                content: result,
                tool_call_id: toolCall.id,
                name: toolCall.name, // Required for Google provider
              });
            }

            roundNumber++; // Continue chain
            break;
          } else {
            return; // No tools = final answer
          }
      }
    }
  }
}
```

## 🛡️ Error Handling in Tool Chains

```typescript
async function robustToolChain(config: ServiceConfig) {
  let roundNumber = 1;

  while (roundNumber <= 5) {
    try {
      const response = await sendMessage(config);

      if (hasToolCalls(response)) {
        config.messages = response.messages;

        // Execute tools with error handling
        for (const toolCall of response.toolCalls!) {
          try {
            const result = await executeRealTool(toolCall);

            // ✅ Success
            config.messages.push({
              role: "tool_result",
              content: `SUCCESS: ${result}`,
              tool_call_id: toolCall.id,
              name: toolCall.name, // Required for Google provider
            });
          } catch (error) {
            // ❌ Failure - inform LLM so it can try alternatives
            config.messages.push({
              role: "tool_result",
              content: `ERROR: ${toolCall.name} failed - ${error.message}. Try alternative approach.`,
              tool_call_id: toolCall.id,
              name: toolCall.name, // Required for Google provider
            });
          }
        }

        roundNumber++;
      } else {
        // Final answer
        return response.content;
      }
    } catch (error) {
      console.error(`Round ${roundNumber} failed:`, error);
      break;
    }
  }
}
```

## 🔑 Key Principles for Tool Call Chains

### 1. **Always Update Conversation History**

```typescript
// ✅ CORRECT: Update with complete response
config.messages = response.messages;

// ❌ WRONG: Manually building message arrays
config.messages.push({ role: "assistant", content: response.content });
```

### 2. **Add Tool Results to History**

```typescript
// ✅ CORRECT: Add results so LLM can see them
config.messages.push({
  role: "tool_result",
  content: toolResult,
  tool_call_id: toolCall.id, // Required for most providers
  name: toolCall.name, // Required for Google provider
});
```

### 3. **Loop Until No More Tool Calls**

```typescript
// ✅ PATTERN: Keep going until final answer
while (hasToolCalls(response)) {
  // Execute tools, update history, continue
}
// Now response.content has the final answer
```

### 4. **Handle Multiple Tool Calls Per Round**

```typescript
// LLM might call multiple tools simultaneously
for (const toolCall of response.toolCalls) {
  const result = await executeRealTool(toolCall);
  config.messages.push({ role: "tool_result", content: result });
}
```

### 5. **Prevent Infinite Loops**

```typescript
const maxRounds = 5; // Safety limit
let roundNumber = 1;

while (roundNumber <= maxRounds && hasToolCalls(response)) {
  // ... execute tools ...
  roundNumber++;
}
```

## 🎯 Benefits of Proper Chain Management

1. **Real Agent Behavior**: LLM can reason → research → analyze → conclude
2. **Complex Problem Solving**: Multi-step research and analysis
3. **Tool Coordination**: Results from one tool inform the next
4. **Complete Context**: Full conversation history preserved
5. **Error Recovery**: LLM can try alternatives when tools fail

## 📦 Practical Implementation

```typescript
import { sendMessage, hasToolCalls, type ServiceConfig } from "llm-adapter";

// Helper function for any tool chain scenario
export async function runCompleteToolChain(
  config: ServiceConfig,
  maxRounds: number = 5
): Promise<{
  finalAnswer: string;
  conversation: Message[];
  totalRounds: number;
  tokensUsed: number;
}> {
  let currentConfig = { ...config };
  let roundNumber = 1;

  while (roundNumber <= maxRounds) {
    const response = await sendMessage(currentConfig);

    if (hasToolCalls(response) && response.toolCalls) {
      // Update conversation
      currentConfig.messages = response.messages;

      // Execute all tools
      for (const toolCall of response.toolCalls) {
        const result = await yourToolExecutor(toolCall);
        currentConfig.messages.push({
          role: "tool_result",
          content: result,
          tool_call_id: toolCall.id,
          name: toolCall.name, // Required for Google provider
        });
      }

      roundNumber++;
    } else {
      // Final answer received
      return {
        finalAnswer: response.content,
        conversation: response.messages,
        totalRounds: roundNumber,
        tokensUsed: response.usage.total_tokens,
      };
    }
  }

  throw new Error(`Tool chain exceeded ${maxRounds} rounds`);
}

// Usage
const result = await runCompleteToolChain({
  service: "openai",
  apiKey: "your-key",
  messages: [
    {
      role: "user",
      content: "Complex research question requiring multiple tools",
    },
  ],
  tools: yourTools,
});

console.log("Final answer:", result.finalAnswer);
console.log("Took", result.totalRounds, "rounds");
```

This is the **complete picture** that was missing from the current examples! Tool call chains are essential for real-world agent applications.
