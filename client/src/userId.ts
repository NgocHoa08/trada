const USER_ID_KEY = 'tdvh.userId.v1';

/** Lấy userId hoặc sinh UUID v4 mới nếu chưa có, lưu vào localStorage. */
export function getOrCreateUserId(): string {
  try {
    let id = localStorage.getItem(USER_ID_KEY);
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      id = crypto.randomUUID();
      localStorage.setItem(USER_ID_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

