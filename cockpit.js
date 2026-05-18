/* ============================================
 * CAMPUS ELGG · LIVE COCKPIT
 * Berechnungs-Engine & Interaktion
 * ============================================
 *
 * Datenmodell:
 *  - Alle Werte synchron, single source of truth: state
 *  - Base Case = Werte aus Excel-Modell V1 (Mai 2026)
 *  - Slider verändern state, Recompute → UI Update
 *  - localStorage für Szenarien
 */

// -----------------------------------------------
// BASE CASE (Werte aus Excel-Modell V1)
// -----------------------------------------------
const BASE_CASE = Object.freeze({
  // Mietzins-Modell
  // Basis = Excel V1 (mit +20% bereits eingerechnet). Slider verändert ab dort.
  mietFaktor:        1.00,    // Multiplikator auf Basis-Mietzinse (V1-Stand)
  leerstand:         0.05,    // 5% Mietausfall
  nebenflaechen:     0.05,    // 5% Aufschlag durch Methabau-Methode (NF-Umlage)
  
  // Anlagekosten
  bkFaktor:          1.00,    // Baukosten-Multiplikator
  landwertQuote:     0.80,    // 80% von BKP 1 → BKP 0 (Landwert-Sicht)
  
  // Finanzierung
  ekQuote:           0.387,   // 14.5 / 37.5
  fkZins:            0.025,
  bewirtUnterhalt:   0.23,    // 18% Bewirt + 5% Unterhalt
  
  // Nebenerträge
  ppFaktor:          1.00,    // PP-Mieten-Multiplikator
  pvProHaus:         20000,
});

// -----------------------------------------------
// PROJEKT-KONSTANTEN (fix, nicht änderbar)
// -----------------------------------------------
const PROJEKT = Object.freeze({
  // Basis Mietertrag bei Mietfaktor 1.0 (= aktueller Excel-V1-Stand inkl. +20%)
  // E1: HNF-Soll-Mietertrag aus Excel V1 = CHF 2'054'974
  mietertragBasis_E1: 2054974,
  mietertragBasis_E2: 2096074,    // E2 leicht höher (× 1.02)
  
  // Flächen
  hnf_E1:            7051.82,
  hnf_Total:         14103.64,
  bauland_E1:        11370.31,
  bauland_E2:        13460.68,
  bauland_Total:     24830.99,
  
  // Anlagekosten Basis (BK-Faktor 1.0)
  invest_E1:         37500000,
  invest_E2:         37500000,
  bkp0_E1:           7500000,
  bkp1_E1:           3750000,
  
  // Parkplätze (Anzahl)
  pp_aussen_E1:      38,
  pp_aussen_E2:      52,
  pp_tg_E1:          30,
  pp_tg_E2:          30,
  pp_moto_E1:        8,
  pp_moto_E2:        8,
  // PP-Preise (Methabau-Leubern)
  pp_aussen_jahr:    1200,    // CHF/Jahr
  pp_tg_jahr:        1800,
  pp_moto_jahr:      60,
  
  // Hauseranzahl
  hauser_E1:         3,
  hauser_E2:         3,
  
  // Etappe-2-Skalierung
  bkFaktorE2:        1.04,
  mietFaktorE2:      1.02,
  leerstandE2:       0.10,
  
  // Ziel
  zielBruttorendite: 0.0637,
});

// -----------------------------------------------
// STATE
// -----------------------------------------------
let state = { ...BASE_CASE };
let viewMode = 'e1';  // 'e1' oder 'total'
let scenarios = loadScenariosFromStorage();

// -----------------------------------------------
// BERECHNUNG
// -----------------------------------------------
function compute(s) {
  // Soll-Mietertrag HNF
  const hnf_E1 = PROJEKT.mietertragBasis_E1 * s.mietFaktor;
  const hnf_E2 = PROJEKT.mietertragBasis_E2 * s.mietFaktor;
  
  // Nebenflächen-Umlage (Methabau-Methode)
  const nf_E1 = hnf_E1 * s.nebenflaechen;
  const nf_E2 = hnf_E2 * s.nebenflaechen;
  
  // Parkplätze
  const pp_E1 = (
    PROJEKT.pp_aussen_E1 * PROJEKT.pp_aussen_jahr +
    PROJEKT.pp_tg_E1     * PROJEKT.pp_tg_jahr +
    PROJEKT.pp_moto_E1   * PROJEKT.pp_moto_jahr
  ) * s.ppFaktor;
  const pp_E2 = (
    PROJEKT.pp_aussen_E2 * PROJEKT.pp_aussen_jahr +
    PROJEKT.pp_tg_E2     * PROJEKT.pp_tg_jahr +
    PROJEKT.pp_moto_E2   * PROJEKT.pp_moto_jahr
  ) * s.ppFaktor;
  
  // PV
  const pv_E1 = s.pvProHaus * PROJEKT.hauser_E1;
  const pv_E2 = s.pvProHaus * PROJEKT.hauser_E2;
  
  // Soll-Mietertrag Total
  const soll_E1 = hnf_E1 + nf_E1 + pp_E1 + pv_E1;
  const soll_E2 = hnf_E2 + nf_E2 + pp_E2 + pv_E2;
  
  // Mietausfall NUR auf HNF + NF (PP separat bewirtschaftet, PV vertraglich gesichert)
  const ausfallBasis_E1 = hnf_E1 + nf_E1;
  const ausfallBasis_E2 = hnf_E2 + nf_E2;
  const ausfall_E1 = ausfallBasis_E1 * s.leerstand;
  const ausfall_E2 = ausfallBasis_E2 * PROJEKT.leerstandE2;   // E2 mit höherem Anlauf-Leerstand
  
  // Bewirtschaftung nur auf HNF + NF
  const bewirt_E1 = ausfallBasis_E1 * s.bewirtUnterhalt;
  const bewirt_E2 = ausfallBasis_E2 * s.bewirtUnterhalt;
  
  // Effektiv-Mietertrag (nach Mietausfall, vor Bewirt)
  const eff_E1 = soll_E1 - ausfall_E1;
  const eff_E2 = soll_E2 - ausfall_E2;
  
  // NOI
  const noi_E1 = eff_E1 - bewirt_E1;
  const noi_E2 = eff_E2 - bewirt_E2;
  
  // Anlagekosten
  const invest_E1 = PROJEKT.invest_E1 * s.bkFaktor;
  const invest_E2 = PROJEKT.invest_E2 * s.bkFaktor;
  
  // Landwert (effektiv, mit Umlagerung)
  const landwert_E1_eff = (PROJEKT.bkp0_E1 + PROJEKT.bkp1_E1 * s.landwertQuote) * s.bkFaktor;
  const landwert_E2_eff = landwert_E1_eff;
  const landwert_perM2_E1 = landwert_E1_eff / PROJEKT.bauland_E1;
  const landwert_perM2_E2 = landwert_E2_eff / PROJEKT.bauland_E2;
  const landwert_perM2_Total = (landwert_E1_eff + landwert_E2_eff) / PROJEKT.bauland_Total;
  
  // Finanzierung
  const ek_E1 = invest_E1 * s.ekQuote;
  const fk_E1 = invest_E1 * (1 - s.ekQuote);
  const fkZinsen_E1 = fk_E1 * s.fkZins;
  const ek_E2 = invest_E2 * s.ekQuote;
  const fk_E2 = invest_E2 * (1 - s.ekQuote);
  const fkZinsen_E2 = fk_E2 * s.fkZins;
  
  // Renditen
  const bruttoEff_E1 = eff_E1 / invest_E1;
  const bruttoEff_E2 = eff_E2 / invest_E2;
  const bruttoEff_Total = (eff_E1 + eff_E2) / (invest_E1 + invest_E2);
  
  const nettoE1 = noi_E1 / invest_E1;
  const nettoE2 = noi_E2 / invest_E2;
  const nettoTotal = (noi_E1 + noi_E2) / (invest_E1 + invest_E2);
  
  const ekRendite_E1 = (noi_E1 - fkZinsen_E1) / ek_E1;
  const ekRendite_Total = ((noi_E1 + noi_E2) - (fkZinsen_E1 + fkZinsen_E2)) / (ek_E1 + ek_E2);
  
  return {
    hnf:     { e1: hnf_E1, e2: hnf_E2, total: hnf_E1 + hnf_E2 },
    nf:      { e1: nf_E1,  e2: nf_E2,  total: nf_E1 + nf_E2 },
    pp:     { e1: pp_E1,  e2: pp_E2,  total: pp_E1 + pp_E2 },
    pv:      { e1: pv_E1,  e2: pv_E2,  total: pv_E1 + pv_E2 },
    soll:    { e1: soll_E1, e2: soll_E2, total: soll_E1 + soll_E2 },
    ausfall: { e1: ausfall_E1, e2: ausfall_E2, total: ausfall_E1 + ausfall_E2 },
    bewirt:  { e1: bewirt_E1, e2: bewirt_E2, total: bewirt_E1 + bewirt_E2 },
    eff:     { e1: eff_E1, e2: eff_E2, total: eff_E1 + eff_E2 },
    noi:     { e1: noi_E1, e2: noi_E2, total: noi_E1 + noi_E2 },
    invest:  { e1: invest_E1, e2: invest_E2, total: invest_E1 + invest_E2 },
    flaeche: { e1: PROJEKT.hnf_E1, e2: PROJEKT.hnf_E1, total: PROJEKT.hnf_Total },
    landwert: {
      e1: landwert_E1_eff, e2: landwert_E2_eff, total: landwert_E1_eff + landwert_E2_eff,
      perM2_e1: landwert_perM2_E1, perM2_e2: landwert_perM2_E2, perM2_total: landwert_perM2_Total,
    },
    brutto:  { e1: bruttoEff_E1, e2: bruttoEff_E2, total: bruttoEff_Total },
    netto:   { e1: nettoE1, e2: nettoE2, total: nettoTotal },
    ek:      { e1: ekRendite_E1, e2: ekRendite_E1, total: ekRendite_Total },
  };
}

// -----------------------------------------------
// FORMATIERUNG
// -----------------------------------------------
const fmt = {
  chf: (n) => new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(n),
  chfMio: (n) => `CHF ${(n / 1e6).toFixed(1)} Mio.`,
  pct: (n) => `${(n * 100).toFixed(2)}%`,
  pctOne: (n) => `${(n * 100).toFixed(1)}%`,
  m2: (n) => `${new Intl.NumberFormat('de-CH', { maximumFractionDigits: 0 }).format(n)} m²`,
  num: (n) => new Intl.NumberFormat('de-CH', { maximumFractionDigits: 0 }).format(n),
  delta: (n) => {
    const sign = n >= 0 ? '+' : '−';
    return `${sign}${Math.abs(n * 100).toFixed(2)}%`;
  },
};

// -----------------------------------------------
// UI UPDATES
// -----------------------------------------------
function pickValue(obj, key) {
  return viewMode === 'e1' ? obj.e1 : obj.total;
}

function pickValueLandwert(obj) {
  return viewMode === 'e1' ? obj.perM2_e1 : obj.perM2_total;
}

function pulse(el) {
  el.classList.remove('changed');
  void el.offsetWidth;
  el.classList.add('changed');
}

function setText(id, value, doPulse = false) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.textContent !== value) {
    el.textContent = value;
    if (doPulse) pulse(el);
  }
}

function render() {
  const r = compute(state);
  
  // Hero stats (immer total)
  setText('hero-invest', fmt.chfMio(r.invest.total));
  setText('hero-miete', fmt.chfMio(r.soll.total));
  setText('hero-rendite', fmt.pctOne(r.brutto.total));
  
  // KPI Cards
  setText('kpi-anlagekosten', fmt.chfMio(pickValue(r.invest)), true);
  const houses = viewMode === 'e1' ? 3 : 6;
  setText('kpi-anlagekosten-sub', `BKP 0–9 · ${houses} Häuser`);
  setText('kpi-hnf', fmt.m2(pickValue(r.flaeche)));
  setText('kpi-miete-soll', fmt.chfMio(pickValue(r.soll)), true);
  setText('kpi-miete-eff', fmt.chfMio(pickValue(r.eff)), true);
  setText('kpi-brutto', fmt.pct(pickValue(r.brutto)), true);
  setText('kpi-netto', fmt.pct(pickValue(r.netto)), true);
  setText('kpi-ek', fmt.pct(pickValue(r.ek)), true);
  setText('kpi-landwert', `CHF ${Math.round(pickValueLandwert(r.landwert))}/m²`);
  
  // Gap zu Ziel
  const gap = pickValue(r.brutto) - PROJEKT.zielBruttorendite;
  const gapEl = document.getElementById('kpi-brutto-gap');
  gapEl.textContent = fmt.delta(gap);
  gapEl.style.color = gap >= -0.005 ? 'var(--accent-green)' : (gap >= -0.02 ? 'var(--accent-amber)' : 'var(--accent-red)');
  
  // Target Bar
  const brutto = pickValue(r.brutto);
  const markerLeft = Math.max(0, Math.min(100, (brutto / 0.10) * 100));
  const marker = document.getElementById('current-marker');
  marker.style.left = `${markerLeft}%`;
  setText('current-marker-value', fmt.pct(brutto));
  
  // Breakdown table
  setText('bd-hnf-e1',  fmt.chf(r.hnf.e1));
  setText('bd-hnf-e2',  fmt.chf(r.hnf.e2));
  setText('bd-hnf-total', fmt.chf(r.hnf.total));
  setText('bd-nf-e1',   fmt.chf(r.nf.e1));
  setText('bd-nf-e2',   fmt.chf(r.nf.e2));
  setText('bd-nf-total', fmt.chf(r.nf.total));
  setText('bd-pp-e1',   fmt.chf(r.pp.e1));
  setText('bd-pp-e2',   fmt.chf(r.pp.e2));
  setText('bd-pp-total', fmt.chf(r.pp.total));
  setText('bd-pv-e1',   fmt.chf(r.pv.e1));
  setText('bd-pv-e2',   fmt.chf(r.pv.e2));
  setText('bd-pv-total', fmt.chf(r.pv.total));
  setText('bd-soll-e1', fmt.chf(r.soll.e1));
  setText('bd-soll-e2', fmt.chf(r.soll.e2));
  setText('bd-soll-total', fmt.chf(r.soll.total));
  setText('bd-ausfall-e1', `− ${fmt.chf(r.ausfall.e1)}`);
  setText('bd-ausfall-e2', `− ${fmt.chf(r.ausfall.e2)}`);
  setText('bd-ausfall-total', `− ${fmt.chf(r.ausfall.total)}`);
  setText('bd-bewirt-e1', `− ${fmt.chf(r.bewirt.e1)}`);
  setText('bd-bewirt-e2', `− ${fmt.chf(r.bewirt.e2)}`);
  setText('bd-bewirt-total', `− ${fmt.chf(r.bewirt.total)}`);
  setText('bd-noi-e1',  fmt.chf(r.noi.e1));
  setText('bd-noi-e2',  fmt.chf(r.noi.e2));
  setText('bd-noi-total', fmt.chf(r.noi.total));
  
  // Donut Chart
  renderDonut(r);
  
  // Scenario Status
  updateScenarioStatus();
}

// -----------------------------------------------
// DONUT CHART
// -----------------------------------------------
function renderDonut(r) {
  const svg = document.getElementById('donut-chart');
  const legend = document.getElementById('donut-legend');
  if (!svg || !legend) return;
  
  const data = [
    { label: 'Hauptnutzflächen', value: r.hnf.total, color: '#1a2b4a' },
    { label: 'Nebenflächen-Umlage', value: r.nf.total, color: '#2a3f63' },
    { label: 'Parkplätze', value: r.pp.total, color: '#b88c3f' },
    { label: 'PV-Anlage', value: r.pv.total, color: '#d4a85a' },
  ];
  const total = data.reduce((s, d) => s + d.value, 0);
  
  // Polar to Cartesian
  const cx = 120, cy = 120, rOuter = 90, rInner = 60;
  let startAngle = -Math.PI / 2;
  
  const paths = data.map((d, i) => {
    const pct = d.value / total;
    const endAngle = startAngle + pct * Math.PI * 2;
    
    const x1 = cx + rOuter * Math.cos(startAngle);
    const y1 = cy + rOuter * Math.sin(startAngle);
    const x2 = cx + rOuter * Math.cos(endAngle);
    const y2 = cy + rOuter * Math.sin(endAngle);
    const x3 = cx + rInner * Math.cos(endAngle);
    const y3 = cy + rInner * Math.sin(endAngle);
    const x4 = cx + rInner * Math.cos(startAngle);
    const y4 = cy + rInner * Math.sin(startAngle);
    
    const largeArc = pct > 0.5 ? 1 : 0;
    
    const path = `M ${x1} ${y1} 
                  A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2}
                  L ${x3} ${y3}
                  A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4} Z`;
    
    startAngle = endAngle;
    return `<path d="${path}" fill="${d.color}" stroke="#fff" stroke-width="1.5"/>`;
  }).join('');
  
  // Center label
  const centerLabel = `
    <text x="${cx}" y="${cy - 6}" text-anchor="middle" 
          font-family="Fraunces, serif" font-size="22" font-weight="600" fill="#1a2b4a">
      ${fmt.chfMio(total)}
    </text>
    <text x="${cx}" y="${cy + 14}" text-anchor="middle" 
          font-family="JetBrains Mono, monospace" font-size="9" fill="#888082"
          letter-spacing="0.1em">
      JAHRESERTRAG
    </text>
  `;
  
  svg.innerHTML = paths + centerLabel;
  
  // Legend
  legend.innerHTML = data.map(d => `
    <div class="donut-legend-item">
      <span class="donut-legend-color" style="background: ${d.color}"></span>
      <span class="donut-legend-label">${d.label}</span>
      <span class="donut-legend-value">${(d.value / total * 100).toFixed(1)}%</span>
    </div>
  `).join('');
}

// -----------------------------------------------
// SLIDER BINDINGS
// -----------------------------------------------
function bindSlider(id, stateKey, formatter, transformIn = v => v / 100, transformOut = v => v * 100) {
  const el = document.getElementById(id);
  const valEl = document.getElementById('val-' + id.replace('ctrl-', ''));
  if (!el) return;
  
  el.addEventListener('input', (e) => {
    const raw = parseFloat(e.target.value);
    state[stateKey] = transformIn(raw);
    if (valEl) valEl.textContent = formatter(state[stateKey]);
    render();
    updateScenarioStatus();
  });
}

function setSlider(id, value, formatter, transformOut = v => v * 100) {
  const el = document.getElementById(id);
  const valEl = document.getElementById('val-' + id.replace('ctrl-', ''));
  if (!el) return;
  el.value = transformOut(value);
  if (valEl) valEl.textContent = formatter(value);
}

function initSliders() {
  // A. Mietzinse
  bindSlider('ctrl-miet-faktor', 'mietFaktor', v => `${Math.round(v * 100)}%`);
  bindSlider('ctrl-leerstand', 'leerstand', v => `${(v * 100).toFixed(1)}%`);
  bindSlider('ctrl-nebenflaechen', 'nebenflaechen', v => `${(v * 100).toFixed(1)}%`);
  
  // B. Kosten
  bindSlider('ctrl-bk-faktor', 'bkFaktor', v => `${Math.round(v * 100)}%`);
  bindSlider('ctrl-landwert-quote', 'landwertQuote', v => `${Math.round(v * 100)}%`);
  
  // C. Finanzierung
  bindSlider('ctrl-ek-quote', 'ekQuote', v => `${(v * 100).toFixed(1)}%`);
  bindSlider('ctrl-fk-zins', 'fkZins', v => `${(v * 100).toFixed(1)}%`);
  bindSlider('ctrl-bewirt', 'bewirtUnterhalt', v => `${(v * 100).toFixed(1)}%`);
  
  // D. Nebenerträge
  bindSlider('ctrl-pp-faktor', 'ppFaktor', v => `${Math.round(v * 100)}%`);
  // PV ist absolut, nicht in %
  const pvEl = document.getElementById('ctrl-pv-pro-haus');
  const pvVal = document.getElementById('val-pv-pro-haus');
  if (pvEl) {
    pvEl.addEventListener('input', (e) => {
      state.pvProHaus = parseFloat(e.target.value);
      if (pvVal) pvVal.textContent = fmt.chf(state.pvProHaus);
      render();
      updateScenarioStatus();
    });
  }
}

function applyStateToSliders() {
  setSlider('ctrl-miet-faktor', state.mietFaktor, v => `${Math.round(v * 100)}%`);
  setSlider('ctrl-leerstand', state.leerstand, v => `${(v * 100).toFixed(1)}%`);
  setSlider('ctrl-nebenflaechen', state.nebenflaechen, v => `${(v * 100).toFixed(1)}%`);
  setSlider('ctrl-bk-faktor', state.bkFaktor, v => `${Math.round(v * 100)}%`);
  setSlider('ctrl-landwert-quote', state.landwertQuote, v => `${Math.round(v * 100)}%`);
  setSlider('ctrl-ek-quote', state.ekQuote, v => `${(v * 100).toFixed(1)}%`);
  setSlider('ctrl-fk-zins', state.fkZins, v => `${(v * 100).toFixed(1)}%`);
  setSlider('ctrl-bewirt', state.bewirtUnterhalt, v => `${(v * 100).toFixed(1)}%`);
  setSlider('ctrl-pp-faktor', state.ppFaktor, v => `${Math.round(v * 100)}%`);
  
  const pvEl = document.getElementById('ctrl-pv-pro-haus');
  const pvVal = document.getElementById('val-pv-pro-haus');
  if (pvEl) {
    pvEl.value = state.pvProHaus;
    if (pvVal) pvVal.textContent = fmt.chf(state.pvProHaus);
  }
}

// -----------------------------------------------
// VIEW TOGGLE (E1 vs Total)
// -----------------------------------------------
function initViewToggle() {
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      viewMode = btn.dataset.view;
      render();
    });
  });
}

// -----------------------------------------------
// SZENARIEN
// -----------------------------------------------
function isBaseCase(s) {
  return Object.keys(BASE_CASE).every(k => Math.abs(s[k] - BASE_CASE[k]) < 1e-6);
}

function updateScenarioStatus() {
  const statusEl = document.getElementById('scenario-status');
  if (isBaseCase(state)) {
    statusEl.textContent = 'Base Case';
    statusEl.classList.remove('modified');
  } else {
    statusEl.textContent = 'Modifiziert';
    statusEl.classList.add('modified');
  }
}

function resetToBase() {
  state = { ...BASE_CASE };
  applyStateToSliders();
  render();
  toast('Auf Base Case zurückgesetzt', 'success');
}

function saveScenario() {
  const name = prompt('Name für dieses Szenario:', `Szenario ${scenarios.length + 1}`);
  if (!name || !name.trim()) return;
  
  const r = compute(state);
  const scenario = {
    id: Date.now(),
    name: name.trim(),
    timestamp: new Date().toISOString(),
    state: { ...state },
    snapshot: {
      brutto_total: r.brutto.total,
      eff_total: r.eff.total,
      invest_total: r.invest.total,
      noi_total: r.noi.total,
    },
  };
  scenarios.push(scenario);
  saveScenariosToStorage();
  renderScenarioList();
  toast(`Szenario «${scenario.name}» gespeichert`, 'success');
}

function loadScenario(id) {
  const s = scenarios.find(sc => sc.id === id);
  if (!s) return;
  state = { ...BASE_CASE, ...s.state };
  applyStateToSliders();
  render();
  toast(`«${s.name}» geladen`, 'success');
}

function deleteScenario(id, evt) {
  evt.stopPropagation();
  const s = scenarios.find(sc => sc.id === id);
  if (!s) return;
  if (!confirm(`Szenario «${s.name}» wirklich löschen?`)) return;
  scenarios = scenarios.filter(sc => sc.id !== id);
  saveScenariosToStorage();
  renderScenarioList();
  toast(`«${s.name}» gelöscht`);
}

function renderScenarioList() {
  const list = document.getElementById('scenario-list');
  const count = document.getElementById('scenario-count');
  
  count.textContent = `${scenarios.length} gespeichert`;
  
  if (scenarios.length === 0) {
    list.innerHTML = '<div class="scenario-empty">Noch keine Szenarien gespeichert. Mit «Szenario speichern» einen Zwischenstand sichern.</div>';
    return;
  }
  
  list.innerHTML = scenarios
    .slice()
    .sort((a, b) => b.id - a.id)
    .map(s => {
      const d = new Date(s.timestamp);
      const dateStr = d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: '2-digit' });
      const timeStr = d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
      return `
        <div class="scenario-item" onclick="loadScenario(${s.id})">
          <button class="scenario-item-delete" onclick="deleteScenario(${s.id}, event)" title="Löschen" aria-label="Löschen">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M3 13L13 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
          <div class="scenario-item-name">${escapeHTML(s.name)}</div>
          <div class="scenario-item-meta">
            <span>${dateStr}</span>
            <span>${timeStr}</span>
          </div>
          <div class="scenario-item-stats">
            <div class="scenario-item-stat">
              <span>Brutto</span>
              <span>${fmt.pct(s.snapshot.brutto_total)}</span>
            </div>
            <div class="scenario-item-stat">
              <span>Mietertrag</span>
              <span>${fmt.chfMio(s.snapshot.eff_total)}</span>
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}

function loadScenariosFromStorage() {
  try {
    const raw = localStorage.getItem('campus-elgg-scenarios');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Could not load scenarios:', e);
    return [];
  }
}

function saveScenariosToStorage() {
  try {
    localStorage.setItem('campus-elgg-scenarios', JSON.stringify(scenarios));
  } catch (e) {
    console.warn('Could not save scenarios:', e);
    toast('Speichern fehlgeschlagen (Speicherplatz voll?)', 'error');
  }
}

function exportAll() {
  const data = {
    project: 'Campus Elgg Renditemodell',
    exportedAt: new Date().toISOString(),
    currentState: state,
    currentResult: compute(state),
    scenarios: scenarios,
    baseCase: BASE_CASE,
    projektKonstanten: PROJEKT,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `campus-elgg-szenarien_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Export als JSON heruntergeladen', 'success');
}

function loadFromFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.currentState) {
          state = { ...BASE_CASE, ...data.currentState };
          applyStateToSliders();
          render();
        }
        if (data.scenarios && Array.isArray(data.scenarios)) {
          // Merge: alte IDs umschreiben um Konflikte zu vermeiden
          data.scenarios.forEach(s => {
            s.id = Date.now() + Math.floor(Math.random() * 1000);
            scenarios.push(s);
          });
          saveScenariosToStorage();
          renderScenarioList();
        }
        toast('Daten geladen', 'success');
      } catch (err) {
        toast('Fehler beim Laden der Datei', 'error');
        console.error(err);
      }
    };
    reader.readAsText(file);
  });
  input.click();
}

// -----------------------------------------------
// HELPERS
// -----------------------------------------------
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function toast(message, variant = '') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${variant}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function initActions() {
  document.getElementById('btn-reset').addEventListener('click', resetToBase);
  document.getElementById('btn-save').addEventListener('click', saveScenario);
  document.getElementById('btn-load').addEventListener('click', loadFromFile);
  document.getElementById('btn-export').addEventListener('click', exportAll);
}

function initMetaDate() {
  const d = new Date();
  const formatted = d.toLocaleDateString('de-CH', { day: '2-digit', month: 'short', year: 'numeric' });
  document.getElementById('meta-date').textContent = formatted;
}

// -----------------------------------------------
// INIT
// -----------------------------------------------
// Expose to window for inline event handlers
window.loadScenario = loadScenario;
window.deleteScenario = deleteScenario;

document.addEventListener('DOMContentLoaded', () => {
  initMetaDate();
  initSliders();
  applyStateToSliders();
  initViewToggle();
  initActions();
  renderScenarioList();
  render();
});
