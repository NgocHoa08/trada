import Database from 'better-sqlite3';
import { REPORTS_TO_HIDE, type Story } from '@tdvh/shared';

/** Kết quả báo cáo một câu chuyện. */
export type ReportResult =
  | { status: 'ok'; hidden: boolean }
  | { status: 'unknown' | 'own' | 'duplicate' | 'already_hidden' };

/**
 * Lưu "chuyện" và báo cáo trong SQLite. Nội dung chuyện chỉ nằm trong database,
 * không ghi ra log (xem AGENTS.md).
 */
export class StoryStore {
  private readonly db: Database.Database;

  constructor(path: string) {
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
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
    `);
  }

  hasPosted(userId: string, roundIndex: number): boolean {
    return (
      this.db
        .prepare('SELECT 1 FROM stories WHERE user_id = ? AND round_index = ?')
        .get(userId, roundIndex) !== undefined
    );
  }

  /** Trả false nếu người này đã đăng trong tuần trà đó (ràng buộc UNIQUE, an toàn khi tranh chấp). */
  insert(story: Story, userId: string): boolean {
    try {
      this.db
        .prepare(
          'INSERT INTO stories (id, user_id, round_index, text, hidden, seat_id, created_at) VALUES (?, ?, ?, ?, 0, ?, ?)',
        )
        .run(story.id, userId, story.roundIndex, story.text, story.seatId, story.createdAt);
      return true;
    } catch (e) {
      if (e instanceof Error && 'code' in e && String(e.code).startsWith('SQLITE_CONSTRAINT'))
        return false;
      throw e;
    }
  }

  /** Chuyện chưa bị ẩn của các tuần trà cho trước, cũ trước mới sau. */
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

  /** Ghi báo cáo trong một transaction; đủ REPORTS_TO_HIDE người khác nhau thì ẩn chuyện. */
  report(storyId: string, reporterId: string, now: number): ReportResult {
    const tx = this.db.transaction((): ReportResult => {
      const row = this.db
        .prepare('SELECT user_id, hidden FROM stories WHERE id = ?')
        .get(storyId) as { user_id: string; hidden: number } | undefined;
      if (!row) return { status: 'unknown' };
      if (row.user_id === reporterId) return { status: 'own' };
      if (row.hidden === 1) return { status: 'already_hidden' };
      const ins = this.db
        .prepare(
          'INSERT OR IGNORE INTO reports (story_id, reporter_id, created_at) VALUES (?, ?, ?)',
        )
        .run(storyId, reporterId, now);
      if (ins.changes === 0) return { status: 'duplicate' };
      const { n } = this.db
        .prepare('SELECT COUNT(*) AS n FROM reports WHERE story_id = ?')
        .get(storyId) as {
        n: number;
      };
      const hidden = n >= REPORTS_TO_HIDE;
      if (hidden) this.db.prepare('UPDATE stories SET hidden = 1 WHERE id = ?').run(storyId);
      return { status: 'ok', hidden };
    });
    return tx();
  }

  close(): void {
    this.db.close();
  }
}
