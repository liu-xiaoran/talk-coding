import type { ServerMessage } from '../shared/types.js';

type MessageHandler = (msg: ServerMessage) => void;

export class WsClient {
  private ws: WebSocket | null = null;
  private handler: MessageHandler;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  private messageQueue: Array<{ type: 'json' | 'binary'; data: string | ArrayBuffer | Blob }> = [];
  private url: string;

  constructor(handler: MessageHandler) {
    this.handler = handler;
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.url = `${protocol}//${location.host}/ws`;
    this.connect();
  }

  private connect(): void {
    this.ws = new WebSocket(this.url);
    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;

      // 发送队列中的消息
      while (this.messageQueue.length > 0) {
        const msg = this.messageQueue.shift()!;
        try {
          if (msg.type === 'json') {
            this.ws!.send(msg.data as string);
          } else {
            this.ws!.send(msg.data as ArrayBuffer | Blob);
          }
        } catch (err) {
          console.error('Failed to send queued message:', err);
        }
      }
    };

    this.ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data) as ServerMessage;
          this.handler(msg);
        } catch {}
      } else if (event.data instanceof ArrayBuffer) {
        // TTS 音频数据
        this.handler({ type: 'ai_audio', format: 'mp3' } as ServerMessage);
        this.onAudio(event.data);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected, reconnecting...');
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
        console.error('Max reconnect attempts reached, giving up');
      }
      return;
    }

    this.reconnectAttempts++;
    // 指数退避，最多 30 秒
    const delay = Math.min(2000 * this.reconnectAttempts, 30000);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  sendJson(msg: unknown): void {
    const payload = JSON.stringify(msg);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
    } else {
      this.messageQueue.push({ type: 'json', data: payload });
    }
  }

  sendBinary(data: ArrayBuffer | Blob): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      this.messageQueue.push({ type: 'binary', data });
    }
  }

  onAudio: (data: ArrayBuffer) => void = () => {};

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectAttempts = this.MAX_RECONNECT_ATTEMPTS; // 阻止重连
    this.messageQueue = []; // 清空队列
    this.ws?.close();
  }
}
