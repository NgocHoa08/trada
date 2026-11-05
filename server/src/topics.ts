import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pickTopicIndex } from '@tdvh/shared';

export const TOPICS_PATH = fileURLToPath(new URL('../data/topics.vi.json', import.meta.url));

/** Đọc và kiểm tra file chủ đề: mảng chuỗi không rỗng. */
export function loadTopics(path: string = TOPICS_PATH): string[] {
  const data: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(data) || data.length === 0)
    throw new Error('topics.vi.json phải là mảng không rỗng');
  return data.map((t) => {
    if (typeof t !== 'string' || t.trim() === '')
      throw new Error('Chủ đề phải là chuỗi không rỗng');
    return t.trim();
  });
}

export function topicForRound(topics: readonly string[], roundIndex: number): string {
  return topics[pickTopicIndex(roundIndex, topics.length)] as string;
}
