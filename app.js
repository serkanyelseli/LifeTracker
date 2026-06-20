/* ═══════════════════════════════════════════════════════
   Serkan Life Tracker V3.0
   - Chart.js charts with tooltips
   - scorePreview includes Nutrition + Bonus/Malus
   - Fixed comparison delta logic (prayer, sleep, trivial)
   - Partial year detection
   - Finance tab (Worth, Income, Expenses DE, TR Payments)
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

/* ── Historical data — exact values from Dashboard sheet ── */
// avgScore / newAvgScore: null means not tracked that year
// weight: yearly average kg
// expDE: null means Expenses DE not tracked (pre-2023)
const FINANCE_YEARLY = [
  {y:2008, avgScore:2.5,    newAvgScore:3.5,   tv:3.2016, read:25.34, sleep:7.100, wo:0.46,  weight:83,    worth:null, income:1.1910, expDE:null,  tr:1.0368},
  {y:2009, avgScore:5,      newAvgScore:6,      tv:5.1385, read:33.20, sleep:7.256, wo:22.12, weight:80,    worth:null, income:1.0777, expDE:null,  tr:1.0368},
  {y:2010, avgScore:5,      newAvgScore:6,      tv:4.5235, read:29.10, sleep:7.023, wo:24.62, weight:85,    worth:null, income:1.2498, expDE:null,  tr:1.2583},
  {y:2011, avgScore:3.5,    newAvgScore:4.5,    tv:3.2591, read:16.28, sleep:7.223, wo:11.46, weight:85,    worth:null, income:1.1347, expDE:null,  tr:1.0787},
  {y:2012, avgScore:3,      newAvgScore:2.5,    tv:3.0082, read:10.57, sleep:7.174, wo:4.78,  weight:88,    worth:null, income:1.4437, expDE:null,  tr:1.5602},
  {y:2013, avgScore:2.5,    newAvgScore:2,      tv:3.3834, read:9.10,  sleep:7.137, wo:5.16,  weight:88,    worth:null, income:1.6284, expDE:null,  tr:1.8716},
  {y:2014, avgScore:2.5,    newAvgScore:2,      tv:2.8249, read:26.09, sleep:7.099, wo:4.03,  weight:89,    worth:null, income:1.6271, expDE:null,  tr:2.0780},
  {y:2015, avgScore:0.5,    newAvgScore:-0.5,   tv:3.2744, read:16.12, sleep:6.966, wo:0.11,  weight:90,    worth:null, income:1.7900, expDE:null,  tr:1.8534},
  {y:2016, avgScore:1,      newAvgScore:null,   tv:3.0489, read:9.13,  sleep:6.996, wo:1.31,  weight:90,    worth:null, income:2.0956, expDE:null,  tr:1.2741},
  {y:2017, avgScore:1,      newAvgScore:null,   tv:2.7936, read:3.15,  sleep:7.033, wo:0.08,  weight:91,    worth:null, income:1.6752, expDE:null,  tr:1.7080},
  {y:2018, avgScore:null,   newAvgScore:-1,     tv:3.1167, read:4.77,  sleep:6.640, wo:1.20,  weight:91,    worth:null, income:1.5227, expDE:null,  tr:1.7080},
  {y:2019, avgScore:null,   newAvgScore:-1,     tv:3.1167, read:4.77,  sleep:6.455, wo:1.20,  weight:91,    worth:null, income:1.5573, expDE:null,  tr:1.7239},
  {y:2020, avgScore:0.5,    newAvgScore:null,   tv:2.9388, read:17.99, sleep:6.322, wo:1.32,  weight:88,    worth:null, income:1.7378, expDE:null,  tr:1.3116},
  {y:2021, avgScore:null,   newAvgScore:-1,     tv:4.8700, read:1.23,  sleep:6.535, wo:0.26,  weight:93,    worth:null, income:1.8604, expDE:null,  tr:1.1692},
  {y:2022, avgScore:null,   newAvgScore:-1,     tv:4.8287, read:1.06,  sleep:6.631, wo:1.63,  weight:95,    worth:null, income:2.1582, expDE:null,  tr:1.1126},
  {y:2023, avgScore:-0.5,   newAvgScore:-1.5,   tv:5.9178, read:3.13,  sleep:6.838, wo:1.33,  weight:90,    worth:12,   income:3.0823, expDE:4.4,   tr:1.7500},
  {y:2024, avgScore:2,      newAvgScore:1.5,    tv:10.074, read:11.74, sleep:7.269, wo:13.31, weight:89,    worth:40,   income:2.8145, expDE:4.8,   tr:2.1415},
  {y:2025, avgScore:2,      newAvgScore:1,      tv:9.2823, read:8.96,  sleep:7.245, wo:17.53, weight:90,    worth:115,  income:5.5776, expDE:5.8,   tr:1.5338},
  {y:2026, avgScore:2.5208, newAvgScore:2.5208, tv:9.2584, read:2.96,  sleep:7.136, wo:16.64, weight:90.53, worth:null, income:6.2573, expDE:5.9488, tr:0.4037},
];

const FINANCE_MONTHLY_2026 = [
  {m:1, label:'Jan', income:6.069,  expDE:6.2695, tr:0.2593},
  {m:2, label:'Feb', income:6.079,  expDE:5.7188, tr:0.2964},
  {m:3, label:'Mar', income:6.071,  expDE:5.7315, tr:0.2793},
  {m:4, label:'Apr', income:6.076,  expDE:6.0513, tr:0.2051},
  {m:5, label:'May', income:6.078,  expDE:7.1809, tr:0.1866},
  {m:6, label:'Jun', income:7.171,  expDE:4.7410, tr:0.1715},
];

/* ── Chart instances ── */
let charts = {};
function destroyChart(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }

/* ── Storage ── */
function getData() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e) { return []; } }
function setData(d) { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); }
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
function switchView(v) {
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
  document.getElementById(v).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===v));
  if (v==='dashboard') renderDashboard();
  else if (v==='history') renderHistory();
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
function aggregate(rows, metric) {
  const pref = preferredRows(rows);
  const vals = pref.map(d=>metric==='tvMovies'?tvMovies(d):d[metric]);
  let res = avg(vals);
  if (res===null) {
    const yr = rows.filter(d=>d.type==='yearly');
    if (yr.length) res = avg(yr.map(d=>metric==='tvMovies'?tvMovies(d):d[metric]));
  }
  return res;
}
function monthlyValues(y, metric) {
  const rows = rowsForYear(y);
  return Array.from({length:12},(_,i)=>{
    const mr = rows.filter(d=>Number(d.month)===i+1);
    if (!mr.length) return null;
    const mo = mr.filter(d=>d.type==='monthly');
    return aggregate(mo.length?mo:mr.filter(d=>d.type==='daily'), metric);
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
    ['TV + Movies','tvMovies'], ['Reading','reading'],
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

function renderDashboard() {
  ensureYearSelectors();
  renderKpis();
  renderFinKpis();

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
  }
  const yAvg = aggregate(rowsForYear(y), metric);
  if (yAvg!=null) mSeries.push(lineSeries(`${y} avg`, new Array(12).fill(yAvg), C.yellow, {dashed:true}));
  charts['monthly'] = new Chart(document.getElementById('monthlyChart'), chartDefaults(MONTHS, mSeries, {decimals}));

  // Yearly chart
  destroyChart('yearly');
  const yy = yearlyValues(metric);
  charts['yearly'] = new Chart(document.getElementById('yearChart'), chartDefaults(yy.labels, [lineSeries(metric, yy.values, C.blue, {fill:true})], {decimals}));

  renderFinCharts();
}

/* ════════════════════════════════════════════
   FINANCE TAB
════════════════════════════════════════════ */
function finDataForYear(y) { return FINANCE_YEARLY.find(f=>f.y===Number(y)) || null; }

function renderFinKpis() {
  const y  = document.getElementById('yearSelect').value;
  const cy = document.getElementById('compareYearSelect').value;
  const compareActive = !!cy && cy !== y;
  const a  = finDataForYear(y);
  const b  = compareActive ? finDataForYear(cy) : null;
  if (!a) { document.getElementById('finKpiGrid').innerHTML=''; return; }

  function finCard(title, valA, valB, unit='k€', lowerBetter=false, decimals=2) {
    const v = valA!=null ? fmt(valA, decimals)+' '+unit : '—';
    const delta = (valA!=null && valB!=null) ? valA-valB : null;
    const trivial = delta!=null && Math.abs(delta)<0.01;
    const cls = trivial?'neutral' : delta==null?'neutral' : lowerBetter?(delta<=0?'good':'bad'):(delta>=0?'good':'bad');
    const dText = compareActive
      ? (delta==null ? `vs ${cy}: —`
        : trivial ? `~${(delta>=0?'+':'')+fmt(delta,decimals)} (≈same) vs ${cy}`
        : `${(delta>=0?'+':'')+fmt(delta,decimals)} vs ${cy}`)
      : 'Single year';
    return `<div class="fin-card">
      <div class="fin-title">${title} · ${y}</div>
      <div class="fin-value">${v}</div>
      <div class="fin-delta ${cls}" style="margin-top:6px">${dText}</div>
    </div>`;
  }

  document.getElementById('finKpiGrid').innerHTML =
    finCard('Income',          a.income, b?.income, 'k€', false) +
    finCard('Expenses DE',     a.expDE,  b?.expDE,  'k€', true)  +
    finCard('TR Payments',     a.tr,     b?.tr,      'k€', true);
}

function renderFinCharts() {
  const allY = FINANCE_YEARLY.map(f=>f.y);
  const yLabels = allY.map(String);

  // Income vs Expenses — all years
  destroyChart('finIncExp');
  const incExpOptions = {
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
  charts['finIncExp'] = new Chart(document.getElementById('finIncExpChart'), {
    type:'bar',
    data:{
      labels: yLabels,
      datasets:[
        { ...barSeries('Income k€',      FINANCE_YEARLY.map(f=>f.income), C.green)  },
        { ...barSeries('Expenses DE k€', FINANCE_YEARLY.map(f=>f.expDE),  C.red)    },
        { ...barSeries('TR Payments k€', FINANCE_YEARLY.map(f=>f.tr),     C.yellow) },
      ]
    },
    options: incExpOptions,
  });

  // Monthly 2026
  destroyChart('finMonthly');
  document.getElementById('finMonthlyTitle').textContent = '2026 — Monthly income & expenses (k€)';
  charts['finMonthly'] = new Chart(document.getElementById('finMonthlyChart'), {
    type:'bar',
    data:{
      labels: FINANCE_MONTHLY_2026.map(m=>m.label),
      datasets:[
        { ...barSeries('Income k€',      FINANCE_MONTHLY_2026.map(m=>m.income), C.green)  },
        { ...barSeries('Expenses DE k€', FINANCE_MONTHLY_2026.map(m=>m.expDE),  C.red)    },
        { ...barSeries('TR Payments k€', FINANCE_MONTHLY_2026.map(m=>m.tr),     C.yellow) },
      ]
    },
    options: incExpOptions,
  });
}

// Finance rendering is now part of renderDashboard() above.

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
function exportJson() {
  const data = getData();
  if (!data.length) return toast('No data to export','err');
  download(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}), `serkan-lt-v3-${todayISO()}.json`);
  toast('JSON exported','ok');
}
function download(blob, name) {
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click();
}

/* ════════════════════════════════════════════
   GOOGLE SHEETS  (via Google Apps Script web app)
════════════════════════════════════════════ */
async function appsScriptCall(method, body, timeoutMs = 25000) {
  const url = getSheetId(); // stores the Apps Script /exec URL
  if (!url) { toast('No Script URL configured','err'); return null; }
  updateSyncStatus('syncing');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const opts = { method, signal: controller.signal };
    if (method === 'POST') {
      opts.headers = { 'Content-Type': 'text/plain;charset=utf-8' }; // avoids CORS preflight on Apps Script
      opts.body = JSON.stringify(body);
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
  const resp = await appsScriptCall('POST', { mode: 'append', entry });
  if (resp) toast('Pushed to Sheets ✓', 'ok');
}

async function pullFromSheets() {
  const log = document.getElementById('sheetsLog');
  log.textContent = 'Pulling from Sheets…';
  const resp = await appsScriptCall('GET');
  if (!resp) { log.textContent = 'Pull failed.'; return; }
  try {
    const rows = (resp.rows || []).map(r => {
      ['prayTotal','reading','tv','movies','teeth','workout','sleep','weightKg','targetKg',
       'deltaKg','water','german','nutrition','bonusMalus','newScore','year','month','day']
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
  // First chunk replaces everything in the sheet; subsequent chunks append.
  let totalWritten = 0;
  for (let i = 0; i < chunks.length; i++) {
    const mode = i === 0 ? 'replaceAll' : 'appendBatch';
    log.textContent = `Pushing batch ${i+1}/${chunks.length} (${chunks[i].length} rows)…`;
    const resp = await appsScriptCall('POST', { mode, rows: chunks[i] }, 30000);
    if (!resp) { log.textContent = `✗ Failed at batch ${i+1}/${chunks.length}. ${totalWritten} rows written so far.`; return; }
    totalWritten += resp.written ?? chunks[i].length;
  }
  log.textContent = `✓ Pushed ${totalWritten} rows in ${chunks.length} batch(es).`;
  toast('All data pushed', 'ok');
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

  // Nav
  document.querySelectorAll('.nav-btn').forEach(b =>
    b.addEventListener('click', () => switchView(b.dataset.view)));

  // Dashboard controls
  ['yearSelect','compareYearSelect','metricSelect','monthSelect'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => renderDashboard());
  });

  // (Finance KPIs/charts now driven by the Dashboard's year/compare selectors above.)

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

  // Export / clear
  document.getElementById('exportCsv').addEventListener('click', exportCsv);
  document.getElementById('exportJson').addEventListener('click', exportJson);
  document.getElementById('clearAll').addEventListener('click', () => {
    if (!confirm('Clear ALL app data from this browser?')) return;
    localStorage.removeItem(STORAGE_KEY);
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

  // Boot
  ensureYearSelectors();
  updatePreview();
  updateSheetUI();
  loadSelectedDate();
  renderHistory();
});
