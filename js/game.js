// 수달일기 규칙 — 성장, 기운, 마실, 연속 기록. 화면과 분리된 순수 계산 (selftest로 검사)
import { STAGES, STORIES, FINDS } from './content.js?v=202610051106';

export const ENERGY_PER_GOAL = 34; // 목표 3개면 기운이 가득 찬다
export const BREATH_ENERGY = 10;   // 호흡 1분 (하루 한 번)
export const FULL = 100;
export const MAX_ADV_PER_DAY = 2;
const DAY = 86400000;

const pad = (n) => String(n).padStart(2, '0');
export const dayKey = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (k, n) => dayKey(parseKey(k).getTime() + n * DAY + 3600000); // +1시간: 서머타임 안전
export const daysBetween = (a, b) => Math.round((parseKey(b) - parseKey(a)) / DAY);

// 함께한 날 수(만난 날 = 1일째)와 성장 단계
export function growth(bornKey, todayKey) {
  const days = daysBetween(bornKey, todayKey);
  let idx = 0;
  STAGES.forEach((s, i) => { if (days >= s.min) idx = i; });
  const next = STAGES[idx + 1];
  return { day: days + 1, stage: idx, name: STAGES[idx].name, toNext: next ? next.min - days : null };
}

// 목표가 그날 할 일인지 (repeat: 'daily' 또는 요일 배열 [0=일 … 6=토])
export function activeOn(goal, key) {
  if (goal.archived) return false;
  if (goal.createdKey && key < goal.createdKey) return false;
  if (!goal.repeat || goal.repeat === 'daily') return true;
  return goal.repeat.includes(parseKey(key).getDay());
}

// 기운은 저장하지 않고 그날 기록에서 계산한다 (어긋날 일이 없다)
export function energyOf(key, logs, advs, breathKeys) {
  const earned = logs.filter((l) => l.date === key).length * ENERGY_PER_GOAL + (breathKeys.includes(key) ? BREATH_ENERGY : 0);
  const spent = advs.filter((a) => a.startKey === key).length * FULL;
  return Math.max(0, Math.min(FULL, earned - spent));
}

export function activeAdventure(advs) {
  return advs.find((a) => !a.seenAt) ?? null; // 결과를 아직 안 본 마실
}

export function canStart(key, logs, advs, breathKeys) {
  if (activeAdventure(advs)) return { ok: false, why: 'away' };
  if (advs.filter((a) => a.startKey === key).length >= MAX_ADV_PER_DAY) return { ok: false, why: 'limit' };
  if (energyOf(key, logs, advs, breathKeys) < FULL) return { ok: false, why: 'energy' };
  return { ok: true };
}

// 돌아올 때 고르기: 퇴근길(18:30) · 밤(21:30) · 내일 아침(07:30). 지금보다 1시간 이상 뒤인 것만
export function returnOptions(nowMs) {
  const now = new Date(nowMs);
  const at = (dayOffset, h, m) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, h, m).getTime();
  const opts = [
    { key: 'evening', label: '퇴근길에', sub: '오늘 18:30', at: at(0, 18, 30) },
    { key: 'night', label: '자기 전에', sub: '오늘 21:30', at: at(0, 21, 30) },
    { key: 'morning', label: '내일 아침에', sub: '내일 07:30', at: at(1, 7, 30) },
  ];
  return opts.filter((o) => o.at - nowMs >= 3600000);
}

function seeded(str) {
  let h = 2166136261;
  for (const ch of String(str)) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return (h >>> 0) / 4294967296; };
}

// 마실 결과: 단계에 맞는 이야기(최근 12편 제외), 주워 온 것, 조약돌 8~15개
export function resolveAdventure(adv, stage, usedStories = []) {
  const rand = seeded(adv.id);
  const recent = new Set(usedStories.slice(-12));
  let pool = STORIES.map((s, i) => ({ ...s, i })).filter((s) => s.s <= stage && !recent.has(s.i));
  if (!pool.length) pool = STORIES.map((s, i) => ({ ...s, i })).filter((s) => s.s <= stage);
  const story = pool[Math.floor(rand() * pool.length)];
  return { storyIdx: story.i, find: FINDS[Math.floor(rand() * FINDS.length)], stones: 8 + Math.floor(rand() * 8) };
}

// 연속 기록: 오늘(또는 아직 안 했으면 어제)부터 거꾸로, 할 일을 하나라도 한 날이 이어진 수
export function streakOf(todayKey, logs) {
  const days = new Set(logs.map((l) => l.date));
  let k = days.has(todayKey) ? todayKey : addDays(todayKey, -1);
  let n = 0;
  while (days.has(k)) { n++; k = addDays(k, -1); }
  return n;
}

export function longestStreak(logs) {
  const days = [...new Set(logs.map((l) => l.date))].sort();
  let best = 0, cur = 0, prev = null;
  for (const d of days) {
    cur = prev && daysBetween(prev, d) === 1 ? cur + 1 : 1;
    best = Math.max(best, cur);
    prev = d;
  }
  return best;
}

// 지난 n일 하루하루 완료율 (0~1, 할 일이 없던 날은 null)
export function dailyRates(todayKey, n, goals, logs) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const k = addDays(todayKey, -i);
    const due = goals.filter((g) => activeOn(g, k));
    const done = logs.filter((l) => l.date === k && due.some((g) => g.id === l.goalId)).length;
    out.push({ key: k, rate: due.length ? done / due.length : null, done });
  }
  return out;
}
