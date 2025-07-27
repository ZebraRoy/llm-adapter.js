// ===== LLM ADAPTER LIBRARY =====
// A unified interface for multiple LLM providers with consistent types and streaming support

// Re-export all types
export * from './types/index.js';

// Re-export all utilities
export * from './utils/index.js';

// Re-export core functionality (main API functions, fetch config, etc.)
export * from './core/index.js';

// Note: Provider implementations are internal and not exported directly
// Users interact through the main API functions (sendMessage, streamMessage, askQuestion, etc.)
// which automatically route to the appropriate provider based on the service configuration
