import { describe, expect, it } from 'vitest';
import { ContentFilter, loadBlocklist } from './filter';

const f = new ContentFilter(loadBlocklist());
const reason = (s: string) => {
  const r = f.check(s);
  return r.ok ? 'ok' : r.reason;
};

describe('ContentFilter', () => {
  it('cho qua câu bình thường, kể cả từ dễ nhầm khi bỏ dấu', () => {
    for (const s of [
      'Hôm nay trời mát, ngồi uống trà đá thật là dễ chịu',
      'Hồi lớn lên mới thấy nhớ nhà',
      'Các bạn ơi, buổi sáng nay vui lắm',
      'Cacao đá cũng ngon',
      'Vui lắm. Me cũng vậy',
      'Tôi thích 3 món: bún, phở, cơm tấm',
      'Năm nay 2026 mình 25 tuổi',
    ]) {
      expect(reason(s)).toBe('ok');
    }
  });

  it('bỏ HTML, chuẩn hoá khoảng trắng', () => {
    const r = f.check('  <b>Chiều</b>   nay   <script>alert(1)</script> mưa ');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.text).not.toMatch(/[<>]/);
      expect(r.text).toContain('Chiều');
      expect(r.text).toContain('mưa');
    }
  });

  it('chặn link các kiểu', () => {
    for (const s of [
      'xem https://evil.example/abc',
      'vào www.abc.com đi',
      'abc.com là web hay',
      'liên hệ t.me/abc',
      'bit.ly/xyz nè',
      'HTTP://X.Y',
    ]) {
      expect(reason(s)).toBe('link');
    }
  });

  it('chặn email', () => {
    expect(reason('gửi về lan@gmail.com nhé')).toBe('email');
    expect(reason('lan (at) gmail.com')).toBe('email');
  });

  it('chặn số điện thoại, kể cả chen dấu và đọc bằng chữ', () => {
    for (const s of [
      '0987654321',
      '0987 654 321',
      '098.765.4321',
      '098-765-4321 nhe',
      '+84 987 654 321',
      '(098) 765 4321',
      'không chín tám bảy sáu năm bốn ba hai một',
    ]) {
      expect(reason(s)).toBe('phone');
    }
  });

  it('chặn từ tục, có dấu và không dấu, kể cả viết tách chữ', () => {
    for (const s of ['đồ ngu', 'vcl vui quá', 'dm', 'd m m', 'v.c.l', 'Đồ Chó', 'địt mẹ']) {
      expect(reason(s)).toBe('profanity');
    }
  });

  it('rỗng và quá dài', () => {
    expect(reason('   ')).toBe('empty');
    expect(reason('<b></b>')).toBe('empty');
    expect(reason('a '.repeat(41))).toBe('too_long');
    expect(f.check('a'.repeat(80)).ok).toBe(true);
    expect(reason('a'.repeat(81))).toBe('too_long');
  });

  it('bỏ ký tự điều khiển và ký tự ẩn', () => {
    const r = f.check('xin\u200b chào\u0000');
    expect(r.ok && r.text).toBe('xin chào');
  });
});
