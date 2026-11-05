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
