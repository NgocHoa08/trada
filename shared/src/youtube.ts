export interface ParsedYouTube {
  videoId: string;
  startSec: number;
}

/**
 * Trích xuất videoId (11 ký tự) và thời gian bắt đầu (giây) từ URL YouTube.
 * Hỗ trợ các định dạng:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - Tham số thời gian: ?t=1m30s, ?t=90, &start=90
 */
export function parseYouTubeUrl(raw: string): ParsedYouTube | null {
  try {
    const trimmed = raw.trim();
    const url = new URL(trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`);
    let videoId: string | null = null;

    if (url.hostname.includes('youtube.com')) {
      if (url.pathname === '/watch') {
        videoId = url.searchParams.get('v');
      } else if (url.pathname.startsWith('/embed/')) {
        videoId = url.pathname.slice(7);
      } else if (url.pathname.startsWith('/shorts/')) {
        videoId = url.pathname.slice(8);
      }
    } else if (url.hostname === 'youtu.be') {
      videoId = url.pathname.slice(1);
    }

    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return null;
    }

    // Parse start time (?t=... hoặc &start=...)
    let startSec = 0;
    const startParam = url.searchParams.get('start') || url.searchParams.get('t');
    if (startParam) {
      startSec = parseTimeString(startParam);
    }

    return { videoId, startSec };
  } catch {
    return null;
  }
}

function parseTimeString(t: string): number {
  if (/^\d+$/.test(t)) return parseInt(t, 10);
  const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!m) return 0;
  const hours = parseInt(m[1] || '0', 10);
  const minutes = parseInt(m[2] || '0', 10);
  const seconds = parseInt(m[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

