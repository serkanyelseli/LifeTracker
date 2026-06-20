/* ═══════════════════════════════════════════════════════
   Serkan Life Tracker — Google Apps Script bridge
   Deploy this as a Web App to connect your hosted app
   directly to this Google Sheet. No API key needed.
═══════════════════════════════════════════════════════ */

const SHEET_TAB_NAME = 'Log';
const HEADERS = ['type','label','date','year','month','day','prayTotal','reading','tv',
  'movies','teeth','workout','sleep','weightKg','targetKg','deltaKg','water','german',
  'nutrition','bonusMalus','newScore','highlights'];

function getLogSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_TAB_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_TAB_NAME);
    sheet.appendRow(HEADERS);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  }
  return sheet;
}

/* ── GET: pull all rows as JSON ── */
function doGet(e) {
  try {
    const sheet = getLogSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return jsonResponse_({ ok: true, rows: [] });

    const lastCol = sheet.getLastColumn();
    const headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const dataRows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

    const rows = dataRows.map(r => {
      const obj = {};
      headerRow.forEach((h, i) => { obj[h] = r[i] === '' ? null : r[i]; });
      return obj;
    });

    return jsonResponse_({ ok: true, rows });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  }
}

/* ── POST: append one row, or replace all rows ── */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const sheet = getLogSheet_();

    if (body.mode === 'replaceAll') {
      // Clear everything except header, then write all rows
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
      if (body.rows && body.rows.length) {
        const values = body.rows.map(r => HEADERS.map(h => r[h] ?? ''));
        sheet.getRange(2, 1, values.length, HEADERS.length).setValues(values);
      }
      return jsonResponse_({ ok: true, written: (body.rows || []).length });
    }

    if (body.mode === 'append') {
      const row = HEADERS.map(h => body.entry[h] ?? '');
      // Check if a row with same type+date+label already exists — if so, update it instead of duplicating
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        const lastCol = sheet.getLastColumn();
        const dataRows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
        const typeIdx = HEADERS.indexOf('type');
        const dateIdx = HEADERS.indexOf('date');
        const labelIdx = HEADERS.indexOf('label');
        for (let i = 0; i < dataRows.length; i++) {
          if (dataRows[i][typeIdx] === body.entry.type &&
              dataRows[i][dateIdx] === body.entry.date &&
              (dataRows[i][labelIdx] || '') === (body.entry.label || '')) {
            sheet.getRange(i + 2, 1, 1, HEADERS.length).setValues([row]);
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
