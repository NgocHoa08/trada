import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import {
  MSG_BURST,
  REPORTS_TO_HIDE,
  ROUND_MS,
  STALE_MS,
  type ClientMessage,
  type ErrorCode,
  type ServerMessage,
} from '@tdvh/shared';
import { ContentFilter, loadBlocklist } from './filter';
import { Room, type Session } from './room';
import { DatabaseStore } from './dbStore';

// 10:00 UTC: đúng ranh giới tuần trà, +1 phút cho an toàn
const START = Date.UTC(2026, 5, 1, 10, 0, 0) + 60_000;
const filter = new ContentFilter(loadBlocklist());
const stores: DatabaseStore[] = [];

afterEach(() => {
  while (stores.length) stores.pop()?.close();
});

function setup() {
  let t = START;
  const store = new DatabaseStore(':memory:');
  stores.push(store);
  const room = new Room({ now: () => t, store, filter, newId: randomUUID });
  return {
    room,
    store,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

type Env = ReturnType<typeof setup>;

function client(env: Env, name = 'Lan', userId: string = randomUUID()) {
  const msgs: ServerMessage[] = [];
  const closed: [number, string][] = [];
  const conn = {
    send: (m: ServerMessage) => void msgs.push(m),
    close: (c: number, r: string) => void closed.push([c, r]),
  };
  const session: Session = env.room.join(conn, {
    t: 'join',
    userId,
    name,
    avatar: 'a1',
    mood: 'vui',
  });
  return {
    session,
    userId,
    msgs,
    closed,
    send: (m: ClientMessage) => env.room.handle(session, m),
    errors: () =>
      msgs
        .filter((m): m is Extract<ServerMessage, { t: 'error' }> => m.t === 'error')
        .map((m) => m.code),
    has: (t: ServerMessage['t']) => msgs.some((m) => m.t === t),
    of: <T extends ServerMessage['t']>(t: T) =>
      msgs.filter((m): m is Extract<ServerMessage, { t: T }> => m.t === t),
  };
}

/** Trôi thời gian theo từng bước 20 giây: các client trong danh sách vẫn ping (còn sống), rồi tick. */
function pass(env: Env, alive: { send: (m: ClientMessage) => void }[], ms: number): void {
  for (let left = ms; left > 0; left -= 20_000) {
    env.advance(Math.min(20_000, left));
    for (const c of alive) c.send({ t: 'ping' });
    env.room.tick();
  }
}
const lastError = (c: { errors: () => ErrorCode[] }) => c.errors().at(-1);

describe('ghế', () => {
  it('tranh chấp: người đến trước thắng, người sau nhận seat_taken', () => {
    const env = setup();
    const a = client(env, 'A');
    const b = client(env, 'B');
    a.send({ t: 'sit', seatId: 's01' });
    b.send({ t: 'sit', seatId: 's01' });
    expect(a.session.seatId).toBe('s01');
    expect(b.session.seatId).toBeNull();
    expect(lastError(b)).toBe('seat_taken');
    const changed = b.of('seatChanged').filter((m) => m.seat.seatId === 's01');
    expect(changed.at(-1)?.seat.occupant?.name).toBe('A');
  });

  it('đổi ghế thì ghế cũ trống; đứng dậy thì trống', () => {
    const env = setup();
    const a = client(env);
    const b = client(env);
    a.send({ t: 'sit', seatId: 's01' });
    a.send({ t: 'sit', seatId: 's02' });
    b.send({ t: 'sit', seatId: 's01' });
    expect(b.session.seatId).toBe('s01');
    b.send({ t: 'stand' });
    expect(env.room.seatStates().find((s) => s.seatId === 's01')?.occupant).toBeNull();
    expect(env.room.seatStates().find((s) => s.seatId === 's02')?.occupant?.name).toBe('Lan');
  });

  it('ghế không tồn tại bị từ chối', () => {
    const env = setup();
    const a = client(env);
    a.send({ t: 'sit', seatId: 'zzz' });
    expect(lastError(a)).toBe('bad_message');
  });

  it('không lộ userId của ai cho người khác', () => {
    const env = setup();
    const a = client(env, 'A');
    const b = client(env, 'B');
    a.send({ t: 'sit', seatId: 's01' });
    expect(JSON.stringify(b.msgs)).not.toContain(a.userId);
    expect(JSON.stringify(a.msgs)).not.toContain(b.userId);
  });
});

describe('heartbeat và kết nối', () => {
  it('quá 45 giây không tín hiệu thì giải phóng ghế và đóng kết nối', () => {
    const env = setup();
    const a = client(env);
    const b = client(env);
    a.send({ t: 'sit', seatId: 's01' });
    env.advance(STALE_MS - 1000);
    b.send({ t: 'ping' }); // b còn sống, a im lặng
    env.room.tick();
    expect(a.session.seatId).toBe('s01');
    env.advance(2000);
    env.room.tick();
    expect(a.closed[0]?.[0]).toBe(4001);
    expect(env.room.seatStates().find((s) => s.seatId === 's01')?.occupant).toBeNull();
    expect(env.room.online).toBe(1);
  });

  it('ping giữ ghế và trả pong', () => {
    const env = setup();
    const a = client(env);
    a.send({ t: 'sit', seatId: 's01' });
    for (let i = 0; i < 5; i++) {
      env.advance(20_000);
      a.send({ t: 'ping' });
      env.room.tick();
    }
    expect(a.session.seatId).toBe('s01');
    expect(a.has('pong')).toBe(true);
  });

  it('cùng userId vào lần nữa: bản mới thay bản cũ và giữ ghế; bản cũ rời không làm mất ghế', () => {
    const env = setup();
    const uid = randomUUID();
    const old = client(env, 'Lan', uid);
    old.send({ t: 'sit', seatId: 's03' });
    const fresh = client(env, 'Lan', uid);
    expect(old.errors()).toContain('replaced');
    expect(old.closed[0]?.[0]).toBe(4000);
    expect(fresh.of('welcome')[0]?.youSeatId).toBe('s03');
    env.room.leave(old.session); // đóng socket cũ muộn
    expect(env.room.seatStates().find((s) => s.seatId === 's03')?.occupant?.name).toBe('Lan');
    old.send({ t: 'stand' }); // tin từ bản cũ bị bỏ qua
    expect(fresh.session.seatId).toBe('s03');
    expect(env.room.online).toBe(1);
  });

  it('rời đi thì ghế trống và online giảm', () => {
    const env = setup();
    const a = client(env);
    const b = client(env);
    a.send({ t: 'sit', seatId: 's01' });
    env.room.leave(a.session);
    expect(b.of('online').at(-1)?.online).toBe(1);
    expect(env.room.seatStates().find((s) => s.seatId === 's01')?.occupant).toBeNull();
  });

  it('chống tràn tin: quá ngưỡng thì bị đóng', () => {
    const env = setup();
    const a = client(env);
    for (let i = 0; i < MSG_BURST.max + 5; i++) a.send({ t: 'ping' });
    expect(a.closed[0]?.[0]).toBe(1008);
    expect(env.room.online).toBe(0);
  });
});

describe('phản ứng', () => {
  it('phải ngồi, đích phải có người và khác mình', () => {
    const env = setup();
    const a = client(env);
    const b = client(env);
    a.send({ t: 'react', kind: 'haha' });
    expect(lastError(a)).toBe('not_seated');
    a.send({ t: 'sit', seatId: 's01' });
    a.send({ t: 'react', kind: 'haha', targetSeatId: 's05' }); // ghế trống
    expect(lastError(a)).toBe('bad_target');
    a.send({ t: 'react', kind: 'haha', targetSeatId: 's01' }); // chính mình
    expect(lastError(a)).toBe('bad_target');
    b.send({ t: 'sit', seatId: 's02' });
    a.send({ t: 'react', kind: 'om', targetSeatId: 's02' });
    expect(b.of('reaction').at(-1)).toEqual({
      t: 'reaction',
      fromSeatId: 's01',
      toSeatId: 's02',
      kind: 'om',
    });
  });

  it('giới hạn 1 phản ứng mỗi 2 giây', () => {
    const env = setup();
    const a = client(env);
    const b = client(env);
    a.send({ t: 'sit', seatId: 's01' });
    a.send({ t: 'react', kind: 'haha' });
    env.advance(1500);
    a.send({ t: 'react', kind: 'haha' });
    expect(lastError(a)).toBe('rate_limited');
    env.advance(600);
    a.send({ t: 'react', kind: 'thuong' });
    expect(b.of('reaction')).toHaveLength(2);
  });

  it('đổi kết nối không lách được giới hạn', () => {
    const env = setup();
    const uid = randomUUID();
    const a = client(env, 'A', uid);
    a.send({ t: 'sit', seatId: 's01' });
    a.send({ t: 'react', kind: 'haha' });
    const a2 = client(env, 'A', uid);
    a2.send({ t: 'react', kind: 'haha' });
    expect(lastError(a2)).toBe('rate_limited');
  });
});

describe('đãi trà', () => {
  function pair() {
    const env = setup();
    const a = client(env, 'A');
    const b = client(env, 'B');
    // Cho a 5 coins để đãi trà
    env.store.addSeatedSeconds(a.userId, 1, 1500);
    env.store.settleRound(1, START);
    env.store.addSeatedSeconds(a.userId, 2, 1500);
    env.store.settleRound(2, START);
    env.store.addSeatedSeconds(a.userId, 3, 1500);
    env.store.settleRound(3, START);
    env.store.addSeatedSeconds(a.userId, 4, 1500);
    env.store.settleRound(4, START);
    env.store.addSeatedSeconds(a.userId, 5, 1500);
    env.store.settleRound(5, START);

    a.send({ t: 'sit', seatId: 's01' });
    b.send({ t: 'sit', seatId: 's02' });
    return { env, a, b };
  }

  it('đãi người ngồi gần: ly đặc biệt hiện cho cả quán, người nhận được báo', () => {
    const { env, a, b } = pair();
    const c = client(env, 'C');
    a.send({ t: 'treat', targetSeatId: 's02' });
    expect(b.has('treatReceived')).toBe(true);
    expect(a.has('treatReceived')).toBe(false);
    expect(c.has('treatReceived')).toBe(false);
    expect(c.of('seatChanged').at(-1)?.seat).toMatchObject({ seatId: 's02', treated: true });
    // Không lộ người tặng
    expect(JSON.stringify(b.of('treatReceived'))).not.toContain('A');
  });

  it('từ chối: chưa ngồi, ghế trống, chính mình, ngồi xa', () => {
    const { env, a } = pair();
    const x = client(env, 'X');
    x.send({ t: 'treat', targetSeatId: 's01' });
    expect(lastError(x)).toBe('not_seated');
    a.send({ t: 'treat', targetSeatId: 's04' });
    expect(lastError(a)).toBe('bad_target');
    a.send({ t: 'treat', targetSeatId: 's01' });
    expect(lastError(a)).toBe('bad_target');
    const far = client(env, 'Far');
    far.send({ t: 'sit', seatId: 's09' });
    a.send({ t: 'treat', targetSeatId: 's09' });
    expect(lastError(a)).toBe('bad_target');
  });

  it('giới hạn 1 lần mỗi 10 giây', () => {
    const { env, a, b } = pair();
    const c = client(env, 'C');
    c.send({ t: 'sit', seatId: 's03' });
    a.send({ t: 'treat', targetSeatId: 's02' });
    env.advance(9000);
    a.send({ t: 'treat', targetSeatId: 's03' });
    expect(lastError(a)).toBe('rate_limited');
    env.advance(1500);
    a.send({ t: 'treat', targetSeatId: 's03' });
    expect(c.has('treatReceived')).toBe(true);
    expect(b.has('treatReceived')).toBe(true);
  });

  it('ly đặc biệt hết khi đổi tuần trà hoặc khi người nhận đứng dậy', () => {
    const { env, a, b } = pair();
    a.send({ t: 'treat', targetSeatId: 's02' });
    pass(env, [a, b], ROUND_MS);
    expect(env.room.seatStates().find((s) => s.seatId === 's02')?.treated).toBe(false);
    expect(a.has('roundChanged')).toBe(true);

    env.advance(15_000);
    a.send({ t: 'treat', targetSeatId: 's02' });
    b.send({ t: 'stand' });
    expect(env.room.seatStates().find((s) => s.seatId === 's02')?.treated).toBe(false);
  });
});

describe('chuyện', () => {
  it('phải ngồi; có cooldown 1.5s chống spam; chat được liên tục', () => {
    const env = setup();
    const a = client(env, 'A');
    const b = client(env, 'B');
    a.send({ t: 'story', text: 'Hôm nay mình uống trà đá rất mát' });
    expect(lastError(a)).toBe('not_seated');
    a.send({ t: 'sit', seatId: 's01' });
    a.send({ t: 'story', text: 'Hôm nay mình uống trà đá rất mát' });
    const posted = b.of('storyPosted')[0]?.story;
    expect(posted?.text).toBe('Hôm nay mình uống trà đá rất mát');
    expect(posted?.seatId).toBe('s01');
    expect(JSON.stringify(posted)).not.toContain(a.userId);

    // Gửi quá nhanh (< 1.5s) sẽ bị rate_limited
    a.send({ t: 'story', text: 'Chuyện thứ hai quá nhanh' });
    expect(lastError(a)).toBe('rate_limited');

    // Sau 1.5s gửi tiếp thành công (chat liên tục)
    env.advance(1600);
    a.send({ t: 'story', text: 'Chuyện thứ hai gửi thành công' });
    expect(b.of('storyPosted')).toHaveLength(2);
    expect(b.of('storyPosted')[1]?.story.text).toBe('Chuyện thứ hai gửi thành công');

    pass(env, [a, b], ROUND_MS);
    a.send({ t: 'story', text: 'Chuyện của tuần mới' });
    expect(b.of('storyPosted')).toHaveLength(3);
  });

  it('chuyện bị chặn không tính là đã đăng', () => {
    const env = setup();
    const a = client(env);
    a.send({ t: 'sit', seatId: 's01' });
    for (const bad of [
      'xem http://x.vn',
      'gọi 0987654321',
      'a@b.com',
      'đồ ngu',
      '   ',
      'x'.repeat(81),
    ]) {
      a.send({ t: 'story', text: bad });
      expect(lastError(a)).toBe('story_rejected');
    }
    env.advance(6000); // tránh dính chống tràn tin
    a.send({ t: 'story', text: 'Một câu hiền lành' });
    expect(a.has('storyPosted')).toBe(true);
  });

  it('HTML bị làm sạch trước khi lưu và phát', () => {
    const env = setup();
    const a = client(env);
    a.send({ t: 'sit', seatId: 's01' });
    a.send({ t: 'story', text: '<img src=x onerror=alert(1)>Trà ngon<b>!</b>' });
    const text = a.of('storyPosted')[0]?.story.text ?? '';
    expect(text).not.toMatch(/[<>]/);
    expect(text).toContain('Trà ngon');
  });

  it('người vào sau thấy chuyện của tuần này, không thấy chuyện đã ẩn', () => {
    const env = setup();
    const a = client(env, 'A');
    a.send({ t: 'sit', seatId: 's01' });
    a.send({ t: 'story', text: 'Chuyện của A' });
    const late = client(env, 'Late');
    expect(late.of('welcome')[0]?.stories.map((s) => s.text)).toEqual(['Chuyện của A']);
  });
});

describe('báo cáo', () => {
  it('đủ 3 người khác nhau thì ẩn; trùng người, tự báo, chuyện lạ đều bị từ chối', () => {
    const env = setup();
    const author = client(env, 'Author');
    author.send({ t: 'sit', seatId: 's01' });
    author.send({ t: 'story', text: 'Một chuyện hơi kỳ' });
    const id = author.of('storyPosted')[0]?.story.id as string;

    author.send({ t: 'reportStory', storyId: id });
    expect(lastError(author)).toBe('report_failed');

    const reporters = Array.from({ length: REPORTS_TO_HIDE }, (_, i) => client(env, `R${i}`));
    const [r0, r1, r2] = reporters;
    r0?.send({ t: 'reportStory', storyId: id });
    r0?.send({ t: 'reportStory', storyId: id }); // báo lại: không tính thêm
    expect(lastError(r0 as NonNullable<typeof r0>)).toBe('report_failed');
    r1?.send({ t: 'reportStory', storyId: id });
    expect(author.has('storyHidden')).toBe(false);
    r2?.send({ t: 'reportStory', storyId: id });
    expect(author.of('storyHidden')[0]?.storyId).toBe(id);

    r0?.send({ t: 'reportStory', storyId: randomUUID() });
    expect(lastError(r0 as NonNullable<typeof r0>)).toBe('report_failed');

    const late = client(env, 'Late');
    expect(late.of('welcome')[0]?.stories).toEqual([]);
  });
});

describe('khác', () => {
  it('tên vi phạm bộ lọc bị thay bằng tên mặc định; tên được làm sạch', () => {
    const env = setup();
    const bad = client(env, '0987654321');
    expect(bad.of('welcome')[0]?.you.name).toBe('Khách ẩn danh');
    const html = client(env, '<b>Lan</b>');
    expect(html.of('welcome')[0]?.you.name).not.toMatch(/[<>]/);
  });

  it('queueSong tốn 1 tiền lẻ, tối đa 2 bài, link sai bị từ chối', () => {
    const env = setup();
    const a = client(env);

    // Chưa có coin -> no_coins
    a.send({ t: 'queueSong', url: 'https://youtu.be/dQw4w9WgXcQ' });
    expect(lastError(a)).toBe('no_coins');

    // Cấp 5 coins cho a
    for (let r = 1; r <= 5; r++) {
      env.store.addSeatedSeconds(a.userId, r, 1500);
      env.store.settleRound(r, START);
    }

    // Link sai -> bad_message
    a.send({ t: 'queueSong', url: 'not-youtube' });
    expect(lastError(a)).toBe('bad_message');

    // Đặt bài 1 thành công
    a.send({ t: 'queueSong', url: 'https://youtu.be/dQw4w9WgXcQ' });
    expect(a.has('radio')).toBe(true);

    // Đặt bài 2 thành công
    a.send({ t: 'queueSong', url: 'https://youtu.be/dQw4w9WgXcQ?t=30' });

    // Đặt bài 3 -> rate_limited (vượt quá 2 bài)
    a.send({ t: 'queueSong', url: 'https://youtu.be/dQw4w9WgXcQ' });
    expect(lastError(a)).toBe('rate_limited');
  });

  it('chỉ Admin mới có quyền qua bài và tạm dừng, khách thường bị từ chối (forbidden)', () => {
    const env = setup();
    const a = client(env);
    const b = client(env);

    // Khách b thử qua bài -> forbidden
    b.send({ t: 'adminSkip' });
    expect(lastError(b)).toBe('forbidden');

    // Khách b thử dừng bài -> forbidden
    b.send({ t: 'adminPause', pause: true });
    expect(lastError(b)).toBe('forbidden');

    // Đăng nhập mật khẩu sai -> không được cấp quyền
    b.send({ t: 'adminAuth', pass: 'wrong_pass' });
    const failAuth = b.msgs.find((m): m is Extract<ServerMessage, { t: 'adminStatus' }> => m.t === 'adminStatus');
    expect(failAuth).toBeDefined();
    expect(failAuth?.isAdmin).toBe(false);

    // Đăng nhập mật khẩu đúng -> thành công
    b.send({ t: 'adminAuth', pass: 'trada2026' });
    const okAuth = b.msgs.filter((m): m is Extract<ServerMessage, { t: 'adminStatus' }> => m.t === 'adminStatus').pop();
    expect(okAuth).toBeDefined();
    expect(okAuth?.isAdmin).toBe(true);

    // Giờ Admin b có thể dừng và qua bài
    b.send({ t: 'adminPause', pause: true });
    const pauseRadio = a.msgs.filter((m): m is Extract<ServerMessage, { t: 'radio' }> => m.t === 'radio').pop();
    expect(pauseRadio).toBeDefined();
    expect(pauseRadio?.isPaused).toBe(true);

    b.send({ t: 'adminSkip' });
    expect(a.has('radio')).toBe(true);
  });

  it('tự động chuyển bài khi trackEnded và chạy danh sách phát mặc định khi list chờ rỗng', () => {
    const env = setup();
    const a = client(env);

    const current = env.room.getCurrentRadio(START);
    expect(current).toBeDefined();
    expect(current.videoId).toBeDefined();

    // Hết bài (trackEnded) -> tự động chuyển bài tiếp theo trong playlist
    a.send({ t: 'trackEnded', videoId: current.videoId });
    const nextTrack = env.room.getCurrentRadio(START + 1000);
    expect(nextTrack.id).not.toBe(current.id);
  });
});
