const STORAGE_KEY = 'survival-challenge-records';
const MAX_RECORDS = 20;

function normalizeRecord(record) {
  return {
    id: record.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: record.createdAt || new Date().toISOString(),
    time: Number(record.time) || 0,
    wave: Number(record.wave) || 0,
    kills: Number(record.kills) || 0,
    bossKills: Number(record.bossKills) || 0,
    coins: Number(record.coins) || 0,
    score: Number(record.score) || 0
  };
}

export function getScoreRecords() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const records = JSON.parse(raw);
    if (!Array.isArray(records)) return [];
    return records.map(normalizeRecord);
  } catch (err) {
    return [];
  }
}

export function addScoreRecord(stats) {
  const record = normalizeRecord(stats);
  const records = [record, ...getScoreRecords()]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_RECORDS);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    return record;
  }
  return record;
}

export function formatRecordTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
