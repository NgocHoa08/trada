/** Dữ liệu quẻ may mắn đầu ngày tại quán Trà Đá Bà Ba */
export interface FortuneStick {
  id: number;
  rank: 'Đại Cát' | 'Thượng Cát' | 'Trung Cát' | 'Bình An';
  title: string;
  poem: string[];
  meaning: string;
}

export const FORTUNE_STICKS: readonly FortuneStick[] = [
  {
    id: 1,
    rank: 'Đại Cát',
    title: 'Gió mát trăng thanh, vạn sự hanh thông',
    poem: [
      'Chiều buông bóng mát góc hè xưa,',
      'Trà xanh một chén tiễn nắng trưa.',
      'Đường dài bước tới thênh thang lối,',
      'Vận may gõ cửa tựa gió đưa.',
    ],
    meaning: 'Mọi dự định hôm nay đều diễn ra thuận lợi, quý nhân phù trợ, lòng an yên.',
  },
  {
    id: 2,
    rank: 'Thượng Cát',
    title: 'Hạt dưa rôm rả, hội ngộ tri âm',
    poem: [
      'Gặp gỡ người dưng hóa bạn hiền,',
      'Chuyện đời vài mẩu giải ưu phiền.',
      'Nụ cười trao gửi niềm vui mới,',
      'Hỷ sự tìm về mối lương duyên.',
    ],
    meaning: 'Hôm nay bạn sẽ có cuộc gặp gỡ thú vị, kết nối thêm bạn mới hoặc nhận tin vui từ người thân.',
  },
  {
    id: 3,
    rank: 'Trung Cát',
    title: 'Nước trong đá lạnh, tâm tịnh sự an',
    poem: [
      'Việc đời chớ vội bước chân nhanh,',
      'Một ngụm trà thơm vị ngọt lành.',
      'Chờ đợi thời cơ hoa hé nở,',
      'Thành công sẽ đến lúc xuân xanh.',
    ],
    meaning: 'Kiên nhẫn và bình tĩnh là chìa khóa. Không nên vội vàng, chuyện tốt cần thời gian chín muồi.',
  },
  {
    id: 4,
    rank: 'Bình An',
    title: 'Khói thuốc mây bay, lòng nhẹ tựa tơ',
    poem: [
      'Bao nhiêu vất vả gửi mây trời,',
      'Thảnh thơi ngồi ngắm phố đông người.',
      'Sức khỏe bình an là phúc lớn,',
      'Ngày trôi êm ả rạng nụ cười.',
    ],
    meaning: 'Một ngày bình yên, không sóng gió. Hãy nghỉ ngơi, chăm sóc bản thân và tận hưởng từng khoảnh khắc giản dị.',
  },
  {
    id: 5,
    rank: 'Đại Cát',
    title: 'Lộc biếc cành dâu, tài lộc dồi dào',
    poem: [
      'Cây sấu đâm chồi đón nắng mai,',
      'Công danh rộng mở đức bền dài.',
      'Tiền lẻ trong tay sinh lộc lớn,',
      'Rạng rỡ tương lai thỏa chí trai.',
    ],
    meaning: 'Tài chính khởi sắc, công việc gặt hái kết quả xứng đáng sau những ngày nỗ lực.',
  },
] as const;

export function getRandomFortune(seed?: number): FortuneStick {
  const idx = seed !== undefined ? Math.abs(seed) % FORTUNE_STICKS.length : Math.floor(Math.random() * FORTUNE_STICKS.length);
  return FORTUNE_STICKS[idx]!;
}

/** Luật Oẳn tù tì vỉa hè */
export type RpsChoice = 'rock' | 'paper' | 'scissors';

export interface RpsDef {
  id: RpsChoice;
  name: string;
  emoji: string;
}

export const RPS_CHOICES: readonly RpsDef[] = [
  { id: 'rock', name: 'Búa', emoji: '✊' },
  { id: 'paper', name: 'Bao', emoji: '🖐️' },
  { id: 'scissors', name: 'Kéo', emoji: '✌️' },
] as const;

export function determineRpsWinner(a: RpsChoice, b: RpsChoice): 'win' | 'lose' | 'draw' {
  if (a === b) return 'draw';
  if (
    (a === 'rock' && b === 'scissors') ||
    (a === 'scissors' && b === 'paper') ||
    (a === 'paper' && b === 'rock')
  ) {
    return 'win';
  }
  return 'lose';
}

/** Thế cờ Tướng vỉa hè kinh điển */
export interface XiangqiPuzzle {
  id: string;
  title: string;
  description: string;
  fen: string; // Vị trí bàn cờ
  hint: string;
}

export const XIANGQI_PUZZLES: readonly XiangqiPuzzle[] = [
  {
    id: 'x1',
    title: 'Thế cờ: Khổng Minh Tá Tiễn',
    description: 'Bên Đỏ đi trước, tìm đường chiếu bí Đen trong 3 nước bằng cặp Xe - Pháo phối hợp.',
    fen: '3ak4/4a4/4b4/9/9/9/9/4C4/4R4/4K4 r',
    hint: 'Dùng Pháo ép Tướng Đen lệch sang cánh, mở đường cho Xe cắm đáy chiếu bí.',
  },
  {
    id: 'x2',
    title: 'Thế cờ: Ngựa Nhảy Đường Mòn (Mã Hậu Pháo)',
    description: 'Thế cờ tàn vỉa hè quen thuộc: Đỏ dùng Mã khống chế cửu cung, Pháo kẹp nách đoạt thắng.',
    fen: '4k4/9/4b4/9/2N6/9/9/4C4/9/4K4 r',
    hint: 'Mã nhảy ngọa tào chặn đường thoát của Tướng đối phương.',
  },
] as const;

export const XIANGQI_PIECE_NAMES: Record<string, string> = {
  r_k: '帥',
  r_a: '仕',
  r_b: '相',
  r_n: '傌',
  r_r: '俥',
  r_c: '炮',
  r_p: '兵',
  b_k: '將',
  b_a: '士',
  b_b: '象',
  b_n: '馬',
  b_r: '車',
  b_c: '砲',
  b_p: '卒',
};

export function getInitialXiangqiBoard(): string[][] {
  const b: string[][] = Array.from({ length: 10 }, () => Array.from({ length: 9 }, () => ''));
  b[0] = ['b_r', 'b_n', 'b_b', 'b_a', 'b_k', 'b_a', 'b_b', 'b_n', 'b_r'];
  b[2]![1] = 'b_c';
  b[2]![7] = 'b_c';
  b[3]![0] = 'b_p';
  b[3]![2] = 'b_p';
  b[3]![4] = 'b_p';
  b[3]![6] = 'b_p';
  b[3]![8] = 'b_p';

  b[6]![0] = 'r_p';
  b[6]![2] = 'r_p';
  b[6]![4] = 'r_p';
  b[6]![6] = 'r_p';
  b[6]![8] = 'r_p';
  b[7]![1] = 'r_c';
  b[7]![7] = 'r_c';
  b[9] = ['r_r', 'r_n', 'r_b', 'r_a', 'r_k', 'r_a', 'r_b', 'r_n', 'r_r'];
  return b;
}

export function isLegalXiangqiMove(
  board: string[][],
  from: [number, number],
  to: [number, number],
  piece: string,
  turn: 'red' | 'black',
): boolean {
  const [r1, c1] = from;
  const [r2, c2] = to;

  if (r1 === r2 && c1 === c2) return false;
  if (r2 < 0 || r2 > 9 || c2 < 0 || c2 > 8) return false;

  const color = piece[0]; // 'r' or 'b'
  if ((turn === 'red' && color !== 'r') || (turn === 'black' && color !== 'b')) return false;

  const target = board[r2]?.[c2] ?? '';
  if (target && target[0] === color) return false;

  const type = piece.slice(2); // 'k', 'a', 'b', 'n', 'r', 'c', 'p'
  const dr = Math.abs(r1 - r2);
  const dc = Math.abs(c1 - c2);

  // 1. Tướng (King)
  if (type === 'k') {
    if (c2 < 3 || c2 > 5) return false;
    if (color === 'r' && (r2 < 7 || r2 > 9)) return false;
    if (color === 'b' && (r2 < 0 || r2 > 2)) return false;
    return dr + dc === 1;
  }

  // 2. Sĩ (Advisor)
  if (type === 'a') {
    if (c2 < 3 || c2 > 5) return false;
    if (color === 'r' && (r2 < 7 || r2 > 9)) return false;
    if (color === 'b' && (r2 < 0 || r2 > 2)) return false;
    return dr === 1 && dc === 1;
  }

  // 3. Tượng (Elephant)
  if (type === 'b') {
    if (color === 'r' && r2 < 5) return false; // Không qua sông
    if (color === 'b' && r2 > 4) return false;
    if (dr !== 2 || dc !== 2) return false;
    const eyeR = (r1 + r2) / 2;
    const eyeC = (c1 + c2) / 2;
    return !board[eyeR]?.[eyeC];
  }

  // 4. Xe (Rook)
  if (type === 'r') {
    if (r1 !== r2 && c1 !== c2) return false;
    return countPiecesBetween(board, from, to) === 0;
  }

  // 5. Pháo (Cannon)
  if (type === 'c') {
    if (r1 !== r2 && c1 !== c2) return false;
    const between = countPiecesBetween(board, from, to);
    if (!target) return between === 0;
    return between === 1;
  }

  // 6. Mã (Knight)
  if (type === 'n') {
    if (!((dr === 2 && dc === 1) || (dr === 1 && dc === 2))) return false;
    if (dr === 2) {
      const blockR = r1 + (r2 - r1) / 2;
      return !board[blockR]?.[c1];
    }
    const blockC = c1 + (c2 - c1) / 2;
    return !board[r1]?.[blockC];
  }

  // 7. Tốt / Binh (Pawn)
  if (type === 'p') {
    if (color === 'r') {
      if (r1 >= 5) {
        // Chưa qua sông: chỉ tiến 1 bước
        return r2 === r1 - 1 && c1 === c2;
      }
      // Đã qua sông: tiến 1 bước hoặc sang ngang 1 bước
      return (r2 === r1 - 1 && c1 === c2) || (r1 === r2 && dc === 1);
    }
    // Quân đen
    if (r1 <= 4) {
      return r2 === r1 + 1 && c1 === c2;
    }
    return (r2 === r1 + 1 && c1 === c2) || (r1 === r2 && dc === 1);
  }

  return false;
}

function countPiecesBetween(board: string[][], from: [number, number], to: [number, number]): number {
  const [r1, c1] = from;
  const [r2, c2] = to;
  let count = 0;
  if (r1 === r2) {
    const minC = Math.min(c1, c2) + 1;
    const maxC = Math.max(c1, c2);
    for (let c = minC; c < maxC; c++) {
      if (board[r1]?.[c]) count++;
    }
  } else if (c1 === c2) {
    const minR = Math.min(r1, r2) + 1;
    const maxR = Math.max(r1, r2);
    for (let r = minR; r < maxR; r++) {
      if (board[r]?.[c1]) count++;
    }
  }
  return count;
}

