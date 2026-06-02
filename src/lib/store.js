// src/lib/store.js
// In-memory message store (server restart pe reset hoga)
// Production mein MongoDB/Supabase use karo

const globalStore = global

if (!globalStore._waMessages) {
  globalStore._waMessages = []
}

export const messageStore = {
  add(msg) {
    globalStore._waMessages.unshift(msg) // latest first
    if (globalStore._waMessages.length > 200) {
      globalStore._waMessages = globalStore._waMessages.slice(0, 200)
    }
  },
  getAll() {
    return globalStore._waMessages
  },
  clear() {
    globalStore._waMessages = []
  },
}
