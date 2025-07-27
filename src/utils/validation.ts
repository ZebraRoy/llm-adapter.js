import type { Message, ServiceConfig, ServiceName, Tool } from '../types/index.js';

/**
 * Validation utilities for tool calling and conversation flow
 */

/**
 * Validate that a tool result message has the required fields
 * @param message - Message to validate
 * @param providerName - Optional provider name for provider-specific validation
 */
export function validateToolResultMessage(message: Message, providerName?: ServiceName): void {
  // Only validate tool result messages
  if (message.role !== 'tool_result') {
    return;
  }

  // Check for content
  if (!message.content) {
    throw new Error('Tool result message must have content');
  }

  // For providers that don't support tool_call_id, skip this validation
  if (providerName === 'ollama') {
    return; // Ollama doesn't support tools
  }

  // Google doesn't provide real tool_call_ids, so we make it optional
  if (providerName === 'google') {
    // For Google, we'll require the function name to match tool results
    if (!message.name) {
      throw new Error('Tool result message for Google provider must have a function name');
    }
    return;
  }

  // For other providers, tool_call_id is required
  if (!message.tool_call_id) {
    throw new Error('Tool result message must have a tool_call_id field to match with the corresponding tool call');
  }
}

/**
 * Validate conversation flow for OpenAI-compatible providers
 * @param messages - Array of messages to validate
 * @param providerName - Provider name for context in error messages
 */
export function validateOpenAIConversationFlow(messages: Message[], providerName: string): void {
  let lastToolCallIds = new Set<string>();
  let pendingToolCalls = false;

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];

    if (message.role === 'assistant' && message.tool_calls) {
      // Assistant is making tool calls
      lastToolCallIds.clear();
      message.tool_calls.forEach(tc => lastToolCallIds.add(tc.id));
      pendingToolCalls = true;
    } else if (message.role === 'tool_result') {
      // Tool result message
      if (!pendingToolCalls || lastToolCallIds.size === 0) {
        throw new Error(
          `${providerName} API requires tool result messages to follow assistant messages with tool_calls. ` +
          `Found tool result at position ${i} without preceding tool calls.`
        );
      }

      if (message.tool_call_id && !lastToolCallIds.has(message.tool_call_id)) {
        const availableIds = Array.from(lastToolCallIds).join(', ');
        throw new Error(
          `${providerName} API: tool result at position ${i} has tool_call_id "${message.tool_call_id}" ` +
          `which doesn't match any tool call ID from the preceding assistant message. ` +
          `Available IDs: ${availableIds}`
        );
      }

      // Remove this tool call ID from pending set
      if (message.tool_call_id) {
        lastToolCallIds.delete(message.tool_call_id);
      }

      // If all tool calls have been answered, reset pending state
      if (lastToolCallIds.size === 0) {
        pendingToolCalls = false;
      }
    } else if (message.role === 'assistant' && !message.tool_calls) {
      // Regular assistant message resets tool call tracking
      pendingToolCalls = false;
      lastToolCallIds.clear();
    }
    // User messages don't affect tool call tracking
  }
}

/**
 * Validate service configuration
 * @param config - Service configuration to validate
 */
export function validateServiceConfig(config: ServiceConfig): void {
  if (!config) {
    throw new Error('Configuration is required');
  }

  if (!config.service) {
    throw new Error('Service name is required');
  }

  if (!config.messages || !Array.isArray(config.messages)) {
    throw new Error('Messages array is required');
  }

  if (config.messages.length === 0) {
    throw new Error('At least one message is required');
  }

  // Validate message structure
  for (const message of config.messages) {
    if (!message.role) {
      throw new Error('Each message must have a role');
    }

    if (!message.content && message.role !== 'tool_result' && !message.tool_calls) {
      throw new Error('Each message must have content, tool_calls, or be a tool_result');
    }
  }
}

/**
 * Validate basic LLM configuration
 * @param config - LLM configuration to validate
 */
export function validateLLMConfig(config: any): void {
  if (!config) {
    throw new Error('Configuration is required');
  }

  if (!config.service) {
    throw new Error('Service name is required');
  }

  if (!config.messages || !Array.isArray(config.messages)) {
    throw new Error('Messages array is required');
  }

  if (config.messages.length === 0) {
    throw new Error('At least one message is required');
  }

  // Validate message structure
  for (const message of config.messages) {
    if (!message.role) {
      throw new Error('Each message must have a role');
    }

    if (!message.content && message.role !== 'tool_result' && !message.tool_calls) {
      throw new Error('Each message must have content, tool_calls, or be a tool_result');
    }
  }
}

/**
 * Sanitize tool definition by keeping only standard fields
 * @param tool - Tool definition to sanitize
 * @returns Sanitized tool definition
 */
export function sanitizeToolDefinition(tool: Tool): Tool {
  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters
  };
}

/**
 * Sanitize array of tools
 * @param tools - Array of tool definitions
 * @param providerName - Optional provider name for provider-specific sanitization
 * @returns Array of sanitized tool definitions
 */
export function sanitizeTools(tools: Tool[], providerName?: ServiceName): Tool[] {
  if (!tools || !Array.isArray(tools)) {
    return [];
  }

  return tools.map(tool => sanitizeToolForProvider(tool, providerName));
}

/**
 * Sanitize tool definition for a specific provider
 * @param tool - Tool definition to sanitize
 * @param providerName - Provider name for provider-specific rules
 * @returns Sanitized tool definition
 */
export function sanitizeToolForProvider(tool: Tool, providerName?: ServiceName): Tool {
  const sanitized = sanitizeToolDefinition(tool);

  // Apply provider-specific sanitization
  if (providerName === 'google') {
    // Google doesn't support certain JSON Schema fields
    sanitized.parameters = sanitizeJsonSchema(sanitized.parameters, 'google');
  }

  return sanitized;
}

/**
 * Recursively sanitize JSON schema for provider compatibility
 * @param schema - JSON schema object
 * @param providerName - Provider name for provider-specific rules
 * @returns Sanitized schema
 */
export function sanitizeJsonSchema(schema: any, providerName?: ServiceName): any {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return schema;
  }

  const sanitized = { ...schema };

  if (providerName === 'google') {
    // Google doesn't support these JSON Schema fields
    delete sanitized.additionalProperties;
    delete sanitized.$schema;
  }

  // Recursively sanitize nested objects
  for (const [key, value] of Object.entries(sanitized)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeJsonSchema(value, providerName);
    } else if (key === 'items' && value && typeof value === 'object') {
      sanitized[key] = sanitizeJsonSchema(value, providerName);
    }
  }

  return sanitized;
}