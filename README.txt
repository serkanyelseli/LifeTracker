Serkan Life Tracker V3.0
========================

WHAT'S NEW vs V2.7
-------------------

1. SCORE PREVIEW FIXED
   scorePreview() now includes Nutrition (+1/0.5/0/-0.5) and Bonus/Malus (+1/0/-0.5).
   The "Calculated New Score" in Daily Entry now matches your actual scoring table exactly.
   Score breakdown shows per-habit contributions inline (📖 📺 🦷 💪 😴 ⚖️ 💧 🇩🇪 🥗 ⭐).

2. NUTRITION + BONUS/MALUS FIELDS IN DAILY ENTRY
   Both fields are now in the form as dropdowns with the right score values.
   They are also included in CSV export/import.

3. CHART.JS REPLACES HAND-DRAWN CANVAS
   Interactive tooltips on hover, responsive sizing, proper legend.
   Average reference line preserved as a dashed series.

4. GOOGLE SHEETS INTEGRATION (new tab)
   - Paste your Sheet ID → "Push to Sheets" appears after saving a day
   - Pull latest Sheets data into the app (merge, no data loss)
   - Push all local data to Sheets in one go
   Uses the same MCP connection as the Claude.ai widgets.

5. DRAG-AND-DROP CSV IMPORT
   Drop your CSV directly onto the import zone — no file picker needed.

6. HISTORY IMPROVEMENTS
   - Type filter: All / Daily / Monthly AVG / Yearly AVG
   - Row count shown
   - Score columns colour-coded (green/red/grey)

7. JSON EXPORT
   New "Export JSON backup" button alongside CSV export.

8. SYNC STATUS INDICATOR
   Header shows green dot when Sheets is connected, animated yellow while syncing.

9. TOAST NOTIFICATIONS
   Non-blocking feedback for save, import, export, push, pull.


HOW TO USE GOOGLE SHEETS
--------------------------
1. Create a new Google Sheet at sheets.google.com
2. Copy the Sheet ID from the URL (the long string between /d/ and /edit)
3. Go to the "Google Sheets" tab in the app
4. Paste the Sheet ID and click Save
5. Click "Push all local data to Sheets" to seed it with your current data
6. From now on, after saving a daily entry, click "Push to Sheets" to sync

FOR IPHONE LOGGING — GOOGLE FORMS
-----------------------------------
1. Create a Google Form at forms.google.com
2. Add one question per habit: Prayer, Reading, TV, Movies, Teeth, Workout,
   Sleep, Weight, Water, German, Nutrition (dropdown), Bonus/Malus (dropdown)
3. In Form settings → Responses → Link to Spreadsheet → link to your same Sheet
4. Bookmark the Form URL in Safari → Share → Add to Home Screen
5. One-tap daily logging from your iPhone home screen!
   The app picks up new rows next time you "Pull from Sheets".

CSV COMPATIBILITY
------------------
All V2.x CSV imports still work. V3 adds Nutrition and Bonus/Malus to export
columns, which are simply blank for older imported rows.
