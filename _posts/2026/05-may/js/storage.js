// Lokalne przechowywanie listy numerów telefonów do nauki.
const Storage = (() => {
  const KEY = 'ppn_numbers_v1';

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
  };
})();
