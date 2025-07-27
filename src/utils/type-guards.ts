import type { LLMResponse } from '../types/index.js';

// ===== TYPE GUARDS & UTILITIES =====

/**
 * Check if the response contains text content
 * @param response - The LLM response to check
 * @returns True if the response has meaningful text content
 */
export function hasTextContent(response: LLMResponse): boolean {
  return response.capabilities.hasText && !!response.content;
}

/**
 * Check if the response contains reasoning/thinking content
 * @param response - The LLM response to check
 * @returns True if the response has reasoning content
 */
export function hasReasoning(response: LLMResponse): boolean {
  return response.capabilities.hasReasoning && !!response.reasoning;
}

/**
 * Check if the response contains tool calls
 * @param response - The LLM response to check
 * @returns True if the response has tool calls
 */
export function hasToolCalls(response: LLMResponse): boolean {
  return response.capabilities.hasToolCalls && !!response.toolCalls && response.toolCalls.length > 0;
}

/**
 * Check if the response is a simple text-only response
 * For backwards compatibility and clarity
 * @param response - The LLM response to check
 * @returns True if response only contains text (no reasoning or tool calls)
 */
export function isTextResponse(response: LLMResponse): boolean {
  return hasTextContent(response) && !hasReasoning(response) && !hasToolCalls(response);
}

/**
 * Check if the response contains tool calls
 * @param response - The LLM response to check
 * @returns True if the response contains tool calls
 */
export function isToolCallResponse(response: LLMResponse): boolean {
  return hasToolCalls(response);
}

/**
 * Check if the response contains reasoning content
 * @param response - The LLM response to check
 * @returns True if the response contains reasoning/thinking
 */
export function isReasoningResponse(response: LLMResponse): boolean {
  return hasReasoning(response);
}

/**
 * Check if the response contains multiple types of content
 * @param response - The LLM response to check
 * @returns True if response has more than one type of content
 */
export function isComplexResponse(response: LLMResponse): boolean {
  const capabilityCount = [
    response.capabilities.hasText,
    response.capabilities.hasReasoning, 
    response.capabilities.hasToolCalls
  ].filter(Boolean).length;
  
  return capabilityCount > 1;
}

/**
 * Get a string description of the response content types
 * @param response - The LLM response to analyze
 * @returns String describing the types of content in the response
 * @example "text", "reasoning + tool_calls", "text + reasoning + tool_calls"
 */
export function getResponseType(response: LLMResponse): string {
  const types = [];
  if (response.capabilities.hasReasoning) types.push("reasoning");
  if (response.capabilities.hasToolCalls) types.push("tool_calls");
  if (response.capabilities.hasText) types.push("text");
  
  return types.join(" + ") || "empty";
} 