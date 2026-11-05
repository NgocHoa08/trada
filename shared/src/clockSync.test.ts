import { describe, expect, it } from 'vitest';
import { bestOffset, offsetFromSample } from './clockSync';
import { getRound } from './round';

describe('clockSync', () => {
  it('offset đúng khi độ trễ đối xứng', () => {
    // máy chậm 600s, RTT 100ms
    const server = 1_000_000_000;
    const s = { t0: server - 600_000 - 50, t1: server - 600_000 + 50, serverTime: server };
    expect(offsetFromSample(s)).toBe(600_000);
  });

  it('chọn mẫu có RTT nhỏ nhất và bỏ mẫu hỏng', () => {
    const server = 5_000;
    const samples = [
      { t0: 0, t1: 1000, serverTime: server + 9999 }, // RTT lớn, lệch
      { t0: 100, t1: 120, serverTime: server + 110 }, // RTT 20ms
      { t0: 10, t1: 5, serverTime: 0 }, // t1 < t0
      { t0: NaN, t1: 1, serverTime: 1 },
    ];
    expect(bestOffset(samples)).toBe(server + 110 - 110);
    expect(bestOffset([])).toBeNull();
  });

  it('hai máy lệch giờ khác nhau vẫn cùng roundIndex sau khi bù offset', () => {
    const serverNow = Date.UTC(2026, 5, 1, 10, 29, 59, 900); // 100ms nữa đổi tuần trà
    for (const skew of [-3_600_000, 0, 7_200_000]) {
      const clientNow = serverNow + skew;
      const offset = bestOffset([{ t0: clientNow - 5, t1: clientNow + 5, serverTime: serverNow }]);
      expect(getRound(clientNow + (offset as number)).roundIndex).toBe(
        getRound(serverNow).roundIndex,
      );
    }
  });
});
