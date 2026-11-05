import * as THREE from 'three';
import { box, part, merge, lambertMat } from './geoUtils';

interface HanoiBuildingDef {
  x: number;
  width: number;
  height: number;
  depth: number;
  wallColor: number;
  shutterColor: number;
  hasBalcony?: boolean;
  hasArch?: boolean;
  houseNumber: number;
  streetName?: string;
  hasBougainvillea?: boolean; // Hoa giấy rủ từ ban công
}

function makeHouseNumberCanvas(num: number, street = 'PHỐ TRÀNG TIỀN'): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Biển số nhà màu xanh lam đậm
    ctx.fillStyle = '#0b3c6d';
    ctx.beginPath();
    ctx.roundRect(8, 8, 240, 144, 10);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(14, 14, 228, 132);

    // Chữ số nhà to ở giữa
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 72px "Segoe UI", Arial, sans-serif';
    ctx.fillText(`${num}`, 128, 82);

    // Tên phố ở dưới
    ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
    ctx.fillText(street, 128, 124, 210);
  }
  return canvas;
}

export function createHanoiBuildings(sidewalkZ: number): THREE.Group {
  const group = new THREE.Group();

  const buildings: HanoiBuildingDef[] = [
    { x: -24, width: 5.6, height: 7.2, depth: 4.5, wallColor: 0xe2c675, shutterColor: 0x274e37, hasBalcony: true, houseNumber: 18, hasBougainvillea: true },
    { x: -18, width: 6.0, height: 8.5, depth: 4.5, wallColor: 0xd9b360, shutterColor: 0x1d3d2a, hasBalcony: true, hasArch: true, houseNumber: 20 },
    { x: -12, width: 5.8, height: 6.8, depth: 4.5, wallColor: 0xe6cd88, shutterColor: 0x274e37, hasBalcony: false, houseNumber: 22 },
    { x: -6,  width: 5.8, height: 8.0, depth: 4.5, wallColor: 0xd4a853, shutterColor: 0x224832, hasBalcony: true, hasArch: true, houseNumber: 24, hasBougainvillea: true },
    { x: 0,   width: 6.2, height: 7.0, depth: 4.5, wallColor: 0xdfbe6c, shutterColor: 0x2b553c, hasBalcony: false, houseNumber: 26 }, // Nhà trà đá trung tâm
    { x: 6,   width: 5.8, height: 8.6, depth: 4.5, wallColor: 0xd6ac57, shutterColor: 0x1f422d, hasBalcony: true, hasArch: true, houseNumber: 28 },
    { x: 12,  width: 5.8, height: 6.5, depth: 4.5, wallColor: 0xe0c477, shutterColor: 0x274e37, hasBalcony: true, houseNumber: 30, hasBougainvillea: true },
    { x: 18,  width: 6.0, height: 8.2, depth: 4.5, wallColor: 0xd9b563, shutterColor: 0x224832, hasBalcony: true, hasArch: true, houseNumber: 32 },
    { x: 24,  width: 5.6, height: 7.4, depth: 4.5, wallColor: 0xe5ca7c, shutterColor: 0x2a523a, hasBalcony: false, houseNumber: 34 },
  ];

  for (const b of buildings) {
    const bGroup = new THREE.Group();
    bGroup.position.set(b.x, 0, sidewalkZ - b.depth / 2);

    // 1. Thân nhà khối hộp màu vàng vôi Hà Nội
    const houseParts: THREE.BufferGeometry[] = [];
    houseParts.push(part(box(b.width, b.height, b.depth), b.wallColor, [0, b.height / 2, 0]));

    // Gờ chỉ xi măng chia tầng Pháp cổ (màu kem sáng)
    const MOLDING_COL = 0xeee3ca;
    houseParts.push(part(box(b.width + 0.16, 0.16, b.depth + 0.1), MOLDING_COL, [0, 3.4, 0.05]));
    if (b.height > 6.5) {
      houseParts.push(part(box(b.width + 0.16, 0.16, b.depth + 0.1), MOLDING_COL, [0, 6.2, 0.05]));
    }

    // Mái ngói đỏ gạch dốc phía trên đỉnh nhà
    const ROOF_COL = 0x9c382b;
    const roofSlope = part(box(b.width + 0.2, 0.45, b.depth * 0.4), ROOF_COL, [0, b.height + 0.2, -0.6], 0.22);
    houseParts.push(roofSlope);

    const houseMesh = new THREE.Mesh(merge(houseParts), lambertMat(b.wallColor));
    houseMesh.castShadow = true;
    houseMesh.receiveShadow = true;
    bGroup.add(houseMesh);

    // 2. Tầng 1: Cửa cuốn sắt / cửa gỗ kéo
    const shutterMat = lambertMat(0x3e4d44);
    const shutter = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.7), shutterMat);
    shutter.position.set(0, 1.35, b.depth / 2 + 0.02);
    bGroup.add(shutter);

    // Gờ khung cửa tầng 1
    const doorFrame = new THREE.Mesh(box(3.8, 2.85, 0.08), lambertMat(0x2d3832));
    doorFrame.position.set(0, 1.42, b.depth / 2 + 0.03);
    bGroup.add(doorFrame);

    // Biển số nhà Hà Nội gắn cạnh cửa
    if (typeof document !== 'undefined') {
      const numCanvas = makeHouseNumberCanvas(b.houseNumber, b.streetName ?? 'PHỐ TRÀNG TIỀN');
      const numTex = new THREE.CanvasTexture(numCanvas);
      numTex.colorSpace = THREE.SRGBColorSpace;
      const numSign = new THREE.Mesh(
        new THREE.PlaneGeometry(0.38, 0.24),
        new THREE.MeshBasicMaterial({ map: numTex }),
      );
      numSign.position.set(2.1, 1.85, b.depth / 2 + 0.03);
      bGroup.add(numSign);
    }

    // 3. Tầng 2 & 3: Cửa sổ chớp gỗ xanh lá cây Pháp cổ (French louvre shutters)
    const glassMat = lambertMat(0x1a2634);
    const shutterWingMat = lambertMat(b.shutterColor);

    const windowFloors = b.height > 7.5 ? [4.5, 6.9] : [4.5];
    for (const floorY of windowFloors) {
      if (floorY + 0.9 > b.height) continue;
      for (const sx of [-1.3, 1.3]) {
        // Cánh cửa kính bên trong
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.35), glassMat);
        win.position.set(sx, floorY, b.depth / 2 + 0.03);
        bGroup.add(win);

        // 2 cánh cửa chớp gỗ xanh mở hờ hai bên
        const leftWing = new THREE.Mesh(box(0.42, 1.35, 0.03), shutterWingMat);
        leftWing.position.set(sx - 0.46, floorY, b.depth / 2 + 0.06);
        leftWing.rotation.y = 0.35; // mở hé ra

        const rightWing = new THREE.Mesh(box(0.42, 1.35, 0.03), shutterWingMat);
        rightWing.position.set(sx + 0.46, floorY, b.depth / 2 + 0.06);
        rightWing.rotation.y = -0.35; // mở hé ra

        // Vòm cung trang trí phía trên cửa sổ
        if (b.hasArch) {
          const arch = new THREE.Mesh(
            new THREE.CylinderGeometry(0.46, 0.46, 0.06, 12, 1, false, 0, Math.PI),
            lambertMat(0xeee3ca),
          );
          arch.position.set(sx, floorY + 0.7, b.depth / 2 + 0.05);
          arch.rotation.x = Math.PI / 2;
          bGroup.add(arch);
        }

        bGroup.add(leftWing, rightWing);
      }
    }

    // 4. Ban công sắt hoa văn uốn lượn cổ kính
    if (b.hasBalcony) {
      const balcony = createBalcony(b.width * 0.7);
      balcony.position.set(0, 3.4, b.depth / 2 + 0.45);
      bGroup.add(balcony);

      // Giàn hoa giấy rủ sắc tím hồng lãng mạn từ ban công
      if (b.hasBougainvillea) {
        const flowerCluster = createBougainvillea();
        flowerCluster.position.set(-1.1, 3.35, b.depth / 2 + 0.85);
        bGroup.add(flowerCluster);
      }
    }

    group.add(bGroup);
  }

  return group;
}

/** Ban công sắt hoa văn kiểu Pháp */
function createBalcony(width: number): THREE.Group {
  const group = new THREE.Group();
  const ironMat = lambertMat(0x18181a);
  const floorMat = lambertMat(0xd8d0be);

  // Sàn ban công bê tông vươn ra 0.85m
  const slab = new THREE.Mesh(box(width, 0.12, 0.85), floorMat);
  slab.position.set(0, 0, 0);
  group.add(slab);

  // Lan can sắt cao 0.75m bao quanh 3 mặt
  const railGeo = box(width, 0.04, 0.03);
  const topRail = new THREE.Mesh(railGeo, ironMat);
  topRail.position.set(0, 0.75, 0.4);

  const bottomRail = new THREE.Mesh(railGeo, ironMat);
  bottomRail.position.set(0, 0.08, 0.4);
  group.add(topRail, bottomRail);

  // Các con song sắt dọc
  const barCount = Math.floor(width / 0.18);
  for (let i = 0; i <= barCount; i++) {
    const x = -width / 2 + i * (width / barCount);
    const bar = new THREE.Mesh(box(0.02, 0.68, 0.02), ironMat);
    bar.position.set(x, 0.41, 0.4);
    group.add(bar);
  }

  // 2 thành lan can bên hông
  for (const sx of [-width / 2, width / 2]) {
    const sideTop = new THREE.Mesh(box(0.03, 0.04, 0.82), ironMat);
    sideTop.position.set(sx, 0.75, 0);
    const sideBot = new THREE.Mesh(box(0.03, 0.04, 0.82), ironMat);
    sideBot.position.set(sx, 0.08, 0);
    group.add(sideTop, sideBot);
  }

  return group;
}

/** Giàn hoa giấy nở rộ rủ xuống ban công phố cổ */
function createBougainvillea(): THREE.Group {
  const group = new THREE.Group();
  const petalMat = lambertMat(0xe03a8f); // tím hồng hoa giấy
  const leafMat = lambertMat(0x2f663b);

  for (let i = 0; i < 9; i++) {
    const isLeaf = i % 3 === 0;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.12 + (i % 3) * 0.04, 6, 6),
      isLeaf ? leafMat : petalMat,
    );
    mesh.position.set(
      (Math.random() - 0.5) * 0.6,
      -Math.random() * 0.7,
      (Math.random() - 0.5) * 0.3,
    );
    group.add(mesh);
  }
  return group;
}
