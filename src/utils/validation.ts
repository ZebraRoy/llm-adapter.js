import type { ServiceConfig, LLMConfig } from '../types/index.js';
import { requiresApiKey } from './capabilities.js';

// ===== CONFIGURATION VALIDATION =====

/**
 * Validate a service-specific configuration
 * @param config - The service configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateServiceConfig(config: ServiceConfig): void {
  if (!config.service) {
    throw new Error("Service name is required");
  }
  
  if (requiresApiKey(config.service) && !config.apiKey) {
    throw new Error(`API key is required for ${config.service}`);
  }
  
  if (!config.model) {
    throw new Error("Model is required");
  }
  
  if (config.messages && config.messages.length === 0) {
    throw new Error("At least one message is required");
  }
}

/**
 * Validate a general LLM configuration
 * @param config - The LLM configuration to validate  
 * @throws Error if configuration is invalid
 */
export function validateLLMConfig(config: LLMConfig): void {
  if (!config.service) {
    throw new Error("Service name is required");
  }
  
  if (requiresApiKey(config.service) && !config.apiKey) {
    throw new Error(`API key is required for ${config.service}`);
  }
  
  if (!config.model) {
    throw new Error("Model is required");
  }
  
  if (config.messages && config.messages.length === 0) {
    throw new Error("At least one message is required");
  }
} 

/**
 * Sanitize tool definition to remove non-standard fields
 * Ensures only standard fields are sent to providers
 * @param tool - Tool definition to sanitize
 * @returns Sanitized tool definition
 */
export function sanitizeToolDefinition(tool: any): any {
  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  };
}

/**
 * Sanitize JSON schema for provider-specific requirements
 * @param schema - JSON schema to sanitize
 * @param provider - Target provider name
 * @returns Sanitized schema
 */
export function sanitizeJsonSchema(schema: any, provider?: string): any {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  const sanitized = { ...schema };

  // Remove unsupported fields for specific providers
  if (provider === 'google') {
    // Google Gemini doesn't support these JSON Schema fields
    delete sanitized.additionalProperties;
    delete sanitized.$schema;
  }

  // Recursively sanitize nested properties
  if (sanitized.properties) {
    const sanitizedProperties: Record<string, any> = {};
    for (const [key, value] of Object.entries(sanitized.properties)) {
      sanitizedProperties[key] = sanitizeJsonSchema(value, provider);
    }
    sanitized.properties = sanitizedProperties;
  }

  // Sanitize array items
  if (sanitized.items) {
    sanitized.items = sanitizeJsonSchema(sanitized.items, provider);
  }

  return sanitized;
}

/**
 * Sanitize tool definition for provider-specific requirements
 * @param tool - Tool definition to sanitize
 * @param provider - Target provider name
 * @returns Sanitized tool definition
 */
export function sanitizeToolForProvider(tool: any, provider?: string): any {
  const sanitized = {
    name: tool.name,
    description: tool.description,
    parameters: sanitizeJsonSchema(tool.parameters, provider),
  };

  return sanitized;
}

/**
 * Sanitize tools array for API requests
 * @param tools - Array of tool definitions
 * @param provider - Target provider name (optional)
 * @returns Sanitized tools array
 */
export function sanitizeTools(tools: any[], provider?: string): any[] {
  return tools.map(tool => sanitizeToolForProvider(tool, provider));
}

/**
 * Validate tool result message has required fields
 * @param message - Message to validate
 * @throws Error if message is invalid
 */
export function validateToolResultMessage(message: any): void {
  if (message.role === "tool_result") {
    if (!message.tool_call_id) {
      throw new Error("Tool result message must have a tool_call_id field to match with the corresponding tool call");
    }
    if (!message.content) {
      throw new Error("Tool result message must have content");
    }
  }
}

/**
 * Validate conversation flow for OpenAI-compatible providers
 * Ensures tool result messages properly follow assistant messages with tool calls
 * @param messages - Array of messages to validate
 * @param providerName - Name of the provider for error messages
 * @throws Error if conversation flow is invalid
 */
export function validateOpenAIConversationFlow(messages: any[], providerName: string): void {
  const toolCallMap = new Set<string>();
  
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    
    // Track tool calls from assistant messages
    if (message.role === "assistant" && message.tool_calls) {
      // Clear previous tool call IDs and add new ones
      toolCallMap.clear();
      message.tool_calls.forEach((tc: any) => {
        toolCallMap.add(tc.id);
      });
    }
    // Validate tool result messages
    else if (message.role === "tool_result") {
      // Check if this tool result follows a message with tool calls
      if (toolCallMap.size === 0) {
        throw new Error(
          `${providerName} API requires tool result messages to follow assistant messages with tool_calls. ` +
          `Found tool result at position ${i} without preceding tool calls.`
        );
      }
      
      // Check if the tool_call_id exists in the preceding tool calls
      if (!toolCallMap.has(message.tool_call_id)) {
        throw new Error(
          `${providerName} API: tool result at position ${i} has tool_call_id "${message.tool_call_id}" ` +
          `which doesn't match any tool call ID from the preceding assistant message. ` +
          `Available IDs: ${Array.from(toolCallMap).join(', ')}`
        );
      }
      
      // Remove the matched tool call ID
      toolCallMap.delete(message.tool_call_id);
    }
    // Reset tool call tracking for non-tool messages (except user messages immediately after tool calls)
    else if (message.role !== "user" || toolCallMap.size === 0) {
      toolCallMap.clear();
    }
  }
} 