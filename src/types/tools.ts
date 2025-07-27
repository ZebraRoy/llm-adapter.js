// ===== TOOL DEFINITIONS =====

/**
 * JSON Schema property definition for function parameters
 * Defines the structure and validation rules for tool parameters
 */
export interface JSONSchemaProperty {
  /** The data type of the property */
  type: "string" | "number" | "boolean" | "array" | "object";
  /** Human-readable description of what this property represents */
  description?: string;
  /** Allowed values for string/number types */
  enum?: (string | number)[];
  /** For array types, defines the structure of array items */
  items?: JSONSchemaProperty;
  /** For object types, defines nested properties */
  properties?: Record<string, JSONSchemaProperty>;
  /** List of required property names for object types */
  required?: string[];
}

/**
 * JSON Schema definition for function parameters
 * Used to validate and describe tool function parameters
 */
export interface JSONSchema {
  /** Must be "object" for function parameters */
  type: "object";
  /** Object properties and their definitions */
  properties: Record<string, JSONSchemaProperty>;
  /** Names of required properties */
  required?: string[];
  /** Whether additional properties beyond those defined are allowed */
  additionalProperties?: boolean;
}

/**
 * Definition of a tool/function that can be called by the LLM
 */
export interface Tool {
  /** Unique name for the tool */
  name: string;
  /** Description of what the tool does */
  description: string;
  /** JSON Schema defining the expected parameters */
  parameters: JSONSchema;
}

/**
 * A tool call made by the LLM
 * Contains the tool name and arguments to execute
 */
export interface ToolCall {
  /** Unique identifier for this tool call */
  id: string;
  /** Name of the tool being called */
  name: string;
  /** Arguments/parameters passed to the tool */
  input: Record<string, unknown>;
} 