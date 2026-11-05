import {
  areNeighbors,
  CHAT_COOLDOWN_MS,
  DEFAULT_ADMIN_PASS,
  DEFAULT_PLAYLIST,
  determineRpsWinner,
  getRound,
  isUuid,
  MSG_BURST,
  NAME_MAX,
  parseYouTubeUrl,
  QUEUE_PER_USER,
  REACT_COOLDOWN_MS,
  sanitizeName,
  SEAT_IDS,
  STALE_MS,
  TREAT_COOLDOWN_MS,
  type ClientMessage,
  type ErrorCode,
  type PublicUser,
  type RadioItem,
  type RpsChoice,
  type SeatState,
  type ServerMessage,
  type Story,
  SEATS,
} from '@tdvh/shared';
import type { DatabaseStore } from './dbStore';
import { FILTER_MESSAGES, type ContentFilter } from './filter';

/** Kênh gửi tới một client; lớp WebSocket bên ngoài cài đặt. Tách ra để test không cần mạng. */
export interface Conn {
  send(msg: ServerMessage): void;
  close(code: number, reason: string): void;
}

export interface Session {
  userId: string;
  user: PublicUser;
  conn: Conn;
  seatId: string | null;
  lastSeen: number;
  recent: number[];
  isAdmin?: boolean;
}

export interface RoomDeps {
  now: () => number;
  store: DatabaseStore;
  filter: ContentFilter;
  newId: () => string;
}

const DEFAULT_NAME = 'Khách ẩn danh';

/**
 * Một quán trà: nguồn sự thật về ghế, phản ứng, chuyện, đãi trà, tiền lẻ và chuỗi ngày.
 */
export class Room {
  private readonly sessions = new Map<string, Session>();
  private readonly seatOwner = new Map<string, Session>();
  private readonly treated = new Set<string>();
  private readonly limits = new Map<string, { react: number; treat: number; chat: number }>();
  private roundIndex: number;
  private lastTickMs: number;
  private defaultTrackIndex = 0;
  private defaultTrackStartedAt: number | null = null;
  private isRadioPaused = false;
  private lastTrackEndedAt = 0;
  private readonly rpsGames = new Map<
    string,
    { p1: Session; p2: Session; p1Choice: RpsChoice | null; p2Choice: RpsChoice | null; createdAt: number }
  >();


  constructor(private readonly deps: RoomDeps) {
    const now = deps.now();
    this.roundIndex = getRound(now).roundIndex;
    this.lastTickMs = now;
  }

  get online(): number {
    return this.sessions.size;
  }

  seatStates(): SeatState[] {
    return SEATS.map((s) => this.seatState(s.id));
  }

  private seatState(seatId: string): SeatState {
    return {
      seatId,
      occupant: this.seatOwner.get(seatId)?.user ?? null,
      treated: this.treated.has(seatId),
    };
  }

  private broadcast(msg: ServerMessage): void {
    for (const s of this.sessions.values()) this.safeSend(s.conn, msg);
  }

  private safeSend(conn: Conn, msg: ServerMessage): void {
    try {
      conn.send(msg);
    } catch {
      // kết nối hỏng: heartbeat sẽ dọn
    }
  }

  private fail(s: Session, code: ErrorCode, message: string): void {
    this.safeSend(s.conn, { t: 'error', code, message });
  }

  // ---------- Vòng đời ----------

  join(conn: Conn, msg: Extract<ClientMessage, { t: 'join' }>): Session {
    const now = this.deps.now();
    const checked = this.deps.filter.check(sanitizeName(msg.name), NAME_MAX);
    const validName = checked.ok ? checked.text : DEFAULT_NAME;

    // Lấy hoặc tạo user trong SQLite, sinh/lấy mã khôi phục
    const { user: userRow, code: recoveryCode } = this.deps.store.getOrCreateUser(
      msg.userId,
      validName,
      msg.avatar,
      now,
    );

    const user: PublicUser = {
      name: userRow.name,
      avatar: userRow.avatar,
      mood: msg.mood,
    };
    const session: Session = {
      userId: msg.userId,
      user,
      conn,
      seatId: null,
      lastSeen: now,
      recent: [now],
    };

    // Cùng userId vào lần nữa (đổi tab, reconnect): bản mới thay bản cũ và giữ ghế
    const old = this.sessions.get(msg.userId);
    if (old) {
      session.seatId = old.seatId;
      if (old.seatId) this.seatOwner.set(old.seatId, session);
      this.sessions.set(msg.userId, session);
      this.fail(old, 'replaced', 'Bạn vừa mở quán ở một tab khác.');
      try {
        old.conn.close(4000, 'replaced');
      } catch {
        // bỏ qua
      }
    } else {
      this.sessions.set(msg.userId, session);
    }

    const round = getRound(now);
    const stats = this.deps.store.getUserStats(msg.userId, now);
    const radioCurrent = this.deps.store.getCurrentRadio();
    const radioQueue = this.deps.store.getRadioQueue();

    this.safeSend(conn, {
      t: 'welcome',
      serverTime: now,
      you: user,
      youSeatId: session.seatId,
      seats: this.seatStates(),
      online: this.online,
      round,
      stories: this.deps.store.listVisible([round.roundIndex, round.roundIndex - 1]),
      coins: stats.coins,
      streak: stats.streak,
      recoveryCode,
    });
    this.safeSend(conn, {
      t: 'radio',
      current: radioCurrent,
      queue: radioQueue as RadioItem[],
      isPaused: this.isRadioPaused,
    });
    if (session.seatId) this.broadcast({ t: 'seatChanged', seat: this.seatState(session.seatId) });
    this.broadcast({ t: 'online', online: this.online });
    return session;
  }

  leave(session: Session): void {
    if (this.sessions.get(session.userId) !== session) return;
    this.sessions.delete(session.userId);
    if (session.seatId) this.vacate(session);
    this.broadcast({ t: 'online', online: this.online });
  }

  private vacate(session: Session): void {
    const seatId = session.seatId;
    if (!seatId) return;
    session.seatId = null;
    if (this.seatOwner.get(seatId) === session) this.seatOwner.delete(seatId);
    this.treated.delete(seatId);
    this.broadcast({ t: 'seatChanged', seat: this.seatState(seatId) });
  }

  /** Gọi mỗi giây: tính thời gian ngồi cho người đang ngồi, dọn stale sessions, chốt tuần trà. */
  tick(): void {
    const now = this.deps.now();
    const dtSeconds = Math.max(0, Math.floor((now - this.lastTickMs) / 1000));
    this.lastTickMs = now;

    // Cộng thời gian ngồi cho các user đang ngồi
    if (dtSeconds > 0) {
      for (const s of this.seatOwner.values()) {
        this.deps.store.addSeatedSeconds(s.userId, this.roundIndex, dtSeconds);
      }
    }

    // Kiểm tra timeout session
    for (const s of [...this.sessions.values()]) {
      if (now - s.lastSeen > STALE_MS) {
        try {
          s.conn.close(4001, 'timeout');
        } catch {
          // bỏ qua
        }
        this.leave(s);
      }
    }
    for (const [uid, l] of this.limits) {
      if (!this.sessions.has(uid) && now - Math.max(l.react, l.treat, l.chat) > 60_000) {
        this.limits.delete(uid);
      }
    }

    const round = getRound(now);
    if (round.roundIndex !== this.roundIndex) {
      const oldRound = this.roundIndex;
      this.roundIndex = round.roundIndex;

      // Chốt tuần trà cũ: xét thưởng tiền lẻ và chuỗi ngày
      const awarded = this.deps.store.settleRound(oldRound, now);
      for (const item of awarded) {
        const sess = this.sessions.get(item.userId);
        if (sess) {
          const stats = this.deps.store.getUserStats(item.userId, now);
          this.safeSend(sess.conn, {
            t: 'coinsUpdated',
            coins: stats.coins,
            streak: stats.streak,
            todayFullRounds: stats.todayFullRounds,
            totalFullRounds: stats.totalFullRounds,
          });
        }
      }

      // Xoá ly trà đặc biệt của tuần cũ
      const hadTreat = [...this.treated];
      this.treated.clear();
      for (const id of hadTreat) this.broadcast({ t: 'seatChanged', seat: this.seatState(id) });
      this.broadcast({ t: 'roundChanged', round });
    }
  }

  // ---------- Xử lý tin nhắn ----------

  handle(s: Session, msg: ClientMessage): void {
    if (this.sessions.get(s.userId) !== s) return;

    const now = this.deps.now();
    s.recent = s.recent.filter((t) => now - t < MSG_BURST.windowMs);
    s.recent.push(now);
    if (s.recent.length > MSG_BURST.max) {
      s.conn.close(1008, 'flood');
      this.leave(s);
      return;
    }
    s.lastSeen = now;

    switch (msg.t) {
      case 'ping':
        this.safeSend(s.conn, { t: 'pong', serverTime: now });
        return;
      case 'sit':
        return this.onSit(s, msg.seatId);
      case 'stand':
        return this.vacate(s);
      case 'react':
        return this.onReact(s, msg.kind, msg.targetSeatId, now);
      case 'story':
        return this.onStory(s, msg.text, now);
      case 'treat':
        return this.onTreat(s, msg.targetSeatId, now);
      case 'reportStory':
        return this.onReport(s, msg.storyId, now);
      case 'getProfile':
        return this.onGetProfile(s, now);
      case 'updateProfile':
        return this.onUpdateProfile(s, msg.name, msg.avatar, msg.mood);
      case 'recover':
        return this.onRecover(s, msg.code, now);
      case 'getLeaderboard':
        return this.onGetLeaderboard(s, now);
      case 'queueSong':
        return this.onQueueSong(s, msg.url, now);
      case 'adminAuth':
        return this.onAdminAuth(s, msg.pass);
      case 'adminSkip':
        return this.onAdminSkip(s, now);
      case 'adminPause':
        return this.onAdminPause(s, msg.pause);
      case 'trackEnded':
        return this.onTrackEnded(s, msg.videoId, now);
      case 'rpsInvite':
        return this.onRpsInvite(s, msg.targetSeatId, now);
      case 'rpsMove':
        return this.onRpsMove(s, msg.gameId, msg.choice);
      case 'treatAll':
        return this.onTreatAll(s);
      case 'postLetter':
        return this.onPostLetter(s, msg.text, now);
      case 'drawLetter':
        return this.onDrawLetter(s);
      case 'getGuestbook':
        return this.onGetGuestbook(s);
      case 'signGuestbook':
        return this.onSignGuestbook(s, msg.text, now);
      case 'xiangqiInvite':
        return this.onXiangqiInvite(s, msg.targetSeatId);


      case 'join':
        return this.fail(s, 'bad_message', 'Bạn đã vào quán rồi.');
    }
  }

  private limit(s: Session): { react: number; treat: number; chat: number } {
    let l = this.limits.get(s.userId);
    if (!l) {
      l = { react: 0, treat: 0, chat: 0 };
      this.limits.set(s.userId, l);
    }
    return l;
  }

  private onSit(s: Session, seatId: string): void {
    if (!SEAT_IDS.has(seatId)) return this.fail(s, 'bad_message', 'Chỗ này không có.');
    if (s.seatId === seatId) return;
    const owner = this.seatOwner.get(seatId);
    if (owner && owner !== s) return this.fail(s, 'seat_taken', 'Chỗ này vừa có người ngồi rồi.');
    this.vacate(s);
    s.seatId = seatId;
    this.seatOwner.set(seatId, s);
    this.broadcast({ t: 'seatChanged', seat: this.seatState(seatId) });
  }

  private onReact(
    s: Session,
    kind: Extract<ClientMessage, { t: 'react' }>['kind'],
    target: string | undefined,
    now: number,
  ): void {
    if (!s.seatId) return this.fail(s, 'not_seated', 'Bạn ngồi xuống rồi hãy phản ứng nhé.');
    if (target !== undefined && (target === s.seatId || !this.seatOwner.has(target))) {
      return this.fail(s, 'bad_target', 'Chỗ này không có ai để gửi tới.');
    }
    const l = this.limit(s);
    if (now - l.react < REACT_COOLDOWN_MS) {
      return this.fail(s, 'rate_limited', 'Từ từ thôi, mỗi 2 giây một phản ứng nhé.');
    }
    l.react = now;
    this.broadcast(
      target === undefined
        ? { t: 'reaction', fromSeatId: s.seatId, kind }
        : { t: 'reaction', fromSeatId: s.seatId, toSeatId: target, kind },
    );
  }

  private onStory(s: Session, text: string, now: number): void {
    if (!s.seatId) return this.fail(s, 'not_seated', 'Bạn ngồi xuống rồi hãy trò chuyện nhé.');
    const l = this.limit(s);
    if (now - l.chat < CHAT_COOLDOWN_MS) {
      return this.fail(s, 'rate_limited', 'Từ từ thôi, mỗi 1.5 giây một câu nhé.');
    }
    const r = this.deps.filter.check(text);
    if (!r.ok) return this.fail(s, 'story_rejected', FILTER_MESSAGES[r.reason]);
    l.chat = now;
    const round = getRound(now).roundIndex;
    const story: Story = {
      id: this.deps.newId(),
      roundIndex: round,
      text: r.text,
      createdAt: now,
      seatId: s.seatId,
    };
    this.deps.store.insert(story, s.userId);
    this.broadcast({ t: 'storyPosted', story });
  }

  private onTreat(s: Session, target: string, now: number): void {
    if (!s.seatId) return this.fail(s, 'not_seated', 'Bạn ngồi xuống rồi hãy đãi trà nhé.');
    const recipient = this.seatOwner.get(target);
    if (!recipient || recipient === s || !areNeighbors(s.seatId, target)) {
      return this.fail(s, 'bad_target', 'Chỉ đãi trà được người ngồi gần bạn.');
    }
    const l = this.limit(s);
    if (now - l.treat < TREAT_COOLDOWN_MS) {
      return this.fail(s, 'rate_limited', 'Đợi chút rồi hãy đãi tiếp nhé.');
    }

    // Trừ 1 tiền lẻ ở database (an toàn bằng transaction)
    const success = this.deps.store.deductCoins(s.userId, 1);
    if (!success) {
      return this.fail(s, 'no_coins', 'Bạn không đủ tiền lẻ để đãi trà (cần 1 tiền lẻ).');
    }

    l.treat = now;
    this.treated.add(target);
    this.broadcast({ t: 'seatChanged', seat: this.seatState(target) });
    this.safeSend(recipient.conn, { t: 'treatReceived', toSeatId: target });

    // Cập nhật lại số tiền lẻ cho người tặng
    const stats = this.deps.store.getUserStats(s.userId, now);
    this.safeSend(s.conn, {
      t: 'coinsUpdated',
      coins: stats.coins,
      streak: stats.streak,
      todayFullRounds: stats.todayFullRounds,
      totalFullRounds: stats.totalFullRounds,
    });
  }

  private onReport(s: Session, storyId: string, now: number): void {
    if (!isUuid(storyId)) return this.fail(s, 'bad_message', 'Chuyện không hợp lệ.');
    const r = this.deps.store.report(storyId, s.userId, now);
    switch (r.status) {
      case 'unknown':
        return this.fail(s, 'report_failed', 'Không tìm thấy chuyện này.');
      case 'own':
        return this.fail(s, 'report_failed', 'Bạn không báo cáo chuyện của mình được.');
      case 'duplicate':
      case 'already_hidden':
        return this.fail(s, 'report_failed', 'Chuyện này đã được báo rồi.');
      case 'ok':
        if (r.hidden) this.broadcast({ t: 'storyHidden', storyId });
    }
  }

  private onGetProfile(s: Session, now: number): void {
    const stats = this.deps.store.getUserStats(s.userId, now);
    this.safeSend(s.conn, {
      t: 'profileInfo',
      name: s.user.name,
      avatar: s.user.avatar,
      mood: s.user.mood,
      coins: stats.coins,
      streak: stats.streak,
      recoveryCode: stats.recoveryCode,
      todayFullRounds: stats.todayFullRounds,
      totalFullRounds: stats.totalFullRounds,
    });
  }

  private onUpdateProfile(s: Session, rawName: string, avatar: string, mood: string): void {
    const checked = this.deps.filter.check(sanitizeName(rawName), NAME_MAX);
    if (!checked.ok) return this.fail(s, 'bad_message', 'Tên không hợp lệ.');
    s.user.name = checked.text;
    s.user.avatar = avatar;
    s.user.mood = mood;
    this.deps.store.updateProfile(s.userId, s.user.name, s.user.avatar);
    if (s.seatId) {
      this.broadcast({ t: 'seatChanged', seat: this.seatState(s.seatId) });
    }
    const stats = this.deps.store.getUserStats(s.userId, this.deps.now());
    this.safeSend(s.conn, {
      t: 'profileInfo',
      name: s.user.name,
      avatar: s.user.avatar,
      mood: s.user.mood,
      coins: stats.coins,
      streak: stats.streak,
      recoveryCode: stats.recoveryCode,
      todayFullRounds: stats.todayFullRounds,
      totalFullRounds: stats.totalFullRounds,
    });
  }

  private onRecover(s: Session, code: string, now: number): void {
    const targetUser = this.deps.store.findUserByRecoveryCode(code);
    if (!targetUser) {
      return this.fail(s, 'bad_message', 'Mã khôi phục không tồn tại.');
    }
    if (targetUser.id === s.userId) {
      return this.fail(s, 'bad_message', 'Đây là mã của tài khoản hiện tại.');
    }

    // Giải phóng ghế cũ nếu đang ngồi
    this.vacate(s);
    this.sessions.delete(s.userId);

    // Chuyển session sang userId đã khôi phục
    s.userId = targetUser.id;
    s.user.name = targetUser.name;
    s.user.avatar = targetUser.avatar;

    // Nếu userId này đang có kết nối khác, thay thế nó
    const existing = this.sessions.get(targetUser.id);
    if (existing) {
      this.fail(existing, 'replaced', 'Tài khoản được đăng nhập từ nơi khác.');
      try {
        existing.conn.close(4000, 'replaced');
      } catch {
        // bỏ qua
      }
    }

    this.sessions.set(targetUser.id, s);
    const stats = this.deps.store.getUserStats(targetUser.id, now);

    this.safeSend(s.conn, {
      t: 'welcome',
      serverTime: now,
      you: s.user,
      youSeatId: null,
      seats: this.seatStates(),
      online: this.online,
      round: getRound(now),
      stories: this.deps.store.listVisible([this.roundIndex, this.roundIndex - 1]),
      coins: stats.coins,
      streak: stats.streak,
      recoveryCode: stats.recoveryCode,
    });

    this.safeSend(s.conn, {
      t: 'profileInfo',
      name: s.user.name,
      avatar: s.user.avatar,
      mood: s.user.mood,
      coins: stats.coins,
      streak: stats.streak,
      recoveryCode: stats.recoveryCode,
      todayFullRounds: stats.todayFullRounds,
      totalFullRounds: stats.totalFullRounds,
    });
  }

  private onGetLeaderboard(s: Session, now: number): void {
    const board = this.deps.store.getWeeklyLeaderboard(now);
    this.safeSend(s.conn, {
      t: 'leaderboard',
      week: board.week,
      top: board.top,
    });
  }

  getCurrentRadio(now: number): RadioItem {
    const fromDb = this.deps.store.getCurrentRadio();
    if (fromDb) return fromDb;

    const nextQueued = this.deps.store.startNextRadio(now);
    if (nextQueued) return nextQueued;

    if (!this.defaultTrackStartedAt) {
      this.defaultTrackStartedAt = now;
    }
    const def = DEFAULT_PLAYLIST[this.defaultTrackIndex % DEFAULT_PLAYLIST.length]!;
    return {
      id: `default-${this.defaultTrackIndex}`,
      videoId: def.videoId,
      startSec: 0,
      startedAt: this.defaultTrackStartedAt,
    };
  }

  nextTrack(now: number): void {
    const nextQueued = this.deps.store.startNextRadio(now);
    if (!nextQueued) {
      this.defaultTrackIndex = (this.defaultTrackIndex + 1) % DEFAULT_PLAYLIST.length;
      this.defaultTrackStartedAt = now;
    }
    this.broadcastRadio(now);
  }

  broadcastRadio(now: number): void {
    const current = this.getCurrentRadio(now);
    const queue = this.deps.store.getRadioQueue();
    this.broadcast({
      t: 'radio',
      current,
      queue: queue as RadioItem[],
      isPaused: this.isRadioPaused,
    });
  }

  private onAdminAuth(s: Session, pass: string): void {
    const adminPass = process.env.ADMIN_KEY || DEFAULT_ADMIN_PASS;
    if (pass === adminPass) {
      s.isAdmin = true;
      this.safeSend(s.conn, {
        t: 'adminStatus',
        isAdmin: true,
        message: 'Đăng nhập quyền Chủ Quán thành công 👑',
      });
    } else {
      s.isAdmin = false;
      this.safeSend(s.conn, {
        t: 'adminStatus',
        isAdmin: false,
        message: 'Mật khẩu Chủ Quán không chính xác.',
      });
    }
  }

  private onAdminSkip(s: Session, now: number): void {
    if (!s.isAdmin) {
      return this.fail(s, 'forbidden', 'Chỉ chủ quán (Admin) mới có quyền qua bài.');
    }
    this.nextTrack(now);
  }

  private onAdminPause(s: Session, pause: boolean): void {
    if (!s.isAdmin) {
      return this.fail(s, 'forbidden', 'Chỉ chủ quán (Admin) mới có quyền dừng hoặc phát.');
    }
    this.isRadioPaused = pause;
    this.broadcastRadio(this.deps.now());
  }

  private onTrackEnded(s: Session, videoId: string, now: number): void {
    if (now - this.lastTrackEndedAt < 2000) return;
    const current = this.getCurrentRadio(now);
    if (current && current.videoId === videoId) {
      this.lastTrackEndedAt = now;
      this.nextTrack(now);
    }
  }

  private onQueueSong(s: Session, url: string, now: number): void {
    const parsed = parseYouTubeUrl(url);
    if (!parsed) {
      return this.fail(s, 'bad_message', 'Link YouTube không hợp lệ.');
    }

    if (this.deps.store.countUserQueuedSongs(s.userId) >= QUEUE_PER_USER) {
      return this.fail(s, 'rate_limited', `Bạn chỉ được đặt tối đa ${QUEUE_PER_USER} bài trong hàng chờ.`);
    }

    const songId = this.deps.newId();
    const success = this.deps.store.enqueueSong(songId, s.userId, parsed.videoId, parsed.startSec, now);
    if (!success) {
      return this.fail(s, 'no_coins', 'Bạn cần 1 tiền lẻ để đặt bài lên loa.');
    }

    // Nếu chưa có bài nào của khách đang phát, bắt đầu phát bài này luôn
    let current = this.deps.store.getCurrentRadio();
    if (!current) {
      current = this.deps.store.startNextRadio(now);
    }

    this.broadcastRadio(now);

    const stats = this.deps.store.getUserStats(s.userId, now);
    this.safeSend(s.conn, {
      t: 'coinsUpdated',
      coins: stats.coins,
      streak: stats.streak,
      todayFullRounds: stats.todayFullRounds,
      totalFullRounds: stats.totalFullRounds,
    });
  }

  private onRpsInvite(s: Session, targetSeatId: string, now: number): void {
    const targetSession = this.seatOwner.get(targetSeatId);
    if (!targetSession || targetSession === s) {
      return this.fail(s, 'bad_target', 'Không tìm thấy người ngồi ở ghế này để thách đấu.');
    }

    const gameId = this.deps.newId();
    this.rpsGames.set(gameId, {
      p1: s,
      p2: targetSession,
      p1Choice: null,
      p2Choice: null,
      createdAt: now,
    });

    this.safeSend(targetSession.conn, {
      t: 'rpsInvited',
      gameId,
      fromName: s.user.name,
      fromSeatId: s.seatId ?? '',
    });
  }
  private onXiangqiInvite(s: Session, targetSeatId: string): void {
    const targetSession = this.seatOwner.get(targetSeatId);
    if (!targetSession || targetSession === s) {
      return this.fail(s, 'bad_target', 'Không tìm thấy người ngồi ở ghế này để mời chơi cờ.');
    }
    this.safeSend(targetSession.conn, {
      t: 'xiangqiInvited',
      fromName: s.user.name,
      fromSeatId: s.seatId ?? '',
    });
  }


  private onRpsMove(s: Session, gameId: string, choice: RpsChoice): void {
    const game = this.rpsGames.get(gameId);
    if (!game) return;

    if (game.p1 === s) {
      game.p1Choice = choice;
    } else if (game.p2 === s) {
      game.p2Choice = choice;
    } else {
      return;
    }

    if (game.p1Choice && game.p2Choice) {
      const p1Result = determineRpsWinner(game.p1Choice, game.p2Choice);
      const p2Result = determineRpsWinner(game.p2Choice, game.p1Choice);

      this.safeSend(game.p1.conn, {
        t: 'rpsResult',
        gameId,
        myChoice: game.p1Choice,
        opponentChoice: game.p2Choice,
        result: p1Result,
        opponentName: game.p2.user.name,
      });

      this.safeSend(game.p2.conn, {
        t: 'rpsResult',
        gameId,
        myChoice: game.p2Choice,
        opponentChoice: game.p1Choice,
        result: p2Result,
        opponentName: game.p1.user.name,
      });

      this.rpsGames.delete(gameId);
    }
  }

  private onTreatAll(s: Session): void {
    for (const seatId of SEAT_IDS) {
      this.treated.add(seatId);
      this.broadcast({ t: 'seatChanged', seat: this.seatState(seatId) });
    }

    this.broadcast({
      t: 'treatAllReceived',
      fromName: s.user.name,
      fromSeatId: s.seatId ?? undefined,
    });
  }

  private onPostLetter(s: Session, text: string, now: number): void {
    const res = this.deps.filter.check(text.trim(), 400);
    if (!res.ok) return;
    this.deps.store.postLetter(this.deps.newId(), s.userId, res.text, now);
  }

  private onDrawLetter(s: Session): void {
    const letter = this.deps.store.drawRandomLetter(s.userId);
    this.safeSend(s.conn, {
      t: 'letterDrawn',
      letter,
    });
  }

  private onGetGuestbook(s: Session): void {
    const entries = this.deps.store.getGuestbook(20);
    this.safeSend(s.conn, {
      t: 'guestbook',
      entries,
    });
  }

  private onSignGuestbook(s: Session, text: string, now: number): void {
    const res = this.deps.filter.check(text.trim(), 100);
    if (!res.ok) return;
    this.deps.store.signGuestbook(this.deps.newId(), s.userId, s.user.name, s.user.avatar, res.text, now);
    const entries = this.deps.store.getGuestbook(20);
    this.broadcast({
      t: 'guestbook',
      entries,
    });
  }
}
