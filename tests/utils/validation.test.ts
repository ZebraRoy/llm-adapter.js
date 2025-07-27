import { describe, it, expect } from 'vitest';
import { sanitizeToolDefinition, sanitizeTools } from '../../src/utils/validation.js';

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

  it('should handle tools with undefined optional fields gracefully', () => {
    const toolWithUndefinedFields = {
      name: 'test_tool',
      description: undefined,
      parameters: { type: 'object' },
    };

    const sanitized = sanitizeToolDefinition(toolWithUndefinedFields);

    expect(sanitized).toEqual({
      name: 'test_tool',
      description: undefined,
      parameters: { type: 'object' },
    });
  });
}); 