import { describe, expect, it } from 'vitest';
import { parseClientMessage } from './validate';

const UID = '123e4567-e89b-42d3-a456-426614174000';

describe('parseClientMessage', () => {
  it('nhận tin hợp lệ', () => {
    expect(
      parseClientMessage({ t: 'join', userId: UID, name: 'Lan', avatar: 'a1', mood: 'vui' }),
    ).not.toBeNull();
    expect(parseClientMessage({ t: 'sit', seatId: 's01' })).toEqual({ t: 'sit', seatId: 's01' });
    expect(parseClientMessage({ t: 'react', kind: 'haha' })).toEqual({ t: 'react', kind: 'haha' });
    expect(parseClientMessage({ t: 'react', kind: 'om', targetSeatId: 's02' })).not.toBeNull();
    expect(parseClientMessage({ t: 'ping' })).toEqual({ t: 'ping' });
  });

  it('từ chối sai hình dạng', () => {
    for (const bad of [
      null,
      'sit',
      [],
      42,
      {},
      { t: 'nope' },
      { t: 'sit' },
      { t: 'sit', seatId: 's99' },
      { t: 'sit', seatId: { $ne: 1 } },
      { t: 'react', kind: 'toString' },
      { t: 'react', kind: 'haha', targetSeatId: 'x' },
      { t: 'story', text: 5 },
      { t: 'story', text: 'a'.repeat(401) },
      { t: 'treat' },
      { t: 'reportStory', storyId: 'abc' },
      { t: 'join', userId: 'not-uuid', name: 'x', avatar: 'a1', mood: 'vui' },
      { t: 'join', userId: UID, name: 'x', avatar: 'zzz', mood: 'vui' },
      { t: 'join', userId: UID, name: 'x'.repeat(101), avatar: 'a1', mood: 'vui' },
    ]) {
      expect(parseClientMessage(bad)).toBeNull();
    }
  });

  it('không mang theo trường thừa (chỉ lấy trường đã biết)', () => {
    const m = parseClientMessage({ t: 'sit', seatId: 's01', admin: true, __proto__: { x: 1 } });
    expect(m).toEqual({ t: 'sit', seatId: 's01' });
  });
});
