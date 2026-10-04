// 수달일기 — 할 일을 하면 수달에게 기운이 차고, 수달은 마실을 다녀와 이야기를 주워 온다
import * as db from './db.js?v=202610041125';
import { STORIES, LINES, STRUGGLES, PERSONALITIES, FURS, ITEMS, fill, josa } from './content.js?v=202610041125';
import {
  dayKey, growth, activeOn, energyOf, canStart, activeAdventure, returnOptions, resolveAdventure,
  streakOf, longestStreak, dailyRates, FULL, ENERGY_PER_GOAL, MAX_ADV_PER_DAY,
} from './game.js?v=202610041125';
import { otterSVG, sceneSVG, SCALE } from './otter.js?v=202610041125';
import { isApp, haptic, shareFile, scheduleCheckin, scheduleReturn, initNative } from './native.js?v=202610041125';
import { track } from './track.js?v=202610041125';

const $ = (s, el = document) => el.querySelector(s);
const view = $('#view');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const newId = () => (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
const STONES_PER_GOAL = 2;
// 최신 이모지(🪨🪴)는 오래된 기기에서 빈 네모로 나와 작은 그림으로 대신한다
const PEBBLE = '<svg viewBox="0 0 24 18" width="22" height="17" aria-hidden="true"><ellipse cx="12" cy="9" rx="11" ry="8" fill="#B8C0C4"/><ellipse cx="9" cy="6" rx="4" ry="2" fill="#fff" opacity=".6"/></svg>';
const ITEM_ICON = {
  ribbon: '🎀', straw: '👒', beanie: '🧶', scarf: '🧣', flower: '🌼', shell: '🐚', lantern: '🏮',
  cairn: '<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><ellipse cx="16" cy="27" rx="12" ry="4.5" fill="#9AA3A8"/><ellipse cx="16" cy="19" rx="9" ry="4" fill="#B8C0C4"/><ellipse cx="16" cy="12" rx="6" ry="3.5" fill="#CDD3D6"/></svg>',
  pot: '<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><path d="M9 30 L7 18 H25 L23 30 Z" fill="#B9774E"/><path d="M13 18 q-5 -10 -2 -15 M16 18 q1 -12 6 -16 M19 18 q6 -6 9 -9" stroke="#5E8B4A" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>',
};

const S = {
  pet: null,          // { name, fur, personality, bornKey, struggle }
  goals: [], logs: [], advs: [], notes: [],
  inv: { stones: 0, owned: [], equip: {}, decor: [] },
  settings: { checkinTime: '08:30', notify: null },
  breathKeys: [],
  cheer: 0,           // 방금 할 일을 끝낸 시각 (기쁜 표정 잠깐)
  line: null,
};
const today = () => dayKey(Date.now());
const name = () => S.pet?.name ?? '수달';
const nm = (pair) => josa(name(), pair);

// ---------- 저장 ----------
const saveKv = (k) => db.put('kv', S[k], k);

// ---------- 알림·시트 ----------
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 2300);
}
let closeSheet = null;
function openSheet(html, { onClose, cls = '' } = {}) {
  const root = $('#sheet-root');
  root.innerHTML = `<div class="sheet-back"></div><section class="sheet ${cls}" role="dialog" aria-modal="true"><span class="grip" aria-hidden="true"></span>${html}</section>`;
  root.classList.add('on');
  const close = () => { root.classList.remove('on'); root.innerHTML = ''; closeSheet = null; onClose?.(); };
  closeSheet = close;
  root.querySelector('.sheet-back').addEventListener('click', close);
  const sheet = root.querySelector('.sheet');
  sheet.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  return { sheet, close };
}
function updateStones() { $('#stone-count').textContent = S.inv.stones; }

// ---------- 첫 만남 (5화면) ----------
function onboarding() {
  document.body.dataset.route = 'onboard';
  const draft = { fur: 'brown', name: '', personality: 'warm', struggle: null, goals: [] };
  let step = 0;
  const steps = [
    () => `<p class="ob-k">1 / 5</p><h1>강가에서 아기 수달을 만났어요</h1><p class="ob-sub">어떤 털빛이었나요?</p>
      <div class="furs">${FURS.map((f) => `<button class="fur${f.key === draft.fur ? ' on' : ''}" data-fur="${f.key}">${otterSVG({ fur: f.key, mood: 'idle', stage: 0, size: 96 })}<span>${f.name}</span></button>`).join('')}</div>`,
    () => `<p class="ob-k">2 / 5</p>${otterSVG({ fur: draft.fur, mood: 'happy', stage: 0, size: 150 })}<h1>이름을 지어 주세요</h1>
      <input class="ob-input" id="ob-name" maxlength="8" placeholder="예: 몽이" value="${esc(draft.name)}" autocomplete="off">
      <div class="chips">${['몽이', '보리', '달곰', '토리', '콩떡'].map((x) => `<button class="chip" data-name="${x}">${x}</button>`).join('')}</div>`,
    () => `<p class="ob-k">3 / 5</p>${otterSVG({ fur: draft.fur, mood: 'idle', stage: 0, size: 130 })}<h1>${esc(josa(draft.name, '은/는'))} 어떤 수달인가요?</h1>
      <div class="chips big">${PERSONALITIES.map((p) => `<button class="chip${p.key === draft.personality ? ' on' : ''}" data-per="${p.key}">${p.name}</button>`).join('')}</div>`,
    () => `<p class="ob-k">4 / 5</p><h1>요즘 가장 챙기고 싶은 건?</h1><p class="ob-sub">${esc(josa(draft.name, '이/가'))} 같이 해 볼 할 일을 골라 드릴게요</p>
      <div class="chips big col">${STRUGGLES.map((x) => `<button class="chip${x.key === draft.struggle ? ' on' : ''}" data-str="${x.key}">${x.name}</button>`).join('')}</div>`,
    () => `<p class="ob-k">5 / 5</p><h1>오늘부터 같이 할 일</h1><p class="ob-sub">3개면 ${esc(josa(draft.name, '이/가'))} 마실을 나갈 기운이 차요. 언제든 바꿀 수 있어요.</p>
      <div class="ob-goals">${draft.goals.map((g, i) => `<label class="ob-goal"><input type="checkbox" data-gi="${i}" ${g.on ? 'checked' : ''}><span>${g.emoji}</span><input class="ob-gt" data-gt="${i}" value="${esc(g.title)}" maxlength="24"></label>`).join('')}</div>`,
  ];
  const ok = () => [true, !!draft.name.trim(), true, !!draft.struggle, draft.goals.some((g) => g.on && g.title.trim())][step];
  const draw = () => {
    view.innerHTML = `<section class="onboard">${steps[step]()}
      <div class="ob-nav">${step ? '<button class="btn" id="ob-back">이전</button>' : '<span></span>'}<button class="btn btn-main" id="ob-next" ${ok() ? '' : 'disabled'}>${step === 4 ? `${esc(josa(draft.name, '과/와'))} 시작하기` : '다음'}</button></div></section>`;
    const next = $('#ob-next');
    const refresh = () => { next.disabled = !ok(); };
    view.querySelectorAll('[data-fur]').forEach((b) => b.onclick = () => { draft.fur = b.dataset.fur; draw(); });
    const ni = $('#ob-name');
    if (ni) { ni.oninput = () => { draft.name = ni.value.trim(); refresh(); }; setTimeout(() => ni.focus(), 60); }
    view.querySelectorAll('[data-name]').forEach((b) => b.onclick = () => { draft.name = b.dataset.name; ni.value = draft.name; refresh(); });
    view.querySelectorAll('[data-per]').forEach((b) => b.onclick = () => { draft.personality = b.dataset.per; draw(); });
    view.querySelectorAll('[data-str]').forEach((b) => b.onclick = () => {
      draft.struggle = b.dataset.str;
      draft.goals = STRUGGLES.find((x) => x.key === draft.struggle).goals.map(([title, emoji]) => ({ title, emoji, on: true }));
      draw();
    });
    view.querySelectorAll('[data-gi]').forEach((c) => c.onchange = () => { draft.goals[c.dataset.gi].on = c.checked; refresh(); });
    view.querySelectorAll('[data-gt]').forEach((c) => c.oninput = () => { draft.goals[c.dataset.gt].title = c.value; refresh(); });
    $('#ob-back')?.addEventListener('click', () => { step--; draw(); });
    next.onclick = async () => {
      if (!ok()) return;
      if (step < 4) { step++; draw(); return; }
      S.pet = { name: draft.name.trim(), fur: draft.fur, personality: draft.personality, struggle: draft.struggle, bornKey: today() };
      await saveKv('pet');
      const goals = draft.goals.filter((g) => g.on && g.title.trim()).map((g, i) => ({ id: newId(), title: g.title.trim(), emoji: g.emoji, repeat: 'daily', sort: i, createdKey: today() }));
      S.goals = goals;
      await db.putMany('goals', goals);
      S.line = `안녕! 나는 ${name()}. 오늘부터 잘 부탁해!`;
      track('onboard');
      // 해시가 바뀌면 hashchange가 그린다 — 두 번 그리면 첫 인사 말풍선이 사라진다
      if (location.hash !== '#/') location.hash = '#/'; else render();
    };
  };
  draw();
}

// ---------- 굴집 (홈) ----------
function moodNow() {
  const h = new Date().getHours();
  if (Date.now() - S.cheer < 2600) return 'happy';
  if (h >= 22 || h < 6) return 'sleepy';
  if (energyOf(today(), S.logs, S.advs, S.breathKeys) >= FULL) return 'happy';
  return 'idle';
}
function pick(list, seed) { return list[Math.abs([...seed].reduce((a, c) => a * 31 + c.codePointAt(0), 7)) % list.length]; }
function lineNow() {
  if (S.line) return S.line;
  const h = new Date().getHours();
  const k = today();
  const due = S.goals.filter((g) => activeOn(g, k));
  const done = S.logs.filter((l) => l.date === k).length;
  const seed = `${k}-${h}`;
  // 마실을 보낼 수 있으면 그게 먼저 (다 했다는 말보다 다음 할 일을 알려 준다)
  if (energyOf(k, S.logs, S.advs, S.breathKeys) >= FULL && canStart(k, S.logs, S.advs, S.breathKeys).ok) return pick(LINES.full, seed);
  if (due.length && done >= due.length) return pick(LINES.allDone, seed);
  if (h >= 21 || h < 5) return pick(LINES.night, seed);
  if (h < 11 && !done) return pick(LINES.morning, seed);
  return pick(LINES.idle, seed);
}

function advPanel() {
  const k = today();
  const adv = activeAdventure(S.advs);
  if (adv && Date.now() >= adv.returnAt) {
    return `<button class="adv-btn back" id="adv-result">${esc(nm('이/가'))} 돌아왔어요! 이야기 듣기</button>`;
  }
  if (adv) {
    const t = new Date(adv.returnAt);
    return `<div class="adv-away">마실 중 · ${t.getDate() !== new Date().getDate() ? '내일 ' : ''}${t.getHours()}:${String(t.getMinutes()).padStart(2, '0')}에 돌아와요<small data-left="${adv.returnAt}"></small></div>`;
  }
  const can = canStart(k, S.logs, S.advs, S.breathKeys);
  if (can.ok) return `<button class="adv-btn" id="adv-go">마실 보내기</button>`;
  if (can.why === 'limit') return `<div class="adv-away">오늘 마실은 두 번 다녀왔어요. 내일 또!</div>`;
  return '';
}

function renderHome() {
  const k = today();
  const g = growth(S.pet.bornKey, k);
  const adv = activeAdventure(S.advs);
  const away = !!adv && Date.now() < adv.returnAt;
  const energy = energyOf(k, S.logs, S.advs, S.breathKeys);
  const due = S.goals.filter((x) => activeOn(x, k)).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  const doneIds = new Set(S.logs.filter((l) => l.date === k).map((l) => l.goalId));
  const doneCount = due.filter((x) => doneIds.has(x.id)).length;
  view.innerHTML = `<section class="home">
    <div class="stage-card">
      ${sceneSVG({ hour: new Date().getHours(), decor: S.inv.decor, away })}
      ${away ? '' : `<div class="pet-wrap"><div class="bubble">${esc(lineNow())}</div><button class="pet" id="pet" style="margin-top:-${Math.round((1 - SCALE[g.stage]) * 150 * 0.8)}px" aria-label="${esc(name())} 쓰다듬기">${otterSVG({ fur: S.pet.fur, mood: moodNow(), stage: g.stage, equip: S.inv.equip, size: 150 })}</button></div>`}
      <div class="nametag"><b>${esc(name())}</b> · ${g.name} · ${g.day}일째${g.toNext ? ` <small>(${g.toNext}일 뒤 자라요)</small>` : ''}</div>
    </div>
    <div class="energy">
      <span class="e-label">기운</span>
      <span class="e-bar"><i style="width:${energy}%"></i></span>
      <span class="e-num">${energy}%</span>
    </div>
    ${advPanel()}
    <h2 class="h">오늘 할 일 <small>${doneCount}/${due.length}</small><button class="text-btn" id="add-goal">＋ 할 일</button></h2>
    <ul class="goals">
      ${due.map((x) => `<li><button class="goal${doneIds.has(x.id) ? ' done' : ''}" data-goal="${x.id}">
        <span class="g-emoji">${esc(x.emoji || '🌱')}</span><span class="g-title">${esc(x.title)}</span><span class="g-check" aria-hidden="true"></span></button>
        <button class="g-more" data-edit="${x.id}" aria-label="할 일 고치기">⋯</button></li>`).join('') || '<li class="none">오늘 할 일이 없어요. ＋ 할 일로 추가해 보세요</li>'}
    </ul>
    <p class="hint">할 일 하나에 기운 ${ENERGY_PER_GOAL}% · 조약돌 ${STONES_PER_GOAL}개. 기운이 가득 차면 ${esc(nm('이/가'))} 마실을 나갈 수 있어요 (하루 ${MAX_ADV_PER_DAY}번).</p>
    <div class="tools">
      <button class="tool" id="t-breath"><span>🌬️</span>호흡 1분<small>${S.breathKeys.includes(k) ? '오늘 했어요' : '기운 +10'}</small></button>
      <button class="tool" id="t-thanks"><span>✍️</span>감사 한 줄<small>${S.notes.some((n) => n.key === k) ? '오늘 썼어요' : '일기장에 남아요'}</small></button>
      <button class="tool" id="t-shop"><span>🎀</span>꾸미기<small>조약돌 ${S.inv.stones}개</small></button>
    </div>
  </section>`;
  S.line = null;
  view.querySelector('.goals').addEventListener('click', (e) => {
    const ed = e.target.closest('[data-edit]');
    if (ed) { goalSheet(S.goals.find((x) => x.id === ed.dataset.edit)); return; }
    const b = e.target.closest('[data-goal]');
    if (b) toggleGoal(b.dataset.goal);
  });
  $('#add-goal').onclick = () => goalSheet();
  $('#adv-go')?.addEventListener('click', startAdventureSheet);
  $('#adv-result')?.addEventListener('click', showResult);
  $('#t-breath').onclick = breathSheet;
  $('#t-thanks').onclick = thanksSheet;
  $('#t-shop').onclick = shopSheet;
  $('#pet')?.addEventListener('click', () => {
    S.cheer = Date.now();
    S.line = pick(LINES.idle.concat(LINES.done), String(Date.now()));
    haptic();
    renderHome();
  });
  tickAway();
}

let awayTimer;
function tickAway() {
  clearInterval(awayTimer);
  const el = view.querySelector('[data-left]');
  if (!el) return;
  const at = Number(el.dataset.left);
  const tick = () => {
    const ms = at - Date.now();
    if (ms <= 0) { clearInterval(awayTimer); render(); return; }
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
    el.textContent = ` · ${h ? `${h}시간 ` : ''}${m}분 남음`;
  };
  tick();
  awayTimer = setInterval(tick, 30000);
}

async function toggleGoal(id) {
  const k = today();
  const lid = `${k}:${id}`;
  const was = S.logs.find((l) => l.id === lid);
  if (was) {
    S.logs = S.logs.filter((l) => l.id !== lid);
    await db.del('logs', lid);
    S.inv.stones = Math.max(0, S.inv.stones - STONES_PER_GOAL);
  } else {
    const before = energyOf(k, S.logs, S.advs, S.breathKeys);
    const log = { id: lid, goalId: id, date: k, doneAt: Date.now() };
    S.logs.push(log);
    await db.put('logs', log);
    S.inv.stones += STONES_PER_GOAL;
    S.cheer = Date.now();
    const after = energyOf(k, S.logs, S.advs, S.breathKeys);
    S.line = after >= FULL && before < FULL ? pick(LINES.full, lid) : pick(LINES.done, lid);
    haptic('medium');
    track('goal_done');
    setTimeout(() => { if (currentRoute() === 'home') renderHome(); }, 2700); // 기쁜 표정이 끝나면 원래대로
  }
  await saveKv('inv');
  updateStones();
  renderHome();
}

// ---------- 할 일 추가·고치기 ----------
const DAYS = '일월화수목금토';
function goalSheet(goal = null) {
  const isNew = !goal;
  let repeat = goal?.repeat ?? 'daily';
  const days = new Set(Array.isArray(repeat) ? repeat : []);
  const emojis = ['🌱', '💧', '🚶', '📝', '🧹', '📚', '🌙', '🍎', '🧘', '🎧', '☀️', '🛁'];
  let emoji = goal?.emoji ?? '🌱';
  const { sheet, close } = openSheet(`
    <h2 class="sheet-title">${isNew ? '할 일 추가' : '할 일 고치기'}</h2>
    <input class="field" id="g-title" maxlength="24" placeholder="예: 물 한 잔 마시기" value="${esc(goal?.title ?? '')}">
    <div class="emojis">${emojis.map((e) => `<button class="emo${e === emoji ? ' on' : ''}" data-emo="${e}">${e}</button>`).join('')}</div>
    <div class="seg" id="g-rep"><button data-r="daily" class="${repeat === 'daily' ? 'on' : ''}">매일</button><button data-r="days" class="${repeat !== 'daily' ? 'on' : ''}">요일 고르기</button></div>
    <div class="days" id="g-days" ${repeat === 'daily' ? 'hidden' : ''}>${[...DAYS].map((d, i) => `<button class="day${days.has(i) ? ' on' : ''}" data-d="${i}">${d}</button>`).join('')}</div>
    <button class="btn btn-main btn-wide" id="g-save">${isNew ? '추가' : '저장'}</button>
    ${isNew ? '' : '<button class="text-btn danger" id="g-del">이 할 일 그만하기</button>'}`);
  sheet.querySelector('.emojis').addEventListener('click', (e) => {
    const b = e.target.closest('[data-emo]'); if (!b) return;
    emoji = b.dataset.emo;
    sheet.querySelectorAll('.emo').forEach((x) => x.classList.toggle('on', x === b));
  });
  sheet.querySelector('#g-rep').addEventListener('click', (e) => {
    const b = e.target.closest('[data-r]'); if (!b) return;
    repeat = b.dataset.r === 'daily' ? 'daily' : 'days';
    sheet.querySelectorAll('#g-rep button').forEach((x) => x.classList.toggle('on', x === b));
    sheet.querySelector('#g-days').hidden = repeat === 'daily';
  });
  sheet.querySelector('#g-days').addEventListener('click', (e) => {
    const b = e.target.closest('[data-d]'); if (!b) return;
    const d = Number(b.dataset.d);
    days.has(d) ? days.delete(d) : days.add(d);
    b.classList.toggle('on', days.has(d));
  });
  sheet.querySelector('#g-save').onclick = async () => {
    const title = sheet.querySelector('#g-title').value.trim();
    if (!title) { toast('할 일을 적어 주세요'); return; }
    if (repeat !== 'daily' && !days.size) { toast('요일을 하나 이상 골라 주세요'); return; }
    const rec = goal ?? { id: newId(), sort: S.goals.length, createdKey: today() };
    Object.assign(rec, { title, emoji, repeat: repeat === 'daily' ? 'daily' : [...days].sort() });
    if (isNew) S.goals.push(rec);
    await db.put('goals', rec);
    close();
    render();
  };
  sheet.querySelector('#g-del')?.addEventListener('click', async () => {
    goal.archived = true; // 지난 기록·통계는 남긴다
    await db.put('goals', goal);
    close();
    render();
    toast('할 일을 내려놓았어요. 지난 기록은 남아 있어요');
  });
  if (isNew) setTimeout(() => sheet.querySelector('#g-title').focus(), 80);
}

// ---------- 마실 ----------
function startAdventureSheet() {
  const opts = returnOptions(Date.now());
  const g = growth(S.pet.bornKey, today());
  const { sheet, close } = openSheet(`
    <div class="adv-start">${otterSVG({ fur: S.pet.fur, mood: 'happy', stage: g.stage, equip: S.inv.equip, size: 120 })}
      <h2 class="sheet-title">${esc(nm('이/가'))} 마실을 나가요</h2>
      <p class="sub">언제 돌아오면 좋을까요? 돌아오면 이야기와 조약돌을 가져와요.</p>
      <div class="opts">${opts.map((o) => `<button class="opt" data-at="${o.at}"><b>${o.label}</b><small>${o.sub}</small></button>`).join('')}</div>
    </div>`);
  sheet.querySelector('.opts').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-at]'); if (!b) return;
    const k = today();
    if (!canStart(k, S.logs, S.advs, S.breathKeys).ok) { close(); return; }
    const adv = { id: newId(), startKey: k, startedAt: Date.now(), returnAt: Number(b.dataset.at), seenAt: null };
    S.advs.push(adv);
    await db.put('advs', adv);
    scheduleReturn(adv.returnAt, `${nm('이/가')} 돌아왔어요`, '마실에서 뭘 주워 왔을까요? 이야기를 들어 보세요');
    track('adv_start');
    haptic('medium');
    close();
    toast(`${nm('이/가')} 신나게 나갔어요!`);
    render();
  });
}

async function showResult() {
  const adv = activeAdventure(S.advs);
  if (!adv || Date.now() < adv.returnAt) return;
  const g = growth(S.pet.bornKey, today());
  if (adv.storyIdx == null) {
    const used = S.advs.filter((a) => a.storyIdx != null).sort((a, b) => a.startedAt - b.startedAt).map((a) => a.storyIdx);
    Object.assign(adv, resolveAdventure(adv, g.stage, used));
    await db.put('advs', adv);
  }
  const story = fill(STORIES[adv.storyIdx].t, name());
  const { sheet, close } = openSheet(`
    <div class="result">
      ${otterSVG({ fur: S.pet.fur, mood: 'happy', stage: g.stage, equip: S.inv.equip, size: 130 })}
      <p class="r-k">마실 이야기</p>
      <p class="r-story">${esc(story)}</p>
      <div class="r-find"><span>주워 온 것</span><b>${esc(adv.find)}</b></div>
      <p class="r-q">${esc(nm('이/가'))} 이걸 좋아할까요?</p>
      <div class="row2"><button class="btn" data-react="meh">글쎄…</button><button class="btn btn-main" data-react="love">좋아할 거야!</button></div>
      <p class="r-stones">조약돌 +${adv.stones}</p>
    </div>`, { cls: 'result-sheet' });
  sheet.querySelector('.row2').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-react]'); if (!b) return;
    adv.reaction = b.dataset.react;
    adv.seenAt = Date.now();
    await db.put('advs', adv);
    S.inv.stones += adv.stones;
    await saveKv('inv');
    updateStones();
    track('adv_return');
    haptic('medium');
    close();
    S.line = adv.reaction === 'love' ? '역시 내 마음 알아줄 줄 알았어!' : '흠… 그래도 예쁘지 않아?';
    S.cheer = Date.now();
    toast('일기장에 오늘 이야기가 남았어요');
    render();
  });
}

// ---------- 작은 도구 ----------
function breathSheet() {
  const { sheet, close } = openSheet(`
    <div class="breath"><h2 class="sheet-title">호흡 1분</h2>
      <div class="b-circle" id="b-circle"><span id="b-say">시작을 누르세요</span></div>
      <p class="sub" id="b-left">들이쉬기 4초 · 내쉬기 4초</p>
      <button class="btn btn-main btn-wide" id="b-start">시작</button></div>`, { onClose: () => clearInterval(timer) });
  let timer;
  sheet.querySelector('#b-start').onclick = () => {
    const btn = sheet.querySelector('#b-start');
    btn.disabled = true;
    const circle = sheet.querySelector('#b-circle');
    const say = sheet.querySelector('#b-say');
    const left = sheet.querySelector('#b-left');
    let t = 0;
    circle.classList.add('run');
    const step = async () => {
      const phase = Math.floor(t / 4) % 2;
      say.textContent = phase === 0 ? '들이쉬고…' : '내쉬고…';
      left.textContent = `${60 - t}초`;
      if (t >= 60) {
        clearInterval(timer);
        circle.classList.remove('run');
        say.textContent = '잘했어요';
        const k = today();
        if (!S.breathKeys.includes(k)) {
          S.breathKeys.push(k);
          await saveKv('breathKeys');
          S.inv.stones += 1;
          await saveKv('inv');
          updateStones();
          toast(`기운 +10 · 조약돌 +1`);
        }
        setTimeout(() => { close(); render(); }, 900);
      }
      t++;
    };
    step();
    timer = setInterval(step, 1000);
  };
}

function thanksSheet() {
  const { sheet, close } = openSheet(`
    <h2 class="sheet-title">감사 한 줄</h2>
    <p class="sub">오늘 고마웠던 것 하나. 작아도 괜찮아요.</p>
    <textarea class="field" id="n-text" rows="3" maxlength="200" placeholder="예: 점심에 먹은 김치찌개가 맛있었다"></textarea>
    <button class="btn btn-main btn-wide" id="n-save">일기장에 남기기</button>`);
  setTimeout(() => sheet.querySelector('#n-text').focus(), 80);
  sheet.querySelector('#n-save').onclick = async () => {
    const text = sheet.querySelector('#n-text').value.trim();
    if (!text) { toast('한 줄만 적어 주세요'); return; }
    const n = { id: newId(), key: today(), text, createdAt: Date.now() };
    S.notes.push(n);
    await db.put('notes', n);
    close();
    S.line = '고마운 일이 있었구나. 나도 기뻐!';
    S.cheer = Date.now();
    render();
  };
}

// ---------- 꾸미기 상점 (조약돌로만, 꾸미기만) ----------
function shopSheet() {
  const g = growth(S.pet.bornKey, today());
  const draw = () => `
    <h2 class="sheet-title">꾸미기 <small>조약돌 ${S.inv.stones}개</small></h2>
    <div class="shop-pet">${otterSVG({ fur: S.pet.fur, mood: 'happy', stage: g.stage, equip: S.inv.equip, size: 120 })}</div>
    <div class="items">${ITEMS.map((it) => {
      const owned = S.inv.owned.includes(it.id);
      const on = it.slot === 'decor' ? S.inv.decor.includes(it.id) : S.inv.equip[it.slot] === it.id;
      return `<button class="item${on ? ' on' : ''}" data-item="${it.id}"><span class="i-ico">${ITEM_ICON[it.id]}</span><b>${it.name}</b><small>${owned ? (on ? (it.slot === 'decor' ? '굴집에 둠' : '착용 중') : (it.slot === 'decor' ? '두기' : '입히기')) : `${PEBBLE} ${it.price}`}</small></button>`;
    }).join('')}</div>
    <p class="sub">기운이나 마실 시간은 팔지 않아요. 조약돌은 할 일·마실·호흡으로만 모입니다.</p>`;
  const { sheet } = openSheet(`<div id="shop">${draw()}</div>`, { onClose: () => render() });
  sheet.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-item]'); if (!b) return;
    const it = ITEMS.find((x) => x.id === b.dataset.item);
    if (!S.inv.owned.includes(it.id)) {
      if (S.inv.stones < it.price) { toast(`조약돌이 ${it.price - S.inv.stones}개 모자라요`); return; }
      S.inv.stones -= it.price;
      S.inv.owned.push(it.id);
      track('shop_buy');
      haptic('medium');
    }
    if (it.slot === 'decor') {
      S.inv.decor = S.inv.decor.includes(it.id) ? S.inv.decor.filter((x) => x !== it.id) : [...S.inv.decor, it.id];
    } else {
      S.inv.equip = { ...S.inv.equip, [it.slot]: S.inv.equip[it.slot] === it.id ? null : it.id };
    }
    await saveKv('inv');
    updateStones();
    sheet.querySelector('#shop').innerHTML = draw();
  });
}

// ---------- 일기장 ----------
function renderDiary() {
  const advs = S.advs.filter((a) => a.seenAt).sort((a, b) => b.seenAt - a.seenAt);
  const notes = [...S.notes].sort((a, b) => b.createdAt - a.createdAt);
  const finds = advs.map((a) => a.find);
  const fmt = (ms) => { const d = new Date(ms); return `${d.getMonth() + 1}월 ${d.getDate()}일`; };
  view.innerHTML = `<section class="diary">
    <h1 class="page-title">${esc(name())}의 일기장</h1>
    <div class="treasure"><span>보물함</span><b>${finds.length}개</b><p>${finds.slice(0, 12).map(esc).join(' · ') || '마실을 다녀오면 주워 온 것이 여기 모여요'}</p></div>
    <h2 class="h">마실 이야기</h2>
    <ul class="entries">${advs.map((a) => `<li class="entry"><span class="e-date">${fmt(a.seenAt)}</span><p>${esc(fill(STORIES[a.storyIdx].t, name()))}</p><small>주워 온 것: ${esc(a.find)} ${a.reaction === 'love' ? '💛' : '🤔'}</small></li>`).join('') || '<li class="none">아직 이야기가 없어요. 기운을 채워 마실을 보내 보세요</li>'}</ul>
    <h2 class="h">나의 감사 한 줄</h2>
    <ul class="entries notes">${notes.map((n) => `<li class="entry"><span class="e-date">${fmt(n.createdAt)}</span><p>${esc(n.text)}</p></li>`).join('') || '<li class="none">굴집의 ✍️ 감사 한 줄로 남겨 보세요</li>'}</ul>
  </section>`;
}

// ---------- 기록 ----------
function renderStats() {
  const k = today();
  const g = growth(S.pet.bornKey, k);
  const rates = dailyRates(k, 28, S.goals, S.logs);
  const week = rates.slice(-7).filter((r) => r.rate != null);
  const weekRate = week.length ? Math.round((week.reduce((s, r) => s + r.rate, 0) / week.length) * 100) : 0;
  const perGoal = S.goals.filter((x) => !x.archived).map((x) => {
    const due = rates.filter((r) => activeOn(x, r.key) && r.key >= (x.createdKey ?? '')).length;
    const done = S.logs.filter((l) => l.goalId === x.id && rates.some((r) => r.key === l.date)).length;
    return { x, pct: due ? Math.round((done / due) * 100) : 0 };
  });
  view.innerHTML = `<section class="stats">
    <h1 class="page-title">기록</h1>
    <dl class="nums">
      <div><dt>연속</dt><dd>${streakOf(k, S.logs)}일</dd></div>
      <div><dt>최장 연속</dt><dd>${longestStreak(S.logs)}일</dd></div>
      <div><dt>이번 주</dt><dd>${weekRate}%</dd></div>
      <div><dt>함께한 날</dt><dd>${g.day}일</dd></div>
    </dl>
    <h2 class="h">지난 4주 <small>조약돌이 짙을수록 많이 했어요</small></h2>
    <div class="pebbles">${[...DAYS].map((d) => `<span class="ph">${d}</span>`).join('')}
      ${Array.from({ length: new Date(rates[0].key.replace(/-/g, '/')).getDay() }, () => '<span></span>').join('')}
      ${rates.map((r) => `<i class="pb${r.key === k ? ' today' : ''}" style="--o:${r.rate == null ? 0.08 : 0.15 + r.rate * 0.85}" title="${r.key}"></i>`).join('')}</div>
    <h2 class="h">할 일별</h2>
    <ul class="pergoal">${perGoal.map(({ x, pct }) => `<li><span>${esc(x.emoji)} ${esc(x.title)}</span><i style="--w:${pct}%"></i><b>${pct}%</b></li>`).join('')}</ul>
    <p class="sub">마실 ${S.advs.filter((a) => a.seenAt).length}번 · 감사 한 줄 ${S.notes.length}개</p>
    <button class="btn btn-main btn-wide" id="share">오늘의 ${esc(name())} 카드 공유</button>
  </section>`;
  $('#share').onclick = shareCard;
}

// ---------- 공유 카드 (1080×1350) ----------
function svgToImage(svg) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
  });
}
async function shareCard() {
  const k = today();
  const g = growth(S.pet.bornKey, k);
  const due = S.goals.filter((x) => activeOn(x, k)).length;
  const done = S.logs.filter((l) => l.date === k).length;
  const W = 1080, H = 1350;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  try { await document.fonts.load('60px Gaegu'); } catch { /* 없음 */ }
  c.fillStyle = '#FBF4EC'; c.fillRect(0, 0, W, H);
  // 크기를 박아 넣어야 slice(꽉 채우기)가 적용된다
  const scene = await svgToImage(sceneSVG({ hour: new Date().getHours(), decor: S.inv.decor }).replace('<svg ', '<svg width="960" height="720" '));
  c.save(); c.beginPath(); c.roundRect(60, 60, W - 120, 720, 48); c.clip();
  c.drawImage(scene, 60, 60, W - 120, 720);
  c.restore();
  const otter = await svgToImage(otterSVG({ fur: S.pet.fur, mood: 'happy', stage: g.stage, equip: S.inv.equip, size: 520 }));
  c.drawImage(otter, (W - 520) / 2, 260, 520, 520);
  c.fillStyle = '#4A3628'; c.font = '700 84px Gaegu, sans-serif';
  c.fillText(`${name()} · ${g.day}일째`, 80, 900);
  c.font = '400 56px Gaegu, sans-serif'; c.fillStyle = '#6F523F';
  c.fillText(`${g.name} · 오늘 할 일 ${done}/${due} · 연속 ${streakOf(k, S.logs)}일`, 80, 990);
  c.fillText(`마실 ${S.advs.filter((a) => a.seenAt).length}번 다녀왔어요`, 80, 1070);
  c.fillStyle = '#8FA77A'; c.font = '700 52px Gaegu, sans-serif';
  c.fillText('수달일기', 80, H - 90);
  const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
  track('share');
  const fname = `sudal-${k}.png`;
  if (isApp) { await shareFile(blob, fname, `오늘의 ${name()}`); return; }
  const file = new File([blob], fname, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return; } catch (e) { if (e?.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = fname; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('카드를 저장했어요');
}

// ---------- 설정 ----------
function exportJson() {
  const data = { app: 'sudal', version: 1, exportedAt: new Date().toISOString(), pet: S.pet, goals: S.goals, logs: S.logs, advs: S.advs, notes: S.notes, inv: S.inv, breathKeys: S.breathKeys };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const fname = `sudal-${today()}.json`;
  if (isApp) { shareFile(blob, fname, '수달일기 백업'); return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = fname; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
async function importJson(file) {
  try {
    const d = JSON.parse(await file.text());
    if (d.app !== 'sudal' || !d.pet) throw new Error();
    if (!confirm(`백업 파일(수달: ${d.pet.name})로 지금 기록을 덮어쓸까요? 지금 기록은 사라져요.`)) return;
    for (const s of ['goals', 'logs', 'advs', 'notes']) {
      const cur = await db.getAll(s);
      for (const x of cur) await db.del(s, x.id);
      if (d[s]?.length) await db.putMany(s, d[s]);
      S[s] = d[s] ?? [];
    }
    Object.assign(S, { pet: d.pet, inv: d.inv ?? S.inv, breathKeys: d.breathKeys ?? [] });
    await saveKv('pet'); await saveKv('inv'); await saveKv('breathKeys');
    toast('백업을 불러왔어요');
    render();
  } catch { toast('수달일기 백업 파일이 아니에요'); }
}
function showSettings() {
  const { sheet } = openSheet(`
    <h2 class="sheet-title">설정</h2>
    ${isApp ? `<label class="rowlab">${esc(name())}의 아침 인사 <select id="s-time"><option value="">받지 않음</option>${['07:00', '07:30', '08:00', '08:30', '09:00', '10:00'].map((t) => `<option ${S.settings.notify && S.settings.checkinTime === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <p class="sub">알림은 하루 최대 2번: 아침 인사 + 마실에서 돌아올 때.</p>` : '<p class="sub">앱을 설치하면 아침 인사와 마실 귀환 알림을 받을 수 있어요.</p>'}
    <label class="rowlab">수달 이름 <input id="s-name" maxlength="8" value="${esc(name())}"></label>
    <h3 class="set-h">백업</h3>
    <div class="row2"><button class="btn" id="s-export">백업 파일 받기</button><label class="btn">불러오기<input type="file" id="s-import" accept="application/json,.json" hidden></label></div>
    <p class="sub">기록은 이 기기 안에만 저장돼요. 폰을 바꾸기 전에 백업 파일을 받아 두세요.</p>
    <p class="sub small">수달일기는 생활 습관을 돕는 앱이며 의료 서비스가 아니에요.</p>
    <p class="fine"><a href="privacy.html">개인정보처리방침</a> · 버전 ${esc(window.APP_VERSION ?? 'web')}</p>`);
  sheet.querySelector('#s-time')?.addEventListener('change', async (e) => {
    const t = e.target.value;
    if (t) S.settings.checkinTime = t;
    const ok = await scheduleCheckin(t || null, name(), pick(LINES.morning, t), true);
    S.settings.notify = !!t && ok;
    await saveKv('settings');
    toast(!t ? '아침 인사를 껐어요' : ok ? `매일 ${t}에 ${nm('이/가')} 인사해요` : '알림 권한이 필요해요 (휴대폰 설정 → 앱 → 수달일기 → 알림)');
  });
  sheet.querySelector('#s-name').addEventListener('change', async (e) => {
    const v = e.target.value.trim();
    if (!v) return;
    S.pet.name = v;
    await saveKv('pet');
    toast('이름을 바꿨어요');
  });
  sheet.querySelector('#s-export').onclick = exportJson;
  sheet.querySelector('#s-import').onchange = (e) => e.target.files[0] && importJson(e.target.files[0]);
}
$('#btn-settings').addEventListener('click', () => S.pet && showSettings());
$('#btn-shop').addEventListener('click', () => S.pet && shopSheet());

// ---------- 라우터 ----------
function currentRoute() {
  const h = location.hash || '#/';
  if (h.startsWith('#/diary')) return 'diary';
  if (h.startsWith('#/stats')) return 'stats';
  return 'home';
}
function render() {
  if (!S.pet) { onboarding(); return; }
  const r = currentRoute();
  document.body.dataset.route = r;
  document.querySelectorAll('.tabbar a').forEach((a) => a.classList.toggle('on', a.dataset.tab === r));
  updateStones();
  if (r === 'diary') renderDiary();
  else if (r === 'stats') renderStats();
  else renderHome();
}
window.addEventListener('hashchange', () => { window.scrollTo(0, 0); render(); });

async function init() {
  const [goals, logs, advs, notes, pet, inv, settings, breathKeys] = await Promise.all([
    db.getAll('goals'), db.getAll('logs'), db.getAll('advs'), db.getAll('notes'),
    db.get('kv', 'pet'), db.get('kv', 'inv'), db.get('kv', 'settings'), db.get('kv', 'breathKeys'),
  ]);
  Object.assign(S, { goals, logs, advs, notes, pet: pet ?? null });
  if (inv) S.inv = { ...S.inv, ...inv };
  if (settings) S.settings = { ...S.settings, ...settings };
  if (breathKeys) S.breathKeys = breathKeys;
  initNative({
    onBack: () => {
      if (closeSheet) { closeSheet(); return true; }
      if (currentRoute() !== 'home') { location.hash = '#/'; return true; }
      return false;
    },
    onOpenHash: (h) => { location.hash = h; },
    onResume: () => render(),
  });
  render();
  // 돌아와 있는 마실이 있으면 바로 이야기를 들려준다
  const adv = activeAdventure(S.advs);
  if (S.pet && adv && Date.now() >= adv.returnAt && currentRoute() === 'home') setTimeout(showResult, 600);
  if (S.pet && S.settings.notify) scheduleCheckin(S.settings.checkinTime, name(), pick(LINES.morning, today()));
  track('visit');
  db.askPersist();
}
init();
