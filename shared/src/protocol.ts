import type { RoundInfo } from './round';
import type { RpsChoice } from './games';


export type Reaction =
  | 'haha'
  | 'thuong'
  | 'hong'
  | 'cangly'
  | 'om'
  | 'unhi'
  | 'smoke'
  | 'seeds'
  | 'candy';

export interface ReactionDef {
  id: Reaction;
  emoji: string;
  label: string;
}

export const REACTIONS: readonly ReactionDef[] = [
  { id: 'haha', emoji: '😂', label: 'Haha' },
  { id: 'thuong', emoji: '🥰', label: 'Thương' },
  { id: 'hong', emoji: '🙅', label: 'Hông' },
  { id: 'cangly', emoji: '🍻', label: 'Cạn ly' },
  { id: 'om', emoji: '🤗', label: 'Ôm' },
  { id: 'unhi', emoji: '💡', label: 'Ừ nhỉ' },
  { id: 'smoke', emoji: '🚬', label: 'Hút thuốc' },
  { id: 'seeds', emoji: '🥜', label: 'Cắn hạt dưa' },
  { id: 'candy', emoji: '🍬', label: 'Ăn kẹo lạc' },
];

export type ErrorCode =
  | 'bad_message'
  | 'not_joined'
  | 'rate_limited'
  | 'seat_taken'
  | 'not_seated'
  | 'bad_target'
  | 'no_coins'
  | 'story_rejected'
  | 'already_posted'
  | 'report_failed'
  | 'replaced'
  | 'unsupported'
  | 'forbidden'
  | 'internal';

/** Thông tin công khai của người ngồi. KHÔNG chứa userId (userId là chìa khoá danh tính ẩn danh). */
export interface PublicUser {
  name: string;
  avatar: string;
  mood: string;
}

export interface SeatState {
  seatId: string;
  /** null nếu ghế trống. */
  occupant: PublicUser | null;
  /** Ly trà đặc biệt (được đãi) còn trong tuần trà hiện tại. */
  treated: boolean;
}

export interface Story {
  id: string;
  roundIndex: number;
  text: string;
  createdAt: number;
  /** Ghế của người đăng lúc đăng, để hiện bong bóng. Ẩn danh, không lộ ai. */
  seatId: string | null;
}

export interface RadioItem {
  id: string;
  videoId: string;
  startSec: number;
  startedAt: number | null;
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  avatar: string;
  roundsCount: number;
}

export type ClientMessage =
  | { t: 'join'; userId: string; name: string; avatar: string; mood: string }
  | { t: 'sit'; seatId: string }
  | { t: 'stand' }
  | { t: 'react'; kind: Reaction; targetSeatId?: string }
  | { t: 'story'; text: string }
  | { t: 'treat'; targetSeatId: string }
  | { t: 'reportStory'; storyId: string }
  | { t: 'queueSong'; url: string }
  | { t: 'ping' }
  | { t: 'getProfile' }
  | { t: 'updateProfile'; name: string; avatar: string; mood: string }
  | { t: 'recover'; code: string }
  | { t: 'getLeaderboard' }
  | { t: 'adminAuth'; pass: string }
  | { t: 'adminSkip' }
  | { t: 'adminPause'; pause: boolean }
  | { t: 'trackEnded'; videoId: string }
  | { t: 'rpsInvite'; targetSeatId: string }
  | { t: 'rpsMove'; gameId: string; choice: RpsChoice }
  | { t: 'treatAll' }
  | { t: 'postLetter'; text: string }
  | { t: 'drawLetter' }
  | { t: 'getGuestbook' }
  | { t: 'signGuestbook'; text: string }
  | { t: 'xiangqiInvite'; targetSeatId: string }
  | { t: 'gameInvite'; targetSeatId: string; gameType: 'rps' | 'xiangqi' }
  | { t: 'gameAccept'; gameId: string }
  | { t: 'gameDecline'; gameId: string }
  | { t: 'chessMove'; gameId: string; from: [number, number]; to: [number, number]; piece: string }
  /** Đi quân ở bàn cờ vỉa hè cố định (chỉ người ngồi ghế s15/s16 mới hợp lệ). */
  | { t: 'chessTableMove'; from: [number, number]; to: [number, number] }
  /** Người đang ngồi ghế cờ xin ván mới. */
  | { t: 'chessTableReset' }
  | { t: 'claimCoins'; amount: number; reason: string };

export type ServerMessage =
  | {
      t: 'welcome';
      serverTime: number;
      you: PublicUser;
      /** Ghế đang ngồi của bạn (giữ nguyên khi kết nối lại), null nếu đang đứng. */
      youSeatId: string | null;
      seats: SeatState[];
      online: number;
      round: RoundInfo;
      stories: Story[];
      coins: number;
      streak: number;
      recoveryCode?: string;
    }
  | { t: 'seatChanged'; seat: SeatState }
  | { t: 'reaction'; fromSeatId: string; toSeatId?: string; kind: Reaction }
  | { t: 'storyPosted'; story: Story }
  | { t: 'storyHidden'; storyId: string }
  | { t: 'treatReceived'; toSeatId: string }
  | { t: 'roundChanged'; round: RoundInfo }
  | {
      t: 'coinsUpdated';
      coins: number;
      streak: number;
      todayFullRounds?: number;
      totalFullRounds?: number;
    }
  | {
      t: 'profileInfo';
      name: string;
      avatar: string;
      mood: string;
      coins: number;
      streak: number;
      recoveryCode: string;
      todayFullRounds: number;
      totalFullRounds: number;
    }
  | { t: 'leaderboard'; week: string; top: LeaderboardEntry[] }
  | { t: 'radio'; current: RadioItem | null; queue: RadioItem[]; isPaused?: boolean }
  | { t: 'adminStatus'; isAdmin: boolean; message?: string }
  | { t: 'rpsInvited'; gameId: string; fromName: string; fromSeatId: string }
  | { t: 'rpsResult'; gameId: string; myChoice: RpsChoice; opponentChoice: RpsChoice; result: 'win' | 'lose' | 'draw'; opponentName: string }
  | { t: 'treatAllReceived'; fromName: string; fromSeatId?: string }
  | { t: 'letterDrawn'; letter: { id: string; text: string; createdAt: number } | null }
  | { t: 'guestbook'; entries: { id: string; name: string; avatar: string; text: string; createdAt: number }[] }
  | { t: 'xiangqiInvited'; fromName: string; fromSeatId: string }
  | { t: 'gameInviteSent'; gameId: string; gameType: 'rps' | 'xiangqi'; toName: string; toSeatId: string }
  | { t: 'gameInvited'; gameId: string; gameType: 'rps' | 'xiangqi'; fromName: string; fromSeatId: string }
  | { t: 'gameStarted'; gameId: string; gameType: 'rps' | 'xiangqi'; p1Name: string; p2Name: string; p1SeatId: string; p2SeatId: string }
  | { t: 'gameDeclined'; gameId: string; byName: string }
  | { t: 'rpsOpponentMoved'; gameId: string; opponentName: string }
  | { t: 'chessMoved'; gameId: string; from: [number, number]; to: [number, number]; piece: string; turn: 'red' | 'black' }
  /** Trạng thái bàn cờ vỉa hè, gửi cho mọi người (người chơi lẫn người xem). */
  | {
      t: 'chessTable';
      redName: string | null;
      blackName: string | null;
      board: string[][];
      turn: 'red' | 'black';
      lastMove: { from: [number, number]; to: [number, number] } | null;
      winner: 'red' | 'black' | null;
    }


  | { t: 'online'; online: number }
  | { t: 'pong'; serverTime: number }
  | { t: 'error'; code: ErrorCode; message: string };
