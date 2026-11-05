import { describe, expect, it } from 'vitest';
import { AVATARS, MOODS, NAME_MAX, SEAT_PREFS, sanitizeName, seatsForPref } from './avatars';

describe('sanitizeName', () => {
  it('cắt tên còn tối đa 20 ký tự', () => {
    expect(Array.from(sanitizeName('a'.repeat(50))).length).toBe(NAME_MAX);
  });
  it('bỏ < > và ký tự điều khiển, gộp khoảng trắng', () => {
    expect(sanitizeName('  <b>Lan</b>\n\t  Anh ')).toBe('b Lan /b Anh');
  });
  it('không cắt đôi emoji', () => {
    const s = sanitizeName('😄'.repeat(30));
    expect(Array.from(s).length).toBe(NAME_MAX);
  });
  it('chuỗi rỗng sau khi làm sạch', () => {
    expect(sanitizeName('  \n ')).toBe('');
  });
});

describe('dữ liệu cố định', () => {
  it('id avatar và tâm trạng không trùng', () => {
    expect(new Set(AVATARS.map((a) => a.id)).size).toBe(AVATARS.length);
    expect(new Set(MOODS.map((m) => m.id)).size).toBe(MOODS.length);
  });
  it('mỗi khu vực ưa thích đều có ghế', () => {
    for (const p of SEAT_PREFS) expect(seatsForPref(p.id).length).toBeGreaterThan(0);
    expect(seatsForPref('curb')).toHaveLength(2);
    expect(seatsForPref('t1')).toHaveLength(4);
    expect(seatsForPref('khong-ton-tai')).toHaveLength(14);
  });
});
