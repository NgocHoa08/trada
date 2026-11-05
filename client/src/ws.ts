import type { ClientMessage, ServerMessage } from '@tdvh/shared';
import { HEARTBEAT_MS } from '@tdvh/shared';

export interface GameClientOptions {
  onMessage: (msg: ServerMessage) => void;
  onStatusChange: (status: 'connecting' | 'connected' | 'disconnected') => void;
}

export class GameClient {
  private ws: WebSocket | null = null;
  private pingTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private retryDelay = 2000;
  private isClosedManually = false;

  constructor(private readonly opts: GameClientOptions) {}

  connect(): void {
    this.isClosedManually = false;
    this.opts.onStatusChange('connecting');

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Nếu có VITE_API_URL thì dùng URL đó, ngược lại dùng cùng host hiện tại
    const apiUrl = import.meta.env.VITE_API_URL;
    let wsUrl: string;
    if (apiUrl) {
      const u = new URL(apiUrl);
      wsUrl = `${u.protocol === 'https:' ? 'wss:' : 'ws:'}//${u.host}/ws`;
    } else {
      wsUrl = `${protocol}//${location.host}/ws`;
    }

    try {
      this.ws = new WebSocket(wsUrl);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.retryDelay = 2000;
      this.opts.onStatusChange('connected');
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as ServerMessage;
        this.opts.onMessage(msg);
      } catch {
        // bỏ qua tin lỗi định dạng
      }
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      this.ws = null;
      if (!this.isClosedManually) {
        this.opts.onStatusChange('disconnected');
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      // ws.onclose sẽ kích hoạt sau đó
    };
  }

  send(msg: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingTimer = window.setInterval(() => {
      this.send({ t: 'ping' });
    }, HEARTBEAT_MS);
  }

  private stopHeartbeat(): void {
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.retryDelay = Math.min(this.retryDelay * 2, 30_000);
      this.connect();
    }, this.retryDelay);
  }

  disconnect(): void {
    this.isClosedManually = true;
    this.stopHeartbeat();
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

