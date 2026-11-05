import { describe, expect, it } from 'vitest';
import { isOriginAllowed, parseAllowedOrigins } from './origin';

describe('isOriginAllowed', () => {
  const allowed = parseAllowedOrigins('https://tra.example.com/, http://localhost:5173');

  it('parse danh sách', () => {
    expect(allowed).toEqual(['https://tra.example.com', 'http://localhost:5173']);
  });
  it('cho origin trong danh sách và không có origin', () => {
    expect(isOriginAllowed('https://tra.example.com', allowed, false)).toBe(true);
    expect(isOriginAllowed(undefined, allowed, false)).toBe(true);
  });
  it('chặn origin lạ ở production', () => {
    expect(isOriginAllowed('https://evil.example', allowed, false)).toBe(false);
    expect(isOriginAllowed('http://192.168.1.5:5173', allowed, false)).toBe(false);
  });
  it('dev cho LAN riêng nhưng vẫn chặn origin công cộng', () => {
    expect(isOriginAllowed('http://192.168.1.5:5173', allowed, true)).toBe(true);
    expect(isOriginAllowed('http://10.0.0.7:5173', allowed, true)).toBe(true);
    expect(isOriginAllowed('https://evil.example', allowed, true)).toBe(false);
    expect(isOriginAllowed('http://localhost.evil.example', allowed, true)).toBe(false);
  });
});
