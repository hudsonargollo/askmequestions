interface Env {
  DB: D1Database;
  OPENAI_API_KEY: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  MINIO_ENDPOINT?: string;
  MINIO_ACCESS_KEY?: string;
  MINIO_SECRET_KEY?: string;
  MINIO_BUCKET_NAME?: string;
  
  // Capitão Caverna Image Engine bindings
  IMAGE_DB: D1Database;
  IMAGE_BUCKET: R2Bucket;
  
  // External AI service configuration
  MIDJOURNEY_API_KEY?: string;
  DALLE_API_KEY?: string;
  STABLE_DIFFUSION_API_KEY?: string;
  IMAGE_GENERATION_SERVICE?: string;
}

// WebSocket types for Cloudflare Workers
declare global {
  class WebSocketPair {
    0: WebSocket;
    1: WebSocket;
  }
  
  interface WebSocket {
    accept(): void;
    send(message: string | ArrayBuffer): void;
    close(code?: number, reason?: string): void;
    addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
    addEventListener(type: 'close', listener: (event: CloseEvent) => void): void;
    addEventListener(type: 'error', listener: (event: Event) => void): void;
    readyState: number;
  }
  
  interface MessageEvent {
    data: string | ArrayBuffer;
  }
  
  interface CloseEvent {
    code: number;
    reason: string;
    wasClean: boolean;
  }
}
