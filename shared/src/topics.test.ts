import { describe, expect, it } from 'vitest';
import { pickTopicIndex } from './topics';

describe('pickTopicIndex', () => {
  const N = 40;
  const R0 = 996_500;

  it('xác định: gọi lại cho cùng kết quả', () => {
    for (let i = 0; i < 50; i++) expect(pickTopicIndex(R0 + i, N)).toBe(pickTopicIndex(R0 + i, N));
  });

  it('không trùng hai tuần trà liên tiếp (kể cả qua ranh giới vòng)', () => {
    for (let r = R0; r < R0 + N * 60; r++) {
      expect(pickTopicIndex(r + 1, N)).not.toBe(pickTopicIndex(r, N));
    }
  });

  it('mỗi vòng N tuần trà dùng đủ N chủ đề đúng một lần', () => {
    const start = Math.floor(R0 / N) * N;
    const seen = new Set<number>();
    for (let r = start; r < start + N; r++) seen.add(pickTopicIndex(r, N));
    expect(seen.size).toBe(N);
  });

  it('chỉ số luôn hợp lệ, kể cả roundIndex âm', () => {
    for (const r of [-1000, -1, 0, 1, 12345678]) {
      const i = pickTopicIndex(r, N);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(N);
    }
  });

  it('trường hợp biên: 1, 2, 3 chủ đề', () => {
    expect(pickTopicIndex(5, 1)).toBe(0);
    for (let r = 0; r < 20; r++) expect(pickTopicIndex(r + 1, 2)).not.toBe(pickTopicIndex(r, 2));
    for (let r = 0; r < 60; r++) expect(pickTopicIndex(r + 1, 3)).not.toBe(pickTopicIndex(r, 3));
  });

  it('báo lỗi với đầu vào sai', () => {
    expect(() => pickTopicIndex(1.5, N)).toThrow(RangeError);
    expect(() => pickTopicIndex(1, 0)).toThrow(RangeError);
  });
});
