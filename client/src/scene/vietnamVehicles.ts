import * as THREE from 'three';
import { box, part, merge } from './geoUtils';

const vertexColorMat = new THREE.MeshLambertMaterial({ vertexColors: true });

// ==========================================
// 1. TẠO HÌNH XE MÁY HONDA VIỆT NAM (WAVE ALPHA, DREAM, VISION, SH)
// ==========================================

export interface MotorbikeDef {
  type: 'wave' | 'sh' | 'shipper';
  bodyColor: number;
  riderShirtColor: number;
  helmetColor: number;
  shipperBox?: 'grab' | 'shopee';
}

function makePlateCanvas(line1: string, line2: string, bg = '#ffffff', fg = '#111111'): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 128, 64);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 124, 60);
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillText(line1, 64, 26);
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillText(line2, 64, 52);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createVietnamMotorbike(def: MotorbikeDef): THREE.Group {
  const group = new THREE.Group();
  const parts: THREE.BufferGeometry[] = [];

  const DARK = 0x1a1a1a;
  const TIRE = 0x141416;
  const CHROME = 0xdcdcdc;
  const ENGINE_SILVER = 0x9ea4ab;
  const WHITE = 0xf7f7f2;
  const HONDA_RED = 0xd61f26;
  const AMBER = 0xff9f1c;

  // 1. Hai bánh xe Honda (lốp đen + vành nan hoa / mâm đúc kim loại + phanh đĩa)
  for (const x of [-0.54, 0.54]) {
    parts.push(part(new THREE.CylinderGeometry(0.26, 0.26, 0.085, 16), TIRE, [x, 0.26, 0], Math.PI / 2));
    parts.push(part(new THREE.CylinderGeometry(0.185, 0.185, 0.09, 14), CHROME, [x, 0.26, 0], Math.PI / 2));
    parts.push(part(new THREE.CylinderGeometry(0.055, 0.055, 0.11, 10), ENGINE_SILVER, [x, 0.26, 0], Math.PI / 2));
  }

  // 2. Phuộc nhún trước & giảm xóc lò xo đôi phía sau
  for (const sz of [-0.07, 0.07]) {
    parts.push(part(box(0.035, 0.46, 0.035), CHROME, [0.45, 0.39, sz], 0, 0, -0.26));
    parts.push(part(box(0.03, 0.32, 0.03), HONDA_RED, [-0.46, 0.34, sz], 0, 0, 0.25));
  }

  // 3. Khung sườn & Thân xe Honda
  if (def.type === 'sh') {
    // Dáng xe tay ga Honda SH / Honda Vision: mặt nạ chữ V mạ crôm, sàn để chân phẳng, yên 2 tầng
    parts.push(part(box(0.96, 0.26, 0.34), def.bodyColor, [-0.04, 0.44, 0]));
    // Sàn để chân nhựa nhám đen
    parts.push(part(box(0.32, 0.06, 0.32), DARK, [0.14, 0.3, 0]));
    // Mặt nạ trước Honda SH kèm dải crôm chữ V
    parts.push(part(box(0.24, 0.44, 0.32), def.bodyColor, [0.38, 0.54, 0], 0, 0, -0.18));
    parts.push(part(box(0.03, 0.18, 0.22), CHROME, [0.5, 0.56, 0], 0, 0, -0.18));
    parts.push(part(box(0.035, 0.05, 0.14), HONDA_RED, [0.51, 0.64, 0])); // Logo Honda đỏ ở mũi
    // Dè chắn bùn trước
    parts.push(part(box(0.24, 0.08, 0.18), def.bodyColor, [0.54, 0.38, 0], 0, 0, -0.15));
    // Yên da 2 tầng Honda SH
    parts.push(part(box(0.62, 0.09, 0.31), DARK, [-0.16, 0.59, 0]));
    // Tay dắt sau mạ bạc
    parts.push(part(box(0.18, 0.04, 0.28), ENGINE_SILVER, [-0.52, 0.59, 0]));
    // Tem chữ SH / HONDA chạy dọc thân sau
    for (const sz of [-0.175, 0.175]) {
      parts.push(part(box(0.45, 0.035, 0.01), HONDA_RED, [-0.18, 0.47, sz]));
    }
  } else {
    // Dáng xe số quốc dân Honda Wave Alpha / Honda Super Dream:
    // Lốc máy bạc Honda ở gầm giữa
    parts.push(part(box(0.34, 0.18, 0.22), ENGINE_SILVER, [0.05, 0.28, 0]));
    // Thân xe thon gọn
    parts.push(part(box(0.88, 0.2, 0.23), def.bodyColor, [-0.06, 0.44, 0]));
    // Tem cánh chim Honda trắng - đỏ dọc sườn xe
    for (const sz of [-0.12, 0.12]) {
      parts.push(part(box(0.48, 0.04, 0.01), WHITE, [-0.12, 0.45, sz]));
      parts.push(part(box(0.32, 0.02, 0.012), HONDA_RED, [-0.14, 0.43, sz]));
    }
    // Yếm xe màu trắng sữa huyền thoại của Honda Wave / Dream
    parts.push(part(box(0.24, 0.4, 0.34), WHITE, [0.26, 0.46, 0], 0, 0, -0.2));
    // Mặt nạ trước và dè trước đồng màu thân xe
    parts.push(part(box(0.2, 0.22, 0.22), def.bodyColor, [0.38, 0.56, 0], 0, 0, -0.2));
    parts.push(part(box(0.24, 0.08, 0.16), def.bodyColor, [0.52, 0.38, 0], 0, 0, -0.15));
    // Yên xe đen dài
    parts.push(part(box(0.56, 0.08, 0.23), DARK, [-0.16, 0.55, 0]));
    // Giỏ sắt đen/inox phía trước mũi xe Wave
    parts.push(part(box(0.18, 0.16, 0.24), DARK, [0.54, 0.54, 0]));
  }

  // 4. Ống xả bô inox sáng bóng bên phải & hộp xích bên trái
  parts.push(part(new THREE.CylinderGeometry(0.038, 0.044, 0.72, 10), CHROME, [-0.18, 0.24, 0.14], 0, 0, Math.PI / 2 - 0.08));
  parts.push(part(box(0.52, 0.08, 0.03), ENGINE_SILVER, [-0.26, 0.26, -0.11]));

  // 5. Đầu đèn, Ghi-đông, Đèn pha & Đèn xi-nhan vàng
  parts.push(part(box(0.14, 0.12, 0.24), def.bodyColor, [0.42, 0.73, 0]));
  parts.push(part(box(0.05, 0.05, 0.52), DARK, [0.4, 0.73, 0])); // tay nắm ghi-đông
  parts.push(part(box(0.04, 0.09, 0.14), 0xffffdd, [0.49, 0.73, 0])); // chóa đèn pha sáng
  for (const sz of [-0.09, 0.09]) {
    parts.push(part(box(0.035, 0.06, 0.04), AMBER, [0.48, 0.73, sz])); // xi-nhan trước
    parts.push(part(box(0.03, 0.05, 0.04), AMBER, [-0.54, 0.5, sz])); // xi-nhan sau
  }
  // Đèn hậu đỏ & chắn bùn sau
  parts.push(part(box(0.04, 0.07, 0.1), 0xff2222, [-0.55, 0.51, 0]));
  parts.push(part(box(0.08, 0.18, 0.14), DARK, [-0.56, 0.38, 0], 0, 0, 0.35));

  // 6. Gương chiếu hậu hai bên
  for (const sz of [-0.22, 0.22]) {
    parts.push(part(box(0.015, 0.12, 0.015), CHROME, [0.39, 0.8, sz * 0.75]));
    parts.push(part(box(0.02, 0.05, 0.08), DARK, [0.39, 0.86, sz]));
  }

  // 7. Thùng hàng Shipper phía sau (nếu là xe Shipper)
  if (def.type === 'shipper' && def.shipperBox) {
    const boxCol = def.shipperBox === 'grab' ? 0x00b14f : 0xee4d2d;
    parts.push(part(box(0.38, 0.38, 0.38), boxCol, [-0.38, 0.74, 0]));
    parts.push(part(box(0.39, 0.04, 0.39), WHITE, [-0.38, 0.9, 0]));
  }

  const bikeMesh = new THREE.Mesh(merge(parts), vertexColorMat);
  bikeMesh.castShadow = true;
  group.add(bikeMesh);

  // Biển số Hà Nội 29-H1 phía đuôi xe Honda
  const plateTex = makePlateCanvas('29-H1', '688.88');
  if (plateTex) {
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.14, 0.1),
      new THREE.MeshBasicMaterial({ map: plateTex }),
    );
    plate.position.set(-0.6, 0.4, 0);
    plate.rotation.y = -Math.PI / 2;
    group.add(plate);
  }

  // 8. TÀI XẾ LÁI XE MÁY CÓ MŨ BẢO HIỂM (RIDER)
  const rider = createMotorbikeRider(def);
  group.add(rider);

  return group;
}

/** Tạo người lái xe máy chuẩn Việt Nam: ngồi cúi nhẹ, 2 tay cầm ghi đông, đội mũ bảo hiểm */
function createMotorbikeRider(def: MotorbikeDef): THREE.Group {
  const rider = new THREE.Group();
  const riderParts: THREE.BufferGeometry[] = [];

  const SKIN = 0xdeb887;
  const PANTS = 0x222c36;
  const shirtColor =
    def.shipperBox === 'grab'
      ? 0x00b14f
      : def.shipperBox === 'shopee'
        ? 0xee4d2d
        : def.riderShirtColor;

  // Mông & đùi ngồi trên yên xe
  riderParts.push(part(box(0.22, 0.16, 0.22), PANTS, [-0.08, 0.62, 0]));
  for (const sz of [-0.12, 0.12]) {
    riderParts.push(part(box(0.12, 0.28, 0.08), PANTS, [0.08, 0.48, sz], 0, 0, -0.4));
    riderParts.push(part(box(0.14, 0.06, 0.07), 0x111111, [0.14, 0.34, sz]));
  }

  // Thân trên người lái
  riderParts.push(part(box(0.24, 0.34, 0.24), shirtColor, [0.04, 0.82, 0], 0, 0, -0.2));

  // Hai cánh tay vươn ra nắm ghi-đông
  for (const sz of [-0.18, 0.18]) {
    riderParts.push(part(box(0.28, 0.08, 0.08), shirtColor, [0.22, 0.82, sz], 0, 0, -0.4));
    riderParts.push(part(new THREE.SphereGeometry(0.04, 6, 6), SKIN, [0.38, 0.72, sz]));
  }

  // Cổ và đầu
  riderParts.push(part(new THREE.SphereGeometry(0.11, 10, 8), SKIN, [0.12, 1.05, 0]));

  // Mũ bảo hiểm nửa đầu chuẩn Việt Nam
  const helmetCol = def.shipperBox ? (def.shipperBox === 'grab' ? 0x00b14f : 0xee4d2d) : def.helmetColor;
  riderParts.push(
    part(
      new THREE.SphereGeometry(0.125, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      helmetCol,
      [0.12, 1.08, 0],
    ),
  );
  riderParts.push(part(box(0.08, 0.015, 0.16), 0x111111, [0.22, 1.08, 0], 0, 0, -0.15));
  riderParts.push(part(box(0.015, 0.12, 0.18), 0x111111, [0.12, 1.02, 0]));

  const riderMesh = new THREE.Mesh(merge(riderParts), vertexColorMat);
  riderMesh.castShadow = true;
  rider.add(riderMesh);

  return rider;
}

// ==========================================
// 2. TẠO HÌNH Ô TÔ ĐIỆN VINFAST XANH SM (VF e34 / VF 5 / VF 8)
// ==========================================

export interface CarDef {
  type: 'xanh_sm' | 'xanh_sm_plus';
  variant?: 'vfe34' | 'vf5';
}

function makeXanhSmDoorDecal(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#00beaf';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px "Segoe UI", Arial, sans-serif';
    ctx.fillText('XANH SM', 128, 34);
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
    ctx.fillText('TAXI ĐIỆN VINFAST', 128, 54);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createVietnamCar(def: CarDef): THREE.Group {
  const group = new THREE.Group();
  const parts: THREE.BufferGeometry[] = [];

  const TIRE = 0x151518;
  const DARK_TRIM = 0x1f2428;
  const GLASS = 0x1d2c3a;
  const CHROME = 0xe8ecf0;
  const WHITE_LED = 0xffffff;
  const RED_LED = 0xff2222;
  // Màu xanh lục lam (Cyan) đặc trưng của Taxi điện VinFast Xanh SM
  const XANH_SM = def.type === 'xanh_sm_plus' ? 0x00a89a : 0x00beaf;
  const ROOF_COL = def.variant === 'vf5' ? 0xf5f7fa : XANH_SM; // VF 5 phối nóc trắng thể thao

  // 1. Thân xe SUV/Crossover điện VinFast (dài 4.1m, rộng 1.74m)
  // Ốp cản gầm đen thể thao SUV
  parts.push(part(box(4.12, 0.16, 1.74), DARK_TRIM, [0, 0.24, 0]));
  // Thân chính màu Xanh SM
  parts.push(part(box(4.08, 0.48, 1.72), XANH_SM, [0, 0.52, 0]));

  // 2. Nóc xe & Cabin kính đen sang trọng
  parts.push(part(box(2.35, 0.44, 1.54), DARK_TRIM, [-0.18, 0.94, 0]));
  parts.push(part(box(2.25, 0.07, 1.52), ROOF_COL, [-0.18, 1.18, 0]));

  // Kính chắn gió trước & kính hậu dốc khí động học
  parts.push(part(box(0.68, 0.46, 1.48), GLASS, [0.95, 0.88, 0], 0, 0, -0.62));
  parts.push(part(box(0.55, 0.44, 1.48), GLASS, [-1.28, 0.88, 0], 0, 0, 0.55));
  // Kính cửa sổ hai bên hông
  for (const sz of [-0.78, 0.78]) {
    parts.push(part(box(2.05, 0.36, 0.02), GLASS, [-0.18, 0.94, sz]));
    // Gương chiếu hậu sơn màu Xanh SM
    parts.push(part(box(0.14, 0.1, 0.14), XANH_SM, [0.68, 0.8, sz * 1.12]));
  }

  // 3. NHẬN DIỆN THƯƠNG HIỆU VINFAST: Dải đèn LED cánh chim chữ V phát sáng trước & sau + Logo chữ V bạc ở tâm
  // Cánh chữ V phía trước mũi xe (x = +2.05)
  parts.push(part(box(0.05, 0.045, 0.72), WHITE_LED, [2.05, 0.62, -0.42], 0.14, 0, 0));
  parts.push(part(box(0.05, 0.045, 0.72), WHITE_LED, [2.05, 0.62, 0.42], -0.14, 0, 0));
  // Logo chữ V mạ crôm chính giữa mũi xe VinFast
  parts.push(part(box(0.06, 0.14, 0.04), CHROME, [2.06, 0.56, -0.04], 0.35, 0, 0));
  parts.push(part(box(0.06, 0.14, 0.04), CHROME, [2.06, 0.56, 0.04], -0.35, 0, 0));
  // Cụm đèn pha LED định vị dưới cản trước
  for (const sz of [-0.64, 0.64]) {
    parts.push(part(box(0.06, 0.12, 0.24), WHITE_LED, [2.05, 0.44, sz]));
  }

  // Cánh chữ V đèn hậu LED đỏ phía đuôi xe (x = -2.05)
  parts.push(part(box(0.05, 0.05, 0.72), RED_LED, [-2.05, 0.66, -0.42], -0.14, 0, 0));
  parts.push(part(box(0.05, 0.05, 0.72), RED_LED, [-2.05, 0.66, 0.42], 0.14, 0, 0));
  parts.push(part(box(0.06, 0.14, 0.04), CHROME, [-2.06, 0.6, -0.04], -0.35, 0, 0));
  parts.push(part(box(0.06, 0.14, 0.04), CHROME, [-2.06, 0.6, 0.04], 0.35, 0, 0));

  // 4. 4 Bánh xe mâm đúc hợp kim 5 chấu VinFast
  for (const x of [-1.32, 1.32]) {
    for (const z of [-0.86, 0.86]) {
      parts.push(part(new THREE.CylinderGeometry(0.33, 0.33, 0.2, 16), TIRE, [x, 0.33, z], Math.PI / 2));
      parts.push(part(new THREE.CylinderGeometry(0.21, 0.21, 0.21, 12), CHROME, [x, 0.33, z], Math.PI / 2));
      parts.push(part(new THREE.CylinderGeometry(0.06, 0.06, 0.22, 8), DARK_TRIM, [x, 0.33, z], Math.PI / 2));
    }
  }

  // 5. Mào đèn TAXI XANH SM trên nóc xe
  parts.push(part(box(0.28, 0.13, 0.62), WHITE_LED, [-0.1, 1.27, 0]));
  parts.push(part(box(0.3, 0.03, 0.66), XANH_SM, [-0.1, 1.21, 0]));

  const carMesh = new THREE.Mesh(merge(parts), vertexColorMat);
  carMesh.castShadow = true;
  group.add(carMesh);

  // 6. Tem cửa "XANH SM - TAXI ĐIỆN VINFAST" hai bên sườn + Biển số vàng kinh doanh vận tải 29E
  const doorTex = makeXanhSmDoorDecal();
  if (doorTex) {
    const decalMat = new THREE.MeshBasicMaterial({ map: doorTex });
    const leftDecal = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.32), decalMat);
    leftDecal.position.set(-0.05, 0.5, 0.865);
    const rightDecal = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.32), decalMat);
    rightDecal.position.set(-0.05, 0.5, -0.865);
    rightDecal.rotation.y = Math.PI;
    group.add(leftDecal, rightDecal);
  }

  const taxiPlateTex = makePlateCanvas('29E', '088.68', '#f5c518', '#111111');
  if (taxiPlateTex) {
    const plateMat = new THREE.MeshBasicMaterial({ map: taxiPlateTex });
    const frontPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.16), plateMat);
    frontPlate.position.set(2.07, 0.32, 0);
    frontPlate.rotation.y = Math.PI / 2;
    const rearPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.16), plateMat);
    rearPlate.position.set(-2.07, 0.36, 0);
    rearPlate.rotation.y = -Math.PI / 2;
    group.add(frontPlate, rearPlate);
  }

  return group;
}

// ==========================================
// 3. QUẢN LÝ GIAO THÔNG VIỆT NAM (VINFAST XANH SM & XE MÁY HONDA)
// ==========================================

export interface TrafficVehicle {
  group: THREE.Group;
  x: number;
  laneZ: number;
  dir: 1 | -1; // 1: đi sang phải (+x), -1: đi sang trái (-x)
  speed: number;
  type: 'motorbike' | 'car';
  active: boolean;
}

export class VietnamTrafficManager {
  readonly group = new THREE.Group();
  private readonly vehicles: TrafficVehicle[] = [];

  constructor() {
    this.spawnVehicles();
  }

  private spawnVehicles(): void {
    // 1. Dàn xe máy Honda Việt Nam (Honda Wave Alpha, Super Dream, Vision, SH)
    const bikeConfigs: MotorbikeDef[] = [
      // Honda Wave Alpha đỏ cờ + yếm trắng + giỏ sắt
      { type: 'wave', bodyColor: 0xc81d25, riderShirtColor: 0x334e68, helmetColor: 0x222222 },
      // Honda Wave Alpha xanh dương + yếm trắng
      { type: 'wave', bodyColor: 0x1d4ed8, riderShirtColor: 0xf5f5f5, helmetColor: 0xc81d25 },
      // Honda Wave Shipper GrabFood
      { type: 'shipper', bodyColor: 0x00b14f, riderShirtColor: 0x00b14f, helmetColor: 0x00b14f, shipperBox: 'grab' },
      // Honda Vision trắng ngọc trai
      { type: 'sh', bodyColor: 0xf4f4f6, riderShirtColor: 0x1f2937, helmetColor: 0x0ea5e9 },
      // Honda Wave Shipper ShopeeFood
      { type: 'shipper', bodyColor: 0xee4d2d, riderShirtColor: 0xee4d2d, helmetColor: 0xee4d2d, shipperBox: 'shopee' },
      // Honda SH đen mờ lịch lãm
      { type: 'sh', bodyColor: 0x22252a, riderShirtColor: 0xd97706, helmetColor: 0xf59e0b },
      // Honda Super Dream nâu nho huyền thoại + yếm trắng
      { type: 'wave', bodyColor: 0x5c2c24, riderShirtColor: 0xe2e8f0, helmetColor: 0x1e293b },
      // Honda SH đỏ đô
      { type: 'sh', bodyColor: 0x991b1b, riderShirtColor: 0x0284c7, helmetColor: 0xf8fafc },
    ];

    bikeConfigs.forEach((cfg, i) => {
      const dir: 1 | -1 = i % 2 === 0 ? 1 : -1;
      // Làn xe máy Honda sát mép đường ngay trước quán trà đá
      const laneZ = dir === 1 ? 4.65 + (i % 2) * 0.25 : 7.55 + (i % 2) * 0.25;
      const mesh = createVietnamMotorbike(cfg);
      mesh.rotation.y = dir === 1 ? 0 : Math.PI;

      const tv: TrafficVehicle = {
        group: mesh,
        x: -32 + (i * 9) % 64,
        laneZ,
        dir,
        speed: 4.5 + (i % 3) * 0.9,
        type: 'motorbike',
        active: true,
      };
      mesh.position.set(tv.x, -0.12, tv.laneZ);
      this.group.add(mesh);
      this.vehicles.push(tv);
    });

    // 2. Dàn Ô tô điện VinFast Xanh SM (VF e34 & VF 5 phối nóc trắng)
    const carConfigs: CarDef[] = [
      { type: 'xanh_sm', variant: 'vfe34' },
      { type: 'xanh_sm', variant: 'vf5' },
      { type: 'xanh_sm_plus', variant: 'vfe34' },
      { type: 'xanh_sm', variant: 'vfe34' },
      { type: 'xanh_sm', variant: 'vf5' },
      { type: 'xanh_sm_plus', variant: 'vf5' },
    ];

    carConfigs.forEach((cfg, i) => {
      const dir: 1 | -1 = i % 2 === 0 ? 1 : -1;
      // Làn ô tô VinFast Xanh SM ở giữa đường ngay trong khung hình mặc định
      const laneZ = dir === 1 ? 5.5 : 6.75;
      const mesh = createVietnamCar(cfg);
      mesh.rotation.y = dir === 1 ? 0 : Math.PI;

      const tv: TrafficVehicle = {
        group: mesh,
        x: -28 + (i * 12) % 60,
        laneZ,
        dir,
        speed: 5.2 + (i % 2) * 1.0,
        type: 'car',
        active: true,
      };
      mesh.position.set(tv.x, -0.12, tv.laneZ);
      this.group.add(mesh);
      this.vehicles.push(tv);
    });
  }

  update(dt: number, trafficDensity = 1.0): void {
    const maxActive = Math.max(5, Math.round(this.vehicles.length * trafficDensity));

    this.vehicles.forEach((v, index) => {
      v.active = index < maxActive;
      v.group.visible = v.active;

      if (!v.active) return;

      v.x += v.dir * v.speed * dt;

      if (v.dir === 1 && v.x > 36) {
        v.x = -36 - Math.random() * 6;
      } else if (v.dir === -1 && v.x < -36) {
        v.x = 36 + Math.random() * 6;
      }

      v.group.position.x = v.x;
    });
  }
}
