/* ==========================================================================
   Natura viva — interface layer
   Vanilla ES module, no dependencies. Builds every piece of UI DOM inside
   opts.root and exposes a small imperative API for main.js:

     const ui = createUI({ root, onEnter, onAction, onIdle })
     ui.setProgress(p)        0..1 on the loading veil
     ui.setReady()            veil holds ~400 ms, dissolves, calls onEnter(true)
     ui.showError(message)    graceful fatal message on the veil
     ui.setBuilding(on)       keep the chrome hidden during the self-assembly
     ui.setState(s)           { light, filter, filterAvailable, water, sound, cinema }
     ui.setMode(mode)         'viva' | 'morta'
     ui.setHUD(h)             { temp, ph, o2, murk, level, alive, frozen, night }
     ui.setAudioBlocked(b)    «Включить звук» pill while audio is suspended
     ui.callout(info) · ui.moveCallout(x, y, visible) · ui.hideCallout()
     ui.toast(text, ms)
     ui.setCursor(kind)       cursor of canvas#scene
   ========================================================================== */

const NBSP = '\u00A0';
const EASE = 'cubic-bezier(.2,.7,.2,1)';

const IDLE_MS = 12000;          // no activity → dock and HUD fade away
const IDLE_READING_MS = 45000;  // …but give readers of the label more time
const HOLD_MS = 400;            // the veil holds after setReady()
const MIN_TITLE_MS = 1200;      // the title card stays at least this long after it appears
const REVEAL_AFTER_MS = 900;    // chrome may start arriving this long into the dissolve
const HINT_AFTER_MS = 2000;     // first-use hint, after the chrome entrance begins
const HINT_MS = 8000;

const KEYMAP = {
  KeyL: 'light',
  KeyF: 'filter',
  KeyW: 'water',
  KeyE: 'feed',
  Space: 'feed',
  KeyM: 'sound',
  KeyC: 'cinema',
};

const T = {
  artist: 'Вячеслав Погуляйченко',
  title: 'Natura viva',
  sub: 'Интерактивная инсталляция · 2026',
  subEn: 'Interactive installation · 2026',
  headphones: 'Лучше в наушниках',
  loading: 'Загрузка',
  errorCaption: 'Экспозиция временно закрыта',
  errorDefault:
    'Ваш браузер не поддерживает WebGL 2 — без него аквариум не оживёт. ' +
    'Откройте страницу в свежей версии Chrome, Safari или Firefox.',

  mediumViva: 'Вода, стекло, свет, код. 72 живых существа.',
  mediumMorta: 'Стекло, свет, код. 72 фигуры.',
  kind: 'Интерактивная инсталляция, WebGL',
  collection: 'Коллекция автора',
  enViva: 'Water, glass, light, code. Interactive installation. Collection of the artist.',
  enMorta: 'Glass, light, code. Interactive installation. Collection of the artist.',
  more: 'Подробнее',
  less: 'Свернуть',
  curatorial: [
    'Аквариум — самый маленький из миров, за которые человек берёт на себя ответственность. ' +
      'Здесь всё зависит от вас: свет, воздух, вода. Выключите свет — рыбы побледнеют и уснут. ' +
      'Остановите фильтр — вода помутнеет, и им станет нечем дышать. Слейте воду — и живая природа ' +
      'превратится в натюрморт, <i lang="fr">nature morte</i>: время для рыб остановится. ' +
      'Налейте её снова — цвет вернётся вместе с водой.',
    'В работе нет ни одной текстуры и ни одной модели: каждая рыба, каждый блик ' +
      'и каждый звук рождаются из кода в реальном времени.',
  ],

  hintMouse: 'Перетащите — осмотреть · колесо — приблизить · нажмите на рыбу · постучите по стеклу',
  hintTouch: 'Проведите — осмотреть · щипок — приблизить · коснитесь рыбы или стекла',
  audio: 'Включить звук',
  cinemaExit: 'Выйти из кино',
};

const WATER = {
  full: { text: 'Слить воду', short: 'Слить', aria: 'Вода: слить' },
  draining: { text: 'Сливается…', short: 'Слив…', aria: 'Вода сливается. Нажмите, чтобы наполнить' },
  empty: { text: 'Налить воду', short: 'Налить', aria: 'Вода: налить' },
  filling: { text: 'Наполняется…', short: 'Налив…', aria: 'Вода наполняется. Нажмите, чтобы слить' },
  partial: { text: 'Налить воду', short: 'Налить', aria: 'Вода: налить' },
};

/* ---------- Icons: thin line drawings on a 24-unit grid ---------- */

const svg = (body, cls = '') =>
  `<svg class="nv-icon${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;

const WAVE = 'c1.4 0 2.1-.9 3.5-.9s2.1.9 3.5.9 2.1-.9 3.5-.9 2.1.9 3.5.9 2.1-.9 3.5-.9';
// water surface when the tank is full; it sinks by up to 9.4 units as the level drops
const SURFACE = 'M3.5 10.4' + WAVE;

const ICON = {
  // a gallery pendant lamp; the rays go out with the light
  light: svg(
    '<path d="M12 2.75v3.5"/>' +
      '<path d="M8.1 12.6 9.5 6.25h5l1.4 6.35z"/>' +
      '<path class="nv-i-ray" d="M12 15.7V19M8.7 15.1l-1.6 2.8M15.3 15.1l1.6 2.8"/>',
  ),
  // air bubbles; they breathe while the filter runs
  filter: svg(
    '<circle class="nv-i-bub" cx="9.3" cy="16.2" r="2.6"/>' +
      '<circle class="nv-i-bub" cx="14.7" cy="10.6" r="1.8"/>' +
      '<circle class="nv-i-bub" cx="10.5" cy="5.5" r="1.15"/>',
  ),
  // a rimless tank; the surface follows the real water level (--nv-lvl)
  water: svg(
    '<defs><clipPath id="nv-clip-tank"><path d="M4.75 3.5v15a1.25 1.25 0 0 0 1.25 1.25h12a1.25 1.25 0 0 0 1.25-1.25v-15z"/></clipPath></defs>' +
      '<g clip-path="url(#nv-clip-tank)"><g class="nv-i-water">' +
      `<path class="nv-i-fill" d="${SURFACE}V22h-17z"/>` +
      `<path class="nv-i-wave" d="${SURFACE}"/>` +
      '</g></g>' +
      '<path d="M4.75 5.25v13.25a1.25 1.25 0 0 0 1.25 1.25h12a1.25 1.25 0 0 0 1.25-1.25V5.25"/>',
  ),
  // three flakes above the surface; they fall through it when you feed
  feed: svg(
    '<circle class="nv-i-flake" cx="8.2" cy="4.9" r="1"/>' +
      '<circle class="nv-i-flake" cx="12.6" cy="7.3" r="1"/>' +
      '<circle class="nv-i-flake" cx="16.1" cy="4.3" r="1"/>' +
      `<path d="M3.25 12.4${WAVE}"/>` +
      '<path d="M7.4 17.3c1.6 0 3-.8 4.6-.8s3 .8 4.6.8" opacity=".55"/>',
  ),
  sound: svg(
    '<path d="M4.25 9.4h3.1L12 5.6v12.8l-4.65-3.8h-3.1z"/>' +
      '<g class="nv-i-on"><path d="M15.2 9.3a3.9 3.9 0 0 1 0 5.4"/><path d="M17.7 6.8a7.4 7.4 0 0 1 0 10.4"/></g>' +
      '<g class="nv-i-off"><path d="M15.7 9.9l4.2 4.2M19.9 9.9l-4.2 4.2"/></g>',
  ),
  soundOn: svg(
    '<path d="M4.25 9.4h3.1L12 5.6v12.8l-4.65-3.8h-3.1z"/>' +
      '<g class="nv-i-on"><path d="M15.2 9.3a3.9 3.9 0 0 1 0 5.4"/><path d="M17.7 6.8a7.4 7.4 0 0 1 0 10.4"/></g>',
  ),
  // a film camera: «Кино»
  cinema: svg(
    '<circle cx="7.6" cy="6.9" r="2.55"/><circle cx="13.4" cy="6.9" r="2.55"/>' +
      '<rect x="3.75" y="10.25" width="12.5" height="8.25" rx="1.25"/>' +
      '<path d="M16.25 13.1l4-2.1v6.75l-4-2.1"/>',
  ),
  fullscreen: svg(
    '<g class="nv-i-enter"><path d="M4.75 9.25v-4.5h4.5M14.75 4.75h4.5v4.5M19.25 14.75v4.5h-4.5M9.25 19.25h-4.5v-4.5"/></g>' +
      '<g class="nv-i-exit"><path d="M9.25 4.75v4.5h-4.5M19.25 9.25h-4.5v-4.5M14.75 19.25v-4.5h4.5M4.75 14.75h4.5v4.5"/></g>',
  ),
  info: svg('<circle cx="12" cy="12" r="8.75"/><path d="M12 11v5.25"/><circle cx="12" cy="7.9" r=".5" fill="currentColor"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  close: svg('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>'),
  headphones: svg(
    '<path d="M4.5 15v-2.5a7.5 7.5 0 0 1 15 0V15"/>' +
      '<rect x="3.5" y="13.75" width="3.5" height="6" rx="1.4"/><rect x="17" y="13.75" width="3.5" height="6" rx="1.4"/>',
  ),
};

/* ---------- Small helpers ---------- */

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const clamp01 = (v) => clamp(+v || 0, 0, 1);
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const escapeHTML = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Russian typesetting: no hanging one- and two-letter words, no dash at a line start. */
function typo(s) {
  const short = /(^|[\s\u00AB\u201E"(])([а-яёa-z]{1,2}) /giu;
  return String(s)
    .replace(/ — /g, NBSP + '— ')
    .replace(/(\d) (?=[^\s\d])/g, '$1' + NBSP)
    .replace(short, '$1$2' + NBSP)
    .replace(short, '$1$2' + NBSP);
}

/** 1 обитатель · 2 обитателя · 5 обитателей */
function plural(n, one, few, many) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
}

const swap = (viva, morta) =>
  `<span class="nv-swap"><span class="nv-swap__viva">${viva}</span>` +
  `<span class="nv-swap__morta" aria-hidden="true">${morta}</span></span>`;

function matchMediaSafe(query) {
  if (typeof window.matchMedia === 'function') return window.matchMedia(query);
  return { matches: false, addEventListener() {}, removeEventListener() {} };
}

function loadFonts() {
  const fonts = document.fonts;
  if (!fonts || typeof fonts.load !== 'function') return Promise.resolve();
  const specs = [
    ['italic 400 64px "Cormorant Garamond"', 'Natura viva'],
    ['italic 500 24px "Cormorant Garamond"', 'Natura morta, 2026 Пегги'],
    ['300 16px "Raleway"', 'Интерактивная Interactive'],
    ['500 11px "Raleway"', 'ВЯЧЕСЛАВ ПОГУЛЯЙЧЕНКО'],
    ['400 12px "Raleway"', 'Вода, стекло water'],
  ];
  const all = Promise.all(specs.map(([f, t]) => fonts.load(f, t).catch(() => null)));
  return Promise.race([all, delay(1600)]);
}

/* ---------- DOM ---------- */

function template() {
  const plate = ({ action, key, i, icon, name, compact, state, ind, extra = '' }) => `
    <button type="button" class="nv-plate" data-action="${action}" style="--i:${i}" ${extra}>
      <span class="nv-plate__key" aria-hidden="true">${key}</span>
      ${icon}
      <span class="nv-plate__name">${ind}<span class="nv-w">${name}</span><span class="nv-c" aria-hidden="true">${compact}</span></span>
      <span class="nv-plate__state">${ind}<span class="nv-plate__text">${state}</span></span>
    </button>`;
  const dot = '<i class="nv-ind" aria-hidden="true"></i>';

  return `
  <aside class="nv-label" aria-label="Этикетка">
    <button type="button" class="nv-label__chip" aria-expanded="false" aria-controls="nv-label-body">
      ${ICON.info}${swap('Natura viva', 'Natura morta')}
    </button>
    <div class="nv-label__body" id="nv-label-body">
      <button type="button" class="nv-label__close" aria-label="Закрыть этикетку">${ICON.close}</button>
      <p class="nv-label__artist">${T.artist}</p>
      <p class="nv-label__title">${swap('Natura viva, 2026', 'Natura morta, 2026')}</p>
      <p class="nv-label__medium">${swap(typo(T.mediumViva), typo(T.mediumMorta))}</p>
      <p class="nv-label__line">${typo(T.kind)}</p>
      <p class="nv-label__line nv-label__line--dim">${T.collection}</p>
      <p class="nv-label__en" lang="en">${swap(T.enViva, T.enMorta)}</p>
      <div class="nv-label__more" id="nv-label-more">
        <div class="nv-label__clip"><div class="nv-label__scroll">
          ${T.curatorial.map((p) => `<p>${typo(p)}</p>`).join('')}
        </div></div>
      </div>
      <button type="button" class="nv-label__toggle" aria-expanded="false" aria-controls="nv-label-more">
        <span class="nv-label__toggle-text">${T.more}</span>${ICON.plus}
      </button>
    </div>
  </aside>

  <div class="nv-hud">
    <p class="nv-hud__line"></p>
    <div class="nv-hud__tools">
      <button type="button" class="nv-tool" data-action="sound" aria-pressed="false" aria-keyshortcuts="M"
        aria-label="Звук" data-tip="Звук · M">${ICON.sound}</button>
      <button type="button" class="nv-tool" data-action="cinema" aria-pressed="false" aria-keyshortcuts="C"
        aria-label="Режим кино: камера движется сама" data-tip="Кино · C">${ICON.cinema}</button>
      <button type="button" class="nv-tool" data-action="fullscreen" aria-pressed="false"
        aria-label="Во весь экран" data-tip="Во весь экран">${ICON.fullscreen}</button>
    </div>
  </div>

  <div class="nv-dock" role="toolbar" aria-label="Управление аквариумом">
    ${plate({ action: 'light', key: 'L', i: 0, icon: ICON.light, name: 'Свет', compact: 'Свет', state: 'включён', ind: dot,
      extra: 'aria-pressed="true" aria-keyshortcuts="L" aria-label="Свет"' })}
    ${plate({ action: 'filter', key: 'F', i: 1, icon: ICON.filter, name: 'Фильтр', compact: 'Фильтр', state: 'работает', ind: dot,
      extra: 'aria-pressed="true" aria-keyshortcuts="F" aria-label="Фильтр"' })}
    ${plate({ action: 'water', key: 'W', i: 2, icon: ICON.water, name: 'Вода', compact: WATER.full.short, state: WATER.full.text, ind: '',
      extra: `aria-keyshortcuts="W" aria-label="${WATER.full.aria}"` })}
    ${plate({ action: 'feed', key: 'E', i: 3, icon: ICON.feed, name: 'Покормить', compact: 'Корм', state: 'щепотка корма', ind: '',
      extra: 'aria-keyshortcuts="E Space" aria-label="Покормить рыб"' })}
  </div>

  <p class="nv-hint" aria-hidden="true"></p>

  <div class="nv-callout">
    <svg class="nv-callout__svg" aria-hidden="true" focusable="false">
      <line class="nv-callout__line" x1="0" y1="0" x2="0" y2="0" pathLength="1"/>
    </svg>
    <span class="nv-callout__dot" aria-hidden="true"></span>
    <div class="nv-callout__card" role="status" aria-live="polite">
      <p class="nv-callout__name"></p>
      <p class="nv-callout__species"></p>
      <p class="nv-callout__latin" lang="la"></p>
      <p class="nv-callout__note"></p>
    </div>
  </div>

  <div class="nv-toast" role="status" aria-live="polite"><span class="nv-toast__text"></span></div>

  <button type="button" class="nv-audio" data-action="sound" tabindex="-1" aria-hidden="true">
    ${ICON.soundOn}<span>${T.audio}</span>
  </button>

  <button type="button" class="nv-cine" data-action="cinema" aria-keyshortcuts="C Escape">
    ${ICON.close}<span>${T.cinemaExit}</span>
  </button>

  <section class="nv-intro" aria-labelledby="nv-intro-title" aria-busy="true">
    <div class="nv-intro__veil"></div>
    <div class="nv-intro__vignette"></div>
    <div class="nv-intro__content">
      <p class="nv-intro__artist">${T.artist}</p>
      <h1 class="nv-intro__title" id="nv-intro-title" lang="la">${T.title}</h1>
      <p class="nv-intro__sub">${T.sub}</p>
      <p class="nv-intro__sub-en" lang="en">${T.subEn}</p>
      <div class="nv-intro__gate">
        <div class="nv-intro__progress" role="progressbar" aria-label="${T.loading}"
          aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
          <span class="nv-intro__bar"><span class="nv-intro__fill"></span></span>
        </div>
        <p class="nv-intro__hint">${ICON.headphones}<span>${T.headphones}</span></p>
        <div class="nv-intro__error" role="alert">
          <p class="nv-intro__error-caption">${T.errorCaption}</p>
          <p class="nv-intro__error-text"></p>
        </div>
      </div>
    </div>
  </section>`;
}

/* ==========================================================================
   createUI
   ========================================================================== */

export function createUI(opts = {}) {
  const root = opts.root || document.getElementById('ui');
  if (!root) throw new Error('[ui] createUI: root element not found');
  const canvas = opts.canvas || document.getElementById('scene');
  const idleMs = Number(opts.idleMs) > 0 ? Number(opts.idleMs) : IDLE_MS;

  const guard = (fn) => (...args) => {
    if (typeof fn !== 'function') return;
    try {
      fn(...args);
    } catch (err) {
      console.error('[ui] callback failed:', err);
    }
  };
  const emitEnter = guard(opts.onEnter);
  const emitAction = guard(opts.onAction);
  const emitIdle = guard(opts.onIdle);

  const mqReduced = matchMediaSafe('(prefers-reduced-motion: reduce)');
  const mqTouch = matchMediaSafe('(hover: none) and (pointer: coarse)');
  const mqCompactLabel = matchMediaSafe('(max-width: 899px), (max-height: 559px)');
  const reduced = () => mqReduced.matches;

  root.classList.add('nv');
  root.innerHTML = template();

  const $ = (sel) => root.querySelector(sel);
  const el = {
    label: $('.nv-label'),
    chip: $('.nv-label__chip'),
    labelClose: $('.nv-label__close'),
    more: $('.nv-label__toggle'),
    moreText: $('.nv-label__toggle-text'),
    hud: $('.nv-hud'),
    hudLine: $('.nv-hud__line'),
    tSound: $('.nv-tool[data-action="sound"]'),
    tCinema: $('.nv-tool[data-action="cinema"]'),
    tFs: $('.nv-tool[data-action="fullscreen"]'),
    dock: $('.nv-dock'),
    pLight: $('.nv-plate[data-action="light"]'),
    pFilter: $('.nv-plate[data-action="filter"]'),
    pWater: $('.nv-plate[data-action="water"]'),
    pFeed: $('.nv-plate[data-action="feed"]'),
    hint: $('.nv-hint'),
    callout: $('.nv-callout'),
    coLine: $('.nv-callout__line'),
    coDot: $('.nv-callout__dot'),
    coCard: $('.nv-callout__card'),
    coName: $('.nv-callout__name'),
    coSpecies: $('.nv-callout__species'),
    coLatin: $('.nv-callout__latin'),
    coNote: $('.nv-callout__note'),
    toast: $('.nv-toast'),
    toastText: $('.nv-toast__text'),
    audio: $('.nv-audio'),
    cine: $('.nv-cine'),
    intro: $('.nv-intro'),
    introTitle: $('.nv-intro__title'),
    progress: $('.nv-intro__progress'),
    fill: $('.nv-intro__fill'),
    errText: $('.nv-intro__error-text'),
  };
  const text = (plateEl) => plateEl.querySelector('.nv-plate__text');
  el.tLight = text(el.pLight);
  el.tFilter = text(el.pFilter);
  el.tWater = text(el.pWater);
  el.cWater = el.pWater.querySelector('.nv-c');

  /* ---------- state ---------- */

  const S = { light: true, filter: true, filterAvailable: true, water: 'full', sound: false, cinema: false };
  const R = {}; // what is currently rendered
  let mode = 'viva';
  let progress = 0;
  let ready = false;
  let errored = false;
  let entered = false;
  let revealAllowed = false;
  let building = false;
  let shown = false;
  let skipRequested = false;
  let readyAt = 0;
  let fontsAt = 0;
  let hintDone = false;
  let idle = false;
  let lastActivity = performance.now();
  let hoverChrome = 0;
  let lastPX = -1;
  let lastPY = -1;
  let cursorKind = 'default';
  let labelOpen = false;
  let moreOpen = false;
  let level = 1;
  let levelKnown = false;
  let hudHTML = '';
  let audioBlocked = false;
  let fsOn = false;
  let remPx = 16;
  const inset = { t: 0, r: 0, b: 0, l: 0 };
  const timers = { hold: 0, reveal: 0, arrive: 0, hintShow: 0, hintHide: 0, toast: 0, intro: 0, idle: 0, feed: 0 };

  /* ---------- fonts: reveal the title card only once its typefaces are here ---------- */

  const fontsReady = loadFonts().then(() => {
    fontsAt = performance.now();
    el.intro.classList.add('is-fonts');
    measure();
  });

  /* ---------- measuring (on resize only, never per frame) ---------- */

  const probe = document.createElement('div');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText =
    'position:fixed;inset:0;visibility:hidden;pointer-events:none;' +
    'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
  root.appendChild(probe);

  function measure() {
    remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const cs = getComputedStyle(probe);
    inset.t = parseFloat(cs.paddingTop) || 0;
    inset.r = parseFloat(cs.paddingRight) || 0;
    inset.b = parseFloat(cs.paddingBottom) || 0;
    inset.l = parseFloat(cs.paddingLeft) || 0;
    if (co.shown) measureCallout();
    if (el.hud) measureHud();
  }

  /* ==========================================================================
     Intro: loading veil → hold → dissolve
     ========================================================================== */

  function setProgress(p) {
    if (ready || errored) return;
    const v = clamp01(p);
    if (v <= progress) return; // never run backwards
    progress = v;
    el.fill.style.transform = `scaleX(${v.toFixed(4)})`;
    el.progress.setAttribute('aria-valuenow', String(Math.round(v * 100)));
  }

  function setReady() {
    if (ready || errored) return;
    ready = true;
    readyAt = performance.now();
    progress = 1;
    el.fill.style.transform = 'scaleX(1)';
    el.progress.setAttribute('aria-valuenow', '100');
    el.intro.classList.add('is-ready');
    el.intro.removeAttribute('aria-busy');
    if (skipRequested) {
      beginDissolve();
      return;
    }
    fontsReady.then(() => {
      if (entered || errored) return;
      const at = Math.max(readyAt + HOLD_MS, fontsAt + MIN_TITLE_MS);
      clearTimeout(timers.hold);
      timers.hold = setTimeout(beginDissolve, Math.max(0, at - performance.now()));
    });
  }

  // Click on the veil or Enter: skip the hold (or remember the wish until ready).
  function skipIntro() {
    if (entered || errored) return;
    if (!ready) {
      skipRequested = true;
      return;
    }
    beginDissolve();
  }

  function beginDissolve() {
    if (entered || errored) return;
    entered = true;
    clearTimeout(timers.hold);
    root.classList.add('is-entered');
    dissolveIntro();
    emitEnter(true); // at the very start of the dissolve (inside the gesture, if there was one)
    timers.reveal = setTimeout(
      () => {
        revealAllowed = true;
        maybeReveal();
      },
      reduced() ? 250 : REVEAL_AFTER_MS,
    );
  }

  function dissolveIntro() {
    const intro = el.intro;
    const title = el.introTitle;
    intro.classList.add('is-leaving');
    intro.setAttribute('aria-hidden', 'true');

    if (typeof title.animate === 'function' && !reduced()) {
      // The letters rise and blur away like bubbles; the kerned title is split only now.
      const chars = [...title.textContent];
      title.textContent = '';
      for (const ch of chars) {
        const s = document.createElement('span');
        s.className = 'nv-intro__ch';
        s.textContent = ch;
        title.appendChild(s);
      }
      const k = remPx / 16;
      for (const s of title.children) {
        const dx = (Math.random() - 0.5) * 18 * k;
        const dy = -(8 + Math.random() * 18) * k;
        const rot = (Math.random() - 0.5) * 8;
        s.animate(
          [
            { opacity: 1, filter: 'blur(0px)', transform: 'translate3d(0,0,0)' },
            {
              opacity: 0,
              filter: 'blur(9px)',
              transform: `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) rotate(${rot.toFixed(1)}deg) scale(1.05)`,
            },
          ],
          {
            duration: 780 + Math.random() * 260,
            delay: 40 + Math.random() * 240,
            easing: 'cubic-bezier(.4,0,.2,1)',
            fill: 'forwards',
          },
        );
      }
    } else if (typeof title.animate === 'function') {
      title.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
    } else {
      title.style.opacity = '0';
    }

    clearTimeout(timers.intro);
    timers.intro = setTimeout(() => {
      intro.hidden = true;
    }, reduced() ? 600 : 1500);
  }

  function restoreIntroTitle() {
    const title = el.introTitle;
    if (typeof title.getAnimations === 'function') title.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    title.textContent = T.title;
    title.style.opacity = '';
  }

  function showError(message) {
    const wasEntered = entered;
    errored = true;
    for (const k of ['hold', 'reveal', 'arrive', 'hintShow', 'intro', 'idle']) clearTimeout(timers[k]);
    hideCallout();
    hideHint();
    el.errText.textContent = typo(message ? String(message) : T.errorDefault);

    const intro = el.intro;
    intro.hidden = false;
    intro.removeAttribute('aria-hidden');
    intro.removeAttribute('aria-busy');
    intro.classList.remove('is-leaving');
    intro.classList.add('is-error', 'is-fonts');
    restoreIntroTitle();
    if (wasEntered && typeof intro.animate === 'function') {
      intro.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduced() ? 250 : 900, easing: EASE });
    }
    shown = false;
    root.classList.remove('is-shown', 'is-arriving', 'is-idle');
    idle = false;
  }

  /* ==========================================================================
     Chrome reveal (after the dissolve and after the self-assembly)
     ========================================================================== */

  function maybeReveal() {
    if (!entered || !revealAllowed || errored || building || shown) return;
    shown = true;
    root.classList.add('is-shown', 'is-arriving');
    clearTimeout(timers.arrive);
    timers.arrive = setTimeout(() => root.classList.remove('is-arriving'), reduced() ? 500 : 2500);
    if (!hintDone) {
      clearTimeout(timers.hintShow);
      timers.hintShow = setTimeout(showHint, reduced() ? 400 : HINT_AFTER_MS);
    }
    lastActivity = performance.now();
    scheduleIdle();
  }

  function setBuilding(on) {
    const v = !!on;
    if (v === building) return;
    building = v;
    root.classList.toggle('is-building', v);
    if (v) {
      if (shown) {
        shown = false;
        root.classList.remove('is-shown', 'is-arriving');
        clearTimeout(timers.arrive);
        clearTimeout(timers.hintShow);
        hideHint();
      }
      clearTimeout(timers.idle);
      timers.idle = 0;
      setIdle(false);
    } else {
      maybeReveal();
    }
  }

  /* ==========================================================================
     State → dock, tools
     ========================================================================== */

  function setState(s) {
    if (!s || typeof s !== 'object') return;
    for (const k of Object.keys(S)) if (k in s) S[k] = s[k];
    render();
  }

  function render() {
    const light = !!S.light;
    if (R.light !== light) {
      R.light = light;
      el.pLight.setAttribute('aria-pressed', String(light));
      el.tLight.textContent = light ? 'включён' : 'выключен';
    }

    const filter = !!S.filter;
    const avail = S.filterAvailable !== false;
    if (R.filter !== filter || R.avail !== avail) {
      R.filter = filter;
      R.avail = avail;
      el.pFilter.setAttribute('aria-pressed', String(filter));
      el.pFilter.classList.toggle('is-muted', !avail);
      el.pFilter.setAttribute('aria-label', avail ? 'Фильтр' : 'Фильтр: нет воды');
      el.tFilter.textContent = !avail ? 'нет воды' : filter ? 'работает' : 'выключен';
    }

    const water = WATER[S.water] ? S.water : 'full';
    if (R.water !== water) {
      R.water = water;
      const w = WATER[water];
      el.tWater.textContent = w.text;
      el.cWater.textContent = w.short;
      el.pWater.setAttribute('aria-label', w.aria);
      el.pWater.dataset.water = water;
      el.pWater.classList.toggle('is-moving', water === 'draining' || water === 'filling');
      if (!levelKnown) {
        if (water === 'full') setLevel(1);
        else if (water === 'empty') setLevel(0);
      }
    }

    const sound = !!S.sound;
    if (R.sound !== sound) {
      R.sound = sound;
      el.tSound.setAttribute('aria-pressed', String(sound));
      el.tSound.setAttribute('aria-label', sound ? 'Звук включён' : 'Звук выключен');
    }

    const cinema = !!S.cinema;
    if (R.cinema !== cinema) {
      R.cinema = cinema;
      root.classList.toggle('is-cinema', cinema);
      root.classList.remove('is-arriving');
      el.tCinema.setAttribute('aria-pressed', String(cinema));
      hoverChrome = 0;
      if (cinema) {
        if (labelOpen) setLabelOpen(false);
        if (el.dock.contains(document.activeElement) || el.hud.contains(document.activeElement)) el.cine.focus({ preventScroll: true });
      }
    }
  }

  function setLevel(v) {
    const lv = clamp01(v);
    if (R.level !== undefined && Math.abs(lv - R.level) < 0.004 && (lv > 0 || R.level === 0)) return;
    R.level = lv;
    level = lv;
    el.dock.style.setProperty('--nv-lvl', lv.toFixed(3));
    el.pWater.classList.toggle('is-dry', lv < 0.02);
  }

  function setMode(m) {
    const morta = m === 'morta';
    if ((mode === 'morta') === morta) return;
    mode = morta ? 'morta' : 'viva';
    root.classList.toggle('is-morta', morta);
    root.querySelectorAll('.nv-swap').forEach((sw) => {
      sw.firstElementChild.setAttribute('aria-hidden', String(morta));
      sw.lastElementChild.setAttribute('aria-hidden', String(!morta));
    });
  }

  /* ==========================================================================
     HUD
     ========================================================================== */

  const seg = (s, cls = '') => `<span class="nv-hud__seg${cls ? ' ' + cls : ''}">${s}</span>`;
  const num1 = (v) => (v == null || !Number.isFinite(+v) ? '—' : (+v).toFixed(1));

  function population(alive, frozen) {
    const a = Math.max(0, Math.round(+alive || 0));
    const f = Math.max(0, Math.round(+frozen || 0));
    if (f > 0 && a > 0) {
      return [
        `${a}${NBSP}${plural(a, 'живой', 'живых', 'живых')}`,
        `${f}${NBSP}${plural(f, 'застывший', 'застывших', 'застывших')}`,
      ];
    }
    if (f > 0) return [`${f}${NBSP}${plural(f, 'фигура', 'фигуры', 'фигур')}`];
    return [`${a}${NBSP}${plural(a, 'обитатель', 'обитателя', 'обитателей')}`];
  }

  // Three groups — readings · warnings · population. One line on desktop; on phones each group
  // becomes its own right-aligned line, so a separator never dangles at a line end.
  const SEP = '<span class="nv-hud__sep" aria-hidden="true">·</span>';
  const GSEP = '<span class="nv-hud__sep nv-hud__gsep" aria-hidden="true">·</span>';

  function hudLine(h) {
    const core = [];
    const warn = [];
    if (h.night) core.push(seg('ночь', 'nv-hud__night'));
    core.push(seg(`${num1(h.temp)}${NBSP}°C`));
    core.push(seg(`pH${NBSP}${num1(h.ph)}`));
    const low = h.o2 != null && Number.isFinite(+h.o2) && +h.o2 < 5;
    core.push(
      seg(`O<span class="nv-hud__sub">2</span>${NBSP}${num1(h.o2)}${NBSP}мг/л`, `nv-hud__o2${low ? ' is-low' : ''}`),
    );
    const murk = +h.murk;
    if (murk > 0.05) warn.push(seg(`мутность${NBSP}${Math.round(clamp01(murk) * 100)}%`));
    const lvl = +h.level;
    if (h.level != null && Number.isFinite(lvl) && lvl < 0.99) warn.push(seg(`вода${NBSP}${Math.round(clamp01(lvl) * 100)}%`));
    const pop = population(h.alive, h.frozen).map((p) => seg(p));
    const groups = [core, warn, pop].filter((g) => g.length);
    return {
      html: groups.map((g) => `<span class="nv-hud__grp">${g.join(SEP)}</span>`).join(GSEP),
      shape: groups.length,
    };
  }

  function setHUD(h) {
    if (!h || typeof h !== 'object') return;
    if (h.level != null && Number.isFinite(+h.level)) {
      levelKnown = true;
      setLevel(+h.level);
    }
    const line = hudLine(h);
    if (line.html !== hudHTML) {
      hudHTML = line.html;
      el.hudLine.innerHTML = line.html;
      if (line.shape !== R.hudShape) {
        R.hudShape = line.shape;
        measureHud();
      }
    }
  }

  // The audio pill (and, on phones, the toast) hang just below the HUD, whose height varies.
  function measureHud() {
    const b = el.hud.offsetTop + el.hud.offsetHeight;
    if (b > 0 && b !== R.hudBottom) {
      R.hudBottom = b;
      root.style.setProperty('--nv-hud-b', `${b}px`);
    }
  }

  /* ==========================================================================
     Audio pill
     ========================================================================== */

  function setAudioBlocked(blocked) {
    const v = !!blocked;
    if (v === audioBlocked) return;
    audioBlocked = v;
    root.classList.toggle('is-audio-blocked', v);
    el.audio.setAttribute('aria-hidden', String(!v));
    el.audio.tabIndex = v ? 0 : -1;
  }

  /* ==========================================================================
     Callout
     ========================================================================== */

  const co = { shown: false, visible: true, id: undefined, w: 0, h: 0, cx: 0, cy: 0, right: true, above: true, snap: true, t: 0, awayAt: 0 };

  function measureCallout() {
    co.w = el.coCard.offsetWidth;
    co.h = el.coCard.offsetHeight;
  }

  function callout(info) {
    const d = info || {};
    const same = co.shown && d.id !== undefined && d.id === co.id;
    co.id = d.id;
    const str = (v) => (v == null ? '' : String(v).trim());
    const name = str(d.name);
    const species = str(d.species);
    const latin = str(d.latin);
    const note = str(d.note);

    el.coName.textContent = name || species;
    el.coName.hidden = !(name || species);
    el.coSpecies.textContent = name ? species : '';
    el.coSpecies.hidden = !(name && species);
    el.coLatin.textContent = latin;
    el.coLatin.hidden = !latin;
    el.coNote.textContent = note ? typo(note) : '';
    el.coNote.hidden = !note;
    el.coCard.classList.toggle('is-titleless', !name && !species);
    measureCallout();

    if (!co.shown) {
      co.shown = true;
      co.snap = true;
      co.t = 0;
      co.awayAt = 0;
      co.visible = true;
      el.callout.classList.remove('is-away', 'is-drawing');
      el.callout.classList.add('is-on', 'is-pending');
      void el.callout.offsetWidth; // restart the draw-on animation
      el.callout.classList.add('is-drawing');
    } else if (!same && typeof el.coCard.animate === 'function' && !reduced()) {
      el.coCard.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 320, easing: EASE });
    }
  }

  function moveCallout(x, y, visible = true) {
    if (!co.shown) return;
    const now = performance.now();
    const dt = co.t ? Math.min(0.1, (now - co.t) / 1000) : 1 / 60;
    co.t = now;
    const px = +x;
    const py = +y;
    const vis = visible !== false && Number.isFinite(px) && Number.isFinite(py);
    if (vis !== co.visible) {
      co.visible = vis;
      el.callout.classList.toggle('is-away', !vis);
    }
    if (!vis) {
      if (!co.awayAt) co.awayAt = now;
      return;
    }
    if (co.awayAt && now - co.awayAt > 450) co.snap = true; // back after a while: don't glide across the screen
    co.awayAt = 0;

    const k = remPx / 16;
    const gap = 30 * k;
    const edge = 12 * k;
    const hys = 36 * k;
    const W = co.w;
    const H = co.h;
    const minX = edge + inset.l;
    const maxX = window.innerWidth - edge - inset.r;
    const minY = edge + inset.t;
    const maxY = window.innerHeight - edge - inset.b;

    // above-right by default; flip with a little hysteresis so it never flickers at an edge
    const fitsR = px + gap + W <= maxX;
    const fitsL = px - gap - W >= minX;
    if (co.right) {
      if (!fitsR && fitsL) co.right = false;
    } else if (fitsR && (px + gap + W + hys <= maxX || !fitsL)) co.right = true;
    const fitsA = py - gap - H >= minY;
    const fitsB = py + gap + H <= maxY;
    if (co.above) {
      if (!fitsA && fitsB) co.above = false;
    } else if (fitsA && (py - gap - H - hys >= minY || !fitsB)) co.above = true;

    const tx = clamp(co.right ? px + gap : px - gap - W, minX, Math.max(minX, maxX - W));
    const ty = clamp(co.above ? py - gap - H : py + gap, minY, Math.max(minY, maxY - H));
    if (co.snap || reduced()) {
      co.cx = tx;
      co.cy = ty;
      co.snap = false;
    } else {
      const a = 1 - Math.exp(-dt * 9);
      co.cx += (tx - co.cx) * a;
      co.cy += (ty - co.cy) * a;
    }

    const cx = Math.round(co.cx);
    const cy = Math.round(co.cy);
    // the leader meets the card at its corner nearest to the fish
    const ex = px <= cx + W / 2 ? cx : cx + W;
    const ey = py <= cy + H / 2 ? cy : cy + H;
    const dx = ex - px;
    const dy = ey - py;
    const len = Math.hypot(dx, dy) || 1;
    const start = Math.min(6 * k, len / 2);
    el.coCard.style.transform = `translate3d(${cx}px,${cy}px,0)`;
    el.coDot.style.transform = `translate3d(${px.toFixed(1)}px,${py.toFixed(1)}px,0)`;
    el.coLine.setAttribute('x1', (px + (dx / len) * start).toFixed(1));
    el.coLine.setAttribute('y1', (py + (dy / len) * start).toFixed(1));
    el.coLine.setAttribute('x2', ex);
    el.coLine.setAttribute('y2', ey);
    if (el.callout.classList.contains('is-pending')) el.callout.classList.remove('is-pending');
  }

  function hideCallout() {
    if (!co.shown) return;
    co.shown = false;
    co.id = undefined;
    el.callout.classList.remove('is-on', 'is-pending');
  }

  /* ==========================================================================
     Toast, hint
     ========================================================================== */

  function toast(message, ms = 3200) {
    clearTimeout(timers.toast);
    const wasOn = el.toast.classList.contains('is-on');
    el.toastText.textContent = typo(message == null ? '' : String(message));
    if (wasOn && typeof el.toastText.animate === 'function' && !reduced()) {
      el.toastText.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 380, easing: EASE });
    }
    el.toast.classList.add('is-on');
    timers.toast = setTimeout(() => el.toast.classList.remove('is-on'), Math.max(800, Number(ms) || 3200));
  }

  function showHint() {
    if (hintDone || !shown || errored) return;
    hintDone = true;
    // two quiet lines: how to look · what to touch
    const segs = (mqTouch.matches ? T.hintTouch : T.hintMouse)
      .split(' · ')
      .map((s) => `<span class="nv-hint__seg">${escapeHTML(typo(s))}</span>`);
    const sep = '<span class="nv-hint__sep">·</span>';
    el.hint.innerHTML =
      `<span class="nv-hint__line">${segs.slice(0, 2).join(sep)}</span>` +
      `<span class="nv-hint__line">${segs.slice(2).join(sep)}</span>`;
    el.hint.classList.add('is-on');
    clearTimeout(timers.hintHide);
    timers.hintHide = setTimeout(hideHint, HINT_MS);
  }

  function hideHint() {
    clearTimeout(timers.hintHide);
    el.hint.classList.remove('is-on');
  }

  /* ==========================================================================
     Label (desktop: always open; compact: chip → panel)
     ========================================================================== */

  function setLabelOpen(v) {
    labelOpen = !!v;
    el.label.classList.toggle('is-open', labelOpen);
    el.chip.setAttribute('aria-expanded', String(labelOpen));
    if (shown) scheduleIdle();
  }

  function setMore(v) {
    moreOpen = !!v;
    el.label.classList.toggle('is-more', moreOpen);
    el.more.setAttribute('aria-expanded', String(moreOpen));
    el.moreText.textContent = moreOpen ? T.less : T.more;
    if (shown) scheduleIdle();
  }

  el.chip.addEventListener('click', () => setLabelOpen(!labelOpen));
  el.labelClose.addEventListener('click', () => {
    setLabelOpen(false);
    el.chip.focus({ preventScroll: true });
  });
  el.more.addEventListener('click', () => setMore(!moreOpen));
  mqCompactLabel.addEventListener?.('change', () => {
    if (!mqCompactLabel.matches && labelOpen) setLabelOpen(false);
  });

  /* ==========================================================================
     Actions: buttons, keys, fullscreen, feed
     ========================================================================== */

  function flash(action) {
    const node = root.querySelector(`.nv-plate[data-action="${action}"], .nv-tool[data-action="${action}"]`);
    if (!node) return;
    node.classList.remove('is-flash');
    void node.offsetWidth;
    node.classList.add('is-flash');
    clearTimeout(node._nvFlash);
    node._nvFlash = setTimeout(() => node.classList.remove('is-flash'), 900);
  }

  function playFeed() {
    const p = el.pFeed;
    p.classList.remove('is-feeding');
    void p.offsetWidth;
    p.classList.add('is-feeding');
    clearTimeout(timers.feed);
    timers.feed = setTimeout(() => p.classList.remove('is-feeding'), 1400);
  }

  function run(action, fromKey) {
    if (action === 'fullscreen') {
      toggleFullscreen();
      return;
    }
    if (action === 'feed') playFeed();
    if (fromKey) flash(action);
    emitAction(action);
  }

  root.addEventListener('click', (e) => {
    const btn = e.target instanceof Element ? e.target.closest('[data-action]') : null;
    if (!btn || !root.contains(btn)) return;
    run(btn.dataset.action, false);
  });

  el.intro.addEventListener('click', skipIntro);

  const isEditable = (t) =>
    t instanceof Element && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

  function onKeyDown(e) {
    if (e.defaultPrevented || e.isComposing) return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    const t = e.target;
    if (isEditable(t)) return;

    if (!entered) {
      if (!errored && (e.code === 'Enter' || e.code === 'NumpadEnter' || e.key === 'Enter')) {
        e.preventDefault();
        skipIntro();
      }
      return;
    }
    if (errored) return;

    if (e.code === 'Escape' || e.key === 'Escape') {
      if (labelOpen) setLabelOpen(false);
      else if (moreOpen) setMore(false);
      else if (S.cinema) run('cinema', false);
      return;
    }

    const action = KEYMAP[e.code];
    if (!action) return;
    if (e.code === 'Space') {
      const onControl =
        t instanceof Element &&
        t !== document.body &&
        t.closest('button, a[href], summary, [role="button"], [tabindex]:not([tabindex="-1"])');
      if (onControl) return; // Space presses the focused control natively
      e.preventDefault(); // …and otherwise never scrolls
    }
    if (e.repeat) return;
    run(action, true);
  }
  window.addEventListener('keydown', onKeyDown);

  const docEl = document.documentElement;
  const fsSupported =
    !!(document.fullscreenEnabled || document.webkitFullscreenEnabled) &&
    !!(docEl.requestFullscreen || docEl.webkitRequestFullscreen);
  if (!fsSupported) el.tFs.hidden = true;

  const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;

  function toggleFullscreen() {
    if (!fsSupported) return;
    try {
      let p;
      if (fsElement()) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        p = exit && exit.call(document);
      } else {
        const req = docEl.requestFullscreen || docEl.webkitRequestFullscreen;
        p = req.call(docEl, { navigationUI: 'hide' });
      }
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (err) {
      /* the browser said no — nothing to do */
    }
  }

  function onFullscreenChange() {
    const on = !!fsElement();
    if (on === fsOn) return;
    fsOn = on;
    el.tFs.setAttribute('aria-pressed', String(on));
    el.tFs.setAttribute('aria-label', on ? 'Выйти из полноэкранного режима' : 'Во весь экран');
    el.tFs.dataset.tip = on ? 'Обычный размер' : 'Во весь экран';
    emitAction('fullscreen');
  }
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);

  /* ==========================================================================
     Idle
     ========================================================================== */

  const idleLimit = () => (moreOpen || labelOpen ? Math.max(idleMs, IDLE_READING_MS) : idleMs);

  function scheduleIdle() {
    clearTimeout(timers.idle);
    timers.idle = setTimeout(checkIdle, Math.max(40, lastActivity + idleLimit() - performance.now()));
  }

  function checkIdle() {
    timers.idle = 0;
    if (!shown || idle || errored) return;
    if (hoverChrome > 0) {
      // resting on a control is not absence
      lastActivity = performance.now();
      scheduleIdle();
      return;
    }
    if (performance.now() - lastActivity >= idleLimit() - 20) setIdle(true);
    else scheduleIdle();
  }

  function setIdle(v) {
    if (idle === v) return;
    idle = v;
    root.classList.toggle('is-idle', v);
    applyCursor();
    emitIdle(v);
  }

  function onActivity() {
    lastActivity = performance.now();
    if (idle) setIdle(false);
    if (shown && !timers.idle) scheduleIdle();
  }

  function onPointerMove(e) {
    // ignore synthetic, zero-distance moves (some browsers send them on layout changes)
    if (Math.abs(e.clientX - lastPX) < 2 && Math.abs(e.clientY - lastPY) < 2) return;
    lastPX = e.clientX;
    lastPY = e.clientY;
    onActivity();
  }

  const passiveCapture = { capture: true, passive: true };
  for (const type of ['pointerdown', 'keydown', 'wheel', 'touchstart']) window.addEventListener(type, onActivity, passiveCapture);
  window.addEventListener('pointermove', onPointerMove, passiveCapture);

  for (const node of [el.label, el.hud, el.dock, el.cine, el.audio]) {
    node.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse') hoverChrome++;
    });
    node.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse') hoverChrome = Math.max(0, hoverChrome - 1);
    });
  }

  // a tap outside the open label panel closes it; the first touch of the tank hides the hint
  window.addEventListener(
    'pointerdown',
    (e) => {
      if (labelOpen && !el.label.contains(e.target)) setLabelOpen(false);
    },
    true,
  );
  if (canvas) canvas.addEventListener('pointerdown', hideHint);

  /* ==========================================================================
     Cursor
     ========================================================================== */

  function setCursor(kind) {
    cursorKind = typeof kind === 'string' && kind ? kind : 'default';
    applyCursor();
  }

  function applyCursor() {
    if (!canvas) return;
    const c = idle && shown ? 'none' : cursorKind;
    if (R.cursor !== c) {
      R.cursor = c;
      canvas.style.cursor = c;
    }
  }

  /* ---------- go ---------- */

  window.addEventListener('resize', measure);
  measure();
  render();
  setHUD({ temp: 24.6, ph: 6.8, o2: 8.1, murk: 0, level: 1, alive: 72, frozen: 0, night: false });
  levelKnown = false;

  return {
    setProgress,
    setReady,
    showError,
    setBuilding,
    setState,
    setMode,
    setHUD,
    setAudioBlocked,
    callout,
    moveCallout,
    hideCallout,
    toast,
    setCursor,
  };
}
