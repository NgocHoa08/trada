/** Trạng thái bầu trời và ánh sáng theo giờ VN. Hàm thuần, không phụ thuộc three. */
export interface SkyState {
  sky: number;
  sunColor: number;
  sunIntensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  /** 0..1: mức đèn đường/đèn quán đã lên. */
  lamp: number;
  /** 0..1: mật độ xe cộ. */
  traffic: number;
}

interface Keyframe {
  h: number;
  sky: number;
  sunColor: number;
  sunIntensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  traffic: number;
}

const NIGHT = { sunColor: 0x6677aa, hemiGround: 0x0a0a14, hemiIntensity: 0.35 };

const FRAMES: readonly Keyframe[] = [
  { h: 0, sky: 0x0a0e1f, sunIntensity: 0.05, hemiSky: 0x1a2244, traffic: 0.1, ...NIGHT },
  { h: 5, sky: 0x1a1d3a, sunIntensity: 0.08, hemiSky: 0x2a2e55, traffic: 0.15, ...NIGHT },
  {
    h: 6.2,
    sky: 0xf2b27a,
    sunColor: 0xffb070,
    sunIntensity: 0.7,
    hemiSky: 0xffd2a0,
    hemiGround: 0x4a3a30,
    hemiIntensity: 0.5,
    traffic: 0.5,
  },
  {
    h: 8,
    sky: 0x9fd0f0,
    sunColor: 0xfff0d8,
    sunIntensity: 1.1,
    hemiSky: 0xbfe0ff,
    hemiGround: 0x6a5a48,
    hemiIntensity: 0.6,
    traffic: 1,
  },
  {
    h: 12,
    sky: 0xbfe3ff,
    sunColor: 0xffffff,
    sunIntensity: 1.5,
    hemiSky: 0xd8efff,
    hemiGround: 0x7a6a55,
    hemiIntensity: 0.65,
    traffic: 0.7,
  },
  {
    h: 16,
    sky: 0xd9e0c8,
    sunColor: 0xfff0c8,
    sunIntensity: 1.2,
    hemiSky: 0xe8e8d0,
    hemiGround: 0x7a6a55,
    hemiIntensity: 0.6,
    traffic: 0.8,
  },
  {
    h: 17.5,
    sky: 0xf5c06a,
    sunColor: 0xffc060,
    sunIntensity: 1.0,
    hemiSky: 0xffe0b0,
    hemiGround: 0x5a4a38,
    hemiIntensity: 0.55,
    traffic: 1,
  },
  {
    h: 18.5,
    sky: 0xe58a5a,
    sunColor: 0xff9050,
    sunIntensity: 0.6,
    hemiSky: 0xe0a890,
    hemiGround: 0x4a3a30,
    hemiIntensity: 0.45,
    traffic: 1,
  },
  {
    h: 19.5,
    sky: 0x3a2b4a,
    sunColor: 0x8070a0,
    sunIntensity: 0.15,
    hemiSky: 0x4a4a70,
    hemiGround: 0x1a1420,
    hemiIntensity: 0.4,
    traffic: 0.8,
  },
  { h: 21, sky: 0x10142a, sunIntensity: 0.06, hemiSky: 0x1a2244, traffic: 0.5, ...NIGHT },
  { h: 23, sky: 0x0a0e1f, sunIntensity: 0.05, hemiSky: 0x1a2244, traffic: 0.2, ...NIGHT },
  { h: 24, sky: 0x0a0e1f, sunIntensity: 0.05, hemiSky: 0x1a2244, traffic: 0.1, ...NIGHT },
];

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Trộn hai màu 0xRRGGBB theo từng kênh. */
export function lerpColor(a: number, b: number, t: number): number {
  const ch = (shift: number): number =>
    Math.round(lerp((a >> shift) & 255, (b >> shift) & 255, t)) & 255;
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** Đèn lên dần 17h30–19h30, sáng suốt đêm, tắt dần 5h–6h30. */
export function getLamp(hour: number): number {
  if (hour >= 19.5 || hour < 5) return 1;
  if (hour >= 17.5) return clamp01((hour - 17.5) / 2);
  if (hour >= 6.5) return 0;
  return clamp01(1 - (hour - 5) / 1.5);
}

export function getSkyState(hourIn: number): SkyState {
  const hour = ((hourIn % 24) + 24) % 24;
  let a = FRAMES[0] as Keyframe;
  let b = FRAMES[1] as Keyframe;
  for (let i = 0; i < FRAMES.length - 1; i++) {
    const f0 = FRAMES[i];
    const f1 = FRAMES[i + 1];
    if (f0 && f1 && hour >= f0.h && hour < f1.h) {
      a = f0;
      b = f1;
      break;
    }
  }
  const t = clamp01((hour - a.h) / (b.h - a.h));
  return {
    sky: lerpColor(a.sky, b.sky, t),
    sunColor: lerpColor(a.sunColor, b.sunColor, t),
    sunIntensity: lerp(a.sunIntensity, b.sunIntensity, t),
    hemiSky: lerpColor(a.hemiSky, b.hemiSky, t),
    hemiGround: lerpColor(a.hemiGround, b.hemiGround, t),
    hemiIntensity: lerp(a.hemiIntensity, b.hemiIntensity, t),
    lamp: getLamp(hour),
    traffic: lerp(a.traffic, b.traffic, t),
  };
}
