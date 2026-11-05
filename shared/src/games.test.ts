import { describe, expect, it } from 'vitest';
import { determineRpsWinner, getRandomFortune, XIANGQI_PUZZLES } from './games';

describe('games (Nhóm 2: Tương tác xã hội & Minigame)', () => {
  it('xác định kết quả Oẳn tù tì chuẩn xác', () => {
    expect(determineRpsWinner('rock', 'scissors')).toBe('win');
    expect(determineRpsWinner('scissors', 'paper')).toBe('win');
    expect(determineRpsWinner('paper', 'rock')).toBe('win');

    expect(determineRpsWinner('scissors', 'rock')).toBe('lose');
    expect(determineRpsWinner('paper', 'scissors')).toBe('lose');
    expect(determineRpsWinner('rock', 'paper')).toBe('lose');

    expect(determineRpsWinner('rock', 'rock')).toBe('draw');
    expect(determineRpsWinner('paper', 'paper')).toBe('draw');
    expect(determineRpsWinner('scissors', 'scissors')).toBe('draw');
  });

  it('lấy quẻ xăm may mắn trả về thông tin đầy đủ', () => {
    const fortune = getRandomFortune(0);
    expect(fortune).toBeDefined();
    expect(fortune.poem.length).toBe(4);
    expect(['Đại Cát', 'Thượng Cát', 'Trung Cát', 'Bình An']).toContain(fortune.rank);
  });

  it('danh sách thế cờ tướng vỉa hè có sẵn', () => {
    expect(XIANGQI_PUZZLES.length).toBeGreaterThan(0);
    expect(XIANGQI_PUZZLES[0]?.title).toContain('Khổng Minh');
  });
});
