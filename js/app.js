(() => {
  'use strict';

  /* ═════════════ Utilitaires ═════════════ */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* stockage indisponible */ } },
  };
  const rand = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const LANGS = ['fr', 'en', 'ar'];
  const TABS = ['table', 'builder', 'rules', 'quiz'];
  const MAX = { p: 18, n: 22, e: 18 };

  const state = {
    lang: LANGS.includes(store.get('lang', 'fr')) ? store.get('lang', 'fr') : 'fr',
    tab: TABS.includes(store.get('tab', 'table')) ? store.get('tab', 'table') : 'table',
    sel: 6,
    colorBy: 'family',
    b: { p: 0, n: 0, e: 0 },
    solved: 0,
    challenge: null,
    quiz: null,
  };

  function t(k, v) {
    const d = I18N[state.lang];
    let s = d && d[k] != null ? d[k] : (I18N.fr[k] != null ? I18N.fr[k] : k);
    if (v) s = s.replace(/\{(\w+)\}/g, (m, x) => (v[x] != null ? v[x] : m));
    return s;
  }

  /* ═════════════ Chimie ═════════════ */
  const byZ = z => ELEMENTS[z - 1];
  const period = z => (z <= 2 ? 1 : z <= 10 ? 2 : 3);
  const col = z => (z === 1 ? 1 : z === 2 ? 8 : z <= 10 ? z - 2 : z - 10);
  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  function shells(e) {
    const out = []; let r = e;
    for (const cap of [2, 8, 8]) { if (r <= 0) break; const k = Math.min(cap, r); out.push(k); r -= k; }
    return out;
  }
  const valence = z => { const s = shells(z); return s[s.length - 1]; };
  const configHTML = e => (e <= 0 ? '—' : shells(e).map((k, i) => `(${'KLM'[i]})<sup>${k}</sup>`).join(''));
  const elName = el => el.names[state.lang];

  function chargeSup(c) {
    if (!c) return '';
    const a = Math.abs(c);
    return `${a > 1 ? a : ''}${c > 0 ? '+' : '−'}`;
  }
  function nota(A, Z, sym, charge = 0) {
    const c = charge ? `<span class="nC${charge < 0 ? ' neg' : ''}">${chargeSup(charge)}</span>` : '';
    return `<span class="nota"><span class="nA">${A}</span><span class="nZ">${Z}</span><span class="nS">${sym}</span>${c}</span>`;
  }
  const ionHTML = (sym, c) => `${sym}<sup>${chargeSup(c)}</sup>`;

  /* ═════════════ Nombres (notation française) ═════════════ */
  const SUPD = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '+': '⁺' };
  const UNSUP = Object.fromEntries(Object.entries(SUPD).map(([a, b]) => [b, a]));
  const supU = s => String(s).split('').map(c => SUPD[c] || c).join('');
  const dec = n => String(n).replace('.', ',');

  function sciParts(a, sig) {
    let ex = Math.floor(Math.log10(a));
    let m = +(a / Math.pow(10, ex)).toPrecision(sig);
    if (m >= 10) { m = +(m / 10).toPrecision(sig); ex++; }
    return { m, ex };
  }
  // HTML : 1,92 × 10<sup>−18</sup>
  function sci(x, sig = 3) {
    if (!isFinite(x)) return '—';
    if (x === 0) return '0';
    const sign = x < 0 ? '−' : '';
    const a = Math.abs(x);
    if (a >= 0.01 && a < 1e5) return sign + dec(+a.toPrecision(sig + 1));
    const { m, ex } = sciParts(a, sig);
    return `${sign}${dec(m)} × 10<sup>${ex < 0 ? '−' : ''}${Math.abs(ex)}</sup>`;
  }
  // Texte brut pour les champs : 1,92×10⁻¹⁸
  function sciU(x, sig = 3) {
    if (!isFinite(x)) return '';
    if (x === 0) return '0';
    const sign = x < 0 ? '-' : '';
    const a = Math.abs(x);
    if (a >= 0.01 && a < 1e5) return sign + dec(+a.toPrecision(sig + 1));
    const { m, ex } = sciParts(a, sig);
    return `${sign}${dec(m)}×10${supU(ex)}`;
  }
  // Accepte 1,92e-18 · 1.92×10^-18 · 1,92×10⁻¹⁸ · 1.92*10-18
  function parseNum(s) {
    if (s == null) return NaN;
    s = String(s).trim().replace(/\s+/g, '').replace(/,/g, '.').replace(/[−–]/g, '-')
      .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]/g, c => UNSUP[c]);
    if (s === '') return NaN;
    let m = s.match(/^([+-]?(?:\d+\.?\d*|\.\d+))(?:[x×*·]10\^?([+-]?\d+))?$/i);
    if (m) return parseFloat(m[1]) * (m[2] !== undefined ? Math.pow(10, +m[2]) : 1);
    m = s.match(/^([+-]?)10\^?([+-]?\d+)$/);
    if (m) return (m[1] === '-' ? -1 : 1) * Math.pow(10, +m[2]);
    return Number(s);
  }
  const nearInt = x => Math.abs(x - Math.round(x)) < 1e-6 * Math.max(1, Math.abs(x));
  const fmtVal = x => (nearInt(x) ? String(Math.round(x)) : dec(+x.toPrecision(4)));

  const E_TXT = '1,6×10<sup>−19</sup>';
  const MP_TXT = '1,67×10<sup>−27</sup>';
  const ME_TXT = '9,1×10<sup>−31</sup>';
  const v = s => `<span class="var">${s}</span>`;
  const Q = sub => `${v('q')}<sub>${sub}</sub>`;

  /* ═════════════ Couleurs ═════════════ */
  const catColor = cat => `var(--cat-${cat})`;
  const shellColor = n => ['', 'oklch(91% 0.06 75)', 'oklch(85% 0.09 50)', 'oklch(77% 0.12 33)'][n];
  const valColor = n => `oklch(${(95 - n * 3.6).toFixed(1)}% ${(0.025 + n * 0.014).toFixed(3)} 255)`;
  function cellColor(el) {
    if (state.colorBy === 'shells') return shellColor(period(el.z));
    if (state.colorBy === 'valence') return valColor(valence(el.z));
    return catColor(el.cat);
  }

  /* ═════════════ Dessin de l'atome (modèle en couches) ═════════════ */
  const SHELL_R = [60, 90, 120];
  const SHELL_DUR = [7, 11, 16];
  function atomSVG(p, n, e, o = {}) {
    const N = p + n, c = 6, pr = 5.5;
    let nuc = '';
    if (N) nuc += `<circle class="glow" r="${(c * Math.sqrt(N) + pr + 6).toFixed(1)}"/>`;
    // Répartition régulière des protons parmi les nucléons
    const types = [];
    for (let i = 0; i < N; i++) types.push(Math.floor((i + 1) * p / N) > Math.floor(i * p / N) ? 'p' : 'n');
    for (let i = N - 1; i >= 0; i--) {
      const r = N === 1 ? 0 : c * Math.sqrt(i + 0.5), th = i * 2.399963;
      const x = (r * Math.cos(th)).toFixed(2), y = (r * Math.sin(th)).toFixed(2);
      nuc += types[i] === 'p'
        ? `<g transform="translate(${x} ${y})"><circle class="pp" r="${pr}"/><path class="pm" d="M-2.2 0H2.2M0-2.2V2.2"/></g>`
        : `<g transform="translate(${x} ${y})"><circle class="nn" r="${pr}"/></g>`;
    }
    const sh = shells(e);
    let rings = '', orbits = '';
    SHELL_R.forEach((R, k) => {
      rings += `<circle class="ring${k < sh.length ? ' on' : ''}" r="${R}"/>`;
      if (o.labels !== false) rings += `<text class="shl" x="${(R * 0.707 + 3).toFixed(1)}" y="${(-R * 0.707 - 3).toFixed(1)}">${'KLM'[k]}</text>`;
    });
    const now = performance.now() / 1000;
    sh.forEach((cnt, k) => {
      const R = SHELL_R[k], d = SHELL_DUR[k];
      let els = '';
      for (let i = 0; i < cnt; i++) {
        const a = (i / cnt) * Math.PI * 2 - Math.PI / 2 + k * 0.4;
        const isNew = o.newE && k === sh.length - 1 && i === cnt - 1;
        els += `<g transform="translate(${(R * Math.cos(a)).toFixed(2)} ${(R * Math.sin(a)).toFixed(2)})"><g${isNew ? ' class="pop"' : ''}><circle class="ec" r="5.4"/><path class="em" d="M-2.3 0H2.3"/></g></g>`;
      }
      orbits += `<g class="orbit" style="animation-duration:${d}s;animation-delay:${(-(now % d)).toFixed(2)}s">${els}</g>`;
    });
    return `<svg class="atom" viewBox="-136 -136 272 272" role="img" aria-label="p=${p} n=${n} e=${e}">${rings}<g class="nuc${o.pulse ? ' pulse' : ''}">${nuc}</g>${orbits}</svg>`;
  }

  /* ═════════════ Langue & onglets ═════════════ */
  function applyLang() {
    const html = document.documentElement;
    html.lang = state.lang;
    html.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
    $$('[data-i18n]').forEach(n => { n.textContent = t(n.dataset.i18n); });
    $$('[data-i18n-html]').forEach(n => { n.innerHTML = t(n.dataset.i18nHtml); });
    $$('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang)));
    document.title = t('app.title').replace(/<[^>]+>/g, '');
    renderTable(); renderDetail(false); renderBuilder(); renderQuiz();
  }

  function setTab(tab) {
    state.tab = tab; store.set('tab', tab);
    $$('.tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    $$('.panel').forEach(p => p.classList.toggle('active', p.dataset.panel === tab));
    if (tab === 'builder' && !state.challenge) newChallenge();
  }

  /* ═════════════ 01 · Tableau ═════════════ */
  function renderTable() {
    const pt = $('#ptable');
    let h = '<div></div>';
    for (let c = 1; c <= 8; c++) h += `<div class="colh">${ROMAN[c]}</div>`;
    for (let per = 1; per <= 3; per++) {
      h += `<div class="rowh"><b>${per}</b><small>${'KLM'.slice(0, per).split('').join(' ')}</small></div>`;
      for (let c = 1; c <= 8; c++) {
        const el = ELEMENTS.find(x => period(x.z) === per && col(x.z) === c);
        if (el) {
          h += `<button type="button" class="cell" data-z="${el.z}" data-cat="${el.cat}" data-shells="${period(el.z)}" data-val="${valence(el.z)}"
            style="--c:${cellColor(el)}" aria-pressed="${el.z === state.sel}" aria-label="${elName(el)}, Z = ${el.z}">
            <span class="z">${el.z}</span><span class="s">${el.sym}</span><span class="nm">${elName(el)}</span></button>`;
        } else if (per === 1 && c === 2) {
          h += `<div class="readout" id="readout"></div>`;
        } else if (per === 1) {
          /* espace couvert par la zone de lecture */
        } else h += '<div></div>';
      }
    }
    pt.innerHTML = h;
    setReadout(null);
    $$('#colorBy button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === state.colorBy)));
    renderLegend();
  }

  function setReadout(z) {
    const r = $('#readout'); if (!r) return;
    if (!z) { r.innerHTML = `<span>${t('table.hover')}</span>`; return; }
    const el = byZ(z);
    r.innerHTML = `<b>${elName(el)}</b><span dir="ltr">Z = ${z} · A = ${el.A} · <span class="cfg">${configHTML(z)}</span></span>`;
  }

  function renderLegend() {
    let items = [];
    if (state.colorBy === 'family') items = CATEGORIES.map(cat => ({ key: 'cat', val: cat, c: catColor(cat), label: t('cat.' + cat) }));
    if (state.colorBy === 'shells') items = [1, 2, 3].map(n => ({ key: 'shells', val: n, c: shellColor(n), label: t('legend.shells', { n }) }));
    if (state.colorBy === 'valence') items = [1, 2, 3, 4, 5, 6, 7, 8].map(n => ({ key: 'val', val: n, c: valColor(n), label: t('legend.valence', { n }) }));
    $('#legend').innerHTML = items.map(i => `<li data-key="${i.key}" data-val="${i.val}" style="--c:${i.c}"><i></i>${i.label}</li>`).join('');
  }

  function renderDetail(animate = true) {
    const el = byZ(state.sel), z = el.z, N = el.A - z;
    const qn = z * E_CHARGE, mn = el.A * M_P, ma = el.A * M_P + z * M_E;
    let ion;
    if (el.ion === 0) ion = t('d.ionNone');
    else if (el.ion === null) ion = t('d.ionRare');
    else ion = `<span dir="ltr">${ionHTML(el.sym, el.ion)}</span> · ${t(el.ion > 0 ? 'd.ionLose' : 'd.ionGain', { n: Math.abs(el.ion) })}`;
    const d = $('#detail');
    d.innerHTML = `
      <div class="d-head">
        <div class="d-sym" style="--c:${catColor(el.cat)}">${nota(el.A, z, el.sym)}</div>
        <div>
          <h3>${elName(el)}</h3>
          <span class="chip" style="--c:${catColor(el.cat)}">${t('cat.' + el.cat)}</span>
          <p class="d-pos">${t('period')} ${period(z)} · ${t('group')} ${ROMAN[col(z)]}</p>
        </div>
      </div>
      <div class="d-atom">${atomSVG(z, N, z, { pulse: animate })}</div>
      <dl class="facts">
        <div><dt>${t('d.Z')}</dt><dd>${z}</dd></div>
        <div><dt>${t('d.A')}</dt><dd>${el.A}</dd></div>
        <div><dt>${t('d.p')}</dt><dd class="c-p">${z}</dd></div>
        <div><dt>${t('d.n')}</dt><dd class="c-n">${N}</dd></div>
        <div><dt>${t('d.e')}</dt><dd class="c-e">${z}</dd></div>
      </dl>
      <div class="d-row"><span>${t('d.config')}</span><b class="cfgv" dir="ltr">${configHTML(z)}</b></div>
      <div class="d-row"><span>${t('d.valence')}</span><b>${valence(z)}</b></div>
      <div class="d-row"><span>${t('d.ion')}</span><b>${ion}</b></div>
      <details class="d-calc" ${store.get('calcOpen', true) ? 'open' : ''}>
        <summary>${t('d.calc')}</summary>
        <div class="formulas" dir="ltr" lang="fr">
          <div class="ln">${Q('noyau')} = ${v('Z')} × ${E_TXT} = ${z} × ${E_TXT} = <b class="qp">${sci(qn)} C</b></div>
          <div class="ln">${Q('électrons')} = ${v('N')}<sub>e</sub> × (−${E_TXT}) = <b class="qe">${sci(-qn)} C</b></div>
          <div class="ln">${Q('atome')} = ${Q('noyau')} + ${Q('électrons')} = <b>0 C</b><span class="tag-ok">neutre</span></div>
          <div class="ln">${v('m')}<sub>noyau</sub> = ${v('A')} × ${v('m')}<sub>p</sub> = ${el.A} × ${MP_TXT} = <b>${sci(mn)} kg</b></div>
          <div class="ln">${v('m')}<sub>atome</sub> = ${v('A')} × ${v('m')}<sub>p</sub> + ${v('Z')} × ${v('m')}<sub>e</sub> = <b>${sci(ma, 4)} kg</b></div>
          <div class="ln">${v('N')} = ${v('A')} − ${v('Z')} = ${el.A} − ${z} = <b>${N}</b> neutrons</div>
        </div>
      </details>
      <p class="fact"><span>${t('d.fact')}</span>${el.fact[state.lang]}</p>
      <button type="button" class="btn" id="toBuilder">${t('d.build')} <span class="arr">→</span></button>`;
    if (animate && !reduceMotion) { d.classList.remove('swap'); void d.offsetWidth; d.classList.add('swap'); }
  }

  function selectZ(z) {
    state.sel = z;
    $$('#ptable .cell').forEach(c => c.setAttribute('aria-pressed', String(+c.dataset.z === z)));
    renderDetail(true);
  }

  function bindTable() {
    const pt = $('#ptable');
    pt.addEventListener('click', e => { const c = e.target.closest('.cell'); if (c) selectZ(+c.dataset.z); });
    pt.addEventListener('mouseover', e => { const c = e.target.closest('.cell'); setReadout(c ? +c.dataset.z : null); });
    pt.addEventListener('mouseleave', () => setReadout(null));
    pt.addEventListener('focusin', e => { const c = e.target.closest('.cell'); if (c) setReadout(+c.dataset.z); });
    pt.addEventListener('keydown', e => {
      const c = e.target.closest('.cell'); if (!c) return;
      const z = +c.dataset.z, per = period(z), cl = col(z);
      const dirs = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] };
      const d = dirs[e.key]; if (!d) return;
      e.preventDefault();
      let p2 = per + d[0], c2 = cl + d[1], target = null;
      while (p2 >= 1 && p2 <= 3 && c2 >= 1 && c2 <= 8) {
        target = ELEMENTS.find(x => period(x.z) === p2 && col(x.z) === c2);
        if (target) break;
        p2 += d[0]; c2 += d[1];
      }
      if (target) { const btn = $(`#ptable .cell[data-z="${target.z}"]`); btn.focus(); selectZ(target.z); }
    });
    $('#colorBy').addEventListener('click', e => {
      const b = e.target.closest('[data-mode]'); if (!b) return;
      state.colorBy = b.dataset.mode;
      $$('#colorBy button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      $$('#ptable .cell').forEach(c => { c.style.setProperty('--c', cellColor(byZ(+c.dataset.z))); });
      renderLegend();
    });
    const lg = $('#legend');
    lg.addEventListener('mouseover', e => {
      const li = e.target.closest('li'); if (!li) return;
      pt.classList.add('dim');
      $$('#ptable .cell').forEach(c => c.classList.toggle('hit', c.dataset[li.dataset.key] === li.dataset.val));
    });
    lg.addEventListener('mouseleave', () => { pt.classList.remove('dim'); $$('#ptable .hit').forEach(c => c.classList.remove('hit')); });
    $('#detail').addEventListener('click', e => {
      if (e.target.closest('#toBuilder')) {
        const el = byZ(state.sel);
        setB(el.z, el.A - el.z, el.z, null);
        setTab('builder');
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    });
    $('#detail').addEventListener('toggle', e => { if (e.target.matches('.d-calc')) store.set('calcOpen', e.target.open); }, true);
  }

  /* ═════════════ 02 · Construire ═════════════ */
  function setB(p, n, e, added) {
    state.b = { p: clamp(p, 0, MAX.p), n: clamp(n, 0, MAX.n), e: clamp(e, 0, MAX.e) };
    renderBuilder(added);
    checkChallenge();
  }
  function addParticle(type, delta = 1) {
    const b = { ...state.b };
    const before = b[type];
    b[type] = clamp(b[type] + delta, 0, MAX[type]);
    if (b[type] === before) return;
    setB(b.p, b.n, b.e, delta > 0 ? type : null);
  }

  function renderBuilder(added) {
    const { p, n, e } = state.b;
    const stage = $('#stage');
    stage.classList.toggle('is-empty', p + n + e === 0);
    $('#stageSvg').innerHTML = atomSVG(p, n, e, { pulse: added === 'p' || added === 'n', newE: added === 'e' });
    ['p', 'n', 'e'].forEach(k => {
      $('#cnt-' + k).textContent = state.b[k];
      $(`[data-dec="${k}"]`).disabled = state.b[k] === 0;
      $(`[data-inc="${k}"]`).disabled = state.b[k] === MAX[k];
    });

    const id = $('#identity');
    const live = $('#live');
    if (p === 0) {
      id.className = 'identity empty';
      id.textContent = t('b.empty');
    } else {
      const el = byZ(p), A = p + n, ch = p - e;
      const tags = [];
      if (ch === 0) tags.push(`<span class="t ok">${t('b.atom')}</span>`);
      else if (ch > 0) tags.push(`<span class="t plus">${t('b.cation')} · ${t('b.lost', { n: ch })}</span>`);
      else tags.push(`<span class="t minus">${t('b.anion')} · ${t('b.gained', { n: -ch })}</span>`);
      tags.push(el.stableN.includes(n) ? `<span class="t ok">${t('b.stable')}</span>` : `<span class="t warn">${t('b.unstable')}</span>`);
      id.className = 'identity';
      id.innerHTML = `
        <div class="big">${nota(A, p, el.sym, ch)}</div>
        <div class="nm">${elName(el)}</div>
        <div class="tags">${tags.join('')}</div>
        <div class="cfgline" dir="ltr">${configHTML(e)}</div>`;
    }

    // Calculs en direct (en français)
    const A = p + n, qn = p * E_CHARGE, qe = -e * E_CHARGE, qt = qn + qe;
    const verdict = p === 0 ? '' : qt === 0 ? '<span class="tag-ok">atome neutre</span>' : `<span class="tag-ion">ion ${qt > 0 ? 'positif' : 'négatif'}</span>`;
    live.innerHTML = `
      <div class="ln">${Q('noyau')} = ${v('Z')} × ${E_TXT} = ${p} × ${E_TXT} = <b class="qp">${sci(qn)} C</b></div>
      <div class="ln">${Q('électrons')} = ${v('N')}<sub>e</sub> × (−${E_TXT}) = ${e} × (−${E_TXT}) = <b class="qe">${sci(qe)} C</b></div>
      <div class="ln">${Q('totale')} = ${Q('noyau')} + ${Q('électrons')} = <b>${sci(qt)} C</b>${verdict}</div>
      <div class="ln">${v('A')} = ${v('Z')} + ${v('N')} = ${p} + ${n} = <b>${A}</b></div>
      <div class="ln">${v('m')}<sub>noyau</sub> = ${v('A')} × ${v('m')}<sub>p</sub> = ${A} × ${MP_TXT} = <b>${sci(A * M_P)} kg</b></div>
      <div class="ln">${v('m')} = ${v('A')} × ${v('m')}<sub>p</sub> + ${v('N')}<sub>e</sub> × ${v('m')}<sub>e</sub> = <b>${sci(A * M_P + e * M_E, 4)} kg</b></div>`;

    // Mini-tableau
    let m = '';
    for (const el of ELEMENTS) {
      m += `<button type="button" data-z="${el.z}" style="--c:${catColor(el.cat)}" aria-current="${el.z === p}" title="${elName(el)}">${el.sym}</button>`;
      if (el.z === 1) m += '<span class="gap"></span>';
    }
    $('#mini').innerHTML = m;
    renderChallenge();
  }

  function newChallenge() {
    let c;
    do {
      const el = rand(ELEMENTS);
      const useIon = el.ion && Math.random() < 0.55;
      c = useIon ? { z: el.z, charge: el.ion } : { z: el.z, charge: 0, A: el.A };
    } while (state.challenge && state.challenge.z === c.z && state.challenge.charge === c.charge);
    c.done = false;
    state.challenge = c;
    renderChallenge();
  }
  function checkChallenge() {
    const c = state.challenge; if (!c || c.done) return;
    const { p, n, e } = state.b;
    if (p === c.z && p - e === c.charge && (c.A ? p + n === c.A : byZ(p).stableN.includes(n))) {
      c.done = true; state.solved++;
      burst($('#stage'));
      renderChallenge();
    }
  }
  function renderChallenge() {
    const c = state.challenge, box = $('#challenge');
    if (!c) { box.innerHTML = ''; return; }
    const el = byZ(c.z);
    const goal = c.charge
      ? t('b.buildIon', { x: `<span dir="ltr">${ionHTML(el.sym, c.charge)}</span>` })
      : t('b.buildAtom', { x: nota(c.A, c.z, el.sym) });
    box.classList.toggle('done', c.done);
    box.innerHTML = `
      <span class="lbl">${c.done ? '✓ ' + t('b.success') : t('b.challenge')}</span>
      <div class="side">
        <span class="count">${t('b.solved', { n: state.solved })}</span>
        <button type="button" class="btn ${c.done ? '' : 'ghost'}" id="newCh">${t('b.newChallenge')}</button>
      </div>
      <div class="goal">${goal}</div>
      ${c.charge ? `<div class="sub">${t('b.anyN')}</div>` : ''}`;
  }

  function burst(anchor) {
    if (reduceMotion) return;
    const r = anchor.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const cols = ['var(--proton)', 'var(--electron)', 'var(--neutron)'];
    for (let i = 0; i < 28; i++) {
      const s = document.createElement('span');
      s.className = 'burst';
      const a = Math.random() * Math.PI * 2, dist = r.width * (0.3 + Math.random() * 0.4);
      s.style.cssText = `left:${cx - 5}px;top:${cy - 5}px;background:${cols[i % 3]};--dx:${Math.cos(a) * dist}px;--dy:${Math.sin(a) * dist}px;animation-delay:${Math.random() * 0.12}s`;
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 1200);
    }
  }

  function bindBuilder() {
    const tray = $('#tray'), stage = $('#stage');
    tray.addEventListener('click', e => {
      const inc = e.target.closest('[data-inc]'), decB = e.target.closest('[data-dec]'), tok = e.target.closest('[data-drag]');
      if (inc) addParticle(inc.dataset.inc, 1);
      else if (decB) addParticle(decB.dataset.dec, -1);
      else if (tok && e.detail === 0) addParticle(tok.dataset.drag, 1); // clavier
    });
    $('#resetB').addEventListener('click', () => setB(0, 0, 0, null));
    $('#mini').addEventListener('click', e => {
      const b = e.target.closest('[data-z]'); if (!b) return;
      const el = byZ(+b.dataset.z);
      setB(el.z, el.A - el.z, el.z, 'p');
    });
    $('#challenge').addEventListener('click', e => { if (e.target.closest('#newCh')) newChallenge(); });

    // Glisser-déposer des particules
    let drag = null;
    const isOver = ev => {
      const r = stage.getBoundingClientRect();
      return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
    };
    tray.addEventListener('pointerdown', ev => {
      const tok = ev.target.closest('[data-drag]'); if (!tok || ev.button > 0) return;
      ev.preventDefault();
      const ghost = tok.cloneNode(true);
      ghost.classList.add('ghost'); ghost.removeAttribute('data-drag');
      document.body.appendChild(ghost);
      const r = tok.getBoundingClientRect();
      drag = { type: tok.dataset.drag, ghost, x0: ev.clientX, y0: ev.clientY, moved: false, half: r.width / 2 };
      move(ev);
    });
    function move(ev) {
      if (!drag) return;
      drag.ghost.style.transform = `translate(${ev.clientX - drag.half}px, ${ev.clientY - drag.half}px)`;
      if (Math.hypot(ev.clientX - drag.x0, ev.clientY - drag.y0) > 5) drag.moved = true;
      stage.classList.toggle('over', drag.moved && isOver(ev));
    }
    function up(ev) {
      if (!drag) return;
      const over = isOver(ev), d = drag;
      drag = null;
      d.ghost.remove(); stage.classList.remove('over');
      if (over || !d.moved) addParticle(d.type, 1);
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', () => { if (drag) { drag.ghost.remove(); drag = null; stage.classList.remove('over'); } });

    // Raccourcis clavier : P / N / E (Maj pour retirer)
    document.addEventListener('keydown', e => {
      if (state.tab !== 'builder' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
      const k = { p: 'p', n: 'n', e: 'e' }[e.key.toLowerCase()];
      if (k) { e.preventDefault(); addParticle(k, e.shiftKey ? -1 : 1); }
    });
  }

  /* ═════════════ 03 · Règles (en français) ═════════════ */
  const elOptions = sel => ELEMENTS.map(el => `<option value="${el.z}"${el.z === sel ? ' selected' : ''}>${el.z} · ${el.sym} · ${el.names.fr}</option>`).join('');
  const frac = (a, b) => `<span class="frac"><span>${a}</span><span>${b}</span></span>`;

  function renderRules() {
    const R = [
      {
        title: 'Charge du noyau',
        main: `${Q('noyau')} = ${v('Z')} × ${E_TXT} C`,
        inv: `${v('Z')} = ${frac(Q('noyau'), E_TXT)}`,
        note: `${v('Z')} : numéro atomique (nombre de protons). La charge du noyau est toujours positive.`,
        calc: 'r1',
      },
      {
        title: 'Charge des électrons',
        main: `${Q('électrons')} = ${v('N')}<sub>e</sub> × (−${E_TXT}) C`,
        inv: `${v('N')}<sub>e</sub> = ${frac(Q('électrons'), '−' + E_TXT)}`,
        note: `${v('N')}<sub>e</sub> : nombre d'électrons. La charge des électrons est toujours négative.`,
        calc: 'r2',
      },
      {
        title: "Charge de l'atome",
        main: `${Q('atome')} = ${Q('noyau')} + ${Q('électrons')} = 0 C`,
        note: `L'atome est électriquement neutre : il possède autant d'électrons que de protons (${v('N')}<sub>e</sub> = ${v('Z')}). Fais varier les deux nombres pour voir l'équilibre se rompre.`,
        calc: 'r3',
      },
      {
        title: "Charge d'un ion",
        main: `${Q('ion')} = ± ${v('n')} × ${E_TXT} C`,
        inv: `${v('n')} = ${frac(Q('ion'), E_TXT)}`,
        note: `${v('n')} : nombre d'électrons gagnés ou perdus. Signe + : l'atome a perdu des électrons (cation). Signe − : il en a gagné (anion).`,
        calc: 'r4',
      },
      {
        title: 'Masse du noyau',
        main: `${v('m')}<sub>noyau</sub> = ${v('A')} × ${v('m')}<sub>p</sub>`,
        inv: `${v('A')} = ${frac(v('m') + '<sub>noyau</sub>', v('m') + '<sub>p</sub>')}`,
        note: `${v('A')} : nombre de masse (nombre de nucléons : protons + neutrons).`,
        calc: 'r5',
      },
      {
        title: "Masse de l'atome",
        main: `${v('m')}<sub>atome</sub> = ${v('A')} × ${v('m')}<sub>p</sub> + ${v('Z')} × ${v('m')}<sub>e</sub>`,
        note: `${v('m')}<sub>p</sub> ≈ ${v('m')}<sub>n</sub> = ${MP_TXT} kg ; ${v('m')}<sub>e</sub> = ${ME_TXT} kg. La masse des électrons est négligeable : ${v('m')}<sub>atome</sub> ≈ ${v('m')}<sub>noyau</sub>.`,
        calc: 'r6',
      },
      {
        title: 'Nombre de nucléons',
        main: `${v('A')} = ${v('Z')} + ${v('N')}`,
        inv: `${v('N')} = ${v('A')} − ${v('Z')}`,
        note: `${v('A')} : nombre de masse ; ${v('Z')} : nombre de protons ; ${v('N')} : nombre de neutrons.`,
        calc: 'r7',
      },
    ];

    let h = `<div class="consts">
      <span><b>Charge élémentaire</b>${v('e')} = ${E_TXT} C</span>
      <span><b>Masse d'un nucléon</b>${v('m')}<sub>p</sub> ≈ ${v('m')}<sub>n</sub> = ${MP_TXT} kg</span>
      <span><b>Masse d'un électron</b>${v('m')}<sub>e</sub> = ${ME_TXT} kg</span>
    </div>`;
    R.forEach((r, i) => {
      h += `<article class="rule">
        <div class="no">${i + 1}</div>
        <div>
          <h4>${r.title}</h4>
          <p class="main">${r.main}</p>
          ${r.inv ? `<p class="inv">${r.inv}</p>` : ''}
          <p class="note">${r.note}</p>
        </div>
        <div class="calc" id="${r.calc}"></div>
      </article>`;
    });
    h += `<aside class="remark">
      <span class="bulb">Remarque</span>
      <div>
        <p>Dans un atome : <span class="formula">${v('N')}<sub>e</sub> = ${v('Z')}</span>, c'est-à-dire :</p>
        <p class="formula">${Q('électrons')} = ${v('Z')} × (−${E_TXT}) C</p>
      </div>
    </aside>`;
    $('#rules').innerHTML = h;

    // Règle 1 : Z ⇄ q_noyau
    linked($('#r1'), {
      a: { label: `Numéro atomique <span class="var">Z</span>`, init: '12' },
      b: { label: `<span class="var">q</span><sub>noyau</sub> (C)` },
      ab: Z => Z * E_CHARGE, ba: q => q / E_CHARGE,
      stepA: (Z, q) => `${Q('noyau')} = ${fmtVal(Z)} × ${E_TXT} = <b>${sci(q)} C</b>` + intCheck(Z, 'Z'),
      stepB: (q, Z) => `${v('Z')} = ${sci(q)} / ${E_TXT} = <b>${fmtVal(Z)}</b>` + identify(Z) + (q < 0 ? warn('La charge du noyau est positive.') : ''),
    });
    // Règle 2 : Ne ⇄ q_électrons
    linked($('#r2'), {
      a: { label: `Nombre d'électrons <span class="var">N</span><sub>e</sub>`, init: '10' },
      b: { label: `<span class="var">q</span><sub>électrons</sub> (C)` },
      ab: n => -n * E_CHARGE, ba: q => q / -E_CHARGE,
      stepA: (n, q) => `${Q('électrons')} = ${fmtVal(n)} × (−${E_TXT}) = <b>${sci(q)} C</b>` + intCheck(n, 'Nₑ'),
      stepB: (q, n) => `${v('N')}<sub>e</sub> = ${sci(q)} / (−${E_TXT}) = <b>${fmtVal(n)}</b>` + (n < 0 ? warn('La charge des électrons doit être négative : as-tu oublié le signe − ?') : intCheck(n, 'Nₑ')),
    });
    ruleBalance($('#r3'));
    // Règle 4 : n (avec signe) ⇄ q_ion
    linked($('#r4'), {
      a: { label: `Électrons perdus (+) ou gagnés (−) : <span class="var">±n</span>`, init: '-2' },
      b: { label: `<span class="var">q</span><sub>ion</sub> (C)` },
      ab: n => n * E_CHARGE, ba: q => q / E_CHARGE,
      stepA: (n, q) => `${Q('ion')} = ${n > 0 ? '+' : n < 0 ? '−' : ''}${fmtVal(Math.abs(n))} × ${E_TXT} = <b>${sci(q)} C</b>` + ionVerdict(n),
      stepB: (q, n) => `${v('n')} = ${sci(Math.abs(q))} / ${E_TXT} = <b>${fmtVal(Math.abs(n))}</b>` + ionVerdict(n),
    });
    // Règle 5 : A ⇄ m_noyau
    linked($('#r5'), {
      a: { label: `Nombre de masse <span class="var">A</span>`, init: '23' },
      b: { label: `<span class="var">m</span><sub>noyau</sub> (kg)` },
      ab: A => A * M_P, ba: m => m / M_P,
      stepA: (A, m) => `${v('m')}<sub>noyau</sub> = ${fmtVal(A)} × ${MP_TXT} = <b>${sci(m)} kg</b>` + intCheck(A, 'A'),
      stepB: (m, A) => `${v('A')} = ${sci(m)} / ${MP_TXT} = <b>${fmtVal(A)}</b>` + intCheck(A, 'A'),
    });
    ruleAtomMass($('#r6'));
    ruleAZN($('#r7'));
  }

  const warn = s => `<div class="warn">⚠ ${s}</div>`;
  function intCheck(x, name) {
    if (!isFinite(x)) return '';
    if (!nearInt(x)) return warn(`${name} doit être un nombre entier : vérifie la valeur saisie.`);
    if (x < 0) return warn(`${name} ne peut pas être négatif.`);
    return '';
  }
  function identify(Z) {
    const zi = Math.round(Z);
    if (!nearInt(Z)) return intCheck(Z, 'Z');
    if (zi >= 1 && zi <= 18) { const el = byZ(zi); return `<div class="verdict">→ C'est le noyau de l'atome de ${el.names.fr} (${el.sym}).</div>`; }
    if (zi > 18) return `<div class="verdict">→ Élément hors des 3 premières périodes.</div>`;
    return '';
  }
  function ionVerdict(n) {
    if (!isFinite(n)) return '';
    if (!nearInt(n)) return intCheck(n, 'n');
    const k = Math.round(n);
    if (k === 0) return `<div class="verdict">→ Aucune charge : c'est un atome neutre, pas un ion.</div>`;
    return k > 0
      ? `<div class="verdict" style="color:var(--proton)">→ L'atome a perdu ${k} électron${k > 1 ? 's' : ''} : c'est un ion positif (cation).</div>`
      : `<div class="verdict" style="color:var(--electron)">→ L'atome a gagné ${-k} électron${k < -1 ? 's' : ''} : c'est un ion négatif (anion).</div>`;
  }

  // Calculatrice bidirectionnelle à deux champs
  function linked(box, cfg) {
    box.innerHTML = `
      <div class="calc-row">
        <label>${cfg.a.label}<input type="text" inputmode="decimal" autocomplete="off" spellcheck="false" data-a></label>
        <span class="swap" aria-hidden="true">⇄</span>
        <label>${cfg.b.label}<input type="text" inputmode="decimal" autocomplete="off" spellcheck="false" data-b></label>
      </div>
      <div class="steps" aria-live="polite"></div>`;
    const a = $('[data-a]', box), b = $('[data-b]', box), steps = $('.steps', box);
    a.value = cfg.a.init;
    const bad = '<div class="warn">Entre un nombre, par exemple 1,6×10⁻¹⁹ ou 1,6e-19.</div>';
    function fromA() {
      const x = parseNum(a.value);
      if (!isFinite(x)) { steps.innerHTML = a.value.trim() ? bad : ''; return; }
      const y = cfg.ab(x); b.value = sciU(y); steps.innerHTML = cfg.stepA(x, y);
    }
    function fromB() {
      const y = parseNum(b.value);
      if (!isFinite(y)) { steps.innerHTML = b.value.trim() ? bad : ''; return; }
      const x = cfg.ba(y); a.value = fmtVal(x); steps.innerHTML = cfg.stepB(y, x);
    }
    a.addEventListener('input', fromA);
    b.addEventListener('input', fromB);
    fromA();
  }

  // Règle 3 : balance des charges
  function ruleBalance(box) {
    box.innerHTML = `
      <div class="calc-row">
        <label>Protons <span class="var">Z</span> = <output data-oz>6</output><input type="range" min="1" max="18" value="6" data-z></label>
        <label>Électrons <span class="var">N</span><sub>e</sub> = <output data-oe>6</output><input type="range" min="0" max="18" value="6" data-e></label>
      </div>
      <svg class="balance" viewBox="0 0 320 150" aria-hidden="true">
        <path class="base" d="M150 140 L170 140 L160 104 Z"/>
        <rect x="120" y="138" width="80" height="4" rx="2" class="base"/>
        <g class="beam" data-beam style="transform-origin:160px 104px">
          <rect class="bar" x="30" y="102" width="260" height="4" rx="2"/>
          <path class="pan" d="M30 104 L60 104 M290 104 L260 104"/>
          <g data-left></g><g data-right></g>
        </g>
      </svg>
      <div class="steps" aria-live="polite"></div>`;
    const zi = $('[data-z]', box), ei = $('[data-e]', box), steps = $('.steps', box);
    const dots = (n, x0, cls) => {
      let s = '';
      for (let i = 0; i < n; i++) {
        const r = Math.floor(i / 6), c = i % 6;
        s += `<circle cx="${x0 + c * 13}" cy="${94 - r * 13}" r="5.5" fill="url(#${cls})"/>`;
      }
      return s;
    };
    function upd() {
      const Z = +zi.value, Ne = +ei.value;
      $('[data-oz]', box).textContent = Z; $('[data-oe]', box).textContent = Ne;
      $('[data-left]', box).innerHTML = dots(Z, 40, 'gp');
      $('[data-right]', box).innerHTML = dots(Ne, 215, 'ge');
      $('[data-beam]', box).style.transform = `rotate(${clamp((Ne - Z) * 2.2, -16, 16)}deg)`;
      const qn = Z * E_CHARGE, qe = -Ne * E_CHARGE, qt = qn + qe;
      const el = byZ(Z);
      steps.innerHTML = `
        <div>${Q('noyau')} = ${Z} × ${E_TXT} = <b class="qp">${sci(qn)} C</b></div>
        <div>${Q('électrons')} = ${Ne} × (−${E_TXT}) = <b class="qe">${sci(qe)} C</b></div>
        <div>${Q('noyau')} + ${Q('électrons')} = <b>${sci(qt)} C</b></div>
        ${qt === 0
          ? `<div class="verdict" style="color:var(--good)">✓ Charge nulle : c'est un atome neutre de ${el.names.fr} (${el.sym}).</div>`
          : `<div class="verdict" style="color:${qt > 0 ? 'var(--proton)' : 'var(--electron)'}">Charge non nulle : ce n'est plus un atome mais un ion ${ionHTML(el.sym, Z - Ne)}.</div>`}`;
    }
    zi.addEventListener('input', upd); ei.addEventListener('input', upd);
    upd();
  }

  // Règle 6 : masse de l'atome
  function ruleAtomMass(box) {
    box.innerHTML = `
      <div class="calc-row">
        <label>Élément<select data-el>${elOptions(11)}</select></label>
      </div>
      <div class="calc-row" style="margin-top:10px">
        <label><span class="var">A</span><input type="text" inputmode="numeric" data-a value="23"></label>
        <label><span class="var">Z</span><input type="text" inputmode="numeric" data-z value="11"></label>
      </div>
      <div class="steps" aria-live="polite"></div>`;
    const sel = $('[data-el]', box), ai = $('[data-a]', box), zi = $('[data-z]', box), steps = $('.steps', box);
    sel.addEventListener('change', () => { const el = byZ(+sel.value); ai.value = el.A; zi.value = el.z; upd(); });
    ai.addEventListener('input', upd); zi.addEventListener('input', upd);
    function upd() {
      const A = parseNum(ai.value), Z = parseNum(zi.value);
      if (!isFinite(A) || !isFinite(Z)) { steps.innerHTML = warn('Entre A et Z.'); return; }
      if (Z > A) { steps.innerHTML = warn('Z ne peut pas dépasser A.'); return; }
      const mn = A * M_P, me = Z * M_E, ma = mn + me, pct = (me / ma) * 100;
      steps.innerHTML = `
        <div>${v('m')}<sub>atome</sub> = ${fmtVal(A)} × ${MP_TXT} + ${fmtVal(Z)} × ${ME_TXT}</div>
        <div>${v('m')}<sub>atome</sub> = ${sci(mn)} + ${sci(me)} = <b>${sci(ma, 5)} kg</b></div>
        <div>${v('m')}<sub>noyau</sub> = <b>${sci(mn, 5)} kg</b></div>
        <div class="share" title="Part des électrons"><i style="width:${Math.max(pct, 0.6)}%;background:var(--electron)"></i><i style="flex:1;background:var(--proton);opacity:.55"></i></div>
        <div class="verdict">Les électrons ne représentent que ${dec(pct.toPrecision(2))} % de la masse : ${v('m')}<sub>atome</sub> ≈ ${v('m')}<sub>noyau</sub>.</div>`;
    }
    upd();
  }

  // Règle 7 : A = Z + N
  function ruleAZN(box) {
    box.innerHTML = `
      <div class="solve">Je cherche :
        <span class="seg" role="group">
          <button type="button" data-solve="A" aria-pressed="false">A</button>
          <button type="button" data-solve="Z" aria-pressed="false">Z</button>
          <button type="button" data-solve="N" aria-pressed="true">N</button>
        </span>
      </div>
      <div class="calc-row">
        <label><span class="var">A</span><input type="text" inputmode="numeric" data-k="A" value="35"></label>
        <label><span class="var">Z</span><input type="text" inputmode="numeric" data-k="Z" value="17"></label>
        <label><span class="var">N</span><input type="text" inputmode="numeric" data-k="N" value=""></label>
      </div>
      <div class="steps" aria-live="polite"></div>`;
    let solve = 'N';
    const inp = k => $(`[data-k="${k}"]`, box), steps = $('.steps', box);
    function upd() {
      $$('[data-k]', box).forEach(i => { i.readOnly = i.dataset.k === solve; });
      $$('[data-solve]', box).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.solve === solve)));
      const A = parseNum(inp('A').value), Z = parseNum(inp('Z').value), N = parseNum(inp('N').value);
      let res, line;
      if (solve === 'N') { res = A - Z; line = `${v('N')} = ${v('A')} − ${v('Z')} = ${fmtVal(A)} − ${fmtVal(Z)} = <b>${fmtVal(res)}</b>`; }
      if (solve === 'A') { res = Z + N; line = `${v('A')} = ${v('Z')} + ${v('N')} = ${fmtVal(Z)} + ${fmtVal(N)} = <b>${fmtVal(res)}</b>`; }
      if (solve === 'Z') { res = A - N; line = `${v('Z')} = ${v('A')} − ${v('N')} = ${fmtVal(A)} − ${fmtVal(N)} = <b>${fmtVal(res)}</b>`; }
      if (!isFinite(res)) { inp(solve).value = ''; steps.innerHTML = warn('Complète les deux autres valeurs.'); return; }
      inp(solve).value = fmtVal(res);
      let extra = res < 0 ? warn('Résultat négatif : vérifie les valeurs.') : '';
      const z = solve === 'Z' ? res : Z;
      const a = solve === 'A' ? res : A;
      if (!extra && nearInt(z) && z >= 1 && z <= 18) extra = `<div class="verdict">→ Noyau ${nota(Math.round(a), Math.round(z), byZ(Math.round(z)).sym)} (${byZ(Math.round(z)).names.fr})</div>`;
      steps.innerHTML = line + extra;
    }
    box.addEventListener('input', upd);
    box.addEventListener('click', e => { const b = e.target.closest('[data-solve]'); if (b) { solve = b.dataset.solve; upd(); } });
    upd();
  }

  /* ═════════════ 04 · Quiz ═════════════ */
  function pickOpts(ans, pool, k = 3) {
    const others = shuffle(pool.filter(x => x !== ans))
      .map(x => ({ x, s: Math.abs(x - ans) + Math.random() * 3 }))
      .sort((a, b) => a.s - b.s).slice(0, k).map(o => o.x);
    return shuffle([ans, ...others]);
  }
  const ZS = ELEMENTS.map(e => e.z);
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

  const QGEN = {
    zOf() { const el = rand(ELEMENTS); return { z: el.z, ans: el.z, opts: pickOpts(el.z, ZS) }; },
    elemOfZ() { const el = rand(ELEMENTS); return { z: el.z, ans: el.z, opts: pickOpts(el.z, ZS) }; },
    qToElem() { const el = rand(ELEMENTS); return { z: el.z, ans: el.z, opts: pickOpts(el.z, ZS) }; },
    neutrons() { const el = rand(ELEMENTS.slice(2)); const N = el.A - el.z; return { z: el.z, ans: N, opts: pickOpts(N, range(0, 22).concat([el.A, el.z])) }; },
    config() { const el = rand(ELEMENTS.slice(2)); return { z: el.z, ans: el.z, opts: pickOpts(el.z, range(3, 18)) }; },
    ionCharge() { const el = rand(ELEMENTS.filter(e => e.ion)); return { z: el.z, ans: el.ion, opts: pickOpts(el.ion, [-3, -2, -1, 1, 2, 3]) }; },
    mNoyau() { const el = rand(ELEMENTS.slice(1)); return { z: el.z, ans: el.A, opts: pickOpts(el.A, [el.z, el.A - 1, el.A + 1, el.A + 2, el.A - 2].filter(x => x > 0)) }; },
    valence() { const el = rand(ELEMENTS); const n = valence(el.z); return { z: el.z, ans: n, opts: pickOpts(n, range(1, 8)) }; },
    period() { const el = rand(ELEMENTS); const n = period(el.z); return { z: el.z, ans: n, opts: shuffle([1, 2, 3]) }; },
  };

  function qText(q) {
    const el = byZ(q.z), base = { name: elName(el), sym: el.sym, z: el.z };
    const ltr = s => `<span dir="ltr">${s}</span>`;
    switch (q.type) {
      case 'qToElem': return t('qt.qToElem', { q: ltr(sci(el.z * E_CHARGE)) });
      case 'neutrons': case 'mNoyau': return t('qt.' + q.type, { nota: nota(el.A, el.z, el.sym) });
      case 'ionCharge': return t('qt.ionCharge', { p: el.z, e: el.z - el.ion });
      default: return t('qt.' + q.type, base);
    }
  }
  function optHTML(q, val) {
    switch (q.type) {
      case 'elemOfZ': case 'qToElem': { const el = byZ(val); return { html: `${elName(el)} (${el.sym})`, txt: true }; }
      case 'config': return { html: `<span dir="ltr">${configHTML(val)}</span>` };
      case 'ionCharge': return { html: `<span dir="ltr">${val > 0 ? '+' : ''}${sci(val * E_CHARGE)} C</span>` };
      case 'mNoyau': return { html: `<span dir="ltr">${sci(val * M_P)} kg</span>` };
      case 'period': return { html: `${t('period')} ${val}`, txt: true };
      default: return { html: String(val) };
    }
  }
  function qExplain(q) {
    const el = byZ(q.z), N = el.A - el.z;
    const f = s => `<span class="f">${s}</span>`;
    const base = { name: elName(el), sym: el.sym, z: el.z };
    switch (q.type) {
      case 'qToElem': return t('qe.qToElem', { ...base, f: f(`${v('Z')} = ${sci(el.z * E_CHARGE)} / ${E_TXT} = ${el.z}`) });
      case 'neutrons': return t('qe.neutrons', { f: f(`${v('N')} = ${v('A')} − ${v('Z')} = ${el.A} − ${el.z} = ${N}`) });
      case 'config': return t('qe.config', { f: f(`${el.sym} : ${configHTML(el.z)}`) });
      case 'ionCharge': {
        const ne = el.z - el.ion;
        return t('qe.ionCharge', { f: f(`${Q('ion')} = (${el.z} − ${ne}) × ${E_TXT} = ${el.ion > 0 ? '+' : ''}${sci(el.ion * E_CHARGE)} C → ${ionHTML(el.sym, el.ion)}`) });
      }
      case 'mNoyau': return t('qe.mNoyau', { f: f(`${v('m')}<sub>noyau</sub> = ${v('A')} × ${v('m')}<sub>p</sub> = ${el.A} × ${MP_TXT} = ${sci(el.A * M_P)} kg`) });
      case 'valence': return t('qe.valence', { f: f(`${el.sym} : ${configHTML(el.z)}`), n: valence(el.z) });
      case 'period': return t('qe.period', { ...base, n: period(el.z) });
      default: return t('qe.' + q.type, base);
    }
  }

  function startQuiz() {
    const types = Object.keys(QGEN);
    const list = shuffle([...types, rand(types)]);
    const qs = [];
    for (const type of list) {
      let q, guard = 0;
      do { q = { type, ...QGEN[type]() }; guard++; } while (guard < 10 && qs.some(o => o.type === q.type && o.z === q.z));
      qs.push(q);
    }
    state.quiz = { qs, i: 0, score: 0, finished: false };
    renderQuiz();
  }

  function renderQuiz() {
    const box = $('#quiz'), Z = state.quiz;
    if (!Z) {
      box.innerHTML = `<div class="q-intro">${atomSVG(3, 4, 3, { labels: false })}
        <h2>${t('quiz.title')}</h2><p>${t('quiz.intro')}</p>
        <button type="button" class="btn" data-q="start">${t('quiz.start')} <span class="arr">→</span></button></div>`;
      return;
    }
    const n = Z.qs.length;
    if (Z.finished) {
      const ratio = Z.score / n;
      box.innerHTML = `<div class="q-intro">
        <div class="q-score" dir="ltr">${Z.score}<small> / ${n}</small></div>
        <p>${t(ratio >= 0.8 ? 'quiz.high' : ratio >= 0.5 ? 'quiz.mid' : 'quiz.low')}</p>
        <div class="ticks" style="max-width:360px;margin-inline:auto">${Z.qs.map(q => `<i class="${q.picked === q.ans ? 'ok' : 'ko'}"></i>`).join('')}</div>
        <button type="button" class="btn" data-q="start">${t('quiz.again')} <span class="arr">→</span></button></div>`;
      return;
    }
    const q = Z.qs[Z.i], answered = q.picked !== undefined;
    const ticks = Z.qs.map((x, i) => `<i class="${x.picked === undefined ? (i === Z.i ? 'cur' : '') : x.picked === x.ans ? 'ok' : 'ko'}"></i>`).join('');
    const opts = q.opts.map((val, i) => {
      const o = optHTML(q, val);
      let cls = '';
      if (answered) cls = val === q.ans ? 'ok' : val === q.picked ? 'ko' : 'faded';
      return `<button type="button" class="opt ${cls}" data-opt="${i}" ${answered ? 'disabled' : ''}>
        <span class="k">${'ABCD'[i]}</span><span class="val${o.txt ? ' txt' : ''}">${o.html}</span><span>${answered && val === q.ans ? '✓' : ''}</span></button>`;
    }).join('');
    const ok = q.picked === q.ans;
    box.innerHTML = `
      <div class="q-top"><span>${t('quiz.progress', { i: Z.i + 1, n })}</span><span>${t('quiz.score', { s: Z.score })}</span></div>
      <div class="ticks">${ticks}</div>
      <p class="q-text">${qText(q)}</p>
      <div class="opts">${opts}</div>
      ${answered ? `<div class="feedback ${ok ? 'ok' : 'ko'}">
        <div class="h">${t(ok ? 'quiz.correct' : 'quiz.wrong')}</div>
        <p class="ex">${qExplain(q)}</p>
        <button type="button" class="btn" data-q="next">${t(Z.i === n - 1 ? 'quiz.finish' : 'quiz.next')} <span class="arr">→</span></button>
      </div>` : ''}`;
    if (answered) { const nb = $('[data-q="next"]', box); nb && nb.focus({ preventScroll: true }); }
  }

  function bindQuiz() {
    const box = $('#quiz');
    box.addEventListener('click', e => {
      const a = e.target.closest('[data-q]'), o = e.target.closest('[data-opt]');
      if (a && a.dataset.q === 'start') startQuiz();
      else if (a && a.dataset.q === 'next') {
        const Z = state.quiz;
        if (Z.i < Z.qs.length - 1) Z.i++; else Z.finished = true;
        renderQuiz();
      } else if (o && !o.disabled) {
        const Z = state.quiz, q = Z.qs[Z.i];
        q.picked = q.opts[+o.dataset.opt];
        if (q.picked === q.ans) Z.score++;
        renderQuiz();
        if (q.picked === q.ans) burst($('.opt.ok', box));
      }
    });
    document.addEventListener('keydown', e => {
      if (state.tab !== 'quiz' || !state.quiz || state.quiz.finished || e.ctrlKey || e.metaKey || e.altKey) return;
      const idx = { a: 0, b: 1, c: 2, d: 3, 1: 0, 2: 1, 3: 2, 4: 3 }[e.key.toLowerCase()];
      if (idx === undefined) return;
      const btn = $(`#quiz [data-opt="${idx}"]`);
      if (btn && !btn.disabled) btn.click();
    });
  }

  /* ═════════════ Démarrage ═════════════ */
  function init() {
    $$('.lang button').forEach(b => b.addEventListener('click', () => {
      state.lang = b.dataset.lang; store.set('lang', state.lang); applyLang();
    }));
    $('.tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) setTab(b.dataset.tab); });
    $('.tabs').addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const rtl = document.documentElement.dir === 'rtl';
      const step = (e.key === 'ArrowRight') !== rtl ? 1 : -1;
      const i = (TABS.indexOf(state.tab) + step + TABS.length) % TABS.length;
      setTab(TABS[i]); $(`.tabs [data-tab="${TABS[i]}"]`).focus();
    });
    bindTable(); bindBuilder(); bindQuiz();
    renderRules();
    const c = byZ(6); state.b = { p: c.z, n: c.A - c.z, e: c.z };
    applyLang();
    setTab(state.tab);
  }
  init();
})();
