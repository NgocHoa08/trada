export type WeatherType = 'sunny' | 'rainy' | 'cloudy';

export interface WeatherOption {
  id: WeatherType | 'auto';
  label: string;
  emoji: string;
}

export const WEATHER_OPTIONS: readonly WeatherOption[] = [
  { id: 'auto', label: 'Tự động (theo quán)', emoji: '🔄' },
  { id: 'sunny', label: 'Nắng ráo', emoji: '☀️' },
  { id: 'rainy', label: 'Mưa rào', emoji: '🌧️' },
  { id: 'cloudy', label: 'Âm u', emoji: '☁️' },
] as const;

/**
 * Xác định thời tiết cho một tuần trà dựa trên roundIndex.
 * Thuật toán băm xác định để mọi người trong quán cùng trải nghiệm thời tiết giống nhau.
 * Phân bổ: ~60% Nắng ráo (chiều tối vỉa hè thoáng mát), ~25% Mưa rào, ~15% Âm u.
 */
export function getWeatherForRound(roundIndex: number): WeatherType {
  // Integer hash PRNG
  let x = (roundIndex ^ 0x5bf03635) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = (x ^ (x >>> 16)) >>> 0;
  const val = (x % 1000) / 1000;

  if (val < 0.6) return 'sunny';
  if (val < 0.85) return 'rainy';
  return 'cloudy';
}
