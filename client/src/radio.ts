import type { RadioItem } from '@tdvh/shared';

// Danh sách phim/bài mặc định khi hàng chờ rỗng (Phim hoạt hình / nhạc thư giãn)
export const DEFAULT_RADIO_TRACK: RadioItem = {
  id: 'default',
  videoId: 'aqz-KE-bpKQ', // Big Buck Bunny - Phim hoạt hình mở
  startSec: 0,
  startedAt: null,
};

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT: {
      Player: new (
        elementId: string | HTMLElement,
        options: {
          height?: string | number;
          width?: string | number;
          videoId?: string;
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
            onStateChange?: (event: { data: number }) => void;
            onError?: (event: { data: number }) => void;
          };
        },
      ) => YTPlayer;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
      };
    };
  }
}

export interface YTPlayer {
  loadVideoById(options: { videoId: string; startSeconds?: number }): void;
  cueVideoById(options: { videoId: string; startSeconds?: number }): void;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  destroy(): void;
}

export class RadioPlayer {
  private player: YTPlayer | null = null;
  private isApiReady = false;
  private isUserUnmuted = false;
  private isServerPaused = false;
  private currentTrack: RadioItem | null = null;
  public onTrackEnded?: (videoId: string) => void;

  constructor(private readonly containerId: string) {
    this.loadIframeApi();
    if (typeof window !== 'undefined') {
      window.addEventListener('message', (e) => {
        try {
          const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
          if (data && data.event === 'onStateChange' && data.info === 0 && this.currentTrack) {
            this.onTrackEnded?.(this.currentTrack.videoId);
          }
        } catch {
          // bỏ qua
        }
      });
    }
  }

  private loadIframeApi(): void {
    if (window.YT && window.YT.Player) {
      this.isApiReady = true;
      return;
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScript = document.getElementsByTagName('script')[0];
    firstScript?.parentNode?.insertBefore(tag, firstScript);

    window.onYouTubeIframeAPIReady = () => {
      this.isApiReady = true;
      if (this.currentTrack) {
        this.initPlayer(this.currentTrack, 0);
      }
    };
  }

  syncRadio(track: RadioItem | null, serverNow: number, isPaused = false): void {
    const targetTrack = track ?? DEFAULT_RADIO_TRACK;
    this.currentTrack = targetTrack;
    this.isServerPaused = isPaused;

    let targetStart = targetTrack.startSec;
    if (targetTrack.startedAt) {
      const elapsed = Math.max(0, Math.floor((serverNow - targetTrack.startedAt) / 1000));
      targetStart += elapsed;
    }

    if (!this.player) {
      if (this.isApiReady) {
        this.initPlayer(targetTrack, targetStart);
      } else {
        this.mountFallbackIframe(targetTrack.videoId, targetStart, !isPaused && this.isUserUnmuted);
      }
      return;
    }

    // Nếu đã có player, đồng bộ lại thời gian
    try {
      this.player.loadVideoById({
        videoId: targetTrack.videoId,
        startSeconds: targetStart,
      });
      if (isPaused || !this.isUserUnmuted) {
        this.player.pauseVideo();
      } else {
        this.player.playVideo();
      }
    } catch {
      this.mountFallbackIframe(targetTrack.videoId, targetStart, !isPaused && this.isUserUnmuted);
    }
  }

  playDirect(videoId: string, startSec = 0): void {
    this.isUserUnmuted = true;
    const track: RadioItem = {
      id: 'direct-' + Date.now(),
      videoId,
      startSec,
      startedAt: Date.now(),
    };
    this.currentTrack = track;

    if (this.player) {
      try {
        this.player.loadVideoById({
          videoId,
          startSeconds: startSec,
        });
        this.player.playVideo();
        return;
      } catch {
        this.player = null;
      }
    }

    if (this.isApiReady && window.YT?.Player) {
      this.initPlayer(track, startSec);
    } else {
      this.mountFallbackIframe(videoId, startSec, true);
    }
  }

  private mountFallbackIframe(videoId: string, startSec: number, autoplay = true): void {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(this.containerId);
    if (!el) return;
    el.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}&enablejsapi=1&start=${startSec}&rel=0`;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    el.appendChild(iframe);
  }

  private initPlayer(track: RadioItem, startSec: number): void {
    if (typeof document === 'undefined') return;
    const targetEl = document.getElementById(this.containerId);
    if (!targetEl) return;

    try {
      this.player = new window.YT.Player(this.containerId, {
        height: '100%',
        width: '100%',
        videoId: track.videoId,
        playerVars: {
          autoplay: this.isUserUnmuted ? 1 : 0,
          controls: 1,
          start: startSec,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (evt) => {
            evt.target.seekTo(startSec, true);
            if (this.isUserUnmuted && !this.isServerPaused) {
              evt.target.playVideo();
            }
          },
          onStateChange: (evt) => {
            if (evt.data === 0 && this.currentTrack) {
              this.onTrackEnded?.(this.currentTrack.videoId);
            }
          },
        },
      });
    } catch {
      this.mountFallbackIframe(track.videoId, startSec, this.isUserUnmuted);
    }
  }

  unmuteAndPlay(): void {
    this.isUserUnmuted = true;
    if (this.player) {
      try {
        this.player.playVideo();
      } catch {
        // bỏ qua
      }
    } else if (this.currentTrack) {
      this.playDirect(this.currentTrack.videoId, this.currentTrack.startSec);
    }
  }
}

