import {
  ACCESSORIES,
  ACHIEVEMENTS,
  AVATARS,
  chessColorOfSeat,
  COLOR_FILTERS,
  DAILY_STREAK_REWARDS,
  DRINKS,
  getBossGreeting,
  getInitialXiangqiBoard,
  getPatronLevel,
  getRandomFortune,
  isLegalXiangqiMove,
  MAP_REGIONS,
  parseYouTubeUrl,
  PETS,
  REACTIONS,
  RPS_CHOICES,
  SEASONS,
  STORY_MAX,
  WEATHER_OPTIONS,
  XIANGQI_PIECE_NAMES,
  XIANGQI_PUZZLES,
  type ColorFilter,
  type LeaderboardEntry,
  type MapRegion,
  type RadioItem,
  type Reaction,
  type RpsChoice,
  type SeasonType,
  type ServerMessage,
  type Story,
  type WeatherType,
} from '@tdvh/shared';

export interface ProfileInfoData {
  name: string;
  avatar: string;
  mood: string;
  coins: number;
  streak: number;
  recoveryCode: string;
  todayFullRounds: number;
  totalFullRounds: number;
}

export interface InteractionHud {
  tvDockElement: HTMLElement;
  setTime(hour: number): void;
  toast(message: string): void;
  setRound(info: {
    roundIndex: number;
    progress: number;
    remainingMs: number;
    topic: string | null;
    synced: boolean;
  }): void;
  setOnline(count: number): void;
  setSeated(seated: boolean, seatId: string | null): void;
  setStories(stories: readonly Story[]): void;
  addStory(story: Story): void;
  removeStory(storyId: string): void;
  setProfileInfo(info: ProfileInfoData): void;
  setLeaderboard(week: string, entries: LeaderboardEntry[]): void;
  openRadio(): void;
  openBossShop(): void;
  openFortune(): void;
  openLetterBox(): void;
  openGuestbook(): void;
  openXiangqi(): void;
  handleRpsInvite(gameId: string, fromName: string, fromSeatId?: string): void;
  handleRpsResult(myChoice: RpsChoice, opponentChoice: RpsChoice, result: 'win' | 'lose' | 'draw', opponentName: string): void;
  handleTreatAll(fromName: string): void;
  setLetterDrawn(letter: { id: string; text: string; createdAt: number } | null): void;
  setGuestbook(entries: { id: string; name: string; avatar: string; text: string; createdAt: number }[]): void;
  openPlayerActionMenu(targetName: string, targetSeatId?: string): void;
  handleGameInvite(gameId: string, gameType: 'rps' | 'xiangqi', fromName: string, fromSeatId: string): void;
  handleGameStarted(gameId: string, gameType: 'rps' | 'xiangqi', p1Name: string, p2Name: string, myColor?: 'red' | 'black'): void;
  handleGameDeclined(byName: string): void;
  handleRpsOpponentMoved(opponentName: string): void;
  handleChessMoved(from: [number, number], to: [number, number], piece: string, turn: 'red' | 'black'): void;
  setChessTable(msg: Extract<ServerMessage, { t: 'chessTable' }>): void;

  setRadioQueue(queue: RadioItem[]): void;
  setRadioPlaying(current: RadioItem | null, isPaused?: boolean): void;
  setAdminStatus(isAdmin: boolean, message?: string): void;
  setWeather(weather: WeatherType, mode: WeatherType | 'auto'): void;
  setTvMode(mode: '3d' | 'cinema' | 'pip'): void;
  getTvMode(): '3d' | 'cinema' | 'pip';

}

export interface HudCallbacks {
  onStand: () => void;
  onReact: (kind: Reaction, targetSeatId?: string) => void;
  onStory: (text: string) => void;
  onTreat: (targetSeatId: string) => void;
  onReportStory: (storyId: string) => void;
  onGetProfile: () => void;
  onUpdateProfile: (name: string, avatar: string, mood: string) => void;
  onRecover: (code: string) => void;
  onGetLeaderboard: () => void;
  onQueueSong: (url: string) => void;
  onPlayDirect?: (videoId: string, startSec: number) => void;
  onUnmuteRadio: () => void;
  onUnmuteAudio: () => void;
  onVolumeChange: (key: string, val: number | boolean) => void;
  onWeatherChange?: (mode: WeatherType | 'auto') => void;
  onAdminAuth?: (pass: string) => void;
  onAdminSkip?: () => void;
  onAdminPause?: (pause: boolean) => void;
  onRpsInvite?: (targetSeatId: string) => void;
  onRpsMove?: (gameId: string, choice: RpsChoice) => void;
  onTreatAll?: () => void;
  onPostLetter?: (text: string) => void;
  onDrawLetter?: () => void;
  onGetGuestbook?: () => void;
  onSignGuestbook?: (text: string) => void;
  onSetDrink?: (drinkId: string) => void;
  onSetMapRegion?: (region: MapRegion) => void;
  onSetSeason?: (season: SeasonType) => void;
  onSetColorFilter?: (filter: ColorFilter) => void;
  onToggleFpv?: () => boolean;
  onCapturePolaroid?: () => string;
  onToggleBatterySaver?: () => boolean;
  onXiangqiInvite?: (targetSeatId: string) => void;
  onGameInvite?: (targetSeatId: string, gameType: 'rps' | 'xiangqi') => void;
  onGameAccept?: (gameId: string) => void;
  onGameDecline?: (gameId: string) => void;
  onChessMove?: (gameId: string, from: [number, number], to: [number, number], piece: string) => void;
  onChessTableMove?: (from: [number, number], to: [number, number]) => void;
  onChessTableReset?: () => void;
  onClaimCoins?: (amount: number, reason: string) => void;



}

export function createInteractionHud(root: HTMLElement, cb: HudCallbacks): InteractionHud {
  // Topbar trái: Đồng hồ, online, tiền lẻ & chuỗi ngày
  const topBar = document.createElement('div');
  topBar.className = 'hud-topbar';
  let lastProfileData: ProfileInfoData | null = null;


  const clock = document.createElement('div');
  clock.className = 'hud-clock';

  const onlineEl = document.createElement('div');
  onlineEl.className = 'hud-online';
  onlineEl.textContent = '🍵 1 đang ngồi';

  const walletBadge = document.createElement('div');
  walletBadge.className = 'hud-wallet';
  walletBadge.textContent = '🪙 0 xu · 🔥 0 ngày';

  const weatherBadge = document.createElement('div');
  weatherBadge.className = 'hud-weather';
  weatherBadge.textContent = '🍂 Thu vàng phố cổ';
  weatherBadge.title = 'Bấm để đổi thời tiết quán';

  topBar.append(clock, onlineEl, walletBadge, weatherBadge);

  // Topbar phải: Panel tuần trà
  const roundPanel = document.createElement('div');
  roundPanel.className = 'hud-round';
  const meta = document.createElement('div');
  meta.className = 'meta';
  const topicEl = document.createElement('div');
  topicEl.className = 'topic';
  const bar = document.createElement('div');
  bar.className = 'bar';
  const fill = document.createElement('div');
  bar.append(fill);
  roundPanel.append(meta, topicEl, bar);

  // Các nút menu phụ: 5 Hub chính gọn gàng, thẩm mỹ, không đè nút
  const sideButtons = document.createElement('div');
  sideButtons.className = 'hud-side-buttons';

  const hubShopBtn = document.createElement('button');
  hubShopBtn.className = 'hud-side-btn';
  hubShopBtn.type = 'button';
  hubShopBtn.innerHTML = '<span>🏪</span> Quán Nước';

  const hubGamesBtn = document.createElement('button');
  hubGamesBtn.className = 'hud-side-btn';
  hubGamesBtn.type = 'button';
  hubGamesBtn.innerHTML = '<span>🎮</span> Giải Trí';

  const hubProgressBtn = document.createElement('button');
  hubProgressBtn.className = 'hud-side-btn';
  hubProgressBtn.type = 'button';
  hubProgressBtn.innerHTML = '<span>🎫</span> Khách Quen';

  const hubWorldBtn = document.createElement('button');
  hubWorldBtn.className = 'hud-side-btn';
  hubWorldBtn.type = 'button';
  hubWorldBtn.innerHTML = '<span>🌍</span> Không Gian';

  const hubUtilBtn = document.createElement('button');
  hubUtilBtn.className = 'hud-side-btn';
  hubUtilBtn.type = 'button';
  hubUtilBtn.innerHTML = '<span>💖</span> Tiện Ích';

  sideButtons.append(hubShopBtn, hubGamesBtn, hubProgressBtn, hubWorldBtn, hubUtilBtn);

  // ---------- Modal Đổi thời tiết vỉa hè ----------
  const weatherModal = document.createElement('div');
  weatherModal.className = 'stories-modal';
  weatherModal.hidden = true;

  const weatherCard = document.createElement('div');
  weatherCard.className = 'stories-card';

  const weatherHeader = document.createElement('div');
  weatherHeader.className = 'stories-header';
  const weatherTitle = document.createElement('h3');
  weatherTitle.textContent = '🌦️ Không khí & Thời tiết vỉa hè';
  const closeWeatherBtn = document.createElement('button');
  closeWeatherBtn.className = 'stories-close';
  closeWeatherBtn.textContent = '✕';
  weatherHeader.append(weatherTitle, closeWeatherBtn);

  const weatherNotice = document.createElement('div');
  weatherNotice.className = 'stories-notice';
  weatherNotice.textContent = 'Chọn không khí yêu thích hoặc để quán tự động luân chuyển theo tuần trà:';

  const weatherGrid = document.createElement('div');
  weatherGrid.className = 'weather-options-grid';

  let currentWeatherMode: WeatherType | 'auto' = 'auto';
  const weatherOptionButtons: HTMLButtonElement[] = [];

  WEATHER_OPTIONS.forEach((opt) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `weather-opt-btn ${opt.id === currentWeatherMode ? 'active' : ''}`;
    btn.innerHTML = `<span class="weather-opt-emoji">${opt.emoji}</span><span>${opt.label}</span>`;
    btn.addEventListener('click', () => {
      currentWeatherMode = opt.id;
      weatherOptionButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      cb.onWeatherChange?.(opt.id);
      weatherModal.hidden = true;
    });
    weatherOptionButtons.push(btn);
    weatherGrid.append(btn);
  });

  weatherCard.append(weatherHeader, weatherNotice, weatherGrid);
  weatherModal.append(weatherCard);

  weatherBadge.addEventListener('click', () => {
    weatherModal.hidden = false;
  });
  closeWeatherBtn.addEventListener('click', () => {
    weatherModal.hidden = true;
  });
  weatherModal.addEventListener('click', (e) => {
    if (e.target === weatherModal) weatherModal.hidden = true;
  });

  // ---------- Modal Phiếu ngồi / Giữ chỗ khi đổi máy ----------
  const profileModal = document.createElement('div');
  profileModal.className = 'stories-modal';
  profileModal.hidden = true;

  const profileCard = document.createElement('div');
  profileCard.className = 'stories-card profile-card';

  const profileHeader = document.createElement('div');
  profileHeader.className = 'stories-header';
  const profileTitle = document.createElement('h3');
  profileTitle.textContent = 'Phiếu ngồi trà đá 🍵';
  const closeProfileBtn = document.createElement('button');
  closeProfileBtn.className = 'stories-close';
  closeProfileBtn.textContent = '✕';
  profileHeader.append(profileTitle, closeProfileBtn);

  const profileBody = document.createElement('div');
  profileBody.className = 'profile-body';

  profileCard.append(profileHeader, profileBody);
  profileModal.append(profileCard);

  closeProfileBtn.addEventListener('click', () => {
    profileModal.hidden = true;
  });
  profileModal.addEventListener('click', (e) => {
    if (e.target === profileModal) profileModal.hidden = true;
  });

  // ---------- Modal Bảng phấn ----------
  const storiesModal = document.createElement('div');
  storiesModal.className = 'stories-modal';
  storiesModal.hidden = true;

  const storiesContent = document.createElement('div');
  storiesContent.className = 'stories-card';
  const storiesHeader = document.createElement('div');
  storiesHeader.className = 'stories-header';
  const storiesTitle = document.createElement('h3');
  storiesTitle.textContent = 'Bảng phấn quán trà đá 🍵';
  const closeStoriesBtn = document.createElement('button');
  closeStoriesBtn.className = 'stories-close';
  closeStoriesBtn.textContent = '✕';
  storiesHeader.append(storiesTitle, closeStoriesBtn);

  const storiesNotice = document.createElement('div');
  storiesNotice.className = 'stories-notice';
  storiesNotice.textContent =
    '💡 Đây là quán để ngồi cho nhẹ lòng, không thay thế người thân hay chuyên gia.';

  const storiesList = document.createElement('div');
  storiesList.className = 'stories-list';
  storiesContent.append(storiesHeader, storiesNotice, storiesList);
  storiesModal.append(storiesContent);

  closeStoriesBtn.addEventListener('click', () => {
    storiesModal.hidden = true;
  });
  storiesModal.addEventListener('click', (e) => {
    if (e.target === storiesModal) storiesModal.hidden = true;
  });

  // ---------- Modal Bảng xếp hạng Khách quen ----------
  const rankModal = document.createElement('div');
  rankModal.className = 'stories-modal';
  rankModal.hidden = true;

  const rankCard = document.createElement('div');
  rankCard.className = 'stories-card';
  const rankHeader = document.createElement('div');
  rankHeader.className = 'stories-header';
  const rankTitle = document.createElement('h3');
  rankTitle.textContent = 'Khách quen của tuần 🏆';
  const closeRankBtn = document.createElement('button');
  closeRankBtn.className = 'stories-close';
  closeRankBtn.textContent = '✕';
  rankHeader.append(rankTitle, closeRankBtn);

  const rankSub = document.createElement('div');
  rankSub.className = 'stories-notice';
  rankSub.textContent = 'Tuần tính từ 4h sáng thứ Hai (mỗi ngày tối đa 16 tuần trà).';

  const rankList = document.createElement('div');
  rankList.className = 'stories-list';

  rankCard.append(rankHeader, rankSub, rankList);
  rankModal.append(rankCard);

  closeRankBtn.addEventListener('click', () => {
    rankModal.hidden = true;
  });
  rankModal.addEventListener('click', (e) => {
    if (e.target === rankModal) rankModal.hidden = true;
  });

  // ---------- Dock Màn hình TV liên kết YouTube ----------
  const tvDock = document.createElement('div');
  tvDock.className = 'tv-screen-dock tv-mode-pip';

  const tvDockHeader = document.createElement('div');
  tvDockHeader.className = 'tv-dock-header';

  const tvDockActions = document.createElement('div');
  tvDockActions.className = 'tv-dock-actions';

  const cinemaBtn = document.createElement('button');
  cinemaBtn.className = 'tv-dock-btn';
  cinemaBtn.type = 'button';
  cinemaBtn.textContent = '🔲 Rạp chiếu';
  cinemaBtn.title = 'Phóng to xem phim giữa màn hình';

  const pipBtn = document.createElement('button');
  pipBtn.className = 'tv-dock-btn active';
  pipBtn.type = 'button';
  pipBtn.textContent = '📌 Góc nhỏ';
  pipBtn.title = 'Thu nhỏ dạng góc màn hình';

  const openQueueBtn = document.createElement('button');
  openQueueBtn.className = 'tv-dock-btn';
  openQueueBtn.type = 'button';
  openQueueBtn.textContent = '📋 Đặt phim/nhạc';

  tvDockActions.append(cinemaBtn, pipBtn, openQueueBtn);
  tvDockHeader.append(tvDockActions);

  const playerContainer = document.createElement('div');
  playerContainer.className = 'tv-video-wrapper';
  const ytFrameContainer = document.createElement('div');
  ytFrameContainer.id = 'yt-player-target';
  playerContainer.append(ytFrameContainer);

  tvDock.append(tvDockHeader, playerContainer);

  let currentTvMode: '3d' | 'cinema' | 'pip' = 'pip';

  function setTvMode(mode: '3d' | 'cinema' | 'pip'): void {
    currentTvMode = mode;
    tvDock.classList.remove('tv-mode-3d', 'tv-mode-cinema', 'tv-mode-pip', 'hidden');
    cinemaBtn.classList.remove('active');
    pipBtn.classList.remove('active');

    tvDock.style.left = '';
    tvDock.style.top = '';
    tvDock.style.right = '';
    tvDock.style.bottom = '';
    tvDock.style.width = '';
    tvDock.style.height = '';
    tvDock.style.transform = '';

    if (mode === 'cinema') {
      tvDock.classList.add('tv-mode-cinema');
      cinemaBtn.classList.add('active');
    } else {
      tvDock.classList.add('tv-mode-pip');
      pipBtn.classList.add('active');
    }
  }

  if (typeof document !== 'undefined') {
    document.body.append(tvDock);
  }

  cinemaBtn.addEventListener('click', () => setTvMode(currentTvMode === 'cinema' ? 'pip' : 'cinema'));
  pipBtn.addEventListener('click', () => setTvMode('pip'));
  openQueueBtn.addEventListener('click', () => {
    radioModal.hidden = false;
  });

  // ---------- Modal TV & Loa thùng của quán ----------
  const radioModal = document.createElement('div');
  radioModal.className = 'stories-modal';
  radioModal.hidden = true;

  const radioCard = document.createElement('div');
  radioCard.className = 'stories-card radio-card';

  const radioHeader = document.createElement('div');
  radioHeader.className = 'stories-header';
  const radioTitle = document.createElement('h3');
  radioTitle.textContent = '📺 Màn hình TV & Loa quán';
  const closeRadioBtn = document.createElement('button');
  closeRadioBtn.className = 'stories-close';
  closeRadioBtn.textContent = '✕';
  radioHeader.append(radioTitle, closeRadioBtn);

  const radioNotice = document.createElement('div');
  radioNotice.className = 'stories-notice';
  radioNotice.textContent = 'Chiếu phim, hoạt hình hoặc nghe ca nhạc cùng quán. Bấm "Bật âm thanh" để nghe chung.';

  const unmuteBtn = document.createElement('button');
  unmuteBtn.className = 'radio-unmute-btn';
  unmuteBtn.textContent = '🔊 Bật âm thanh TV & Loa';
  unmuteBtn.addEventListener('click', () => {
    cb.onUnmuteRadio();
    unmuteBtn.textContent = '✅ Đang phát âm thanh';
  });
  // Khu vực hiển thị quyền Chủ Quán (Admin) & điều khiển qua bài / dừng TV
  let currentIsPaused = false;

  const adminCardSection = document.createElement('div');
  adminCardSection.className = 'admin-card-section';

  const adminBadgeBar = document.createElement('div');
  adminBadgeBar.className = 'admin-badge-bar';
  const adminStatusText = document.createElement('span');
  adminStatusText.textContent = '👤 Quyền: Khách trong quán';

  const adminLoginBtn = document.createElement('button');
  adminLoginBtn.className = 'tv-preset-chip';
  adminLoginBtn.type = 'button';
  adminLoginBtn.textContent = '🔐 Đăng nhập Chủ Quán';
  adminLoginBtn.addEventListener('click', () => {
    const pass = window.prompt('Nhập mật khẩu Chủ Quán để có quyền qua bài và dừng TV (mặc định: trada2026):');
    if (pass) {
      cb.onAdminAuth?.(pass);
    }
  });

  adminBadgeBar.append(adminStatusText, adminLoginBtn);

  const adminControlsRow = document.createElement('div');
  adminControlsRow.className = 'admin-controls-row';
  adminControlsRow.style.display = 'none';

  const adminSkipBtn = document.createElement('button');
  adminSkipBtn.className = 'admin-action-btn';
  adminSkipBtn.type = 'button';
  adminSkipBtn.textContent = '⏭️ Qua bài tiếp theo';
  adminSkipBtn.addEventListener('click', () => {
    cb.onAdminSkip?.();
  });

  const adminPauseBtn = document.createElement('button');
  adminPauseBtn.className = 'admin-action-btn';
  adminPauseBtn.type = 'button';
  adminPauseBtn.textContent = '⏸️ Tạm dừng cả quán';
  adminPauseBtn.addEventListener('click', () => {
    cb.onAdminPause?.(!currentIsPaused);
  });

  adminControlsRow.append(adminSkipBtn, adminPauseBtn);
  adminCardSection.append(adminBadgeBar, adminControlsRow);


  const modeTitle = document.createElement('div');
  modeTitle.className = 'block-title';
  modeTitle.textContent = 'Vị trí chiếu màn hình:';

  const viewModeRow = document.createElement('div');
  viewModeRow.className = 'tv-quick-presets';

  const dockCinemaBtn = document.createElement('button');
  dockCinemaBtn.type = 'button';
  dockCinemaBtn.className = 'tv-preset-chip';
  dockCinemaBtn.textContent = '🔲 Mở rạp chiếu to (Cinema Mode)';
  dockCinemaBtn.addEventListener('click', () => {
    setTvMode('cinema');
    radioModal.hidden = true;
  });

  const dockPipBtn = document.createElement('button');
  dockPipBtn.type = 'button';
  dockPipBtn.className = 'tv-preset-chip';
  dockPipBtn.textContent = '📌 Ghim TV góc nhỏ (Picture-in-Picture)';
  dockPipBtn.addEventListener('click', () => {
    setTvMode('pip');
    radioModal.hidden = true;
  });

  viewModeRow.append(dockCinemaBtn, dockPipBtn);

  function playUrl(url: string): void {
    let trimmed = url.trim();
    if (!trimmed) return;
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      trimmed = `https://www.youtube.com/watch?v=${trimmed}`;
    }
    const parsed = parseYouTubeUrl(trimmed);
    if (!parsed) {
      toastEl.textContent = 'Link YouTube không đúng định dạng. Hỗ trợ link youtube.com, youtu.be, shorts hoặc mã video.';
      toastEl.classList.add('show');
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 3000);
      return;
    }

    setTvMode('pip');
    cb.onPlayDirect?.(parsed.videoId, parsed.startSec);
    cb.onQueueSong(trimmed);

    radioModal.hidden = true;
    toastEl.textContent = '🎬 Đang phát video trên TV quán!';
    toastEl.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 2500);
  }

  const presetTitle = document.createElement('div');
  presetTitle.className = 'block-title';
  presetTitle.textContent = 'Gợi ý nhanh (nhấp để chiếu ngay):';

  const quickPresets = document.createElement('div');
  quickPresets.className = 'tv-quick-presets';
  const presets = [
    { label: '🎬 Hoạt hình ngắn', url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
    { label: '🍿 Hài kịch vỉa hè', url: 'https://www.youtube.com/watch?v=ScMzIvxBSi4' },
    { label: '☕ Lofi Chill', url: 'https://www.youtube.com/watch?v=5qap5aO4i9A' },
  ];
  presets.forEach((p) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'tv-preset-chip';
    chip.textContent = p.label;
    chip.addEventListener('click', () => {
      songInput.value = p.url;
      playUrl(p.url);
    });
    quickPresets.append(chip);
  });

  const queueForm = document.createElement('form');
  queueForm.className = 'recover-form';
  const songInput = document.createElement('input');
  songInput.type = 'text';
  songInput.placeholder = 'Dán link YouTube phim hoặc ca nhạc (youtu.be/...)';
  songInput.required = true;
  const songSubmit = document.createElement('button');
  songSubmit.type = 'submit';
  songSubmit.textContent = 'Chiếu lên TV (1 xu)';
  queueForm.append(songInput, songSubmit);

  queueForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (songInput.value.trim()) {
      playUrl(songInput.value.trim());
      songInput.value = '';
    }
  });

  const queueTitle = document.createElement('div');
  queueTitle.className = 'block-title';
  queueTitle.textContent = 'Hàng chờ trình chiếu:';

  const queueList = document.createElement('div');
  queueList.className = 'stories-list radio-queue-list';

  radioCard.append(
    radioHeader,
    radioNotice,
    unmuteBtn,
    adminCardSection,
    modeTitle,
    viewModeRow,
    presetTitle,
    quickPresets,
    queueForm,
    queueTitle,
    queueList,
  );
  radioModal.append(radioCard);

  openQueueBtn.addEventListener('click', () => {
    radioModal.hidden = false;
  });

  closeRadioBtn.addEventListener('click', () => {
    radioModal.hidden = true;
  });
  radioModal.addEventListener('click', (e) => {
    if (e.target === radioModal) radioModal.hidden = true;
  });

  // ---------- Modal Âm thanh môi trường ----------
  const soundModal = document.createElement('div');
  soundModal.className = 'stories-modal';
  soundModal.hidden = true;

  const soundCard = document.createElement('div');
  soundCard.className = 'stories-card';
  const soundHeader = document.createElement('div');
  soundHeader.className = 'stories-header';
  const soundTitle = document.createElement('h3');
  soundTitle.textContent = 'Âm thanh vỉa hè 🎧';
  const closeSoundBtn = document.createElement('button');
  closeSoundBtn.className = 'stories-close';
  closeSoundBtn.textContent = '✕';
  soundHeader.append(soundTitle, closeSoundBtn);

  const soundNotice = document.createElement('div');
  soundNotice.className = 'stories-notice';
  soundNotice.textContent = 'Bấm "Bật âm thanh" để hoà mình vào không khí phố phường Hà Nội / Sài Gòn.';

  const soundBody = document.createElement('div');
  soundBody.className = 'sound-body';

  const makeSlider = (label: string, initial: number, onChange: (v: number) => void) => {
    const row = document.createElement('div');
    row.className = 'sound-row';
    const lbl = document.createElement('div');
    lbl.className = 'sound-lbl';
    lbl.textContent = label;
    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = '1';
    input.step = '0.05';
    input.value = String(initial);
    input.addEventListener('input', () => onChange(parseFloat(input.value)));
    row.append(lbl, input);
    return row;
  };

  closeSoundBtn.addEventListener('click', () => {
    soundModal.hidden = true;
  });
  soundModal.addEventListener('click', (e) => {
    if (e.target === soundModal) soundModal.hidden = true;
  });

  soundBody.append(
    makeSlider('🚗 Xe cộ phố phường', 0.3, (v) => cb.onVolumeChange('traffic', v)),
    makeSlider('🌀 Quạt máy vỉa hè', 0.2, (v) => cb.onVolumeChange('fan', v)),
    makeSlider('🌧️ Mưa rào', 0, (v) => cb.onVolumeChange('rain', v)),
    makeSlider('🗣️ Tiếng rao xa xa', 0.2, (v) => cb.onVolumeChange('streetVendor', v)),
  );

  soundCard.append(soundHeader, soundNotice, soundBody);
  soundModal.append(soundCard);

  // ---------- Modal Quầy Hàng Bà Ba ----------
  const bossModal = document.createElement('div');
  bossModal.className = 'stories-modal';
  bossModal.hidden = true;

  const bossCard = document.createElement('div');
  bossCard.className = 'stories-card boss-card';

  const bossHeader = document.createElement('div');
  bossHeader.className = 'stories-header';
  const bossTitle = document.createElement('h3');
  bossTitle.textContent = '🏪 Quầy Trà Đá Bà Ba';
  const closeBossBtn = document.createElement('button');
  closeBossBtn.className = 'stories-close';
  closeBossBtn.textContent = '✕';
  bossHeader.append(bossTitle, closeBossBtn);

  const bossNotice = document.createElement('div');
  bossNotice.className = 'stories-notice boss-intro';
  bossNotice.textContent =
    '🍵 "Khách vào quán uống nước nhé! Quán u có đủ cả: thuốc lá Thăng Long, kẹo lạc, hạt dưa, thuốc lào Tiên Lãng... Mua xong dùng được ngay nhé!"';

  const bossItemsContainer = document.createElement('div');
  bossItemsContainer.className = 'boss-items-list';

  let hasCigarettes = typeof localStorage !== 'undefined' && localStorage.getItem('tdvh_has_cig') === '1';

  function renderBossItems(): void {
    bossItemsContainer.innerHTML = '';

    // 1. Thuốc lá Thăng Long
    const cigItem = document.createElement('div');
    cigItem.className = 'boss-item-card';
    cigItem.innerHTML = `
      <div class="boss-item-icon">🚬</div>
      <div class="boss-item-details">
        <div class="boss-item-title">Bao thuốc lá Thăng Long vỉa hè</div>
        <div class="boss-item-desc">Hương vị mộc mạc đặc trưng phố phường Hà Nội. Mở khoá emoji & hành động 🚬 Hút thuốc trên thanh công cụ.</div>
        <div class="boss-item-status">${hasCigarettes ? '✅ Đã có thuốc lá trong túi' : '🪙 Giá: 1 xu (hoặc Cho mua chịu)'}</div>
      </div>
      <div class="boss-item-actions">
        ${
          hasCigarettes
            ? '<button type="button" class="boss-action-btn smoke-now-btn">🚬 Hút thuốc ngay</button>'
            : '<button type="button" class="boss-action-btn buy-cig-btn">Mua 1 bao (1 xu)</button>'
        }
      </div>
    `;

    cigItem.querySelector('.buy-cig-btn')?.addEventListener('click', () => {
      hasCigarettes = true;
      if (typeof localStorage !== 'undefined') localStorage.setItem('tdvh_has_cig', '1');
      renderBossItems();
      toastEl.textContent = 'Bà chủ rút 1 điếu Thăng Long thơm lừng cho chú! Hãy bấm nút 🚬 để hút thuốc.';
      toastEl.classList.add('show');
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 3000);
      cb.onReact('smoke');
    });

    cigItem.querySelector('.smoke-now-btn')?.addEventListener('click', () => {
      cb.onReact('smoke');
      bossModal.hidden = true;
      toastEl.textContent = 'Đang rít thuốc lá Thăng Long…';
      toastEl.classList.add('show');
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 2000);
    });

    // 2. Làm bi điếu cày thuốc lào Tiên Lãng
    const pipeItem = document.createElement('div');
    pipeItem.className = 'boss-item-card';
    pipeItem.innerHTML = `
      <div class="boss-item-icon">💨</div>
      <div class="boss-item-details">
        <div class="boss-item-title">Làm bi Điếu cày (Thuốc lào Tiên Lãng)</div>
        <div class="boss-item-desc">Rít một hơi ro ro ro... tạch! Khói mù mịt thơm lừng ngút ngàn, mắt lim dim ngắm phố.</div>
        <div class="boss-item-status">🆓 Miễn phí quán mời</div>
      </div>
      <div class="boss-item-actions">
        <button type="button" class="boss-action-btn pipe-btn">Bắn 1 bi ngay 💨</button>
      </div>
    `;
    pipeItem.querySelector('.pipe-btn')?.addEventListener('click', () => {
      cb.onReact('smoke');
      bossModal.hidden = true;
      toastEl.textContent = 'Tiếng điếu cày rít ro ro ro... tạch! Khói tỏa mù mịt phê chữ ê kéo dài.';
      toastEl.classList.add('show');
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 2500);
    });

    // 3. Đĩa hạt dưa đỏ
    const seedsItem = document.createElement('div');
    seedsItem.className = 'boss-item-card';
    seedsItem.innerHTML = `
      <div class="boss-item-icon">🥜</div>
      <div class="boss-item-details">
        <div class="boss-item-title">Đĩa Hạt dưa đỏ / Hướng dương</div>
        <div class="boss-item-desc">Cắn tí tách vui tai trong lúc ngồi hóng gió buôn chuyện. Mở khoá emoji 🥜 Cắn hạt dưa.</div>
        <div class="boss-item-status">🪙 Giá: 1 xu</div>
      </div>
      <div class="boss-item-actions">
        <button type="button" class="boss-action-btn seeds-btn">Mua đĩa hạt dưa 🥜</button>
      </div>
    `;
    seedsItem.querySelector('.seeds-btn')?.addEventListener('click', () => {
      cb.onReact('seeds');
      bossModal.hidden = true;
      toastEl.textContent = 'Cắn hạt dưa tách tách vui tai ghê!';
      toastEl.classList.add('show');
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 2000);
    });

    // 4. Thanh kẹo lạc / Kẹo dồi
    const candyItem = document.createElement('div');
    candyItem.className = 'boss-item-card';
    candyItem.innerHTML = `
      <div class="boss-item-icon">🍬</div>
      <div class="boss-item-details">
        <div class="boss-item-title">Thanh Kẹo lạc / Kẹo dồi giòn bùi</div>
        <div class="boss-item-desc">Ngọt bùi giòn rụm, nhấp ngụm chè tươi chát ngọt thì đúng điệu. Mở khoá emoji 🍬 Ăn kẹo.</div>
        <div class="boss-item-status">🪙 Giá: 1 xu</div>
      </div>
      <div class="boss-item-actions">
        <button type="button" class="boss-action-btn candy-btn">Mua kẹo lạc 🍬</button>
      </div>
    `;
    candyItem.querySelector('.candy-btn')?.addEventListener('click', () => {
      cb.onReact('candy');
      bossModal.hidden = true;
      toastEl.textContent = 'Kẹo lạc ngọt bùi giòn tan!';
      toastEl.classList.add('show');
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 2000);
    });

    // 5. Xin thêm đá / Châm trà tươi
    const refillItem = document.createElement('div');
    refillItem.className = 'boss-item-card';
    refillItem.innerHTML = `
      <div class="boss-item-icon">🧊</div>
      <div class="boss-item-details">
        <div class="boss-item-title">Xin thêm đá lạnh / Châm trà tươi</div>
        <div class="boss-item-desc">Bà chủ rót đầy lại ly trà đá mát rượi, xua tan cái oi bức cuối ngày.</div>
        <div class="boss-item-status">🆓 Miễn phí</div>
      </div>
      <div class="boss-item-actions">
        <button type="button" class="boss-action-btn refill-btn">Rót đầy ly trà 🧊</button>
      </div>
    `;
    refillItem.querySelector('.refill-btn')?.addEventListener('click', () => {
      bossModal.hidden = true;
      toastEl.textContent = 'Bà chủ châm đầy ấm chè tươi mát lạnh cho bạn!';
      toastEl.classList.add('show');
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 2500);
    });

    bossItemsContainer.append(cigItem, pipeItem, seedsItem, candyItem, refillItem);
  }

  renderBossItems();

  bossCard.append(bossHeader, bossNotice, bossItemsContainer);
  bossModal.append(bossCard);

  closeBossBtn.addEventListener('click', () => {
    bossModal.hidden = true;
  });
  bossModal.addEventListener('click', (e) => {
    if (e.target === bossModal) bossModal.hidden = true;
  });

  // ---------- Action Dock ở đáy khi ngồi ----------
  const actionDock = document.createElement('div');
  actionDock.className = 'hud-dock';
  actionDock.hidden = true;

  // Hàng nút phản ứng
  const reactBar = document.createElement('div');
  reactBar.className = 'hud-react-bar';
  for (const r of REACTIONS) {
    const btn = document.createElement('button');
    btn.className = 'react-btn';
    btn.type = 'button';
    btn.title = r.label;
    btn.textContent = r.emoji;
    btn.addEventListener('click', () => {
      if (r.id === 'smoke' && (!hasCigarettes || localStorage.getItem('tdvh_has_cig') !== '1')) {
        toastEl.textContent = 'Bà chủ: Chú ghé quầy u mua điếu thuốc lá Thăng Long đã nhé!';
        toastEl.classList.add('show');
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 3000);
        bossModal.hidden = false;
        return;
      }
      cb.onReact(r.id);
    });
    reactBar.append(btn);
  }

  // Khung kể chuyện & nút đứng dậy
  const controlsRow = document.createElement('div');
  controlsRow.className = 'hud-controls-row';

  const storyForm = document.createElement('form');
  storyForm.className = 'story-form';
  const storyInput = document.createElement('input');
  storyInput.type = 'text';
  storyInput.maxLength = STORY_MAX;
  storyInput.placeholder = 'Trò chuyện / Góp chuyện (tối đa 80 chữ)…';
  const storySubmit = document.createElement('button');
  storySubmit.type = 'submit';
  storySubmit.textContent = 'Gửi';
  storyForm.append(storyInput, storySubmit);

  storyForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = storyInput.value.trim();
    if (text) {
      cb.onStory(text);
      storyInput.value = '';
      storyInput.focus();
    }
  });

  const standBtn = document.createElement('button');
  standBtn.className = 'dock-action-btn';
  standBtn.style.background = '#4a3b32';
  standBtn.style.color = '#fff';
  standBtn.type = 'button';
  standBtn.textContent = 'Đứng dậy';
  standBtn.addEventListener('click', cb.onStand);

  const treatAllBtn = document.createElement('button');
  treatAllBtn.className = 'dock-action-btn';
  treatAllBtn.style.background = '#ffd166';
  treatAllBtn.style.color = '#1a1410';
  treatAllBtn.type = 'button';
  treatAllBtn.textContent = '🔔 Đãi cả quán';
  treatAllBtn.addEventListener('click', () => {
    cb.onTreatAll?.();
  });

  const rpsBtn = document.createElement('button');
  rpsBtn.className = 'dock-action-btn';
  rpsBtn.style.background = '#2ec4b6';
  rpsBtn.style.color = '#0b131a';
  rpsBtn.type = 'button';
  rpsBtn.textContent = '✊ Oẳn tù tì';
  rpsBtn.addEventListener('click', () => {
    rpsModal.hidden = false;
  });

  controlsRow.append(storyForm, treatAllBtn, rpsBtn, standBtn);
  actionDock.append(reactBar, controlsRow);

  // 1. Modal Bốc Quẻ May Mắn
  const fortuneModal = document.createElement('div');
  fortuneModal.className = 'stories-modal';
  fortuneModal.hidden = true;

  const fortuneCard = document.createElement('div');
  fortuneCard.className = 'stories-card';

  const fortuneHeader = document.createElement('div');
  fortuneHeader.className = 'stories-header';
  const fortuneTitle = document.createElement('h3');
  fortuneTitle.textContent = '🎋 Bốc Quẻ May Mắn Đầu Ngày';
  const closeFortuneBtn = document.createElement('button');
  closeFortuneBtn.className = 'stories-close';
  closeFortuneBtn.textContent = '✕';
  fortuneHeader.append(fortuneTitle, closeFortuneBtn);

  const fortuneNotice = document.createElement('div');
  fortuneNotice.className = 'stories-notice';
  fortuneNotice.textContent = 'Mỗi ngày ghé quán trà đá, hãy lắc ống quẻ tre để nhận lời chúc bình an và may mắn từ Bà Ba.';

  const fortuneDisplay = document.createElement('div');
  fortuneDisplay.className = 'fortune-card-display';
  fortuneDisplay.innerHTML = `
    <div style="font-size: 40px; margin-bottom: 10px;">🎋</div>
    <div style="color: #ffd166; font-weight: 700;">Ống quẻ tre cổ truyền quán Bà Ba</div>
    <div style="color: #bbb; font-size: 13px; margin-top: 4px;">Nhấp nút bên dưới để lắc quẻ chiêm nghiệm hôm nay</div>
  `;

  const shakeFortuneBtn = document.createElement('button');
  shakeFortuneBtn.className = 'radio-unmute-btn';
  shakeFortuneBtn.style.marginTop = '12px';
  shakeFortuneBtn.textContent = '🎋 Lắc ống bốc quẻ ngay';
  shakeFortuneBtn.addEventListener('click', () => {
    const f = getRandomFortune();
    fortuneDisplay.innerHTML = `
      <div class="fortune-rank-badge">✨ Quẻ ${f.rank} ✨</div>
      <div class="fortune-title">${f.title}</div>
      <div class="fortune-poem">
        ${f.poem.map((line) => `<div>${line}</div>`).join('')}
      </div>
      <div class="fortune-meaning">💡 <b>Lời bình:</b> ${f.meaning}</div>
      <div style="margin-top: 12px; font-size: 13px; color: #ffd166;">🪙 Bà Ba tặng bạn 1 đồng tiền lẻ may mắn ngày mới!</div>
    `;
    cb.onClaimCoins?.(1, 'fortune');

    shakeFortuneBtn.textContent = '🎋 Lắc lại quẻ khác';
  });

  fortuneCard.append(fortuneHeader, fortuneNotice, fortuneDisplay, shakeFortuneBtn);
  fortuneModal.append(fortuneCard);
  closeFortuneBtn.addEventListener('click', () => (fortuneModal.hidden = true));
  fortuneModal.addEventListener('click', (e) => {
    if (e.target === fortuneModal) fortuneModal.hidden = true;
  });

  // 2. Modal Hòm Thư Người Lạ
  const letterModal = document.createElement('div');
  letterModal.className = 'stories-modal';
  letterModal.hidden = true;

  const letterCard = document.createElement('div');
  letterCard.className = 'stories-card';

  const letterHeader = document.createElement('div');
  letterHeader.className = 'stories-header';
  const letterTitle = document.createElement('h3');
  letterTitle.textContent = '💌 Hòm Thư Người Lạ Vỉa Hè';
  const closeLetterBtn = document.createElement('button');
  closeLetterBtn.className = 'stories-close';
  closeLetterBtn.textContent = '✕';
  letterHeader.append(letterTitle, closeLetterBtn);

  const letterNotice = document.createElement('div');
  letterNotice.className = 'stories-notice';
  letterNotice.textContent = 'Gửi gắm một lời tâm sự hoặc rút một lá thư bất kỳ từ một người lạ từng ghé quán.';

  const drawLetterBox = document.createElement('div');
  drawLetterBox.className = 'vintage-letter-card';
  drawLetterBox.innerHTML = '<i>Chưa mở thư nào. Nhấp nút bên dưới để rút một lá thư ngẫu nhiên từ hòm thư quán.</i>';

  const drawBtn = document.createElement('button');
  drawBtn.className = 'radio-unmute-btn';
  drawBtn.textContent = '📩 Rút một lá thư người lạ';
  drawBtn.addEventListener('click', () => {
    cb.onDrawLetter?.();
  });

  const letterForm = document.createElement('form');
  letterForm.className = 'recover-form';
  letterForm.style.marginTop = '16px';
  const letterInput = document.createElement('textarea');
  letterInput.rows = 3;
  letterInput.maxLength = 400;
  letterInput.placeholder = 'Viết vài dòng tâm sự gửi người lạ ghé quán sau này…';
  letterInput.style.cssText =
    'width: 100%; border-radius: 8px; padding: 10px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); color: #fff; font-family: inherit; resize: none; margin-bottom: 8px;';
  const letterSubmit = document.createElement('button');
  letterSubmit.type = 'submit';
  letterSubmit.textContent = 'Bỏ thư vào hòm 💌';
  letterForm.append(letterInput, letterSubmit);

  letterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (letterInput.value.trim()) {
      cb.onPostLetter?.(letterInput.value.trim());
      letterInput.value = '';
    }
  });

  letterCard.append(letterHeader, letterNotice, drawLetterBox, drawBtn, letterForm);
  letterModal.append(letterCard);
  closeLetterBtn.addEventListener('click', () => (letterModal.hidden = true));
  letterModal.addEventListener('click', (e) => {
    if (e.target === letterModal) letterModal.hidden = true;
  });

  // 3. Modal Sổ Lưu Bút
  const guestbookModal = document.createElement('div');
  guestbookModal.className = 'stories-modal';
  guestbookModal.hidden = true;

  const guestbookCard = document.createElement('div');
  guestbookCard.className = 'stories-card';

  const guestbookHeader = document.createElement('div');
  guestbookHeader.className = 'stories-header';
  const guestbookTitle = document.createElement('h3');
  guestbookTitle.textContent = '📖 Sổ Lưu Bút Quán Trà';
  const closeGuestbookBtn = document.createElement('button');
  closeGuestbookBtn.className = 'stories-close';
  closeGuestbookBtn.textContent = '✕';
  guestbookHeader.append(guestbookTitle, closeGuestbookBtn);

  const guestbookNotice = document.createElement('div');
  guestbookNotice.className = 'stories-notice';
  guestbookNotice.textContent = 'Để lại chữ ký và đôi dòng lưu niệm khi ghé quán trà đá chiều nay:';

  const guestbookList = document.createElement('div');
  guestbookList.className = 'stories-list';
  guestbookList.style.maxHeight = '35vh';

  const guestbookForm = document.createElement('form');
  guestbookForm.className = 'recover-form';
  const gbInput = document.createElement('input');
  gbInput.type = 'text';
  gbInput.maxLength = 100;
  gbInput.placeholder = 'Viết lời nhắn lưu bút (ví dụ: Trà ngon, chiều Hà Nội mát quá)…';
  const gbSubmit = document.createElement('button');
  gbSubmit.type = 'submit';
  gbSubmit.textContent = 'Ký tên ✍️';
  guestbookForm.append(gbInput, gbSubmit);

  guestbookForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (gbInput.value.trim()) {
      cb.onSignGuestbook?.(gbInput.value.trim());
      gbInput.value = '';
    }
  });

  guestbookCard.append(guestbookHeader, guestbookNotice, guestbookList, guestbookForm);
  guestbookModal.append(guestbookCard);
  closeGuestbookBtn.addEventListener('click', () => (guestbookModal.hidden = true));
  guestbookModal.addEventListener('click', (e) => {
    if (e.target === guestbookModal) guestbookModal.hidden = true;
  });

  // 4. Modal Bàn Cờ Tướng Vỉa Hè
  const xiangqiModal = document.createElement('div');
  xiangqiModal.className = 'stories-modal';
  xiangqiModal.hidden = true;

  const xiangqiCard = document.createElement('div');
  xiangqiCard.className = 'stories-card';

  const xiangqiHeader = document.createElement('div');
  xiangqiHeader.className = 'stories-header';
  const xiangqiTitle = document.createElement('h3');
  xiangqiTitle.textContent = '♟️ Bàn Cờ Tướng Vỉa Hè';
  const closeXiangqiBtn = document.createElement('button');
  closeXiangqiBtn.className = 'stories-close';
  closeXiangqiBtn.textContent = '✕';
  xiangqiHeader.append(xiangqiTitle, closeXiangqiBtn);

  const xiangqiNotice = document.createElement('div');
  xiangqiNotice.className = 'stories-notice';
  xiangqiNotice.textContent = 'Các thế cờ tàn vỉa hè kinh điển của các kỳ thủ phố cổ. Ngồi nhâm nhi ngụm trà tìm nước phá cờ.';

  const puzzleContainer = document.createElement('div');
  puzzleContainer.style.display = 'flex';
  puzzleContainer.style.flexDirection = 'column';
  puzzleContainer.style.gap = '12px';

  XIANGQI_PUZZLES.forEach((p, idx) => {
    const pCard = document.createElement('div');
    pCard.style.cssText =
      'background: rgba(255,255,255,0.06); border: 1px solid rgba(224,160,42,0.3); border-radius: 10px; padding: 12px;';
    pCard.innerHTML = `
      <div style="font-weight: 700; color: #ffd166; font-size: 15px; margin-bottom: 4px;">#${idx + 1}. ${p.title}</div>
      <div style="font-size: 13px; color: #ddd; margin-bottom: 8px;">${p.description}</div>
      <div style="background: rgba(0,0,0,0.3); border-radius: 6px; padding: 8px; font-size: 13px; color: #2ec4b6;">💡 <b>Gợi ý nước đi:</b> ${p.hint}</div>
    `;
    puzzleContainer.append(pCard);
  });

  let liveChessGameId: string | null = null;
  let currentChessTurn: 'red' | 'black' = 'red';
  let myChessColor: 'red' | 'black' = 'red';
  let chessBoardState: string[][] = getInitialXiangqiBoard();
  let selectedChessSquare: [number, number] | null = null;

  // Bàn cờ vỉa hè cố định: 2 ghế s15 (Đỏ) / s16 (Đen). Server giữ thế cờ, client chỉ hiển thị.
  // Người không ngồi 2 ghế đó chỉ được xem (tableMyColor = null).
  let tableMyColor: 'red' | 'black' | null = null;
  let tableRedName: string | null = null;
  let tableBlackName: string | null = null;
  let tableWinner: 'red' | 'black' | null = null;
  let tableLastMove: { from: [number, number]; to: [number, number] } | null = null;
  const isTableMode = (): boolean => liveChessGameId === null;

  const chessToast = (text: string): void => {
    toastEl.textContent = text;
    toastEl.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 2200);
  };

  const liveChessHeader = document.createElement('div');
  liveChessHeader.style.cssText =
    'display: flex; justify-content: space-between; align-items: center; gap: 8px; background: rgba(0,0,0,0.3); padding: 8px 12px; border-radius: 8px; margin-bottom: 8px; font-size: 13px; font-weight: 700;';
  const chessInfo = document.createElement('div');
  chessInfo.style.cssText = 'display: flex; flex-direction: column; gap: 3px;';
  const chessPlayersLine = document.createElement('div');
  const chessStatusLine = document.createElement('div');
  chessInfo.append(chessPlayersLine, chessStatusLine);
  const resetChessBtn = document.createElement('button');
  resetChessBtn.type = 'button';
  resetChessBtn.className = 'boss-action-btn';
  resetChessBtn.style.cssText = 'padding: 4px 10px; font-size: 12px; white-space: nowrap;';
  resetChessBtn.textContent = 'Ván mới 🔄';
  liveChessHeader.append(chessInfo, resetChessBtn);

  /** Tạo span tô màu, tên người dùng đi qua textContent nên không cần escape HTML. */
  function colored(text: string, color: string): HTMLSpanElement {
    const sp = document.createElement('span');
    sp.style.color = color;
    sp.textContent = text;
    return sp;
  }

  function renderChessHeader(): void {
    chessPlayersLine.replaceChildren();
    chessStatusLine.replaceChildren();
    if (isTableMode()) {
      chessPlayersLine.append(
        colored(`🔴 ${tableRedName ?? 'Ghế trống'}`, '#ff6b6b'),
        document.createTextNode('  vs  '),
        colored(`⚫ ${tableBlackName ?? 'Ghế trống'}`, '#e8e8e8'),
      );
      const full = tableRedName !== null && tableBlackName !== null;
      let status: HTMLSpanElement;
      if (tableWinner) {
        status = colored(`🏆 Bên ${tableWinner === 'red' ? 'Đỏ' : 'Đen'} thắng!`, '#ffd166');
      } else if (!full) {
        status = colored('Chờ đủ 2 người ngồi vào 2 ghế cạnh bàn cờ…', '#aaa');
      } else if (tableMyColor === currentChessTurn) {
        status = colored('👉 LƯỢT BẠN', '#2ec4b6');
      } else {
        status = colored(`Lượt bên ${currentChessTurn === 'red' ? 'Đỏ' : 'Đen'}`, '#ddd');
      }
      const role = tableMyColor
        ? colored(` · Bạn cầm quân ${tableMyColor === 'red' ? 'ĐỎ' : 'ĐEN'}`, '#ffd166')
        : colored(' · 👀 Bạn đang xem', '#9ad1ff');
      chessStatusLine.append(status, role);
      resetChessBtn.style.display = tableMyColor ? '' : 'none';
    } else {
      const isMyTurn = currentChessTurn === myChessColor;
      chessPlayersLine.append(
        colored(`Bạn là ${myChessColor === 'red' ? 'ĐỎ' : 'ĐEN'}`, myChessColor === 'red' ? '#ff6b6b' : '#e8e8e8'),
      );
      chessStatusLine.append(
        isMyTurn ? colored('👉 LƯỢT BẠN', '#2ec4b6') : colored('Chờ đối thủ…', '#aaa'),
      );
      resetChessBtn.style.display = '';
    }
  }

  const chessBoardGrid = document.createElement('div');
  chessBoardGrid.className = 'xiangqi-board-grid';
  chessBoardGrid.style.cssText =
    'display: grid; grid-template-columns: repeat(9, 1fr); gap: 2px; background: #cbb28b; border: 3px solid #6b4c35; border-radius: 8px; padding: 4px; max-width: 360px; margin: 8px auto; user-select: none;';

  function renderChessBoard(): void {
    chessBoardGrid.innerHTML = '';
    renderChessHeader();
    const spectating = isTableMode() && tableMyColor === null;

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const sq = document.createElement('div');
        const piece = chessBoardState[r]?.[c] ?? '';
        const isSelected = selectedChessSquare && selectedChessSquare[0] === r && selectedChessSquare[1] === c;
        const isRiver = r === 4 || r === 5;
        const lm = isTableMode() ? tableLastMove : null;
        const isLastMove =
          lm !== null && ((lm.from[0] === r && lm.from[1] === c) || (lm.to[0] === r && lm.to[1] === c));

        sq.style.cssText = `
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 800;
          border: 1px solid rgba(107, 76, 53, 0.4);
          cursor: ${spectating ? 'default' : 'pointer'};
          background: ${isSelected ? 'rgba(255, 209, 102, 0.6)' : isLastMove ? 'rgba(46, 196, 182, 0.35)' : isRiver ? '#b5cbaf' : 'transparent'};
          border-radius: 4px;
        `;

        if (piece) {
          const isRed = piece.startsWith('r');
          const char = XIANGQI_PIECE_NAMES[piece] ?? piece;
          sq.innerHTML = `<span style="display: inline-flex; width: 26px; height: 26px; align-items: center; justify-content: center; border-radius: 999px; background: ${isRed ? '#fff0f0' : '#222'}; color: ${isRed ? '#d32f2f' : '#fff'}; border: 2px solid ${isRed ? '#d32f2f' : '#555'}; box-shadow: 0 2px 4px rgba(0,0,0,0.3); font-size: 14px;">${char}</span>`;
        }

        sq.addEventListener('click', () => {
          // Bàn cờ vỉa hè: người xem không được chạm quân, người chơi chỉ đi khi đủ người và đến lượt
          if (isTableMode()) {
            if (!tableMyColor) {
              chessToast('👀 Bạn đang xem cờ. Ngồi vào 1 trong 2 ghế cạnh bàn cờ để chơi nhé.');
              return;
            }
            if (tableRedName === null || tableBlackName === null) {
              chessToast('Chờ đủ 2 người ngồi vào bàn cờ đã.');
              return;
            }
            if (tableWinner) {
              chessToast('Ván cờ đã kết thúc, bấm "Ván mới 🔄" để chơi tiếp.');
              return;
            }
          }
          const myColor = isTableMode() ? tableMyColor : myChessColor;
          const enforce = isTableMode() || liveChessGameId !== null;

          if (!selectedChessSquare) {
            if (piece) {
              const pieceColor = piece.startsWith('r') ? 'red' : 'black';
              if (enforce && pieceColor !== myColor) {
                chessToast(`Bạn chỉ được cầm quân ${myColor === 'red' ? 'Đỏ' : 'Đen'}!`);
                return;
              }
              if (enforce && currentChessTurn !== myColor) {
                chessToast('Chưa đến lượt của bạn! Đang chờ đối thủ đi nước.');
                return;
              }
              selectedChessSquare = [r, c];
              renderChessBoard();
            }
          } else {
            const [fr, fc] = selectedChessSquare;
            if (fr === r && fc === c) {
              selectedChessSquare = null;
              renderChessBoard();
              return;
            }
            const movingPiece = chessBoardState[fr]?.[fc] ?? '';
            if (!isLegalXiangqiMove(chessBoardState, [fr, fc], [r, c], movingPiece, currentChessTurn)) {
              chessToast('Nước đi không đúng luật Cờ Tướng vỉa hè!');
              selectedChessSquare = null;
              renderChessBoard();
              return;
            }
            selectedChessSquare = null;

            if (isTableMode()) {
              // Không tự đi trước: chờ server xác nhận rồi phát thế cờ mới cho cả quán
              renderChessBoard();
              cb.onChessTableMove?.([fr, fc], [r, c]);
              return;
            }

            chessBoardState[r]![c] = movingPiece;
            chessBoardState[fr]![fc] = '';
            currentChessTurn = currentChessTurn === 'red' ? 'black' : 'red';
            renderChessBoard();

            if (liveChessGameId) {
              cb.onChessMove?.(liveChessGameId, [fr, fc], [r, c], movingPiece);
            }
          }
        });

        chessBoardGrid.append(sq);
      }
    }
  }

  resetChessBtn.addEventListener('click', () => {
    if (isTableMode()) {
      if (tableMyColor) cb.onChessTableReset?.();
      return;
    }
    chessBoardState = getInitialXiangqiBoard();
    currentChessTurn = 'red';
    selectedChessSquare = null;
    renderChessBoard();
  });

  renderChessBoard();

  xiangqiCard.append(xiangqiHeader, xiangqiNotice, liveChessHeader, chessBoardGrid, puzzleContainer);
  xiangqiModal.append(xiangqiCard);
  closeXiangqiBtn.addEventListener('click', () => (xiangqiModal.hidden = true));
  xiangqiModal.addEventListener('click', (e) => {
    if (e.target === xiangqiModal) xiangqiModal.hidden = true;
  });
  // 5. Modal Oẳn Tù Tì Vỉa Hè
  const rpsModal = document.createElement('div');
  rpsModal.className = 'stories-modal';
  rpsModal.hidden = true;

  const rpsCard = document.createElement('div');
  rpsCard.className = 'stories-card';

  const rpsHeader = document.createElement('div');
  rpsHeader.className = 'stories-header';
  const rpsTitle = document.createElement('h3');
  rpsTitle.textContent = '✊ Oẳn Tù Tì Vỉa Hè';
  const closeRpsBtn = document.createElement('button');
  closeRpsBtn.className = 'stories-close';
  closeRpsBtn.textContent = '✕';
  rpsHeader.append(rpsTitle, closeRpsBtn);

  let currentRpsGameId: string | null = null;
  const rpsNotice = document.createElement('div');
  rpsNotice.className = 'stories-notice';
  rpsNotice.textContent = 'Chọn Kéo - Búa - Bao để so tài vỉa hè:';

  const rpsChoicesRow = document.createElement('div');
  rpsChoicesRow.className = 'rps-choices-row';

  RPS_CHOICES.forEach((c) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rps-btn';
    btn.innerHTML = `<span class="rps-btn-emoji">${c.emoji}</span><span>${c.name}</span>`;
    btn.addEventListener('click', () => {
      if (currentRpsGameId) {
        cb.onRpsMove?.(currentRpsGameId, c.id);
        rpsNotice.textContent = `Bạn đã ra ${c.name} ${c.emoji}. Đang đợi đối phương chọn...`;
      } else {
        // Nếu tự chơi / không có gameId: bốc ngẫu nhiên máy để giải trí tức thì
        const opp = RPS_CHOICES[Math.floor(Math.random() * RPS_CHOICES.length)]!;
        const win = c.id === opp.id ? 'draw' : (c.id === 'rock' && opp.id === 'scissors') || (c.id === 'scissors' && opp.id === 'paper') || (c.id === 'paper' && opp.id === 'rock') ? 'win' : 'lose';
        rpsResultBox.style.display = 'block';
        rpsResultBox.innerHTML = `
          <div class="rps-result-title">${win === 'win' ? '🎉 BẠN THẮNG RỒI!' : win === 'lose' ? '😅 BẠN THUA RỒI!' : '🤝 HÒA NHAU!'}</div>
          <div>Bạn ra: <b>${c.name} ${c.emoji}</b> vs Đối thủ: <b>${opp.name} ${opp.emoji}</b></div>
        `;
      }
    });
    rpsChoicesRow.append(btn);
  });

  const rpsResultBox = document.createElement('div');
  rpsResultBox.className = 'rps-result-card';
  rpsResultBox.style.display = 'none';

  rpsCard.append(rpsHeader, rpsNotice, rpsChoicesRow, rpsResultBox);
  rpsModal.append(rpsCard);
  closeRpsBtn.addEventListener('click', () => (rpsModal.hidden = true));
  rpsModal.addEventListener('click', (e) => {
    if (e.target === rpsModal) rpsModal.hidden = true;
  });
  // ---------- Modal Lời Mời Thách Đấu (Khi nhận được lời mời từ bạn khác) ----------
  const gameInviteModal = document.createElement('div');
  gameInviteModal.className = 'stories-modal';
  gameInviteModal.hidden = true;

  const gameInviteCard = document.createElement('div');
  gameInviteCard.className = 'stories-card';
  gameInviteCard.style.maxWidth = '420px';

  const gameInviteHeader = document.createElement('div');
  gameInviteHeader.className = 'stories-header';
  const gameInviteTitle = document.createElement('h3');
  gameInviteTitle.textContent = '⚔️ Lời Mời Thách Đấu Vỉa Hè';
  gameInviteHeader.append(gameInviteTitle);

  const gameInviteBody = document.createElement('div');
  gameInviteBody.style.padding = '14px 0';
  gameInviteBody.style.textAlign = 'center';

  let pendingInviteGameId = '';

  const gameInviteActions = document.createElement('div');
  gameInviteActions.style.display = 'flex';
  gameInviteActions.style.gap = '10px';
  gameInviteActions.style.marginTop = '14px';

  const btnAcceptInvite = document.createElement('button');
  btnAcceptInvite.className = 'boss-action-btn';
  btnAcceptInvite.style.cssText = 'flex: 1; padding: 12px; background: #2ec4b6; color: #0b131a; font-weight: 800;';
  btnAcceptInvite.textContent = '⚔️ Chấp nhận chơi ngay!';

  const btnDeclineInvite = document.createElement('button');
  btnDeclineInvite.className = 'boss-action-btn';
  btnDeclineInvite.style.cssText = 'padding: 12px 18px; background: rgba(255,255,255,0.1); color: #fff;';
  btnDeclineInvite.textContent = '✕ Từ chối';

  btnAcceptInvite.addEventListener('click', () => {
    gameInviteModal.hidden = true;
    if (pendingInviteGameId) {
      cb.onGameAccept?.(pendingInviteGameId);
    }
  });

  btnDeclineInvite.addEventListener('click', () => {
    gameInviteModal.hidden = true;
    if (pendingInviteGameId) {
      cb.onGameDecline?.(pendingInviteGameId);
    }
  });

  gameInviteActions.append(btnAcceptInvite, btnDeclineInvite);
  gameInviteCard.append(gameInviteHeader, gameInviteBody, gameInviteActions);
  gameInviteModal.append(gameInviteCard);



  // Toast
  const toastEl = document.createElement('div');
  toastEl.className = 'hud-toast';
  // Helper tạo modal chuẩn cho 5 Hub chính
  function makeHubModal(title: string, icon: string): { modal: HTMLDivElement; card: HTMLDivElement; body: HTMLDivElement } {
    const modal = document.createElement('div');
    modal.className = 'stories-modal';
    modal.hidden = true;

    const card = document.createElement('div');
    card.className = 'stories-card hub-card';

    const header = document.createElement('div');
    header.className = 'stories-header';
    const hTitle = document.createElement('h3');
    hTitle.innerHTML = `<span>${icon}</span> ${title}`;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'stories-close';
    closeBtn.textContent = '✕';
    header.append(hTitle, closeBtn);

    const body = document.createElement('div');

    card.append(header, body);
    modal.append(card);

    closeBtn.addEventListener('click', () => (modal.hidden = true));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.hidden = true;
    });

    return { modal, card, body };
  }

  // ---------- HUB 1: QUÁN NƯỚC ----------
  const hubShop = makeHubModal('Không Gian Quán Nước', '🏪');
  hubShopBtn.addEventListener('click', () => (hubShop.modal.hidden = false));

  const secBoss = document.createElement('div');
  secBoss.className = 'hub-section-block';
  secBoss.innerHTML = `
    <div class="hub-section-title"><span>👵</span> Quầy Hàng Bà Ba</div>
    <div style="font-size: 13px; color: #ccc; margin-bottom: 8px;">Mua bao thuốc lá Thăng Long, điếu cày Tiên Lãng, kẹo lạc, đĩa hạt dưa…</div>
  `;
  const openBossBtn = document.createElement('button');
  openBossBtn.className = 'boss-action-btn';
  openBossBtn.textContent = 'Ghé quầy bà Ba 🏪';
  openBossBtn.addEventListener('click', () => {
    hubShop.modal.hidden = true;
    bossModal.hidden = false;
  });
  secBoss.append(openBossBtn);

  const secDrinks = document.createElement('div');
  secDrinks.className = 'hub-section-block';
  secDrinks.innerHTML = `
    <div class="hub-section-title"><span>☕</span> Tùy Biến Ly Đồ Uống Của Bạn</div>
    <div style="font-size: 13px; color: #ccc;">Chọn đồ uống để đổi màu ly trà 3D dưới chân ghế của bạn:</div>
  `;
  const drinkGrid = document.createElement('div');
  drinkGrid.className = 'hub-grid-options';
  DRINKS.forEach((d) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'hub-opt-chip';
    chip.innerHTML = `<span>${d.emoji}</span><span>${d.name}</span>`;
    chip.addEventListener('click', () => {
      cb.onSetDrink?.(d.id);
      hubShop.modal.hidden = true;
    });
    drinkGrid.append(chip);
  });
  secDrinks.append(drinkGrid);

  const secShopExtra = document.createElement('div');
  secShopExtra.className = 'hub-section-block';
  secShopExtra.innerHTML = `
    <div class="hub-section-title"><span>🎋</span> Bốc Quẻ, Hòm Thư & Sổ Lưu Bút</div>
    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
      <button type="button" class="boss-action-btn btn-f">🎋 Bốc quẻ may mắn</button>
      <button type="button" class="boss-action-btn btn-l">💌 Hòm thư người lạ</button>
      <button type="button" class="boss-action-btn btn-g">📖 Sổ lưu bút quán</button>
    </div>
  `;
  secShopExtra.querySelector('.btn-f')?.addEventListener('click', () => {
    hubShop.modal.hidden = true;
    fortuneModal.hidden = false;
  });
  secShopExtra.querySelector('.btn-l')?.addEventListener('click', () => {
    hubShop.modal.hidden = true;
    letterModal.hidden = false;
  });
  secShopExtra.querySelector('.btn-g')?.addEventListener('click', () => {
    hubShop.modal.hidden = true;
    cb.onGetGuestbook?.();
    guestbookModal.hidden = false;
  });

  hubShop.body.append(secBoss, secDrinks, secShopExtra);

  // ---------- HUB 2: GIẢI TRÍ VỈA HÈ ----------
  const hubGames = makeHubModal('Góc Giải Trí Vỉa Hè', '🎮');
  hubGamesBtn.addEventListener('click', () => (hubGames.modal.hidden = false));

  const secGamesGrid = document.createElement('div');
  secGamesGrid.className = 'hub-section-block';
  secGamesGrid.innerHTML = `
    <div class="hub-section-title"><span>🎮</span> Chọn Hoạt Động Giải Trí</div>
    <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
      <button type="button" class="boss-action-btn btn-tv" style="text-align: left; padding: 12px;">📺 Màn hình TV: Chiếu phim & Nghe nhạc YouTube cùng cả quán</button>
      <button type="button" class="boss-action-btn btn-xq" style="text-align: left; padding: 12px;">♟️ Bàn cờ tướng: Xem và giải các thế cờ tàn vỉa hè kinh điển</button>
      <button type="button" class="boss-action-btn btn-rps" style="text-align: left; padding: 12px;">✊ Oẳn tù tì: Thách đấu Kéo - Búa - Bao so tài vui vẻ</button>
      <button type="button" class="boss-action-btn btn-ck" style="text-align: left; padding: 12px;">📜 Bảng phấn: Đọc những câu chuyện tâm sự tuần này</button>
    </div>
  `;
  secGamesGrid.querySelector('.btn-tv')?.addEventListener('click', () => {
    hubGames.modal.hidden = true;
    radioModal.hidden = false;
  });
  secGamesGrid.querySelector('.btn-xq')?.addEventListener('click', () => {
    hubGames.modal.hidden = true;
    xiangqiModal.hidden = false;
  });
  secGamesGrid.querySelector('.btn-rps')?.addEventListener('click', () => {
    hubGames.modal.hidden = true;
    rpsModal.hidden = false;
  });
  secGamesGrid.querySelector('.btn-ck')?.addEventListener('click', () => {
    hubGames.modal.hidden = true;
    storiesModal.hidden = false;
  });

  hubGames.body.append(secGamesGrid);
  // ---------- HUB 3: KHÁCH QUEN & TIẾN TRÌNH ----------
  const hubProgress = makeHubModal('Khách Quen & Tiến Trình', '🎫');

  function renderProgressContent(): void {
    hubProgress.body.innerHTML = '';

    const secDaily = document.createElement('div');
    secDaily.className = 'hub-section-block';
    const streakCount = lastProfileData ? lastProfileData.streak : 0;
    const today = new Date().toISOString().slice(0, 10);
    const hasClaimedToday = typeof localStorage !== 'undefined' && localStorage.getItem('tdvh_checkin_date') === today;

    secDaily.innerHTML = `
      <div class="hub-section-title"><span>📅</span> Điểm Danh 7 Ngày Nhận Quà (Daily Streak)</div>
      <div style="font-size: 13px; color: #ccc;">Chuỗi ngày ghé quán hiện tại: <b>🔥 ${streakCount} ngày</b></div>
      <div class="streak-days-grid">
        ${DAILY_STREAK_REWARDS.map((r) => {
          const isDone = streakCount >= r.day;
          return `
            <div class="streak-day-box ${isDone ? 'claimed' : ''}">
              <div style="font-weight: 700;">Ngày ${r.day}</div>
              <div style="color: #ffd166; margin: 4px 0;">+${r.rewardCoins}🪙</div>
              <div style="font-size: 10px; color: #aaa;">${r.itemReward ? '🎁 Quà' : 'Xu'}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    const claimBtn = document.createElement('button');
    claimBtn.className = 'boss-action-btn';
    claimBtn.textContent = hasClaimedToday ? '✅ Hôm nay bạn đã điểm danh' : '🎁 Điểm danh nhận quà hôm nay';
    claimBtn.disabled = hasClaimedToday;
    claimBtn.addEventListener('click', () => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('tdvh_checkin_date', today);
      }
      const curRew = DAILY_STREAK_REWARDS[Math.min(streakCount, 6)] ?? DAILY_STREAK_REWARDS[0]!;
      cb.onClaimCoins?.(curRew.rewardCoins, 'daily_streak');

      claimBtn.textContent = '✅ Đã nhận quà hôm nay!';
      claimBtn.disabled = true;
      toastEl.textContent = '🎉 Điểm danh thành công! Bạn nhận được xu và phần quà ngày mới!';
      toastEl.classList.add('show');
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 2500);
    });
    secDaily.append(claimBtn);

    const totalRounds = lastProfileData ? lastProfileData.totalFullRounds : 0;
    const pLevel = getPatronLevel(totalRounds);
    const secLevel = document.createElement('div');
    secLevel.className = 'hub-section-block';
    secLevel.innerHTML = `
      <div class="hub-section-title"><span>${pLevel.badge}</span> Cấp Bậc: ${pLevel.title}</div>
      <div style="font-size: 13px; color: #ccc; margin-bottom: 6px;">Số tuần trà ngồi đủ: <b>${totalRounds} tuần</b></div>
      <div style="background: rgba(0,0,0,0.3); border-radius: 999px; height: 10px; overflow: hidden; margin-bottom: 6px;">
        <div style="background: ${pLevel.color}; height: 100%; width: ${Math.min(100, (totalRounds / (pLevel.minFullRounds + 20)) * 100)}%;"></div>
      </div>
    `;

    const secAchieve = document.createElement('div');
    secAchieve.className = 'hub-section-block';
    secAchieve.innerHTML = `
      <div class="hub-section-title"><span>🎖️</span> Thành Tựu Vỉa Hè (${ACHIEVEMENTS.length} Huy hiệu)</div>
      <div class="hub-grid-options">
        ${ACHIEVEMENTS.map(
          (a) => `
          <div class="hub-opt-chip">
            <span style="font-size: 20px;">${a.emoji}</span>
            <span style="font-weight: 700;">${a.title}</span>
            <span style="font-size: 11px; color: #aaa;">${a.desc}</span>
            <span style="color: #ffd166; font-size: 11px;">+${a.rewardCoins} xu</span>
          </div>
        `,
        ).join('')}
      </div>
    `;

    const secPets = document.createElement('div');
    secPets.className = 'hub-section-block';
    secPets.innerHTML = `
      <div class="hub-section-title"><span>🐱</span> Thú Cưng Vỉa Hè Quán Trà</div>
      <div class="hub-grid-options">
        ${PETS.map(
          (p) => `
          <div class="hub-opt-chip">
            <span style="font-size: 24px;">${p.emoji}</span>
            <span style="font-weight: 700;">${p.name}</span>
            <span style="font-size: 11px; color: #aaa;">${p.desc}</span>
          </div>
        `,
        ).join('')}
      </div>
    `;

    const secSubBtns = document.createElement('div');
    secSubBtns.className = 'hub-section-block';
    secSubBtns.innerHTML = `
      <div class="hub-section-title"><span>🎫</span> Hồ Sơ & Bảng Khách Quen Tuần</div>
      <div style="display: flex; gap: 8px; margin-top: 6px;">
        <button type="button" class="boss-action-btn btn-open-prof">🎫 Phiếu ngồi & Tủ đồ</button>
        <button type="button" class="boss-action-btn btn-open-lead">🏆 Bảng khách quen tuần</button>
      </div>
    `;
    secSubBtns.querySelector('.btn-open-prof')?.addEventListener('click', () => {
      hubProgress.modal.hidden = true;
      cb.onGetProfile();
      profileModal.hidden = false;
    });
    secSubBtns.querySelector('.btn-open-lead')?.addEventListener('click', () => {
      hubProgress.modal.hidden = true;
      cb.onGetLeaderboard();
      rankModal.hidden = false;
    });

    hubProgress.body.append(secDaily, secLevel, secAchieve, secPets, secSubBtns);
  }

  hubProgressBtn.addEventListener('click', () => {
    renderProgressContent();
    hubProgress.modal.hidden = false;
  });

  // ---------- HUB 4: KHÔNG GIAN, MÙA & GIÁC QUAN ----------
  const hubWorld = makeHubModal('Không Gian, Mùa & Giác Quan', '🌍');
  hubWorldBtn.addEventListener('click', () => (hubWorld.modal.hidden = false));

  const secMaps = document.createElement('div');
  secMaps.className = 'hub-section-block';
  secMaps.innerHTML = `
    <div class="hub-section-title"><span>🏮</span> Đổi Bối Cảnh 3 Miền Đất Nước</div>
    <div style="font-size: 13px; color: #ccc;">Chọn không gian đường phố yêu thích:</div>
  `;
  const mapGrid = document.createElement('div');
  mapGrid.className = 'hub-grid-options';
  MAP_REGIONS.forEach((m) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'hub-opt-chip';
    chip.innerHTML = `<span>${m.emoji}</span><span>${m.name}</span><span style="font-size: 11px; color: #aaa;">${m.subtitle}</span>`;
    chip.addEventListener('click', () => {
      cb.onSetMapRegion?.(m.id);
      hubWorld.modal.hidden = true;
    });
    mapGrid.append(chip);
  });
  secMaps.append(mapGrid);

  const secSeasons = document.createElement('div');
  secSeasons.className = 'hub-section-block';
  secSeasons.innerHTML = `
    <div class="hub-section-title"><span>🌸</span> Hệ Thống 4 Mùa Vỉa Hè</div>
  `;
  const seasonGrid = document.createElement('div');
  seasonGrid.className = 'hub-grid-options';
  SEASONS.forEach((s) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'hub-opt-chip';
    chip.innerHTML = `<span>${s.emoji}</span><span>${s.name}</span><span style="font-size: 11px; color: #aaa;">${s.desc}</span>`;
    chip.addEventListener('click', () => {
      cb.onSetSeason?.(s.id);
      hubWorld.modal.hidden = true;
    });
    seasonGrid.append(chip);
  });
  secSeasons.append(seasonGrid);

  const secFilters = document.createElement('div');
  secFilters.className = 'hub-section-block';
  secFilters.innerHTML = `
    <div class="hub-section-title"><span>🎞️</span> Bộ Lọc Màu Phim Hoài Niệm</div>
  `;
  const filterGrid = document.createElement('div');
  filterGrid.className = 'hub-grid-options';
  COLOR_FILTERS.forEach((f) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'hub-opt-chip';
    chip.innerHTML = `<span>🎨</span><span>${f.name}</span><span style="font-size: 11px; color: #aaa;">${f.desc}</span>`;
    chip.addEventListener('click', () => {
      cb.onSetColorFilter?.(f.id);
      hubWorld.modal.hidden = true;
    });
    filterGrid.append(chip);
  });
  secFilters.append(filterGrid);

  const secSense = document.createElement('div');
  secSense.className = 'hub-section-block';
  secSense.innerHTML = `
    <div class="hub-section-title"><span>👁️</span> Camera & Âm Thanh ASMR</div>
    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
      <button type="button" class="boss-action-btn btn-fpv">👁️ Góc nhìn FPV / Mắt ngồi</button>
      <button type="button" class="boss-action-btn btn-asmr">🔊 Bảng âm thanh ASMR</button>
      <button type="button" class="boss-action-btn btn-battery">🔋 Tiết kiệm pin (30fps)</button>
    </div>
  `;
  secSense.querySelector('.btn-fpv')?.addEventListener('click', () => {
    const isNowFpv = cb.onToggleFpv?.();
    toastEl.textContent = isNowFpv ? '👁️ Đã chuyển sang góc nhìn mắt người ngồi (FPV)!' : '📐 Đã quay lại góc nhìn toàn cảnh!';
    toastEl.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 2000);
    hubWorld.modal.hidden = true;
  });
  secSense.querySelector('.btn-asmr')?.addEventListener('click', () => {
    hubWorld.modal.hidden = true;
    cb.onUnmuteAudio();
    soundModal.hidden = false;
  });
  secSense.querySelector('.btn-battery')?.addEventListener('click', () => {
    const isSave = cb.onToggleBatterySaver?.();
    toastEl.textContent = isSave ? '🔋 Đã bật chế độ tiết kiệm pin (30 FPS)' : '⚡ Đã tắt tiết kiệm pin (60 FPS mượt mà)';
    toastEl.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 2000);
  });

  hubWorld.body.append(secMaps, secSeasons, secFilters, secSense);

  // ---------- HUB 5: TIỆN ÍCH, LAN TỎA & ỦNG HỘ ----------
  const hubUtil = makeHubModal('Tiện Ích, Lan Tỏa & Ủng Hộ Quán', '💖');
  hubUtilBtn.addEventListener('click', () => (hubUtil.modal.hidden = false));

  const secDonate = document.createElement('div');
  secDonate.className = 'hub-section-block';
  secDonate.innerHTML = `
    <div class="hub-section-title"><span>☕</span> Mời Admin / Bà Ba Ly Trà Đá Thật (VietQR)</div>
    <div style="font-size: 13px; color: #ccc; margin-bottom: 8px;">Nếu yêu thích không gian quán, bạn có thể quét mã VietQR ủng hộ 5.000đ - 10.000đ để duy trì server nhé:</div>
    <div class="vietqr-box">
      <img src="https://img.vietqr.io/image/MB-0987654321-compact2.png?amount=10000&addInfo=Moi%20ly%20tra%20da" alt="VietQR" />
      <div style="font-size: 13px; color: #2b1d14; font-weight: 700; margin-top: 6px;">Ngân hàng MB Bank · STK: 0987654321</div>
    </div>
  `;
  const confirmDonateBtn = document.createElement('button');
  confirmDonateBtn.className = 'boss-action-btn';
  confirmDonateBtn.style.cssText = 'background: #ffd166; color: #1a1410; width: 100%;';
  confirmDonateBtn.textContent = '✨ Tôi đã ủng hộ ly trà đá (Bấm để nhận quà VIP)';
  confirmDonateBtn.addEventListener('click', () => {
    toastEl.textContent = '🎉 Cảm ơn tấm lòng của bạn! Bạn đã được nhận vương miện VIP lấp lánh trong quán! 👑';
    toastEl.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 3000);
    cb.onClaimCoins?.(5, 'donate_vip');

    hubUtil.modal.hidden = true;
  });
  secDonate.append(confirmDonateBtn);

  const secPolaroid = document.createElement('div');
  secPolaroid.className = 'hub-section-block';
  secPolaroid.innerHTML = `
    <div class="hub-section-title"><span>📸</span> Chụp Ảnh Polaroid Check-In Sống Ảo</div>
    <div style="font-size: 13px; color: #ccc; margin-bottom: 8px;">Tự động xuất bức ảnh kỷ niệm vintage kèm chữ ký hoài niệm để tải về máy:</div>
  `;
  const takePhotoBtn = document.createElement('button');
  takePhotoBtn.className = 'boss-action-btn';
  takePhotoBtn.textContent = '📸 Chụp ảnh kỷ niệm ngay';
  const photoPreviewBox = document.createElement('div');
  photoPreviewBox.style.display = 'none';

  takePhotoBtn.addEventListener('click', () => {
    const dataUrl = cb.onCapturePolaroid?.();
    if (dataUrl) {
      photoPreviewBox.style.display = 'block';
      photoPreviewBox.innerHTML = `
        <img class="polaroid-preview-img" src="${dataUrl}" alt="Polaroid" />
        <a href="${dataUrl}" download="tra-da-via-he-polaroid.png" class="boss-action-btn" style="display: block; text-align: center; text-decoration: none; margin-top: 8px; background: #2ec4b6; color: #0b131a;">💾 Tải ảnh về máy (PNG)</a>
      `;
    }
  });
  secPolaroid.append(takePhotoBtn, photoPreviewBox);

  const secPomo = document.createElement('div');
  secPomo.className = 'hub-section-block';
  let pomoSec = 25 * 60;
  let pomoTimer: number | null = null;
  secPomo.innerHTML = `
    <div class="hub-section-title"><span>⏳</span> Góc Tập Trung Pomodoro (25 phút)</div>
    <div style="font-size: 13px; color: #ccc; margin-bottom: 8px;">Vừa làm việc vừa nghe tiếng mưa và nhạc lo-fi. Hết 25 phút tiếng chuông sẽ reo nhắc bạn nghỉ ngơi.</div>
    <div class="pomo-display" style="font-size: 28px; font-weight: 800; color: #ffd166; text-align: center; margin: 8px 0;">25:00</div>
    <div style="display: flex; gap: 8px; justify-content: center;">
      <button type="button" class="boss-action-btn btn-pomo-start">Bắt đầu ⏳</button>
      <button type="button" class="boss-action-btn btn-pomo-reset">Đặt lại 🔄</button>
    </div>
  `;
  const pomoDisplay = secPomo.querySelector('.pomo-display') as HTMLElement;
  secPomo.querySelector('.btn-pomo-start')?.addEventListener('click', (e) => {
    const btn = e.target as HTMLButtonElement;
    if (pomoTimer) {
      clearInterval(pomoTimer);
      pomoTimer = null;
      btn.textContent = 'Tiếp tục ▶️';
    } else {
      btn.textContent = 'Tạm dừng ⏸️';
      pomoTimer = window.setInterval(() => {
        if (pomoSec > 0) {
          pomoSec--;
          const m = String(Math.floor(pomoSec / 60)).padStart(2, '0');
          const s = String(pomoSec % 60).padStart(2, '0');
          if (pomoDisplay) pomoDisplay.textContent = `${m}:${s}`;
        } else {
          if (pomoTimer) clearInterval(pomoTimer);
          pomoTimer = null;
          btn.textContent = 'Hoàn thành 🎉';
          toastEl.textContent = '🔔 Hết 25 phút Pomodoro! U bà Ba rót trà mời bạn nghỉ giải lao 5 phút nhé!';
          toastEl.classList.add('show');
          window.clearTimeout(toastTimer);
          toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 3000);
        }
      }, 1000);
    }
  });
  secPomo.querySelector('.btn-pomo-reset')?.addEventListener('click', () => {
    if (pomoTimer) clearInterval(pomoTimer);
    pomoTimer = null;
    pomoSec = 25 * 60;
    if (pomoDisplay) pomoDisplay.textContent = '25:00';
  });

  const secRealFood = document.createElement('div');
  secRealFood.className = 'hub-section-block';
  secRealFood.innerHTML = `
    <div class="hub-section-title"><span>🛵</span> Đặt Trà Thật Về Nhà & Rủ Bạn Bè</div>
    <div style="font-size: 13px; color: #ccc; margin-bottom: 8px;">Thèm ly trà chanh giã tay hay đĩa hạt hướng dương thật? Đặt ngay giao tận nhà:</div>
    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
      <a href="https://food.grab.com" target="_blank" class="boss-action-btn" style="text-decoration: none; display: inline-block;">🛵 GrabFood</a>
      <a href="https://shopee.vn/now" target="_blank" class="boss-action-btn" style="text-decoration: none; display: inline-block;">🛵 ShopeeFood</a>
      <button type="button" class="boss-action-btn btn-share-link">🔗 Copy link rủ bạn</button>
    </div>
  `;
  secRealFood.querySelector('.btn-share-link')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(window.location.href);
    toastEl.textContent = '📋 Đã sao chép đường link quán! Gửi cho bạn bè cùng vào ngồi nào!';
    toastEl.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 2000);
  });

  hubUtil.body.append(secDonate, secPolaroid, secPomo, secRealFood);



  // ---------- Modal Tương Tác Người Chơi (Bấm vào ai đó trên vỉa hè) ----------
  const playerActionModal = document.createElement('div');
  playerActionModal.className = 'stories-modal';
  playerActionModal.hidden = true;

  const playerActionCard = document.createElement('div');
  playerActionCard.className = 'stories-card';

  const playerActionHeader = document.createElement('div');
  playerActionHeader.className = 'stories-header';
  const playerActionTitle = document.createElement('h3');
  playerActionTitle.textContent = '👤 Tương Tác Với Người Bạn Vỉa Hè';
  const closePlayerActionBtn = document.createElement('button');
  closePlayerActionBtn.className = 'stories-close';
  closePlayerActionBtn.textContent = '✕';
  playerActionHeader.append(playerActionTitle, closePlayerActionBtn);

  const playerActionNotice = document.createElement('div');
  playerActionNotice.className = 'stories-notice';
  playerActionNotice.textContent = 'Chọn hoạt động giao lưu cùng bạn:';

  const playerActionsList = document.createElement('div');
  playerActionsList.style.display = 'flex';
  playerActionsList.style.flexDirection = 'column';
  playerActionsList.style.gap = '10px';
  playerActionsList.style.marginTop = '12px';

  let selectedTargetName = '';
  let selectedTargetSeatId: string | undefined = undefined;

  const btnActRps = document.createElement('button');
  btnActRps.className = 'boss-action-btn';
  btnActRps.style.textAlign = 'left';
  btnActRps.style.padding = '12px 16px';
  btnActRps.innerHTML = '<b>✊ Thách đấu Oẳn Tù Tì</b><div style="font-size: 12px; color: #ddd; margin-top: 2px;">Mời bạn một trận Kéo - Búa - Bao so tài vui vẻ</div>';

  const btnActXiangqi = document.createElement('button');
  btnActXiangqi.className = 'boss-action-btn';
  btnActXiangqi.style.textAlign = 'left';
  btnActXiangqi.style.padding = '12px 16px';
  btnActXiangqi.innerHTML = '<b>♟️ Mời chơi Cờ Tướng vỉa hè</b><div style="font-size: 12px; color: #ddd; margin-top: 2px;">Gửi lời mời cùng giải các thế cờ tàn kinh điển</div>';

  const btnActTreat = document.createElement('button');
  btnActTreat.className = 'boss-action-btn';
  btnActTreat.style.textAlign = 'left';
  btnActTreat.style.padding = '12px 16px';
  btnActTreat.innerHTML = '<b>🍵 Đãi ly trà đá đặc biệt (1 xu)</b><div style="font-size: 12px; color: #ddd; margin-top: 2px;">Tặng một ly trà phát sáng ấm áp tình bạn vỉa hè</div>';

  const btnActWave = document.createElement('button');
  btnActWave.className = 'boss-action-btn';
  btnActWave.style.textAlign = 'left';
  btnActWave.style.padding = '12px 16px';
  btnActWave.innerHTML = '<b>🍻 Cạn ly làm quen</b><div style="font-size: 12px; color: #ddd; margin-top: 2px;">Nâng ly chúc sức khỏe gửi tới người bạn này</div>';

  btnActRps.addEventListener('click', () => {
    playerActionModal.hidden = true;
    if (selectedTargetSeatId) {
      cb.onGameInvite?.(selectedTargetSeatId, 'rps');
      toastEl.textContent = `⏳ Đã gửi lời mời thách đấu Oẳn tù tì tới ${selectedTargetName}! Đang chờ đối phương chấp nhận...`;
      toastEl.classList.add('show');
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 3000);
    }
  });

  btnActXiangqi.addEventListener('click', () => {
    playerActionModal.hidden = true;
    if (selectedTargetSeatId) {
      cb.onGameInvite?.(selectedTargetSeatId, 'xiangqi');
      toastEl.textContent = `⏳ Đã gửi lời mời chơi Cờ tướng tới ${selectedTargetName}! Đang chờ đối phương chấp nhận...`;
      toastEl.classList.add('show');
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 3000);
    }
  });

  btnActTreat.addEventListener('click', () => {
    playerActionModal.hidden = true;
    if (selectedTargetSeatId) {
      cb.onTreat(selectedTargetSeatId);
      toastEl.textContent = `Đang đãi ${selectedTargetName} ly trà đá đặc biệt 🍵…`;
      toastEl.classList.add('show');
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 2000);
    }
  });

  btnActWave.addEventListener('click', () => {
    playerActionModal.hidden = true;
    cb.onReact('cangly', selectedTargetSeatId);
  });

  playerActionsList.append(btnActRps, btnActXiangqi, btnActTreat, btnActWave);
  playerActionCard.append(playerActionHeader, playerActionNotice, playerActionsList);
  playerActionModal.append(playerActionCard);
  closePlayerActionBtn.addEventListener('click', () => (playerActionModal.hidden = true));
  playerActionModal.addEventListener('click', (e) => {
    if (e.target === playerActionModal) playerActionModal.hidden = true;
  });

  root.append(
    topBar,
    roundPanel,
    sideButtons,
    profileModal,
    storiesModal,
    rankModal,
    bossModal,
    radioModal,
    soundModal,
    weatherModal,
    fortuneModal,
    letterModal,
    guestbookModal,
    xiangqiModal,
    rpsModal,
    playerActionModal,
    gameInviteModal,


    hubShop.modal,
    hubGames.modal,
    hubProgress.modal,
    hubWorld.modal,
    hubUtil.modal,

    actionDock,
    toastEl,
  );

  let toastTimer: number | undefined;
  const last = { time: '', meta: '', topic: '', width: '' };
  const allStories: Story[] = [];

  function renderStories(): void {
    storiesList.innerHTML = '';
    if (allStories.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'story-empty';
      empty.textContent = 'Chưa có câu chuyện nào trong tuần trà này.';
      storiesList.append(empty);
      return;
    }
    const sorted = [...allStories].sort((a, b) => b.createdAt - a.createdAt);
    for (const s of sorted) {
      const item = document.createElement('div');
      item.className = 'story-item';
      const text = document.createElement('div');
      text.className = 'story-text';
      text.textContent = s.text;

      const reportBtn = document.createElement('button');
      reportBtn.className = 'story-report';
      reportBtn.type = 'button';
      reportBtn.textContent = '🚩 Báo cáo';
      reportBtn.addEventListener('click', () => {
        reportBtn.disabled = true;
        reportBtn.textContent = 'Đã báo';
        cb.onReportStory(s.id);
      });

      item.append(text, reportBtn);
      storiesList.append(item);
    }
  }

  return {
    setTime(hour) {
      const h = Math.floor(hour);
      const m = Math.floor((hour - h) * 60);
      const text = `🕰️ ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      if (text !== last.time) {
        clock.textContent = text;
        last.time = text;
      }
    },
    setOnline(count) {
      onlineEl.textContent = `🍵 ${count} đang ở quán`;
    },
    setRound({ roundIndex, progress, remainingMs, topic, synced }) {
      const sec = Math.max(0, Math.ceil(remainingMs / 1000));
      const mm = String(Math.floor(sec / 60)).padStart(2, '0');
      const ss = String(sec % 60).padStart(2, '0');
      const metaText = `Tuần trà #${roundIndex} · còn ${mm}:${ss}${synced ? '' : ' · chưa khớp giờ quán'}`;
      if (metaText !== last.meta) {
        meta.textContent = metaText;
        last.meta = metaText;
      }
      const topicText = topic ?? 'Bà chủ đang nghĩ chủ đề…';
      if (topicText !== last.topic) {
        topicEl.textContent = topicText;
        last.topic = topicText;
      }
      const width = `${(Math.min(1, Math.max(0, progress)) * 100).toFixed(1)}%`;
      if (width !== last.width) {
        fill.style.width = width;
        last.width = width;
      }
    },
    setSeated(seated, seatId) {
      actionDock.hidden = !seated;
      tableMyColor = chessColorOfSeat(seated ? seatId : null);
      renderChessBoard();
    },
    setStories(stories) {
      allStories.length = 0;
      allStories.push(...stories);
      renderStories();
    },
    addStory(story) {
      allStories.push(story);
      renderStories();
    },
    removeStory(storyId) {
      const idx = allStories.findIndex((s) => s.id === storyId);
      if (idx !== -1) {
        allStories.splice(idx, 1);
        renderStories();
      }
    },
    setProfileInfo(p) {
      lastProfileData = p;

      walletBadge.textContent = `🪙 ${p.coins} xu · 🔥 ${p.streak} ngày`;

      profileBody.innerHTML = '';

      // Phần thông tin số liệu
      const statsBox = document.createElement('div');
      statsBox.className = 'stats-grid';
      statsBox.innerHTML = `
        <div class="stat-item"><div class="stat-val">${p.coins}</div><div class="stat-lbl">Tiền lẻ</div></div>
        <div class="stat-item"><div class="stat-val">${p.streak}</div><div class="stat-lbl">Chuỗi ngày</div></div>
        <div class="stat-item"><div class="stat-val">${p.todayFullRounds}</div><div class="stat-lbl">Tuần trà hôm nay</div></div>
        <div class="stat-item"><div class="stat-val">${p.totalFullRounds}</div><div class="stat-lbl">Tổng tuần trà</div></div>
      `;

      // Mã khôi phục
      const codeSection = document.createElement('div');
      codeSection.className = 'section-block';
      codeSection.innerHTML = `
        <div class="block-title">Mã khôi phục tài khoản</div>
        <div class="recovery-box">
          <span class="code-val">${p.recoveryCode}</span>
        </div>
        <div class="hint-text">Dùng mã này để lấy lại tiền lẻ và chuỗi ngày khi đổi máy hoặc trình duyệt khác.</div>
      `;

      // Form nhập mã khôi phục khác
      const recoverForm = document.createElement('form');
      recoverForm.className = 'recover-form';
      recoverForm.innerHTML = `
        <input type="text" placeholder="Nhập mã khôi phục từ máy khác…" maxlength="20" required />
        <button type="submit">Khôi phục</button>
      `;
      recoverForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const inp = recoverForm.querySelector('input')!;
        if (inp.value.trim()) {
          cb.onRecover(inp.value.trim());
          inp.value = '';
        }
      });
      codeSection.append(recoverForm);

      // Sửa tên hiển thị
      const editSection = document.createElement('div');
      editSection.className = 'section-block';
      editSection.innerHTML = `<div class="block-title">Đổi tên & nhân vật</div>`;

      const editForm = document.createElement('form');
      editForm.className = 'edit-form';

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.value = p.name;
      nameInput.maxLength = 20;
      nameInput.required = true;

      const saveBtn = document.createElement('button');
      saveBtn.type = 'submit';
      saveBtn.textContent = 'Lưu thay đổi';

      editForm.append(nameInput, saveBtn);
      editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (nameInput.value.trim()) {
          cb.onUpdateProfile(nameInput.value.trim(), p.avatar, p.mood);
        }
      });
      editSection.append(editForm);

      // Lời chào của bà chủ
      const greetingBox = document.createElement('div');
      greetingBox.className = 'stories-notice';
      greetingBox.textContent = getBossGreeting(p.streak, p.name);

      // Tủ đồ phụ kiện mở khoá theo chuỗi ngày
      const closetSection = document.createElement('div');
      closetSection.className = 'section-block';
      closetSection.innerHTML = `<div class="block-title">Tủ đồ phụ kiện quán tặng (theo chuỗi ngày)</div>`;
      const closetList = document.createElement('div');
      closetList.className = 'closet-grid';
      for (const item of ACCESSORIES) {
        const unlocked = p.streak >= item.minStreak;
        const cItem = document.createElement('div');
        cItem.className = `closet-item ${unlocked ? 'unlocked' : 'locked'}`;
        cItem.innerHTML = `
          <div class="closet-emoji">${item.emoji}</div>
          <div class="closet-name">${item.name}</div>
          <div class="closet-status">${unlocked ? 'Đã mở khoá ✨' : `Chuỗi ${item.minStreak} ngày 🔒`}</div>
        `;
        closetList.append(cItem);
      }
      closetSection.append(closetList);

      profileBody.append(greetingBox, statsBox, closetSection, codeSection, editSection);
    },
    setLeaderboard(week, entries) {
      rankList.innerHTML = '';
      if (entries.length === 0) {
        rankList.innerHTML = `<div class="story-empty">Chưa có ai ngồi đủ tuần trà trong tuần này.</div>`;
        return;
      }
      entries.forEach((en, idx) => {
        const item = document.createElement('div');
        item.className = 'story-item';
        const av = AVATARS.find((a) => a.id === en.avatar)?.label ?? 'Khách';
        item.innerHTML = `
          <div class="rank-num">#${idx + 1}</div>
          <div class="rank-info">
            <div class="rank-name">${en.name} <span class="rank-sub">(${av})</span></div>
            <div class="rank-rounds">${en.roundsCount} tuần trà ngồi đủ</div>
          </div>
        `;
        rankList.append(item);
      });
    },
    openRadio() {
      tvDock.classList.remove('hidden');
      radioModal.hidden = false;
    },
    openBossShop() {
      bossModal.hidden = false;
    },
    setWeather(weather, mode) {
      currentWeatherMode = mode;
      const opt = WEATHER_OPTIONS.find((o) => o.id === mode);
      const wOpt = WEATHER_OPTIONS.find((o) => o.id === weather);
      const label =
        mode === 'auto'
          ? `🔄 ${wOpt?.emoji ?? ''} ${wOpt?.label ?? weather}`
          : `${opt?.emoji ?? ''} ${opt?.label ?? weather}`;
      weatherBadge.textContent = label;
      weatherOptionButtons.forEach((b, idx) => {
        b.classList.toggle('active', WEATHER_OPTIONS[idx]?.id === mode);
      });
    },
    setRadioQueue(queue) {
      queueList.innerHTML = '';
      if (queue.length === 0) {
        queueList.innerHTML = `<div class="story-empty">List chờ đang trống. TV đang tự động luân chuyển playlist mặc định của quán.</div>`;
        return;
      }
      queue.forEach((item, idx) => {
        const div = document.createElement('div');
        div.className = 'story-item';
        div.innerHTML = `
          <div class="rank-num">#${idx + 1}</div>
          <div class="rank-info">
            <div class="rank-name">YouTube ID: ${item.videoId}</div>
            <div class="rank-rounds">Vị trí #${idx + 1} trong list chờ</div>
          </div>
        `;
        queueList.append(div);
      });
    },
    setRadioPlaying(_current: RadioItem | null, isPaused = false) {
      currentIsPaused = isPaused;
      adminPauseBtn.textContent = isPaused ? '▶️ Tiếp tục phát cả quán' : '⏸️ Tạm dừng cả quán';
    },
    setAdminStatus(isAdmin: boolean, message?: string) {
      if (isAdmin) {
        adminStatusText.textContent = '👑 Bạn là Chủ Quán (Admin)';
        adminLoginBtn.style.display = 'none';
        adminControlsRow.style.display = 'flex';
      } else {
        adminStatusText.textContent = '👤 Quyền: Khách trong quán';
        adminLoginBtn.style.display = 'inline-block';
        adminControlsRow.style.display = 'none';
      }
      if (message) {
        toastEl.textContent = message;
        toastEl.classList.add('show');
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 2400);
      }
    },
    toast(message) {
      toastEl.textContent = message;
      toastEl.classList.add('show');
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 2400);
    },
    openFortune() {
      fortuneModal.hidden = false;
    },
    openLetterBox() {
      letterModal.hidden = false;
    },
    openGuestbook() {
      cb.onGetGuestbook?.();
      guestbookModal.hidden = false;
    },
    openXiangqi() {
      liveChessGameId = null;
      selectedChessSquare = null;
      renderChessBoard();
      xiangqiModal.hidden = false;
    },
    handleRpsInvite(gameId: string, fromName: string, fromSeatId = '') {
      this.handleGameInvite(gameId, 'rps', fromName, fromSeatId);
    },

    handleGameInvite(gameId: string, gameType: 'rps' | 'xiangqi', fromName: string, fromSeatId: string) {
      pendingInviteGameId = gameId;
      const gameLabel = gameType === 'rps' ? 'Oẳn Tù Tì (Kéo - Búa - Bao) ✊' : 'Cờ Tướng Vỉa Hè ♟️';
      gameInviteBody.innerHTML = `
        <div style="font-size: 40px; margin-bottom: 8px;">${gameType === 'rps' ? '✊' : '♟️'}</div>
        <div style="font-size: 16px; color: #ffd166; font-weight: 700; margin-bottom: 4px;">${fromName}</div>
        <div style="font-size: 13px; color: #aaa; margin-bottom: 8px;">(Đang ngồi ghế ${fromSeatId})</div>
        <div style="font-size: 14px; color: #eee;">vừa thách đấu bạn một trận <b>${gameLabel}</b>!</div>
      `;
      gameInviteModal.hidden = false;
    },
    handleGameStarted(gameId: string, gameType: 'rps' | 'xiangqi', p1Name: string, p2Name: string, myColor?: 'red' | 'black') {
      gameInviteModal.hidden = true;
      playerActionModal.hidden = true;
      toastEl.textContent = `⚔️ Trận đấu ${gameType === 'rps' ? 'Oẳn tù tì' : 'Cờ tướng'} giữa ${p1Name} và ${p2Name} đã bắt đầu!`;
      toastEl.classList.add('show');
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 2500);

      if (gameType === 'rps') {
        currentRpsGameId = gameId;
        rpsNotice.textContent = `⚔️ ${p1Name} vs ${p2Name}: Hãy chọn đòn của bạn:`;
        rpsResultBox.style.display = 'none';
        rpsModal.hidden = false;
      } else {
        liveChessGameId = gameId;
        myChessColor = (myColor === 'black' ? 'black' : 'red');

        chessBoardState = getInitialXiangqiBoard();
        currentChessTurn = 'red';
        selectedChessSquare = null;
        renderChessBoard();
        xiangqiModal.hidden = false;
      }
    },
    handleGameDeclined(byName: string) {
      toastEl.textContent = `❌ ${byName} đã từ chối lời mời thách đấu.`;
      toastEl.classList.add('show');
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 2500);
    },
    handleRpsOpponentMoved(opponentName: string) {
      rpsNotice.textContent = `🎲 ${opponentName} đã ra đòn bí mật! Hãy chọn đòn của bạn:`;
    },
    handleChessMoved(from: [number, number], to: [number, number], piece: string, turn: 'red' | 'black') {
      chessBoardState[to[0]]![to[1]] = piece;
      chessBoardState[from[0]]![from[1]] = '';
      currentChessTurn = turn;
      renderChessBoard();
      toastEl.textContent = `♟️ Nước đi quân ${XIANGQI_PIECE_NAMES[piece] ?? piece}: Lượt bên ${turn === 'red' ? 'Đỏ' : 'Đen'}!`;
      toastEl.classList.add('show');
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 2000);
    },
    setChessTable(msg) {
      tableRedName = msg.redName;
      tableBlackName = msg.blackName;
      tableWinner = msg.winner;
      tableLastMove = msg.lastMove;
      if (isTableMode()) {
        chessBoardState = msg.board.map((row) => [...row]);
        currentChessTurn = msg.turn;
        selectedChessSquare = null;
        renderChessBoard();
      }
    },
    handleRpsResult(myChoice: RpsChoice, opponentChoice: RpsChoice, result: 'win' | 'lose' | 'draw', opponentName: string) {
      const myDef = RPS_CHOICES.find((c) => c.id === myChoice);
      const oppDef = RPS_CHOICES.find((c) => c.id === opponentChoice);
      rpsResultBox.style.display = 'block';
      rpsResultBox.innerHTML = `
        <div class="rps-result-title">${result === 'win' ? '🎉 BẠN THẮNG RỒI!' : result === 'lose' ? '😅 BẠN THUA RỒI!' : '🤝 HÒA NHAU!'}</div>
        <div>Bạn ra: <b>${myDef?.name ?? myChoice} ${myDef?.emoji ?? ''}</b> vs ${opponentName} ra: <b>${oppDef?.name ?? opponentChoice} ${oppDef?.emoji ?? ''}</b></div>
        <button type="button" class="boss-action-btn btn-again" style="margin-top: 10px;">Chơi lại ván nữa 🔄</button>
      `;
      rpsResultBox.querySelector('.btn-again')?.addEventListener('click', () => {
        rpsResultBox.style.display = 'none';
        rpsNotice.textContent = 'Ván mới: Hãy chọn Kéo - Búa - Bao:';
      });
      currentRpsGameId = null;
      rpsModal.hidden = false;
    },
    handleTreatAll(fromName: string) {
      toastEl.textContent = `🔔 ${fromName} vừa Rung Chuông đãi tất cả mọi người trong quán ly trà đá! 🍵✨`;
      toastEl.classList.add('show');
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 3500);
    },
    setLetterDrawn(letter) {
      if (!letter) {
        drawLetterBox.innerHTML = '<i>Hòm thư hiện chưa có lá thư nào từ người khác. Bạn hãy là người đầu tiên viết thư nhé!</i>';
        return;
      }
      const d = new Date(letter.createdAt).toLocaleDateString('vi-VN');
      drawLetterBox.innerHTML = `
        <div style="font-size: 13px; color: #888; margin-bottom: 6px;">📅 Ngày gửi: ${d}</div>
        <div style="font-size: 15px; color: #2b1d14; line-height: 1.6;">"${letter.text}"</div>
        <div style="margin-top: 8px; font-size: 12px; color: #b5835a; text-align: right;">— Một người lạ ghé quán</div>
      `;
    },
    setGuestbook(entries) {
      guestbookList.innerHTML = '';
      if (entries.length === 0) {
        guestbookList.innerHTML = '<div class="story-empty">Chưa có lời nhắn lưu bút nào. Hãy là người đầu tiên ký tên nhé!</div>';
        return;
      }
      entries.forEach((e) => {
        const item = document.createElement('div');
        item.className = 'guestbook-item';
        item.innerHTML = `
          <div style="font-size: 24px;">🍵</div>
          <div style="flex: 1;">
            <div style="font-weight: 700; color: #ffd166; font-size: 14px;">${e.name} <span style="font-weight: normal; font-size: 12px; color: #888;">(${new Date(e.createdAt).toLocaleDateString('vi-VN')})</span></div>
            <div style="color: #ddd; font-size: 13px; margin-top: 2px;">${e.text}</div>
          </div>
        `;
        guestbookList.append(item);
      });
    },
    openPlayerActionMenu(targetName: string, targetSeatId?: string) {
      selectedTargetName = targetName;
      selectedTargetSeatId = targetSeatId;
      playerActionTitle.textContent = `👤 ${targetName} ${targetSeatId ? `(Ghế ${targetSeatId})` : ''}`;
      playerActionModal.hidden = false;
    },


    tvDockElement: tvDock,
    setTvMode,
    getTvMode() {
      return currentTvMode;
    },
  };
}
