/**
 * Chọn chủ đề xác định theo roundIndex: mọi máy cùng kết quả, mỗi vòng đi hết `count` chủ đề
 * (xáo trộn có seed) rồi mới lặp, và không bao giờ trùng hai tuần trà liên tiếp.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function permutation(epoch: number, count: number): number[] {
  const rand = mulberry32(Math.imul(epoch, 2654435761) ^ 0x9e3779b9);
  const p = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j] as number, p[i] as number];
  }
  return p;
}

/** Hoán vị của một vòng, đã chỉnh để phần tử đầu khác phần tử cuối của vòng trước. */
function epochOrder(epoch: number, count: number): number[] {
  const p = permutation(epoch, count);
  if (count > 2) {
    const prevLast = permutation(epoch - 1, count)[count - 1];
    if (p[0] === prevLast) [p[0], p[1]] = [p[1] as number, p[0] as number];
  }
  return p;
}

export function pickTopicIndex(roundIndex: number, count: number): number {
  if (!Number.isInteger(roundIndex)) throw new RangeError('roundIndex phải là số nguyên');
  if (!Number.isInteger(count) || count < 1) throw new RangeError('count phải >= 1');
  if (count === 1) return 0;
  // Với 2 chủ đề, cách duy nhất để không lặp liên tiếp là luân phiên
  if (count === 2) return ((roundIndex % 2) + 2) % 2;
  const epoch = Math.floor(roundIndex / count);
  const pos = ((roundIndex % count) + count) % count;
  return epochOrder(epoch, count)[pos] as number;
}
