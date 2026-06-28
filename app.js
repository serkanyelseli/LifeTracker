/* ═══════════════════════════════════════════════════════
   Serkan Life Tracker V3.1
   - Chart.js charts with tooltips
   - scorePreview includes Nutrition + Bonus/Malus
   - Fixed comparison delta logic (prayer, sleep, trivial)
   - Partial year detection
   - Finance tab (Worth, Income, Allowance Income, Expenses DE, TR Payments)
   - Google Sheets read/write
   - Drag-and-drop CSV import
   - JSON export
   - History type filter
═══════════════════════════════════════════════════════ */

const STORAGE_KEY = 'serkanLifeTrackerV3';
const SHEET_ID_KEY = 'serkanSheetId';
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const ENTRY_FIELDS = ['date','prayTotal','prayS','prayO','prayIk','prayAk','prayY','prayNf','prayT',
                      'reading','tv','movies','teeth','workout','sleep',
                      'weightKg','targetKg','deltaKg','water','german','nutrition','bonusMalus',
                      'newScore','highlights'];
const PRAYER_PARTS = ['prayS','prayO','prayIk','prayAk','prayY','prayNf','prayT'];

/* ── Finance entry — monthly, separate from daily Log ── */
const FIN_SHEET_TAB = 'Finance';
const EXP_DE_PARTS = ['expHousehold','expSeko','expCiko','expYaz','expPotisko','expTransport','expGrocery','expEatOut','expOthers'];
const TR_MOM_PARTS = ['trAidat','trElektrik','trSu','trDogalgaz','trInternet','trMomVarious'];
const TR_OTHERS_PARTS = ['trEmlakVergisi','trGoogle','trSpotify','trYoutube','trAmazonTR','trOthersVarious'];
const EXP_TR_PARTS = [...TR_MOM_PARTS, ...TR_OTHERS_PARTS]; // all 12 TR fields, both clusters
const FIN_ENTRY_FIELDS = ['month','income','allowanceIncome','expDE','expTR','notes',
  ...EXP_DE_PARTS, ...EXP_TR_PARTS];
const FIN_EXPORT_COLS = ['type','month','year','monthNum','income','allowanceIncome','expDE','expTR',
  ...EXP_DE_PARTS, ...EXP_TR_PARTS, 'notes'];

/* ── Historical data — exact values from Dashboard sheet ── */
// avgScore / newAvgScore: null means not tracked that year
// weight: yearly average kg
// expDE: null means Expenses DE not tracked (pre-2023)
const FINANCE_YEARLY = [
  {y:2008, avgScore:2.5,    newAvgScore:3.5,   tv:3.2016, read:25.34, sleep:7.100, wo:0.46,  weight:83},
  {y:2009, avgScore:5,      newAvgScore:6,      tv:5.1385, read:33.20, sleep:7.256, wo:22.12, weight:80},
  {y:2010, avgScore:5,      newAvgScore:6,      tv:4.5235, read:29.10, sleep:7.023, wo:24.62, weight:85},
  {y:2011, avgScore:3.5,    newAvgScore:4.5,    tv:3.2591, read:16.28, sleep:7.223, wo:11.46, weight:85},
  {y:2012, avgScore:3,      newAvgScore:2.5,    tv:3.0082, read:10.57, sleep:7.174, wo:4.78,  weight:88},
  {y:2013, avgScore:2.5,    newAvgScore:2,      tv:3.3834, read:9.10,  sleep:7.137, wo:5.16,  weight:88},
  {y:2014, avgScore:2.5,    newAvgScore:2,      tv:2.8249, read:26.09, sleep:7.099, wo:4.03,  weight:89},
  {y:2015, avgScore:0.5,    newAvgScore:-0.5,   tv:3.2744, read:16.12, sleep:6.966, wo:0.11,  weight:90},
  {y:2016, avgScore:1,      newAvgScore:null,   tv:3.0489, read:9.13,  sleep:6.996, wo:1.31,  weight:90},
  {y:2017, avgScore:1,      newAvgScore:null,   tv:2.7936, read:3.15,  sleep:7.033, wo:0.08,  weight:91},
  {y:2018, avgScore:null,   newAvgScore:-1,     tv:3.1167, read:4.77,  sleep:6.640, wo:1.20,  weight:91},
  {y:2019, avgScore:null,   newAvgScore:-1,     tv:3.1167, read:4.77,  sleep:6.455, wo:1.20,  weight:91},
  {y:2020, avgScore:0.5,    newAvgScore:null,   tv:2.9388, read:17.99, sleep:6.322, wo:1.32,  weight:88},
  {y:2021, avgScore:null,   newAvgScore:-1,     tv:4.8700, read:1.23,  sleep:6.535, wo:0.26,  weight:93},
  {y:2022, avgScore:null,   newAvgScore:-1,     tv:4.8287, read:1.06,  sleep:6.631, wo:1.63,  weight:95},
  {y:2023, avgScore:-0.5,   newAvgScore:-1.5,   tv:5.9178, read:3.13,  sleep:6.838, wo:1.33,  weight:90},
  {y:2024, avgScore:2,      newAvgScore:1.5,    tv:10.074, read:11.74, sleep:7.269, wo:13.31, weight:89},
  {y:2025, avgScore:2,      newAvgScore:1,      tv:9.2823, read:8.96,  sleep:7.245, wo:17.53, weight:90},
  {y:2026, avgScore:2.5208, newAvgScore:2.5208, tv:9.2584, read:2.96,  sleep:7.136, wo:16.64, weight:90.53},
];

/* One-time seed values for historical Finance — totals only, no category breakdown
   (that level of detail never existed for these years). Used to pre-populate the
   Finance sheet/local store on first run, exactly once. */
const FINANCE_SEED_YEARLY = [
  {y:2008, income:1.1910, expDE:null,  tr:1.0368},
  {y:2009, income:1.0777, expDE:null,  tr:1.0368},
  {y:2010, income:1.2498, expDE:null,  tr:1.2583},
  {y:2011, income:1.1347, expDE:null,  tr:1.0787},
  {y:2012, income:1.4437, expDE:null,  tr:1.5602},
  {y:2013, income:1.6284, expDE:null,  tr:1.8716},
  {y:2014, income:1.6271, expDE:null,  tr:2.0780},
  {y:2015, income:1.7900, expDE:null,  tr:1.8534},
  {y:2016, income:2.0956, expDE:null,  tr:1.2741},
  {y:2017, income:1.6752, expDE:null,  tr:1.7080},
  {y:2018, income:1.5227, expDE:null,  tr:1.7080},
  {y:2019, income:1.5573, expDE:null,  tr:1.7239},
  {y:2020, income:1.7378, expDE:null,  tr:1.3116},
  {y:2021, income:1.8604, expDE:null,  tr:1.1692},
  {y:2022, income:2.1582, expDE:null,  tr:1.1126},
  {y:2023, income:3.0823, expDE:4.4,   tr:1.7500},
  {y:2024, income:2.8145, expDE:4.8,   tr:2.1415},
  {y:2025, income:5.5776, expDE:5.8,   tr:1.5338},
];

const FINANCE_SEED_MONTHLY_2026 = [
  {m:1, income:6.069,  expDE:6.2695, tr:0.2593},
  {m:2, income:6.079,  expDE:5.7188, tr:0.2964},
  {m:3, income:6.071,  expDE:5.7315, tr:0.2793},
  {m:4, income:6.076,  expDE:6.0513, tr:0.2051},
  {m:5, income:6.078,  expDE:7.1809, tr:0.1866},
  {m:6, income:7.171,  expDE:4.7410, tr:0.1715},
];

/* Seeds local finance storage with historical totals exactly once.
   A flag in localStorage prevents re-seeding (e.g. after the user deletes a seeded row). */
function nullBreakdownFields() {
  const obj = {};
  [...EXP_DE_PARTS, ...EXP_TR_PARTS].forEach(f => obj[f] = null);
  return obj;
}
function seedFinanceDataIfNeeded() {
  const SEED_FLAG = 'serkanFinanceSeeded_v2'; // bumped: v1 used old flat TR fields
  if (localStorage.getItem(SEED_FLAG)) return;
  const existing = getFinData();
  if (existing.length > 0) { localStorage.setItem(SEED_FLAG, '1'); return; } // don't clobber real data

  const seeded = [];
  FINANCE_SEED_YEARLY.forEach(f => {
    seeded.push({
      type: 'yearly', month: `${f.y}`, year: f.y, monthNum: null,
      income: f.income, allowanceIncome: null, expDE: f.expDE, expTR: f.tr,
      ...nullBreakdownFields(),
      notes: 'Seeded from historical Excel export — no category breakdown available.',
    });
  });
  FINANCE_SEED_MONTHLY_2026.forEach(f => {
    const mm = String(f.m).padStart(2,'0');
    seeded.push({
      type: 'monthly', month: `2026-${mm}`, year: 2026, monthNum: f.m,
      income: f.income, allowanceIncome: null, expDE: f.expDE, expTR: f.tr,
      ...nullBreakdownFields(),
      notes: 'Seeded from historical Excel export — no category breakdown available.',
    });
  });
  setFinData(seeded);
  localStorage.setItem(SEED_FLAG, '1');
}

/* ── Chart instances ── */
let charts = {};
function destroyChart(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }

/* ── Storage ── */
function getData() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e) { return []; } }
function setData(d) { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); }

const FIN_STORAGE_KEY = 'serkanLifeTrackerV3_finance';
function getFinData() { try { return JSON.parse(localStorage.getItem(FIN_STORAGE_KEY) || '[]'); } catch(e) { return []; } }
function setFinData(d) { localStorage.setItem(FIN_STORAGE_KEY, JSON.stringify(d)); }
function getSheetId() { return localStorage.getItem(SHEET_ID_KEY) || ''; }
function setSheetId(id) { localStorage.setItem(SHEET_ID_KEY, id); }

/* ── Utilities ── */
function parseNum(v) {
  if (v === null || v === undefined || v === '' || v === '-') return null;
  const n = Number(String(v).trim().replace(/\s/g,'').replace(',','.'));
  return Number.isFinite(n) ? n : null;
}
function num0(v) { return parseNum(v) ?? 0; }
function fmt(n, d=1) {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return '—';
  return Number(n).toLocaleString('de-DE', {minimumFractionDigits:d, maximumFractionDigits:d});
}
function todayISO() { return new Date().toISOString().slice(0,10); }

function toast(msg, type='info', ms=3000) {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

function updateSyncStatus(state) {
  const dot = document.getElementById('syncDot');
  const lbl = document.getElementById('syncLabel');
  dot.className = 'sync-dot ' + (state || '');
  const labels = {ok:'Sheets connected', syncing:'Syncing…', error:'Sheets error'};
  lbl.textContent = labels[state] || (getSheetId() ? 'Script URL set' : 'Not connected');
}

/* ════════════════════════════════════════════
   CSV PARSING  (V2.x-compatible)
════════════════════════════════════════════ */
function detectDelimiter(text) {
  const sample = text.slice(0, 2000);
  const semis = (sample.match(/;/g)||[]).length;
  const tabs  = (sample.match(/\t/g)||[]).length;
  return semis > 0 ? ';' : tabs > 0 ? '\t' : ',';
}
function splitLine(line, del) {
  const out=[]; let cur='', q=false;
  for (let i=0; i<line.length; i++) {
    const ch = line[i];
    if (ch==='"') { if (q && line[i+1]==='"') { cur+='"'; i++; } else q=!q; }
    else if (ch===del && !q) { out.push(cur); cur=''; }
    else cur+=ch;
  }
  out.push(cur);
  return out;
}
function parseCSV(text) {
  const del = detectDelimiter(text);
  return text.replace(/\r/g,'').split('\n').filter(l=>l.trim()).map(l=>splitLine(l,del));
}
function excelSerial(n) {
  const e = new Date(Date.UTC(1899,11,30));
  e.setUTCDate(e.getUTCDate()+Number(n));
  return e.toISOString().slice(0,10);
}
function normalizeDate(v, year, month, day) {
  const s = String(v??'').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{1,2}[.\/\-]\d{1,2}[.\/\-]\d{2,4}$/.test(s)) {
    const p=s.split(/[.\/\-]/).map(Number);
    let [d,m,y]=[p[0],p[1],p[2]]; if(y<100) y+=2000;
    if(y>=2000&&y<=2100&&m>=1&&m<=12&&d>=1&&d<=31)
      return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  if (/^\d+(\.\d+)?$/.test(s) && Number(s)>36526) return excelSerial(s);
  let m2 = s.match(/AVG(\d{2})_(\d{2})/i);
  if (m2) return `${2000+Number(m2[1])}-${m2[2]}-01`;
  m2 = s.match(/AVG(\d{2})\b/i);
  if (m2) return `${2000+Number(m2[1])}-01-01`;
  if (year>=2000&&year<=2100&&month>=1&&month<=12) {
    const dd = (day&&day>=1&&day<=31) ? day : 1;
    return `${year}-${String(month).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
  }
  return '';
}
function idxOf(row, labels) {
  const low = row.map(c=>String(c).trim().toLowerCase());
  for (const lab of labels) { const i=low.indexOf(lab.toLowerCase()); if(i>=0) return i; }
  return -1;
}
function buildMap(rows) {
  let header=-1;
  for (let i=0; i<Math.min(rows.length,30); i++) {
    const low=rows[i].map(c=>String(c).trim().toLowerCase());
    if (low.includes('date')&&low.includes('month')&&low.includes('year')) { header=i; break; }
  }
  if (header<0) return null;
  const top=rows[header], sub=rows[header+1]||[];
  const sleepIdx = idxOf(sub,['Sleep']);
  let wgIdx  = idxOf(sub,['Wg','WG','Weight','KG']);
  let tgtIdx = idxOf(sub,['Tgt','TGT','Target','TgT']);
  let delIdx = idxOf(sub,['Delta','∆','Δ','∆kg','Δkg',' ∆kg']);
  if (wgIdx<0  && sleepIdx>=0) wgIdx  = sleepIdx+1;
  if (tgtIdx<0 && wgIdx>=0)   tgtIdx = wgIdx+1;
  if (delIdx<0 && tgtIdx>=0)  delIdx = tgtIdx+1;
  return {
    header, dataStart: header+2,
    date:   idxOf(top,['Date']),  day:  idxOf(top,['Day']),
    month:  idxOf(top,['Month']), year: idxOf(top,['Year']),
    score:  idxOf(top,['Score']), newScore: idxOf(top,['New Score']),
    pS:  idxOf(sub,['S']),   pO:  idxOf(sub,['Ö','O']),
    pIk: idxOf(sub,['İk','Ik']), pAk: idxOf(sub,['Ak']),
    pY:  idxOf(sub,['Y']),   pNf: idxOf(sub,['Nf']),  pT: idxOf(sub,['T']),
    reading:  idxOf(sub,['Read']),  tv:      idxOf(sub,['TvS','TVS']),
    movies:   idxOf(sub,['Mov']),   teeth:   idxOf(sub,['Tth']),
    workout:  idxOf(sub,['WO']),    sleep:   sleepIdx,
    weightKg: wgIdx, targetKg: tgtIdx, deltaKg: delIdx,
    water:    idxOf(sub,['Wat']),   german:  idxOf(sub,['Ger']),
    nutrition:idxOf(sub,['Nut']),   bonusMalus: idxOf(sub,['B/M']),
  };
}
function g(row,i) { return i>=0 ? row[i] : ''; }
function rowToEntry(row, m) {
  const year=parseNum(g(row,m.year)), month=parseNum(g(row,m.month)), day=parseNum(g(row,m.day));
  const date=normalizeDate(g(row,m.date), year, month, day);
  if (!date||!year||year<2000||year>2100||!month||month<1||month>12) return null;
  const label=String(g(row,m.date)||'');
  const type=/AVG\d{2}_\d{2}/i.test(label)?'monthly':/AVG\d{2}\b/i.test(label)?'yearly':'daily';
  const prayS=parseNum(g(row,m.pS)), prayO=parseNum(g(row,m.pO)), prayIk=parseNum(g(row,m.pIk)),
        prayAk=parseNum(g(row,m.pAk)), prayY=parseNum(g(row,m.pY)), prayNf=parseNum(g(row,m.pNf)), prayT=parseNum(g(row,m.pT));
  const pparts=[prayS,prayO,prayIk,prayAk,prayY,prayNf,prayT].filter(v=>v!==null);
  const prayTotal = pparts.length ? pparts.reduce((a,b)=>a+b,0) : null;
  return {
    date, year, month, day:day||1, type, label, prayTotal,
    prayS, prayO, prayIk, prayAk, prayY, prayNf, prayT,
    reading:   parseNum(g(row,m.reading)),  tv:        parseNum(g(row,m.tv)),
    movies:    parseNum(g(row,m.movies)),   teeth:     parseNum(g(row,m.teeth)),
    workout:   parseNum(g(row,m.workout)),  sleep:     parseNum(g(row,m.sleep)),
    weightKg:  parseNum(g(row,m.weightKg)), targetKg:  parseNum(g(row,m.targetKg)),
    deltaKg:   parseNum(g(row,m.deltaKg)),  water:     parseNum(g(row,m.water)),
    german:    parseNum(g(row,m.german)),   nutrition: parseNum(g(row,m.nutrition)),
    bonusMalus:parseNum(g(row,m.bonusMalus)),
    score:     parseNum(g(row,m.score)),    newScore:  parseNum(g(row,m.newScore)),
    highlights: row.slice(Math.max(m.newScore+1,0)).filter(Boolean).join(' | ') || '',
  };
}

/* ════════════════════════════════════════════
   SCORE CALCULATOR  (includes Nutrition + B/M)
════════════════════════════════════════════ */
function calcNewScore(e) {
  const pray = num0(e.prayTotal);
  const ps = pray>6?1 : pray>=5?0.5 : -0.5;

  const read = num0(e.reading);
  const rs = read===0?-0.5 : read<10?0 : read<30?0.5 : 1;

  const ent = num0(e.tv)+num0(e.movies);
  const es = ent>10?-0.5 : ent>=8?0 : ent>=5?0.5 : 1;

  const teeth = num0(e.teeth);
  const ts = teeth>=3?1 : teeth===2?0.5 : teeth===1?0 : -0.5;

  const wo = num0(e.workout);
  const ws = wo===0?-0.5 : wo<10?0 : wo<30?0.5 : 1;

  const sl = num0(e.sleep);
  const ss = sl<6?-0.5 : sl<7?0 : sl<=8?1 : sl<=9?0.5 : -0.5;

  const delta = e.deltaKg ?? (e.weightKg!=null&&e.targetKg!=null ? e.weightKg-e.targetKg : null);
  const wt = delta===null?0 : delta<=0?1 : delta<=1?0.5 : delta<=2?0 : delta<=4?-0.5 : -1;

  const water = num0(e.water);
  const wat = water<1.5?-0.5 : water<3?0.5 : 1;

  const ger = num0(e.german);
  const gs = ger===0?-0.5 : ger<10?0 : ger<30?0.5 : 1;

  const ns = parseNum(e.nutrition) ?? 0;
  const bs = parseNum(e.bonusMalus) ?? 0;

  const total = ps+rs+es+ts+ws+ss+wt+wat+gs+ns+bs;
  const breakdown = [
    `🤲${fmt(ps,1)}`,`📖${fmt(rs,1)}`,`📺${fmt(es,1)}`,`🦷${fmt(ts,1)}`,
    `💪${fmt(ws,1)}`,`😴${fmt(ss,1)}`,`⚖️${fmt(wt,1)}`,`💧${fmt(wat,1)}`,
    `🇩🇪${fmt(gs,1)}`,`🥗${fmt(ns,1)}`,`⭐${fmt(bs,1)}`
  ].join('  ');
  return { total, breakdown };
}

/* ════════════════════════════════════════════
   FORM HELPERS
════════════════════════════════════════════ */
function getFormEntry() {
  const e = {};
  ENTRY_FIELDS.forEach(f => e[f] = document.getElementById(f)?.value ?? '');
  ['prayTotal','prayS','prayO','prayIk','prayAk','prayY','prayNf','prayT',
   'reading','tv','movies','teeth','workout','sleep',
   'weightKg','targetKg','deltaKg','water','german','nutrition','bonusMalus','newScore']
    .forEach(f => e[f] = parseNum(e[f]));
  // If any prayer-part field has a value, the total is derived from the parts (source of truth).
  const partsEntered = PRAYER_PARTS.some(f => e[f] !== null);
  if (partsEntered) {
    e.prayTotal = PRAYER_PARTS.reduce((sum, f) => sum + (e[f] ?? 0), 0);
  }
  const d = new Date(e.date+'T00:00:00');
  e.year=d.getFullYear(); e.month=d.getMonth()+1; e.day=d.getDate();
  e.type='daily'; e.label='';
  return e;
}
function syncPrayerTotal() {
  const parts = PRAYER_PARTS.map(f => parseNum(document.getElementById(f)?.value));
  const anyEntered = parts.some(v => v !== null);
  if (anyEntered) {
    const sum = parts.reduce((s,v) => s + (v ?? 0), 0);
    document.getElementById('prayTotal').value = sum;
  }
  updatePreview();
}
function fillForm(e) {
  ENTRY_FIELDS.forEach(f => {
    const el = document.getElementById(f);
    if (el) el.value = (e && e[f]!=null) ? e[f] : '';
  });
  // Auto-expand the breakdown if this entry has individual prayer data
  const hasParts = e && PRAYER_PARTS.some(f => e[f] != null);
  setPrayerExpanded(hasParts);
  updatePreview();
}
function blankForm(keepDate=false) {
  const d = document.getElementById('date').value || todayISO();
  fillForm({});
  document.getElementById('date').value = keepDate ? d : todayISO();
  updatePreview();
  setStatus('Form cleared');
}
function setStatus(t) { document.getElementById('entryStatus').textContent = t; }

function setPrayerExpanded(expanded) {
  const panel = document.getElementById('prayerBreakdown');
  const btn = document.getElementById('prayerToggleBtn');
  const icon = document.getElementById('prayerToggleIcon');
  panel.style.display = expanded ? '' : 'none';
  btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
}

function updatePreview() {
  const e = getFormEntry();
  const storedNew = parseNum(document.getElementById('newScore').value);
  document.getElementById('storedNewScore').textContent = storedNew!=null ? fmt(storedNew,1) : '—';
  const { total, breakdown } = calcNewScore(e);
  const el = document.getElementById('calcNewScore');
  el.textContent = fmt(total,1);
  el.className = 'score-val' + (total>=3?' good' : total>=0?'' : ' bad');
  document.getElementById('scoreBreakdown').textContent = breakdown;
}

function findDaily(date) { return getData().find(x=>x.type==='daily'&&x.date===date); }

/* ════════════════════════════════════════════
   FINANCE ENTRY FORM
════════════════════════════════════════════ */
function syncExpDETotal() {
  const parts = EXP_DE_PARTS.map(f => parseNum(document.getElementById(f)?.value));
  const anyEntered = parts.some(v => v !== null);
  if (anyEntered) {
    const sum = parts.reduce((s,v) => s + (v ?? 0), 0);
    document.getElementById('finExpDE').value = round3(sum);
  }
}
function syncExpTRTotal() {
  const parts = EXP_TR_PARTS.map(f => parseNum(document.getElementById(f)?.value));
  const anyEntered = parts.some(v => v !== null);
  if (anyEntered) {
    const sum = parts.reduce((s,v) => s + (v ?? 0), 0);
    document.getElementById('finExpTR').value = round3(sum);
  }
}
function round3(n) { return Math.round(n * 1000) / 1000; }


function getFinFormEntry() {
  const month = document.getElementById('finMonth').value; // "YYYY-MM"
  if (!month) return null;
  const [y, m] = month.split('-').map(Number);
  const e = {
    type: 'daily-fin', // monthly real entry, distinct from seeded 'monthly'/'yearly'
    month, year: y, monthNum: m,
    income: parseNum(document.getElementById('finIncome').value),
    allowanceIncome: parseNum(document.getElementById('finAllowanceIncome').value),
    expDE: parseNum(document.getElementById('finExpDE').value),
    expTR: parseNum(document.getElementById('finExpTR').value),
    notes: document.getElementById('finNotes').value || '',
  };
  EXP_DE_PARTS.forEach(f => e[f] = parseNum(document.getElementById(f)?.value));
  EXP_TR_PARTS.forEach(f => e[f] = parseNum(document.getElementById(f)?.value));
  return e;
}

function fillFinForm(e) {
  document.getElementById('finIncome').value = (e && e.income!=null) ? e.income : '';
  document.getElementById('finAllowanceIncome').value = (e && e.allowanceIncome!=null) ? e.allowanceIncome : '';
  document.getElementById('finExpDE').value  = (e && e.expDE!=null)  ? e.expDE  : '';
  document.getElementById('finExpTR').value  = (e && e.expTR!=null)  ? e.expTR  : '';
  document.getElementById('finNotes').value  = (e && e.notes) ? e.notes : '';
  EXP_DE_PARTS.forEach(f => { const el=document.getElementById(f); if(el) el.value = (e && e[f]!=null) ? e[f] : ''; });
  EXP_TR_PARTS.forEach(f => { const el=document.getElementById(f); if(el) el.value = (e && e[f]!=null) ? e[f] : ''; });
  const hasDEParts = e && EXP_DE_PARTS.some(f => e[f] != null);
  const hasTRParts = e && EXP_TR_PARTS.some(f => e[f] != null);
  setBreakdownExpanded('expDE', hasDEParts);
  setBreakdownExpanded('expTR', hasTRParts);
}
function blankFinForm(keepMonth=false) {
  const m = document.getElementById('finMonth').value;
  fillFinForm(null);
  document.getElementById('finMonth').value = keepMonth ? m : '';
  setFinStatus('Form cleared');
}
function setFinStatus(t) { document.getElementById('finEntryStatus').textContent = t; }

function setBreakdownExpanded(prefix, expanded) {
  const panel = document.getElementById(prefix + 'Breakdown');
  const btn = document.getElementById(prefix + 'ToggleBtn');
  if (!panel || !btn) return;
  panel.style.display = expanded ? '' : 'none';
  btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
}

function findFinByMonth(month) { return getFinData().find(x => x.type==='daily-fin' && x.month===month); }

function loadSelectedFinMonth() {
  const m = document.getElementById('finMonth').value;
  if (!m) return;
  const e = findFinByMonth(m);
  if (e) { fillFinForm(e); setFinStatus('Loaded ' + m); }
  else { blankFinForm(true); setFinStatus('No entry for ' + m); }
}

function saveFinEntry(ev) {
  ev.preventDefault();
  const e = getFinFormEntry();
  if (!e || !e.month) return toast('Please select a month', 'err');
  let data = getFinData();
  const i = data.findIndex(x => x.type==='daily-fin' && x.month===e.month);
  if (i>=0) data[i]=e; else data.push(e);
  data.sort((a,b) => String(a.month).localeCompare(String(b.month)));
  setFinData(data);
  setFinStatus('Saved ' + e.month);
  toast('Month saved — ' + e.month, 'ok');
  const btn = document.getElementById('pushFinToSheets');
  if (getSheetId()) { btn.style.display=''; btn.dataset.month=e.month; }
  renderAll(false);
}

function deleteFinMonth() {
  const m = document.getElementById('finMonth').value;
  if (!m || !confirm('Delete finance entry for ' + m + '?')) return;
  setFinData(getFinData().filter(x => !(x.type==='daily-fin' && x.month===m)));
  blankFinForm(true);
  renderAll(false);
  toast('Finance entry deleted', 'err');
}



function loadSelectedDate() {
  const d = document.getElementById('date').value;
  if (!d) return;
  const e = findDaily(d);
  if (e) { fillForm(e); setStatus('Loaded '+d); }
  else { blankForm(true); setStatus('No entry for '+d); }
}

function saveEntry(ev) {
  ev.preventDefault();
  const e = getFormEntry();
  if (!e.date) return toast('Please select a date','err');
  let data = getData();
  const i = data.findIndex(x=>x.type==='daily'&&x.date===e.date);
  if (i>=0) data[i]=e; else data.push(e);
  data.sort((a,b)=>(a.date+a.type).localeCompare(b.date+b.type));
  setData(data);
  setStatus('Saved '+e.date);
  toast('Day saved — '+e.date,'ok');
  const btn = document.getElementById('pushToSheets');
  if (getSheetId()) { btn.style.display=''; btn.dataset.date=e.date; }
  renderAll(false);
}

function deleteDay() {
  const d = document.getElementById('date').value;
  if (!d||!confirm('Delete entry for '+d+'?')) return;
  setData(getData().filter(x=>!(x.type==='daily'&&x.date===d)));
  blankForm(true);
  renderAll(false);
  toast('Entry deleted','err');
}

/* ════════════════════════════════════════════
   NAVIGATION
════════════════════════════════════════════ */
/* ════════════════════════════════════════════
   CALENDAR & REMINDERS
════════════════════════════════════════════ */
const CAL_STORAGE_KEY = 'serkanCalendarV1';
const CAL_SEED_KEY    = 'serkanCalSeeded_v1';

// Event types config
const CAL_TYPES = {
  birthday:    { label:'Birthday',    icon:'🎂', cls:'birthday'    },
  anniversary: { label:'Anniversary', icon:'💍', cls:'anniversary' },
  holiday:     { label:'Holiday',     icon:'🎉', cls:'holiday'     },
  school:      { label:'School',      icon:'🏫', cls:'school'      },
  other:       { label:'Other',       icon:'📌', cls:'other'       },
};

// Seed data — all 27 events from your bday.csv + Zeynep Ozkan
// recurring:true = repeats every year on same MM-DD
// recurring:false = one specific calendar year only
const CAL_SEED_EVENTS = [
  {id:'s01', month:1,  day:13, name:'Sinan Kula',          type:'birthday',    recurring:true},
  {id:'s02', month:3,  day:14, name:'Zeynep Ozkan',        type:'birthday',    recurring:true},
  {id:'s03', month:5,  day:10, name:"Mother's Day 2026",   type:'holiday',     recurring:false, year:2026},
  {id:'s04', month:5,  day:20, name:'Soykan',              type:'birthday',    recurring:true},
  {id:'s05', month:5,  day:22, name:'Zeynep Aydin',        type:'birthday',    recurring:true},
  {id:'s06', month:5,  day:25, name:'Luca Cipollone',      type:'birthday',    recurring:true},
  {id:'s07', month:5,  day:27, name:'Seval Gundem (?)',    type:'birthday',    recurring:true},
  {id:'s08', month:5,  day:30, name:'C. Torcuk',           type:'birthday',    recurring:true},
  {id:'s09', month:6,  day:6,  name:'Saban Sahin',         type:'birthday',    recurring:true},
  {id:'s10', month:6,  day:9,  name:'Nurdan Nazli Doruk',  type:'birthday',    recurring:true},
  {id:'s11', month:6,  day:12, name:'Germany Arrival Anniversary', type:'anniversary', recurring:true},
  {id:'s12', month:6,  day:15, name:'Onur Yagan',          type:'birthday',    recurring:true},
  {id:'s13', month:6,  day:21, name:"Father's Day 2026",   type:'holiday',     recurring:false, year:2026},
  {id:'s14', month:6,  day:23, name:'Marriage Anniversary', type:'anniversary', recurring:true},
  {id:'s15', month:6,  day:30, name:'Omer Torun',          type:'birthday',    recurring:true},
  {id:'s16', month:7,  day:2,  name:'Babam',               type:'birthday',    recurring:true},
  {id:'s17', month:7,  day:27, name:'Kemal Izin',          type:'birthday',    recurring:true},
  {id:'s18', month:8,  day:25, name:'Minnak',              type:'birthday',    recurring:true},
  {id:'s19', month:10, day:4,  name:'Patrizia',            type:'birthday',    recurring:true},
  {id:'s20', month:10, day:12, name:'MY Birthday 🎉',      type:'birthday',    recurring:true},
  {id:'s21', month:10, day:16, name:'Luca Catalano',       type:'birthday',    recurring:true},
  {id:'s22', month:11, day:1,  name:'Dating Anniversary',  type:'anniversary', recurring:true},
  {id:'s23', month:11, day:2,  name:'Incik',               type:'birthday',    recurring:true},
  {id:'s24', month:11, day:7,  name:'Pisi',                type:'birthday',    recurring:true},
  {id:'s25', month:12, day:12, name:'Murat Yildizhan',     type:'birthday',    recurring:true},
  {id:'s26', month:12, day:21, name:'Harun',               type:'birthday',    recurring:true},
  {id:'s27', month:12, day:25, name:'Christmas',           type:'holiday',     recurring:true},
  {id:'s28', month:12, day:31, name:'Annem',               type:'birthday',    recurring:true},
  {id:'s29', month:1,  day:1,  name:"New Year's Day",      type:'holiday',     recurring:true},
];

function getCalEvents() {
  try { return JSON.parse(localStorage.getItem(CAL_STORAGE_KEY) || '[]'); } catch(e) { return []; }
}
function setCalEvents(d) { localStorage.setItem(CAL_STORAGE_KEY, JSON.stringify(d)); }

function seedCalendarIfNeeded() {
  if (localStorage.getItem(CAL_SEED_KEY)) return;
  const existing = getCalEvents();
  if (!existing.length) setCalEvents(CAL_SEED_EVENTS);
  localStorage.setItem(CAL_SEED_KEY, '1');
}

// Current calendar view state
let calViewYear  = new Date().getFullYear();
let calViewMonth = new Date().getMonth() + 1; // 1-12

/* Returns events that apply on a given {year, month, day} */
function eventsOnDay(year, month, day) {
  return getCalEvents().filter(e => {
    if (e.recurring) return e.month === month && e.day === day;
    return (e.year || 0) === year && e.month === month && e.day === day;
  });
}

/* Returns all events occurring in the next `days` calendar days from today */
function upcomingEvents(days=30) {
  const today = new Date(); today.setHours(0,0,0,0);
  const end = new Date(today); end.setDate(end.getDate() + days);
  const results = [];
  const allEvents = getCalEvents();
  // Iterate day by day
  const cur = new Date(today);
  while (cur <= end) {
    const y = cur.getFullYear(), m = cur.getMonth()+1, d = cur.getDate();
    allEvents.forEach(e => {
      const matches = e.recurring
        ? e.month === m && e.day === d
        : (e.year||0) === y && e.month === m && e.day === d;
      if (matches) {
        const daysAway = Math.round((cur - today) / 86400000);
        results.push({ ...e, occursOn: new Date(cur), daysAway });
      }
    });
    cur.setDate(cur.getDate() + 1);
  }
  return results.sort((a,b) => a.daysAway - b.daysAway);
}

function renderCalendar() {
  seedCalendarIfNeeded();
  renderCalGrid();
  renderUpcoming();
  renderEventList();
}

function renderCalGrid() {
  const y = calViewYear, m = calViewMonth;
  document.getElementById('calMonthLabel').textContent = `${MONTHS[m-1]} ${y}`;
  const today = new Date(); today.setHours(0,0,0,0);
  const firstDay = new Date(y, m-1, 1);
  const lastDay  = new Date(y, m, 0);
  // Start on Monday (0=Sun→6, 1=Mon→0)
  let startDow = firstDay.getDay(); // 0=Sun
  startDow = startDow === 0 ? 6 : startDow - 1; // shift so Mon=0

  let html = '';
  // Pad with previous month days
  for (let i = 0; i < startDow; i++) {
    const prevDate = new Date(y, m-1, -startDow + i + 1);
    html += `<div class="cal-day other-month"><div class="cal-day-num">${prevDate.getDate()}</div></div>`;
  }
  // Current month days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const thisDate = new Date(y, m-1, d); thisDate.setHours(0,0,0,0);
    const isToday = thisDate.getTime() === today.getTime();
    const events = eventsOnDay(y, m, d);
    const dots = events.map(e => `<span class="cal-dot ${CAL_TYPES[e.type]?.cls||'other'}" title="${e.name}"></span>`).join('');
    html += `<div class="cal-day${isToday?' today':''}${events.length?' has-events':''}"
      onclick="calDayClick(${y},${m},${d})" title="${events.map(e=>CAL_TYPES[e.type]?.icon+' '+e.name).join('\n')||''}">
      <div class="cal-day-num">${d}</div>
      <div class="cal-day-dots">${dots}</div>
    </div>`;
  }
  // Pad end to complete grid
  const totalCells = startDow + lastDay.getDate();
  const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 1; i <= remaining; i++) {
    html += `<div class="cal-day other-month"><div class="cal-day-num">${i}</div></div>`;
  }
  document.getElementById('calGrid').innerHTML = html;
}

function calDayClick(y, m, d) {
  const dateStr = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  document.getElementById('calEventDate').value = dateStr;
  document.getElementById('calEventName').focus();
}

function renderUpcoming() {
  const events = upcomingEvents(30);
  if (!events.length) {
    document.getElementById('calUpcoming').innerHTML = '<p style="color:var(--muted);font-size:13px">No events in the next 30 days.</p>';
    return;
  }
  document.getElementById('calUpcoming').innerHTML = events.map(e => {
    const t = CAL_TYPES[e.type] || CAL_TYPES.other;
    const dateLabel = `${String(e.occursOn.getDate()).padStart(2,'0')} ${MONTHS[e.occursOn.getMonth()]}`;
    let daysTag, daysClass;
    if (e.daysAway === 0) { daysTag = 'Today!'; daysClass = 'today-tag'; }
    else if (e.daysAway <= 3) { daysTag = `In ${e.daysAway}d`; daysClass = 'soon-tag'; }
    else { daysTag = `In ${e.daysAway}d`; daysClass = 'future-tag'; }
    return `<div class="upcoming-event">
      <span class="upcoming-date">${dateLabel}</span>
      <span class="upcoming-badge">${t.icon}</span>
      <span class="upcoming-name">${e.name}</span>
      <span class="upcoming-days ${daysClass}">${daysTag}</span>
    </div>`;
  }).join('');
}

function renderEventList() {
  const events = [...getCalEvents()].sort((a,b) => a.month!==b.month ? a.month-b.month : a.day-b.day);
  if (!events.length) { document.getElementById('calEventList').innerHTML = '<p style="color:var(--muted);font-size:13px">No events yet.</p>'; return; }
  document.getElementById('calEventList').innerHTML = events.map(e => {
    const t = CAL_TYPES[e.type] || CAL_TYPES.other;
    const dateLabel = `${String(e.day).padStart(2,'0')}/${String(e.month).padStart(2,'0')}`;
    const recurLabel = e.recurring ? '↻ annual' : `${e.year} only`;
    return `<div class="cal-event-item">
      <span class="cal-event-date">${dateLabel}</span>
      <span style="font-size:14px">${t.icon}</span>
      <span class="cal-event-name">${e.name}</span>
      <span class="cal-event-type ${e.type}">${t.label}</span>
      <span class="cal-event-recurring">${recurLabel}</span>
      <button class="cal-delete-btn" onclick="deleteCalEvent('${e.id}')" title="Delete">✕</button>
    </div>`;
  }).join('');
}

/* ── Public holidays via Nager.Date API ── */
// Nager.Date returns county codes like ["DE-NI"] for Niedersachsen-specific holidays.
// We include nationwide holidays (counties: null) + Niedersachsen (DE-NI) for Germany.
const NAGER_COUNTY_DE = 'DE-NI'; // Niedersachsen (Braunschweig)

async function fetchPublicHolidays(countryCode) {
  const log = document.getElementById('holFetchLog');
  const year = document.getElementById('holYear').value;
  log.textContent = `Fetching ${countryCode} holidays for ${year}…`;
  try {
    const resp = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    const existing = getCalEvents();
    const existingKeys = new Set(existing.map(e => `${e.month}-${e.day}-${e.name}`));
    const toAdd = [];

    data.forEach(h => {
      // For Germany: include nationwide + Niedersachsen specific holidays
      if (countryCode === 'DE') {
        const counties = h.counties;
        const isNationwide = !counties || counties.length === 0;
        const isNI = counties && counties.includes(NAGER_COUNTY_DE);
        if (!isNationwide && !isNI) return; // skip other states
      }
      const [y, m, d] = h.date.split('-').map(Number);
      const name = `🇩🇪 ${h.localName}` || h.name;
      const key = `${m}-${d}-${name}`;
      if (existingKeys.has(key)) return; // skip duplicates
      toAdd.push({
        id: `nager_${countryCode}_${year}_${h.date}`,
        month: m, day: d,
        name: countryCode === 'DE' ? `🇩🇪 ${h.localName}` : `🇹🇷 ${h.localName || h.name}`,
        type: 'holiday',
        recurring: false, // fetched per year, not recurring (Easter shifts etc.)
        year: y,
      });
    });

    if (!toAdd.length) {
      log.textContent = `✓ No new holidays to add — all ${data.length} already in your calendar.`;
      return;
    }
    setCalEvents([...existing, ...toAdd]);
    log.textContent = `✓ Added ${toAdd.length} ${countryCode} holidays for ${year}. (${data.length - toAdd.length} already existed)`;
    toast(`Added ${toAdd.length} holidays`, 'ok');
    renderCalendar();
  } catch(e) {
    log.textContent = `✗ Failed: ${e.message}`;
    toast('Holiday fetch failed: ' + e.message, 'err');
  }
}

/* ── School holidays CSV import ── */
// Expected format: date;name (one per row, semicolon or comma separated)
// Date can be YYYY-MM-DD or DD.MM.YYYY
// e.g.: 2026-07-23;Summer holidays start
//       2026-09-04;Summer holidays end
function importSchoolHolidayCsv(text) {
  const log = document.getElementById('schoolImportLog');
  const existing = getCalEvents();
  const existingKeys = new Set(existing.map(e => `${e.month}-${e.day}-${e.name}`));
  const toAdd = [];
  const lines = text.replace(/\r/g,'').split('\n').filter(l => l.trim() && !l.startsWith('#'));

  lines.forEach((line, i) => {
    const del = line.includes(';') ? ';' : ',';
    const parts = line.split(del);
    if (parts.length < 2) return;
    const rawDate = parts[0].trim();
    const name = parts.slice(1).join(del).trim().replace(/^"|"$/g,'');
    if (!name) return;

    // Parse date — YYYY-MM-DD or DD.MM.YYYY
    let m, d, y;
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      [y, m, d] = rawDate.split('-').map(Number);
    } else if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(rawDate)) {
      const p = rawDate.split('.').map(Number);
      d = p[0]; m = p[1]; y = p[2];
    } else { return; } // unrecognised date format

    const key = `${m}-${d}-${name}`;
    if (existingKeys.has(key)) return;
    toAdd.push({
      id: `school_${y}_${m}_${d}_${Date.now()}_${i}`,
      month: m, day: d, year: y,
      name, type: 'school',
      recurring: false,
    });
  });

  if (!toAdd.length) {
    log.textContent = `✓ No new events to add — all entries already exist or file was empty.`;
    return;
  }
  setCalEvents([...existing, ...toAdd]);
  log.textContent = `✓ Added ${toAdd.length} school holiday events.`;
  toast(`Added ${toAdd.length} school holidays`, 'ok');
  renderCalendar();
}

function saveCalEvent() {
  const dateVal = document.getElementById('calEventDate').value;
  const name    = document.getElementById('calEventName').value.trim();
  const type    = document.getElementById('calEventType').value;
  const recurring = document.getElementById('calEventRecurring').value === '1';
  if (!dateVal || !name) return toast('Please fill in a date and name', 'err');
  const d = new Date(dateVal + 'T00:00:00');
  const event = {
    id: 'ev_' + Date.now(),
    month: d.getMonth()+1,
    day: d.getDate(),
    name, type, recurring,
    ...(recurring ? {} : { year: d.getFullYear() }),
  };
  const events = getCalEvents();
  events.push(event);
  setCalEvents(events);
  toast('Event saved', 'ok');
  clearCalEventForm();
  renderCalendar();
}

function deleteCalEvent(id) {
  if (!confirm('Delete this event?')) return;
  setCalEvents(getCalEvents().filter(e => e.id !== id));
  toast('Event deleted', 'err');
  renderCalendar();
}

function clearCalEventForm() {
  document.getElementById('calEventDate').value = '';
  document.getElementById('calEventName').value = '';
  document.getElementById('calEventType').value = 'birthday';
  document.getElementById('calEventRecurring').value = '1';
}


/* ════════════════════════════════════════════
   WEEKLY PATTERNS
════════════════════════════════════════════ */
const DOW_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

const PATTERN_METRICS = [
  { key:'newScore',  id:'patNewScore', label:'New Score',       decimals:2, color:'#0ea5e9', calcScore:true  },
  { key:'score',     id:'patScore',    label:'Score (old)',     decimals:2, color:'#a78bfa', calcScore:false },
  { key:'prayTotal', id:'patPrayer',   label:'Prayer',         decimals:2, color:'#f59e0b', calcScore:false },
  { key:'reading',   id:'patReading',  label:'Reading (pages)',decimals:1, color:'#22c55e', calcScore:false },
  { key:'workout',   id:'patWorkout',  label:'Workout (min)',  decimals:1, color:'#14b8a6', calcScore:false },
  { key:'tvMovies',  id:'patScreen',   label:'Screen',         decimals:2, color:'#ef4444', calcScore:false },
  { key:'sleep',     id:'patSleep',    label:'Sleep (h)',      decimals:2, color:'#8b5cf6', calcScore:false },
];

function ensurePatternYearSelector() {
  const sel = document.getElementById('patternYearSelect');
  if (!sel) return;
  // Only include years that have actual daily entries with dates
  const ys = [...new Set(
    getData()
      .filter(d => d.type === 'daily' && d.date && d.year)
      .map(d => Number(d.year))
      .filter(y => y > 2000 && y < 2100)
  )].sort((a,b) => b-a);
  const current = sel.value;
  sel.innerHTML = '<option value="all">All years</option>';
  ys.forEach(y => {
    const o = document.createElement('option');
    o.value = y; o.textContent = y;
    sel.appendChild(o);
  });
  if (current && (current === 'all' || ys.includes(Number(current)))) sel.value = current;
  else sel.value = 'all';
}

/* Returns daily rows, optionally filtered by year */
function patternRows(yearFilter) {
  const all = getData().filter(d => d.type === 'daily' && d.date);
  if (!yearFilter || yearFilter === 'all') return all;
  return all.filter(d => Number(d.year) === Number(yearFilter));
}

/* Group rows by day-of-week (0=Mon…6=Sun) and compute per-metric averages */
function calcDowAverages(rows, metricKey, calcScore) {
  const buckets = Array.from({length:7}, ()=>[]);
  rows.forEach(d => {
    if (!d.date) return;
    // Ensure date is in YYYY-MM-DD format before parsing
    const dateStr = d.date.includes('.') 
      ? d.date.split('.').reverse().join('-')  // convert DD.MM.YYYY → YYYY-MM-DD
      : d.date;
    const date = new Date(dateStr + 'T00:00:00');
    if (isNaN(date.getTime())) return; // skip invalid dates
    const dow = (date.getDay() + 6) % 7; // Mon=0 … Sun=6
    let val;
    if (metricKey === 'tvMovies') {
      val = (parseNum(d.tv) ?? 0) + (parseNum(d.movies) ?? 0);
      if (d.tv == null && d.movies == null) val = null;
    } else if (calcScore && metricKey === 'newScore') {
      val = parseNum(d.newScore);
      if (val === null && (d.prayTotal != null || d.reading != null || d.sleep != null)) {
        val = calcNewScore(d).total;
      }
    } else {
      val = parseNum(d[metricKey]);
    }
    if (val !== null && !isNaN(val)) buckets[dow].push(val);
  });
  return buckets.map(b => b.length ? round1(b.reduce((s,v)=>s+v,0)/b.length) : null);
}

function round1(n) { return Math.round(n*10)/10; }

function renderPatternChart(metric, rows) {
  destroyChart(metric.id);
  const canvas = document.getElementById(metric.id);
  if (!canvas) return;
  const avgs = calcDowAverages(rows, metric.key, metric.calcScore);
  const hasData = avgs.some(v => v !== null);
  if (!hasData) return;

  // Highlight weekend bars (Sat=5, Sun=6) with slightly different opacity
  const bgColors = avgs.map((_, i) =>
    i >= 5 ? metric.color + 'ee' : metric.color + '99'
  );
  const borderColors = avgs.map((_, i) =>
    i >= 5 ? metric.color : metric.color + '66'
  );

  charts[metric.id] = new Chart(canvas, {
    type:'bar',
    data:{
      labels: DOW_LABELS,
      datasets:[{
        label: metric.label,
        data: avgs,
        backgroundColor: bgColors,
        borderColor: borderColors,
        borderWidth: 1.5,
        borderRadius: 4,
        borderSkipped: false,
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:true,
      layout:{padding:{top:20}},
      plugins:{
        legend:{display:false},
        tooltip:{
          backgroundColor:'#1a2236',borderColor:'rgba(255,255,255,0.1)',borderWidth:1,
          titleColor:'#e8edf5',bodyColor:'#7a8ba8',
          callbacks:{label:ctx=>` ${metric.label}: ${ctx.parsed.y?.toFixed(metric.decimals)}`}
        },
        datalabels:{
          color:'#cdd7ea',
          font:{size:11,weight:'500',family:'JetBrains Mono, monospace'},
          anchor:'end', align:'end', offset:2,
          formatter:v=>v!=null?v.toFixed(metric.decimals):''
        }
      },
      scales:{
        x:{
          grid:{color:'rgba(255,255,255,0.04)'},
          ticks:{color:'#7a8ba8',font:{size:11}},
        },
        y:{
          grid:{color:'rgba(255,255,255,0.04)'},
          ticks:{color:'#7a8ba8',font:{size:10}},
          beginAtZero:false,
        }
      }
    }
  });
}

function renderPatterns() {
  ensurePatternYearSelector();
  const yearFilter = document.getElementById('patternYearSelect')?.value || 'all';
  const rows = patternRows(yearFilter);
  const label = yearFilter === 'all' ? `all years (${rows.length} days)` : `${yearFilter} (${rows.length} days)`;
  document.getElementById('patternTitle').textContent = `Weekly Patterns — ${label}`;
  // Defer chart rendering so section is visible and canvases have real pixel dimensions
  setTimeout(() => {
    PATTERN_METRICS.forEach(m => renderPatternChart(m, rows));
    // Force resize after render in case dimensions were still settling
    setTimeout(() => {
      PATTERN_METRICS.forEach(m => { if (charts[m.id]) charts[m.id].resize(); });
    }, 100);
  }, 50);
}

function switchView(v) {
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
  document.getElementById(v).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===v));
  if (v==='dashboard') renderDashboard();
  else if (v==='finDashboard') renderFinDashboard();
  else if (v==='history') renderHistory();
  else if (v==='calendar') renderCalendar();
  else if (v==='patterns') renderPatterns();
  // 'guide' is static HTML — no render needed
}

/* ════════════════════════════════════════════
   DATA HELPERS
════════════════════════════════════════════ */
function allYears() {
  const ys = [...new Set(getData().map(d=>d.year).filter(Boolean))].sort((a,b)=>b-a);
  return ys.length ? ys : [new Date().getFullYear()];
}
function isPartialYear(y) {
  if (Number(y) !== new Date().getFullYear()) return false;
  return !getData().some(d=>Number(d.year)===Number(y)&&Number(d.month)===12);
}
function cleanArr(a) { return a.map(v=>parseNum(v)).filter(v=>v!==null&&Number.isFinite(v)); }
function avg(a) { const c=cleanArr(a); return c.length ? c.reduce((s,v)=>s+v,0)/c.length : null; }
function tvMovies(d) { return num0(d.tv)+num0(d.movies); }

function rowsForYear(y) { return getData().filter(d=>Number(d.year)===Number(y)); }
function selectedMonth() { const v=document.getElementById('monthSelect')?.value; return v?Number(v):null; }
function rowsForPeriod(y) {
  const m=selectedMonth(), r=rowsForYear(y);
  return m ? r.filter(d=>Number(d.month)===m) : r;
}
function preferredRows(rows) {
  const m=rows.filter(d=>d.type==='monthly');
  return m.length ? m : rows.filter(d=>d.type==='daily');
}

/* For a daily row, get the effective value for a metric.
   If newScore/score isn't stored (common in imported daily data),
   calculate it on the fly from the raw habit fields. */
function effectiveVal(d, metric) {
  if (metric === 'tvMovies') return tvMovies(d);
  if (metric === 'newScore') {
    const stored = parseNum(d.newScore);
    if (stored !== null) return stored;
    // Calculate from raw fields if not stored
    if (d.type === 'daily' && (d.prayTotal!=null || d.reading!=null || d.sleep!=null)) {
      return calcNewScore(d).total;
    }
    return null;
  }
  if (metric === 'score') {
    const stored = parseNum(d.score);
    if (stored !== null) return stored;
    // Fall back to calculated newScore for old rows that only have raw habits
    if (d.type === 'daily' && (d.prayTotal!=null || d.reading!=null || d.sleep!=null)) {
      return calcNewScore(d).total;
    }
    return null;
  }
  return d[metric] !== undefined ? parseNum(d[metric]) : null;
}

function aggregate(rows, metric) {
  const pref = preferredRows(rows);
  const vals = pref.map(d => effectiveVal(d, metric));
  let res = avg(vals);
  if (res===null) {
    const yr = rows.filter(d=>d.type==='yearly');
    if (yr.length) res = avg(yr.map(d => effectiveVal(d, metric)));
  }
  return res;
}
function monthlyValues(y, metric) {
  const rows = rowsForYear(y);
  return Array.from({length:12},(_,i)=>{
    const mr = rows.filter(d=>Number(d.month)===i+1);
    if (!mr.length) return null;
    const mo = mr.filter(d=>d.type==='monthly');
    const src = mo.length ? mo : mr.filter(d=>d.type==='daily');
    return avg(src.map(d => effectiveVal(d, metric)));
  });
}
function lastDataMonth(y) {
  const rows = rowsForYear(y);
  const months = rows.map(d=>Number(d.month)).filter(Boolean);
  return months.length ? Math.max(...months) : 12;
}
function yearlyValues(metric) {
  const ys = allYears().sort((a,b)=>a-b);
  return { labels: ys.map(String), values: ys.map(y=>aggregate(rowsForYear(y),metric)) };
}

/* ── Delta colour logic (fixed) ── */
const LOWER_BETTER = new Set(['tvMovies','weightKg']);
const RANGE_METRIC = new Set(['sleep']); // 7-8 optimal — show neutral for delta
function deltaClass(key, delta) {
  if (delta===null||delta===undefined) return 'neutral';
  if (RANGE_METRIC.has(key)) return 'neutral';
  return LOWER_BETTER.has(key) ? (delta<=0?'good':'bad') : (delta>=0?'good':'bad');
}
function isTrivial(key, delta, base) {
  if (delta===null||base===null||base===0) return false;
  return Math.abs(delta/base) < 0.04;
}

/* ════════════════════════════════════════════
   CHART HELPERS
════════════════════════════════════════════ */
if (window.ChartDataLabels) Chart.register(window.ChartDataLabels);

const C = {
  blue:'#0ea5e9', yellow:'#f59e0b', green:'#22c55e',
  purple:'#a78bfa', red:'#ef4444', teal:'#14b8a6',
};
const PALETTE = [C.blue, C.yellow, C.green, C.purple];

function valueLabel(decimals=1) {
  return {
    color:'#cdd7ea', font:{size:10,weight:'500',family:'JetBrains Mono'},
    formatter: v => (v===null||v===undefined||!Number.isFinite(Number(v))) ? '' : Number(v).toFixed(decimals),
  };
}

function chartDefaults(labels, datasets, opts={}) {
  return {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      layout: { padding: { top: 16 } },
      interaction: { mode:'index', intersect:false },
      plugins: {
        legend: { labels:{ color:'#7a8ba8', font:{size:12,family:'Inter'}, boxWidth:18 } },
        tooltip: {
          backgroundColor:'#1a2236', borderColor:'rgba(255,255,255,0.1)', borderWidth:1,
          titleColor:'#e8edf5', bodyColor:'#7a8ba8',
          callbacks:{ label: ctx=>' '+ctx.dataset.label+': '+(ctx.parsed.y!=null?ctx.parsed.y.toFixed(2):'—') }
        },
        datalabels: {
          ...valueLabel(opts.decimals ?? 1),
          align: 'top', anchor: 'end', offset: 4,
          display: ctx => ctx.dataset.borderDash ? false : (ctx.dataset.data[ctx.dataIndex] !== null),
        }
      },
      scales: {
        x: { grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#7a8ba8',font:{size:11},maxRotation:0} },
        y: { grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#7a8ba8',font:{size:11}} }
      }
    }
  };
}
function lineSeries(name, values, color, opts={}) {
  return {
    label: name, data: values,
    borderColor: color,
    backgroundColor: color+'18',
    borderWidth: opts.dashed ? 1.5 : 2.5,
    borderDash: opts.dashed ? [8,5] : undefined,
    pointRadius: opts.dashed ? 0 : 4,
    pointHoverRadius: opts.dashed ? 0 : 6,
    tension: 0.3,
    fill: opts.fill ?? false,
    spanGaps: true,
    ...opts,
  };
}
function barSeries(name, values, color) {
  return { type:'bar', label:name, data:values, backgroundColor:color+'cc', borderRadius:4, borderSkipped:false };
}


/* ════════════════════════════════════════════
   DASHBOARD
════════════════════════════════════════════ */
function ensureYearSelectors() {
  const ys = allYears();
  ['yearSelect','compareYearSelect'].forEach((id,idx) => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const old = sel.value;
    sel.innerHTML = '';
    ys.forEach(y => { const o=document.createElement('option'); o.value=y; o.textContent=y; sel.appendChild(o); });
    if (old && ys.includes(Number(old))) sel.value=old;
    else sel.value = ys[0]; // both selectors default to the most recent year — single-year view
  });
}
// Finance now shares the Dashboard's year/compare selectors — no separate selectors needed.

function renderKpis() {
  const y  = document.getElementById('yearSelect').value;
  const cy = document.getElementById('compareYearSelect').value;
  const compareActive = !!cy && cy !== y;
  const pLabel = selectedMonth() ? MONTHS[selectedMonth()-1] : 'All year';
  const partial = isPartialYear(y);

  const METRICS = [
    ['New Score','newScore'], ['Score (old)','score'], ['Prayer','prayTotal'],
    ['Screen','tvMovies'], ['Reading','reading'],
    ['Sleep h','sleep'], ['Workout min','workout'], ['Weight kg','weightKg'],
    ['Water L','water'], ['German min','german']
  ];
  document.getElementById('kpiGrid').innerHTML = METRICS.map(([label, key]) => {
    const a = aggregate(rowsForPeriod(y), key);
    const b = compareActive ? aggregate(rowsForPeriod(cy), key) : null;
    const delta = (a!=null&&b!=null) ? a-b : null;
    const trivial = isTrivial(key, delta, b);
    const cls = trivial ? 'neutral' : deltaClass(key, delta);
    let dText = compareActive
      ? (delta==null ? `vs ${cy}: —`
        : trivial ? `vs ${cy}: ~${(delta>=0?'+':'')+fmt(delta,1)} (≈same)`
        : `vs ${cy}: ${(delta>=0?'+':'')+fmt(delta,1)}`)
      : 'Single year';
    const ptag = partial ? `<span class="partial-tag">partial</span>` : '';
    return `<div class="kpi-card">
      <div class="kpi-title">${label} · ${y} · ${pLabel}${ptag}</div>
      <div class="kpi-value">${fmt(a,1)}</div>
      <div class="kpi-delta ${cls}">${dText}</div>
    </div>`;
  }).join('');
}

/* ════════════════════════════════════════════
   ALL-TIME RECORDS
════════════════════════════════════════════ */
const RECORD_METRICS = [
  { key:'newScore',  label:'New Score',    icon:'⭐', higher:true,  unit:'',    decimals:1 },
  { key:'score',     label:'Score (old)',  icon:'🏅', higher:true,  unit:'',    decimals:1 },
  { key:'prayTotal', label:'Prayer',       icon:'🤲', higher:true,  unit:'',    decimals:1 },
  { key:'reading',   label:'Reading',      icon:'📖', higher:true,  unit:'p',   decimals:0 },
  { key:'workout',   label:'Workout',      icon:'💪', higher:true,  unit:'min', decimals:0 },
  { key:'sleep',     label:'Sleep',        icon:'😴', higher:true,  unit:'h',   decimals:1 },
  { key:'water',     label:'Water',        icon:'💧', higher:true,  unit:'L',   decimals:1 },
  { key:'german',    label:'German',       icon:'🇩🇪', higher:true,  unit:'min', decimals:0 },
  { key:'weightKg',  label:'Lowest Weight',icon:'⚖️', higher:false, unit:'kg',  decimals:1 },
  { key:'tvMovies',  label:'Lowest Screen', icon:'📺', higher:false, unit:'ep',  decimals:1 },
];

function renderRecords() {
  const all = getData();
  const monthlyRows = all.filter(d => d.type === 'monthly' && d.year && d.month);
  const dailyRows   = all.filter(d => d.type === 'daily');

  // Build a unified set of "monthly aggregates" — prefer pre-computed AVG rows,
  // but fall back to computing from daily rows for any month not covered by AVGs.
  const monthAggMap = {}; // key: "YYYY-MM" -> { year, month, vals: {metric: value} }

  // First: add all monthly AVG rows
  monthlyRows.forEach(row => {
    const key = `${row.year}-${String(row.month).padStart(2,'0')}`;
    if (!monthAggMap[key]) monthAggMap[key] = { year: row.year, month: row.month, source: 'avg', row };
  });

  // Second: compute monthly averages from daily rows for months not covered by AVGs
  const dailyByMonth = {};
  dailyRows.forEach(d => {
    if (!d.year || !d.month) return;
    const key = `${d.year}-${String(d.month).padStart(2,'0')}`;
    if (!dailyByMonth[key]) dailyByMonth[key] = { year: d.year, month: d.month, rows: [] };
    dailyByMonth[key].rows.push(d);
  });
  Object.entries(dailyByMonth).forEach(([key, {year, month, rows}]) => {
    if (!monthAggMap[key]) {
      // No AVG row for this month — create a computed aggregate
      monthAggMap[key] = { year, month, source: 'computed', rows };
    }
  });

  const allMonthAggs = Object.values(monthAggMap);

  if (!allMonthAggs.length) {
    document.getElementById('recordsGrid').innerHTML =
      '<p style="color:var(--muted);font-size:13px">No data found — import your CSV to populate records.</p>';
    return;
  }

  function monthLabel(y, m) { return `${MONTHS[m-1]} ${y}`; }

  function aggVal(agg, field) {
    if (agg.source === 'avg') return effectiveVal(agg.row, field);
    // Computed from daily rows — average across the month
    if (agg.rows && agg.rows.length) {
      const vals = agg.rows.map(d => effectiveVal(d, field)).filter(v => v !== null);
      return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
    }
    return null;
  }

  const cards = RECORD_METRICS.map(m => {
    let bestVal = null, bestAgg = null;
    allMonthAggs.forEach(agg => {
      const v = aggVal(agg, m.key);
      if (v === null) return;
      if (bestVal === null || (m.higher ? v > bestVal : v < bestVal)) {
        bestVal = v; bestAgg = agg;
      }
    });
    if (bestVal === null || !bestAgg) return null;

    // Best single day — from daily entries only (monthly AVGs have no single-day detail)
    let bestDayVal = null, bestDay = null;
    dailyRows.forEach(d => {
      const v = effectiveVal(d, m.key);
      if (v === null) return;
      if (bestDayVal === null || (m.higher ? v > bestDayVal : v < bestDayVal)) {
        bestDayVal = v; bestDay = d;
      }
    });

    const valFmt = bestVal.toFixed(m.decimals) + (m.unit ? ' '+m.unit : '');
    const when = monthLabel(bestAgg.year, bestAgg.month);
    const sourceNote = bestAgg.source === 'computed' ? ' · calculated' : ' · monthly avg';
    const dayNote = bestDay
      ? `Best day: ${bestDayVal.toFixed(m.decimals)}${m.unit?' '+m.unit:''} on ${bestDay.date}`
      : '';

    return `<div class="record-card">
      <div class="record-trophy">${m.icon}</div>
      <div class="record-metric">${m.label}</div>
      <div class="record-value">${valFmt}</div>
      <div class="record-when">🏆 ${when}${sourceNote}</div>
      ${dayNote ? `<div class="record-note">${dayNote}</div>` : ''}
    </div>`;
  }).filter(Boolean);

  document.getElementById('recordsGrid').innerHTML = cards.length
    ? cards.join('')
    : '<p style="color:var(--muted);font-size:13px">Not enough data to compute records yet.</p>';
}

/* Show a nudge banner on the Dashboard if today hasn't been logged yet */
function renderNotLoggedNudge() {
  const existing = document.getElementById('notLoggedNudge');
  if (existing) existing.remove();
  const today = todayISO();
  const logged = findDaily(today);
  if (logged) return; // already logged today — no nudge needed

  const banner = document.createElement('div');
  banner.id = 'notLoggedNudge';
  banner.style.cssText = 'background:var(--yellow-dim);border:1px solid rgba(245,158,11,0.25);border-radius:var(--radius);padding:11px 16px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;gap:12px;';
  banner.innerHTML = `
    <span style="font-size:13px;color:var(--text)">📝 You haven't logged today yet</span>
    <button onclick="switchView('entry')" style="background:var(--yellow);color:#1a0e00;border:none;border-radius:var(--radius-sm);padding:6px 14px;font:600 12px var(--sans);cursor:pointer;white-space:nowrap;">Log today →</button>
  `;
  const dashSection = document.getElementById('dashboard');
  if (dashSection) dashSection.insertBefore(banner, dashSection.firstChild);
}

function renderDashboard() {
  ensureYearSelectors();
  renderKpis();
  renderRecords();
  renderNotLoggedNudge();

  const metric = document.getElementById('metricSelect').value;
  const y  = document.getElementById('yearSelect').value;
  const cy = document.getElementById('compareYearSelect').value;
  const compareActive = !!cy && cy !== y;
  const wholeNumberMetrics = new Set(['workout','german','reading']);
  const decimals = wholeNumberMetrics.has(metric) ? 0 : 1;

  // Monthly chart — only plot up to the last month with real data for each year
  destroyChart('monthly');
  const yLast = lastDataMonth(y);
  const yVals = monthlyValues(y, metric).map((v,i) => i < yLast ? v : null);
  const mSeries = [lineSeries(y, yVals, C.blue, {fill:true})];
  if (compareActive) {
    const cyLast = lastDataMonth(cy);
    const cyVals = monthlyValues(cy, metric).map((v,i) => i < cyLast ? v : null);
    mSeries.push(lineSeries(cy, cyVals, C.yellow));
  } else {
    // Average reference line only makes sense in single-year view — once a second
    // year is being compared directly, the two solid lines already tell that story
    // and a third dashed "average" line becomes visual noise rather than signal.
    const yAvg = aggregate(rowsForYear(y), metric);
    if (yAvg!=null) mSeries.push(lineSeries(`${y} avg`, new Array(12).fill(yAvg), C.yellow, {dashed:true}));
  }
  charts['monthly'] = new Chart(document.getElementById('monthlyChart'), chartDefaults(MONTHS, mSeries, {decimals}));

  // Yearly chart — all-time average reference line added, so you can see at a
  // glance which years sit above/below your long-term baseline for this metric.
  destroyChart('yearly');
  const yy = yearlyValues(metric);
  const ySeries = [lineSeries(metric, yy.values, C.blue, {fill:true})];
  const allTimeAvg = avg(yy.values);
  if (allTimeAvg!=null) ySeries.push(lineSeries('all-time avg', new Array(yy.labels.length).fill(round1(allTimeAvg)), C.purple, {dashed:true}));
  charts['yearly'] = new Chart(document.getElementById('yearChart'), chartDefaults(yy.labels, ySeries, {decimals}));
}
function round1(n) { return Math.round(n*10)/10; }

/* ════════════════════════════════════════════
   FINANCE DASHBOARD (separate tab/nav, own filters)
════════════════════════════════════════════ */
/* Aggregates live finance entries (seeded + real) into one row per year.
   Real monthly 'daily-fin' entries take priority; falls back to a seeded
   'yearly' row for years with no real monthly data at all. Includes DE
   category sums and TR Mom/Others split for the dedicated charts. */
function sumField(rows, k) {
  const vals = rows.map(d=>d[k]).filter(v=>v!=null);
  return vals.length ? vals.reduce((a,b)=>a+b,0) : null;
}
function finYearlyAggregate() {
  const data = getFinData();
  const years = [...new Set(data.map(d => d.year).filter(Boolean))].sort((a,b)=>a-b);
  return years.map(y => {
    const monthly = data.filter(d => d.year===y && d.type==='daily-fin');
    const seededYear = data.find(d => d.year===y && d.type==='yearly');
    if (monthly.length) {
      const row = { y, income: sumField(monthly,'income'), allowanceIncome: sumField(monthly,'allowanceIncome'), expDE: sumField(monthly,'expDE'), tr: sumField(monthly,'expTR') };
      EXP_DE_PARTS.forEach(c => row[c] = sumField(monthly, c));
      const momSum = sumField(monthly, 'trMomVarious');
      const othersSum = sumField(monthly, 'trOthersVarious');
      // Mom/Others totals also include the named sub-fields if present (real entries, not just estimates)
      const momExtra = TR_MOM_PARTS.filter(f=>f!=='trMomVarious').reduce((s,f)=>{ const v=sumField(monthly,f); return v!=null ? s+v : s; }, 0);
      const othersExtra = TR_OTHERS_PARTS.filter(f=>f!=='trOthersVarious').reduce((s,f)=>{ const v=sumField(monthly,f); return v!=null ? s+v : s; }, 0);
      row.trMom = (momSum ?? 0) + momExtra || null;
      row.trOthers = (othersSum ?? 0) + othersExtra || null;
      return row;
    }
    if (seededYear) {
      const row = { y, income: seededYear.income, allowanceIncome: seededYear.allowanceIncome ?? null, expDE: seededYear.expDE, tr: seededYear.expTR, trMom: null, trOthers: null };
      EXP_DE_PARTS.forEach(c => row[c] = null);
      return row;
    }
    const row = { y, income: null, allowanceIncome: null, expDE: null, tr: null, trMom: null, trOthers: null };
    EXP_DE_PARTS.forEach(c => row[c] = null);
    return row;
  });
}
function finDataForYear(y) { return finYearlyAggregate().find(f => f.y === Number(y)) || null; }

function finMonthlyForYear(y) {
  const data = getFinData();
  return Array.from({length:12}, (_,i) => {
    const m = i+1;
    const real = data.find(d => d.year===Number(y) && d.monthNum===m && d.type==='daily-fin');
    const seeded = !real ? data.find(d => d.year===Number(y) && d.monthNum===m && d.type==='monthly') : null;
    const src = real || seeded;
    if (!src) {
      const row = { m, income: null, allowanceIncome: null, expDE: null, tr: null, trMom: null, trOthers: null };
      EXP_DE_PARTS.forEach(c => row[c] = null);
      return row;
    }
    const row = { m, income: src.income, allowanceIncome: src.allowanceIncome ?? null, expDE: src.expDE, tr: src.expTR };
    EXP_DE_PARTS.forEach(c => row[c] = src[c] ?? null);
    const momExtra = TR_MOM_PARTS.reduce((s,f)=>{ const v=src[f]; return v!=null ? s+v : s; }, 0);
    const othersExtra = TR_OTHERS_PARTS.reduce((s,f)=>{ const v=src[f]; return v!=null ? s+v : s; }, 0);
    row.trMom = momExtra || null;
    row.trOthers = othersExtra || null;
    return row;
  });
}

/* ── Finance Dashboard selectors (independent from the habit Dashboard's) ── */
function ensureFinDashSelectors() {
  const ys = finYearlyAggregate().map(f => f.y).sort((a,b)=>b-a);
  if (!ys.length) return;
  ['finDashYearSelect','finDashCompareSelect'].forEach((id,idx) => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const old = sel.value;
    sel.innerHTML = '';
    ys.forEach(y => { const o=document.createElement('option'); o.value=y; o.textContent=y; sel.appendChild(o); });
    if (old && ys.includes(Number(old))) sel.value=old;
    else sel.value = ys[0]; // both default to most recent year — single-year view
  });
}

const DE_CAT_LABELS = {
  expHousehold:'Household', expSeko:'Seko', expCiko:'Çiko', expYaz:'Yaz', expPotisko:'Potişko',
  expTransport:'Transport', expGrocery:'Grocery', expEatOut:'Eat Out', expOthers:'Others'
};
const DE_CAT_COLORS = ['#0ea5e9','#f59e0b','#22c55e','#a78bfa','#ef4444','#14b8a6','#fb923c','#ec4899','#94a3b8'];

function renderFinDashKpis() {
  const y  = document.getElementById('finDashYearSelect').value;
  const cy = document.getElementById('finDashCompareSelect').value;
  const compareActive = !!cy && cy !== y;
  const a  = finDataForYear(y);
  const b  = compareActive ? finDataForYear(cy) : null;
  if (!a) { document.getElementById('finDashKpiGrid').innerHTML=''; return; }

  function totalIncome(row) {
    if (!row || (row.income == null && row.allowanceIncome == null)) return null;
    return (row.income ?? 0) + (row.allowanceIncome ?? 0);
  }
  function calcNet(row) {
    const totalInc = totalIncome(row);
    // For historical years, Expenses DE were not tracked; treat missing ExpDE as 0.
    // Allowance is also optional and treated as 0 when not present.
    // Only missing salary/allowance income AND TR payments should make the net cashflow incomplete.
    if (!row || (totalInc == null && row.tr == null)) return { net:null, partial:false };
    const partial = totalInc == null || row.tr == null;
    const net = (totalInc ?? 0) - (row.expDE ?? 0) - (row.tr ?? 0);
    return { net: round3(net), partial };
  }
  const { net:netA, partial:partialA } = calcNet(a);
  const { net:netB } = calcNet(b);
  const totalIncomeA = totalIncome(a);
  const totalIncomeB = totalIncome(b);
  const savingsA = (totalIncomeA && netA!=null) ? (netA/totalIncomeA*100) : null;
  const savingsB = (b && totalIncomeB && netB!=null) ? (netB/totalIncomeB*100) : null;

  function finCard(title, valA, valB, unit='k€', lowerBetter=false, decimals=2, partialFlag=false) {
    const v = valA!=null ? fmt(valA, decimals)+' '+unit : '—';
    const delta = (valA!=null && valB!=null) ? valA-valB : null;
    const trivial = delta!=null && Math.abs(delta)<0.01;
    const cls = trivial?'neutral' : delta==null?'neutral' : lowerBetter?(delta<=0?'good':'bad'):(delta>=0?'good':'bad');
    const dText = compareActive
      ? (delta==null ? `vs ${cy}: —`
        : trivial ? `~${(delta>=0?'+':'')+fmt(delta,decimals)} (≈same) vs ${cy}`
        : `${(delta>=0?'+':'')+fmt(delta,decimals)} vs ${cy}`)
      : 'Single year';
    const partialTag = partialFlag ? `<span class="partial-tag" title="One or more core components (income or TR) missing for part of this period">partial</span>` : '';
    return `<div class="fin-card">
      <div class="fin-title">${title} · ${y}${partialTag}</div>
      <div class="fin-value">${v}</div>
      <div class="fin-delta ${cls}" style="margin-top:6px">${dText}</div>
    </div>`;
  }

  document.getElementById('finDashKpiGrid').innerHTML =
    finCard('Income',           a.income, b?.income, 'k€', false) +
    finCard('Allowance Income', a.allowanceIncome, b?.allowanceIncome, 'k€', false) +
    finCard('Expenses DE',      a.expDE,  b?.expDE,  'k€', true)  +
    finCard('TR Payments',      a.tr,     b?.tr,      'k€', true)  +
    finCard('Net Cashflow',     netA,     netB,       'k€', false, 2, partialA) +
    finCard('Savings Rate',     savingsA, savingsB,   '%',  false, 1, partialA);
}

function renderFinDashCharts() {
  const y  = document.getElementById('finDashYearSelect').value;
  const cy = document.getElementById('finDashCompareSelect').value;
  const view = document.getElementById('finDashViewSelect').value; // 'monthly' | 'yearly'
  const compareActive = !!cy && cy !== y;

  const barOptions = {
    responsive:true, maintainAspectRatio:true,
    layout:{padding:{top:16}},
    interaction:{mode:'index',intersect:false},
    plugins:{
      legend:{labels:{color:'#7a8ba8',font:{size:12,family:'Inter'},boxWidth:18}},
      tooltip:{backgroundColor:'#1a2236',borderColor:'rgba(255,255,255,0.1)',borderWidth:1,titleColor:'#e8edf5',bodyColor:'#7a8ba8',
        callbacks:{label:ctx=>` ${ctx.dataset.label}: ${ctx.parsed.y!=null?ctx.parsed.y.toFixed(2):'—'}`}},
      datalabels:{ ...valueLabel(2), align:'top', anchor:'end', offset:2,
        display: ctx => ctx.dataset.data[ctx.dataIndex] !== null }
    },
    scales:{
      x:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#7a8ba8',font:{size:10}}},
      y:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#7a8ba8',font:{size:11}}}
    }
  };

  let labels, incomeSeries, allowanceSeries, expDESeries, trSeries, deCatRows, trMomSeries, trOthersSeries;

  if (view === 'yearly') {
    const yearly = finYearlyAggregate();
    labels = yearly.map(f => String(f.y));
    incomeSeries = yearly.map(f => f.income);
    allowanceSeries = yearly.map(f => f.allowanceIncome);
    expDESeries  = yearly.map(f => f.expDE);
    trSeries     = yearly.map(f => f.tr);
    deCatRows    = yearly;
    trMomSeries    = yearly.map(f => f.trMom);
    trOthersSeries = yearly.map(f => f.trOthers);
    document.getElementById('finDashIncExpTitle').textContent = 'Income vs Expenses (k€) — all years';
    document.getElementById('finDashNetTitle').textContent = 'Net cashflow (k€) — all years';
    document.getElementById('finDashDECatTitle').textContent = 'Expenses DE — category totals, all years';
    document.getElementById('finDashTRTitle').textContent = 'TR Payments — Mom vs Others, all years';
  } else {
    const monthly = finMonthlyForYear(y);
    labels = MONTHS;
    incomeSeries = monthly.map(m => m.income);
    allowanceSeries = monthly.map(m => m.allowanceIncome);
    expDESeries  = monthly.map(m => m.expDE);
    trSeries     = monthly.map(m => m.tr);
    deCatRows    = monthly;
    trMomSeries    = monthly.map(m => m.trMom);
    trOthersSeries = monthly.map(m => m.trOthers);
    document.getElementById('finDashIncExpTitle').textContent = `Income vs Expenses (k€) — ${y}`;
    document.getElementById('finDashNetTitle').textContent = `Net cashflow (k€) — ${y}`;
    document.getElementById('finDashDECatTitle').textContent = `Expenses DE — category breakdown, ${y}`;
    document.getElementById('finDashTRTitle').textContent = `TR Payments — Mom vs Others, ${y}`;
  }

  // ── Chart 1: Income vs Expenses — total income (salary + allowance) as one bar ──
  destroyChart('finDashIncExp');
  const totalIncomeSeries = labels.map((_, i) => {
    const sal = incomeSeries[i] ?? 0;
    const al  = allowanceSeries[i] ?? 0;
    return (incomeSeries[i]==null && allowanceSeries[i]==null) ? null : round3(sal + al);
  });
  const incExpDatasets = [
    { ...barSeries('Total Income k€', totalIncomeSeries, C.green) },
    { ...barSeries('Expenses DE k€',  expDESeries,       C.red)   },
    { ...barSeries('TR Payments k€',  trSeries,          C.yellow) },
  ];
  if (view === 'monthly' && compareActive) {
    const cyMonthly = finMonthlyForYear(cy);
    const cyTotal = cyMonthly.map(m =>
      (m.income==null && m.allowanceIncome==null) ? null : round3((m.income??0)+(m.allowanceIncome??0))
    );
    incExpDatasets.push({ ...barSeries(`Total Income k€ (${cy})`, cyTotal, C.green+'80') });
  }
  charts['finDashIncExp'] = new Chart(document.getElementById('finDashIncExpChart'), {
    type:'bar', data:{ labels, datasets: incExpDatasets }, options: barOptions
  });

  // ── Chart 1b: Salary vs Total Income — shows allowance delta visually ──
  destroyChart('finDashSalary');
  document.getElementById('finDashSalaryTitle').textContent =
    view === 'yearly' ? 'Salary vs Total Income (k€) — allowance delta, all years'
                      : `Salary vs Total Income (k€) — allowance delta, ${y}`;
  charts['finDashSalary'] = new Chart(document.getElementById('finDashSalaryChart'), {
    type:'bar',
    data:{ labels, datasets:[
      { ...barSeries('Salary only k€',  incomeSeries,       C.green) },
      { ...barSeries('Total Income k€', totalIncomeSeries,  C.teal)  },
    ]},
    options: barOptions
  });

  // ── Chart 2: Net cashflow ──
  // Treat a missing component as 0 rather than requiring Income+ExpDE+TR to
  // all be present — otherwise years with Income-only data (no DE detail yet)
  // would show no bar at all, which is misleading since we DO know the net
  // contribution from what we have. Years with truly nothing show no bar.
  destroyChart('finDashNet');
  const netSeries = labels.map((_, i) => {
    const inc = incomeSeries[i], allowance = allowanceSeries[i], de = expDESeries[i], tr = trSeries[i];
    const totalInc = (inc ?? 0) + (allowance ?? 0);
    if (inc==null && allowance==null && de==null && tr==null) return null; // nothing at all known
    return round3(totalInc - (de ?? 0) - (tr ?? 0));
  });
  const netIncomplete = labels.map((_, i) => (incomeSeries[i]==null && allowanceSeries[i]==null) || trSeries[i]==null);
  const netColors = netSeries.map((v,i) => {
    if (v==null) return '#444';
    const base = v>=0 ? C.green : C.red;
    return netIncomplete[i] ? base+'55' : base+'cc'; // partial years shown lighter/more transparent
  });
  charts['finDashNet'] = new Chart(document.getElementById('finDashNetChart'), {
    type:'bar',
    data:{ labels, datasets:[{ label:'Net k€', data:netSeries, backgroundColor:netColors, borderRadius:4, borderSkipped:false }] },
    options: {
      ...barOptions,
      plugins:{
        ...barOptions.plugins,
        legend:{display:false},
        tooltip:{
          ...barOptions.plugins.tooltip,
          callbacks:{
            label: ctx => {
              const v = ctx.parsed.y;
              const partial = netIncomplete[ctx.dataIndex];
              if (v==null) return ' No data';
              return partial ? ` Net: ${v.toFixed(2)} k€ (partial — missing income or TR for this period)` : ` Net: ${v.toFixed(2)} k€`;
            }
          }
        }
      }
    }
  });

  // ── Chart 3: DE category breakdown (stacked bar) ──
  destroyChart('finDashDECat');
  const deCatDatasets = EXP_DE_PARTS.map((cat, i) => ({
    type:'bar', label: DE_CAT_LABELS[cat],
    data: deCatRows.map(r => r[cat]),
    backgroundColor: DE_CAT_COLORS[i]+'cc',
    borderRadius: 2, borderSkipped:false,
  }));
  charts['finDashDECat'] = new Chart(document.getElementById('finDashDECatChart'), {
    type:'bar',
    data:{ labels, datasets: deCatDatasets },
    options: {
      ...barOptions,
      plugins: { ...barOptions.plugins, datalabels: { display:false } }, // too cluttered stacked
      scales: { x:{ ...barOptions.scales.x, stacked:true }, y:{ ...barOptions.scales.y, stacked:true } }
    }
  });

  // ── Chart 4: TR Mom vs Others ──
  destroyChart('finDashTR');
  charts['finDashTR'] = new Chart(document.getElementById('finDashTRChart'), {
    type:'bar',
    data:{
      labels,
      datasets:[
        { ...barSeries('Mom k€', trMomSeries, C.blue) },
        { ...barSeries('Others k€', trOthersSeries, C.purple) },
      ]
    },
    options: barOptions
  });

  // ── Chart 5: Cumulative cashflow — always yearly, shows running total since 2008 ──
  destroyChart('finDashCumul');
  const yearly = finYearlyAggregate();
  const cumulLabels = yearly.map(f => String(f.y));
  let running = 0;
  const cumulSeries = yearly.map(f => {
    const inc = (f.income??0) + (f.allowanceIncome??0);
    const net = inc - (f.expDE??0) - (f.tr??0);
    running = round3(running + net);
    return running;
  });
  charts['finDashCumul'] = new Chart(document.getElementById('finDashCumulChart'), {
    type:'line',
    data:{ labels: cumulLabels, datasets:[{
      label:'Cumulative net k€',
      data: cumulSeries,
      borderColor: C.blue,
      backgroundColor: C.blue+'22',
      fill: true,
      tension: 0.3,
      pointRadius: 4,
      pointBackgroundColor: C.blue,
      borderWidth: 2,
    }]},
    options:{
      responsive:true,
      maintainAspectRatio:false,
      layout:{padding:{top:16}},
      plugins:{
        legend:{display:false},
        tooltip:{backgroundColor:'#1a2236',borderColor:'rgba(255,255,255,0.1)',borderWidth:1,
          titleColor:'#e8edf5',bodyColor:'#7a8ba8',
          callbacks:{label:ctx=>` Cumulative: ${ctx.parsed.y.toFixed(2)} k€`}},
        datalabels:{...valueLabel(2),align:'top',anchor:'end',offset:4,
          display:ctx=>ctx.dataIndex===cumulSeries.length-1||ctx.dataIndex===0}
      },
      scales:{
        x:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#7a8ba8',font:{size:10}}},
        y:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#7a8ba8',font:{size:11}},
          title:{display:true,text:'k€',color:'#7a8ba8',font:{size:11}}}
      }
    }
  });
}

function renderFinDashboard() {
  ensureFinDashSelectors();
  renderFinDashKpis();
  renderFinDashCharts();
}

/* ════════════════════════════════════════════
   HISTORY
════════════════════════════════════════════ */
function scoreClass(v) {
  const n = parseNum(v);
  if (n===null) return '';
  return n>0?'score-positive':n<0?'score-negative':'score-zero';
}
function typeTag(t) {
  if (t==='monthly') return '<span class="tag-monthly">MAVG</span>';
  if (t==='yearly')  return '<span class="tag-yearly">YAVG</span>';
  return '<span class="tag-daily">day</span>';
}
function renderHistory() {
  const q  = document.getElementById('historySearch').value.toLowerCase();
  const tf = document.getElementById('historyTypeFilter').value;
  const cols = ['type','date','prayTotal','reading','tv','movies','teeth','workout',
                'sleep','weightKg','water','german','nutrition','bonusMalus','newScore','highlights'];
  const data = getData().slice().reverse()
    .filter(d=>!tf||d.type===tf)
    .filter(d=>!q||JSON.stringify(d).toLowerCase().includes(q))
    .slice(0,800);
  document.getElementById('historyCount').textContent = data.length+' rows';
  document.querySelector('#historyTable thead').innerHTML =
    `<tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr>`;
  document.querySelector('#historyTable tbody').innerHTML = data.map(d=>`
    <tr data-date="${d.date}" data-type="${d.type}">
      ${cols.map(c => {
        if (c==='type') return `<td>${typeTag(d.type)}</td>`;
        if (c==='newScore') return `<td class="${scoreClass(d[c])}">${fmt(d[c],1)}</td>`;
        if (['sleep','weightKg','water','prayTotal'].includes(c)) return `<td>${d[c]!=null?fmt(d[c],1):''}</td>`;
        return `<td>${d[c]??''}</td>`;
      }).join('')}
    </tr>`).join('');
  document.querySelectorAll('#historyTable tbody tr').forEach(tr=>
    tr.addEventListener('click', ()=>{
      if (tr.dataset.type!=='daily') return;
      switchView('entry');
      document.getElementById('date').value = tr.dataset.date;
      loadSelectedDate();
    }));
}

/* ════════════════════════════════════════════
   CSV IMPORT / EXPORT
════════════════════════════════════════════ */
function importCsvText(text) {
  const rows = parseCSV(text);
  const m = buildMap(rows);
  if (!m) { document.getElementById('importInfo').textContent='Import failed: could not find header row.'; return; }
  const entries = [];
  for (let i=m.dataStart; i<rows.length; i++) {
    const e = rowToEntry(rows[i], m);
    if (e) entries.push(e);
  }
  const key = e=>`${e.type}|${e.date}|${e.label||''}`;
  const by = new Map();
  getData().forEach(e=>by.set(key(e),e));
  entries.forEach(e=>by.set(key(e),e));
  const all = [...by.values()].sort((a,b)=>(a.date+a.type).localeCompare(b.date+b.type));
  setData(all);
  const d=entries.filter(e=>e.type==='daily').length;
  const mo=entries.filter(e=>e.type==='monthly').length;
  const yr=entries.filter(e=>e.type==='yearly').length;
  document.getElementById('importInfo').textContent =
    `✓ Imported ${entries.length} rows: ${d} daily · ${mo} monthly · ${yr} yearly. Total stored: ${all.length}.`;
  toast(`Imported ${entries.length} rows`,'ok');
  renderAll();
}

/* ── Finance CSV import — expects a clean header row matching FIN_EXPORT_COLS,
   semicolon-separated. This is the format produced by exportFinCsv() below,
   and also what Claude generates when processing a source spreadsheet. ── */
const FIN_NUMERIC_COLS = ['year','monthNum','income','allowanceIncome','expDE','expTR', ...EXP_DE_PARTS, ...EXP_TR_PARTS];

function importFinCsvText(text) {
  const rows = parseCSV(text);
  if (!rows.length) { document.getElementById('finImportInfo').textContent = 'Import failed: empty file.'; return; }
  const header = rows[0].map(h => String(h).trim());
  const monthIdx = header.indexOf('month');
  const typeIdx = header.indexOf('type');
  if (monthIdx < 0) { document.getElementById('finImportInfo').textContent = 'Import failed: no "month" column found in header row.'; return; }

  const entries = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[monthIdx]) continue; // skip blank rows
    const e = {};
    header.forEach((h, idx) => {
      let v = row[idx];
      if (v === '' || v === undefined) { e[h] = null; return; }
      if (FIN_NUMERIC_COLS.includes(h)) { e[h] = parseNum(v); }
      else { e[h] = v; }
    });
    if (!e.type) e.type = 'daily-fin';
    entries.push(e);
  }

  const key = e => `${e.type}|${e.month}`;
  const by = new Map();
  getFinData().forEach(e => by.set(key(e), e));
  entries.forEach(e => { if (e.month) by.set(key(e), e); });
  const all = [...by.values()].sort((a,b) => String(a.month).localeCompare(String(b.month)));
  setFinData(all);

  document.getElementById('finImportInfo').textContent =
    `✓ Imported ${entries.length} finance rows. Total stored: ${all.length}.`;
  toast(`Imported ${entries.length} finance rows`, 'ok');
  renderAll();
}

const EXPORT_COLS = ['type','label','date','year','month','day','prayTotal',
  'prayS','prayO','prayIk','prayAk','prayY','prayNf','prayT',
  'reading','tv','movies','teeth','workout','sleep','weightKg','targetKg','deltaKg','water',
  'german','nutrition','bonusMalus','newScore','highlights'];

function exportCsv() {
  const data = getData();
  if (!data.length) return toast('No data to export','err');
  const csv = [EXPORT_COLS.join(';'),
    ...data.map(r=>EXPORT_COLS.map(c=>`"${String(r[c]??'').replaceAll('"','""')}"`).join(';'))
  ].join('\n');
  download(new Blob([csv],{type:'text/csv;charset=utf-8'}), `serkan-lt-v3-${todayISO()}.csv`);
  toast('CSV exported','ok');
}
function exportFinCsv() {
  const data = getFinData();
  if (!data.length) return toast('No finance data to export','err');
  const csv = [FIN_EXPORT_COLS.join(';'),
    ...data.map(r=>FIN_EXPORT_COLS.map(c=>`"${String(r[c]??'').replaceAll('"','""')}"`).join(';'))
  ].join('\n');
  download(new Blob([csv],{type:'text/csv;charset=utf-8'}), `serkan-lt-finance-${todayISO()}.csv`);
  toast('Finance CSV exported','ok');
}
function exportJson() {
  const data = getData();
  const finData = getFinData();
  if (!data.length && !finData.length) return toast('No data to export','err');
  download(new Blob([JSON.stringify({log:data, finance:finData},null,2)],{type:'application/json'}), `serkan-lt-v3-${todayISO()}.json`);
  toast('JSON exported','ok');
}
function download(blob, name) {
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click();
}

/* ════════════════════════════════════════════
   GOOGLE SHEETS  (via Google Apps Script web app)
════════════════════════════════════════════ */
async function appsScriptCall(method, body, timeoutMs = 25000, tab = null) {
  const baseUrl = getSheetId(); // stores the Apps Script /exec URL
  if (!baseUrl) { toast('No Script URL configured','err'); return null; }
  updateSyncStatus('syncing');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let url = baseUrl;
    const opts = { method, signal: controller.signal };
    if (method === 'POST') {
      opts.headers = { 'Content-Type': 'text/plain;charset=utf-8' }; // avoids CORS preflight on Apps Script
      opts.body = JSON.stringify(tab ? { ...body, tab } : body);
    } else if (method === 'GET' && tab) {
      url += (url.includes('?') ? '&' : '?') + 'tab=' + encodeURIComponent(tab);
    }
    const resp = await fetch(url, opts);
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
    const data = await resp.json();
    if (!data.ok) throw new Error(data.error || 'Unknown script error');
    updateSyncStatus('ok');
    return data;
  } catch (e) {
    clearTimeout(timer);
    updateSyncStatus('error');
    const reason = e.name === 'AbortError'
      ? `Timed out after ${timeoutMs/1000}s — payload may be too large, try a smaller batch`
      : e.message;
    toast('Sheets error: ' + reason, 'err', 6000);
    const log = document.getElementById('sheetsLog');
    if (log) log.textContent = '✗ Error: ' + reason;
    return null;
  }
}

async function pushEntryToSheets(entry) {
  const resp = await appsScriptCall('POST', { mode: 'append', entry }, 25000, 'Log');
  if (resp) toast('Pushed to Sheets ✓', 'ok');
}

async function pullFromSheets() {
  const log = document.getElementById('sheetsLog');
  log.textContent = 'Pulling from Sheets…';
  const resp = await appsScriptCall('GET', null, 25000, 'Log');
  if (!resp) { log.textContent = 'Pull failed.'; return; }
  try {
    const rows = (resp.rows || []).map(r => {
      ['prayTotal','reading','tv','movies','teeth','workout','sleep','weightKg','targetKg',
       'deltaKg','water','german','nutrition','bonusMalus','newScore','year','month','day',
       'prayS','prayO','prayIk','prayAk','prayY','prayNf','prayT']
        .forEach(k => { if (r[k] !== null && r[k] !== undefined && r[k] !== '') r[k] = parseNum(r[k]) ?? r[k]; });
      return r;
    });
    const key = e => `${e.type}|${e.date}|${e.label||''}`;
    const by = new Map();
    getData().forEach(e => by.set(key(e), e));
    rows.forEach(e => { if (e.date) by.set(key(e), e); });
    const all = [...by.values()].sort((a,b) => (a.date+a.type).localeCompare(b.date+b.type));
    setData(all);
    log.textContent = `✓ Pulled ${rows.length} rows. Total: ${all.length}.`;
    toast(`Pulled ${rows.length} rows`, 'ok');
    renderAll();
  } catch (e) { log.textContent = 'Parse error: ' + e.message; toast('Could not parse response', 'err'); }
}

async function pushAllToSheets() {
  const data = getData();
  if (!data.length) return toast('No data to push', 'err');
  const log = document.getElementById('sheetsLog');
  const CHUNK = 150;
  const chunks = [];
  for (let i = 0; i < data.length; i += CHUNK) chunks.push(data.slice(i, i + CHUNK));

  log.textContent = `Pushing ${data.length} rows in ${chunks.length} batch(es)…`;
  let totalWritten = 0;
  for (let i = 0; i < chunks.length; i++) {
    const mode = i === 0 ? 'replaceAll' : 'appendBatch';
    log.textContent = `Pushing batch ${i+1}/${chunks.length} (${chunks[i].length} rows)…`;
    const resp = await appsScriptCall('POST', { mode, rows: chunks[i] }, 30000, 'Log');
    if (!resp) { log.textContent = `✗ Failed at batch ${i+1}/${chunks.length}. ${totalWritten} rows written so far.`; return; }
    totalWritten += resp.written ?? chunks[i].length;
  }
  log.textContent = `✓ Pushed ${totalWritten} rows in ${chunks.length} batch(es).`;
  toast('All data pushed', 'ok');
}

/* ── Finance tab push/pull (separate "Finance" sheet tab) ── */
async function pushFinEntryToSheets(entry) {
  const resp = await appsScriptCall('POST', { mode: 'append', entry }, 25000, 'Finance');
  if (resp) toast('Finance month pushed ✓', 'ok');
}

async function pullFinFromSheets() {
  const log = document.getElementById('sheetsLog');
  log.textContent = 'Pulling Finance from Sheets…';
  const resp = await appsScriptCall('GET', null, 25000, 'Finance');
  if (!resp) { log.textContent = 'Finance pull failed.'; return; }
  try {
    const numericFields = ['year','monthNum','income','allowanceIncome','expDE','expTR',
      ...EXP_DE_PARTS, ...EXP_TR_PARTS];
    const rows = (resp.rows || []).map(r => {
      numericFields.forEach(k => { if (r[k] !== null && r[k] !== undefined && r[k] !== '') r[k] = parseNum(r[k]) ?? r[k]; });
      return r;
    });
    const key = e => `${e.type}|${e.month}`;
    const by = new Map();
    getFinData().forEach(e => by.set(key(e), e));
    rows.forEach(e => { if (e.month) by.set(key(e), e); });
    const all = [...by.values()].sort((a,b) => String(a.month).localeCompare(String(b.month)));
    setFinData(all);
    log.textContent = `✓ Pulled ${rows.length} finance rows. Total: ${all.length}.`;
    toast(`Pulled ${rows.length} finance rows`, 'ok');
    renderAll();
  } catch (e) { log.textContent = 'Parse error: ' + e.message; toast('Could not parse Finance response', 'err'); }
}

async function pushAllFinToSheets() {
  const data = getFinData();
  if (!data.length) return toast('No finance data to push', 'err');
  const log = document.getElementById('sheetsLog');
  const CHUNK = 150;
  const chunks = [];
  for (let i = 0; i < data.length; i += CHUNK) chunks.push(data.slice(i, i + CHUNK));

  log.textContent = `Pushing ${data.length} finance rows in ${chunks.length} batch(es)…`;
  let totalWritten = 0;
  for (let i = 0; i < chunks.length; i++) {
    const mode = i === 0 ? 'replaceAll' : 'appendBatch';
    log.textContent = `Pushing finance batch ${i+1}/${chunks.length}…`;
    const resp = await appsScriptCall('POST', { mode, rows: chunks[i] }, 30000, 'Finance');
    if (!resp) { log.textContent = `✗ Failed at batch ${i+1}/${chunks.length}. ${totalWritten} rows written so far.`; return; }
    totalWritten += resp.written ?? chunks[i].length;
  }
  log.textContent = `✓ Pushed ${totalWritten} finance rows in ${chunks.length} batch(es).`;
  toast('All finance data pushed', 'ok');
}

function updateSheetUI() {
  const id = getSheetId();
  const badge = document.getElementById('sheetConnectionBadge');
  const btn   = document.getElementById('pushToSheets');
  if (id) {
    badge.className='connected-pill'; badge.textContent='● Connected';
    if (btn) btn.style.display='';
    updateSyncStatus('ok');
  } else {
    badge.className='disconnected-pill'; badge.textContent='● Not configured';
    if (btn) btn.style.display='none';
    updateSyncStatus('');
  }
  const inp = document.getElementById('sheetIdInput');
  if (inp) inp.value = id;
}

/* ════════════════════════════════════════════
   RENDER ALL
════════════════════════════════════════════ */
function renderAll(reloadSelectors=true) {
  if (reloadSelectors) { ensureYearSelectors(); }
  const activeView = document.querySelector('.view.active')?.id;
  if (activeView==='dashboard') renderDashboard();
  else if (activeView==='finDashboard') renderFinDashboard();
  else if (activeView==='history') renderHistory();
  updateSheetUI();
}

/* ════════════════════════════════════════════
   INIT
════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('date').value = todayISO();

  // Live score preview — prayer parts get their own handler (they also update the total field)
  ENTRY_FIELDS.forEach(f => {
    const el = document.getElementById(f);
    if (!el) return;
    if (PRAYER_PARTS.includes(f)) el.addEventListener('input', syncPrayerTotal);
    else el.addEventListener('input', updatePreview);
  });
  document.getElementById('date').addEventListener('change', loadSelectedDate);

  // Prayer breakdown toggle
  document.getElementById('prayerToggleBtn').addEventListener('click', () => {
    const expanded = document.getElementById('prayerToggleBtn').getAttribute('aria-expanded') === 'true';
    setPrayerExpanded(!expanded);
  });

  // Entry form
  document.getElementById('entryForm').addEventListener('submit', saveEntry);
  document.getElementById('loadDate').addEventListener('click', loadSelectedDate);
  document.getElementById('blankForm').addEventListener('click', () => blankForm(false));
  document.getElementById('deleteDay').addEventListener('click', deleteDay);
  document.getElementById('pushToSheets').addEventListener('click', () => {
    const d = document.getElementById('pushToSheets').dataset.date || todayISO();
    const e = findDaily(d);
    if (e) pushEntryToSheets(e);
  });

  // ── Finance entry form ──
  seedFinanceDataIfNeeded();
  const curMonth = new Date().toISOString().slice(0,7);
  document.getElementById('finMonth').value = curMonth;

  EXP_DE_PARTS.forEach(f => { const el=document.getElementById(f); if(el) el.addEventListener('input', syncExpDETotal); });
  EXP_TR_PARTS.forEach(f => { const el=document.getElementById(f); if(el) el.addEventListener('input', syncExpTRTotal); });
  document.getElementById('expDEToggleBtn').addEventListener('click', () => {
    const expanded = document.getElementById('expDEToggleBtn').getAttribute('aria-expanded') === 'true';
    setBreakdownExpanded('expDE', !expanded);
  });
  document.getElementById('expTRToggleBtn').addEventListener('click', () => {
    const expanded = document.getElementById('expTRToggleBtn').getAttribute('aria-expanded') === 'true';
    setBreakdownExpanded('expTR', !expanded);
  });
  document.getElementById('finMonth').addEventListener('change', loadSelectedFinMonth);
  document.getElementById('finEntryForm').addEventListener('submit', saveFinEntry);
  document.getElementById('loadFinMonth').addEventListener('click', loadSelectedFinMonth);
  document.getElementById('blankFinForm').addEventListener('click', () => blankFinForm(false));
  document.getElementById('deleteFinMonth').addEventListener('click', deleteFinMonth);
  document.getElementById('pushFinToSheets').addEventListener('click', () => {
    const m = document.getElementById('pushFinToSheets').dataset.month || curMonth;
    const e = findFinByMonth(m);
    if (e) pushFinEntryToSheets(e);
  });
  loadSelectedFinMonth();

  // Nav
  document.querySelectorAll('.nav-btn').forEach(b =>
    b.addEventListener('click', () => switchView(b.dataset.view)));

  // Dashboard controls
  ['yearSelect','compareYearSelect','metricSelect','monthSelect'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => renderDashboard());
  });

  // Finance Dashboard controls (separate tab, own selectors)
  ['finDashYearSelect','finDashCompareSelect','finDashViewSelect'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => renderFinDashboard());
  });

  // History
  document.getElementById('historySearch').addEventListener('input', renderHistory);
  document.getElementById('historyTypeFilter').addEventListener('change', renderHistory);

  // Import — click
  const importZone = document.getElementById('importZone');
  const csvFile    = document.getElementById('csvFile');
  importZone.addEventListener('click', () => csvFile.click());
  csvFile.addEventListener('change', () => {
    const f = csvFile.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = e => importCsvText(e.target.result);
    r.readAsText(f,'UTF-8');
  });
  // Import — drag & drop
  importZone.addEventListener('dragover', e => { e.preventDefault(); importZone.classList.add('drag-over'); });
  importZone.addEventListener('dragleave', () => importZone.classList.remove('drag-over'));
  importZone.addEventListener('drop', e => {
    e.preventDefault(); importZone.classList.remove('drag-over');
    const f = e.dataTransfer.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => importCsvText(ev.target.result);
    r.readAsText(f,'UTF-8');
  });

  // Finance Import — click + drag & drop
  const finImportZone = document.getElementById('finImportZone');
  const finCsvFile = document.getElementById('finCsvFile');
  finImportZone.addEventListener('click', () => finCsvFile.click());
  finCsvFile.addEventListener('change', () => {
    const f = finCsvFile.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = e => importFinCsvText(e.target.result);
    r.readAsText(f,'UTF-8');
  });
  finImportZone.addEventListener('dragover', e => { e.preventDefault(); finImportZone.classList.add('drag-over'); });
  finImportZone.addEventListener('dragleave', () => finImportZone.classList.remove('drag-over'));
  finImportZone.addEventListener('drop', e => {
    e.preventDefault(); finImportZone.classList.remove('drag-over');
    const f = e.dataTransfer.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => importFinCsvText(ev.target.result);
    r.readAsText(f,'UTF-8');
  });

  // Export / clear
  document.getElementById('exportCsv').addEventListener('click', exportCsv);
  document.getElementById('exportFinCsv').addEventListener('click', exportFinCsv);
  document.getElementById('exportJson').addEventListener('click', exportJson);
  document.getElementById('clearAll').addEventListener('click', () => {
    if (!confirm('Clear ALL app data from this browser (Log + Finance)?')) return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(FIN_STORAGE_KEY);
    localStorage.removeItem('serkanFinanceSeeded_v2');
    toast('App data cleared','err');
    renderAll();
  });

  // Sheets
  document.getElementById('saveSheetId').addEventListener('click', () => {
    const id = document.getElementById('sheetIdInput').value.trim();
    setSheetId(id);
    updateSheetUI();
    toast(id?'Script URL saved':'Script URL cleared', id?'ok':'info');
  });
  document.getElementById('pullFromSheets').addEventListener('click', pullFromSheets);
  document.getElementById('pushAllToSheets').addEventListener('click', pushAllToSheets);
  document.getElementById('pullFinFromSheets').addEventListener('click', pullFinFromSheets);
  document.getElementById('pushAllFinToSheets').addEventListener('click', pushAllFinToSheets);

  // Calendar
  seedCalendarIfNeeded();
  document.getElementById('calPrev').addEventListener('click', () => {
    calViewMonth--;
    if (calViewMonth < 1) { calViewMonth = 12; calViewYear--; }
    renderCalendar();
  });
  document.getElementById('calNext').addEventListener('click', () => {
    calViewMonth++;
    if (calViewMonth > 12) { calViewMonth = 1; calViewYear++; }
    renderCalendar();
  });
  document.getElementById('calToday').addEventListener('click', () => {
    calViewYear = new Date().getFullYear();
    calViewMonth = new Date().getMonth() + 1;
    renderCalendar();
  });
  document.getElementById('saveCalEvent').addEventListener('click', saveCalEvent);
  document.getElementById('clearCalEvent').addEventListener('click', clearCalEventForm);

  // Holiday year selector — current year + next 2 years
  const holYearSel = document.getElementById('holYear');
  const thisYear = new Date().getFullYear();
  [thisYear, thisYear+1, thisYear+2].forEach(y => {
    const o = document.createElement('option');
    o.value = y; o.textContent = y;
    holYearSel.appendChild(o);
  });
  holYearSel.value = thisYear;

  // Public holiday fetch buttons
  document.getElementById('fetchHolDE').addEventListener('click', () => fetchPublicHolidays('DE'));
  document.getElementById('fetchHolTR').addEventListener('click', () => fetchPublicHolidays('TR'));

  // School holidays CSV import
  const schoolZone = document.getElementById('schoolImportZone');
  const schoolFile = document.getElementById('schoolCsvFile');
  schoolZone.addEventListener('click', () => schoolFile.click());
  schoolFile.addEventListener('change', () => {
    const f = schoolFile.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = e => importSchoolHolidayCsv(e.target.result);
    r.readAsText(f, 'UTF-8');
  });
  schoolZone.addEventListener('dragover', e => { e.preventDefault(); schoolZone.classList.add('drag-over'); });
  schoolZone.addEventListener('dragleave', () => schoolZone.classList.remove('drag-over'));
  schoolZone.addEventListener('drop', e => {
    e.preventDefault(); schoolZone.classList.remove('drag-over');
    const f = e.dataTransfer.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => importSchoolHolidayCsv(ev.target.result);
    r.readAsText(f, 'UTF-8');
  });

  // Patterns year selector
  document.getElementById('patternYearSelect')?.addEventListener('change', renderPatterns);

  // Boot — open on Dashboard (Option 3: smart default)
  ensureYearSelectors();
  updatePreview();
  updateSheetUI();
  loadSelectedDate();
  renderHistory();
  renderTodayReminder();
  renderDashboard(); // Dashboard is now the default active view
});

/* Show a reminder banner on Daily Entry if today or tomorrow has events */
function renderTodayReminder() {
  const today = new Date();
  const y = today.getFullYear(), m = today.getMonth()+1, d = today.getDate();
  const tomorrow = new Date(today); tomorrow.setDate(d+1);
  const ty = tomorrow.getFullYear(), tm = tomorrow.getMonth()+1, td = tomorrow.getDate();

  const todayEvents    = eventsOnDay(y, m, d);
  const tomorrowEvents = eventsOnDay(ty, tm, td);
  if (!todayEvents.length && !tomorrowEvents.length) return;

  const banner = document.createElement('div');
  banner.style.cssText = 'background:var(--accent-dim);border:1px solid rgba(14,165,233,0.2);border-radius:var(--radius);padding:10px 14px;margin-bottom:14px;font-size:13px;color:var(--text);line-height:1.8;';

  const parts = [];
  if (todayEvents.length) {
    parts.push('<strong>Today:</strong> ' + todayEvents.map(e => `${CAL_TYPES[e.type]?.icon||'📌'} ${e.name}`).join(' · '));
  }
  if (tomorrowEvents.length) {
    parts.push('<strong>Tomorrow:</strong> ' + tomorrowEvents.map(e => `${CAL_TYPES[e.type]?.icon||'📌'} ${e.name}`).join(' · '));
  }
  banner.innerHTML = parts.join('<br>');

  const firstPanel = document.getElementById('entry')?.querySelector('.panel');
  if (firstPanel) firstPanel.insertBefore(banner, firstPanel.firstChild);
}
