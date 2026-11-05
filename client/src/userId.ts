const USER_ID_KEY = 'tdvh.userId.v1';

/** Lấy userId hoặc sinh UUID v4 mới riêng cho từng tab/phiên, lưu vào sessionStorage để hỗ trợ nhiều tab cùng chơi. */
export function getOrCreateUserId(): string {
  try {
    if (typeof window !== 'undefined' && window.location) {
      const q = new URLSearchParams(window.location.search).get('user');
      if (q) {
        const queryKey = `${USER_ID_KEY}.${q}`;
        let qId = sessionStorage.getItem(queryKey);
        if (!qId) {
          qId = crypto.randomUUID();
          sessionStorage.setItem(queryKey, qId);
        }
        return qId;
      }
    }

    let tabId = sessionStorage.getItem(USER_ID_KEY);
    if (!tabId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tabId)) {
      tabId = crypto.randomUUID();
      sessionStorage.setItem(USER_ID_KEY, tabId);
    }
    return tabId;
  } catch {
    return crypto.randomUUID();
  }
}

