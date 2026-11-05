/** Lớp HUD DOM đơn giản. Mọi chuỗi đều đặt bằng textContent, không dùng innerHTML. */
export interface RoundView {
  roundIndex: number;
  progress: number;
  remainingMs: number;
  /** null = đang tải chủ đề. */
  topic: string | null;
  synced: boolean;
}

export interface Hud {
  setTime(hour: number): void;
  toast(message: string): void;
  setRound(info: RoundView): void;
  setStandVisible(visible: boolean): void;
}

export function createHud(root: HTMLElement, onStand: () => void): Hud {
  const clock = document.createElement('div');
  clock.className = 'hud-clock';

  const panel = document.createElement('div');
  panel.className = 'hud-round';
  const meta = document.createElement('div');
  meta.className = 'meta';
  const topicEl = document.createElement('div');
  topicEl.className = 'topic';
  const bar = document.createElement('div');
  bar.className = 'bar';
  const fill = document.createElement('div');
  bar.append(fill);
  panel.append(meta, topicEl, bar);

  const stand = document.createElement('button');
  stand.className = 'hud-stand';
  stand.type = 'button';
  stand.textContent = 'Đứng dậy';
  stand.hidden = true;
  stand.addEventListener('click', onStand);

  const toastEl = document.createElement('div');
  toastEl.className = 'hud-toast';
  root.append(clock, panel, stand, toastEl);

  let timer: number | undefined;
  const last = { time: '', meta: '', topic: '', width: '' };

  return {
    setTime(hour) {
      const h = Math.floor(hour);
      const m = Math.floor((hour - h) * 60);
      const text = `🕰️ ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      if (text !== last.time) {
        clock.textContent = text;
        last.time = text;
      }
    },
    setRound({ roundIndex, progress, remainingMs, topic, synced }) {
      // Làm tròn LÊN theo giây để mọi máy cùng hiển thị một giây
      const sec = Math.max(0, Math.ceil(remainingMs / 1000));
      const mm = String(Math.floor(sec / 60)).padStart(2, '0');
      const ss = String(sec % 60).padStart(2, '0');
      const metaText = `Tuần trà #${roundIndex} · còn ${mm}:${ss}${synced ? '' : ' · chưa khớp giờ quán'}`;
      if (metaText !== last.meta) {
        meta.textContent = metaText;
        last.meta = metaText;
      }
      const topicText = topic ?? 'Bà chủ đang nghĩ chủ đề…';
      if (topicText !== last.topic) {
        topicEl.textContent = topicText;
        last.topic = topicText;
      }
      const width = `${(Math.min(1, Math.max(0, progress)) * 100).toFixed(1)}%`;
      if (width !== last.width) {
        fill.style.width = width;
        last.width = width;
      }
    },
    setStandVisible(visible) {
      stand.hidden = !visible;
    },
    toast(message) {
      toastEl.textContent = message;
      toastEl.classList.add('show');
      window.clearTimeout(timer);
      timer = window.setTimeout(() => toastEl.classList.remove('show'), 2200);
    },
  };
}
