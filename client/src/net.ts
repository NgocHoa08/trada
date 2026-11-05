import { bestOffset, type TimeSample } from '@tdvh/shared';

/** Địa chỉ server. Dev dùng proxy của Vite (để trống); khi triển khai đặt VITE_API_URL. */
const API_BASE: string = import.meta.env.VITE_API_URL ?? '';

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function fetchTopic(roundIndex: number): Promise<string> {
  const d = await getJson<{ topic: string }>(`/topic?round=${roundIndex}`);
  return d.topic;
}

/**
 * Đồng hồ chung theo server. `now()` = giờ máy + offset đo từ server.
 * `?skew=600000` trên URL giả lập máy lệch giờ (để kiểm tra offset hoạt động).
 */
export class ServerClock {
  private offset = 0;
  private synced = false;

  constructor(private readonly skewMs: number = 0) {}

  /** Giờ máy (đã cộng skew giả lập nếu có). */
  private local(): number {
    return Date.now() + this.skewMs;
  }

  now(): number {
    return this.local() + this.offset;
  }

  get isSynced(): boolean {
    return this.synced;
  }

  /** Lấy 5 mẫu, dùng mẫu có RTT nhỏ nhất. Ném lỗi nếu không mẫu nào thành công. */
  async sync(): Promise<void> {
    const samples: TimeSample[] = [];
    for (let i = 0; i < 5; i++) {
      const t0 = this.local();
      try {
        const { serverTime } = await getJson<{ serverTime: number }>('/time');
        samples.push({ t0, t1: this.local(), serverTime });
      } catch {
        // bỏ mẫu hỏng, thử mẫu tiếp
      }
    }
    const off = bestOffset(samples);
    if (off === null) throw new Error('Không đo được giờ server');
    this.offset = off;
    this.synced = true;
  }
}
