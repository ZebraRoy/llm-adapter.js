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
      // Normalize CRLF and split by LF
      buffer = buffer.replace(/\r\n/g, '\n');
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const rawLine of lines) {
        const line = rawLine.trimEnd();
        // Allow both 'data:' and 'data: ' prefixes per SSE spec
        if (line.startsWith('data:')) {
          const data = line.slice(5).trimStart();
          if (data === '[DONE]') return;
          if (data) yield data;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}