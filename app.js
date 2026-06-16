/* ============================================================================
   Best Countries Map — an interactive 3D globe that ranks the world on 19 things
   that make a place good to live & work. Each country is painted green (best) to
   red (worst). Pick one dimension to map it alone, or set your own priority weights
   (or a preset) and the whole map rebuilds into a weighted "overall livability".
   Engine: globe.gl. Data: data/countries.js (see build_scores.py + About for sources).
   ========================================================================== */
'use strict';

/* ----------------------------- dimensions -------------------------------- */
const DIMS = [
  {key:'healthcare',    name:'Healthcare',        ic:'🏥', g:'Health & safety',        desc:'Quality & accessibility of medical care'},
  {key:'health',        name:'Population health', ic:'🫀', g:'Health & safety',        desc:'How healthy & long-lived people are'},
  {key:'safety',        name:'Safety & stability',ic:'🛡️', g:'Health & safety',        desc:'Low crime, peace, political stability'},
  {key:'cleanliness',   name:'Clean environment', ic:'💧', g:'Health & safety',        desc:'Clean air & water, low pollution'},
  {key:'governance',    name:'Govt integrity',    ic:'🏛️', g:'Society & freedom',      desc:'Low corruption, rule of law, effectiveness'},
  {key:'freedom',       name:'Personal freedom',  ic:'🕊️', g:'Society & freedom',      desc:'Civil liberties, press, expression'},
  {key:'education',     name:'Education',          ic:'🎓', g:'Society & freedom',      desc:'Schools & universities, learning outcomes'},
  {key:'openness',      name:'Openness',          ic:'🤝', g:'Society & freedom',      desc:'Ease of settling in, acceptance, English'},
  {key:'opportunity',   name:'Opportunity & jobs',ic:'💼', g:'Money & work',           desc:'Income, employment, prospects'},
  {key:'affordability', name:'Affordability',     ic:'💰', g:'Money & work',           desc:'Cost of living vs local wages'},
  {key:'tax',           name:'Low tax burden',    ic:'🧾', g:'Money & work',           desc:'Lighter overall taxation'},
  {key:'worklife',      name:'Work–life balance', ic:'☕', g:'Money & work',           desc:'Leisure, leave, reasonable hours'},
  {key:'infrastructure',name:'Infrastructure',    ic:'🛰️', g:'Money & work',           desc:'Transport, utilities, internet'},
  {key:'climate',       name:'Climate',           ic:'☀️', g:'Place, culture & soul',  desc:'Pleasant, comfortable weather'},
  {key:'landscape',     name:'Landscape & nature',ic:'🏔️', g:'Place, culture & soul',  desc:'Scenic beauty, access to nature'},
  {key:'food',          name:'Food',              ic:'🍽️', g:'Place, culture & soul',  desc:'Quality & deliciousness of cuisine'},
  {key:'culture',       name:'Arts & culture',    ic:'🎭', g:'Place, culture & soul',  desc:'Museums, festivals, arts & heritage'},
  {key:'spirituality',  name:'Spirituality',      ic:'🕉️', g:'Place, culture & soul',  desc:'Spiritual life, sacred places, contemplative traditions'},
  {key:'fun',           name:'Fun & recreation',  ic:'🎉', g:'Place, culture & soul',  desc:'Sport, play, outdoor & social life'},
];
const DIM = {}; DIMS.forEach(d => DIM[d.key] = d);
const GROUPS = ['Health & safety', 'Society & freedom', 'Money & work', 'Place, culture & soul'];

/* preset priority profiles — weights 0..5; any dimension not listed defaults to 1 */
const PRESETS = [
  {id:'balanced', name:'Balanced', ic:'⚖️', w:{}},
  {id:'retiree', name:'Retiree', ic:'🌴', w:{healthcare:5,health:3,safety:5,climate:5,affordability:4,cleanliness:4,worklife:3,food:3,landscape:3,culture:2,tax:3,spirituality:2,fun:2,opportunity:0,education:0,openness:2,infrastructure:3,governance:3,freedom:2}},
  {id:'nomad', name:'Digital nomad', ic:'💻', w:{affordability:5,infrastructure:5,climate:4,safety:4,openness:4,tax:3,food:3,fun:3,culture:2,opportunity:2,landscape:3,healthcare:2,worklife:2,freedom:3,governance:2,cleanliness:3,health:1,education:0,spirituality:1}},
  {id:'family', name:'Young family', ic:'👨‍👩‍👧', w:{education:5,safety:5,healthcare:4,cleanliness:4,worklife:4,affordability:3,governance:3,infrastructure:3,openness:3,fun:3,opportunity:3,food:2,culture:2,landscape:3,climate:3,freedom:3,health:3,tax:2,spirituality:1}},
  {id:'career', name:'Career-driven', ic:'🚀', w:{opportunity:5,education:4,infrastructure:4,governance:4,healthcare:3,safety:3,openness:3,tax:3,affordability:2,worklife:1,culture:2,food:2,climate:2,landscape:2,freedom:3,cleanliness:2,health:2,fun:2,spirituality:1}},
  {id:'foodie', name:'Foodie', ic:'🍷', w:{food:5,culture:4,landscape:4,climate:3,safety:3,affordability:3,openness:3,fun:3,healthcare:2,spirituality:2,opportunity:1,tax:1,worklife:2,education:1,governance:2,health:2,cleanliness:2,infrastructure:2}},
  {id:'nature', name:'Nature lover', ic:'🏞️', w:{landscape:5,cleanliness:5,climate:4,safety:3,health:3,fun:3,food:2,spirituality:2,affordability:3,culture:2,opportunity:1,tax:1,worklife:2,education:1,governance:2,freedom:2,openness:2,infrastructure:2,healthcare:2}},
  {id:'taxexile', name:'Tax exile', ic:'🧾', w:{tax:5,safety:4,infrastructure:4,affordability:3,healthcare:3,climate:3,opportunity:3,openness:3,fun:2,education:1,worklife:2,culture:2,food:2,landscape:2,freedom:2,governance:2,cleanliness:2,health:2,spirituality:1}},
  {id:'freedom', name:'Freedom seeker', ic:'🕊️', w:{freedom:5,governance:5,safety:4,openness:4,cleanliness:3,healthcare:3,education:3,fun:2,health:2,worklife:2,opportunity:2,affordability:2,tax:2,infrastructure:2,climate:2,landscape:2,food:2,culture:2,spirituality:1}},
  {id:'spiritual', name:'Spiritual seeker', ic:'🕉️', w:{spirituality:5,culture:4,landscape:4,safety:3,climate:3,food:3,affordability:3,cleanliness:3,openness:3,health:2,fun:2,governance:2,freedom:2,opportunity:0,tax:1,worklife:2,education:1,infrastructure:2,healthcare:2}},
  {id:'funsocial', name:'Fun & social', ic:'🎉', w:{fun:5,climate:4,food:4,safety:3,culture:3,openness:3,affordability:3,landscape:3,health:2,spirituality:2,opportunity:2,tax:1,worklife:2,education:1,governance:2,freedom:2,cleanliness:2,infrastructure:2,healthcare:2}},
];

/* ----------------------------- data -------------------------------------- */
const BC = window.BC || [];
const byIso = {}; BC.forEach(c => byIso[c.iso] = c);

/* ----------------------------- helpers ----------------------------------- */
const esc = s => (s == null ? '' : ('' + s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const r0 = v => v == null ? '—' : Math.round(v);
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }

/* colour scale 0..100 (red → yellow → green), tuned so the weighted overall pops */
const SCALE = [[0,[120,20,15]],[28,[192,57,43]],[42,[230,126,34]],[52,[241,196,15]],[62,[163,201,58]],[74,[52,210,122]],[88,[26,152,80]],[100,[20,130,70]]];
const NODATA = [51,65,79];
function rgbOf(v) {
  if (v == null || isNaN(v)) return NODATA;
  if (v <= SCALE[0][0]) return SCALE[0][1];
  if (v >= 100) return SCALE[SCALE.length - 1][1];
  for (let i = 0; i < SCALE.length - 1; i++) {
    const [a, ca] = SCALE[i], [b, cb] = SCALE[i + 1];
    if (v >= a && v <= b) { const t = (v - a) / (b - a); return [0,1,2].map(k => Math.round(lerp(ca[k], cb[k], t))); }
  }
  return NODATA;
}
const col = (v, alpha) => { const [r,g,b] = rgbOf(v); return alpha == null ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`; };

/* short region labels + filter chips */
const REGION_CHIPS = [
  ['all','🌍 All'],['Europe & Central Asia','Europe'],['East Asia & Pacific','Asia–Pacific'],
  ['North America','N. America'],['Latin America & Caribbean','Latin America'],
  ['Middle East & North Africa','MENA'],['South Asia','S. Asia'],['Sub-Saharan Africa','Africa'],
];
const shortRegion = r => ((REGION_CHIPS.find(c => c[0] === r) || [, r])[1] || r || '').replace('🌍 ', '');

/* ----------------------------- state ------------------------------------- */
const state = { metric:'overall', weights:{}, preset:'balanced', sel:null,
  filter:'all', mode:'globe', relief:true, happy:false, hoverIso:null };
DIMS.forEach(d => state.weights[d.key] = 1);

let globe, spinOn = true, panelOn = true, GEO = null, LAND = [];
const elViz = document.getElementById('globeViz');
const elFlat = document.getElementById('flatViz');
const tooltip = document.getElementById('tooltip');

/* ----------------------------- scoring ----------------------------------- */
function compositeOf(c) {
  let num = 0, den = 0;
  for (const d of DIMS) { const w = state.weights[d.key]; if (w > 0) { num += c.s[d.key] * w; den += w; } }
  return den ? num / den : 0;
}
const valOf = c => state.metric === 'overall' ? compositeOf(c) : c.s[state.metric];
const metricLabel = () => state.metric === 'overall' ? 'Overall livability' : DIM[state.metric].name;
const metricIcon = () => state.metric === 'overall' ? '🌍' : DIM[state.metric].ic;

let rankMap = {}, rankList = [];
function rebuildRanks() {
  rankList = BC.map(c => ({ c, v: valOf(c) })).sort((a, b) => b.v - a.v);
  rankMap = {}; rankList.forEach((x, i) => rankMap[x.c.iso] = i + 1);
}
const topWeighted = () => DIMS.filter(d => state.weights[d.key] >= 1).sort((a,b)=>state.weights[b.key]-state.weights[a.key]).slice(0,4).map(d=>d.ic+' '+d.name);

/* ----------------------------- flags ------------------------------------- */
const ALIAS = { KOS:'XKX', PSX:'PSE', SDS:'SSD', CNM:'CYP', SAH:'MAR', KAS:'IND', SOL:'SOM' };
const ISO2_FALLBACK = { XKX:'XK', PSE:'PS', HKG:'HK', MAC:'MO', TWN:'TW', SGP:'SG', AND:'AD', MCO:'MC', SMR:'SM', LIE:'LI', NOR:'NO', FRA:'FR', CYP:'CY', SSD:'SS', COD:'CD', COG:'CG' };
let ISO2 = {};
function flag(iso3) {
  const i2 = ISO2[iso3] || ISO2_FALLBACK[iso3];
  if (!i2 || i2.length !== 2 || i2 === '-9') return '🏳️';
  return String.fromCodePoint(...[...i2.toUpperCase()].map(ch => 0x1F1E6 + ch.charCodeAt(0) - 65));
}

/* ----------------------------- polygons ---------------------------------- */
function polyIso(f) {
  const p = f.properties;
  let iso = p.ADM0_A3;
  if (byIso[iso]) return iso;
  iso = ALIAS[p.ADM0_A3] || p.ISO_A3_EH || p.ISO_A3;
  if (byIso[iso]) return iso;
  return p.ADM0_A3;
}
const polyVal = f => { const c = byIso[polyIso(f)]; return c ? valOf(c) : null; };

function capColor(f) {
  const iso = polyIso(f), v = polyVal(f);
  if (state.hoverIso === iso || state.sel === iso) return col(v, 1);
  return col(v, v == null ? 0.5 : 0.92);
}
function polyAlt(f) {
  const v = polyVal(f);
  const base = (state.relief && v != null) ? 0.012 + clamp(v / 100, 0, 1) * 0.15 : 0.012;
  if (state.sel === polyIso(f)) return base + 0.05;
  if (state.hoverIso === polyIso(f)) return base + 0.025;
  return base;
}

function initGlobe() {
  LAND = GEO.features.filter(f => (f.properties.ADMIN || f.properties.NAME) !== 'Antarctica');
  globe = Globe()(elViz)
    .backgroundColor('rgba(0,0,0,0)')
    .showAtmosphere(true).atmosphereColor('#48d39a').atmosphereAltitude(0.15)
    .polygonsData(LAND)
    .polygonCapColor(capColor)
    .polygonSideColor(f => { const v = polyVal(f); return v == null ? 'rgba(28,46,38,0.5)' : hexA('#06170f', 0.65); })
    .polygonStrokeColor(() => 'rgba(180,230,200,0.16)')
    .polygonAltitude(polyAlt).polygonsTransitionDuration(0)
    .polygonLabel(() => '')
    .onPolygonHover(onPolyHover).onPolygonClick(f => selectCountry(polyIso(f), true));
  try { const m = globe.globeMaterial(); m.color.set('#0a1f17'); m.emissive.set('#05130d'); m.emissiveIntensity = 0.9; m.shininess = 3; } catch (e) {}
  const ctr = globe.controls();
  ctr.autoRotate = true; ctr.autoRotateSpeed = 0.3; ctr.enableDamping = true; ctr.dampingFactor = 0.14;
  ctr.minDistance = 101; ctr.maxDistance = 600;
  const setZoom = () => { ctr.zoomSpeed = 2.0; }; setZoom(); setTimeout(setZoom, 300); ctr.addEventListener('change', setZoom);
  globe.pointOfView({ lat: 30, lng: 12, altitude: 2.5 }, 0);
  try { globe.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); } catch (e) {}
  sizeGlobe(); requestAnimationFrame(sizeGlobe);
  if (window.ResizeObserver) new ResizeObserver(sizeGlobe).observe(elViz);
}
function sizeGlobe() { if (globe) globe.width(elViz.clientWidth || window.innerWidth).height(elViz.clientHeight || (window.innerHeight - 103)); }
function refreshGlobe() {
  if (!globe || state.mode !== 'globe') return;
  globe.polygonCapColor(capColor).polygonAltitude(polyAlt);
}

/* ----------------------------- tooltip ----------------------------------- */
function showTip(html, x, y) { tooltip.innerHTML = html; tooltip.classList.remove('hidden'); if (x != null) { tooltip.style.left = x + 'px'; tooltip.style.top = y + 'px'; } }
const hideTip = () => tooltip.classList.add('hidden');
let lastMouse = { x: innerWidth / 2, y: innerHeight / 2 };
document.addEventListener('mousemove', e => { lastMouse = { x: e.clientX, y: e.clientY }; if (!tooltip.classList.contains('hidden')) { tooltip.style.left = e.clientX + 'px'; tooltip.style.top = e.clientY + 'px'; } });

function tipHTML(c) {
  const v = valOf(c), rk = rankMap[c.iso];
  const best = DIMS.map(d => ({ d, v: c.s[d.key] })).sort((a, b) => b.v - a.v).slice(0, 3);
  return `<div class="tt-name"><span class="tt-flag">${flag(c.iso)}</span>${esc(c.name)}</div>` +
    `<div class="tt-sub">${metricIcon()} ${esc(metricLabel())}${state.metric==='overall'?'':''}</div>` +
    `<div class="tt-score"><b style="color:${col(v)}">${r0(v)}</b><span class="u">/ 100 · rank <b style="color:var(--txt)">#${rk}</b> of ${BC.length}</span></div>` +
    `<div class="tt-spark">${best.map(b => `<span class="tt-pill" style="color:${col(b.v)}">${b.d.ic} ${r0(b.v)}</span>`).join('')}</div>` +
    `<div class="tt-hint">Click for the full profile ↗</div>`;
}
function onPolyHover(f) {
  state.hoverIso = f ? polyIso(f) : null;
  if (globe) globe.controls().autoRotate = !f && spinOn;
  refreshGlobe();
  if (!f) { hideTip(); return; }
  const c = byIso[polyIso(f)];
  if (c) showTip(tipHTML(c), lastMouse.x, lastMouse.y);
  else showTip(`<div class="tt-name">${esc(f.properties.ADMIN || f.properties.NAME)}</div><div class="tt-sub">Not ranked (no data)</div>`, lastMouse.x, lastMouse.y);
}

/* ----------------------------- selection --------------------------------- */
function flyTo(lat, lng, alt) { spinOn = false; syncSpin(); if (globe && state.mode === 'globe') { globe.controls().autoRotate = false; globe.pointOfView({ lat, lng, altitude: alt || 1.6 }, 850); } }
function selectCountry(iso, doFly) {
  const c = byIso[iso]; if (!c) return;
  state.sel = iso; refreshGlobe(); showDetail(c); markActive();
  if (doFly && c.lat != null) flyTo(c.lat, c.lon, 1.5);
}
function clearSel() { state.sel = null; detailCard.classList.add('hidden'); refreshGlobe(); markActive(); }

/* ============================== Detail card ============================== */
const detailCard = document.getElementById('detailCard');
const detailBody = document.getElementById('detailBody');
document.getElementById('detailClose').addEventListener('click', clearSel);

function radarSVG(c) {
  const N = DIMS.length, cx = 130, cy = 122, R = 96;
  const ang = i => -Math.PI / 2 + i * 2 * Math.PI / N;
  const pt = (i, r) => [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r];
  let grid = '';
  [25, 50, 75, 100].forEach(g => {
    const pts = DIMS.map((_, i) => pt(i, R * g / 100).map(n => n.toFixed(1)).join(',')).join(' ');
    grid += `<polygon points="${pts}" fill="none" stroke="rgba(150,210,180,.12)" stroke-width="1"/>`;
  });
  let spokes = '', labels = '';
  DIMS.forEach((d, i) => {
    const [x, y] = pt(i, R), [lx, ly] = pt(i, R + 13);
    spokes += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(150,210,180,.10)" stroke-width="1"/>`;
    labels += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="11">${d.ic}</text>`;
  });
  const poly = DIMS.map((d, i) => pt(i, R * clamp(c.s[d.key], 0, 100) / 100).map(n => n.toFixed(1)).join(',')).join(' ');
  const ovr = compositeOf(c);
  return `<svg class="d-radar" viewBox="0 0 260 250" preserveAspectRatio="xMidYMid meet">${grid}${spokes}` +
    `<polygon points="${poly}" fill="${col(ovr, 0.28)}" stroke="${col(ovr)}" stroke-width="2" stroke-linejoin="round"/>` +
    DIMS.map((d, i) => { const [x, y] = pt(i, R * clamp(c.s[d.key],0,100) / 100); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.2" fill="${col(c.s[d.key])}"/>`; }).join('') +
    `${labels}</svg>`;
}

function dimRowsHTML(c) {
  return GROUPS.map(gp => {
    const rows = DIMS.filter(d => d.g === gp).map(d => {
      const v = c.s[d.key], on = state.metric === d.key;
      return `<div class="dim-row${on?' on':''}" data-dim="${d.key}" title="${esc(d.desc)} — click to map">` +
        `<span class="dim-ic">${d.ic}</span><span class="dim-name">${esc(d.name)}</span>` +
        `<span class="dim-bar"><i style="width:${clamp(v,2,100)}%;background:${col(v)}"></i></span>` +
        `<span class="dim-v" style="color:${col(v)}">${r0(v)}</span></div>`;
    }).join('');
    return `<div class="d-group-h">${esc(gp)}</div>${rows}`;
  }).join('');
}

function showDetail(c) {
  const ovr = compositeOf(c);
  const oRank = BC.map(x => ({ i: x.iso, v: compositeOf(x) })).sort((a, b) => b.v - a.v).findIndex(x => x.i === c.iso) + 1;
  const rk = state.metric === 'overall' ? oRank : rankList.findIndex(x => x.c.iso === c.iso) + 1;
  const sorted = DIMS.map(d => ({ d, v: c.s[d.key] })).sort((a, b) => b.v - a.v);
  const strengths = sorted.slice(0, 3), weak = sorted.slice(-3).reverse();
  const viewV = valOf(c);
  let html =
    `<div class="d-flagrow"><span class="d-flag">${flag(c.iso)}</span><div><div class="d-name">${esc(c.name)}</div><div class="d-sub">${esc(shortRegion(c.region))} · ${c.cov}/19 dimensions measured</div></div></div>` +
    `<div class="d-hero"><div><span class="d-bignum" style="color:${col(ovr)}">${r0(ovr)}</span><span class="d-bigu"> / 100</span></div>` +
    `<div class="d-heror"><span class="d-tier" style="color:${col(ovr)};border:1px solid ${col(ovr)}">${tierLabel(ovr)}</span>` +
    `<div class="d-rank">Overall · world rank <b>#${oRank}</b>/${BC.length}</div></div></div>`;
  if (state.metric !== 'overall')
    html += `<div class="d-sw"><span class="d-chip" style="background:${hexA('#000',.001)};color:${col(viewV)};border:1px solid ${col(viewV)}">${metricIcon()} ${esc(metricLabel())}: <b>${r0(viewV)}</b> · #${rk}</span></div>`;
  html += `<div class="d-sec"><div class="d-sec-h"><span>Profile</span><b>${esc(metricLabel())}</b></div>${radarSVG(c)}</div>`;
  html += `<div class="d-sec"><div class="d-sw">` +
    strengths.map(s => `<span class="d-chip good" data-dim="${s.d.key}">${s.d.ic} ${esc(s.d.name)} ${r0(s.v)}</span>`).join('') + `</div>` +
    `<div class="d-sw" style="margin-top:6px">` +
    weak.map(s => `<span class="d-chip bad" data-dim="${s.d.key}">${s.d.ic} ${esc(s.d.name)} ${r0(s.v)}</span>`).join('') + `</div></div>`;
  if (c.happiness != null)
    html += `<div class="d-happy"><span style="font-size:18px">😊</span><div>Life satisfaction <span class="dh-num">${c.happiness.toFixed(1)}</span><span style="color:var(--muted)"> / 10</span><div style="font-size:10.5px;color:var(--muted)">World Happiness ladder — shown for reference, not part of the score</div></div></div>`;
  html += `<div class="d-sec"><div class="d-sec-h"><span>All 19 dimensions</span><span style="font-weight:600;color:var(--dim)">tap to map ↗</span></div>${dimRowsHTML(c)}</div>`;
  html += `<div class="d-src">Scores are 0–100 (100 = world-best), calibrated to public indices + expert estimates for subjective dimensions. ${c.cov < 19 ? (19 - c.cov) + ' dimension(s) imputed from this country\'s average. ' : ''}See About → method for sources.</div>`;
  detailBody.innerHTML = html;
  detailCard.classList.remove('hidden'); detailCard.scrollTop = 0;
}
function tierLabel(v) { return v >= 78 ? 'Exceptional' : v >= 68 ? 'Excellent' : v >= 58 ? 'Very good' : v >= 50 ? 'Good' : v >= 42 ? 'Middling' : v >= 33 ? 'Challenging' : 'Tough'; }

detailBody.addEventListener('click', e => {
  const dr = e.target.closest('[data-dim]'); if (dr) setMetric(dr.dataset.dim);
});

/* ============================== Metric bar =============================== */
const metricBar = document.getElementById('metricBar');
function buildMetricBar() {
  metricBar.innerHTML = `<button class="metric-chip overall${state.metric==='overall'?' on':''}" data-m="overall"><span class="mc-ic">🌍</span>Overall</button>` +
    DIMS.map(d => `<button class="metric-chip${state.metric===d.key?' on':''}" data-m="${d.key}"><span class="mc-ic">${d.ic}</span>${esc(d.name)}</button>`).join('');
}
metricBar.addEventListener('click', e => { const b = e.target.closest('.metric-chip'); if (b) setMetric(b.dataset.m); });
function setMetric(m) {
  state.metric = m;
  buildMetricBar();
  document.getElementById('lgTitle').textContent = metricLabel();
  rebuildRanks(); refreshGlobe(); buildRank();
  if (state.mode === 'flat') drawFlat();
  if (state.sel) showDetail(byIso[state.sel]);
  // scroll active chip into view
  const act = metricBar.querySelector('.metric-chip.on'); if (act) act.scrollIntoView({ inline:'nearest', block:'nearest', behavior:'smooth' });
}

/* ============================== Ranking panel ============================ */
const rankListEl = document.getElementById('rankList');
const rpStat = document.getElementById('rpStat'), rpSub = document.getElementById('rpSub'), rpTitle = document.getElementById('rpTitle');
function buildFilters() {
  document.getElementById('rpFilters').innerHTML =
    REGION_CHIPS.filter(([k]) => k === 'all' || BC.some(c => c.region === k))
      .map(([k, lab]) => `<button class="fchip${state.filter === k ? ' on' : ''}" data-k="${esc(k)}">${esc(lab)}</button>`).join('');
}
function buildRank() {
  rpTitle.innerHTML = `<span class="rp-ic">${metricIcon()}</span>${esc(state.metric === 'overall' ? 'Overall ranking' : metricLabel())}`;
  rpSub.innerHTML = state.metric === 'overall'
    ? `Weighted across ${DIMS.filter(d=>state.weights[d.key]>0).length} dimensions · <b>${esc(PRESETS.find(p=>p.id===state.preset)?.name || 'Custom')}</b>`
    : esc(DIM[state.metric].desc);
  let list = rankList.filter(x => state.filter === 'all' || x.c.region === state.filter);
  const avg = list.reduce((s, x) => s + x.v, 0) / (list.length || 1);
  rpStat.innerHTML = `<b>${list.length}</b> ${state.filter === 'all' ? 'countries' : 'shown'} · average <b>${r0(avg)}</b>/100`;
  rankListEl.innerHTML = list.map((x, i) => {
    const top = i < 3 ? ' top' + (i + 1) : '';
    return `<div class="rk-row${top}${state.sel === x.c.iso ? ' active' : ''}" data-iso="${x.c.iso}">` +
      `<span class="rk-rank">${i + 1}</span><span class="rk-flag">${flag(x.c.iso)}</span>` +
      `<span class="rk-main"><span class="rk-name">${esc(x.c.name)}</span><span class="rk-meta">${esc(shortRegion(x.c.region))}</span></span>` +
      `<span class="rk-right"><span class="rk-le" style="color:${col(x.v)}">${r0(x.v)}</span><span class="rk-bar"><i style="width:${clamp(x.v,3,100)}%;background:${col(x.v)}"></i></span></span></div>`;
  }).join('') || `<div class="rp-stat">No countries in this view.</div>`;
}
rankListEl.addEventListener('click', e => { const r = e.target.closest('.rk-row'); if (r) selectCountry(r.dataset.iso, true); });
document.getElementById('rpFilters').addEventListener('click', e => { const b = e.target.closest('.fchip'); if (b) { state.filter = b.dataset.k; buildFilters(); buildRank(); } });
function markActive() {
  rankListEl.querySelectorAll('.rk-row').forEach(r => r.classList.toggle('active', r.dataset.iso === state.sel));
  if (state.sel) { const el = rankListEl.querySelector(`.rk-row[data-iso="${state.sel}"]`); if (el) el.scrollIntoView({ block:'nearest' }); }
}
const rankPanel = document.getElementById('rankPanel'), rpShow = document.getElementById('rpShow');
function setPanel(on) { panelOn = on; rankPanel.classList.toggle('hidden', !on); rpShow.classList.toggle('hidden', on); syncMenu('miPanel', on); }
document.getElementById('rpCollapse').addEventListener('click', () => setPanel(false));
rpShow.addEventListener('click', () => setPanel(true));

/* ============================== Weights drawer =========================== */
const weightbar = document.getElementById('weightbar'), wbBody = document.getElementById('wbBody'), wbShow = document.getElementById('wbShow');
function buildPresets() {
  document.getElementById('wbPresets').innerHTML = PRESETS.map(p =>
    `<button class="preset-chip${state.preset === p.id ? ' on' : ''}" data-p="${p.id}">${p.ic} ${esc(p.name)}</button>`).join('');
}
function buildWeights() {
  wbBody.innerHTML = GROUPS.map(gp =>
    `<div class="w-group"><div class="w-group-h">${esc(gp)}</div>` +
    DIMS.filter(d => d.g === gp).map(d => {
      const w = state.weights[d.key];
      return `<div class="w-item${w === 0 ? ' off' : ''}" data-dim="${d.key}"><span class="w-ic">${d.ic}</span><span class="w-name" title="${esc(d.name)}">${esc(d.name)}</span>` +
        `<input class="w-slider" type="range" min="0" max="5" step="1" value="${w}" data-dim="${d.key}" aria-label="${esc(d.name)} weight"><span class="w-val">${w}</span></div>`;
    }).join('') + `</div>`).join('');
}
wbBody.addEventListener('input', e => {
  const s = e.target.closest('.w-slider'); if (!s) return;
  const k = s.dataset.dim, w = +s.value;
  state.weights[k] = w;
  s.closest('.w-item').classList.toggle('off', w === 0);
  s.parentElement.querySelector('.w-val').textContent = w;
  state.preset = matchPreset(); buildPresets();
  if (state.metric !== 'overall') { state.metric = 'overall'; buildMetricBar(); document.getElementById('lgTitle').textContent = metricLabel(); }
  rebuildRanks(); refreshGlobe(); buildRank();
  if (state.mode === 'flat') drawFlat();
  if (state.sel) showDetail(byIso[state.sel]);
});
function applyPreset(id) {
  const p = PRESETS.find(x => x.id === id); if (!p) return;
  DIMS.forEach(d => state.weights[d.key] = (p.w[d.key] != null ? p.w[d.key] : 1));
  state.preset = id; state.metric = 'overall';
  buildPresets(); buildWeights(); buildMetricBar();
  document.getElementById('lgTitle').textContent = metricLabel();
  rebuildRanks(); refreshGlobe(); buildRank();
  if (state.mode === 'flat') drawFlat();
  if (state.sel) showDetail(byIso[state.sel]);
  toast(`${p.ic} ${p.name} priorities applied`);
}
function matchPreset() {
  for (const p of PRESETS) {
    if (DIMS.every(d => state.weights[d.key] === (p.w[d.key] != null ? p.w[d.key] : 1))) return p.id;
  }
  return 'custom';
}
document.getElementById('wbPresets').addEventListener('click', e => { const b = e.target.closest('.preset-chip'); if (b) applyPreset(b.dataset.p); });
document.getElementById('wbReset').addEventListener('click', () => applyPreset('balanced'));
function setWeightbar(on) { weightbar.classList.toggle('hidden', !on); wbShow.classList.toggle('hidden', on); document.getElementById('btnWeights').classList.toggle('active', on); syncMenu('miWeights', on); }
document.getElementById('wbCollapse').addEventListener('click', () => weightbar.classList.toggle('collapsed'));
document.getElementById('btnWeights').addEventListener('click', () => { const hidden = weightbar.classList.contains('hidden'); setWeightbar(hidden); if (!hidden) weightbar.classList.remove('collapsed'); });
wbShow.addEventListener('click', () => setWeightbar(true));

/* ============================== Flat map ================================= */
let fctx, fX = 0, fY = 0, fPW = 0, fPH = 0, flatW = 0, flatH = 0;
const projX = lon => fX + (lon + 180) / 360 * fPW;
const projY = lat => fY + (90 - lat) / 180 * fPH;
function eachRing(geom, cb) { if (!geom) return; if (geom.type === 'Polygon') geom.coordinates.forEach(cb); else if (geom.type === 'MultiPolygon') geom.coordinates.forEach(p => p.forEach(cb)); }
function sizeFlat() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  flatW = elFlat.clientWidth; flatH = elFlat.clientHeight;
  elFlat.width = flatW * dpr; elFlat.height = flatH * dpr;
  fctx = elFlat.getContext('2d'); fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  fPW = Math.min(flatW * 0.98, flatH * 2 * 0.98); fPH = fPW / 2; fX = (flatW - fPW) / 2; fY = (flatH - fPH) / 2;
}
function drawFlat() {
  if (!fctx || !GEO) return;
  fctx.clearRect(0, 0, flatW, flatH);
  const oc = fctx.createLinearGradient(0, fY, 0, fY + fPH); oc.addColorStop(0, '#0a261c'); oc.addColorStop(1, '#06150f');
  fctx.fillStyle = oc; fctx.fillRect(fX, fY, fPW, fPH);
  fctx.strokeStyle = 'rgba(150,210,180,.06)'; fctx.lineWidth = 1;
  for (let lon = -150; lon <= 150; lon += 30) { fctx.beginPath(); fctx.moveTo(projX(lon), fY); fctx.lineTo(projX(lon), fY + fPH); fctx.stroke(); }
  for (let lat = -60; lat <= 60; lat += 30) { fctx.beginPath(); fctx.moveTo(fX, projY(lat)); fctx.lineTo(fX + fPW, projY(lat)); fctx.stroke(); }
  fctx.lineWidth = 0.5; fctx.strokeStyle = 'rgba(180,230,200,.16)';
  for (const f of LAND) {
    const v = polyVal(f), sel = state.sel === polyIso(f);
    fctx.fillStyle = col(v, v == null ? 0.4 : 0.9);
    eachRing(f.geometry, ring => {
      fctx.beginPath(); ring.forEach((c, i) => { const x = projX(c[0]), y = projY(c[1]); i ? fctx.lineTo(x, y) : fctx.moveTo(x, y); }); fctx.closePath(); fctx.fill();
      if (sel) { fctx.save(); fctx.strokeStyle = '#fff'; fctx.lineWidth = 1.5; fctx.stroke(); fctx.restore(); } else fctx.stroke();
    });
  }
}
function pointInRing(x, y, ring) { let inside = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const xi = projX(ring[i][0]), yi = projY(ring[i][1]), xj = projX(ring[j][0]), yj = projY(ring[j][1]); if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside; } return inside; }
function flatCountryAt(x, y) { for (const f of LAND) { let hit = false; eachRing(f.geometry, ring => { if (!hit && pointInRing(x, y, ring)) hit = true; }); if (hit) return f; } return null; }
elFlat.addEventListener('mousemove', e => {
  if (state.mode !== 'flat') return;
  const rect = elFlat.getBoundingClientRect(), x = e.clientX - rect.left, y = e.clientY - rect.top;
  const f = flatCountryAt(x, y);
  if (f && byIso[polyIso(f)]) { elFlat.style.cursor = 'pointer'; showTip(tipHTML(byIso[polyIso(f)]), e.clientX, e.clientY); }
  else { elFlat.style.cursor = 'grab'; hideTip(); }
});
elFlat.addEventListener('mouseleave', hideTip);
elFlat.addEventListener('click', e => { const rect = elFlat.getBoundingClientRect(); const f = flatCountryAt(e.clientX - rect.left, e.clientY - rect.top); if (f && byIso[polyIso(f)]) selectCountry(polyIso(f), false); });
function setMode(m) {
  state.mode = m;
  elViz.classList.toggle('hidden', m !== 'globe');
  elFlat.classList.toggle('hidden', m !== 'flat');
  document.getElementById('btnMap').classList.toggle('active', m === 'flat');
  document.getElementById('btnMap').querySelector('.mb-tx').textContent = m === 'flat' ? 'Globe' : 'Flat map';
  syncMenu('miMap', m === 'flat');
  if (m === 'flat') { sizeFlat(); drawFlat(); } else { sizeGlobe(); refreshGlobe(); }
}
document.getElementById('btnMap').addEventListener('click', () => setMode(state.mode === 'flat' ? 'globe' : 'flat'));

/* ============================== Table view =============================== */
const tableOverlay = document.getElementById('tableOverlay'), dataTable = document.getElementById('dataTable');
let tblSort = { key:'overall', dir:-1 }, tblQuery = '';
function openTable() { buildTable(); tableOverlay.classList.remove('hidden'); }
function buildTable() {
  const cols = [{ k:'overall', ic:'🌍', name:'Overall' }].concat(DIMS.map(d => ({ k:d.key, ic:d.ic, name:d.name })));
  const rows = BC.map(c => ({ c, overall: compositeOf(c) }))
    .filter(r => !tblQuery || r.c.name.toLowerCase().includes(tblQuery))
    .sort((a, b) => {
      const av = tblSort.key === 'overall' ? a.overall : a.c.s[tblSort.key];
      const bv = tblSort.key === 'overall' ? b.overall : b.c.s[tblSort.key];
      return (av - bv) * tblSort.dir;
    });
  const head = `<thead><tr><th class="col-rank">#</th><th class="col-name">Country</th>` +
    cols.map(c => `<th data-sort="${c.k}" class="${tblSort.key === c.k ? 'sorted' : ''}" title="${esc(c.name)}"><span class="th-ic">${c.ic}</span>${tblSort.key === c.k ? (tblSort.dir < 0 ? '▾' : '▴') : ''}</th>`).join('') +
    `<th data-sort="happiness" class="${tblSort.key === 'happiness' ? 'sorted' : ''}" title="Life satisfaction (reference)"><span class="th-ic">😊</span></th></tr></thead>`;
  const body = '<tbody>' + rows.map((r, i) =>
    `<tr><td class="col-rank tbl-rk">${i + 1}</td><td class="col-name" data-iso="${r.c.iso}"><span class="tbl-flag">${flag(r.c.iso)}</span>${esc(r.c.name)}</td>` +
    `<td class="cell col-overall" style="background:${col(r.overall)}">${r0(r.overall)}</td>` +
    DIMS.map(d => `<td class="cell" style="background:${col(r.c.s[d.key])}">${r0(r.c.s[d.key])}</td>`).join('') +
    `<td class="cell" style="background:${r.c.happiness!=null?hexA('#ffd84d',.18):'transparent'};color:var(--txt)">${r.c.happiness != null ? r.c.happiness.toFixed(1) : '—'}</td></tr>`).join('') + '</tbody>';
  dataTable.innerHTML = head + body;
}
dataTable.addEventListener('click', e => {
  const th = e.target.closest('th[data-sort]');
  if (th) { const k = th.dataset.sort; if (tblSort.key === k) tblSort.dir *= -1; else tblSort = { key:k, dir:-1 }; buildTable(); return; }
  const nm = e.target.closest('.col-name[data-iso]');
  if (nm) { tableOverlay.classList.add('hidden'); selectCountry(nm.dataset.iso, true); }
});
document.getElementById('tblSearch').addEventListener('input', e => { tblQuery = e.target.value.trim().toLowerCase(); buildTable(); });
document.getElementById('tableClose').addEventListener('click', () => tableOverlay.classList.add('hidden'));
tableOverlay.addEventListener('click', e => { if (e.target === tableOverlay) tableOverlay.classList.add('hidden'); });
document.getElementById('btnTable').addEventListener('click', openTable);

/* ============================== Search =================================== */
const searchEl = document.getElementById('search'), searchRes = document.getElementById('searchResults');
let hits = [];
function runSearch() {
  const q = searchEl.value.trim().toLowerCase();
  if (!q) { searchRes.classList.add('hidden'); hits = []; return; }
  hits = BC.filter(c => c.name.toLowerCase().includes(q)).sort((a, b) => compositeOf(b) - compositeOf(a)).slice(0, 8);
  searchRes.innerHTML = hits.length ? hits.map((c, i) => {
    const v = valOf(c);
    return `<div class="sr-item${i===0?' sel':''}" data-i="${i}"><span class="sr-ic">${flag(c.iso)}</span><span class="sr-name">${esc(c.name)}</span><span class="sr-score" style="color:${col(v)}">${r0(v)}</span></div>`;
  }).join('') : '<div class="sr-none">No match</div>';
  searchRes.classList.remove('hidden');
}
function pickHit(i) { const h = hits[i] || hits[0]; if (!h) return; searchEl.value = ''; searchRes.classList.add('hidden'); hits = []; searchEl.blur(); selectCountry(h.iso, true); }
searchEl.addEventListener('input', runSearch);
searchEl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); pickHit(0); } else if (e.key === 'Escape') { searchEl.value = ''; searchRes.classList.add('hidden'); searchEl.blur(); } });
searchRes.addEventListener('click', e => { const it = e.target.closest('.sr-item'); if (it) pickHit(+it.dataset.i); });
document.addEventListener('click', e => { if (!document.getElementById('searchWrap').contains(e.target)) searchRes.classList.add('hidden'); });

/* ============================== Legend / happy =========================== */
const legend = document.getElementById('legend');
document.getElementById('legendToggle').addEventListener('click', () => legend.classList.toggle('collapsed'));
function setHappy(on) { state.happy = on; syncMenu('miHappy', on); /* overlay reserved; happiness shown in detail */ toast(on ? '😊 Life-satisfaction shown in country profiles' : ''); }

/* ============================== Menu / misc ============================== */
const menu = document.getElementById('menu'), menuBtn = document.getElementById('menuBtn');
menuBtn.addEventListener('click', e => { e.stopPropagation(); menu.classList.toggle('hidden'); });
document.addEventListener('click', e => { if (!menu.classList.contains('hidden') && !menu.contains(e.target) && e.target !== menuBtn) menu.classList.add('hidden'); });
function syncMenu(id, on) { const el = document.getElementById(id); if (!el) return; const s = el.querySelector('.mi-state'); if (s) s.textContent = on ? 'On' : 'Off'; el.classList.toggle('on', on); }
const miSpin = document.getElementById('miSpin');
function syncSpin() { syncMenu('miSpin', spinOn); }
miSpin.addEventListener('click', () => { spinOn = !spinOn; if (globe && !state.hoverIso && state.mode === 'globe') globe.controls().autoRotate = spinOn; syncSpin(); });
syncSpin();
let toastT = null;
function toast(msg) { const t = document.getElementById('toast'); if (!msg) { t.classList.remove('show'); return; } t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400); }

function resetView() { clearSel(); spinOn = true; syncSpin(); state.filter = 'all'; applyPreset('balanced'); buildFilters(); if (globe && state.mode === 'globe') { globe.controls().autoRotate = true; globe.pointOfView({ lat: 30, lng: 12, altitude: 2.5 }, 800); } }
document.getElementById('miReset').addEventListener('click', () => { resetView(); menu.classList.add('hidden'); });
document.getElementById('brandHome').addEventListener('click', resetView);
document.getElementById('miFull').addEventListener('click', () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); menu.classList.add('hidden'); });
document.getElementById('miPanel').addEventListener('click', () => { setPanel(!panelOn); menu.classList.add('hidden'); });
document.getElementById('miWeights').addEventListener('click', () => { setWeightbar(weightbar.classList.contains('hidden')); menu.classList.add('hidden'); });
document.getElementById('miTable').addEventListener('click', () => { openTable(); menu.classList.add('hidden'); });
document.getElementById('miHappy').addEventListener('click', () => { setHappy(!state.happy); menu.classList.add('hidden'); });
document.getElementById('miRelief').addEventListener('click', () => { state.relief = !state.relief; syncMenu('miRelief', state.relief); refreshGlobe(); });
document.getElementById('miMap').addEventListener('click', () => { setMode(state.mode === 'flat' ? 'globe' : 'flat'); menu.classList.add('hidden'); });

/* about / welcome */
const aboutOverlay = document.getElementById('aboutOverlay'), welcome = document.getElementById('welcomeOverlay');
const METHOD = '<b>Healthcare</b> Numbeo Health Care Index. <b>Health</b> life expectancy (UN/WHO). <b>Safety</b> Global Peace Index + Numbeo. <b>Clean environment</b> Yale EPI air & water + Numbeo pollution. <b>Govt integrity</b> Transparency CPI. <b>Freedom</b> Freedom House + RSF press freedom + Cato Human Freedom. <b>Education</b> PISA 2022 + World Bank learning. <b>Openness</b> Gallup Migrant Acceptance + EF English. <b>Opportunity</b> GDP per capita (PPP) + employment. <b>Affordability</b> Numbeo local purchasing power vs cost. <b>Low tax</b> tax-to-GDP + total tax rate. <b>Work–life</b> paid leave + annual hours. <b>Infrastructure</b> World Bank logistics + internet speed. <b>Climate · Landscape · Food · Arts & culture · Spirituality · Fun</b> expert estimates anchored to proxies (Numbeo climate, UNESCO sites & protected land, TasteAtlas & Michelin, religiosity & sacred geography, sport & social-life). Life satisfaction (World Happiness) is shown for reference and is not part of the score.';
document.getElementById('abMethod').innerHTML = METHOD;
document.getElementById('abDimCount').textContent = DIMS.length;
document.getElementById('miAbout').addEventListener('click', () => { menu.classList.add('hidden'); aboutOverlay.classList.remove('hidden'); });
document.getElementById('aboutClose').addEventListener('click', () => aboutOverlay.classList.add('hidden'));
aboutOverlay.addEventListener('click', e => { if (e.target === aboutOverlay) aboutOverlay.classList.add('hidden'); });
const SEEN = 'bestcountriesmap_seen_v1';
document.getElementById('welCount').textContent = BC.length + '';
function hideWelcome() { welcome.classList.add('hidden'); try { localStorage.setItem(SEEN, '1'); } catch (e) {} }
document.getElementById('welStart').addEventListener('click', hideWelcome);
welcome.addEventListener('click', e => { if (e.target === welcome) hideWelcome(); });
document.getElementById('miHelp').addEventListener('click', () => { menu.classList.add('hidden'); welcome.classList.remove('hidden'); });

/* keyboard */
document.addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  if (e.key === 'Escape') {
    menu.classList.add('hidden');
    if (!tableOverlay.classList.contains('hidden')) return tableOverlay.classList.add('hidden');
    if (!aboutOverlay.classList.contains('hidden')) return aboutOverlay.classList.add('hidden');
    if (!welcome.classList.contains('hidden')) return hideWelcome();
    if (!detailCard.classList.contains('hidden')) clearSel();
  } else if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); spinOn = !spinOn; if (globe && !state.hoverIso && state.mode === 'globe') globe.controls().autoRotate = spinOn; syncSpin(); }
});

/* ============================== Boot ===================================== */
window.addEventListener('resize', () => { if (state.mode === 'globe') sizeGlobe(); else { sizeFlat(); drawFlat(); } });
buildMetricBar(); buildFilters(); buildPresets(); buildWeights(); rebuildRanks(); buildRank();
document.getElementById('lgTitle').textContent = metricLabel();
setWeightbar(!window.matchMedia('(max-width:760px)').matches);   // start collapsed on small screens
fetch('data/countries.geojson').then(r => r.json()).then(geo => {
  GEO = geo;
  GEO.features.forEach(f => { const p = f.properties; const i2 = (p.ISO_A2_EH && p.ISO_A2_EH !== '-99') ? p.ISO_A2_EH : (p.ISO_A2 && p.ISO_A2 !== '-99' ? p.ISO_A2 : null); if (i2) ISO2[p.ADM0_A3] = i2; });
  buildRank();   // re-render now that ISO2 (flags) is populated
  initGlobe();
  try {
    const q = new URLSearchParams(location.search);
    if (q.get('preset')) applyPreset(q.get('preset'));
    if (q.get('m') && (q.get('m') === 'overall' || DIM[q.get('m')])) setMetric(q.get('m'));
    const c = q.get('c'); if (c && byIso[c]) { selectCountry(c, true); hideWelcome(); }
  } catch (e) {}
}).catch(err => { console.error('Failed to load map data', err); elViz.innerHTML = '<div style="color:var(--muted);text-align:center;padding-top:34vh">Could not load map data.</div>'; });
try { if (!localStorage.getItem(SEEN)) welcome.classList.remove('hidden'); } catch (e) { welcome.classList.remove('hidden'); }
