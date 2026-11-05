import { describe, expect, it } from 'vitest';
import { createWorld } from './world';

describe('World Seat Switching & Single Character Guarantee', () => {
  it('không nhân bản nhân vật khi chuyển từ ghế này sang ghế khác', () => {
    const world = createWorld({ mobile: true });

    const occupant = {
      name: 'Hoà',
      avatar: 'casual_brown',
      mood: 'chill',
    };

    // 1. Ngồi vào ghế s01
    world.setOccupant('s01', occupant);

    const countHoaCharacters = () => {
      let count = 0;
      world.scene.traverse((obj) => {
        if (obj.userData && obj.userData.characterName === 'Hoà') {
          count++;
        }
      });
      return count;
    };

    expect(countHoaCharacters()).toBe(1);

    // 2. Chuyển từ s01 sang s02 (server gửi vacate s01 rồi sit s02)
    world.setOccupant('s01', null);
    world.setOccupant('s02', occupant);
    expect(countHoaCharacters()).toBe(1);

    // 3. Chuyển tiếp từ s02 sang s03
    world.setOccupant('s02', null);
    world.setOccupant('s03', occupant);
    expect(countHoaCharacters()).toBe(1);

    // 4. Chuyển tiếp nhiều lần liên tiếp
    for (const seatId of ['s04', 's05', 's06', 's07']) {
      world.setOccupant('s03', null);
      world.setOccupant(seatId, occupant);
      expect(countHoaCharacters()).toBe(1);
    }

    // Chạy update animation frame
    world.update(0.1, 1, 19, 0.5);
    expect(countHoaCharacters()).toBe(1);

    // Đứng dậy
    world.standUp('s07');
    expect(world.hasStandingPlayer()).toBe(true);
    expect(countHoaCharacters()).toBe(1);

    // Ngồi lại vào s08
    world.setOccupant('s08', occupant);
    expect(world.hasStandingPlayer()).toBe(false);
    expect(countHoaCharacters()).toBe(1);
  });

  it('hỗ trợ đổi thời tiết và kiểm tra TV target', () => {
    const world = createWorld({ mobile: false });
    expect(world.tvTarget).toBeDefined();
    expect(world.xiangqiTarget).toBeDefined();

    expect(world.getWeather()).toBe('sunny');

    world.setWeather('rainy');
    expect(world.getWeather()).toBe('rainy');
    world.update(0.1, 1, 15, 0.2);

    world.setWeather('cloudy');
    expect(world.getWeather()).toBe('cloudy');
    world.update(0.1, 1, 15, 0.2);

    world.setDrink('cafe_sua');

    world.setSeason('autumn');
    world.update(0.1, 1, 15, 0.2);

    world.setWeather('sunny');
    expect(world.getWeather()).toBe('sunny');
  });
});
