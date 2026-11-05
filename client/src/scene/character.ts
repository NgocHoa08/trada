import * as THREE from 'three';
import type { AvatarDef, Reaction } from '@tdvh/shared';

/** Hành động thỉnh thoảng của nhân vật đang ngồi. */
type Action = 'idle' | 'fan' | 'drink';
export type CharacterMode = 'sitting' | 'standing' | 'walking';

export interface Character {
  group: THREE.Group;
  /** Chạy animation phản ứng nhanh trên nhân vật này. */
  play(kind: Reaction): void;
  update(dt: number, time: number): void;
  setMode(mode: CharacterMode): void;
  getMode(): CharacterMode;
  walkTo(
    targetX: number,
    targetZ: number,
    targetRotY: number,
    modeAfter?: CharacterMode,
    onArrived?: () => void,
  ): void;
  isMoving(): boolean;
}

const mat = (color: number) => new THREE.MeshLambertMaterial({ color });

function makeNameTag(name: string, emoji: string): THREE.Sprite {
  if (typeof document === 'undefined') {
    return new THREE.Sprite();
  }
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 72;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(30,20,12,0.72)';
    ctx.beginPath();
    ctx.roundRect(0, 8, 320, 56, 28);
    ctx.fill();
    ctx.fillStyle = '#f6e7c3';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 30px system-ui, sans-serif';
    // fillText vẽ chữ thô lên canvas, an toàn không có nguy cơ chèn HTML
    ctx.fillText(`${emoji} ${name}`, 160, 37, 296);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }),
  );
  sprite.scale.set(1.3, 0.29, 1);
  sprite.position.set(0, 0.88, 0);
  sprite.renderOrder = 10;
  return sprite;
}

/**
 * Nhân vật dựng bằng hình khối với hệ thống khớp xương hỗ trợ ngồi, đứng và đi bộ.
 * Gốc tọa độ `group` nằm trên mặt đất.
 */
export function createCharacter(
  avatar: AvatarDef,
  name: string,
  moodEmoji: string,
  initialMode: CharacterMode = 'sitting',
): Character {
  const group = new THREE.Group();
  group.userData.characterName = name;
  group.userData.isCharacterRoot = true;
  const shirt = mat(avatar.shirt);
  const skin = mat(avatar.skin);
  const pants = mat(avatar.pants);

  // Pelvis: Gốc liên kết của thân trên và hai chân
  const pelvis = new THREE.Group();
  pelvis.position.set(0, initialMode === 'sitting' ? 0.28 : 0.48, 0);
  group.add(pelvis);

  // Thân trên (torso)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.38, 0.2), shirt);
  torso.position.set(0, 0.2, -0.02);
  pelvis.add(torso);

  // Đầu & mặt
  const head = new THREE.Group();
  head.position.set(0, 0.48, 0);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.135, 14, 10), skin));
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), mat(0x1a1a1a));
    eye.position.set(sx * 0.05, 0.02, 0.125);
    head.add(eye);
  }
  pelvis.add(head);

  // Mũ hoặc tóc
  const hairMat = mat(avatar.hair);
  const dome = (r: number, material: THREE.Material) =>
    new THREE.Mesh(new THREE.SphereGeometry(r, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), material);
  if (avatar.hat === 'nonla') {
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.2, 18), mat(0xd8c27a));
    hat.position.y = 0.16;
    head.add(hat);
  } else if (avatar.hat === 'noncoi') {
    const d = dome(0.165, mat(0x6b7a4a));
    d.position.y = 0.04;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.015, 16), mat(0x6b7a4a));
    brim.position.y = 0.05;
    head.add(d, brim);
  } else if (avatar.hat === 'cap') {
    const d = dome(0.158, mat(0x2a6f4a));
    d.position.y = 0.03;
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.015, 0.12), mat(0x2a6f4a));
    brim.position.set(0, 0.05, 0.16);
    head.add(d, brim);
  } else {
    const hair = dome(0.15, hairMat);
    hair.position.y = 0.03;
    head.add(hair);
  }

  // Hai cánh tay
  const armGroups = [-1, 1].map((sx) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(sx * 0.21, 0.36, -0.02);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.08), shirt);
    upper.position.y = -0.16;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), skin);
    hand.position.y = -0.34;
    shoulder.add(upper, hand);
    pelvis.add(shoulder);
    return shoulder;
  });
  const leftArm = armGroups[0] as THREE.Group;
  const rightArm = armGroups[1] as THREE.Group;

  // Quạt nan
  const fan = new THREE.Mesh(
    new THREE.CircleGeometry(0.12, 10, 0, Math.PI),
    new THREE.MeshLambertMaterial({ color: 0xe9d9a6, side: THREE.DoubleSide }),
  );
  fan.position.set(0, -0.38, 0.04);
  fan.visible = false;
  rightArm.add(fan);

  // Điếu thuốc lá trên tay phải
  const cigarette = new THREE.Group();
  cigarette.position.set(0, -0.34, 0.04);
  cigarette.rotation.x = Math.PI / 2;
  const cigPaper = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.05, 8), mat(0xffffff));
  cigPaper.position.y = 0.025;
  const cigFilter = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.018, 8), mat(0xcca052));
  cigFilter.position.y = -0.009;
  const cigEmber = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0075, 0.0075, 0.006, 8),
    new THREE.MeshBasicMaterial({ color: 0xff3300 }),
  );
  cigEmber.position.y = 0.053;
  cigarette.add(cigPaper, cigFilter, cigEmber);
  cigarette.visible = false;
  rightArm.add(cigarette);

  // Cụm khói thuốc nhả ra từ miệng
  const smokeGroup = new THREE.Group();
  smokeGroup.position.set(0, 0.02, 0.16);
  const smokeMat = new THREE.MeshBasicMaterial({
    color: 0xeeeeee,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const smokePuffs: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.035 + i * 0.02, 6, 6), smokeMat);
    puff.position.set((i - 1.5) * 0.03, i * 0.05, 0);
    smokeGroup.add(puff);
    smokePuffs.push(puff);
  }
  smokeGroup.visible = false;
  head.add(smokeGroup);

  // Hai chân (khớp háng -> đùi -> khớp gối -> cẳng chân -> bàn chân)
  const shoeMat = mat(0xe8e0d0);
  const legGroups = [-1, 1].map((sx) => {
    // Khớp hông
    const hip = new THREE.Group();
    hip.position.set(sx * 0.095, 0, 0);

    // Đùi
    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.1), pants);
    thigh.position.y = -0.11;
    hip.add(thigh);

    // Khớp gối
    const knee = new THREE.Group();
    knee.position.set(0, -0.22, 0);
    hip.add(knee);

    // Cẳng chân
    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.21, 0.09), pants);
    shin.position.y = -0.105;
    knee.add(shin);

    // Bàn chân / dép tổ ong
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.045, 0.16), shoeMat);
    foot.position.set(0, -0.21 - 0.0225, 0.04);
    knee.add(foot);

    pelvis.add(hip);
    return { hip, knee };
  });

  const leftLeg = legGroups[0]!;
  const rightLeg = legGroups[1]!;

  pelvis.add(makeNameTag(name, moodEmoji));

  // Trạng thái điều khiển
  let mode: CharacterMode = initialMode;
  let sitBlend = initialMode === 'sitting' ? 1 : 0;
  let walkPhase = Math.random() * 10;
  const phase = Math.random() * 10;

  // Mục tiêu di chuyển
  interface WalkGoal {
    targetX: number;
    targetZ: number;
    targetRotY: number;
    modeAfter: CharacterMode;
    onArrived?: () => void;
  }
  let walkGoal: WalkGoal | null = null;

  // Máy trạng thái ngồi: idle ↔ quạt / uống trà
  let action: Action = 'idle';
  let actionUntil = 0;
  let nextAction = 2 + Math.random() * 5;
  let armXR = -0.45;
  let armXL = -0.45;

  // Phản ứng nhanh
  let reaction: Reaction | null = null;
  let reactionStart = 0;
  let pendingReaction: Reaction | null = null;
  const REACTION_SECONDS = 1.6;

  return {
    group,
    play(kind) {
      pendingReaction = kind;
    },
    setMode(newMode) {
      mode = newMode;
      walkGoal = null;
    },
    getMode() {
      return mode;
    },
    walkTo(targetX, targetZ, targetRotY, modeAfter = 'sitting', onArrived) {
      walkGoal = { targetX, targetZ, targetRotY, modeAfter, onArrived };
      mode = 'walking';
    },
    isMoving() {
      return walkGoal !== null;
    },
    update(dt, time) {
      // 1. Xử lý di chuyển đến đích
      if (walkGoal) {
        const dx = walkGoal.targetX - group.position.x;
        const dz = walkGoal.targetZ - group.position.z;
        const dist = Math.hypot(dx, dz);

        if (dist > 0.08) {
          mode = 'walking';
          // Xoay hướng mặt về hướng di chuyển
          const targetAngle = Math.atan2(dx, dz);
          let diff = targetAngle - group.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          group.rotation.y += diff * Math.min(1, dt * 10);

          // Bước đi
          const moveSpeed = 1.8; // ~1.8 m/s
          const step = Math.min(dist, dt * moveSpeed);
          group.position.x += (dx / dist) * step;
          group.position.z += (dz / dist) * step;
        } else {
          // Đến đích
          group.position.x = walkGoal.targetX;
          group.position.z = walkGoal.targetZ;
          group.rotation.y = walkGoal.targetRotY;
          mode = walkGoal.modeAfter;
          const cb = walkGoal.onArrived;
          walkGoal = null;
          cb?.();
        }
      }

      // 2. Chuyển đổi tư thế (sitBlend: 1 = ngồi, 0 = đứng/đi)
      const targetSitBlend = mode === 'sitting' ? 1 : 0;
      sitBlend += (targetSitBlend - sitBlend) * Math.min(1, dt * 7);

      const basePelvisY = THREE.MathUtils.lerp(0.48, 0.28, sitBlend);

      // 3. Tư thế chân và tay
      let legHipL = 0;
      let legHipR = 0;
      let legKneeL = 0;
      let legKneeR = 0;
      let bounce = 0;
      let sway = 0;
      let walkArmL = -0.1;
      let walkArmR = -0.1;

      if (mode === 'walking') {
        walkPhase += dt * 8.5;
        // Bước chân nhịp nhàng
        legHipL = Math.sin(walkPhase) * 0.62;
        legHipR = -Math.sin(walkPhase) * 0.62;
        // Gập gối khi đưa chân ra sau
        legKneeL = Math.max(0, -Math.sin(walkPhase)) * 0.75;
        legKneeR = Math.max(0, Math.sin(walkPhase)) * 0.75;

        // Nhún người và lắc lư
        bounce = Math.abs(Math.sin(walkPhase * 2)) * 0.035;
        sway = Math.sin(walkPhase) * 0.03;

        // Vung tay đối diện nhịp chân
        walkArmL = -Math.sin(walkPhase) * 0.5;
        walkArmR = Math.sin(walkPhase) * 0.5;
      } else if (mode === 'standing') {
        legHipL = 0;
        legHipR = 0;
        legKneeL = 0;
        legKneeR = 0;
        walkArmL = -0.1;
        walkArmR = -0.1;
      }

      // Tư thế ngồi mục tiêu
      const sitHip = -Math.PI / 2;
      const sitKnee = Math.PI / 2;

      // Nội suy góc các khớp chân theo sitBlend
      leftLeg.hip.rotation.x = THREE.MathUtils.lerp(legHipL, sitHip, sitBlend);
      rightLeg.hip.rotation.x = THREE.MathUtils.lerp(legHipR, sitHip, sitBlend);
      leftLeg.knee.rotation.x = THREE.MathUtils.lerp(legKneeL, sitKnee, sitBlend);
      rightLeg.knee.rotation.x = THREE.MathUtils.lerp(legKneeR, sitKnee, sitBlend);

      // 4. Xử lý hành động cánh tay và biểu cảm khi ngồi
      if (pendingReaction) {
        reaction = pendingReaction;
        reactionStart = time;
        pendingReaction = null;
        action = 'idle';
        fan.visible = false;
        cigarette.visible = false;
        smokeGroup.visible = false;
        nextAction = time + REACTION_SECONDS + 3 + Math.random() * 4;
      }
      const reactionDuration = reaction === 'smoke' ? 2.5 : REACTION_SECONDS;
      if (reaction && time - reactionStart > reactionDuration) {
        reaction = null;
        cigarette.visible = false;
        smokeGroup.visible = false;
      }

      if (!reaction && sitBlend > 0.5) {
        if (action === 'idle' && time >= nextAction) {
          action = Math.random() < 0.5 ? 'fan' : 'drink';
          actionUntil = time + (action === 'fan' ? 3 : 2.2);
          fan.visible = action === 'fan';
        } else if (action !== 'idle' && time >= actionUntil) {
          action = 'idle';
          fan.visible = false;
          nextAction = time + 4 + Math.random() * 6;
        }
      } else if (sitBlend <= 0.5) {
        action = 'idle';
        fan.visible = false;
        cigarette.visible = false;
        smokeGroup.visible = false;
      }

      // Mục tiêu tư thế tay khi ngồi
      let tR = action === 'drink' ? -2.3 : action === 'fan' ? -1.3 : -0.45;
      let tL = -0.45;
      let zR = action === 'fan' ? Math.sin(time * 14) * 0.35 : 0;
      let zL = 0;
      let headX =
        action === 'drink'
          ? -0.25
          : mode === 'walking'
            ? Math.sin(walkPhase * 2) * 0.03
            : Math.sin(time * 0.7 + phase) * 0.04;
      let headY = 0;
      let headZ = 0;
      let hop = 0;

      if (reaction && sitBlend > 0.5) {
        const t = time - reactionStart;
        switch (reaction) {
          case 'smoke': {
            cigarette.visible = true;
            if (t < 1.0) {
              // Rít thuốc
              tR = -2.45;
              zR = 0.12;
              headX = -0.22;
              smokeGroup.visible = false;
              cigEmber.scale.setScalar(1 + Math.sin(t * 18) * 0.35);
            } else {
              // Nhả khói
              tR = -1.15;
              zR = 0;
              headX = 0.04;
              smokeGroup.visible = true;
              const smokeProg = Math.min(1, (t - 1.0) / 1.5);
              smokeMat.opacity = Math.max(0, (1 - smokeProg) * 0.65);
              smokeGroup.position.y = 0.02 + smokeProg * 0.38;
              smokeGroup.position.z = 0.16 + Math.sin(smokeProg * 5) * 0.04;
              smokeGroup.scale.setScalar(1 + smokeProg * 2.2);
            }
            break;
          }
          case 'seeds':
            tR = -2.35;
            zR = 0.06;
            headX = Math.sin(t * 18) * 0.04;
            break;
          case 'candy':
            tR = -2.25;
            zR = 0.06;
            headX = Math.sin(t * 12) * 0.05;
            break;
          case 'haha':
            hop = Math.abs(Math.sin(t * 16)) * 0.04;
            headX = -0.2;
            tL = -0.9;
            tR = -0.9;
            break;
          case 'thuong':
            headZ = Math.sin(t * 5) * 0.18;
            tL = -1.1;
            tR = -1.1;
            zL = 0.35;
            zR = -0.35;
            break;
          case 'hong':
            headY = Math.sin(t * 14) * 0.5;
            tR = -1.5;
            zR = Math.sin(t * 14) * 0.5;
            break;
          case 'cangly':
            tR = -2.7;
            zR = 0.1;
            hop = Math.max(0, Math.sin(t * 8)) * 0.015;
            break;
          case 'om':
            tL = -1.7;
            tR = -1.7;
            zL = 0.45;
            zR = -0.45;
            headZ = 0.12;
            break;
          case 'unhi':
            tR = -2.9;
            headX = Math.sin(t * 9) * 0.2 - 0.1;
            break;
        }
      }

      const k = Math.min(1, dt * 10);
      armXR += (tR - armXR) * k;
      armXL += (tL - armXL) * k;

      // Hòa trộn tay giữa tư thế đi/đứng và tư thế ngồi
      rightArm.rotation.x = THREE.MathUtils.lerp(walkArmR, armXR, sitBlend);
      rightArm.rotation.z = THREE.MathUtils.lerp(0, zR, sitBlend);
      leftArm.rotation.x = THREE.MathUtils.lerp(walkArmL, armXL, sitBlend);
      leftArm.rotation.z = THREE.MathUtils.lerp(0, zL, sitBlend);

      // Thở nhẹ và lắc lư
      torso.scale.y = 1 + Math.sin(time * 1.8 + phase) * 0.015;
      head.rotation.set(headX, headY, headZ);

      pelvis.position.y = basePelvisY + bounce + hop;
      group.rotation.z = sway;
    },
  };
}
