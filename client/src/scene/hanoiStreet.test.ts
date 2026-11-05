import { describe, expect, it } from 'vitest';
import {
  createHanoiStreetSign,
  createHanoiPowerPole,
  createHanoiTree,
  createHanoiSidewalkProps,
  createSidewalkDog,
  createFlowerBicycle,
} from './hanoiStreet';
import { createHanoiBuildings } from './hanoiBuildings';
import { VietnamTrafficManager } from './vietnamVehicles';

describe('Hanoi Street & Vietnamese Vehicles', () => {
  it('tạo biển tên phố Hà Nội và cột điện phố cổ thành công', () => {
    const sign = createHanoiStreetSign('PHỐ TRÀNG TIỀN', 'PHỐ ĐINH TIÊN HOÀNG');
    expect(sign).toBeDefined();
    expect(sign.children.length).toBeGreaterThan(0);

    const pole = createHanoiPowerPole();
    expect(pole).toBeDefined();
    expect(pole.children.length).toBeGreaterThan(0);
  });

  it('tạo cây sấu già gốc quét vôi trắng và đồ vật quán trà đá', () => {
    const tree = createHanoiTree();
    expect(tree).toBeDefined();

    const props = createHanoiSidewalkProps();
    expect(props).toBeDefined();

    const dog = createSidewalkDog();
    expect(dog).toBeDefined();
    dog.update(0.1, 1.0);

    const flowerBike = createFlowerBicycle();
    expect(flowerBike).toBeDefined();
  });

  it('tạo dãy nhà phố cổ Hà Nội có ban công và biển số nhà', () => {
    const buildings = createHanoiBuildings(-6.1);
    expect(buildings).toBeDefined();
    expect(buildings.children.length).toBe(9);
  });

  it('quản lý giao thông Việt Nam cập nhật xe máy và ô tô nhịp nhàng', () => {
    const traffic = new VietnamTrafficManager();
    expect(traffic.group.children.length).toBeGreaterThan(5);

    // Chạy update 10 frames
    for (let i = 0; i < 10; i++) {
      traffic.update(0.1, 1.0);
    }
  });
});

