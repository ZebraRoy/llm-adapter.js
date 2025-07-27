import type { LLMConfig, LLMResponse, StreamingResponse, ServiceConfig } from '../types/index.js';
import { validateServiceConfig } from '../utils/index.js';
// Import provider adapters
import { 
  createOpenAIAdapter,
  createAnthropicAdapter,
  createGoogleAdapter,
  createOllamaAdapter,
  createGroqAdapter,
  createDeepSeekAdapter,
  createXAIAdapter
} from '../providers/index.js';

// ===== CLEAN ADAPTER INTERFACE =====
/**
 * Simple adapter interface - each provider implements this
 * No shared base class, no mixed concerns
 * Internal interface used by the library
 */
export interface LLMAdapter {
  /** Make a non-streaming call to the LLM */
  call(config: LLMConfig): Promise<LLMResponse>;
  /** Make a streaming call to the LLM */
  stream(config: LLMConfig): Promise<StreamingResponse>;
  /** Validate the configuration for this adapter */
  validateConfig(config: LLMConfig): boolean;
}

// ===== ADAPTER FACTORY =====
/**
 * Create an adapter for the specified service
 * Internal function that routes to provider-specific implementations
 * @param config - Service configuration
 * @returns Adapter instance for the service
 */
export function createAdapter(config: ServiceConfig): LLMAdapter {
  validateServiceConfig(config);
  
  switch (config.service) {
    case "openai":
      return createOpenAIAdapter(config);
    case "anthropic":
      return createAnthropicAdapter(config);
    case "google":
      return createGoogleAdapter(config);
    case "ollama":
      return createOllamaAdapter(config);
    case "groq":
      return createGroqAdapter(config);
    case "deepseek": 
      return createDeepSeekAdapter(config);
    case "xai":
      return createXAIAdapter(config);
    default:
      // Exhaustive check - TypeScript will catch missing cases
      const _exhaustive: never = config;
      throw new Error("Unsupported service");
  }
} 