const fs   = require('fs');
const path = require('path');

// Stored alongside the data files — persists between server restarts
const FILLS_FILE = path.join(__dirname, '../../../ai_fills.json');

function loadFills() {
  if (!fs.existsSync(FILLS_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(FILLS_FILE, 'utf8')); }
  catch { return {}; }
}

function saveFills(fills) {
  fs.writeFileSync(FILLS_FILE, JSON.stringify(fills, null, 2));
}

// Merge AI fills into a list of records (non-destructive — original values win if present)
function applyFills(records) {
  const fills = loadFills();
  return records.map(r => {
    const patch = fills[r.applicationId];
    if (!patch) return r;
    const merged = { ...r };
    for (const [k, v] of Object.entries(patch)) {
      if (k === '_meta') continue;
      // Only overwrite if the original value is genuinely missing
      const orig = r[k];
      if (!orig || orig === 'Not Specified' || orig === '-' || orig === '') {
        merged[k] = v;
        merged._aiEnriched = true;
      }
    }
    return merged;
  });
}

// Count how many records are missing each key field (after fills applied)
function missingCounts(combined) {
  const isEmpty = v => !v || v === 'Not Specified' || v === '-' || v === '';
  return {
    currentState:     combined.filter(r => isEmpty(r.currentState)).length,
    employmentStatus: combined.filter(r => isEmpty(r.employmentStatus) || !['Student','Employed','Unemployed'].includes(r.employmentStatus)).length,
    gender:           combined.filter(r => isEmpty(r.gender) || !['Male','Female','Other'].includes(r.gender)).length,
  };
}

module.exports = { loadFills, saveFills, applyFills, missingCounts };
