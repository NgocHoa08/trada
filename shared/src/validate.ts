import { AVATAR_IDS, MOOD_IDS } from './avatars';
import type { RpsChoice } from './games';

import type { ClientMessage, Reaction } from './protocol';
import { REACTIONS } from './protocol';
import { SEAT_IDS } from './seats';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REACTION_IDS: ReadonlySet<string> = new Set(REACTIONS.map((r) => r.id));

export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);

const isStr = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;
const isSeatId = (v: unknown): v is string => typeof v === 'string' && SEAT_IDS.has(v);

/**
 * Kiểm tra schema tin nhắn từ client (không tin client). Trả null nếu sai hình dạng hoặc quá dài.
 * Chỉ kiểm hình dạng; luật nghiệp vụ (ghế trống, rate limit, lọc nội dung) nằm ở server.
 */
export function parseClientMessage(raw: unknown): ClientMessage | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const m = raw as Record<string, unknown>;
  switch (m.t) {
    case 'join':
      if (
        isUuid(m.userId) &&
        isStr(m.name, 100) &&
        typeof m.avatar === 'string' &&
        AVATAR_IDS.has(m.avatar) &&
        typeof m.mood === 'string' &&
        MOOD_IDS.has(m.mood)
      ) {
        return { t: 'join', userId: m.userId, name: m.name, avatar: m.avatar, mood: m.mood };
      }
      return null;
    case 'sit':
      return isSeatId(m.seatId) ? { t: 'sit', seatId: m.seatId } : null;
    case 'stand':
      return { t: 'stand' };
    case 'react': {
      if (typeof m.kind !== 'string' || !REACTION_IDS.has(m.kind)) return null;
      const kind = m.kind as Reaction;
      if (m.targetSeatId === undefined) return { t: 'react', kind };
      return isSeatId(m.targetSeatId) ? { t: 'react', kind, targetSeatId: m.targetSeatId } : null;
    }
    case 'story':
      return isStr(m.text, 400) ? { t: 'story', text: m.text } : null;
    case 'treat':
      return isSeatId(m.targetSeatId) ? { t: 'treat', targetSeatId: m.targetSeatId } : null;
    case 'reportStory':
      return isUuid(m.storyId) ? { t: 'reportStory', storyId: m.storyId } : null;
    case 'queueSong':
      return isStr(m.url, 300) ? { t: 'queueSong', url: m.url } : null;
    case 'ping':
      return { t: 'ping' };
    case 'getProfile':
      return { t: 'getProfile' };
    case 'updateProfile':
      if (
        isStr(m.name, 100) &&
        typeof m.avatar === 'string' &&
        AVATAR_IDS.has(m.avatar) &&
        typeof m.mood === 'string' &&
        MOOD_IDS.has(m.mood)
      ) {
        return { t: 'updateProfile', name: m.name, avatar: m.avatar, mood: m.mood };
      }
      return null;
    case 'recover':
      return typeof m.code === 'string' && isStr(m.code, 30) ? { t: 'recover', code: m.code } : null;
    case 'getLeaderboard':
      return { t: 'getLeaderboard' };
    case 'adminAuth':
      return isStr(m.pass, 100) ? { t: 'adminAuth', pass: m.pass } : null;
    case 'adminSkip':
      return { t: 'adminSkip' };
    case 'adminPause':
      return typeof m.pause === 'boolean' ? { t: 'adminPause', pause: m.pause } : null;
    case 'trackEnded':
      return isStr(m.videoId, 50) ? { t: 'trackEnded', videoId: m.videoId } : null;
    case 'rpsInvite':
      return isSeatId(m.targetSeatId) ? { t: 'rpsInvite', targetSeatId: m.targetSeatId } : null;
    case 'rpsMove':
      return typeof m.gameId === 'string' &&
        typeof m.choice === 'string' &&
        ['rock', 'paper', 'scissors'].includes(m.choice)
        ? { t: 'rpsMove', gameId: m.gameId, choice: m.choice as RpsChoice }
        : null;
    case 'treatAll':
      return { t: 'treatAll' };
    case 'postLetter':
      return isStr(m.text, 500) ? { t: 'postLetter', text: m.text } : null;
    case 'drawLetter':
      return { t: 'drawLetter' };
    case 'getGuestbook':
      return { t: 'getGuestbook' };
    case 'signGuestbook':
      return isStr(m.text, 200) ? { t: 'signGuestbook', text: m.text } : null;
    case 'xiangqiInvite':
      return isSeatId(m.targetSeatId) ? { t: 'xiangqiInvite', targetSeatId: m.targetSeatId } : null;



    default:
      return null;
  }
}
