/* ═══════════════════════════════════════════════════════
   Serkan Life Tracker — Google Apps Script bridge
   Deploy this as a Web App to connect your hosted app
   directly to this Google Sheet. No API key needed.

   Supports two tabs:
   - "Log"     — daily habit entries
   - "Finance" — monthly finance entries
   The client picks which one via body.tab (POST) or ?tab= (GET).
═══════════════════════════════════════════════════════ */

const LOG_TAB_NAME = 'Log';
const FIN_TAB_NAME = 'Finance';

const LOG_HEADERS = ['type','label','date','year','month','day','prayTotal',
  'prayS','prayO','prayIk','prayAk','prayY','prayNf','prayT',
  'reading','tv','movies','teeth','workout','sleep','weightKg','targetKg','deltaKg','water','german',
  'nutrition','bonusMalus','newScore','highlights'];

const FIN_HEADERS = ['type','month','year','monthNum','income','allowanceIncome','expDE','expTR',
  'expHousehold','expSeko','expCiko','expYaz','expPotisko','expTransport','expGrocery','expEatOut','expOthers',
  'trAidat','trElektrik','trSu','trDogalgaz','trInternet','trMomVarious',
  'trEmlakVergisi','trGoogle','trSpotify','trYoutube','trAmazonTR','trOthersVarious','notes'];

function getTabConfig_(tabName) {
  if (tabName === FIN_TAB_NAME) return { name: FIN_TAB_NAME, headers: FIN_HEADERS, keyField: 'month' };
  return { name: LOG_TAB_NAME, headers: LOG_HEADERS, keyField: 'date' };
}

function getSheet_(tabName) {
  const cfg = getTabConfig_(tabName);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(cfg.name);
  if (!sheet) {
    sheet = ss.insertSheet(cfg.name);
    sheet.appendRow(cfg.headers);
    return sheet;
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(cfg.headers);
    return sheet;
  }
  // Migrate: append any headers missing from the live sheet (e.g. newly added fields).
  // Existing data and columns are left untouched.
  const lastCol = sheet.getLastColumn();
  const existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  const missing = cfg.headers.filter(h => existingHeaders.indexOf(h) === -1);
  if (missing.length) {
    sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
  }
  return sheet;
}

/** Returns the sheet's actual current header order (post-migration). */
function getActiveHeaders_(sheet) {
  const lastCol = sheet.getLastColumn();
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
}

/* ── GET: pull all rows as JSON. Use ?tab=Finance for the finance tab. ── */
function doGet(e) {
  try {
    const tabName = (e && e.parameter && e.parameter.tab) || LOG_TAB_NAME;
    const since   = (e && e.parameter && e.parameter.since) || null;
    const latest  = (e && e.parameter && e.parameter.latest) || null;
    const sheet   = getSheet_(tabName);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      if (latest) return jsonResponse_({ ok: true, latest: '' });
      return jsonResponse_({ ok: true, rows: [] });
    }

    const lastCol    = sheet.getLastColumn();
    const headerRow  = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const dateColIdx = headerRow.indexOf('date');
    const monthColIdx= headerRow.indexOf('month');

    // "latest" probe: return just the max date (Log) or month (Finance).
    // Reads only the key column, not the whole sheet — very fast.
    if (latest) {
      const keyIdx = dateColIdx >= 0 ? dateColIdx : monthColIdx;
      if (keyIdx < 0) return jsonResponse_({ ok: true, latest: '' });
      const keyVals = sheet.getRange(2, keyIdx + 1, lastRow - 1, 1).getValues();
      let maxKey = '';
      for (let i = 0; i < keyVals.length; i++) {
        let v = keyVals[i][0];
        if (v instanceof Date) v = normalizeDateStr_(v);
        v = String(v || '');
        if (v > maxKey) maxKey = v;
      }
      return jsonResponse_({ ok: true, latest: maxKey });
    }

    // If since is provided, find the first row to read using binary search
    // This avoids loading the entire sheet into memory
    let startRow = 2;
    if (since && (dateColIdx >= 0 || monthColIdx >= 0)) {
      const keyColIdx = dateColIdx >= 0 ? dateColIdx : monthColIdx;
      // Binary search for first row where key > since
      let lo = 2, hi = lastRow;
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        let v = sheet.getRange(mid, keyColIdx + 1).getValue();
        if (v instanceof Date) v = normalizeDateStr_(v);
        v = String(v || '');
        if (v <= since) lo = mid + 1;
        else hi = mid;
      }
      startRow = lo;
    }

    // Only read the rows we actually need
    if (startRow > lastRow) return jsonResponse_({ ok: true, rows: [] });

    const dataRows = sheet.getRange(startRow, 1, lastRow - startRow + 1, lastCol).getValues();

    const rows = dataRows.map(r => {
      const obj = {};
      headerRow.forEach((h, i) => {
        let v = r[i];
        if (i === dateColIdx && dateColIdx >= 0) v = normalizeDateStr_(v);
        obj[h] = v === '' ? null : v;
      });
      return obj;
    }).filter(obj => {
      if (!since) return true;
      if (dateColIdx  >= 0 && obj.date)  return String(obj.date)  > since;
      if (monthColIdx >= 0 && obj.month) return String(obj.month) > since;
      return true;
    });

    return jsonResponse_({ ok: true, rows });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  }
}

/* ── POST: append one row, append a batch, or replace all rows.
   body.tab selects "Log" (default) or "Finance". As a safety net, if the
   client forgets to send tab but the row's own "type" field clearly belongs
   to Finance (e.g. "daily-fin"), it's routed there automatically. ── */
function inferTabFromEntry_(body) {
  if (body.tab) return body.tab;
  const t = (body.entry && body.entry.type) || (body.rows && body.rows[0] && body.rows[0].type) || '';
  if (t === 'daily-fin' || t === 'monthly' || t === 'yearly') {
    // 'monthly'/'yearly' are ambiguous (used for both habit-year seeds and finance
    // seeds), but daily-fin is unambiguous — only Finance entries use it.
    if (t === 'daily-fin') return FIN_TAB_NAME;
  }
  return LOG_TAB_NAME;
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const tabName = inferTabFromEntry_(body);
    const cfg = getTabConfig_(tabName);
    const sheet = getSheet_(tabName);
    const cols = getActiveHeaders_(sheet); // live column order, post-migration

    if (body.mode === 'replaceAll') {
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
      if (body.rows && body.rows.length) {
        const values = body.rows.map(r => cols.map(h => r[h] ?? ''));
        sheet.getRange(2, 1, values.length, cols.length).setValues(values);
      }
      return jsonResponse_({ ok: true, written: (body.rows || []).length });
    }

    if (body.mode === 'appendBatch') {
      if (body.rows && body.rows.length) {
        const values = body.rows.map(r => cols.map(h => r[h] ?? ''));
        const startRow = sheet.getLastRow() + 1;
        sheet.getRange(startRow, 1, values.length, cols.length).setValues(values);
      }
      return jsonResponse_({ ok: true, written: (body.rows || []).length });
    }

    if (body.mode === 'append') {
      const row = cols.map(h => body.entry[h] ?? '');
      const keyField = cfg.keyField; // 'date' for Log, 'month' for Finance
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        const lastCol = sheet.getLastColumn();
        const dataRows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
        const typeIdx = cols.indexOf('type');
        const keyIdx = cols.indexOf(keyField);
        const labelIdx = cols.indexOf('label'); // only present on Log tab
        const targetKey = keyField === 'date' ? normalizeDateStr_(body.entry[keyField]) : String(body.entry[keyField] || '');
        for (let i = 0; i < dataRows.length; i++) {
          const rowKey = keyField === 'date' ? normalizeDateStr_(dataRows[i][keyIdx]) : String(dataRows[i][keyIdx] || '');
          const labelMatch = labelIdx < 0 || String(dataRows[i][labelIdx] || '') === String(body.entry.label || '');
          if (String(dataRows[i][typeIdx]) === String(body.entry.type) && rowKey === targetKey && labelMatch) {
            sheet.getRange(i + 2, 1, 1, cols.length).setValues([row]);
            return jsonResponse_({ ok: true, updated: true, row: i + 2 });
          }
        }
      }
      sheet.appendRow(row);
      return jsonResponse_({ ok: true, appended: true });
    }

    return jsonResponse_({ ok: false, error: 'Unknown mode: ' + body.mode });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  }
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Normalizes a date cell value — whether it's already "YYYY-MM-DD" text or a
 *  Date object Sheets auto-converted it to — into a plain "YYYY-MM-DD" string
 *  using the spreadsheet's own timezone, so comparisons are reliable. */
function normalizeDateStr_(val) {
  if (val instanceof Date) {
    return Utilities.formatDate(val, SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), 'yyyy-MM-dd');
  }
  return String(val || '').trim();
}
