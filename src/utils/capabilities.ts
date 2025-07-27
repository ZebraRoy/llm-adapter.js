import type { ServiceName } from '../types/index.js';

// ===== SERVICE CAPABILITY CHECKS =====

/**
 * Check if a service uses OpenAI-compatible API format
 * @param service - The service name to check
 * @returns True if the service uses OpenAI-compatible format
 */
export function isOpenAICompatible(service: ServiceName): boolean {
  return ["openai", "groq", "deepseek", "xai"].includes(service);
}

/**
 * Check if a service requires an API key for authentication
 * @param service - The service name to check
 * @returns True if the service requires an API key
 */
export function requiresApiKey(service: ServiceName): boolean {
  return service !== "ollama";
}

/**
 * Check if a service uses Bearer token authentication
 * @param service - The service name to check
 * @returns True if the service uses Bearer auth
 */
export function supportsBearerAuth(service: ServiceName): boolean {
  return isOpenAICompatible(service);
} 