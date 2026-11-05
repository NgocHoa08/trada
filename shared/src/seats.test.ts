import { describe, expect, it } from 'vitest';
import { SEATS, areNeighbors } from './seats';

describe('SEATS', () => {
  it('có đúng 14 chỗ với id duy nhất', () => {
    expect(SEATS).toHaveLength(14);
    expect(new Set(SEATS.map((s) => s.id)).size).toBe(14);
  });

  it('không có hai ghế chồng lên nhau', () => {
    for (const a of SEATS) {
      for (const b of SEATS) {
        if (a.id >= b.id) continue;
        expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(0.9);
      }
    }
  });

  it('mọi ghế nằm trên vỉa hè', () => {
    for (const s of SEATS) {
      expect(s.z).toBeGreaterThan(-5.5);
      expect(s.z).toBeLessThan(3.8);
    }
  });
});

describe('areNeighbors', () => {
  it('cùng bàn là ngồi cạnh, không tự cạnh mình, ghế lạ thì không', () => {
    expect(areNeighbors('s01', 's02')).toBe(true);
    expect(areNeighbors('s01', 's03')).toBe(true); // đối diện qua bàn
    expect(areNeighbors('s01', 's01')).toBe(false);
    expect(areNeighbors('s01', 'zzz')).toBe(false);
  });
  it('hai bàn xa nhau thì không', () => {
    expect(areNeighbors('s01', 's09')).toBe(false);
  });
});
