// Lokalne przechowywanie listy numerów telefonów do nauki + ustawień gry.
const Storage = (() => {
  const KEY = 'ppn_numbers_v1';
  const SETTINGS_KEY = 'ppn_settings_v1';

  function readRaw() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
  function writeRaw(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
  }
  function readSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }
  function writeSettings(s) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  }

  return {
    list() {
      return readRaw();
    },
    add(label, number, icon) {
      const items = readRaw();
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      items.push({ id, label: label.trim(), number: number.replace(/\D/g, ''), icon: icon || '👤' });
      writeRaw(items);
      return id;
    },
    remove(id) {
      writeRaw(readRaw().filter(i => i.id !== id));
    },
    get(id) {
      return readRaw().find(i => i.id === id);
    },
    move(id, delta) {
      const items = readRaw();
      const idx = items.findIndex(i => i.id === id);
      if (idx < 0) return;
      const newIdx = idx + delta;
      if (newIdx < 0 || newIdx >= items.length) return;
      [items[idx], items[newIdx]] = [items[newIdx], items[idx]];
      writeRaw(items);
    },
    getSetting(key, defaultValue) {
      const s = readSettings();
      return s[key] !== undefined ? s[key] : defaultValue;
    },
    setSetting(key, value) {
      const s = readSettings();
      s[key] = value;
      writeSettings(s);
    },
  };
})();
