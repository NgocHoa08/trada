import * as THREE from 'three';
import { box, part, merge, lambertMat, basicMat } from './geoUtils';

// ==========================================
// 1. BIỂN TÊN PHỐ HÀ NỘI ĐẶC TRƯNG
// ==========================================

function makeStreetNameCanvas(streetName: string, district = 'QUẬN HOÀN KIẾM'): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Nền xanh dương đậm biển phố Hà Nội
    ctx.fillStyle = '#0a3871';
    ctx.beginPath();
    ctx.roundRect(10, 10, 492, 140, 12);
    ctx.fill();

    // Viền trắng đôi mép biển
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.strokeRect(18, 18, 476, 124);

    // Tên quận nhỏ phía trên
    ctx.fillStyle = '#e8f0fe';
    ctx.textAlign = 'center';
    ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
    ctx.fillText(district, 256, 48);

    // Đường gạch mảnh phân cách
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(100, 58);
    ctx.lineTo(412, 58);
    ctx.stroke();

    // Tên phố in hoa đậm nét phía dưới
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 50px "Segoe UI", Arial, sans-serif';
    ctx.fillText(streetName, 256, 116, 460);
  }
  return canvas;
}

export function createHanoiStreetSign(
  primaryStreet = 'PHỐ TRÀNG TIỀN',
  crossStreet = 'PHỐ ĐINH TIÊN HOÀNG',
): THREE.Group {
  const group = new THREE.Group();

  // Cột thép tròn sơn trắng cao 3.4m
  const poleGeo = new THREE.CylinderGeometry(0.045, 0.05, 3.4, 16);
  const poleMat = lambertMat(0xdedede);
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.y = 1.7;
  pole.castShadow = true;
  group.add(pole);

  // Đế chân cột có bu-lông
  const baseGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.15, 8);
  const baseMat = lambertMat(0x444444);
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = 0.075;
  group.add(base);

  if (typeof document !== 'undefined') {
    // 1. Biển chính song song mặt đường
    const canvasMain = makeStreetNameCanvas(primaryStreet, 'QUẬN HOÀN KIẾM');
    const texMain = new THREE.CanvasTexture(canvasMain);
    texMain.colorSpace = THREE.SRGBColorSpace;
    const signMat = new THREE.MeshBasicMaterial({ map: texMain });

    // Khung kim loại viền lưng biển
    const backFrame = new THREE.Mesh(box(1.28, 0.44, 0.03), lambertMat(0x222b35));
    backFrame.position.set(0, 3.0, 0);

    const signFront = new THREE.Mesh(new THREE.PlaneGeometry(1.24, 0.4), signMat);
    signFront.position.set(0, 3.0, 0.017);

    const signBack = new THREE.Mesh(new THREE.PlaneGeometry(1.24, 0.4), signMat);
    signBack.position.set(0, 3.0, -0.017);
    signBack.rotation.y = Math.PI;

    group.add(backFrame, signFront, signBack);

    // 2. Biển phụ trỏ hướng phố cắt ngang
    const canvasCross = makeStreetNameCanvas(crossStreet, 'HÀ NỘI');
    const texCross = new THREE.CanvasTexture(canvasCross);
    texCross.colorSpace = THREE.SRGBColorSpace;
    const crossMat = new THREE.MeshBasicMaterial({ map: texCross });

    const crossBack = new THREE.Mesh(box(0.03, 0.38, 1.15), lambertMat(0x222b35));
    crossBack.position.set(0, 2.65, 0);

    const crossR = new THREE.Mesh(new THREE.PlaneGeometry(1.11, 0.35), crossMat);
    crossR.position.set(0.017, 2.65, 0);
    crossR.rotation.y = Math.PI / 2;

    const crossL = new THREE.Mesh(new THREE.PlaneGeometry(1.11, 0.35), crossMat);
    crossL.position.set(-0.017, 2.65, 0);
    crossL.rotation.y = -Math.PI / 2;

    group.add(crossBack, crossR, crossL);
  }

  return group;
}

// ==========================================
// 2. CỘT ĐIỆN PHỐ CỔ & DÂY ĐIỆN "MẠNG NHỆN"
// ==========================================

export function createHanoiPowerPole(): THREE.Group {
  const group = new THREE.Group();

  // Thân cột bê tông ly tâm cao 6.2m
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.17, 6.2, 12);
  const poleMat = lambertMat(0x8a8e8f);
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.y = 3.1;
  pole.castShadow = true;
  group.add(pole);

  // 2 hộp công tơ điện màu xám gắn trên thân cột (khoảng y = 1.6m và 2.2m)
  const meterMat = lambertMat(0x4a5054);
  const meter1 = new THREE.Mesh(box(0.24, 0.35, 0.22), meterMat);
  meter1.position.set(0.12, 1.8, 0.05);
  const meter2 = new THREE.Mesh(box(0.28, 0.42, 0.2), meterMat);
  meter2.position.set(-0.12, 2.3, -0.04);
  group.add(meter1, meter2);

  // Thanh xà thép đỡ sứ cách điện (2 tầng: y = 5.4m và y = 5.9m)
  const barMat = lambertMat(0x2d3238);
  const bar1 = new THREE.Mesh(box(0.08, 0.08, 1.6), barMat);
  bar1.position.set(0, 5.4, 0);
  const bar2 = new THREE.Mesh(box(0.08, 0.08, 1.4), barMat);
  bar2.position.set(0, 5.9, 0);
  group.add(bar1, bar2);

  // Các quả sứ cách điện trên thanh xà
  const insulatorMat = lambertMat(0xcecdc7);
  for (const z of [-0.65, -0.35, 0.35, 0.65]) {
    const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.16, 8), insulatorMat);
    ins.position.set(0, 5.5, z);
    group.add(ins);
  }
  for (const z of [-0.55, -0.2, 0.2, 0.55]) {
    const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.16, 8), insulatorMat);
    ins.position.set(0, 6.0, z);
    group.add(ins);
  }

  // Loa truyền thanh phường hình phễu đặc trưng
  const hornMat = lambertMat(0x656b70);
  const hornGroup = new THREE.Group();
  hornGroup.position.set(0.18, 4.8, 0.2);
  hornGroup.rotation.y = 0.4;
  hornGroup.rotation.x = 0.15;

  const hornBell = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.35, 12, 1, true), hornMat);
  hornBell.rotation.x = Math.PI / 2;
  const hornBody = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.2, 10), hornMat);
  hornBody.rotation.x = Math.PI / 2;
  hornBody.position.z = -0.18;
  hornGroup.add(hornBell, hornBody);
  group.add(hornGroup);

  // Cuộn cáp viễn thông đen bó tròn (đặc sản Hà Nội)
  const coilGeo = new THREE.TorusGeometry(0.25, 0.045, 8, 16);
  const coilMat = lambertMat(0x18181a);
  const coil1 = new THREE.Mesh(coilGeo, coilMat);
  coil1.position.set(0.14, 4.2, 0);
  coil1.rotation.y = Math.PI / 2;
  const coil2 = new THREE.Mesh(coilGeo, coilMat);
  coil2.position.set(-0.13, 3.8, 0.1);
  coil2.rotation.y = 0.3;
  group.add(coil1, coil2);

  return group;
}

/** Tạo các đường dây điện chùng (catenary cable) bắc ngang vỉa hè */
export function createPowerCables(
  startPoint: THREE.Vector3,
  endPoint: THREE.Vector3,
  cableCount = 3,
): THREE.Group {
  const cableGroup = new THREE.Group();
  const wireMat = basicMat(0x181a1c);

  for (let c = 0; c < cableCount; c++) {
    const sag = 0.35 + c * 0.15;
    const offsetZ = (c - (cableCount - 1) / 2) * 0.18;
    const p0 = new THREE.Vector3(startPoint.x, startPoint.y - c * 0.12, startPoint.z + offsetZ);
    const p2 = new THREE.Vector3(endPoint.x, endPoint.y - c * 0.12, endPoint.z + offsetZ);
    const p1 = new THREE.Vector3(
      (p0.x + p2.x) / 2,
      Math.min(p0.y, p2.y) - sag,
      (p0.z + p2.z) / 2,
    );

    const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
    const tubeGeo = new THREE.TubeGeometry(curve, 20, 0.015, 5, false);
    cableGroup.add(new THREE.Mesh(tubeGeo, wireMat));
  }

  return cableGroup;
}

// ==========================================
// 3. CÂY SẤU / CÂY BÀNG CỔ THỤ HÀ NỘI
// ==========================================

export function createHanoiTree(): THREE.Group {
  const tree = new THREE.Group();

  // Bồn cây xây gạch bo quanh gốc trên vỉa hè
  const planterParts: THREE.BufferGeometry[] = [];
  const P_COL = 0x8a4b3d; // gạch nung đỏ
  // 4 cạnh bồn cây vuông 1.4m x 1.4m, cao 0.22m
  planterParts.push(part(box(1.4, 0.22, 0.14), P_COL, [0, 0.11, 0.63]));
  planterParts.push(part(box(1.4, 0.22, 0.14), P_COL, [0, 0.11, -0.63]));
  planterParts.push(part(box(0.14, 0.22, 1.12), P_COL, [0.63, 0.11, 0]));
  planterParts.push(part(box(0.14, 0.22, 1.12), P_COL, [-0.63, 0.11, 0]));
  // Đất nâu trong bồn
  planterParts.push(part(box(1.12, 0.18, 1.12), 0x3d2a1d, [0, 0.09, 0]));

  const planterMesh = new THREE.Mesh(merge(planterParts), lambertMat(P_COL));
  tree.add(planterMesh);

  // Thân cây sấu già cổ thụ:
  // Đoạn gốc quét vôi trắng (cao từ đất lên 0.9m)
  const whitewashGeo = new THREE.CylinderGeometry(0.3, 0.38, 0.9, 12);
  const whitewashMat = lambertMat(0xeeeae0);
  const whitewash = new THREE.Mesh(whitewashGeo, whitewashMat);
  whitewash.position.y = 0.45;
  whitewash.castShadow = true;
  tree.add(whitewash);

  // Thân gỗ nâu sần sùi phía trên vươn cao
  const trunkGeo = new THREE.CylinderGeometry(0.24, 0.3, 3.2, 12);
  const trunkMat = lambertMat(0x4a3628);
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.set(0.08, 2.4, 0.05);
  trunk.rotation.z = -0.06;
  trunk.castShadow = true;
  tree.add(trunk);

  // Các cành cây lớn vươn rộng
  const branchMat = lambertMat(0x3e2c20);
  const branches = [
    { pos: [-0.4, 3.8, 0.3] as const, rot: [0.3, 0.4, 0.6] as const, len: 1.8 },
    { pos: [0.5, 3.9, -0.2] as const, rot: [-0.2, -0.3, -0.5] as const, len: 1.9 },
    { pos: [0.1, 4.3, 0.6] as const, rot: [0.7, 0, 0.1] as const, len: 1.6 },
    { pos: [-0.2, 4.4, -0.5] as const, rot: [-0.6, 0.2, -0.2] as const, len: 1.7 },
  ];

  for (const b of branches) {
    const brGeo = new THREE.CylinderGeometry(0.1, 0.16, b.len, 8);
    const brMesh = new THREE.Mesh(brGeo, branchMat);
    brMesh.position.set(b.pos[0], b.pos[1], b.pos[2]);
    brMesh.rotation.set(b.rot[0], b.rot[1], b.rot[2]);
    tree.add(brMesh);
  }

  // Tán lá xum xuê (các khối cầu và vòm lá xanh Hà Nội)
  const leafMat = lambertMat(0x2f6b3e);
  const leafClusters = [
    { x: 0, y: 5.4, z: 0, s: 1.7 },
    { x: -1.2, y: 4.8, z: 0.6, s: 1.35 },
    { x: 1.3, y: 4.9, z: -0.4, s: 1.4 },
    { x: 0.3, y: 5.1, z: 1.2, s: 1.3 },
    { x: -0.5, y: 5.2, z: -1.1, s: 1.3 },
    { x: 0.2, y: 6.2, z: 0.1, s: 1.2 },
  ];

  for (const cl of leafClusters) {
    const leafGeo = new THREE.DodecahedronGeometry(cl.s, 1);
    const leafMesh = new THREE.Mesh(leafGeo, leafMat);
    leafMesh.position.set(cl.x, cl.y, cl.z);
    leafMesh.castShadow = true;
    tree.add(leafMesh);
  }

  return tree;
}

// ==========================================
// 4. CHI TIẾT QUÁN TRÀ ĐÁ VỈA HÈ HÀ NỘI
// ==========================================

export function createHanoiSidewalkProps(): THREE.Group {
  const group = new THREE.Group();

  // 1. Phích nước Rạng Đông truyền thống màu đỏ tươi có hoa văn
  const thermosParts: THREE.BufferGeometry[] = [];
  const RED = 0xd62828;
  const CHROME = 0xcccccc;
  // Thân phích hình trụ đỏ
  thermosParts.push(part(new THREE.CylinderGeometry(0.09, 0.095, 0.34, 14), RED, [0, 0.17, 0]));
  // Đáy phích kim loại
  thermosParts.push(part(new THREE.CylinderGeometry(0.096, 0.096, 0.04, 14), CHROME, [0, 0.02, 0]));
  // Nắp phích nhôm sáng
  thermosParts.push(part(new THREE.CylinderGeometry(0.065, 0.07, 0.08, 14), CHROME, [0, 0.38, 0]));
  // Nút bần gỗ bên trong nắp
  thermosParts.push(part(new THREE.CylinderGeometry(0.035, 0.04, 0.03, 10), 0xb58a57, [0, 0.43, 0]));
  // Quai nhôm xách phích
  thermosParts.push(part(new THREE.TorusGeometry(0.11, 0.009, 6, 14, Math.PI), CHROME, [0, 0.26, 0], 0, 0, Math.PI / 2));

  const thermos = new THREE.Mesh(merge(thermosParts), lambertMat(RED));
  thermos.position.set(-8.6, 0, -3.2);
  group.add(thermos);

  // 2. Điếu cày nứa bọc đồng (nét bất hủ của quán trà đá vỉa hè)
  const pipeParts: THREE.BufferGeometry[] = [];
  const BAMBOO = 0xcca35a; // màu tre nứa bóng
  const BRASS = 0xd4af37;  // đồng thau
  // Ống điếu nứa dài 0.6m
  pipeParts.push(part(new THREE.CylinderGeometry(0.024, 0.026, 0.62, 10), BAMBOO, [0, 0.31, 0]));
  // Các đốt tre mấu tròn
  for (const y of [0.18, 0.36, 0.52]) {
    pipeParts.push(part(new THREE.CylinderGeometry(0.027, 0.027, 0.02, 10), 0x967035, [0, y, 0]));
  }
  // Vòng bọc đồng ở đầu và gốc điếu
  pipeParts.push(part(new THREE.CylinderGeometry(0.027, 0.027, 0.05, 10), BRASS, [0, 0.03, 0]));
  pipeParts.push(part(new THREE.CylinderGeometry(0.026, 0.026, 0.04, 10), BRASS, [0, 0.6, 0]));
  // Nõ điếu cày bằng đồng chìa ra một góc 45 độ
  pipeParts.push(part(new THREE.CylinderGeometry(0.016, 0.01, 0.08, 8), BRASS, [0.045, 0.22, 0], 0, 0, -Math.PI / 4));

  const pipe = new THREE.Mesh(merge(pipeParts), lambertMat(BAMBOO));
  // Điếu cày tựa nghiêng vào góc quầy pha trà
  pipe.position.set(-8.85, 0, -2.85);
  pipe.rotation.set(0.18, 0.3, 0.35);
  group.add(pipe);

  // 3. Thùng xốp giữ đá màu trắng
  const coolerParts: THREE.BufferGeometry[] = [];
  const WHITE = 0xeeede6;
  coolerParts.push(part(box(0.52, 0.38, 0.38), WHITE, [0, 0.19, 0]));
  coolerParts.push(part(box(0.55, 0.05, 0.41), WHITE, [0, 0.4, 0])); // nắp xốp
  const cooler = new THREE.Mesh(merge(coolerParts), lambertMat(WHITE));
  cooler.position.set(-10.4, 0, -2.7);
  cooler.rotation.y = 0.15;
  group.add(cooler);

  // 4. Lọ thủy tinh nắp đỏ đựng kẹo lạc, kẹo cao su trên mặt quầy
  const jarParts: THREE.BufferGeometry[] = [];
  // Thân hũ thủy tinh
  jarParts.push(part(new THREE.CylinderGeometry(0.07, 0.07, 0.18, 12), 0xddeef0, [0, 0.09, 0]));
  // Nắp hũ đỏ rực
  jarParts.push(part(new THREE.CylinderGeometry(0.074, 0.074, 0.03, 12), 0xdd2222, [0, 0.19, 0]));
  // Kẹo lạc / kẹo dồi bên trong
  jarParts.push(part(new THREE.CylinderGeometry(0.055, 0.055, 0.12, 10), 0xd99a50, [0, 0.07, 0]));
  const jar = new THREE.Mesh(merge(jarParts), lambertMat(0xd99a50));
  jar.position.set(-9.8, 0.75, -2.65);
  group.add(jar);

  // 5. Mái hiên di động bạt sọc xanh trắng che khu vực quầy trà bà Ba bên trái
  // (không che trước ô cửa TV trung tâm và các ban công nhà phố)
  const awning = createHanoiAwning();
  awning.position.set(-11.8, 3.1, -5.95);
  group.add(awning);

  return group;
}

/** Mái hiên di động bạt dứa / bạt sọc che mát khu vực quầy pha trà */
function createHanoiAwning(): THREE.Group {
  const awning = new THREE.Group();

  // Khung thép gắn vào tường (rộng 4.4m, gọn phía quầy bà Ba)
  const frameMat = lambertMat(0x60656b);
  const bar = new THREE.Mesh(box(4.4, 0.06, 0.06), frameMat);
  bar.position.set(0, 0, 0);

  // Bạt hiên dốc ra phía trước (dài 4.4m, vươn ra 1.5m)
  const awningGeo = new THREE.PlaneGeometry(4.4, 1.55);
  if (typeof document === 'undefined') {
    return awning;
  }

  // Canvas vẽ họa tiết sọc xanh lá / trắng đặc trưng mái hiên Việt Nam
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const stripes = 16;
    const w = 512 / stripes;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#1f6e43' : '#f0ede1';
      ctx.fillRect(i * w, 0, w, 128);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  const mat = new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide });

  const sheet = new THREE.Mesh(awningGeo, mat);
  sheet.position.set(0, -0.2, 0.75);
  sheet.rotation.x = Math.PI / 2 + 0.26; // dốc xuống
  sheet.castShadow = true;

  // Diềm bạt lượn sóng rủ xuống phía trước
  const skirtGeo = new THREE.PlaneGeometry(4.4, 0.25);
  const skirt = new THREE.Mesh(skirtGeo, mat);
  skirt.position.set(0, -0.5, 1.48);
  skirt.rotation.x = 0.05;

  awning.add(bar, sheet, skirt);
  return awning;
}

// ==========================================
// 5. CHÚ CÚN VÀNG VỈA HÈ (CHÓ TA PHE PHẨY ĐUÔI)
// ==========================================

export interface SidewalkDog {
  group: THREE.Group;
  update(dt: number, time: number): void;
}

export function createSidewalkDog(): SidewalkDog {
  const group = new THREE.Group();
  const dogMat = lambertMat(0xd49b4b); // vàng rơm
  const darkMat = lambertMat(0x2a1a12);

  // Thân cún nằm cuộn mình
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.26, 6, 8), dogMat);
  body.rotation.z = Math.PI / 2;
  body.position.set(0, 0.12, 0);

  // Đầu cún gối đầu lên chân
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), dogMat);
  head.position.set(0.24, 0.15, 0.02);

  // Mõm đen xinh xắn
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.08), darkMat);
  snout.position.set(0.32, 0.12, 0.02);

  // 2 tai cụp
  for (const sz of [-0.07, 0.07]) {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.09, 0.03), dogMat);
    ear.position.set(0.22, 0.22, sz);
    ear.rotation.z = -0.3;
    group.add(ear);
  }

  // Đuôi cún có thể phe phẩy
  const tailPivot = new THREE.Group();
  tailPivot.position.set(-0.24, 0.12, 0);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.22, 6), dogMat);
  tail.position.set(-0.08, 0.06, 0);
  tail.rotation.z = 0.8;
  tailPivot.add(tail);

  group.add(body, head, snout, tailPivot);
  group.position.set(-7.2, 0, -1.8);
  group.rotation.y = 0.6;

  return {
    group,
    update(_dt: number, time: number) {
      // Đuôi thỉnh thoảng phe phẩy ngoe nguẩy nhè nhẹ
      tailPivot.rotation.y = Math.sin(time * 3.5) * 0.35;
      // Nhịp thở phập phồng
      body.scale.set(1 + Math.sin(time * 2) * 0.03, 1, 1 + Math.sin(time * 2) * 0.03);
    },
  };
}

// ==========================================
// 6. XE ĐẠP THỒ HOA HÀ NỘI (CÚC HỌA MI / HOA SEN)
// ==========================================

export function createFlowerBicycle(): THREE.Group {
  const bike = new THREE.Group();
  const frameMat = lambertMat(0x2d3a33); // xe đạp phượng hoàng xanh rêu cổ
  const chromeMat = lambertMat(0xdedede);
  const darkMat = lambertMat(0x181818);

  // 2 bánh xe nan hoa
  for (const sx of [-0.55, 0.55]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.02, 6, 16), darkMat);
    wheel.position.set(sx, 0.28, 0);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 8), chromeMat);
    hub.position.set(sx, 0.28, 0);
    hub.rotation.x = Math.PI / 2;
    bike.add(wheel, hub);
  }

  // Khung xe đạp hình kim cương
  const frameParts: THREE.BufferGeometry[] = [];
  frameParts.push(part(box(0.65, 0.03, 0.03), 0x2d3a33, [0, 0.44, 0], 0, 0, 0.1));
  frameParts.push(part(box(0.55, 0.03, 0.03), 0x2d3a33, [-0.05, 0.28, 0], 0, 0, -0.4));
  frameParts.push(part(box(0.52, 0.03, 0.03), 0x2d3a33, [0.24, 0.36, 0], 0, 0, -0.8));
  frameParts.push(part(box(0.5, 0.03, 0.03), 0x2d3a33, [-0.28, 0.36, 0], 0, 0, 0.7));
  bike.add(new THREE.Mesh(merge(frameParts), frameMat));

  // Ghi-đông và yên xe
  const handle = new THREE.Mesh(box(0.04, 0.03, 0.44), chromeMat);
  handle.position.set(0.48, 0.68, 0);
  const saddle = new THREE.Mesh(box(0.22, 0.05, 0.14), darkMat);
  saddle.position.set(-0.16, 0.54, 0);
  bike.add(handle, saddle);

  // Giá đèo hàng phía sau chở 2 mẹt thúng đầy hoa
  const basketMat = lambertMat(0xb58c54); // mây tre đan
  for (const sz of [-0.22, 0.22]) {
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.35, 12), basketMat);
    basket.position.set(-0.52, 0.48, sz);
    bike.add(basket);

    // Chùm hoa tươi sặc sỡ (trắng cúc họa mi, vàng hoa cúc, hồng hoa sen)
    const flowerColors = [0xffffff, 0xffe066, 0xff70a6, 0xffffff, 0xfca311];
    for (let f = 0; f < 8; f++) {
      const col = flowerColors[f % flowerColors.length] ?? 0xffffff;
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), lambertMat(col));
      const angle = (f / 8) * Math.PI * 2;
      flower.position.set(
        -0.52 + Math.cos(angle) * 0.12,
        0.66 + (f % 3) * 0.04,
        sz + Math.sin(angle) * 0.12,
      );
      bike.add(flower);
    }
  }

  // Chân chống dựng nghiêng cạnh gốc cây
  const kickstand = new THREE.Mesh(box(0.02, 0.32, 0.02), chromeMat);
  kickstand.position.set(-0.08, 0.16, -0.12);
  kickstand.rotation.x = -0.4;
  bike.add(kickstand);

  bike.rotation.y = -0.15;
  bike.rotation.z = 0.08; // nghiêng chân chống
  return bike;
}
