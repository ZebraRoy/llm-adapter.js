// ===== STREAMING UTILITIES =====

/**
 * Parse Server-Sent Events (SSE) stream
 * Internal utility for processing streaming responses
 * @param reader - Stream reader
 * @returns Async generator of parsed data strings
 */
export async function* parseSSEStream(reader: ReadableStreamDefaultReader<Uint8Array>): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  let buffer = '';
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          if (data.trim()) yield data;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
} 