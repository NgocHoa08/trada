/** Kiểm tra Origin của yêu cầu nâng cấp WebSocket (tương đương CORS cho WebSocket). */
export function parseAllowedOrigins(env: string | undefined): string[] {
  return (env ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

const PRIVATE_HOST =
  /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(?::\d{1,5})?$/;

/**
 * - Không có header Origin (công cụ ngoài trình duyệt): cho qua, vì CSRF chỉ nguy hiểm từ trình duyệt.
 * - Có Origin: phải nằm trong danh sách cho phép.
 * - Chế độ dev: thêm localhost và mạng LAN riêng để thử trên điện thoại.
 */
export function isOriginAllowed(
  origin: string | undefined,
  allowed: readonly string[],
  dev: boolean,
): boolean {
  if (origin === undefined) return true;
  if (allowed.includes('*') || allowed.includes(origin)) return true;
  return dev && PRIVATE_HOST.test(origin);
}
