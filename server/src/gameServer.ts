import type { Server as HttpServer } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { parseClientMessage, type ClientMessage, type ServerMessage } from '@tdvh/shared';
import { isOriginAllowed } from './origin';
import type { Room, Session } from './room';

const MAX_CONNECTIONS = 500;
const MAX_BAD_MESSAGES = 5;

export interface GameServerOptions {
  allowedOrigins: readonly string[];
  dev: boolean;
}

/** Gắn WebSocket (đường dẫn /ws) vào HTTP server, chuyển tin cho `Room`. */
export function attachGameServer(
  http: HttpServer,
  room: Room,
  opts: GameServerOptions,
): WebSocketServer {
  // maxPayload nhỏ: tin hợp lệ nhất cũng chỉ vài trăm byte
  const wss = new WebSocketServer({ noServer: true, maxPayload: 2048 });

  http.on('upgrade', (req, socket, head) => {
    const reject = (code: number, text: string): void => {
      socket.write(`HTTP/1.1 ${code} ${text}\r\nConnection: close\r\n\r\n`);
      socket.destroy();
    };
    const path = new URL(req.url ?? '/', 'http://localhost').pathname;
    if (path !== '/ws') return reject(404, 'Not Found');
    if (!isOriginAllowed(req.headers.origin, opts.allowedOrigins, opts.dev))
      return reject(403, 'Forbidden');
    if (wss.clients.size >= MAX_CONNECTIONS) return reject(503, 'Service Unavailable');
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws));
  });

  wss.on('connection', (ws: WebSocket) => {
    let session: Session | null = null;
    let bad = 0;

    const send = (msg: ServerMessage): void => {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
    };
    const conn = { send, close: (code: number, reason: string) => ws.close(code, reason) };

    ws.on('error', () => ws.terminate());
    ws.on('close', () => {
      if (session) room.leave(session);
    });

    ws.on('message', (data, isBinary) => {
      let msg: ClientMessage | null = null;
      if (!isBinary) {
        try {
          msg = parseClientMessage(JSON.parse(data.toString()));
        } catch {
          msg = null;
        }
      }
      if (!msg) {
        send({ t: 'error', code: 'bad_message', message: 'Tin nhắn không hợp lệ.' });
        if (++bad >= MAX_BAD_MESSAGES) ws.close(1008, 'bad');
        return;
      }
      if (!session) {
        if (msg.t !== 'join') {
          send({ t: 'error', code: 'not_joined', message: 'Bạn cần vào quán trước.' });
          return;
        }
        session = room.join(conn, msg);
        return;
      }
      room.handle(session, msg);
    });
  });

  return wss;
}
