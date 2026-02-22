/* =========================================================
   STORAGE — Intent V2
   Wrapper localStorage simple et sécurisé
   ========================================================= */

const Storage = {

  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch {
      console.warn("[Storage] get error:", key);
      return fallback;
    }
  },

  set(key, value) {
    try {
      const serialized = JSON.stringify(value);
      if (serialized.length > 4 * 1024 * 1024) {
        console.error("[Storage] item trop volumineux:", key);
        return false;
      }
      localStorage.setItem(key, serialized);
      return true;
    } catch {
      console.error("[Storage] set error:", key);
      return false;
    }
  },

  remove(key) {
    try { localStorage.removeItem(key); } catch {}
  },

  clearAll() {
    try { localStorage.clear(); } catch {}
  },

  sizeKB() {
    try {
      let total = 0;
      for (const key of Object.keys(localStorage)) {
        total += (localStorage.getItem(key) || "").length;
      }
      return Math.round(total / 1024);
    } catch { return 0; }
  }

};

window.Storage = Storage;
