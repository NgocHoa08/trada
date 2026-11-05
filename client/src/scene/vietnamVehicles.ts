import * as THREE from 'three';
import { box, part, merge, lambertMat } from './geoUtils';

// ==========================================
// 1. TẠO HÌNH XE MÁY VIỆT NAM (WAVE, SH, SHIPPER)
// ==========================================

export interface MotorbikeDef {
  type: 'wave' | 'sh' | 'shipper';
  bodyColor: number;
  riderShirtColor: number;
  helmetColor: number;
  shipperBox?: 'grab' | 'shopee';
}

export function createVietnamMotorbike(def: MotorbikeDef): THREE.Group {
  const group = new THREE.Group();
  const parts: THREE.BufferGeometry[] = [];

  const DARK = 0x1a1a1a;
  const CHROME = 0xd8d8d8;
  const WHITE = 0xf5f5f5;

  // 1. Hai bánh xe nan hoa / mâm đúc
  for (const x of [-0.52, 0.52]) {
    // Lốp cao su đen
    parts.push(part(new THREE.CylinderGeometry(0.26, 0.26, 0.08, 14), DARK, [x, 0.26, 0], Math.PI / 2));
    // Vành xe kim loại sáng
    parts.push(part(new THREE.CylinderGeometry(0.18, 0.18, 0.085, 12), CHROME, [x, 0.26, 0], Math.PI / 2));
    // Trục moay-ơ giữa
    parts.push(part(new THREE.CylinderGeometry(0.04, 0.04, 0.11, 8), CHROME, [x, 0.26, 0], Math.PI / 2));
  }

  // 2. Phuộc trước và phuộc sau
  parts.push(part(box(0.04, 0.44, 0.08), CHROME, [0.46, 0.38, 0], 0, 0, -0.25));
  parts.push(part(box(0.03, 0.32, 0.06), CHROME, [-0.44, 0.32, 0], 0, 0, 0.3));

  // 3. Khung sườn & Thân xe
  if (def.type === 'sh') {
    // Dáng xe ga SH: bầu bĩnh, sàn để chân phẳng
    parts.push(part(box(0.95, 0.26, 0.32), def.bodyColor, [0, 0.44, 0]));
    parts.push(part(box(0.55, 0.08, 0.3), DARK, [-0.15, 0.58, 0])); // yên xe ga
    parts.push(part(box(0.24, 0.32, 0.3), def.bodyColor, [0.38, 0.54, 0])); // mặt nạ SH
    parts.push(part(box(0.25, 0.06, 0.28), DARK, [0.12, 0.32, 0])); // sàn để chân
  } else {
    // Dáng xe số Wave / Dream: thon dài, có yếm trắng kinh điển
    parts.push(part(box(0.9, 0.2, 0.22), def.bodyColor, [0, 0.42, 0]));
    parts.push(part(box(0.5, 0.07, 0.22), DARK, [-0.15, 0.53, 0])); // yên xe
    // Yếm xe màu trắng sữa huyền thoại của Wave/Dream
    parts.push(part(box(0.26, 0.38, 0.3), WHITE, [0.24, 0.46, 0], 0, 0, -0.2));
    // Mũi xe và dè trước
    parts.push(part(box(0.22, 0.12, 0.2), def.bodyColor, [0.42, 0.48, 0]));

    // GIỎ XE KIM LOẠI NAN SẮT PHÍA TRƯỚC (đặc trưng 100% của xe Wave Việt Nam!)
    parts.push(part(box(0.18, 0.16, 0.24), CHROME, [0.55, 0.52, 0]));
  }

  // 4. Ống xả bô inox dài dọc thân bên phải
  parts.push(part(new THREE.CylinderGeometry(0.035, 0.04, 0.75, 8), CHROME, [-0.15, 0.22, 0.14], 0, 0, Math.PI / 2));

  // 5. Ghi-đông & Đèn pha
  parts.push(part(box(0.06, 0.06, 0.48), DARK, [0.42, 0.72, 0])); // tay lái
  parts.push(part(box(0.08, 0.08, 0.16), 0xffffff, [0.46, 0.72, 0])); // đèn pha

  // 6. Gương chiếu hậu
  parts.push(part(new THREE.CircleGeometry(0.035, 8), CHROME, [0.38, 0.82, -0.22], 0, -Math.PI / 2));
  parts.push(part(new THREE.CircleGeometry(0.035, 8), CHROME, [0.38, 0.82, 0.22], 0, -Math.PI / 2));

  // 7. Thùng hàng Shipper lớn phía sau (nếu là xe Shipper)
  if (def.type === 'shipper' && def.shipperBox) {
    const boxCol = def.shipperBox === 'grab' ? 0x00b14f : 0xee4d2d; // xanh Grab hoặc cam Shopee
    parts.push(part(box(0.38, 0.38, 0.38), boxCol, [-0.38, 0.72, 0]));
    // Viền nắp thùng phản quang
    parts.push(part(box(0.39, 0.04, 0.39), 0xffffff, [-0.38, 0.88, 0]));
  }

  const bikeMesh = new THREE.Mesh(merge(parts), lambertMat(def.bodyColor));
  bikeMesh.castShadow = true;
  group.add(bikeMesh);

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
  const PANTS = 0x222c36; // quần jean xanh đen
  const shirtColor = def.shipperBox === 'grab'
    ? 0x00b14f
    : def.shipperBox === 'shopee'
      ? 0xee4d2d
      : def.riderShirtColor;

  // Mông & đùi ngồi trên yên xe
  riderParts.push(part(box(0.22, 0.16, 0.22), PANTS, [-0.08, 0.62, 0]));
  // 2 chân co về sàn để chân / cần số
  for (const sz of [-0.12, 0.12]) {
    riderParts.push(part(box(0.12, 0.28, 0.08), PANTS, [0.08, 0.48, sz], 0, 0, -0.4));
    // Giày đen
    riderParts.push(part(box(0.14, 0.06, 0.07), 0x111111, [0.14, 0.34, sz]));
  }

  // Thân trên người lái (hơi ngả về phía trước lái xe)
  riderParts.push(part(box(0.24, 0.34, 0.24), shirtColor, [0.04, 0.82, 0], 0, 0, -0.2));

  // Hai cánh tay vươn ra nắm ghi-đông
  for (const sz of [-0.18, 0.18]) {
    riderParts.push(part(box(0.28, 0.08, 0.08), shirtColor, [0.22, 0.82, sz], 0, 0, -0.4));
    // Bàn tay nắm tay ga
    riderParts.push(part(new THREE.SphereGeometry(0.04, 6, 6), SKIN, [0.38, 0.72, sz]));
  }

  // Cổ và đầu
  riderParts.push(part(new THREE.SphereGeometry(0.11, 10, 8), SKIN, [0.12, 1.05, 0]));

  // MŨ BẢO HIỂM CHUẨN VIỆT NAM (đội trên đầu, có lưỡi trai ngắn)
  const helmetCol = def.shipperBox ? (def.shipperBox === 'grab' ? 0x00b14f : 0xee4d2d) : def.helmetColor;
  riderParts.push(part(new THREE.SphereGeometry(0.125, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), helmetCol, [0.12, 1.08, 0]));
  // Lưỡi trai mũ bảo hiểm chìa ra phía trước
  riderParts.push(part(box(0.08, 0.015, 0.16), helmetCol, [0.22, 1.08, 0], 0, 0, -0.15));
  // Quai cài mũ bảo hiểm
  riderParts.push(part(box(0.015, 0.12, 0.18), 0x111111, [0.12, 1.02, 0]));

  const riderMesh = new THREE.Mesh(merge(riderParts), lambertMat(shirtColor));
  riderMesh.castShadow = true;
  rider.add(riderMesh);

  return rider;
}

// ==========================================
// 2. TẠO HÌNH Ô TÔ VIỆT NAM (TAXI XANH SM, BUÝT HÀ NỘI, MAI LINH, SEDAN)
// ==========================================

export interface CarDef {
  type: 'xanh_sm' | 'hanoibus' | 'mailinh' | 'sedan';
  color?: number;
}

export function createVietnamCar(def: CarDef): THREE.Group {
  const group = new THREE.Group();

  if (def.type === 'hanoibus') {
    return createHanoiBus();
  }

  const parts: THREE.BufferGeometry[] = [];
  const DARK = 0x1a1a1a;
  const GLASS = 0x243342;
  const CHROME = 0xdddddd;

  let mainColor = 0xf0f0f0; // sedan trắng
  if (def.type === 'xanh_sm') {
    mainColor = 0x00beaf; // XANH NGỌC CYAN ĐẶC TRƯNG TAXI ĐIỆN VINFAST XANH SM
  } else if (def.type === 'mailinh') {
    mainColor = 0x00843d; // XANH LÁ CÂY ĐẬM TAXI MAI LINH
  } else if (def.color) {
    mainColor = def.color;
  }

  // Kích thước xe sedan / crossover (dài 4.2m, rộng 1.7m, cao 1.45m)
  // 1. Thân dưới xe
  parts.push(part(box(4.2, 0.52, 1.72), mainColor, [0, 0.44, 0]));

  // 2. Nóc xe & Cabin kính
  parts.push(part(box(2.2, 0.46, 1.54), mainColor, [-0.15, 0.92, 0]));
  // Kính lái trước (dốc nghiêng)
  parts.push(part(box(0.65, 0.44, 1.5), GLASS, [0.92, 0.82, 0], 0, 0, -0.65));
  // Kính sau
  parts.push(part(box(0.65, 0.44, 1.5), GLASS, [-1.22, 0.82, 0], 0, 0, 0.65));
  // Kính hông hai bên
  for (const sz of [-0.78, 0.78]) {
    parts.push(part(box(1.9, 0.36, 0.02), GLASS, [-0.15, 0.88, sz]));
  }

  // 3. Đèn pha trước & Đèn hậu đỏ
  if (def.type === 'xanh_sm') {
    // Dải đèn LED cánh chim đặc trưng VinFast
    parts.push(part(box(0.06, 0.06, 1.4), 0xffffff, [2.11, 0.52, 0]));
    parts.push(part(box(0.06, 0.06, 1.4), 0xff2222, [-2.11, 0.52, 0]));
  } else {
    for (const sz of [-0.62, 0.62]) {
      parts.push(part(box(0.08, 0.1, 0.28), 0xffffff, [2.11, 0.48, sz]));
      parts.push(part(box(0.08, 0.1, 0.28), 0xdd2222, [-2.11, 0.48, sz]));
    }
  }

  // 4. 4 Bánh xe ô tô
  for (const x of [-1.35, 1.35]) {
    for (const z of [-0.86, 0.86]) {
      // Lốp xe
      parts.push(part(new THREE.CylinderGeometry(0.32, 0.32, 0.18, 14), DARK, [x, 0.32, z], Math.PI / 2));
      // Vành đúc kim loại
      parts.push(part(new THREE.CylinderGeometry(0.2, 0.2, 0.19, 10), CHROME, [x, 0.32, z], Math.PI / 2));
    }
  }

  // 5. Hộp đèn TAXI trên nóc (cho Taxi Xanh SM & Mai Linh)
  if (def.type === 'xanh_sm' || def.type === 'mailinh') {
    const taxiLampCol = def.type === 'xanh_sm' ? 0x00beaf : 0xffdd00;
    parts.push(part(box(0.24, 0.12, 0.52), taxiLampCol, [-0.15, 1.2, 0]));
    parts.push(part(box(0.22, 0.09, 0.48), 0xffffff, [-0.15, 1.2, 0]));
  }

  // 6. Decal sọc vàng Mai Linh dọc thân xe
  if (def.type === 'mailinh') {
    for (const sz of [-0.87, 0.87]) {
      parts.push(part(box(3.2, 0.08, 0.01), 0xf5b700, [0, 0.44, sz]));
    }
  }

  const carMesh = new THREE.Mesh(merge(parts), lambertMat(mainColor));
  carMesh.castShadow = true;
  group.add(carMesh);

  return group;
}

/** TẠO HÌNH XE BUÝT HÀ NỘI (HANOIBUS ĐỎ - VÀNG HUYỀN THOẠI) */
function createHanoiBus(): THREE.Group {
  const group = new THREE.Group();
  const parts: THREE.BufferGeometry[] = [];

  const RED = 0xc92a2a;    // Nửa dưới đỏ cờ Hanoibus
  const YELLOW = 0xf2c938; // Nửa trên vàng chanh Hanoibus
  const GLASS = 0x223344;
  const DARK = 0x181818;
  const CHROME = 0xcccccc;

  // Kích thước xe bus: dài 7.8m, rộng 2.2m, cao 2.7m
  // 1. Thân dưới màu đỏ
  parts.push(part(box(7.8, 1.1, 2.2), RED, [0, 0.8, 0]));

  // 2. Thân trên & Mái vòm màu vàng chanh
  parts.push(part(box(7.8, 0.4, 2.2), YELLOW, [0, 2.5, 0]));
  // Dải cột trụ sơn vàng ngăn giữa các cửa sổ
  parts.push(part(box(0.12, 1.1, 2.22), YELLOW, [1.8, 1.8, 0]));
  parts.push(part(box(0.12, 1.1, 2.22), YELLOW, [0, 1.8, 0]));
  parts.push(part(box(0.12, 1.1, 2.22), YELLOW, [-1.8, 1.8, 0]));

  // 3. Cửa kính lớn phía trước (kính lái buýt)
  parts.push(part(box(0.06, 1.2, 2.05), GLASS, [3.91, 1.8, 0]));
  // Kính sau xe buýt
  parts.push(part(box(0.06, 0.9, 2.05), GLASS, [-3.91, 1.9, 0]));
  // Kính hông hai bên dọc suốt thân xe
  for (const sz of [-1.11, 1.11]) {
    parts.push(part(box(7.4, 0.95, 0.04), GLASS, [0, 1.8, sz]));
  }

  // 4. Bảng điện tử LED tuyến buýt Hà Nội phía trên kính lái
  parts.push(part(box(0.1, 0.22, 1.5), 0x050505, [3.92, 2.45, 0]));
  parts.push(part(box(0.04, 0.16, 1.35), 0xff8800, [3.96, 2.45, 0])); // LED vàng cam báo tuyến 01

  // 5. Cửa lên xuống hành khách phía bên phải xe
  parts.push(part(box(0.85, 1.8, 0.05), DARK, [2.3, 1.2, 1.11]));
  parts.push(part(box(0.85, 1.8, 0.05), DARK, [-1.2, 1.2, 1.11]));

  // 6. Đèn pha & Đèn hậu buýt
  for (const sz of [-0.85, 0.85]) {
    parts.push(part(box(0.08, 0.15, 0.25), 0xffffff, [3.92, 0.55, sz]));
    parts.push(part(box(0.08, 0.25, 0.18), 0xdd2222, [-3.92, 0.7, sz]));
  }

  // 7. 6 Bánh xe buýt to bản
  for (const x of [-2.4, 2.5]) {
    for (const z of [-1.1, 1.1]) {
      // Lốp xe to
      parts.push(part(new THREE.CylinderGeometry(0.44, 0.44, 0.26, 14), DARK, [x, 0.44, z], Math.PI / 2));
      // Vành đúc
      parts.push(part(new THREE.CylinderGeometry(0.26, 0.26, 0.27, 10), CHROME, [x, 0.44, z], Math.PI / 2));
    }
  }

  const busMesh = new THREE.Mesh(merge(parts), lambertMat(RED));
  busMesh.castShadow = true;
  group.add(busMesh);

  return group;
}

// ==========================================
// 3. QUẢN LÝ GIAO THÔNG VIỆT NAM (TRAFFIC MANAGER)
// ==========================================

export interface TrafficVehicle {
  group: THREE.Group;
  x: number;
  laneZ: number;
  dir: 1 | -1; // 1: đi sang phải (+x), -1: đi sang trái (-x)
  speed: number;
  type: 'motorbike' | 'car' | 'bus';
  active: boolean;
}

export class VietnamTrafficManager {
  readonly group = new THREE.Group();
  private readonly vehicles: TrafficVehicle[] = [];

  constructor() {
    this.spawnVehicles();
  }

  private spawnVehicles(): void {
    // 1. Dàn xe máy Việt Nam (Wave, SH, Shipper Grab, Shipper Shopee)
    const bikeConfigs: MotorbikeDef[] = [
      // Wave Alpha đỏ cờ kèm tài xế
      { type: 'wave', bodyColor: 0xbd2020, riderShirtColor: 0x334e68, helmetColor: 0x222222 },
      // Wave xanh rêu kèm tài xế
      { type: 'wave', bodyColor: 0x234d38, riderShirtColor: 0xf5f5f5, helmetColor: 0xbd2020 },
      // Xe Shipper GrabFood áo xanh thùng xanh
      { type: 'shipper', bodyColor: 0x00b14f, riderShirtColor: 0x00b14f, helmetColor: 0x00b14f, shipperBox: 'grab' },
      // Xe Shipper ShopeeFood áo cam thùng cam
      { type: 'shipper', bodyColor: 0xee4d2d, riderShirtColor: 0xee4d2d, helmetColor: 0xee4d2d, shipperBox: 'shopee' },
      // Honda SH trắng thanh lịch
      { type: 'sh', bodyColor: 0xf0f0f0, riderShirtColor: 0x1f2937, helmetColor: 0x1f2937 },
      // Honda SH đen mờ
      { type: 'sh', bodyColor: 0x1f1f1f, riderShirtColor: 0xd97706, helmetColor: 0xf59e0b },
      // Wave đen bạc
      { type: 'wave', bodyColor: 0x2b2b2b, riderShirtColor: 0x0284c7, helmetColor: 0x0f172a },
    ];

    bikeConfigs.forEach((cfg, i) => {
      const dir: 1 | -1 = i % 2 === 0 ? 1 : -1;
      // Xe máy chạy làn trong (sát mép vỉa hè hoặc sát lề)
      const laneZ = dir === 1 ? 6.2 + (i % 2) * 0.9 : 12.0 - (i % 2) * 0.9;
      const mesh = createVietnamMotorbike(cfg);
      mesh.rotation.y = dir === 1 ? 0 : Math.PI;

      const tv: TrafficVehicle = {
        group: mesh,
        x: -36 + (i * 11) % 72,
        laneZ,
        dir,
        speed: 4.8 + Math.random() * 2.2,
        type: 'motorbike',
        active: true,
      };
      mesh.position.set(tv.x, -0.12, tv.laneZ);
      this.group.add(mesh);
      this.vehicles.push(tv);
    });

    // 2. Dàn Ô tô Việt Nam (Taxi Xanh SM VinFast, Buýt Hà Nội, Taxi Mai Linh, Sedan trắng)
    const carConfigs: CarDef[] = [
      // TAXI XANH SM (VinFast cyan) chạy chiều +x
      { type: 'xanh_sm' },
      // XE BUÝT HÀ NỘI (Đỏ - Vàng) chạy chiều -x
      { type: 'hanoibus' },
      // TAXI MAI LINH (Xanh lá cây) chạy chiều +x
      { type: 'mailinh' },
      // Ô tô sedan trắng gia đình chạy chiều -x
      { type: 'sedan', color: 0xf5f5f5 },
      // TAXI XANH SM thứ 2 chạy chiều -x
      { type: 'xanh_sm' },
      // Ô tô sedan đỏ đun
      { type: 'sedan', color: 0x8a1c1c },
    ];

    carConfigs.forEach((cfg, i) => {
      const dir: 1 | -1 = i % 2 === 0 ? 1 : -1;
      // Ô tô và Buýt chạy ở làn giữa đường
      const laneZ = dir === 1 ? 8.2 : 10.2;
      const mesh = createVietnamCar(cfg);
      mesh.rotation.y = dir === 1 ? 0 : Math.PI;

      const tv: TrafficVehicle = {
        group: mesh,
        x: -32 + (i * 14) % 68,
        laneZ,
        dir,
        speed: cfg.type === 'hanoibus' ? 4.2 : 5.8 + Math.random() * 1.6,
        type: cfg.type === 'hanoibus' ? 'bus' : 'car',
        active: true,
      };
      mesh.position.set(tv.x, -0.12, tv.laneZ);
      this.group.add(mesh);
      this.vehicles.push(tv);
    });
  }

  update(dt: number, trafficDensity = 1.0): void {
    const maxActive = Math.max(4, Math.round(this.vehicles.length * trafficDensity));

    this.vehicles.forEach((v, index) => {
      v.active = index < maxActive;
      v.group.visible = v.active;

      if (!v.active) return;

      v.x += v.dir * v.speed * dt;

      // Khi xe chạy quá tầm nhìn bên phải (+38m) hoặc bên trái (-38m), xoay vòng sang đầu bên kia
      if (v.dir === 1 && v.x > 38) {
        v.x = -38 - Math.random() * 6;
      } else if (v.dir === -1 && v.x < -38) {
        v.x = 38 + Math.random() * 6;
      }

      v.group.position.set(v.x, -0.12, v.laneZ);
    });
  }
}

