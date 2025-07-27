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