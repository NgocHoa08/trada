import { describe, expect, it } from 'vitest';
import { loadTopics, topicForRound } from './topics';

describe('topics.vi.json', () => {
  const topics = loadTopics();

  it('đọc được, không rỗng, không trùng', () => {
    expect(topics.length).toBeGreaterThanOrEqual(40);
    expect(new Set(topics).size).toBe(topics.length);
  });

  it('chủ đề của hai tuần trà liên tiếp khác nhau', () => {
    for (let r = 996_000; r < 996_200; r++) {
      expect(topicForRound(topics, r)).not.toBe(topicForRound(topics, r + 1));
    }
  });
});
