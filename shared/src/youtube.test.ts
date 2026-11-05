import { describe, expect, it } from 'vitest';
import { parseYouTubeUrl } from './youtube';

describe('parseYouTubeUrl', () => {
  it('parse chuẩn link watch thông thường', () => {
    const res = parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(res).toEqual({ videoId: 'dQw4w9WgXcQ', startSec: 0 });
  });

  it('parse link rút gọn youtu.be có start timestamp', () => {
    const res1 = parseYouTubeUrl('https://youtu.be/dQw4w9WgXcQ?t=45');
    expect(res1).toEqual({ videoId: 'dQw4w9WgXcQ', startSec: 45 });

    const res2 = parseYouTubeUrl('https://youtu.be/dQw4w9WgXcQ?t=1m30s');
    expect(res2).toEqual({ videoId: 'dQw4w9WgXcQ', startSec: 90 });
  });

  it('hỗ trợ embed và &start=', () => {
    const res = parseYouTubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ?start=120');
    expect(res).toEqual({ videoId: 'dQw4w9WgXcQ', startSec: 120 });
  });

  it('hỗ trợ YouTube Shorts', () => {
    const resShorts = parseYouTubeUrl('https://www.youtube.com/shorts/aqz-KE-bpKQ');
    expect(resShorts).toEqual({ videoId: 'aqz-KE-bpKQ', startSec: 0 });
  });

  it('từ chối URL không hợp lệ hoặc videoId không đúng 11 ký tự', () => {
    expect(parseYouTubeUrl('https://google.com')).toBeNull();
    expect(parseYouTubeUrl('https://youtu.be/short')).toBeNull();
    expect(parseYouTubeUrl('not a url')).toBeNull();
  });
});

