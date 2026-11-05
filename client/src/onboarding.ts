import { AVATARS, MOODS, NAME_MAX, SEAT_PREFS, sanitizeName } from '@tdvh/shared';
import { loadProfile, saveProfile, type Profile } from './profile';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** Nhóm nút chọn một: trả về hàm đọc giá trị đang chọn. */
function choiceGroup(
  items: readonly { id: string; label: string; swatch?: number }[],
  initial: string,
): { root: HTMLElement; get: () => string } {
  const root = el('div', 'choices');
  let value = initial;
  const buttons = new Map<string, HTMLButtonElement>();
  const paint = (): void => buttons.forEach((b, id) => b.classList.toggle('on', id === value));
  for (const it of items) {
    const b = el('button', 'choice');
    b.type = 'button';
    if (it.swatch !== undefined) {
      const dot = el('span', 'swatch');
      dot.style.background = `#${it.swatch.toString(16).padStart(6, '0')}`;
      b.append(dot);
    }
    b.append(document.createTextNode(it.label));
    b.addEventListener('click', () => {
      value = it.id;
      paint();
    });
    buttons.set(it.id, b);
    root.append(b);
  }
  paint();
  return { root, get: () => value };
}

/** Màn onboarding: tên, nhân vật, tâm trạng, chỗ ngồi ưa thích, nút "Vào quán". */
export function showOnboarding(parent: HTMLElement): Promise<Profile> {
  const init = loadProfile();
  const overlay = el('div', 'overlay');
  const card = el('form', 'card');
  card.noValidate = true;

  card.append(el('h1', undefined, 'Trà Đá Vỉa Hè 🍵'));
  card.append(el('p', 'sub', 'Ngồi chút cho nhẹ lòng. Không camera, không chat, chỉ có ly trà.'));

  const nameLabel = el('label', 'field', 'Tên của bạn');
  const input = el('input');
  input.type = 'text';
  input.maxLength = NAME_MAX;
  input.placeholder = 'Ví dụ: Lan, Chú Ba…';
  input.value = init.name;
  input.autocomplete = 'off';
  nameLabel.append(input);
  const err = el('div', 'err');

  const avatar = choiceGroup(
    AVATARS.map((a) => ({ id: a.id, label: a.label, swatch: a.shirt })),
    init.avatar,
  );
  const mood = choiceGroup(
    MOODS.map((m) => ({ id: m.id, label: `${m.emoji} ${m.label}` })),
    init.mood,
  );
  const pref = choiceGroup(SEAT_PREFS, init.seatPref);

  const section = (title: string, body: HTMLElement): HTMLElement => {
    const s = el('div', 'section');
    s.append(el('div', 'label', title), body);
    return s;
  };

  const go = el('button', 'go', 'Vào quán 🍵');
  go.type = 'submit';
  card.append(
    nameLabel,
    err,
    section('Chọn nhân vật', avatar.root),
    section('Tâm trạng hôm nay', mood.root),
    section('Chỗ ngồi ưa thích', pref.root),
    go,
  );
  overlay.append(card);
  parent.append(overlay);

  return new Promise((resolve) => {
    card.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = sanitizeName(input.value);
      if (name === '') {
        err.textContent = 'Bạn nhập tên giúp nhé (tối đa 20 ký tự).';
        input.focus();
        return;
      }
      const profile: Profile = {
        name,
        avatar: avatar.get(),
        mood: mood.get(),
        seatPref: pref.get(),
      };
      saveProfile(profile);
      overlay.remove();
      resolve(profile);
    });
  });
}
