import { describe, it, expect } from 'vitest';
import { 
  sanitizeToolDefinition, 
  sanitizeTools, 
  sanitizeJsonSchema, 
  sanitizeToolForProvider, 
  validateToolResultMessage,
  validateOpenAIConversationFlow
} from '../../src/utils/validation.js';

describe('Tool Call Sanitization', () => {
  it('should sanitize tool definition by keeping only standard fields', () => {
    const toolWithExtraFields = {
      name: 'test_tool',
      description: 'A test tool',
      parameters: { type: 'object', properties: {} },
      // Non-standard fields that should be removed
      custom_field: 'should be removed',
      extra_metadata: { foo: 'bar' },
      version: '1.0.0',
    };

    const sanitized = sanitizeToolDefinition(toolWithExtraFields);

    expect(sanitized).toEqual({
      name: 'test_tool',
      description: 'A test tool',
      parameters: { type: 'object', properties: {} },
    });

    // Ensure extra fields are not present
    expect(sanitized).not.toHaveProperty('custom_field');
    expect(sanitized).not.toHaveProperty('extra_metadata');
    expect(sanitized).not.toHaveProperty('version');
  });

  it('should sanitize array of tools', () => {
    const toolsWithExtraFields = [
      {
        name: 'tool1',
        description: 'First tool',
        parameters: { type: 'object' },
        extra_field: 'remove me',
      },
      {
        name: 'tool2',
        description: 'Second tool',
        parameters: { type: 'object' },
        custom_property: 'also remove me',
      },
    ];

    const sanitized = sanitizeTools(toolsWithExtraFields);

    expect(sanitized).toHaveLength(2);
    expect(sanitized[0]).toEqual({
      name: 'tool1',
      description: 'First tool',
      parameters: { type: 'object' },
    });
    expect(sanitized[1]).toEqual({
      name: 'tool2',
      description: 'Second tool',
      parameters: { type: 'object' },
    });

    // Ensure no extra fields
    expect(sanitized[0]).not.toHaveProperty('extra_field');
    expect(sanitized[1]).not.toHaveProperty('custom_property');
  });

  describe('Provider-specific tool sanitization', () => {
    it('should remove additionalProperties and $schema for Google provider', () => {
      const toolWithGoogleUnsupportedFields = {
        name: 'google_tool',
        description: 'A tool for Google',
        parameters: {
          type: 'object',
          properties: {
            param1: { type: 'string' },
            param2: { 
              type: 'object',
              properties: { nested: { type: 'string' } },
              additionalProperties: false // Should be removed for Google
            }
          },
          additionalProperties: true, // Should be removed for Google
          $schema: 'http://json-schema.org/draft-07/schema#', // Should be removed for Google
          required: ['param1']
        }
      };

      const sanitized = sanitizeToolForProvider(toolWithGoogleUnsupportedFields, 'google');

      expect(sanitized.parameters).not.toHaveProperty('additionalProperties');
      expect(sanitized.parameters).not.toHaveProperty('$schema');
      expect(sanitized.parameters.properties.param2).not.toHaveProperty('additionalProperties');
      
      // Should keep supported fields
      expect(sanitized.parameters).toHaveProperty('required');
      expect(sanitized.parameters.properties.param1).toHaveProperty('type');
    });

    it('should keep all fields for non-Google providers', () => {
      const toolWithAllFields = {
        name: 'openai_tool',
        description: 'A tool for OpenAI',
        parameters: {
          type: 'object',
          properties: {
            param1: { type: 'string' }
          },
          additionalProperties: true,
          $schema: 'http://json-schema.org/draft-07/schema#',
          required: ['param1']
        }
      };

      const sanitized = sanitizeToolForProvider(toolWithAllFields, 'openai');

      expect(sanitized.parameters).toHaveProperty('additionalProperties');
      expect(sanitized.parameters).toHaveProperty('$schema');
      expect(sanitized.parameters).toHaveProperty('required');
    });

    it('should recursively sanitize nested schema properties', () => {
      const complexTool = {
        name: 'complex_tool',
        description: 'A complex tool',
        parameters: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  nested: { type: 'string' }
                },
                additionalProperties: false
              }
            }
          },
          additionalProperties: true,
          $schema: 'http://json-schema.org/draft-07/schema#'
        }
      };

      const sanitized = sanitizeToolForProvider(complexTool, 'google');

      expect(sanitized.parameters).not.toHaveProperty('additionalProperties');
      expect(sanitized.parameters).not.toHaveProperty('$schema');
      expect(sanitized.parameters.properties.items.items).not.toHaveProperty('additionalProperties');
    });
  });

  describe('Tool result message validation', () => {
    it('should pass validation for valid tool result message', () => {
      const validMessage = {
        role: 'tool_result',
        tool_call_id: 'call_123',
        content: 'Tool execution result'
      };

      expect(() => validateToolResultMessage(validMessage)).not.toThrow();
    });

    it('should throw error for tool result message without tool_call_id', () => {
      const invalidMessage = {
        role: 'tool_result',
        content: 'Tool execution result'
      };

      expect(() => validateToolResultMessage(invalidMessage)).toThrow(
        'Tool result message must have a tool_call_id field to match with the corresponding tool call'
      );
    });

    it('should throw error for tool result message without content', () => {
      const invalidMessage = {
        role: 'tool_result',
        tool_call_id: 'call_123'
      };

      expect(() => validateToolResultMessage(invalidMessage)).toThrow(
        'Tool result message must have content'
      );
    });

    it('should not validate non-tool-result messages', () => {
      const userMessage = {
        role: 'user',
        content: 'Hello'
      };

      expect(() => validateToolResultMessage(userMessage)).not.toThrow();
    });
  });

  describe('OpenAI conversation flow validation', () => {
    it('should pass validation for proper tool call flow', () => {
      const validMessages = [
        { role: 'user', content: 'Call a tool' },
        { 
          role: 'assistant', 
          tool_calls: [{ id: 'call_1', name: 'test_tool', input: {} }]
        },
        { 
          role: 'tool_result', 
          tool_call_id: 'call_1', 
          content: 'Tool result' 
        },
        { role: 'assistant', content: 'Final response' }
      ];

      expect(() => validateOpenAIConversationFlow(validMessages, 'OpenAI')).not.toThrow();
    });

    it('should pass validation for multiple tool calls and results', () => {
      const validMessages = [
        { role: 'user', content: 'Call multiple tools' },
        { 
          role: 'assistant', 
          tool_calls: [
            { id: 'call_1', name: 'tool1', input: {} },
            { id: 'call_2', name: 'tool2', input: {} }
          ]
        },
        { 
          role: 'tool_result', 
          tool_call_id: 'call_1', 
          content: 'Tool 1 result' 
        },
        { 
          role: 'tool_result', 
          tool_call_id: 'call_2', 
          content: 'Tool 2 result' 
        },
        { role: 'assistant', content: 'Final response' }
      ];

      expect(() => validateOpenAIConversationFlow(validMessages, 'OpenAI')).not.toThrow();
    });

    it('should throw error for tool result without preceding tool calls', () => {
      const invalidMessages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
        { 
          role: 'tool_result', 
          tool_call_id: 'call_1', 
          content: 'Tool result' 
        }
      ];

      expect(() => validateOpenAIConversationFlow(invalidMessages, 'OpenAI')).toThrow(
        'OpenAI API requires tool result messages to follow assistant messages with tool_calls. Found tool result at position 2 without preceding tool calls.'
      );
    });

    it('should throw error for tool result with mismatched tool_call_id', () => {
      const invalidMessages = [
        { role: 'user', content: 'Call a tool' },
        { 
          role: 'assistant', 
          tool_calls: [{ id: 'call_1', name: 'test_tool', input: {} }]
        },
        { 
          role: 'tool_result', 
          tool_call_id: 'call_2', // Wrong ID
          content: 'Tool result' 
        }
      ];

      expect(() => validateOpenAIConversationFlow(invalidMessages, 'OpenAI')).toThrow(
        'OpenAI API: tool result at position 2 has tool_call_id "call_2" which doesn\'t match any tool call ID from the preceding assistant message. Available IDs: call_1'
      );
    });

    it('should allow user messages between tool calls and results', () => {
      const validMessages = [
        { role: 'user', content: 'Call a tool' },
        { 
          role: 'assistant', 
          tool_calls: [{ id: 'call_1', name: 'test_tool', input: {} }]
        },
        { role: 'user', content: 'Some user message' }, // This should be allowed
        { 
          role: 'tool_result', 
          tool_call_id: 'call_1', 
          content: 'Tool result' 
        }
      ];

      expect(() => validateOpenAIConversationFlow(validMessages, 'OpenAI')).not.toThrow();
    });

    it('should reset tool call tracking after non-tool messages', () => {
      const validMessages = [
        { role: 'user', content: 'First interaction' },
        { 
          role: 'assistant', 
          tool_calls: [{ id: 'call_1', name: 'test_tool', input: {} }]
        },
        { 
          role: 'tool_result', 
          tool_call_id: 'call_1', 
          content: 'Tool result' 
        },
        { role: 'assistant', content: 'Response after tool use' },
        { role: 'user', content: 'Another question' },
        { role: 'assistant', content: 'Regular response' }
      ];

      expect(() => validateOpenAIConversationFlow(validMessages, 'OpenAI')).not.toThrow();
    });

    it('should handle sequential tool call sessions correctly', () => {
      const validMessages = [
        { role: 'user', content: 'First tool request' },
        { 
          role: 'assistant', 
          tool_calls: [{ id: 'call_1', name: 'tool1', input: {} }]
        },
        { 
          role: 'tool_result', 
          tool_call_id: 'call_1', 
          content: 'First tool result' 
        },
        { role: 'assistant', content: 'First response' },
        { role: 'user', content: 'Second tool request' },
        { 
          role: 'assistant', 
          tool_calls: [{ id: 'call_2', name: 'tool2', input: {} }]
        },
        { 
          role: 'tool_result', 
          tool_call_id: 'call_2', 
          content: 'Second tool result' 
        },
        { role: 'assistant', content: 'Final response' }
      ];

      expect(() => validateOpenAIConversationFlow(validMessages, 'OpenAI')).not.toThrow();
    });
  });

  describe('JSON Schema sanitization', () => {
    it('should handle null and non-object schemas', () => {
      expect(sanitizeJsonSchema(null, 'google')).toBe(null);
      expect(sanitizeJsonSchema('string', 'google')).toBe('string');
      expect(sanitizeJsonSchema(123, 'google')).toBe(123);
    });

    it('should preserve schema structure while removing unsupported fields', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        },
        required: ['name'],
        additionalProperties: false,
        $schema: 'http://json-schema.org/draft-07/schema#'
      };

      const sanitized = sanitizeJsonSchema(schema, 'google');

      expect(sanitized.type).toBe('object');
      expect(sanitized.properties).toEqual(schema.properties);
      expect(sanitized.required).toEqual(['name']);
      expect(sanitized).not.toHaveProperty('additionalProperties');
      expect(sanitized).not.toHaveProperty('$schema');
    });
  });
}); 