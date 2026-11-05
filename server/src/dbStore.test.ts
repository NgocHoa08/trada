import { describe, expect, it } from 'vitest';
import { DatabaseStore } from './dbStore';

describe('DatabaseStore Economy & Streaks', () => {
  const START = Date.UTC(2026, 4, 1, 10, 0, 0); // 17h00 giờ VN (2026-05-01)

  it('tạo user mới và sinh mã khôi phục không mất khi gọi lại', () => {
    const store = new DatabaseStore(':memory:');
    const { user, code } = store.getOrCreateUser('u1', 'Lan', 'a1', START);
    expect(user.name).toBe('Lan');
    expect(code).toHaveLength(10);

    const { code: code2 } = store.getOrCreateUser('u1', 'Lan', 'a1', START + 1000);
    expect(code2).toBe(code);

    const found = store.findUserByRecoveryCode(code);
    expect(found?.id).toBe('u1');
    store.close();
  });

  it('ngồi đủ (>= 1440s) được cộng +1 tiền lẻ khi chốt tuần, ngồi 70% không được thưởng', () => {
    const store = new DatabaseStore(':memory:');
    store.getOrCreateUser('u1', 'Lan', 'a1', START);
    store.getOrCreateUser('u2', 'Nam', 'a2', START);

    const roundIndex = 100;
    // u1 ngồi 1440s (80%) -> đạt
    store.addSeatedSeconds('u1', roundIndex, 1440);
    // u2 ngồi 1260s (70%) -> không đạt
    store.addSeatedSeconds('u2', roundIndex, 1260);

    const awarded = store.settleRound(roundIndex, START);
    expect(awarded).toEqual([{ userId: 'u1', coinsEarned: 1 }]);

    const s1 = store.getUserStats('u1', START);
    expect(s1.coins).toBe(1);
    expect(s1.streak).toBe(1);
    expect(s1.todayFullRounds).toBe(1);

    const s2 = store.getUserStats('u2', START);
    expect(s2.coins).toBe(0);
    expect(s2.streak).toBe(0);

    store.close();
  });

  it('giới hạn tối đa 10 tiền lẻ mỗi ngày (daily cap)', () => {
    const store = new DatabaseStore(':memory:');
    store.getOrCreateUser('u1', 'Lan', 'a1', START);

    // Chốt 12 tuần trà ngồi đủ trong cùng một ngày
    for (let r = 1; r <= 12; r++) {
      store.addSeatedSeconds('u1', r, 1500);
      store.settleRound(r, START);
    }

    const s = store.getUserStats('u1', START);
    expect(s.coins).toBe(10); // Đạt mốc 10
    expect(s.todayFullRounds).toBe(12);

    store.close();
  });

  it('trừ tiền lẻ an toàn bằng transaction, không âm', () => {
    const store = new DatabaseStore(':memory:');
    store.getOrCreateUser('u1', 'Lan', 'a1', START);
    store.addSeatedSeconds('u1', 1, 1500);
    store.settleRound(1, START); // coins = 1

    expect(store.deductCoins('u1', 1)).toBe(true);
    expect(store.getUserStats('u1', START).coins).toBe(0);
    expect(store.deductCoins('u1', 1)).toBe(false); // không đủ tiền
    expect(store.getUserStats('u1', START).coins).toBe(0);

    store.close();
  });

  it('chuỗi ngày tăng khi ngồi ngày hôm sau, và reset về 0 nếu bỏ 1 ngày', () => {
    const store = new DatabaseStore(':memory:');
    store.getOrCreateUser('u1', 'Lan', 'a1', START);

    // Ngày 1: 2026-05-01
    store.addSeatedSeconds('u1', 1, 1500);
    store.settleRound(1, START);
    expect(store.getUserStats('u1', START).streak).toBe(1);

    // Ngày 2: 2026-05-02 (cộng 24h)
    const day2 = START + 86_400_000;
    store.addSeatedSeconds('u1', 2, 1500);
    store.settleRound(2, day2);
    expect(store.getUserStats('u1', day2).streak).toBe(2);

    // Ngày 4: Bỏ ngày 3 (cộng thêm 48h)
    const day4 = day2 + 2 * 86_400_000;
    expect(store.getUserStats('u1', day4).streak).toBe(0); // Bị reset do bỏ ngày

    store.close();
  });
});

