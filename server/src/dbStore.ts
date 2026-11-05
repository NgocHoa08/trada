import Database from 'better-sqlite3';
import {
  DAILY_COIN_CAP,
  FULL_ROUND_RATIO,
  ROUND_MS,
  REPORTS_TO_HIDE,
  generateRecoveryCode,
  getPreviousDayString,
  getVnDayString,
  getVnWeekId,
  normalizeRecoveryCode,
  type LeaderboardEntry,
  type Story,
} from '@tdvh/shared';

export interface UserRow {
  id: string;
  name: string;
  avatar: string;
  coins: number;
  created_at: number;
  last_seen_at: number;
}

export interface UserStats {
  coins: number;
  streak: number;
  recoveryCode: string;
  todayFullRounds: number;
  totalFullRounds: number;
}

export type ReportResult =
  | { status: 'ok'; hidden: boolean }
  | { status: 'unknown' | 'own' | 'duplicate' | 'already_hidden' };

export class DatabaseStore {
  private readonly db: Database.Database;

  constructor(path: string) {
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.initTables();
  }

  private initTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        avatar TEXT NOT NULL,
        coins INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        last_seen_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS recovery_codes (
        code TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS round_presence (
        user_id TEXT NOT NULL,
        round_index INTEGER NOT NULL,
        seated_seconds INTEGER NOT NULL DEFAULT 0,
        awarded INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, round_index)
      );
      CREATE INDEX IF NOT EXISTS idx_presence_round ON round_presence(round_index);

      CREATE TABLE IF NOT EXISTS daily_stats (
        user_id TEXT NOT NULL,
        day TEXT NOT NULL,
        full_rounds INTEGER NOT NULL DEFAULT 0,
        coins_earned INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, day)
      );
      CREATE INDEX IF NOT EXISTS idx_daily_day ON daily_stats(day);

      CREATE TABLE IF NOT EXISTS streaks (
        user_id TEXT PRIMARY KEY,
        current INTEGER NOT NULL DEFAULT 0,
        best INTEGER NOT NULL DEFAULT 0,
        last_day TEXT
      );

      CREATE TABLE IF NOT EXISTS stories (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        round_index INTEGER NOT NULL,
        text TEXT NOT NULL,
        hidden INTEGER NOT NULL DEFAULT 0,
        seat_id TEXT,
        created_at INTEGER NOT NULL
      );
      DROP INDEX IF EXISTS stories_user_round;
      CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(user_id);
      CREATE INDEX IF NOT EXISTS stories_round ON stories(round_index);

      CREATE TABLE IF NOT EXISTS reports (
        story_id TEXT NOT NULL,
        reporter_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (story_id, reporter_id)
      );

      CREATE TABLE IF NOT EXISTS radio_queue (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        video_id TEXT NOT NULL,
        start_sec INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'queued', -- queued, playing, finished
        started_at INTEGER,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_radio_status ON radio_queue(status);
      CREATE TABLE IF NOT EXISTS letters (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        text TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_letters_created ON letters(created_at);

      CREATE TABLE IF NOT EXISTS guestbook (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        avatar TEXT NOT NULL,
        text TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_guestbook_created ON guestbook(created_at);

    `);
  }

  // ---------- User & Recovery ----------

  getOrCreateUser(userId: string, name: string, avatar: string, now: number): { user: UserRow; code: string } {
    const tx = this.db.transaction(() => {
      let user = this.db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow | undefined;
      if (!user) {
        this.db
          .prepare('INSERT INTO users (id, name, avatar, coins, created_at, last_seen_at) VALUES (?, ?, ?, 0, ?, ?)')
          .run(userId, name, avatar, now, now);
        user = { id: userId, name, avatar, coins: 0, created_at: now, last_seen_at: now };
      } else {
        this.db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?').run(now, userId);
      }

      let codeRow = this.db.prepare('SELECT code FROM recovery_codes WHERE user_id = ?').get(userId) as
        | { code: string }
        | undefined;
      if (!codeRow) {
        let code = generateRecoveryCode();
        while (this.db.prepare('SELECT 1 FROM recovery_codes WHERE code = ?').get(code)) {
          code = generateRecoveryCode();
        }
        this.db.prepare('INSERT INTO recovery_codes (code, user_id) VALUES (?, ?)').run(code, userId);
        codeRow = { code };
      }

      return { user, code: codeRow.code };
    });
    return tx();
  }

  updateProfile(userId: string, name: string, avatar: string): void {
    this.db.prepare('UPDATE users SET name = ?, avatar = ? WHERE id = ?').run(name, avatar, userId);
  }

  findUserByRecoveryCode(codeRaw: string): UserRow | null {
    const code = normalizeRecoveryCode(codeRaw);
    const row = this.db
      .prepare('SELECT u.* FROM users u JOIN recovery_codes r ON u.id = r.user_id WHERE r.code = ?')
      .get(code) as UserRow | undefined;
    return row ?? null;
  }

  getUserStats(userId: string, nowMs: number): UserStats {
    const user = this.db.prepare('SELECT coins FROM users WHERE id = ?').get(userId) as
      | { coins: number }
      | undefined;
    const coins = user?.coins ?? 0;

    const codeRow = this.db.prepare('SELECT code FROM recovery_codes WHERE user_id = ?').get(userId) as
      | { code: string }
      | undefined;
    const recoveryCode = codeRow?.code ?? '';

    // Chuỗi ngày
    const streakRow = this.db.prepare('SELECT current, last_day FROM streaks WHERE user_id = ?').get(userId) as
      | { current: number; last_day: string | null }
      | undefined;
    let currentStreak = streakRow?.current ?? 0;
    const today = getVnDayString(nowMs);
    const yesterday = getPreviousDayString(today);
    // Nếu ngày cuối cùng ngồi đủ không phải là hôm nay hay hôm qua -> chuỗi đã đứt về 0
    if (streakRow?.last_day && streakRow.last_day !== today && streakRow.last_day !== yesterday) {
      currentStreak = 0;
    }

    const todayStat = this.db
      .prepare('SELECT full_rounds FROM daily_stats WHERE user_id = ? AND day = ?')
      .get(userId, today) as { full_rounds: number } | undefined;
    const todayFullRounds = todayStat?.full_rounds ?? 0;

    const totalStat = this.db
      .prepare('SELECT SUM(full_rounds) as total FROM daily_stats WHERE user_id = ?')
      .get(userId) as { total: number | null } | undefined;
    const totalFullRounds = totalStat?.total ?? 0;

    return {
      coins,
      streak: currentStreak,
      recoveryCode,
      todayFullRounds,
      totalFullRounds,
    };
  }

  // ---------- Tiến trình ngồi & Tiền lẻ ----------

  /**
   * Cộng dồn số giây ngồi cho người dùng trong tuần trà.
   */
  addSeatedSeconds(userId: string, roundIndex: number, seconds: number): void {
    if (seconds <= 0) return;
    this.db
      .prepare(
        `INSERT INTO round_presence (user_id, round_index, seated_seconds, awarded)
         VALUES (?, ?, ?, 0)
         ON CONFLICT(user_id, round_index) DO UPDATE SET
         seated_seconds = seated_seconds + excluded.seated_seconds`,
      )
      .run(userId, roundIndex, seconds);
  }

  /**
   * Chốt tuần trà: Kiểm tra những người ngồi đủ (≥ 80% thời gian = 1440s),
   * cộng +1 tiền lẻ (nếu chưa vượt daily cap 10), cập nhật chuỗi ngày và thống kê.
   * Chạy trong transaction.
   */
  settleRound(roundIndex: number, nowMs: number): { userId: string; coinsEarned: number }[] {
    const minSeconds = (ROUND_MS / 1000) * FULL_ROUND_RATIO; // 1440s
    const today = getVnDayString(nowMs);
    const yesterday = getPreviousDayString(today);

    const tx = this.db.transaction(() => {
      // Lấy những người ngồi đủ mà chưa được trao thưởng
      const candidates = this.db
        .prepare(
          `SELECT user_id, seated_seconds FROM round_presence
           WHERE round_index = ? AND awarded = 0 AND seated_seconds >= ?`,
        )
        .all(roundIndex, minSeconds) as { user_id: string; seated_seconds: number }[];

      const awardedUsers: { userId: string; coinsEarned: number }[] = [];

      for (const cand of candidates) {
        // Đánh dấu đã chốt thưởng
        this.db
          .prepare('UPDATE round_presence SET awarded = 1 WHERE user_id = ? AND round_index = ?')
          .run(cand.user_id, roundIndex);

        // Kiểm tra daily stats
        let dStat = this.db
          .prepare('SELECT full_rounds, coins_earned FROM daily_stats WHERE user_id = ? AND day = ?')
          .get(cand.user_id, today) as { full_rounds: number; coins_earned: number } | undefined;

        if (!dStat) {
          this.db
            .prepare(
              'INSERT INTO daily_stats (user_id, day, full_rounds, coins_earned) VALUES (?, ?, 0, 0)',
            )
            .run(cand.user_id, today);
          dStat = { full_rounds: 0, coins_earned: 0 };
        }

        const canEarnCoin = dStat.coins_earned < DAILY_COIN_CAP;
        const coinToAdd = canEarnCoin ? 1 : 0;

        // Cập nhật coins cho user
        if (coinToAdd > 0) {
          this.db.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').run(coinToAdd, cand.user_id);
        }

        // Cập nhật daily_stats
        this.db
          .prepare(
            `UPDATE daily_stats SET full_rounds = full_rounds + 1, coins_earned = coins_earned + ?
             WHERE user_id = ? AND day = ?`,
          )
          .run(coinToAdd, cand.user_id, today);

        // Cập nhật chuỗi ngày (streaks)
        const streakRow = this.db
          .prepare('SELECT current, best, last_day FROM streaks WHERE user_id = ?')
          .get(cand.user_id) as { current: number; best: number; last_day: string | null } | undefined;

        let newCurrent = 1;
        let best = 1;
        if (streakRow) {
          if (streakRow.last_day === today) {
            newCurrent = streakRow.current; // đã tính ngày hôm nay rồi
          } else if (streakRow.last_day === yesterday) {
            newCurrent = streakRow.current + 1; // nối tiếp ngày hôm qua
          } else {
            newCurrent = 1; // gián đoạn, bắt đầu lại từ 1
          }
          best = Math.max(streakRow.best, newCurrent);
          this.db
            .prepare('UPDATE streaks SET current = ?, best = ?, last_day = ? WHERE user_id = ?')
            .run(newCurrent, best, today, cand.user_id);
        } else {
          this.db
            .prepare('INSERT INTO streaks (user_id, current, best, last_day) VALUES (?, 1, 1, ?)')
            .run(cand.user_id, today);
        }

        awardedUsers.push({ userId: cand.user_id, coinsEarned: coinToAdd });
      }

      return awardedUsers;
    });

    return tx();
  }

  /** Trừ tiền lẻ (dùng cho đãi trà, đặt bài loa). Đảm bảo số dư không âm. */
  deductCoins(userId: string, amount: number): boolean {
    if (amount <= 0) return true;
    const tx = this.db.transaction(() => {
      const row = this.db.prepare('SELECT coins FROM users WHERE id = ?').get(userId) as
        | { coins: number }
        | undefined;
      if (!row || row.coins < amount) return false;
      this.db.prepare('UPDATE users SET coins = coins - ? WHERE id = ?').run(amount, userId);
      return true;
    });
    return tx();
  }
  /** Cộng tiền lẻ (điểm danh, bốc quẻ, ủng hộ quán). */
  addCoins(userId: string, amount: number): void {
    if (amount <= 0) return;
    this.db.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').run(amount, userId);
  }


  // ---------- Khách quen của tuần (Bảng xếp hạng Top 10) ----------

  getWeeklyLeaderboard(nowMs: number): { week: string; top: LeaderboardEntry[] } {
    const weekId = getVnWeekId(nowMs);
    // Tính tổng số tuần trà ngồi đủ trong tuần (mỗi ngày tối đa 16 tuần trà = 8 giờ)
    // Tuần bắt đầu lúc 4h sáng thứ Hai (weekId: YYYY-MM-DD của ngày thứ Hai đó)
    // Để chính xác: Gom nhóm theo daily_stats thuộc các ngày từ thứ Hai đến Chủ Nhật
    const [wy, wm, wd] = weekId.split('-').map(Number);
    const monDate = new Date(Date.UTC(wy!, wm! - 1, wd!));

    const daysInWeek: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monDate.getTime() + i * 86_400_000);
      const dy = d.getUTCFullYear();
      const dm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      daysInWeek.push(`${dy}-${dm}-${dd}`);
    }

    const marks = daysInWeek.map(() => '?').join(',');
    const rows = this.db
      .prepare(
        `SELECT u.id as userId, u.name, u.avatar,
                SUM(MIN(d.full_rounds, 16)) as roundsCount
         FROM daily_stats d
         JOIN users u ON d.user_id = u.id
         WHERE d.day IN (${marks})
         GROUP BY d.user_id
         HAVING roundsCount > 0
         ORDER BY roundsCount DESC, u.created_at ASC
         LIMIT 10`,
      )
      .all(...daysInWeek) as LeaderboardEntry[];

    return { week: weekId, top: rows };
  }

  // ---------- Chuyện & Báo cáo ----------

  hasPosted(userId: string, roundIndex: number): boolean {
    return (
      this.db
        .prepare('SELECT 1 FROM stories WHERE user_id = ? AND round_index = ?')
        .get(userId, roundIndex) !== undefined
    );
  }

  insert(story: Story, userId: string): boolean {
    try {
      this.db
        .prepare(
          'INSERT INTO stories (id, user_id, round_index, text, hidden, seat_id, created_at) VALUES (?, ?, ?, ?, 0, ?, ?)',
        )
        .run(story.id, userId, story.roundIndex, story.text, story.seatId, story.createdAt);
      return true;
    } catch (e) {
      if (e instanceof Error && 'code' in e && String(e.code).startsWith('SQLITE_CONSTRAINT')) return false;
      throw e;
    }
  }

  listVisible(roundIndexes: readonly number[]): Story[] {
    if (roundIndexes.length === 0) return [];
    const marks = roundIndexes.map(() => '?').join(',');
    const rows = this.db
      .prepare(
        `SELECT id, round_index, text, seat_id, created_at FROM stories
         WHERE hidden = 0 AND round_index IN (${marks}) ORDER BY created_at ASC`,
      )
      .all(...roundIndexes) as {
      id: string;
      round_index: number;
      text: string;
      seat_id: string | null;
      created_at: number;
    }[];
    return rows.map((r) => ({
      id: r.id,
      roundIndex: r.round_index,
      text: r.text,
      createdAt: r.created_at,
      seatId: r.seat_id,
    }));
  }

  report(storyId: string, reporterId: string, now: number): ReportResult {
    const tx = this.db.transaction((): ReportResult => {
      const row = this.db.prepare('SELECT user_id, hidden FROM stories WHERE id = ?').get(storyId) as
        | { user_id: string; hidden: number }
        | undefined;
      if (!row) return { status: 'unknown' };
      if (row.user_id === reporterId) return { status: 'own' };
      if (row.hidden === 1) return { status: 'already_hidden' };
      const ins = this.db
        .prepare('INSERT OR IGNORE INTO reports (story_id, reporter_id, created_at) VALUES (?, ?, ?)')
        .run(storyId, reporterId, now);
      if (ins.changes === 0) return { status: 'duplicate' };
      const { n } = this.db.prepare('SELECT COUNT(*) AS n FROM reports WHERE story_id = ?').get(storyId) as {
        n: number;
      };
      const hidden = n >= REPORTS_TO_HIDE;
      if (hidden) this.db.prepare('UPDATE stories SET hidden = 1 WHERE id = ?').run(storyId);
      return { status: 'ok', hidden };
    });
    return tx();
  }

  // ---------- Loa của quán (Radio Queue) ----------

  countUserQueuedSongs(userId: string): number {
    const row = this.db
      .prepare("SELECT COUNT(*) as count FROM radio_queue WHERE user_id = ? AND status IN ('queued', 'playing')")
      .get(userId) as { count: number };
    return row.count;
  }

  enqueueSong(id: string, userId: string, videoId: string, startSec: number, now: number): boolean {
    const tx = this.db.transaction(() => {
      // Kiểm tra tối đa 2 bài / người
      const count = this.countUserQueuedSongs(userId);
      if (count >= 2) return false;

      // Trừ 1 tiền lẻ
      const deducted = this.deductCoins(userId, 1);
      if (!deducted) return false;

      this.db
        .prepare(
          'INSERT INTO radio_queue (id, user_id, video_id, start_sec, status, started_at, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?)',
        )
        .run(id, userId, videoId, startSec, 'queued', now);
      return true;
    });
    return tx();
  }

  getCurrentRadio(): { id: string; videoId: string; startSec: number; startedAt: number | null } | null {
    const row = this.db
      .prepare("SELECT id, video_id, start_sec, started_at FROM radio_queue WHERE status = 'playing'")
      .get() as { id: string; video_id: string; start_sec: number; started_at: number | null } | undefined;
    if (!row) return null;
    return {
      id: row.id,
      videoId: row.video_id,
      startSec: row.start_sec,
      startedAt: row.started_at,
    };
  }

  getRadioQueue(): { id: string; videoId: string; startSec: number; startedAt: number | null }[] {
    const rows = this.db
      .prepare("SELECT id, video_id, start_sec, started_at FROM radio_queue WHERE status = 'queued' ORDER BY created_at ASC")
      .all() as { id: string; video_id: string; start_sec: number; started_at: number | null }[];
    return rows.map((r) => ({
      id: r.id,
      videoId: r.video_id,
      startSec: r.start_sec,
      startedAt: r.started_at,
    }));
  }

  startNextRadio(now: number): { id: string; videoId: string; startSec: number; startedAt: number } | null {
    const tx = this.db.transaction(() => {
      // Đánh dấu bài đang phát thành finished
      this.db.prepare("UPDATE radio_queue SET status = 'finished' WHERE status = 'playing'").run();

      // Lấy bài tiếp theo trong hàng đợi
      const next = this.db
        .prepare("SELECT id, video_id, start_sec FROM radio_queue WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1")
        .get() as { id: string; video_id: string; start_sec: number } | undefined;

      if (!next) return null;

      this.db
        .prepare("UPDATE radio_queue SET status = 'playing', started_at = ? WHERE id = ?")
        .run(now, next.id);

      return {
        id: next.id,
        videoId: next.video_id,
        startSec: next.start_sec,
        startedAt: now,
      };
    });
    return tx();
  }

  postLetter(id: string, userId: string, text: string, now: number): void {
    this.db
      .prepare('INSERT INTO letters (id, user_id, text, created_at) VALUES (?, ?, ?, ?)')
      .run(id, userId, text, now);
  }

  drawRandomLetter(excludeUserId?: string): { id: string; text: string; createdAt: number } | null {
    let row: { id: string; text: string; created_at: number } | undefined;
    if (excludeUserId) {
      row = this.db
        .prepare('SELECT id, text, created_at FROM letters WHERE user_id != ? ORDER BY RANDOM() LIMIT 1')
        .get(excludeUserId) as { id: string; text: string; created_at: number } | undefined;
    }
    if (!row) {
      row = this.db
        .prepare('SELECT id, text, created_at FROM letters ORDER BY RANDOM() LIMIT 1')
        .get() as { id: string; text: string; created_at: number } | undefined;
    }
    if (!row) return null;
    return { id: row.id, text: row.text, createdAt: row.created_at };
  }

  signGuestbook(id: string, userId: string, name: string, avatar: string, text: string, now: number): void {
    this.db
      .prepare('INSERT INTO guestbook (id, user_id, name, avatar, text, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, userId, name, avatar, text, now);
  }

  getGuestbook(limit = 20): { id: string; name: string; avatar: string; text: string; createdAt: number }[] {
    const rows = this.db
      .prepare('SELECT id, name, avatar, text, created_at FROM guestbook ORDER BY created_at DESC LIMIT ?')
      .all(limit) as { id: string; name: string; avatar: string; text: string; created_at: number }[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      avatar: r.avatar,
      text: r.text,
      createdAt: r.created_at,
    }));
  }

  close(): void {
    this.db.close();
  }
}
