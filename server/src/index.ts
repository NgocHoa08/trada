import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import { getRound } from '@tdvh/shared';
import { DatabaseStore } from './dbStore';
import { ContentFilter, loadBlocklist } from './filter';
import { attachGameServer } from './gameServer';
import { parseAllowedOrigins } from './origin';
import { Room } from './room';
import { loadTopics, topicForRound } from './topics';

const PORT = Number(process.env.PORT ?? 8787);
const allowedOrigins = parseAllowedOrigins(process.env.CLIENT_ORIGIN);
const dev = process.env.NODE_ENV !== 'production';
const DB_PATH =
  process.env.DB_PATH ?? fileURLToPath(new URL('../data/tradavia.db', import.meta.url));
const topics = loadTopics();

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    // Giờ server không được phép bị cache, nếu không client đo lệch sai
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

function handle(req: IncomingMessage, res: ServerResponse): void {
  // CORS: chỉ cho origin của client (dev qua proxy Vite nên cùng origin)
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin))
    res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');

  if (req.method !== 'GET') return json(res, 405, { ok: false });
  const url = new URL(req.url ?? '/', 'http://localhost');

  if (url.pathname === '/health') {
    const now = Date.now();
    return json(res, 200, {
      ok: true,
      serverTime: now,
      roundIndex: getRound(now).roundIndex,
      online: room.online,
    });
  }

  // Giờ chuẩn để client tính offset
  if (url.pathname === '/time') return json(res, 200, { serverTime: Date.now() });

  // Chủ đề của một tuần trà. Chỉ nhận tuần hiện tại ± 2 để không bị dò trước cả danh sách.
  if (url.pathname === '/topic') {
    const raw = url.searchParams.get('round');
    const round = raw !== null && /^-?\d{1,10}$/.test(raw) ? Number(raw) : NaN;
    const current = getRound(Date.now()).roundIndex;
    if (!Number.isInteger(round) || Math.abs(round - current) > 2) {
      return json(res, 400, { ok: false });
    }
    return json(res, 200, { roundIndex: round, topic: topicForRound(topics, round) });
  }

  json(res, 404, { ok: false });
}

const room = new Room({
  now: Date.now,
  store: new DatabaseStore(DB_PATH),
  filter: new ContentFilter(loadBlocklist()),
  newId: randomUUID,
});

const http = createServer(handle);
attachGameServer(http, room, { allowedOrigins, dev });
setInterval(() => room.tick(), 1000);

http.listen(PORT, () => {
  console.log(`Server trà đá đang chạy ở http://localhost:${PORT}`);
});
