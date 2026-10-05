// 수달과 강가 굴집 그리기 — 나노바나나로 만든 그림(art/)을 겹쳐서 조합한다 (2026-10-05 그림 교체)
// 수달 그림 9장(아기·꼬마·어른 × 기본·기쁨·졸림)은 모두 같은 틀(560×560, 발 높이 같음)이라
// 모자·목도리·손 소품을 같은 비율 좌표에 겹쳐 씌울 수 있다. (예전 SVG 버전: tools/otter-svg-legacy.js)

// 성장 5단계 → 그림 3벌 + 크기
const STAGE_ART = ['baby', 'baby', 'kid', 'kid', 'adult'];
export const SCALE = [0.8, 0.88, 0.92, 0.98, 1];

// 소품 위치 (그림 틀 기준 %, 왼쪽·위·너비·기울기). 머리 중심 x≈45%, 머리 꼭대기 y≈7%, 앞발 y≈45%
const SLOT = {
  // 그림 비율(높이/너비): 리본 .76 · 밀짚 .61 · 털모자 1.11(방울 포함) · 목도리 1.18 · 꽃 1.8 · 조개 1.08
  // 눈 y≈22%, 이마 y≈16%, 턱 y≈36%, 앞발 y≈45~50%
  ribbon: { x: 55, y: 3, w: 17, r: 18 },
  straw: { x: 17, y: -12, w: 58, r: -4 },
  beanie: { x: 24, y: -27, w: 43, r: -3 },
  scarf: { x: 28, y: 37, w: 34, r: 0 },
  flower: { x: 51, y: 35, w: 12, r: 10 },
  shell: { x: 39, y: 40, w: 14, r: 0 },
}
const ART = 'art';
export const otterSrc = (stage, mood) => `${ART}/otter/${STAGE_ART[stage] ?? 'baby'}_${mood === 'happy' || mood === 'sleepy' ? mood : 'idle'}.webp`;
export const itemSrc = (id) => `${ART}/item/${id}.webp`;

// 이름은 예전 그대로(otterSVG) — 화면 코드가 그대로 쓴다. fur는 그림이 한 벌이라 무시
export function otterSVG({ mood = 'idle', stage = 0, equip = {}, size = 180 } = {}) {
  const s = SCALE[stage] ?? 1;
  const acc = ['head', 'neck', 'hand'].map((slot) => equip[slot]).filter((id) => SLOT[id]).map((id) => {
    const p = SLOT[id];
    return `<img class="acc acc-${id}" src="${itemSrc(id)}" alt="" style="left:${p.x}%;top:${p.y}%;width:${p.w}%;rotate:${p.r}deg">`;
  }).join('');
  return `<span class="otter mood-${mood}" style="--size:${size}px" role="img" aria-label="수달">
    <span class="otter-body" style="scale:${s}"><img class="otter-img" src="${otterSrc(stage, mood)}" alt="" draggable="false">${acc}</span>
  </span>`;
}

// 굴집 꾸미기 소품 (풍경 기준 %)
const DECOR = {
  cairn: { x: 30, b: 22, w: 9 },
  lantern: { x: 3, b: 21, w: 7 },
  pot: { x: 70, b: 21, w: 10 },
};

export function sceneTime(hour) {
  if (hour < 6 || hour >= 20) return 'night';
  if (hour < 10) return 'morning';
  if (hour < 17) return 'day';
  return 'evening';
}

// 이름은 예전 그대로(sceneSVG). 그림 한 장 + 꾸미기 소품 + 마실 중 발자국
export function sceneSVG({ hour = 12, decor = [], away = false } = {}) {
  const t = sceneTime(hour);
  const items = decor.filter((id) => DECOR[id]).map((id) => {
    const p = DECOR[id];
    return `<img class="decor decor-${id}" src="${itemSrc(id)}" alt="" style="left:${p.x}%;bottom:${p.b}%;width:${p.w}%">`;
  }).join('');
  const steps = away ? `<svg class="steps" viewBox="0 0 120 30" aria-hidden="true"><g fill="#4A3628" opacity=".5">${[0, 1, 2, 3, 4].map((i) => `<ellipse cx="${10 + i * 25}" cy="${i % 2 ? 10 : 20}" rx="5" ry="3.6"/>`).join('')}</g></svg>` : '';
  return `<div class="scene scene-${t}" aria-hidden="true"><img class="scene-img" src="${ART}/scene/${t}.webp" alt="">${items}${steps}</div>`;
}
