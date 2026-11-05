import { describe, expect, it } from 'vitest';
import {
  determineRpsWinner,
  getInitialXiangqiBoard,
  getRandomFortune,
  isLegalXiangqiMove,
  XIANGQI_PUZZLES,
} from './games';

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


  it('kiểm tra nước đi hợp lệ của Cờ tướng (Tướng, Pháo, Mã, Tốt)', () => {
    const board = getInitialXiangqiBoard();

    // Tốt đỏ tiến 1 bước: hợp lệ
    expect(isLegalXiangqiMove(board, [6, 4], [5, 4], 'r_p', 'red')).toBe(true);

    // Tốt đỏ đi lùi: không hợp lệ
    expect(isLegalXiangqiMove(board, [6, 4], [7, 4], 'r_p', 'red')).toBe(false);

    // Pháo đỏ đi ngang không có quân cản: hợp lệ
    board[7]![1] = 'r_c';
    expect(isLegalXiangqiMove(board, [7, 1], [7, 4], 'r_c', 'red')).toBe(true);

    // Đến lượt đỏ thì đen không được đi
    expect(isLegalXiangqiMove(board, [3, 4], [4, 4], 'b_p', 'red')).toBe(false);
  });
});
