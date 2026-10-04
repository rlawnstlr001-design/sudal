// 수달과 강가 굴집을 SVG로 그린다 (외주 일러스트 없이 코드로 조합)
// 수달: 털색 3종 × 표정 3종(기본·기쁨·졸림) × 성장 5단계(크기·머리 비율·꼬마 털) × 소품(머리·목·손)
import { FURS } from './content.js?v=202610041125';

const INK = '#2B2016';
export const SCALE = [0.7, 0.78, 0.86, 0.94, 1];

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const c = (sh) => Math.round(((n >> sh) & 255) * k).toString(16).padStart(2, '0');
  return `#${c(16)}${c(8)}${c(0)}`;
}

function eyes(mood) {
  if (mood === 'happy') {
    return `<path d="M77 80 q7 -9 14 0 M109 80 q7 -9 14 0" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  }
  if (mood === 'sleepy') {
    return `<path d="M77 79 q7 6 14 0 M109 79 q7 6 14 0" stroke="${INK}" stroke-width="3.6" fill="none" stroke-linecap="round"/>`;
  }
  return `<g class="eyes"><circle cx="84" cy="78" r="6" fill="${INK}"/><circle cx="116" cy="78" r="6" fill="${INK}"/>
    <circle cx="86" cy="76" r="2.1" fill="#fff"/><circle cx="118" cy="76" r="2.1" fill="#fff"/></g>`;
}

function headItem(id) {
  if (id === 'ribbon') return `<g transform="translate(128 44) rotate(18)"><path d="M0 0 L-16 -10 L-16 10 Z M0 0 L16 -10 L16 10 Z" fill="#D9473B"/><circle r="5" fill="#B83226"/></g>`;
  if (id === 'straw') return `<g><ellipse cx="100" cy="46" rx="56" ry="11" fill="#E8C77A"/><path d="M68 46 Q70 14 100 14 Q130 14 132 46 Z" fill="#EFD58F"/><rect x="69" y="36" width="62" height="7" rx="3" fill="#D9473B"/><path d="M50 46 q50 10 100 0" stroke="#C9A55A" stroke-width="2" fill="none"/></g>`;
  if (id === 'beanie') return `<g><path d="M58 60 Q58 20 100 20 Q142 20 142 60 Z" fill="#8FA77A"/><rect x="56" y="54" width="88" height="12" rx="6" fill="#7A9366"/><circle cx="100" cy="18" r="9" fill="#F4CBB0"/><path d="M72 40 v14 M86 32 v22 M100 30 v24 M114 32 v22 M128 40 v14" stroke="#7A9366" stroke-width="2"/></g>`;
  return '';
}
function neckItem(id) {
  if (id === 'scarf') return `<g><path d="M60 112 Q100 128 140 112 L142 124 Q100 140 58 124 Z" fill="#F0A986"/><path d="M118 124 l10 30 l-14 2 l-6 -28 Z" fill="#E8956E"/><path d="M66 118 q34 10 68 0" stroke="#fff" stroke-opacity=".5" stroke-width="2" fill="none" stroke-dasharray="4 4"/></g>`;
  return '';
}
function handItem(id) {
  if (id === 'flower') return `<g transform="translate(118 132)"><path d="M0 22 V0" stroke="#5E8B4A" stroke-width="3"/><g fill="#F7D35C">${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="5" ry="8" transform="rotate(${a}) translate(0 -8)"/>`).join('')}</g><circle r="4.5" fill="#E8956E"/></g>`;
  if (id === 'shell') return `<g transform="translate(118 140)"><path d="M-12 6 Q0 -18 12 6 Z" fill="#F6E4CC" stroke="#C99A6B" stroke-width="2"/><path d="M0 6 V-10 M-6 6 L-3 -8 M6 6 L3 -8" stroke="#C99A6B" stroke-width="1.5"/></g>`;
  return '';
}

// mood: 'idle' | 'happy' | 'sleepy'
export function otterSVG({ fur = 'brown', mood = 'idle', stage = 0, equip = {}, size = 180 } = {}) {
  const f = FURS.find((x) => x.key === fur) ?? FURS[0];
  const s = SCALE[stage] ?? 1;
  const baby = stage <= 1;
  const blush = mood === 'happy' ? 0.75 : 0.35;
  const dark = shade(f.body, 0.82); // 앞발은 털보다 조금 어둡게
  return `<svg class="otter mood-${mood}" viewBox="0 0 200 200" width="${size}" height="${size}" role="img" aria-label="수달">
    <g transform="translate(100 196) scale(${s}) translate(-100 -196)">
      <g class="otter-body">
        <path class="tail" d="M138 168 Q190 170 182 128 Q178 112 166 120 Q172 150 132 152 Z" fill="${f.body}"/>
        <ellipse cx="100" cy="136" rx="${baby ? 46 : 52}" ry="${baby ? 50 : 56}" fill="${f.body}"/>
        <ellipse cx="100" cy="146" rx="${baby ? 30 : 34}" ry="${baby ? 34 : 38}" fill="${f.belly}"/>
        <ellipse cx="78" cy="188" rx="15" ry="8" fill="${f.body}"/><ellipse cx="122" cy="188" rx="15" ry="8" fill="${f.body}"/>
        ${neckItem(equip.neck)}
        <g class="otter-head">
          <circle cx="66" cy="48" r="10" fill="${f.body}"/><circle cx="134" cy="48" r="10" fill="${f.body}"/>
          <circle cx="66" cy="49" r="4.5" fill="${INK}" opacity=".45"/><circle cx="134" cy="49" r="4.5" fill="${INK}" opacity=".45"/>
          <circle cx="100" cy="78" r="${baby ? 46 : 43}" fill="${f.body}"/>
          ${baby ? `<path d="M94 36 q4 -10 8 0 M100 35 q5 -12 10 -2" stroke="${f.body}" stroke-width="5" fill="none" stroke-linecap="round"/>` : ''}
          <ellipse cx="100" cy="94" rx="29" ry="20" fill="${f.belly}"/>
          <ellipse cx="72" cy="94" rx="9" ry="6" fill="#F08F86" opacity="${blush}"/><ellipse cx="128" cy="94" rx="9" ry="6" fill="#F08F86" opacity="${blush}"/>
          ${eyes(mood)}
          <ellipse cx="100" cy="88" rx="9" ry="6.2" fill="${INK}"/><ellipse cx="97" cy="86" rx="2.6" ry="1.6" fill="#fff" opacity=".6"/>
          <path d="M100 94 q-6 8 -12 2 M100 94 q6 8 12 2" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
          <g stroke="${INK}" stroke-opacity=".55" stroke-width="1.6" stroke-linecap="round">
            <path d="M80 96 L${stage >= 3 ? 52 : 58} 92 M80 100 L${stage >= 3 ? 52 : 58} 103 M120 96 L${stage >= 3 ? 148 : 142} 92 M120 100 L${stage >= 3 ? 148 : 142} 103"/>
          </g>
          ${headItem(equip.head)}
        </g>
        <g class="paws"><ellipse cx="88" cy="132" rx="9" ry="7" fill="${dark}"/><ellipse cx="112" cy="132" rx="9" ry="7" fill="${dark}"/>
          <path d="M84 136 v3 M88 137 v3 M92 136 v3 M108 136 v3 M112 137 v3 M116 136 v3" stroke="${f.belly}" stroke-width="1.6" stroke-linecap="round"/></g>
        ${handItem(equip.hand)}
      </g>
      ${mood === 'sleepy' ? '<text class="zzz" x="146" y="40" font-size="22" fill="#6FA3B5" font-weight="700">z</text><text class="zzz z2" x="160" y="22" font-size="16" fill="#6FA3B5" font-weight="700">z</text>' : ''}
    </g>
  </svg>`;
}

function decorItems(decor) {
  const out = [];
  if (decor.includes('cairn')) out.push('<g transform="translate(118 196)"><ellipse cx="0" cy="0" rx="16" ry="7" fill="#9AA3A8"/><ellipse cx="1" cy="-10" rx="12" ry="6" fill="#B8C0C4"/><ellipse cx="-1" cy="-19" rx="8" ry="5" fill="#CDD3D6"/></g>');
  if (decor.includes('lantern')) out.push('<g class="lantern" transform="translate(96 108)"><path d="M0 -14 V0" stroke="#5B4636" stroke-width="2"/><rect x="-8" y="0" width="16" height="20" rx="4" fill="#F7D35C"/><rect x="-8" y="0" width="16" height="20" rx="4" fill="none" stroke="#5B4636" stroke-width="2"/><circle cx="0" cy="10" r="14" fill="#F7D35C" opacity=".25"/></g>');
  if (decor.includes('pot')) out.push('<g transform="translate(300 196)"><path d="M-12 0 L-9 -18 H9 L12 0 Z" fill="#B9774E"/><path d="M-4 -18 q-6 -20 -2 -30 M0 -18 q2 -24 8 -32 M4 -18 q8 -14 12 -18" stroke="#5E8B4A" stroke-width="3" fill="none" stroke-linecap="round"/></g>');
  return out.join('');
}

// 강가 풍경. hour로 하늘색이 바뀐다 (아침·낮·저녁·밤)
export function sceneSVG({ hour = 12, decor = [], away = false } = {}) {
  const sky = hour < 6 || hour >= 20 ? ['#1F2840', '#2B3140'] : hour < 10 ? ['#FCE2CF', '#F4CBB0'] : hour < 17 ? ['#D9ECF2', '#F3EEDF'] : ['#F6C29F', '#E8A07E'];
  const night = hour < 6 || hour >= 20;
  return `<svg class="scene" viewBox="0 0 360 240" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs>
    <rect width="360" height="240" fill="url(#sky)"/>
    ${night ? '<g fill="#fff"><circle cx="40" cy="30" r="1.4"/><circle cx="120" cy="18" r="1.2"/><circle cx="250" cy="34" r="1.6"/><circle cx="320" cy="20" r="1.1"/><circle cx="200" cy="12" r="1"/></g><circle cx="300" cy="48" r="14" fill="#F6E4CC"/>' : `<circle cx="300" cy="50" r="18" fill="${hour < 17 ? '#FFF2C9' : '#FBD9A6'}"/>`}
    <path d="M0 150 Q80 110 170 140 T360 128 V240 H0 Z" fill="${night ? '#33405A' : '#B9C9A3'}"/>
    <path d="M0 176 Q120 150 230 170 T360 160 V240 H0 Z" fill="${night ? '#3D4A5F' : '#8FA77A'}"/>
    <g class="burrow"><path d="M18 206 Q18 120 92 120 Q164 120 164 206 Z" fill="#8A6A52"/><path d="M58 206 Q58 160 92 160 Q126 160 126 206 Z" fill="#4A3628"/><path d="M30 150 q20 -20 40 -6 M120 136 q16 -6 30 12" stroke="#6F523F" stroke-width="3" fill="none" stroke-linecap="round"/></g>
    <g class="reeds" stroke="#6E8A5C" stroke-width="3" stroke-linecap="round"><path d="M322 206 Q318 170 326 140"/><path d="M332 206 Q334 176 344 152"/><path d="M312 206 Q306 184 300 166"/><ellipse cx="326" cy="140" rx="3.5" ry="9" fill="#8A6A52" stroke="none"/><ellipse cx="344" cy="152" rx="3.5" ry="9" fill="#8A6A52" stroke="none"/></g>
    ${decorItems(decor)}
    <path d="M0 204 H360 V240 H0 Z" fill="#6FA3B5"/>
    <g class="waves" stroke="#fff" stroke-opacity=".55" stroke-width="2.5" fill="none" stroke-linecap="round"><path d="M20 216 q10 -6 20 0 t20 0"/><path d="M150 226 q10 -6 20 0 t20 0"/><path d="M270 214 q10 -6 20 0 t20 0"/></g>
    ${away ? '<g fill="#4A3628" opacity=".55"><ellipse cx="180" cy="200" rx="4" ry="3"/><ellipse cx="196" cy="196" rx="4" ry="3"/><ellipse cx="212" cy="200" rx="4" ry="3"/><ellipse cx="228" cy="196" rx="4" ry="3"/></g>' : ''}
  </svg>`;
}
