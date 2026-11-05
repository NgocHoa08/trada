import { describe, expect, it, vi } from 'vitest';
import { AVATARS } from '@tdvh/shared';
import { createCharacter } from './character';

describe('Character Animation & Movement', () => {
  const avatar = AVATARS[0]!;

  it('khởi tạo nhân vật với mode mặc định là sitting', () => {
    const char = createCharacter(avatar, 'Huy', '🍵');
    expect(char.getMode()).toBe('sitting');
    expect(char.isMoving()).toBe(false);
  });

  it('cho phép đổi mode sang standing và walking', () => {
    const char = createCharacter(avatar, 'Huy', '🍵');
    char.setMode('standing');
    expect(char.getMode()).toBe('standing');
    char.setMode('walking');
    expect(char.getMode()).toBe('walking');
  });

  it('walkTo di chuyển nhân vật đến đích và gọi callback khi đến nơi', () => {
    const char = createCharacter(avatar, 'Huy', '🍵', 'standing');
    char.group.position.set(0, 0, 0);

    const onArrived = vi.fn();
    char.walkTo(1, 0, Math.PI / 2, 'sitting', onArrived);
    expect(char.isMoving()).toBe(true);
    expect(char.getMode()).toBe('walking');

    // Chạy update với dt = 0.3s (tốc độ ~1.8m/s)
    char.update(0.3, 0.3);
    expect(char.group.position.x).toBeGreaterThan(0);
    expect(onArrived).not.toHaveBeenCalled();

    // Tiếp tục update đến khi tới đích
    for (let t = 0; t < 10; t++) {
      char.update(0.2, 0.5 + t * 0.2);
    }

    expect(char.isMoving()).toBe(false);
    expect(char.getMode()).toBe('sitting');
    expect(char.group.position.x).toBeCloseTo(1, 1);
    expect(char.group.rotation.y).toBeCloseTo(Math.PI / 2, 1);
    expect(onArrived).toHaveBeenCalledOnce();
  });
});

