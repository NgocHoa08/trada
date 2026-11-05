import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import {
  COLOR_FILTERS,
  getRound,
  getVnHour,
  getWeatherForRound,
  seatsForPref,
  SEATS,
  STORY_BUBBLE_MS,
  areNeighbors,
  type ColorFilter,
  type MapRegion,
  type Reaction,
  type SeasonType,
  type ServerMessage,
  type WeatherType,
} from '@tdvh/shared';
import { AudioManager, type SoundVolumes } from './audio';
import { createWorld } from './scene/world';
import { createInteractionHud } from './interactionHud';
import { fetchTopic, ServerClock } from './net';
import { RadioPlayer } from './radio';
import { showOnboarding } from './onboarding';
import type { Profile } from './profile';
import { getOrCreateUserId } from './userId';
import { GameClient } from './ws';
import './style.css';

const app = document.getElementById('app');
if (!app) throw new Error('Thiếu #app');

const mobile = window.matchMedia('(pointer: coarse)').matches;
const params = new URLSearchParams(location.search);

const renderer = new THREE.WebGLRenderer({
  antialias: !mobile,
  powerPreference: 'high-performance',
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = !mobile;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.append(renderer.domElement);

const cssScene = new THREE.Scene();
const cssRenderer = new CSS3DRenderer();
cssRenderer.setSize(window.innerWidth, window.innerHeight);
cssRenderer.domElement.style.position = 'fixed';
cssRenderer.domElement.style.top = '0';
cssRenderer.domElement.style.left = '0';
cssRenderer.domElement.style.width = '100vw';
cssRenderer.domElement.style.height = '100vh';
cssRenderer.domElement.style.pointerEvents = 'none';
cssRenderer.domElement.style.zIndex = '15';
app.append(cssRenderer.domElement);

const world = createWorld({ mobile });
const userId = getOrCreateUserId();
const radioPlayer = new RadioPlayer('yt-player-target');
radioPlayer.onTrackEnded = (videoId) => {
  gameClient.send({ t: 'trackEnded', videoId });
};
const audioManager = new AudioManager();

let profile: Profile | null = null;
let currentSeatId: string | null = null;

// Quản lý hiển thị bong bóng story 30 giây
const storyBubbleTimers = new Map<string, number>();

function triggerStoryBubble(seatId: string, text: string): void {
  world.showStory(seatId, text);
  const old = storyBubbleTimers.get(seatId);
  if (old !== undefined) clearTimeout(old);
  const timer = window.setTimeout(() => {
    world.hideStory(seatId);
    storyBubbleTimers.delete(seatId);
  }, STORY_BUBBLE_MS);
  storyBubbleTimers.set(seatId, timer);
}

// ---------- Realtime WebSocket ----------
const gameClient = new GameClient({
  onStatusChange(status) {
    if (status === 'disconnected') {
      hud.toast('Quán mất sóng, đang kết nối lại…');
    } else if (status === 'connected' && profile) {
      gameClient.send({
        t: 'join',
        userId,
        name: profile.name,
        avatar: profile.avatar,
        mood: profile.mood,
      });
    }
  },
  onMessage(msg: ServerMessage) {
    switch (msg.t) {
      case 'welcome': {
        // Cập nhật tất cả các ghế
        for (const seat of msg.seats) {
          world.setOccupant(seat.seatId, seat.occupant);
          world.setTreated(seat.seatId, seat.treated);
        }
        currentSeatId = msg.youSeatId;
        hud.setSeated(currentSeatId !== null, currentSeatId);
        hud.setOnline(msg.online);
        hud.setStories(msg.stories);
        break;
      }
      case 'seatChanged': {
        world.setOccupant(msg.seat.seatId, msg.seat.occupant);
        world.setTreated(msg.seat.seatId, msg.seat.treated);
        if (msg.seat.seatId === currentSeatId && msg.seat.occupant === null) {
          currentSeatId = null;
          hud.setSeated(false, null);
        }
        break;
      }
      case 'reaction': {
        world.playReaction(msg.fromSeatId, msg.kind, msg.toSeatId);
        break;
      }
      case 'storyPosted': {
        hud.addStory(msg.story);
        if (msg.story.seatId) {
          triggerStoryBubble(msg.story.seatId, msg.story.text);
        }
        break;
      }
      case 'storyHidden': {
        hud.removeStory(msg.storyId);
        break;
      }
      case 'treatReceived': {
        hud.toast('🍵 Ai đó vừa đãi bạn một ly trà đặc biệt!');
        world.flashSeat(msg.toSeatId);
        break;
      }
      case 'coinsUpdated': {
        gameClient.send({ t: 'getProfile' });
        break;
      }
      case 'profileInfo': {
        hud.setProfileInfo({
          name: msg.name,
          avatar: msg.avatar,
          mood: msg.mood,
          coins: msg.coins,
          streak: msg.streak,
          recoveryCode: msg.recoveryCode,
          todayFullRounds: msg.todayFullRounds,
          totalFullRounds: msg.totalFullRounds,
        });
        break;
      }
      case 'leaderboard': {
        hud.setLeaderboard(msg.week, msg.top);
        break;
      }
      case 'radio': {
        radioPlayer.syncRadio(msg.current, clock.now(), msg.isPaused);
        hud.setRadioQueue(msg.queue);
        hud.setRadioPlaying(msg.current, msg.isPaused);
        const title = msg.current ? (msg.current.id === 'default' ? 'Big Buck Bunny (Hoạt hình)' : 'Phim & Ca Nhạc Quán') : undefined;
        world.setTvPlaying(!msg.isPaused && !!msg.current, title);
        break;
      }
      case 'adminStatus': {
        hud.setAdminStatus(msg.isAdmin, msg.message);
        break;
      }
      case 'online': {
        hud.setOnline(msg.online);
        break;
      }
      case 'error': {
        hud.toast(msg.message);
        break;
      }
      case 'rpsInvited': {
        hud.handleRpsInvite(msg.gameId, msg.fromName, msg.fromSeatId);
        break;
      }
      case 'rpsResult': {
        hud.handleRpsResult(msg.myChoice, msg.opponentChoice, msg.result, msg.opponentName);
        break;
      }
      case 'treatAllReceived': {
        hud.handleTreatAll(msg.fromName);
        if (msg.fromSeatId) world.flashSeat(msg.fromSeatId);
        audioManager.playTeaPour();
        break;
      }
      case 'letterDrawn': {
        hud.setLetterDrawn(msg.letter);
        break;
      }
      case 'guestbook': {
        hud.setGuestbook(msg.entries);
        break;
      }

    }
  },
});
let isFpv = false;
let batterySaver = false;

function capturePolaroid(userName: string, hourText: string, weatherText: string): string {
  const srcCanvas = renderer.domElement;
  const w = 640;
  const h = 760;
  const photoCanvas = document.createElement('canvas');
  photoCanvas.width = w;
  photoCanvas.height = h;
  const ctx = photoCanvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#f8f6f0';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#d6cebe';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);

  ctx.drawImage(srcCanvas, 24, 24, w - 48, 540);

  ctx.fillStyle = '#2b1d14';
  ctx.font = 'bold 22px "Segoe Print", "Comic Sans MS", cursive, sans-serif';
  ctx.fillText('Trà Đá Vỉa Hè · Phố Tràng Tiền', 32, 600);

  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = '#665c54';
  ctx.fillText(`Khách ghé quán: ${userName} · ${hourText} · ${weatherText}`, 32, 634);

  ctx.fillStyle = '#a87c3a';
  ctx.font = 'italic 14px system-ui, sans-serif';
  ctx.fillText('"Một buổi chiều bình yên, ly trà đá và những người bạn lạ."', 32, 668);

  return photoCanvas.toDataURL('image/png');
}


const hud = createInteractionHud(app, {
  onStand() {
    if (currentSeatId) {
      world.standUp(currentSeatId);
    }
    gameClient.send({ t: 'stand' });
    currentSeatId = null;
    hud.setSeated(false, null);
  },
  onReact(kind: Reaction, targetSeatId?: string) {
    gameClient.send({ t: 'react', kind, targetSeatId });
  },
  onStory(text: string) {
    gameClient.send({ t: 'story', text });
  },
  onTreat(targetSeatId: string) {
    gameClient.send({ t: 'treat', targetSeatId });
  },
  onReportStory(storyId: string) {
    gameClient.send({ t: 'reportStory', storyId });
  },
  onGetProfile() {
    gameClient.send({ t: 'getProfile' });
  },
  onUpdateProfile(name: string, avatar: string, mood: string) {
    gameClient.send({ t: 'updateProfile', name, avatar, mood });
  },
  onRecover(code: string) {
    gameClient.send({ t: 'recover', code });
  },
  onGetLeaderboard() {
    gameClient.send({ t: 'getLeaderboard' });
  },
  onQueueSong(url: string) {
    gameClient.send({ t: 'queueSong', url });
  },
  onPlayDirect(videoId: string, startSec: number) {
    radioPlayer.playDirect(videoId, startSec);
    world.setTvPlaying(true, 'Chiếu Phim & Ca Nhạc Vỉa Hè');
  },
  onUnmuteRadio() {
    radioPlayer.unmuteAndPlay();
  },
  onUnmuteAudio() {
    audioManager.unlock();
  },
  onVolumeChange(key, val) {
    audioManager.setVolume(key as keyof SoundVolumes, val);
  },
  onWeatherChange(mode) {
    weatherMode = mode;
    lastWeatherApplied = null;
    const now = clock.now();
    const round = getRound(now);
    applyCurrentWeather(round.roundIndex);
  },
  onAdminAuth(pass) {
    gameClient.send({ t: 'adminAuth', pass });
  },
  onAdminSkip() {
    gameClient.send({ t: 'adminSkip' });
  },
  onAdminPause(pause) {
    gameClient.send({ t: 'adminPause', pause });
  },
  onRpsInvite(targetSeatId) {
    gameClient.send({ t: 'rpsInvite', targetSeatId });
  },
  onRpsMove(gameId, choice) {
    gameClient.send({ t: 'rpsMove', gameId, choice });
  },
  onTreatAll() {
    gameClient.send({ t: 'treatAll' });
  },
  onPostLetter(text) {
    gameClient.send({ t: 'postLetter', text });
  },
  onDrawLetter() {
    gameClient.send({ t: 'drawLetter' });
  },
  onGetGuestbook() {
    gameClient.send({ t: 'getGuestbook' });
  },
  onSignGuestbook(text) {
    gameClient.send({ t: 'signGuestbook', text });
  },
  onSetDrink(drinkId) {
    world.setDrink(drinkId);
  },
  onSetMapRegion(region) {
    if (region === 'saigon') {
      world.setWeather('sunny');
      hud.toast('☀️ Đã đến Cà Phê Bệt Sài Gòn - Nắng vàng rực rỡ!');
    } else if (region === 'danang') {
      world.setWeather('sunny');
      hud.toast('🌊 Đã đến Bến Biển Hội An - Gió mát & Đèn lồng!');
    } else {
      world.setWeather('sunny');
      hud.toast('🏮 Đã về Phố Cổ Tràng Tiền Hà Nội!');
    }
  },
  onSetSeason(season) {
    if (season === 'spring') {
      world.setWeather('cloudy');
      hud.toast('🌸 Mùa Xuân: Hoa đào khoe sắc, mưa phùn ấm áp!');
    } else if (season === 'summer') {
      world.setWeather('sunny');
      hud.toast('☀️ Mùa Hạ: Nắng vàng râm ran tiếng ve sầu!');
    } else if (season === 'autumn') {
      world.setWeather('sunny');
      hud.toast('🍂 Mùa Thu: Lá vàng rơi nhẹ, gió heo may thoang thoảng!');
    } else {
      world.setWeather('cloudy');
      hud.toast('❄️ Mùa Đông: Se lạnh phố đông, bếp than hồng ấm cúng!');
    }
  },
  onSetColorFilter(filterId) {
    const f = COLOR_FILTERS.find((it) => it.id === filterId);
    renderer.domElement.style.filter = f ? f.cssFilter : 'none';
    cssRenderer.domElement.style.filter = f ? f.cssFilter : 'none';
  },
  onToggleFpv() {
    isFpv = !isFpv;
    if (isFpv) {
      const seat = currentSeatId ? SEATS.find((s) => s.id === currentSeatId) : null;
      const px = seat ? seat.x : 0;
      const pz = seat ? seat.z : 0;
      camera.position.set(px, 0.72, pz);
      camera.lookAt(px, 0.72, pz + 6);
      controls.enabled = false;
    } else {
      camera.position.set(9, 13, 16);
      camera.lookAt(TARGET_START);
      controls.enabled = true;
    }
    return isFpv;
  },
  onCapturePolaroid() {
    const name = profile?.name ?? 'Khách';
    const hour = fixedHour ?? getVnHour(clock.now());
    const hText = `${Math.floor(hour)}h${String(Math.floor((hour % 1) * 60)).padStart(2, '0')}`;
    const wText = world.getWeather() === 'rainy' ? 'Mưa rào' : world.getWeather() === 'cloudy' ? 'Âm u' : 'Nắng vàng';
    return capturePolaroid(name, hText, wText);
  },
  onToggleBatterySaver() {
    batterySaver = !batterySaver;
    return batterySaver;
  },


});
// Gắn màn hình TV liên kết YouTube vào đúng chiếc TV 3D điền ô cửa giữa quán
const tv3dWrapper = document.createElement('div');
tv3dWrapper.className = 'tv-3d-wrapper';
hud.setTvModeParent(tv3dWrapper);

const tv3dObj = new CSS3DObject(tv3dWrapper);
tv3dObj.position.set(0, 1.42, -5.99);
tv3dObj.rotation.y = 0;
tv3dObj.scale.set(3.6 / 800, 2.025 / 450, 1);
cssScene.add(tv3dObj);


let weatherMode: WeatherType | 'auto' = 'auto';
let lastWeatherApplied: WeatherType | null = null;

function applyCurrentWeather(roundIndex: number): void {
  const targetWeather = weatherMode === 'auto' ? getWeatherForRound(roundIndex) : weatherMode;
  if (targetWeather !== lastWeatherApplied) {
    world.setWeather(targetWeather);
    hud.setWeather(targetWeather, weatherMode);
    if (targetWeather === 'rainy') {
      audioManager.setVolume('rain', 0.25);
    } else {
      audioManager.setVolume('rain', 0);
    }
    lastWeatherApplied = targetWeather;
  }
}

// ---------- Đồng hồ chung với server ----------
const skewParam = Number(params.get('skew'));
const clock = new ServerClock(Number.isFinite(skewParam) ? skewParam : 0);

async function syncForever(): Promise<void> {
  let delay = 2000;
  for (;;) {
    try {
      await clock.sync();
      delay = 2000;
      await new Promise((r) => setTimeout(r, 5 * 60_000));
    } catch {
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 2, 30_000);
    }
  }
}
void syncForever();

// ---------- Chủ đề của tuần trà ----------
const topics = new Map<number, string>();
const topicRequested = new Set<number>();

function ensureTopic(roundIndex: number): void {
  if (topics.has(roundIndex) || topicRequested.has(roundIndex)) return;
  topicRequested.add(roundIndex);
  fetchTopic(roundIndex)
    .then((t) => topics.set(roundIndex, t))
    .catch(() => {
      setTimeout(() => topicRequested.delete(roundIndex), 5000);
    });
}

// ---------- Camera & Controls ----------
const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 300);
const TARGET_START = new THREE.Vector3(0, 0, 0);
camera.position.set(9, 13, 16);
camera.lookAt(TARGET_START);

const controls = new MapControls(camera, renderer.domElement);
controls.target.copy(TARGET_START);
controls.enableRotate = false;
controls.screenSpacePanning = false;
controls.enableDamping = true;
controls.dampingFactor = 0.12;
controls.minDistance = 9;
controls.maxDistance = 32;
controls.update();

const PAN_LIMIT = { minX: -13, maxX: 13, minZ: -5, maxZ: 5 };
function clampPan(): void {
  const t = controls.target;
  const dx = Math.min(PAN_LIMIT.maxX, Math.max(PAN_LIMIT.minX, t.x)) - t.x;
  const dz = Math.min(PAN_LIMIT.maxZ, Math.max(PAN_LIMIT.minZ, t.z)) - t.z;
  if (dx !== 0 || dz !== 0) {
    t.x += dx;
    t.z += dz;
    camera.position.x += dx;
    camera.position.z += dz;
  }
}

function resize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  cssRenderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ---------- Chọn ghế & Loa bằng raycast ----------
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

function pickObject(
  clientX: number,
  clientY: number,
):
  | { type: 'seat'; id: string; occupied: boolean }
  | { type: 'speaker' }
  | { type: 'tv' }
  | { type: 'bossStall' }
  | { type: 'xiangqi' }
  | { type: 'ground'; x: number; z: number }
  | null {
  const rect = renderer.domElement.getBoundingClientRect();
  ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);

  // Kiểm tra quầy bà chủ quán
  const bossHits = raycaster.intersectObject(world.bossStallTarget, true);
  if (bossHits.length > 0) {
    return { type: 'bossStall' };
  }

  // Kiểm tra bàn cờ tướng vỉa hè
  const xiangqiHits = raycaster.intersectObject(world.xiangqiTarget, true);
  if (xiangqiHits.length > 0) {
    return { type: 'xiangqi' };
  }

  // Kiểm tra loa thùng trước
  const speakerHits = raycaster.intersectObject(world.speakerTarget, true);
  if (speakerHits.length > 0) {
    return { type: 'speaker' };
  }

  // Kiểm tra màn hình TV
  const tvHits = raycaster.intersectObject(world.tvTarget, true);
  if (tvHits.length > 0) {
    return { type: 'tv' };
  }

  // Kiểm tra ghế
  const hit = raycaster.intersectObjects(world.seatHitTargets, false)[0];
  if (hit) {
    const id = hit.object.userData.seatId;
    if (typeof id === 'string') {
      const occupied = hit.object.parent?.visible === false;
      return { type: 'seat', id, occupied };
    }
  }

  // Kiểm tra vỉa hè để đi bộ
  const groundHit = raycaster.intersectObject(world.sidewalkTarget, false)[0];
  if (groundHit && groundHit.point) {
    const p = groundHit.point;
    if (p.z >= -5.6 && p.z <= 3.8 && Math.abs(p.x) <= 13.5) {
      return { type: 'ground', x: p.x, z: p.z };
    }
  }

  return null;
}

const canvas = renderer.domElement;
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  const res = pickObject(e.clientX, e.clientY);
  if (res && res.type === 'seat') {
    world.setHover(!res.occupied ? res.id : null);
  } else {
    world.setHover(null);
  }
  canvas.style.cursor = res
    ? res.type === 'ground'
      ? world.hasStandingPlayer()
        ? 'crosshair'
        : 'default'
      : 'pointer'
    : 'grab';
});
canvas.addEventListener('pointerleave', () => world.setHover(null));

let down: { x: number; y: number; t: number } | null = null;
canvas.addEventListener('pointerdown', (e) => {
  down = { x: e.clientX, y: e.clientY, t: performance.now() };
  if (e.pointerType !== 'mouse') {
    const res = pickObject(e.clientX, e.clientY);
    if (res && res.type === 'seat') {
      world.setHover(!res.occupied ? res.id : null);
    }
  }
});

canvas.addEventListener('pointerup', (e) => {
  if (e.pointerType !== 'mouse') world.setHover(null);
  const d = down;
  down = null;
  if (!d || !profile) return;
  if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8 || performance.now() - d.t > 500) return;

  const res = pickObject(e.clientX, e.clientY);
  if (!res) return;

  if (res.type === 'bossStall') {
    hud.openBossShop();
    return;
  }
  if (res.type === 'xiangqi') {
    hud.openXiangqi();
    return;
  }


  if (res.type === 'speaker' || res.type === 'tv') {
    hud.openRadio();
    return;
  }

  // Click vào vỉa hè khi đang đứng: nhân vật đi bộ tới điểm đó
  if (res.type === 'ground') {
    if (world.hasStandingPlayer()) {
      world.walkPlayerTo(res.x, res.z);
    }
    return;
  }

  // Nếu ghế đang có người khác:
  if (res.occupied) {
    if (res.id === currentSeatId) {
      hud.toast('Bạn đang ngồi ở đây rồi 🪑');
      return;
    }
    // Nếu mình đang ngồi ghế khác và ghế này là hàng xóm: hỏi/cho đãi trà!
    if (currentSeatId && areNeighbors(currentSeatId, res.id)) {
      hud.toast('Đang đãi bạn bên cạnh ly trà 🍵…');
      gameClient.send({ t: 'treat', targetSeatId: res.id });
    } else {
      hud.toast('Chỗ này đã có người ngồi ☕');
    }
    return;
  }

  // Ghế trống: yêu cầu server ngồi vào
  world.flashSeat(res.id);
  gameClient.send({ t: 'sit', seatId: res.id });
  currentSeatId = res.id;
  hud.setSeated(true, res.id);
});

// ---------- Vòng lặp Render ----------
const hourParam = params.get('hour');
const fixedHour =
  hourParam !== null && Number.isFinite(Number(hourParam)) ? Number(hourParam) : null;

const threeClock = new THREE.Clock();
let lastRoundIndex: number | null = null;

renderer.setAnimationLoop(() => {
  if (batterySaver && Math.random() < 0.4) return;
  const dt = Math.min(0.1, threeClock.getDelta());
  const now = clock.now();
  const round = getRound(now);
  const hour = fixedHour ?? getVnHour(now);

  applyCurrentWeather(round.roundIndex);

  if (clock.isSynced) {
    ensureTopic(round.roundIndex);
    if (lastRoundIndex !== null && lastRoundIndex !== round.roundIndex) {
      hud.toast('Bà chủ rót lại trà 🫖 Tuần trà mới bắt đầu!');
      audioManager.playTeaPour();
    }
    lastRoundIndex = round.roundIndex;
  }

  controls.update();
  clampPan();
  world.update(dt, threeClock.elapsedTime, hour, round.progress);
  hud.setTime(hour);
  hud.setRound({
    roundIndex: round.roundIndex,
    progress: round.progress,
    remainingMs: round.remainingMs,
    topic: topics.get(round.roundIndex) ?? null,
    synced: clock.isSynced,
  });
  renderer.render(world.scene, camera);
  cssRenderer.render(cssScene, camera);
});

// ---------- Onboarding & Kết nối ----------
void showOnboarding(app).then((p) => {
  profile = p;
  gameClient.connect();

  // Thử ngồi vào khu vực ưa thích
  const preferred = seatsForPref(p.seatPref)[0] ?? SEATS[0];
  if (preferred) {
    setTimeout(() => {
      gameClient.send({ t: 'sit', seatId: preferred.id });
      currentSeatId = preferred.id;
      hud.setSeated(true, preferred.id);
    }, 300);
  }
});
