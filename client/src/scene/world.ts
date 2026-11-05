import * as THREE from 'three';
import {
  AVATARS,
  DRINKS,
  MOODS,
  REACTIONS,
  SEATS,
  TABLES,
  type Reaction,
  type SeasonType,
  type WeatherType,
} from '@tdvh/shared';
import { createCharacter, type Character } from './character';
import { getSkyState, lerpColor } from './timeOfDay';
import { box, part, merge, lambertMat } from './geoUtils';
import {
  createHanoiStreetSign,
  createHanoiPowerPole,
  createPowerCables,
  createHanoiTree,
  createHanoiSidewalkProps,
  createSidewalkDog,
  createFlowerBicycle,
} from './hanoiStreet';
import { createHanoiBuildings } from './hanoiBuildings';
import {
  VietnamTrafficManager,
  createVietnamMotorbike,
} from './vietnamVehicles';

export interface World {
  scene: THREE.Scene;
  /** Các đĩa vô hình để raycast chọn ghế; `userData.seatId` chứa id ghế. */
  seatHitTargets: THREE.Object3D[];
  speakerTarget: THREE.Object3D;
  tvTarget: THREE.Object3D;
  bossStallTarget: THREE.Object3D;
  xiangqiTarget: THREE.Object3D;

  sidewalkTarget: THREE.Object3D;
  setHover(seatId: string | null): void;
  flashSeat(seatId: string): void;
  /** Đặt người ngồi vào ghế (hoặc `null` để dọn ghế). Ghế có người thì ẩn vòng sáng. */
  setOccupant(seatId: string, occupant: Occupant | null): void;
  /** Cập nhật trạng thái ly trà đặc biệt (treated). */
  setTreated(seatId: string, treated: boolean): void;
  /** Kích hoạt animation phản ứng và biểu tượng bay lên tại ghế. */
  playReaction(fromSeatId: string, kind: Reaction, toSeatId?: string): void;
  /** Hiện bong bóng "chuyện" trên đầu nhân vật. */
  showStory(seatId: string, text: string): void;
  /** Ẩn bong bóng "chuyện" nếu có. */
  hideStory(seatId: string): void;
  /** Cho nhân vật của người chơi đứng dậy khỏi ghế. */
  standUp(seatId: string): void;
  /** Điều khiển nhân vật người chơi đi bộ đến điểm click trên vỉa hè. */
  walkPlayerTo(targetX: number, targetZ: number): void;
  /** Kiểm tra xem người chơi có đang đứng không. */
  hasStandingPlayer(): boolean;
  /** Cập nhật thời tiết của quán (nắng ráo, mưa rào, âm u). */
  setWeather(weather: WeatherType): void;
  getWeather(): WeatherType;
  /** Cập nhật trạng thái chiếu phim/nhạc trực tiếp trên TV 3D vỉa hè */
  setTvPlaying(playing: boolean, title?: string, videoId?: string): void;
  /** Thay đổi loại đồ uống trong ly (trà đá, cà phê sữa, nước mía, trà chanh, nước sấu) */
  setDrink(drinkId: string): void;
  findPersonByObject(object: THREE.Object3D): { name: string; seatId: string | null } | null;
  getPersonBySeat(seatId: string): { name: string; avatar: string; mood: string } | null;
  setSeason(season: SeasonType): void;



  /**
   * `time` là giây từ lúc mở trang, `hour` là giờ VN dạng số thực,
   * `roundProgress` (0..1) là tiến độ tuần trà từ server để đá tan dần.
   */
  update(dt: number, time: number, hour: number, roundProgress: number): void;
}

export interface Occupant {
  name: string;
  avatar: string;
  mood: string;
}

export interface WorldOptions {
  /** Trên mobile: bỏ shadow, giảm chi tiết. */
  mobile: boolean;
}

const SIDEWALK_Z0 = -6.1;
const SIDEWALK_Z1 = 4.1;
const ROAD_Y = -0.12;

const dummy = new THREE.Object3D();

function makeInstanced(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  items: { x: number; y?: number; z: number; rotY?: number }[],
  colors?: number[],
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geo, mat, items.length);
  items.forEach((it, i) => {
    dummy.position.set(it.x, it.y ?? 0, it.z);
    dummy.rotation.set(0, it.rotY ?? 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    const col = colors?.[i];
    if (col !== undefined) mesh.setColorAt(i, new THREE.Color(col));
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

// ---------- Đồ vật ----------

function chairGeometry(): THREE.BufferGeometry {
  // Ghế đẩu nhựa lùn vỉa hè, hoàn toàn không có tựa lưng.
  // Kích thước chuẩn: ~0.32m x 0.32m x 0.26m. Màu lấy từ instanceColor.
  const W = 0xffffff;
  const parts: THREE.BufferGeometry[] = [];

  // Mặt ghế vuông: 0.32m x 0.32m x 0.025m ở độ cao y = 0.26m
  parts.push(part(box(0.32, 0.025, 0.32), W, [0, 0.26, 0]));

  // Gờ viền rủ xuống mép ngoài (skirt) tạo độ dày khuôn nhựa
  for (const sx of [-1, 1]) {
    parts.push(part(box(0.016, 0.032, 0.32), W, [sx * 0.152, 0.235, 0]));
    parts.push(part(box(0.32, 0.032, 0.016), W, [0, 0.235, sx * 0.152]));
  }

  // 4 chân ghế nhựa
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      parts.push(part(box(0.036, 0.26, 0.036), W, [sx * 0.13, 0.13, sz * 0.13]));
    }
  }

  // 4 thanh giằng ngang gia cường ở chân ghế (đặc trưng ghế nhựa vỉa hè chịu lực)
  for (const sx of [-1, 1]) {
    parts.push(part(box(0.018, 0.02, 0.24), W, [sx * 0.13, 0.06, 0]));
    parts.push(part(box(0.24, 0.02, 0.018), W, [0, 0.06, sx * 0.13]));
  }

  // Gờ lỗ xách đặc trưng ở tâm mặt ghế đẩu nhựa vỉa hè
  parts.push(part(box(0.012, 0.012, 0.07), W, [-0.035, 0.274, 0]));
  parts.push(part(box(0.012, 0.012, 0.07), W, [0.035, 0.274, 0]));

  return merge(parts);
}

/** Ấm trà và đĩa hạt dưa đặt trên mặt ghế nhựa trung tâm (cao độ y ≈ 0.28m). */
function tableTopGeometry(): THREE.BufferGeometry {
  return merge([
    // Ấm trà nhôm/gốm sứ
    part(new THREE.SphereGeometry(0.08, 12, 8), 0x7a8f86, [-0.06, 0.34, 0]),
    // Vòi ấm
    part(new THREE.CylinderGeometry(0.012, 0.02, 0.09, 6), 0x7a8f86, [-0.14, 0.36, 0], Math.PI / 4),
    // Nắp ấm
    part(new THREE.CylinderGeometry(0.035, 0.035, 0.015, 8), 0x697c74, [-0.06, 0.42, 0]),
    // Quai ấm
    part(new THREE.TorusGeometry(0.045, 0.007, 6, 12, Math.PI), 0x7a8f86, [-0.06, 0.425, 0]),
    // Đĩa hạt dưa / kẹo lạc sứ trắng
    part(new THREE.CylinderGeometry(0.095, 0.08, 0.018, 14), 0xf1ebe0, [0.07, 0.28, 0.03]),
    // Đống hạt dưa nâu đỏ
    part(new THREE.SphereGeometry(0.06, 8, 4), 0x4a3524, [0.07, 0.292, 0.03]),
  ]);
}

function makeSignTexture(): THREE.CanvasTexture {
  if (typeof document === 'undefined') {
    return new THREE.CanvasTexture({} as HTMLCanvasElement);
  }
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#1f4e30'; // xanh lá sẫm biển hiệu quán cổ
    ctx.fillRect(0, 0, 512, 160);
    ctx.strokeStyle = '#e9d9a6';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 144);
    ctx.fillStyle = '#f6efd0';
    ctx.textAlign = 'center';
    ctx.font = 'bold 76px "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive';
    ctx.fillText('Trà Đá Vỉa Hè', 256, 90);
    ctx.font = '27px "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive';
    ctx.fillText('trà đá · hạt dưa · kẹo lạc', 256, 132);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface TvRenderer {
  texture: THREE.CanvasTexture;
  update(time: number, isPlaying: boolean, titleText: string): void;
}

function createTvScreenRenderer(): TvRenderer {
  if (typeof document === 'undefined') {
    return {
      texture: new THREE.CanvasTexture({} as HTMLCanvasElement),
      update() {},
    };
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 288;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  let lastDrawnPlaying = false;
  let lastDrawnTitle = '';
  let lastUpdateTime = 0;

  function drawStandby(): void {
    if (!ctx) return;
    const w = 512;
    const h = 288;
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#0c131a');
    grad.addColorStop(0.5, '#172738');
    grad.addColorStop(1, '#0b1017');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    for (let y = 0; y < h; y += 4) {
      ctx.fillRect(0, y, w, 2);
    }

    ctx.strokeStyle = '#2ec4b6';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, w - 12, h - 12);

    ctx.fillStyle = '#f4fbff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 36px system-ui, sans-serif';
    ctx.fillText('📺 TRÀ ĐÁ TV', 256, 105);

    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('🎬 Chiếu Phim & Ca Nhạc Vỉa Hè', 256, 155);

    ctx.fillStyle = '#a8dadc';
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('▶ Nhấp để xem hoặc chọn video', 256, 205);
    texture.needsUpdate = true;
  }

  drawStandby();

  return {
    texture,
    update(time: number, isPlaying: boolean, titleText: string) {
      if (!ctx) return;

      if (!isPlaying) {
        if (lastDrawnPlaying) {
          drawStandby();
          lastDrawnPlaying = false;
        }
        return;
      }

      // Giới hạn tốc độ vẽ màn hình ~25fps để tối ưu hiệu năng
      if (time - lastUpdateTime < 0.04 && lastDrawnTitle === titleText) return;
      lastUpdateTime = time;
      lastDrawnPlaying = true;
      lastDrawnTitle = titleText;

      const w = 512;
      const h = 288;

      // Nền màn hình TV đang phát sóng
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#061019');
      grad.addColorStop(0.5, '#0e2538');
      grad.addColorStop(1, '#07121b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Đường quét ngang TV CRT cổ
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      const scanOffset = (time * 35) % 6;
      for (let y = scanOffset; y < h; y += 6) {
        ctx.fillRect(0, y, w, 2);
      }

      // Viền màn hình neon phát sáng
      ctx.strokeStyle = '#2ec4b6';
      ctx.lineWidth = 5;
      ctx.strokeRect(5, 5, w - 10, h - 10);

      // Header: Chấm đỏ TRỰC TIẾP nhấp nháy
      const blink = Math.sin(time * 8) > 0;
      ctx.fillStyle = blink ? '#ff2a2a' : '#aa1111';
      ctx.beginPath();
      ctx.arc(30, 30, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ff6b6b';
      ctx.textAlign = 'left';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText('TRỰC TIẾP · TRÀ ĐÁ TV 📺', 46, 36);

      // Tiêu đề phim / ca nhạc đang chiếu
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText(titleText, 256, 82, 470);

      // Visualizer dải sóng nhạc / đồ họa chuyển động
      const barCount = 18;
      const barW = 16;
      const startX = 64;
      for (let i = 0; i < barCount; i++) {
        const val = 0.25 + 0.75 * Math.abs(Math.sin(time * 7 + i * 0.7) * Math.cos(time * 3.5 + i * 0.35));
        const barH = val * 82;
        const x = startX + i * 22;
        const y = 200 - barH;

        const bGrad = ctx.createLinearGradient(0, y, 0, 200);
        bGrad.addColorStop(0, '#ffd166');
        bGrad.addColorStop(0.5, '#2ec4b6');
        bGrad.addColorStop(1, '#06d6a0');
        ctx.fillStyle = bGrad;
        ctx.fillRect(x, y, barW, barH);
      }

      // Đường sóng sin vàng mềm mại chạy ở giữa
      ctx.strokeStyle = 'rgba(255, 209, 102, 0.75)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 20; x < w - 20; x += 10) {
        const y = 222 + Math.sin(x * 0.05 + time * 6) * 10;
        if (x === 20) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Thanh trạng thái dưới cùng
      ctx.fillStyle = '#a8dadc';
      ctx.textAlign = 'center';
      ctx.font = '14px system-ui, sans-serif';
      const mm = String(Math.floor((time % 360) / 60)).padStart(2, '0');
      const ss = String(Math.floor(time % 60)).padStart(2, '0');
      ctx.fillText(`🎬 Đang chiếu ngoài vỉa hè quán · [${mm}:${ss}]`, 256, 264);

      texture.needsUpdate = true;
    },
  };
}

function xiangqiBoardGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(part(box(0.55, 0.03, 0.5), 0xd2b48c, [0, 0.015, 0]));
  parts.push(part(box(0.57, 0.025, 0.02), 0x5c4033, [0, 0.015, -0.25]));
  parts.push(part(box(0.57, 0.025, 0.02), 0x5c4033, [0, 0.015, 0.25]));
  parts.push(part(box(0.02, 0.025, 0.5), 0x5c4033, [-0.275, 0.015, 0]));
  parts.push(part(box(0.02, 0.025, 0.5), 0x5c4033, [0.275, 0.015, 0]));
  parts.push(part(box(0.48, 0.005, 0.05), 0xbac9b8, [0, 0.032, 0]));

  for (let i = 0; i < 6; i++) {
    const rx = -0.16 + (i % 3) * 0.16;
    const rz = i < 3 ? -0.14 : 0.14;
    const color = i < 3 ? 0xcc2222 : 0x111111;
    parts.push(part(new THREE.CylinderGeometry(0.02, 0.02, 0.012, 12), color, [rx, 0.036, rz]));
  }
  return merge(parts);
}

// ---------- Thế giới ----------

interface SeatMarker {
  id: string;
  group: THREE.Group;
  ringMat: THREE.MeshBasicMaterial;
  phase: number;
  flash: number;
  scale: number;
}

export function createWorld(opts: WorldOptions): World {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x9fd0f0, 45, 110);
  scene.background = new THREE.Color(0x9fd0f0);

  const lambertVC = new THREE.MeshLambertMaterial({ vertexColors: true });
  const shadows = !opts.mobile;

  // Ánh sáng
  const hemi = new THREE.HemisphereLight(0xffffff, 0x666666, 0.65);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.target.position.set(0, 0, 0);
  scene.add(sun, sun.target);
  if (shadows) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const cam = sun.shadow.camera;
    cam.left = -24;
    cam.right = 24;
    cam.top = 16;
    cam.bottom = -16;
    cam.near = 1;
    cam.far = 95;
    sun.shadow.bias = -0.0006;
  }

  // Mặt đất xa xôi
  const far = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0x2e2e34 }),
  );
  far.position.y = ROAD_Y - 0.02;
  far.receiveShadow = shadows;
  scene.add(far);

  // Mặt đường nhựa Hà Nội
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x36363d });
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 14 - SIDEWALK_Z1).rotateX(-Math.PI / 2),
    roadMat,
  );
  road.position.set(0, ROAD_Y, (14 + SIDEWALK_Z1) / 2);
  road.receiveShadow = shadows;
  scene.add(road);

  // Vỉa hè Hà Nội lát gạch màu cát ấm
  const sidewalkMat = new THREE.MeshLambertMaterial({ color: 0xa89985 });
  const sidewalk = new THREE.Mesh(
    box(90, 0.5, SIDEWALK_Z1 - SIDEWALK_Z0),
    sidewalkMat,
  );
  sidewalk.position.set(0, -0.25, (SIDEWALK_Z0 + SIDEWALK_Z1) / 2);
  sidewalk.receiveShadow = shadows;
  scene.add(sidewalk);

  // Bó vỉa hè bê tông phân chia vỉa hè và lòng đường (Curbstones)
  const curbMesh = new THREE.Mesh(
    box(90, 0.16, 0.18),
    lambertMat(0x8c8982),
  );
  curbMesh.position.set(0, -0.06, SIDEWALK_Z1 + 0.09);
  curbMesh.castShadow = shadows;
  curbMesh.receiveShadow = shadows;
  scene.add(curbMesh);

  // Nắp cống thoát nước kim loại dạng nan dọc mép đường
  for (const gx of [-22, -10, 4, 18]) {
    const drainGrate = new THREE.Mesh(box(1.2, 0.02, 0.45), lambertMat(0x202022));
    drainGrate.position.set(gx, ROAD_Y + 0.01, SIDEWALK_Z1 + 0.32);
    scene.add(drainGrate);
  }

  // Vạch kẻ đường tim đường đứt đoạn (Hà Nội)
  const dashItems = Array.from({ length: 31 }, (_, i) => ({
    x: -45 + i * 3,
    y: ROAD_Y + 0.01,
    z: 6.12,
  }));
  scene.add(
    makeInstanced(
      new THREE.BoxGeometry(1.5, 0.01, 0.15),
      new THREE.MeshBasicMaterial({ color: 0xe6e0bb }),
      dashItems,
    ),
  );

  // Vạch sang đường cho người đi bộ (Zebra crossing) ở góc phố
  const zebraStripes = Array.from({ length: 8 }, (_, i) => ({
    x: 18,
    y: ROAD_Y + 0.01,
    z: SIDEWALK_Z1 + 0.7 + i * 0.95,
  }));
  scene.add(
    makeInstanced(
      new THREE.BoxGeometry(2.2, 0.01, 0.45),
      new THREE.MeshBasicMaterial({ color: 0xeeeade }),
      zebraStripes,
    ),
  );

  // ==========================================
  // DÃY NHÀ PHỐ CỔ HÀ NỘI VÀNG VÔI KIỂU PHÁP
  // ==========================================
  const hanoiBuildings = createHanoiBuildings(SIDEWALK_Z0);
  scene.add(hanoiBuildings);

  // Biển hiệu quán "Trà Đá Vỉa Hè" gắn ngay trước mặt tiền nhà trung tâm
  const signMat = new THREE.MeshBasicMaterial({ map: makeSignTexture() });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.125), signMat);
  sign.position.set(0, 3.4, SIDEWALK_Z0 + 0.08);
  scene.add(sign);

  // ==========================================
  // BIỂN TÊN PHỐ HÀ NỘI & CỘT ĐIỆN PHỐ CỔ
  // ==========================================
  // 1. Biển tên phố Hà Nội đặc trưng: "PHỐ TRÀNG TIỀN - QUẬN HOÀN KIẾM"
  const streetSign = createHanoiStreetSign('PHỐ TRÀNG TIỀN', 'PHỐ ĐINH TIÊN HOÀNG');
  streetSign.position.set(11.5, 0, 3.5);
  scene.add(streetSign);

  // 2. Cột điện bê tông ly tâm, loa truyền thanh phường & hộp công tơ
  const powerPole = createHanoiPowerPole();
  powerPole.position.set(-11.5, 0, 3.5);
  scene.add(powerPole);

  // 3. Bó dây điện mạng nhện phố cổ bắc qua các mái nhà và cột điện
  const cablesToHouse = createPowerCables(
    new THREE.Vector3(-11.5, 5.8, 3.5),
    new THREE.Vector3(-6.0, 5.2, SIDEWALK_Z0 + 0.2),
    3,
  );
  scene.add(cablesToHouse);

  const cablesAcross = createPowerCables(
    new THREE.Vector3(-11.5, 5.8, 3.5),
    new THREE.Vector3(11.0, 4.2, 3.8),
    2,
  );
  scene.add(cablesAcross);

  // ==========================================
  // CÂY SẤU / CÂY BÀNG CỔ THỤ HÀ NỘI GỐC QUÉT VÔI TRẮNG
  // ==========================================
  const treeLeft = createHanoiTree();
  treeLeft.position.set(-13.8, 0, 0.6);
  scene.add(treeLeft);

  const treeRight = createHanoiTree();
  treeRight.position.set(13.8, 0, 0.6);
  scene.add(treeRight);

  // Xe đạp thồ hoa cúc họa mi / sen Hà Nội đỗ cạnh gốc cây
  const flowerBike = createFlowerBicycle();
  flowerBike.position.set(13.4, 0, 2.2);
  scene.add(flowerBike);

  // ==========================================
  // CHI TIẾT QUÁN TRÀ ĐÁ: PHÍCH NƯỚC RẠNG ĐÔNG, ĐIẾU CÀY, BẠT MÁI HIÊN
  // ==========================================
  const sidewalkProps = createHanoiSidewalkProps();
  scene.add(sidewalkProps);

  // Chú cún vàng vỉa hè nằm thư thả phe phẩy đuôi
  const dog = createSidewalkDog();
  scene.add(dog.group);

  // Ghế ngồi và ghế làm bàn trung tâm, ấm trà (instancing)
  const chairColors = SEATS.map((_, i) => (i % 2 === 0 ? 0xc8352f : 0x2f6fb5));
  const chairs = makeInstanced(
    chairGeometry(),
    lambertVC,
    SEATS.map((s) => ({ x: s.x, z: s.z, rotY: s.rotY })),
    chairColors,
  );
  chairs.castShadow = shadows;
  scene.add(chairs);

  // Ghế đẩu nhựa lùn làm bàn trung tâm
  const tableStoolColors = TABLES.map((_, i) => (i % 2 === 0 ? 0x2f6fb5 : 0xc8352f));
  const tableStools = makeInstanced(
    chairGeometry(),
    lambertVC,
    TABLES.map((t) => ({ x: t.x, z: t.z })),
    tableStoolColors,
  );
  tableStools.castShadow = shadows;
  scene.add(tableStools);
  scene.add(
    makeInstanced(
      tableTopGeometry(),
      lambertVC,
      TABLES.map((t) => ({ x: t.x, z: t.z })),
    ),
  );

  // Xe máy khách đỗ gọn trên vỉa hè
  const parkedWave = createVietnamMotorbike({
    type: 'wave',
    bodyColor: 0xbd2020, // Wave đỏ cờ
    riderShirtColor: 0x333333,
    helmetColor: 0x111111,
  });
  // Bỏ rider cho xe đang đỗ
  parkedWave.remove(parkedWave.children[parkedWave.children.length - 1]!);
  parkedWave.position.set(-7.5, 0, 3.4);
  parkedWave.rotation.y = Math.PI - 0.15;
  scene.add(parkedWave);

  const parkedSH = createVietnamMotorbike({
    type: 'sh',
    bodyColor: 0x222222, // SH đen mờ
    riderShirtColor: 0x333333,
    helmetColor: 0x111111,
  });
  parkedSH.remove(parkedSH.children[parkedSH.children.length - 1]!);
  parkedSH.position.set(7.5, 0, 3.4);
  parkedSH.rotation.y = 0.12;
  scene.add(parkedSH);

  // ==========================================
  // HỆ THỐNG GIAO THÔNG VIỆT NAM (WAVE, SH, SHIPPER, TAXI XANH SM, BUÝT HÀ NỘI)
  // ==========================================
  const trafficManager = new VietnamTrafficManager();
  scene.add(trafficManager.group);

  // Đèn đường
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0x8a8a78 });
  const lampLights: THREE.PointLight[] = [];
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a3f45 });
  for (const x of [-11, 11]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4, 8), poleMat);
    pole.position.set(x, 2, 3.8);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), bulbMat);
    bulb.position.set(x, 4.1, 3.8);
    const light = new THREE.PointLight(0xffd8a0, 0, 16, 2);
    light.position.set(x, 4, 3.6);
    lampLights.push(light);
    scene.add(pole, bulb, light);
  }

  // Đèn quán chỗ bà chủ
  const shopLight = new THREE.PointLight(0xffc27a, 0, 10, 2);
  shopLight.position.set(-9.5, 2.4, -2.5);
  lampLights.push(shopLight);
  scene.add(shopLight);

  // Bà chủ quán (NPC) ngồi pha trà
  const boss = new THREE.Group();
  boss.position.set(-9.5, 0, -3.6);
  const stall = new THREE.Mesh(
    box(1.8, 0.75, 0.8),
    new THREE.MeshLambertMaterial({ color: 0x8a6a4a }),
  );
  stall.position.set(0, 0.375, 0.9);
  stall.userData.isBossStall = true;
  const kettle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.28, 0.45, 12),
    new THREE.MeshLambertMaterial({ color: 0x6d7378 }),
  );
  kettle.position.set(-0.5, 0.97, 0.9);
  const stool = new THREE.Mesh(
    chairGeometry(),
    new THREE.MeshLambertMaterial({ color: 0xc8352f }),
  );
  stool.position.set(0, 0, 0);
  const torso = new THREE.Group();
  torso.position.set(0, 0.3, 0);
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.22, 0.4, 4, 10),
    new THREE.MeshLambertMaterial({ color: 0x8a4b6a }),
  );
  body.position.y = 0.4;
  body.userData.isBossStall = true;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 12, 10),
    new THREE.MeshLambertMaterial({ color: 0xf0c8a0 }),
  );
  head.position.y = 0.92;
  head.userData.isBossStall = true;
  const hat = new THREE.Mesh(
    new THREE.ConeGeometry(0.42, 0.26, 16),
    new THREE.MeshLambertMaterial({ color: 0xd8c27a }),
  );
  hat.position.y = 1.1;
  hat.userData.isBossStall = true;
  torso.add(body, head, hat);
  boss.add(stall, kettle, stool, torso);
  scene.add(boss);

  // Loa thùng cũ
  const speaker = new THREE.Group();
  speaker.position.set(9.5, 0, -3.4);
  const cab = new THREE.Mesh(box(0.7, 1.0, 0.55), new THREE.MeshLambertMaterial({ color: 0x2b2b2b }));
  cab.position.y = 0.5;
  cab.userData.isSpeaker = true;
  const coneMat = new THREE.MeshLambertMaterial({ color: 0x777777 });
  for (const y of [0.3, 0.72]) {
    const cone = new THREE.Mesh(new THREE.CircleGeometry(0.2, 18), coneMat);
    cone.position.set(0, y, 0.28);
    cone.userData.isSpeaker = true;
    speaker.add(cone);
  }
  speaker.add(cab);
  scene.add(speaker);

  // Màn hình TV lớn tích hợp điền trọn ô cửa giữa của quán (chiếu phim & ca nhạc vỉa hè)
  const tvGroup = new THREE.Group();
  tvGroup.position.set(0, 1.42, -6.04);
  tvGroup.rotation.y = 0;

  const tvCasingMat = new THREE.MeshLambertMaterial({ color: 0x14171a });

  // Mặt sau / khung vỏ TV điền khít ô cửa tầng 1 (3.64m x 2.72m)
  const tvBack = new THREE.Mesh(box(3.64, 2.72, 0.04), tvCasingMat);
  tvBack.position.set(0, 0, 0.02);
  tvBack.userData.isTv = true;
  tvGroup.add(tvBack);

  // Màn hình TV 16:9 (chuẩn 3.6m x 2.025m)
  const tvRenderer = createTvScreenRenderer();
  const tvScreenMat = new THREE.MeshBasicMaterial({
    map: tvRenderer.texture,
  });
  const tvScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 2.025),
    tvScreenMat,
  );
  tvScreen.position.set(0, 0, 0.045);
  tvScreen.userData.isTv = true;

  // Thanh ốp viền trên cùng của ô cửa
  const topPanel = new THREE.Mesh(box(3.64, 0.345, 0.05), tvCasingMat);
  topPanel.position.set(0, 1.0125 + 0.345 / 2, 0.035);
  topPanel.userData.isTv = true;
  tvGroup.add(topPanel);

  // Loa thanh / Soundbar công suất lớn tích hợp phía dưới màn hình
  const soundbarMat = new THREE.MeshLambertMaterial({ color: 0x1b2024 });
  const bottomSoundbar = new THREE.Mesh(box(3.64, 0.345, 0.05), soundbarMat);
  bottomSoundbar.position.set(0, -1.0125 - 0.345 / 2, 0.035);
  bottomSoundbar.userData.isTv = true;
  tvGroup.add(bottomSoundbar);

  // Các nan kim loại tản âm soundbar
  const slatMat = new THREE.MeshLambertMaterial({ color: 0x2b3238 });
  for (let sy = -1.05; sy >= -1.32; sy -= 0.05) {
    const slat = new THREE.Mesh(box(3.52, 0.015, 0.012), slatMat);
    slat.position.set(0, sy, 0.062);
    tvGroup.add(slat);
  }

  // Viền mỏng hai bên
  const leftBezel = new THREE.Mesh(box(0.02, 2.025, 0.05), tvCasingMat);
  leftBezel.position.set(-1.81, 0, 0.035);
  const rightBezel = new THREE.Mesh(box(0.02, 2.025, 0.05), tvCasingMat);
  rightBezel.position.set(1.81, 0, 0.035);
  tvGroup.add(leftBezel, rightBezel);

  // Đèn LED báo tín hiệu
  const tvLed = new THREE.Mesh(
    new THREE.SphereGeometry(0.025, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x00ff88 }),
  );
  tvLed.position.set(1.72, -0.98, 0.055);

  // Ánh sáng TV hắt xuống vỉa hè phía trước quán
  const tvGlowLight = new THREE.PointLight(0x2ec4b6, 0, 9, 2);
  tvGlowLight.position.set(0, 0, 0.6);

  tvGroup.add(tvScreen, tvLed, tvGlowLight);
  scene.add(tvGroup);
  // Bàn cờ tướng vỉa hè đặt trên ghế nhựa cạnh gốc cây sấu
  const xiangqiGroup = new THREE.Group();
  xiangqiGroup.position.set(-6.8, 0, -1.8);
  const xStool = new THREE.Mesh(chairGeometry(), new THREE.MeshLambertMaterial({ color: 0x2f6fb5 }));
  xStool.userData.isXiangqi = true;
  const xBoard = new THREE.Mesh(xiangqiBoardGeometry(), lambertVC);
  xBoard.position.y = 0.26;
  xBoard.userData.isXiangqi = true;
  xiangqiGroup.add(xStool, xBoard);
  scene.add(xiangqiGroup);


  // Hệ thống hạt mưa rơi (Rain Particle System)
  const RAIN_COUNT = 1400;
  const rainGeo = new THREE.BufferGeometry();
  const rainPositions = new Float32Array(RAIN_COUNT * 3);
  for (let i = 0; i < RAIN_COUNT; i++) {
    rainPositions[i * 3] = -25 + Math.random() * 50;
    rainPositions[i * 3 + 1] = Math.random() * 16;
    rainPositions[i * 3 + 2] = -8 + Math.random() * 20;
  }
  const rainAttr = new THREE.BufferAttribute(rainPositions, 3);
  rainGeo.setAttribute('position', rainAttr);
  const rainMat = new THREE.PointsMaterial({
    color: 0x9eccee,
    size: 0.14,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  const rainPoints = new THREE.Points(rainGeo, rainMat);
  rainPoints.visible = false;
  scene.add(rainPoints);
  // Hệ thống lá vàng rơi mùa thu (Autumn Falling Leaves)
  const LEAF_COUNT = 150;
  const leafColors = [0xe5a93b, 0xd36833, 0xb84a28, 0xdf8a28];
  const leafGeo = new THREE.PlaneGeometry(0.12, 0.16);
  const leafMat = new THREE.MeshLambertMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
  });
  const leafMesh = new THREE.InstancedMesh(leafGeo, leafMat, LEAF_COUNT);
  leafMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  leafMesh.visible = true;

  interface FallingLeaf {
    x: number;
    y: number;
    z: number;
    rotX: number;
    rotY: number;
    rotZ: number;
    speedY: number;
    speedX: number;
    swayPhase: number;
  }

  const leaves: FallingLeaf[] = Array.from({ length: LEAF_COUNT }, (_, i) => {
    leafMesh.setColorAt(i, new THREE.Color(leafColors[i % leafColors.length]));
    return {
      x: -18 + Math.random() * 36,
      y: 1 + Math.random() * 7,
      z: -6 + Math.random() * 8,
      rotX: Math.random() * Math.PI,
      rotY: Math.random() * Math.PI,
      rotZ: Math.random() * Math.PI,
      speedY: 0.6 + Math.random() * 0.6,
      speedX: 1.2 + Math.random() * 0.8,
      swayPhase: Math.random() * Math.PI * 2,
    };
  });
  if (leafMesh.instanceColor) leafMesh.instanceColor.needsUpdate = true;
  scene.add(leafMesh);


  // Vòng sáng ghế trống
  const seatHitTargets: THREE.Object3D[] = [];
  const markers = new Map<string, SeatMarker>();
  const ringGeo = new THREE.RingGeometry(0.46, 0.56, 32).rotateX(-Math.PI / 2);
  const discGeo = new THREE.CircleGeometry(0.62, 20).rotateX(-Math.PI / 2);
  const discMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  SEATS.forEach((s, i) => {
    const group = new THREE.Group();
    group.position.set(s.x, 0.03, s.z);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffd45c,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    group.add(new THREE.Mesh(ringGeo, ringMat));
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.y = -0.005;
    disc.userData.seatId = s.id;
    group.add(disc);
    seatHitTargets.push(disc);
    scene.add(group);
    markers.set(s.id, { id: s.id, group, ringMat, phase: i * 0.9, flash: 0, scale: 1 });
  });
  let hovered: string | null = null;

  // ---------- Quản lý nhân vật & Khách trong quán ----------
  interface Person {
    name: string;
    character: Character;
    seatId: string | null;
    glass?: THREE.Group;
    ice?: THREE.Group;
    teaMesh?: THREE.Mesh;
    treatedHalo?: THREE.Mesh;
    storyBubble?: THREE.Sprite;
    vacateTimer?: ReturnType<typeof setTimeout>;
  }
  const people = new Map<string, Person>();

  function getPersonBySeat(seatId: string): Person | undefined {
    for (const p of people.values()) {
      if (p.seatId === seatId) return p;
    }
    return undefined;
  }
  function findPersonByObject(obj: THREE.Object3D): { name: string; seatId: string | null } | null {
    let curr: THREE.Object3D | null = obj;
    while (curr) {
      if (curr.userData && typeof curr.userData.characterName === 'string') {
        const p = people.get(curr.userData.characterName);
        if (p) return { name: p.name, seatId: p.seatId };
      }
      curr = curr.parent;
    }
    return null;
  }

  const glassMat = new THREE.MeshLambertMaterial({
    color: 0xdfeeea,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const teaMat = new THREE.MeshLambertMaterial({
    color: 0xc4802a,
    transparent: true,
    opacity: 0.9,
  });
  const treatedTeaMat = new THREE.MeshLambertMaterial({
    color: 0x2ec4b6, // ly trà đặc biệt (xanh ngọc)
    transparent: true,
    opacity: 0.95,
  });
  const iceMat = new THREE.MeshLambertMaterial({
    color: 0xf4fbff,
    transparent: true,
    opacity: 0.85,
  });
  const glassGeo = new THREE.CylinderGeometry(0.05, 0.04, 0.12, 12, 1, true);
  const teaGeo = new THREE.CylinderGeometry(0.043, 0.036, 0.095, 12);
  const iceGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);

  function makeGlass(): { glass: THREE.Group; ice: THREE.Group; tea: THREE.Mesh } {
    const glass = new THREE.Group();
    const body = new THREE.Mesh(glassGeo, glassMat);
    body.position.y = 0.06;
    const tea = new THREE.Mesh(teaGeo, teaMat);
    tea.position.y = 0.05;
    const ice = new THREE.Group();
    ice.position.y = 0.095;
    [
      [-0.015, 0, 0.01],
      [0.017, 0.012, -0.008],
      [0, 0.004, -0.02],
    ].forEach(([x, y, z], i) => {
      const cube = new THREE.Mesh(iceGeo, iceMat);
      cube.position.set(x ?? 0, y ?? 0, z ?? 0);
      cube.rotation.set(0.4 * i, 0.7 * i, 0.2);
      ice.add(cube);
    });
    glass.add(body, tea, ice);
    return { glass, ice, tea };
  }

  function makeStorySprite(text: string): THREE.Sprite {
    if (typeof document === 'undefined') {
      return new THREE.Sprite();
    }
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(255, 252, 240, 0.95)';
      ctx.beginPath();
      ctx.roundRect(10, 10, 492, 120, 24);
      ctx.fill();
      ctx.strokeStyle = '#d4a373';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Mũi nhọn bong bóng trỏ xuống
      ctx.beginPath();
      ctx.moveTo(236, 130);
      ctx.lineTo(256, 150);
      ctx.lineTo(276, 130);
      ctx.fillStyle = 'rgba(255, 252, 240, 0.95)';
      ctx.fill();

      ctx.fillStyle = '#2b1d14';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 26px system-ui, sans-serif';
      ctx.fillText(text, 256, 70, 460);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2.4, 0.75, 1);
    sprite.position.set(0, 1.85, 0);
    sprite.renderOrder = 20;
    return sprite;
  }

  // Floating emoji reaction
  interface FloatingEmoji {
    sprite: THREE.Sprite;
    startTime: number;
    duration: number;
    startY: number;
  }
  const floatingEmojis: FloatingEmoji[] = [];

  function spawnEmoji(seatId: string, emoji: string): void {
    if (typeof document === 'undefined') return;
    const seat = SEATS.find((s) => s.id === seatId);
    if (!seat) return;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = '80px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, 64, 64);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }),
    );
    sprite.scale.set(0.8, 0.8, 1);
    sprite.position.set(seat.x, 1.8, seat.z);
    sprite.renderOrder = 30;
    scene.add(sprite);
    floatingEmojis.push({
      sprite,
      startTime: performance.now() / 1000,
      duration: 1.8,
      startY: 1.8,
    });
  }

  // ---------- Người đi bộ vãng lai, gánh hàng rong, shipper & bán bánh dạo trên vỉa hè ----------
  /** Tạo quang gánh tre 2 thúng hàng rong khoác trên vai */
  function makeCarryingPole(): THREE.Group {
    const g = new THREE.Group();
    const bambooMat = lambertMat(0xc89d54);
    const basketMat = lambertMat(0xa67938);
    const ropeMat = lambertMat(0x5c4328);
    // Đòn gánh tre dài 1.1m trên vai
    const pole = new THREE.Mesh(box(0.03, 0.025, 1.15), bambooMat);
    pole.position.set(0, 0.82, 0);
    g.add(pole);
    for (const sz of [-0.52, 0.52]) {
      // Dây quang treo 2 đầu
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.36, 6), ropeMat);
      cord.position.set(0, 0.64, sz);
      // Thúng mây tre đan
      const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.13, 0.12, 12), basketMat);
      basket.position.set(0, 0.45, sz);
      // Hàng hóa cốm / hoa quả bên trong thúng
      const goods = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 8, 6),
        lambertMat(sz < 0 ? 0x7cb518 : 0xf4a261),
      );
      goods.scale.set(1, 0.45, 1);
      goods.position.set(0, 0.5, sz);
      g.add(cord, basket, goods);
    }
    return g;
  }

  /** Tạo thùng carton giao hàng cho anh shipper đi bộ */
  function makeDeliveryParcel(): THREE.Group {
    const g = new THREE.Group();
    const boxMesh = new THREE.Mesh(box(0.24, 0.2, 0.24), lambertMat(0xc98a4b));
    boxMesh.position.set(0, 0.62, 0.2);
    const tape = new THREE.Mesh(box(0.245, 0.03, 0.245), lambertMat(0xe8d8b5));
    tape.position.set(0, 0.69, 0.2);
    g.add(boxMesh, tape);
    return g;
  }

  /** Tạo thúng bánh mì / bánh khúc nóng phủ vải giữ nhiệt */
  function makeBreadBasket(): THREE.Group {
    const g = new THREE.Group();
    const basket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.15, 0.18, 12),
      lambertMat(0xb07d40),
    );
    basket.position.set(0.18, 0.64, 0.14);
    // Những ổ bánh mì vàng giòn nhô lên
    for (const dx of [-0.05, 0.05]) {
      const loaf = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.04, 0.12, 4, 8),
        lambertMat(0xdf9135),
      );
      loaf.rotation.z = 0.3;
      loaf.position.set(0.18 + dx, 0.74, 0.14);
      g.add(loaf);
    }
    g.add(basket);
    return g;
  }

  const pedestrianAvatars: (typeof AVATARS)[number][] = [
    { id: 'npc_ba', label: 'Bác Ba', shirt: 0xf5f5f5, pants: 0x2a3d52, skin: 0xdeb887, hair: 0x1a1a1a, hat: 'noncoi' },
    { id: 'npc_lan', label: 'Chị Lan', shirt: 0xd98236, pants: 0x1f2421, skin: 0xf2c49b, hair: 0x1a1a1a, hat: 'nonla' },
    { id: 'npc_sen', label: 'Cô Sen Hàng Rong', shirt: 0x8d5524, pants: 0x1f1f24, skin: 0xe6b88a, hair: 0x1a1a1a, hat: 'nonla' },
    { id: 'npc_ship', label: 'Anh Shipper', shirt: 0x00a86b, pants: 0x1f2833, skin: 0xe0b088, hair: 0x181210, hat: 'cap' },
    { id: 'npc_banh', label: 'Chú Tèo Bánh Mì', shirt: 0xd4a359, pants: 0x383028, skin: 0xd9a77c, hair: 0x222222, hat: 'noncoi' },
  ];

  interface PedestrianWalker {
    character: Character;
    minX: number;
    maxX: number;
    startX: number;
    z: number;
    dir: 1 | -1;
    speed: number;
    prop?: THREE.Group;
  }

  const carryPoleProp = makeCarryingPole();
  const parcelProp = makeDeliveryParcel();
  const breadProp = makeBreadBasket();

  const pedestrians: PedestrianWalker[] = [
    {
      character: createCharacter(pedestrianAvatars[0]!, 'Bác Ba', '🏃', 'walking'),
      minX: -14,
      maxX: 14,
      startX: -12,
      z: -4.4,
      dir: 1,
      speed: 1.15,
    },
    {
      character: createCharacter(pedestrianAvatars[1]!, 'Chị Lan', '🌸', 'walking'),
      minX: -14,
      maxX: 14,
      startX: 10,
      z: 2.6,
      dir: -1,
      speed: 1.05,
    },
    {
      character: createCharacter(pedestrianAvatars[2]!, 'Cô Sen · Hàng rong', '🧺', 'walking'),
      minX: -15,
      maxX: 15,
      startX: -4,
      z: 3.1,
      dir: 1,
      speed: 0.85,
      prop: carryPoleProp,
    },
    {
      character: createCharacter(pedestrianAvatars[3]!, 'Anh Shipper', '📦', 'walking'),
      minX: -15,
      maxX: 15,
      startX: 6,
      z: -4.75,
      dir: -1,
      speed: 1.45,
      prop: parcelProp,
    },
    {
      character: createCharacter(pedestrianAvatars[4]!, 'Chú Tèo · Bánh mì nóng', '🥖', 'walking'),
      minX: -15,
      maxX: 15,
      startX: -9,
      z: 2.15,
      dir: 1,
      speed: 0.92,
      prop: breadProp,
    },
  ];
  pedestrians.forEach((p) => {
    if (p.prop) {
      p.character.group.add(p.prop);
    }
    p.character.group.position.set(p.startX, 0, p.z);
    p.character.group.rotation.y = p.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(p.character.group);
  });

  // ---------- Hàng xóm ngồi bệ cửa sổ & đứng ban công tầng 2 hóng mát ----------
  interface WindowWatcher {
    character: Character;
    reactions: readonly Reaction[];
    nextReactionAt: number;
  }

  const windowWatcherDefs: {
    avatar: (typeof AVATARS)[number];
    name: string;
    emoji: string;
    mode: 'sitting' | 'standing';
    x: number;
    y: number;
    z: number;
    rotY: number;
    reactions: readonly Reaction[];
  }[] = [
    {
      avatar: { id: 'win_nam', label: 'Bà Năm', shirt: 0x8a5ca8, pants: 0x504058, skin: 0xe8bf9a, hair: 0xd8d8d8, hat: 'none' },
      name: 'Bà Năm',
      emoji: '🪭',
      mode: 'sitting',
      x: -10.7,
      y: 3.58,
      z: -5.94,
      rotY: 0.18,
      reactions: ['haha', 'unhi', 'seeds'],
    },
    {
      avatar: { id: 'win_bay', label: 'Ông Bảy', shirt: 0x6f8a4a, pants: 0x4a4030, skin: 0xe0b088, hair: 0xd0d0d0, hat: 'noncoi' },
      name: 'Ông Bảy',
      emoji: '♟️',
      mode: 'standing',
      x: -7.3,
      y: 3.84,
      z: -5.98,
      rotY: 0.1,
      reactions: ['smoke', 'unhi', 'cangly'],
    },
    {
      avatar: { id: 'win_mai', label: 'Cô Mai', shirt: 0xd6577a, pants: 0x3b3b52, skin: 0xf0c8a0, hair: 0x1e1612, hat: 'none' },
      name: 'Cô Mai',
      emoji: '🌺',
      mode: 'standing',
      x: -5.2,
      y: 3.46,
      z: -5.54,
      rotY: 0.12,
      reactions: ['thuong', 'om', 'haha'],
    },
    {
      avatar: { id: 'win_tu', label: 'Chú Tư', shirt: 0xe0a02a, pants: 0x30343c, skin: 0xd9a77c, hair: 0x181210, hat: 'none' },
      name: 'Chú Tư',
      emoji: '🚬',
      mode: 'sitting',
      x: -1.3,
      y: 3.58,
      z: -5.94,
      rotY: 0.08,
      reactions: ['smoke', 'cangly', 'unhi'],
    },
    {
      avatar: { id: 'win_bi', label: 'Bé Bi', shirt: 0x3d8fd1, pants: 0x2f3a50, skin: 0xf2cfa8, hair: 0x241a14, hat: 'cap' },
      name: 'Bé Bi',
      emoji: '📺',
      mode: 'sitting',
      x: 1.3,
      y: 3.58,
      z: -5.94,
      rotY: -0.08,
      reactions: ['haha', 'thuong', 'candy'],
    },
    {
      avatar: { id: 'win_tuan', label: 'Anh Tuấn', shirt: 0x2b7a78, pants: 0x222831, skin: 0xe0b088, hair: 0x181210, hat: 'cap' },
      name: 'Anh Tuấn',
      emoji: '🎸',
      mode: 'standing',
      x: 5.4,
      y: 3.46,
      z: -5.54,
      rotY: -0.15,
      reactions: ['cangly', 'smoke', 'haha'],
    },
    {
      avatar: { id: 'win_thao', label: 'Chị Thảo', shirt: 0xc8352f, pants: 0x2a2a30, skin: 0xf4d2b0, hair: 0x4a2a1a, hat: 'none' },
      name: 'Chị Thảo',
      emoji: '🍵',
      mode: 'sitting',
      x: 7.3,
      y: 3.58,
      z: -5.94,
      rotY: -0.2,
      reactions: ['thuong', 'haha', 'seeds'],
    },
  ];

  const windowWatchers: WindowWatcher[] = windowWatcherDefs.map((w, idx) => {
    const ch = createCharacter(w.avatar, w.name, w.emoji, w.mode);
    ch.group.position.set(w.x, w.y, w.z);
    ch.group.rotation.y = w.rotY;
    scene.add(ch.group);
    return {
      character: ch,
      reactions: w.reactions,
      nextReactionAt: 2 + idx * 1.8 + Math.random() * 3,
    };
  });

  /** Ly trà đá đặt ngay dưới mặt đất vỉa hè bên cạnh ghế ngồi của khách. */
  function glassSpot(seat: (typeof SEATS)[number]): { x: number; y: number; z: number } {
    const c = Math.cos(seat.rotY);
    const s = Math.sin(seat.rotY);
    return {
      x: seat.x + 0.32 * c + 0.15 * s,
      y: 0,
      z: seat.z - 0.32 * s + 0.15 * c,
    };
  }

  let localStandingPerson: Person | null = null;

  function standUp(seatId: string): void {
    const person = getPersonBySeat(seatId);
    if (!person) return;
    const seat = SEATS.find((st) => st.id === seatId);
    if (person.glass) {
      scene.remove(person.glass);
      person.glass = undefined;
      person.ice = undefined;
      person.teaMesh = undefined;
    }
    person.seatId = null;
    localStandingPerson = person;
    person.character.setMode('standing');
    if (seat) {
      const c = Math.cos(seat.rotY);
      const sY = Math.sin(seat.rotY);
      person.character.walkTo(seat.x + 0.45 * c, seat.z - 0.45 * sY, seat.rotY, 'standing');
    }
    const marker = markers.get(seatId);
    if (marker) marker.group.visible = true;
  }

  function walkPlayerTo(targetX: number, targetZ: number): void {
    if (localStandingPerson) {
      localStandingPerson.character.walkTo(targetX, targetZ, 0, 'standing');
    }
  }

  function hasStandingPlayer(): boolean {
    return localStandingPerson !== null;
  }

  function setOccupant(seatId: string, occupant: Occupant | null): void {
    const seat = SEATS.find((s) => s.id === seatId);
    if (!seat) return;

    // 1. Dọn ghế (người chơi đứng dậy hoặc rời quán)
    if (!occupant) {
      const marker = markers.get(seatId);
      if (marker) marker.group.visible = true;

      const person = getPersonBySeat(seatId);
      if (person) {
        if (person.glass) {
          scene.remove(person.glass);
          person.glass = undefined;
          person.ice = undefined;
          person.teaMesh = undefined;
        }
        person.seatId = null;

        // Trì hoãn 300ms: nếu đây là đổi ghế thì tin nhắn ghế mới sẽ tới ngay lập tức
        if (person.vacateTimer !== undefined) clearTimeout(person.vacateTimer);
        person.vacateTimer = setTimeout(() => {
          person.vacateTimer = undefined;
          if (person.seatId === null && person !== localStandingPerson) {
            person.character.setMode('standing');
            const targetX = seat.x + (Math.random() < 0.5 ? -1.0 : 1.0);
            person.character.walkTo(targetX, 3.8, 0, 'standing', () => {
              scene.remove(person.character.group);
              people.delete(person.name);
            });
          }
        }, 300);
      }
      return;
    }

    // 2. Có người ngồi vào ghế
    const marker = markers.get(seatId);
    if (marker) marker.group.visible = false;

    const person = people.get(occupant.name);

    if (person) {
      if (person.vacateTimer !== undefined) {
        clearTimeout(person.vacateTimer);
        person.vacateTimer = undefined;
      }

      if (person.seatId && person.seatId !== seatId) {
        const oldMarker = markers.get(person.seatId);
        if (oldMarker) oldMarker.group.visible = true;
        if (person.glass) {
          scene.remove(person.glass);
          person.glass = undefined;
          person.ice = undefined;
          person.teaMesh = undefined;
        }
      }

      if (localStandingPerson === person) {
        localStandingPerson = null;
      }

      if (person.seatId === seatId && !person.character.isMoving()) {
        return;
      }

      person.seatId = seatId;

      const { glass, ice, tea } = makeGlass();
      const spot = glassSpot(seat);
      glass.position.set(spot.x, spot.y, spot.z);
      glass.visible = false;
      scene.add(glass);
      person.glass = glass;
      person.ice = ice;
      person.teaMesh = tea;

      person.character.walkTo(seat.x, seat.z, seat.rotY, 'sitting', () => {
        glass.visible = true;
      });
      return;
    }

    // 3. Người mới toanh vào quán
    const existing = getPersonBySeat(seatId);
    if (existing) {
      if (existing.glass) scene.remove(existing.glass);
      scene.remove(existing.character.group);
      people.delete(existing.name);
    }

    const avatar = AVATARS.find((a) => a.id === occupant.avatar) ?? AVATARS[0];
    const mood = MOODS.find((m) => m.id === occupant.mood);
    if (!avatar) return;

    const character = createCharacter(avatar, occupant.name, mood?.emoji ?? '🍵', 'walking');
    const spawnX = seat.x + (Math.random() < 0.5 ? -1.2 : 1.2);
    const spawnZ = 3.6;
    character.group.position.set(spawnX, 0, spawnZ);
    character.group.rotation.y = Math.atan2(seat.x - spawnX, seat.z - spawnZ);
    scene.add(character.group);

    const { glass, ice, tea } = makeGlass();
    const spot = glassSpot(seat);
    glass.position.set(spot.x, spot.y, spot.z);
    glass.visible = false;
    scene.add(glass);

    character.walkTo(seat.x, seat.z, seat.rotY, 'sitting', () => {
      glass.visible = true;
    });

    people.set(occupant.name, {
      name: occupant.name,
      character,
      seatId,
      glass,
      ice,
      teaMesh: tea,
    });
  }

  function setTreated(seatId: string, treated: boolean): void {
    const p = getPersonBySeat(seatId);
    if (!p || !p.teaMesh) return;
    p.teaMesh.material = treated ? treatedTeaMat : teaMat;
  }

  function playReaction(fromSeatId: string, kind: Reaction, toSeatId?: string): void {
    const targetId = toSeatId ?? fromSeatId;
    const target = getPersonBySeat(targetId);
    if (target) {
      target.character.play(kind);
    }
    const def = REACTIONS.find((r) => r.id === kind);
    if (def) {
      spawnEmoji(targetId, def.emoji);
    }
  }

  function showStory(seatId: string, text: string): void {
    const p = getPersonBySeat(seatId);
    if (!p) return;
    if (p.storyBubble) {
      p.character.group.remove(p.storyBubble);
      p.storyBubble = undefined;
    }
    const sprite = makeStorySprite(text);
    p.character.group.add(sprite);
    p.storyBubble = sprite;
  }

  function hideStory(seatId: string): void {
    const p = getPersonBySeat(seatId);
    if (!p || !p.storyBubble) return;
    p.character.group.remove(p.storyBubble);
    p.storyBubble = undefined;
  }

  // ---------- Cập nhật theo chu kỳ ngày đêm ----------
  let lastHour = -1;
  const skyColor = new THREE.Color();
  let currentWeather: WeatherType = 'sunny';
  let currentTrafficDensity = 1.0;

  function applySky(hour: number): void {
    const s = getSkyState(hour);
    currentTrafficDensity = s.traffic;

    if (currentWeather === 'rainy') {
      skyColor.setHex(lerpColor(s.sky, 0x2e3c48, 0.65));
      (scene.fog as THREE.Fog).near = 22;
      (scene.fog as THREE.Fog).far = 70;
      hemi.color.setHex(lerpColor(s.hemiSky, 0x5a6d7c, 0.5));
      hemi.groundColor.setHex(s.hemiGround);
      hemi.intensity = s.hemiIntensity * 0.55;
      sun.color.setHex(lerpColor(s.sunColor, 0x8fa4b8, 0.5));
      sun.intensity = s.sunIntensity * 0.35;
      for (const l of lampLights) l.intensity = Math.max(s.lamp * 35, 18);
      roadMat.color.setHex(0x222226);
      sidewalkMat.color.setHex(0x6e6355);
    } else if (currentWeather === 'cloudy') {
      skyColor.setHex(lerpColor(s.sky, 0x6e7e8c, 0.45));
      (scene.fog as THREE.Fog).near = 32;
      (scene.fog as THREE.Fog).far = 85;
      hemi.color.setHex(lerpColor(s.hemiSky, 0x7e8e9c, 0.3));
      hemi.groundColor.setHex(s.hemiGround);
      hemi.intensity = s.hemiIntensity * 0.75;
      sun.color.setHex(lerpColor(s.sunColor, 0xd0d8e0, 0.3));
      sun.intensity = s.sunIntensity * 0.65;
      for (const l of lampLights) l.intensity = s.lamp * 35;
      roadMat.color.setHex(0x303036);
      sidewalkMat.color.setHex(0x8e8373);
    } else {
      skyColor.setHex(s.sky);
      (scene.fog as THREE.Fog).near = 45;
      (scene.fog as THREE.Fog).far = 110;
      hemi.color.setHex(s.hemiSky);
      hemi.groundColor.setHex(s.hemiGround);
      hemi.intensity = s.hemiIntensity;
      sun.color.setHex(s.sunColor);
      sun.intensity = s.sunIntensity;
      for (const l of lampLights) l.intensity = s.lamp * 35;
      roadMat.color.setHex(0x36363d);
      sidewalkMat.color.setHex(0xa89985);
    }

    if (currentSeason === 'autumn') {
      skyColor.setHex(lerpColor(skyColor.getHex(), 0xf5d07a, 0.4));
      sun.color.setHex(0xffdf88);
      hemi.color.setHex(0xffe2a4);
      hemi.intensity = s.hemiIntensity * 0.9;
    }

    (scene.background as THREE.Color).copy(skyColor);
    (scene.fog as THREE.Fog).color.copy(skyColor);

    const t = Math.min(1, Math.max(0, (hour - 6) / 12));
    const elev = Math.max(0.25, Math.sin(Math.PI * t));
    sun.position.set(-Math.cos(Math.PI * t) * 22, 5 + elev * 20, 12);

    bulbMat.color.setHex(lerpColor(0x8a8a78, 0xffe0a0, s.lamp));
    lastHour = hour;
  }

  let currentSeason: SeasonType = 'autumn';
  function setSeason(season: SeasonType): void {
    currentSeason = season;
    leafMesh.visible = season === 'autumn';
    applySky(lastHour >= 0 ? lastHour : 12);
  }

  function setWeather(w: WeatherType): void {
    if (currentWeather === w) return;
    currentWeather = w;
    rainPoints.visible = w === 'rainy';
    applySky(lastHour >= 0 ? lastHour : 12);
  }

  let tvIsPlaying = false;
  let tvTitleText = 'Chiếu Phim & Ca Nhạc Vỉa Hè';
  function setDrink(drinkId: string): void {
    const d = DRINKS.find((item) => item.id === drinkId) ?? DRINKS[0]!;
    teaMat.color.setHex(d.color);
  }


  return {
    scene,
    seatHitTargets,
    speakerTarget: cab,
    tvTarget: tvScreen,
    bossStallTarget: stall,
    xiangqiTarget: xBoard,

    sidewalkTarget: sidewalk,
    setHover(id) {
      hovered = id;
    },
    flashSeat(id) {
      const m = markers.get(id);
      if (m) m.flash = 1;
    },
    setOccupant,
    setTreated,
    playReaction,
    showStory,
    hideStory,
    standUp,
    walkPlayerTo,
    hasStandingPlayer,
    setWeather,
    setDrink,
    setSeason,

    findPersonByObject,
    getPersonBySeat(seatId: string) {
      const p = getPersonBySeat(seatId);
      if (!p) return null;
      return { name: p.name, avatar: 'casual_brown', mood: 'chill' };
    },


    getWeather() {
      return currentWeather;
    },
    setTvPlaying(playing: boolean, title?: string, videoId?: string) {
      tvIsPlaying = playing;
      if (title) tvTitleText = title;
      if (videoId && typeof document !== 'undefined') {
        const loader = new THREE.TextureLoader();
        loader.crossOrigin = 'anonymous';
        loader.load(
          `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tvScreenMat.map = tex;
            tvScreenMat.needsUpdate = true;
          },
          undefined,
          () => {
            tvScreenMat.map = tvRenderer.texture;
            tvScreenMat.needsUpdate = true;
          },
        );
      } else if (!playing) {
        tvScreenMat.map = tvRenderer.texture;
        tvScreenMat.needsUpdate = true;
      }
    },
    update(dt, time, hour, roundProgress) {
      if (Math.abs(hour - lastHour) > 0.002) applySky(hour);

      // Cập nhật màn hình TV 3D vỉa hè (chiếu phim / nhạc trực tiếp ngoài quán)
      tvRenderer.update(time, tvIsPlaying, tvTitleText);
      tvGlowLight.intensity = tvIsPlaying ? 1.6 + Math.sin(time * 8) * 0.4 : 0;

      // Cập nhật dòng giao thông xe cộ Việt Nam (Wave, SH, Shipper, Taxi Xanh SM, Buýt Hà Nội, Mai Linh)
      trafficManager.update(dt, currentTrafficDensity);

      // Cập nhật chú cún vàng phe phẩy đuôi
      dog.update(dt, time);

      // Nhịp thở của bà chủ quán
      torso.rotation.z = Math.sin(time * 1.3) * 0.04;

      // Cập nhật hạt mưa rơi khi trời mưa
      if (currentWeather === 'rainy') {
        const fallSpeed = 16 * dt;
        const driftX = -2.2 * dt;
        for (let i = 0; i < RAIN_COUNT; i++) {
          const idx = i * 3;
          let px = (rainPositions[idx] ?? 0) + driftX;
          let py = (rainPositions[idx + 1] ?? 0) - fallSpeed;
          let pz = rainPositions[idx + 2] ?? 0;
          if (py < 0) {
            py = 14 + Math.random() * 2;
            px = -25 + Math.random() * 50;
            pz = -8 + Math.random() * 20;
          }
          rainPositions[idx] = px;
          rainPositions[idx + 1] = py;
          rainPositions[idx + 2] = pz;
        }
        rainAttr.needsUpdate = true;
      }

      // Cập nhật lá vàng mùa thu rơi chao liệng trong gió
      if (currentSeason === 'autumn') {
        leaves.forEach((l, i) => {
          l.y -= l.speedY * dt;
          l.x += (l.speedX + Math.sin(time * 2 + l.swayPhase) * 0.6) * dt;
          l.rotZ += 2.5 * dt;
          l.rotX += 1.8 * dt;

          if (l.y < 0.02 || l.x > 20) {
            l.y = 5.5 + Math.random() * 3;
            l.x = -20 + Math.random() * 10;
            l.z = -6 + Math.random() * 8;
          }

          dummy.position.set(l.x, l.y, l.z);
          dummy.rotation.set(l.rotX, l.rotY, l.rotZ);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          leafMesh.setMatrixAt(i, dummy.matrix);
        });
        leafMesh.instanceMatrix.needsUpdate = true;
      }

      // Cập nhật người đi bộ vãng lai trên vỉa hè
      for (const p of pedestrians) {
        p.character.update(dt, time);
        p.character.group.position.x += p.dir * p.speed * dt;
        p.character.group.rotation.y = p.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
        if (p.dir === 1 && p.character.group.position.x >= p.maxX) {
          p.dir = -1;
        } else if (p.dir === -1 && p.character.group.position.x <= p.minX) {
          p.dir = 1;
        }
      }

      // Cập nhật hàng xóm ngồi cửa sổ & đứng ban công tầng 2
      for (const w of windowWatchers) {
        w.character.update(dt, time);
        if (time >= w.nextReactionAt) {
          const pick = w.reactions[Math.floor(Math.random() * w.reactions.length)];
          if (pick) w.character.play(pick);
          w.nextReactionAt = time + 5 + Math.random() * 7;
        }
      }

      // Cập nhật emoji bay lên
      const nowSec = performance.now() / 1000;
      for (let i = floatingEmojis.length - 1; i >= 0; i--) {
        const fe = floatingEmojis[i]!;
        const elapsed = nowSec - fe.startTime;
        if (elapsed >= fe.duration) {
          scene.remove(fe.sprite);
          floatingEmojis.splice(i, 1);
        } else {
          const progress = elapsed / fe.duration;
          fe.sprite.position.y = fe.startY + progress * 1.2;
          (fe.sprite.material as THREE.SpriteMaterial).opacity = 1 - progress * 0.8;
          fe.sprite.scale.setScalar(0.8 + progress * 0.4);
        }
      }

      // Cập nhật tất cả nhân vật trong quán (ngồi, đang đi, đang đứng)
      const iceScale = Math.max(0.001, 1 - roundProgress);
      for (const p of people.values()) {
        p.character.update(dt, time);
        if (p.ice) {
          p.ice.scale.setScalar(iceScale);
          p.ice.visible = iceScale > 0.03;
        }
      }

      for (const m of markers.values()) {
        const isHover = m.id === hovered;
        m.flash = Math.max(0, m.flash - dt * 2.5);
        const base = 0.4 + 0.25 * Math.sin(time * 2.6 + m.phase);
        m.ringMat.opacity = isHover ? 1 : base;
        const target = isHover ? 1.2 : 1;
        m.scale += (target - m.scale) * Math.min(1, dt * 12);
        m.group.scale.setScalar(m.scale + m.flash * 0.4);
      }
    },
  };
}
