import type { Message, ToolCall } from '../types/index.js';

/**
 * Normalize tool_result linking across providers by resolving missing
 * tool_call_id or name fields based on the most recent assistant tool_calls.
 * - If tool_result has only name, fill tool_call_id by matching prior tool call name
 * - If tool_result has only tool_call_id, fill name by matching prior tool call id
 * - If neither provided and there is a single prior tool call, fill both
 * - If ambiguous (multiple prior calls, no disambiguation), leave as-is
 */
export function resolveToolResultLinking(messages: Message[]): Message[] {
  let lastAssistantToolCalls: ToolCall[] | undefined;

  return messages.map((message) => {
    if (message.role === 'assistant' && message.tool_calls && message.tool_calls.length > 0) {
      lastAssistantToolCalls = message.tool_calls;
      return message;
    }

    if (message.role !== 'tool_result') {
      return message;
    }

    const result: any = { ...message };

    // If there are no prior assistant tool calls to match against, return as-is
    if (!lastAssistantToolCalls || lastAssistantToolCalls.length === 0) {
      return result;
    }

    // Try to fill tool_call_id from name
    if (!result.tool_call_id && result.name) {
      const matchByName = lastAssistantToolCalls.find(tc => tc.name === result.name);
      if (matchByName) {
        result.tool_call_id = matchByName.id;
      }
    }

    // Try to fill name from tool_call_id
    if (result.tool_call_id && !result.name) {
      const matchById = lastAssistantToolCalls.find(tc => tc.id === result.tool_call_id);
      if (matchById) {
        result.name = matchById.name;
      }
    }

    // If still missing both, but there is exactly one prior tool call, fill both
    if (!result.tool_call_id && !result.name && lastAssistantToolCalls.length === 1) {
      result.tool_call_id = lastAssistantToolCalls[0].id;
      result.name = lastAssistantToolCalls[0].name;
    }

    // If missing tool_call_id but there is only one prior tool call with this name, fill id
    if (!result.tool_call_id && result.name) {
      const withSameName = lastAssistantToolCalls.filter(tc => tc.name === result.name);
      if (withSameName.length === 1) {
        result.tool_call_id = withSameName[0].id;
      }
    }

    return result;
  });
}

