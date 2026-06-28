const express = require('express');
const router  = express.Router();
const path    = require('path');
const multer  = require('multer');
const auth    = require('../middleware/auth');
const { getCache, loadData, normalizeDate, setMockMode, setApiMode, getMode, setDataFile } = require('../utils/dataLoader');

router.use(auth);

// ─── File upload storage (/tmp on Vercel, uploads/ locally) ──────────────────
// __dirname = server/src/routes/ → ../../uploads = server/uploads/
const uploadDir = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, '../../uploads');
require('fs').mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, `data-${Date.now()}.xlsx`),
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.includes('spreadsheet') || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files allowed'), false);
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// ─── Settings endpoints ───────────────────────────────────────────────────────
router.get('/settings/mode', (req, res) => {
  res.json(getMode());
});

router.post('/settings/mode', (req, res) => {
  const { mockMode, apiMode, apiUrl } = req.body;
  if (typeof mockMode === 'boolean') setMockMode(mockMode);
  if (typeof apiMode  === 'boolean') setApiMode(apiMode, apiUrl || '');
  res.json({ ok: true, ...getMode() });
});

router.post('/settings/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  setDataFile(req.file.path);
  setMockMode(false);
  setApiMode(false, '');
  loadData();
  res.json({ ok: true, filename: req.file.originalname, path: req.file.path });
});

router.post('/settings/api-source', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });
  try {
    // Validate the URL is reachable
    const http = url.startsWith('https') ? require('https') : require('http');
    await new Promise((resolve, reject) => {
      const r = http.get(url, (resp) => { resp.resume(); resolve(); });
      r.setTimeout(5000, () => { r.destroy(); reject(new Error('Timeout')); });
      r.on('error', reject);
    });
    setApiMode(true, url);
    setMockMode(false);
    res.json({ ok: true, url });
  } catch (e) {
    res.status(400).json({ error: `Cannot reach ${url}: ${e.message}` });
  }
});

// ─── Date range helper ────────────────────────────────────────────────────────
function byDate(arr, from, to, field = 'submittedDate') {
  if (!from && !to) return arr;
  return arr.filter(r => {
    const d = r[field];
    if (!d) return false;
    if (from && d < from) return false;
    if (to   && d > to)   return false;
    return true;
  });
}

// ─── Stats / overview ─────────────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  const { from, to } = req.query;
  const cache = getCache();
  const registered = byDate(cache.registered, from, to, 'registrationDate');
  const drafts     = byDate(cache.drafts,     from, to);
  const applied    = byDate(cache.applied,    from, to);

  const allAppIds = new Set([...drafts.map(d => d.applicationId), ...applied.map(a => a.applicationId)]);
  const passportReady = [...drafts, ...applied].filter(d => d.hasPassport === 'Yes').length;
  const laptopReady   = [...drafts, ...applied].filter(d => d.hasLaptop  === 'Yes').length;
  const uniqueStates  = new Set([...drafts, ...applied].map(d => d.currentState).filter(s => s && s !== 'Not Specified'));

  res.json({
    totalRegistered: registered.length,
    totalDrafts:     drafts.length,
    totalApplied:    applied.length,
    totalUnique:     allAppIds.size,
    uniqueStates:    uniqueStates.size,
    conversionRate:  registered.length ? ((drafts.length / registered.length) * 100).toFixed(1) : 0,
    draftToApplied:  drafts.length     ? ((applied.length  / drafts.length)   * 100).toFixed(1) : 0,
    passportReady,
    laptopReady,
    lastUpdated: cache.lastUpdated,
  });
});

router.get('/funnel', (req, res) => {
  const { from, to } = req.query;
  const cache = getCache();
  const registered = byDate(cache.registered, from, to, 'registrationDate');
  const drafts     = byDate(cache.drafts,     from, to);
  const applied    = byDate(cache.applied,    from, to);
  res.json([
    { stage: 'Registered',    count: registered.length, color: '#0F62FE' },
    { stage: 'Draft Started', count: drafts.length,     color: '#0043CE' },
    { stage: 'Applied',       count: applied.length,    color: '#002D9C' },
  ]);
});

// ─── Draft-specific routes ────────────────────────────────────────────────────
router.get('/drafts', (req, res) => {
  const { page = 1, limit = 50, state, gender, category, employment, search, from, to } = req.query;
  let filtered = byDate(getCache().drafts, from, to);
  if (state && state !== 'all')      filtered = filtered.filter(d => d.currentState === state);
  if (gender && gender !== 'all')    filtered = filtered.filter(d => d.gender === gender);
  if (category && category !== 'all') filtered = filtered.filter(d => d.category === category);
  if (employment && employment !== 'all') filtered = filtered.filter(d => d.employmentStatus === employment);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(d =>
      d.name?.toLowerCase().includes(q) ||
      d.email?.toLowerCase().includes(q) ||
      d.applicationId?.toLowerCase().includes(q) ||
      d.currentDistrict?.toLowerCase().includes(q)
    );
  }

  const total   = filtered.length;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const data    = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);
  res.json({ data, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) });
});

// ─── Draft missing-data analysis  (powers the Draft tab) ─────────────────────
router.get('/draft-analysis', (req, res) => {
  const { drafts } = getCache();
  const total = drafts.length;
  if (!total) return res.json({ total: 0, fields: [], completenessDistribution: [] });

  const isEmpty = v => {
    if (v === null || v === undefined) return true;
    const s = String(v).trim();
    return s === '' || s === '-' || s === 'Not Specified' || s === 'NA' || s === 'N/A' || s === 'No Data' || s === 'Not Available';
  };

  // Key parameters with importance (1=critical, 2=important, 3=useful)
  const PARAMS = [
    { key: 'gender',              label: 'Gender',              group: 'Identity',    importance: 1 },
    { key: 'dateOfBirth',         label: 'Date of Birth',       group: 'Identity',    importance: 1 },
    { key: 'category',            label: 'Category (OBC/SC…)',  group: 'Identity',    importance: 1 },
    { key: 'currentState',        label: 'Current State',       group: 'Location',    importance: 1 },
    { key: 'currentDistrict',     label: 'Current District',    group: 'Location',    importance: 2 },
    { key: 'permanentRegion',     label: 'Permanent Region',    group: 'Location',    importance: 2 },
    { key: 'employmentStatus',    label: 'Employment Status',   group: 'Background',  importance: 1 },
    { key: 'familyAnnualIncome',  label: 'Family Income',       group: 'Background',  importance: 1 },
    { key: 'educationStatus',     label: 'Education Status',    group: 'Academics',   importance: 1 },
    { key: 'studiedPME',          label: 'Physics/Maths/English (12th)', group: 'Academics', importance: 1 },
    { key: 'physicsScore',        label: 'Physics Score (12th)', group: 'Academics',  importance: 2 },
    { key: 'mathsScore',          label: 'Maths Score (12th)',   group: 'Academics',  importance: 2 },
    { key: 'englishScore',        label: 'English Score (12th)', group: 'Academics',  importance: 2 },
    { key: 'hasPassport',         label: 'Passport',             group: 'Documents',  importance: 1 },
    { key: 'hasLaptop',           label: 'Laptop Access',        group: 'Documents',  importance: 2 },
    { key: 'height',              label: 'Height (cm)',           group: 'Medical',    importance: 2 },
    { key: 'weight',              label: 'Weight (kg)',           group: 'Medical',    importance: 2 },
    { key: 'wearSpectacles',      label: 'Spectacles',           group: 'Medical',    importance: 3 },
    { key: 'chronicCondition',    label: 'Chronic Condition',    group: 'Medical',    importance: 2 },
    { key: 'dgcaMedical',         label: 'DGCA Medical Class 2', group: 'DGCA',       importance: 1 },
    { key: 'dgcaComputer',        label: 'DGCA Computer No.',    group: 'DGCA',       importance: 1 },
  ];

  // For passport/laptop: "No" is a valid answer, "No" not missing. Only truly blank is missing.
  const isReallyEmpty = (r, key) => {
    const v = r[key];
    // Yes/No fields: only blank counts as missing, not "No"
    if (key === 'hasPassport' || key === 'hasLaptop' || key === 'wearSpectacles' || key === 'studiedPME')
      return !v || v === '' || v === 'Not Specified' || v === '-';
    // Category: General is a valid answer; only truly blank is missing
    if (key === 'category') return !v || v === '' || v === '-';
    return isEmpty(v);
  };

  const fields = PARAMS.map(p => {
    const missing = drafts.filter(r => isReallyEmpty(r, p.key)).length;
    const filled  = total - missing;
    return {
      ...p,
      filled,
      missing,
      filledPct:  Math.round((filled / total) * 100),
      missingPct: Math.round((missing / total) * 100),
    };
  }).sort((a, b) => a.importance - b.importance || b.missing - a.missing);

  // Completeness score per record (count of critical fields filled / total critical)
  const criticalKeys = PARAMS.filter(p => p.importance === 1).map(p => p.key);
  const completeness = drafts.map(r => {
    const filled = criticalKeys.filter(k => !isReallyEmpty(r, k)).length;
    return Math.round((filled / criticalKeys.length) * 100);
  });

  // Distribution buckets: 0-25, 26-50, 51-75, 76-100
  const buckets = [
    { range: '0–25%',  count: completeness.filter(c => c <= 25).length },
    { range: '26–50%', count: completeness.filter(c => c > 25 && c <= 50).length },
    { range: '51–75%', count: completeness.filter(c => c > 50 && c <= 75).length },
    { range: '76–100%',count: completeness.filter(c => c > 75).length },
  ];

  // Group summary
  const groupMap = {};
  fields.forEach(f => {
    if (!groupMap[f.group]) groupMap[f.group] = { group: f.group, fields: 0, totalMissing: 0 };
    groupMap[f.group].fields++;
    groupMap[f.group].totalMissing += f.missing;
  });

  res.json({
    total,
    fields,
    completenessDistribution: buckets,
    groups: Object.values(groupMap),
    avgCompleteness: Math.round(completeness.reduce((a, b) => a + b, 0) / completeness.length),
  });
});

// ─── Applied routes ───────────────────────────────────────────────────────────
router.get('/applied', (req, res) => {
  const { page = 1, limit = 50, state, gender, search, from, to } = req.query;
  let filtered = byDate(getCache().applied, from, to);
  if (state && state !== 'all')   filtered = filtered.filter(d => d.currentState === state);
  if (gender && gender !== 'all') filtered = filtered.filter(d => d.gender === gender);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(d =>
      d.name?.toLowerCase().includes(q) ||
      d.email?.toLowerCase().includes(q) ||
      d.applicationId?.toLowerCase().includes(q)
    );
  }

  const total   = filtered.length;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const data    = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);
  res.json({ data, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) });
});

// ─── Registered routes ────────────────────────────────────────────────────────
router.get('/registered', (req, res) => {
  const { page = 1, limit = 50, search, from, to } = req.query;
  let filtered = byDate(getCache().registered, from, to, 'registrationDate');
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(r =>
      r.name?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.uniqueId?.toLowerCase().includes(q)
    );
  }

  const total   = filtered.length;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const data    = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);
  res.json({ data, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) });
});

// ─── Filter options ───────────────────────────────────────────────────────────
router.get('/filters', (req, res) => {
  const { drafts, applied } = getCache();
  const all = [...drafts, ...applied];
  const states     = [...new Set(all.map(d => d.currentState).filter(s => s && s !== 'Not Specified'))].sort();
  const genders    = [...new Set(all.map(d => d.gender).filter(Boolean))].sort();
  const categories = [...new Set(all.map(d => d.category).filter(Boolean))].sort();
  const employment = [...new Set(all.map(d => d.employmentStatus).filter(s => s && s !== 'Not Specified'))].sort();
  res.json({ states, genders, categories, employment });
});

// ─── Export CSV ───────────────────────────────────────────────────────────────
router.get('/export', (req, res) => {
  const { registered, drafts, applied, calling } = getCache();
  const { type = 'drafts' } = req.query;
  const dataMap = { registered, drafts, applied, calling };
  const data = dataMap[type] || drafts;

  if (!data.length) return res.status(404).json({ error: 'No data' });

  const keys = Object.keys(data[0]);
  const csv  = [
    keys.join(','),
    ...data.map(row =>
      keys.map(k => {
        const v = String(row[k] ?? '');
        return v.includes(',') || v.includes('"') || v.includes('\n')
          ? `"${v.replace(/"/g, '""')}"` : v;
      }).join(',')
    ),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${type}_${new Date().toISOString().split('T')[0]}.csv"`);
  res.send(csv);
});

// ─── Analytics: combined view (dedup by email — applied wins) ─────────────────
const STATE_TO_REGION = {
  'Punjab':'Northern India','Haryana':'Northern India','Himachal Pradesh':'Northern India',
  'Uttarakhand':'Northern India','Uttar Pradesh':'Northern India','Rajasthan':'Northern India',
  'Delhi':'Northern India','Jammu And Kashmir':'Northern India','Ladakh':'Northern India',
  'Chandigarh':'Northern India',
  'Tamil Nadu':'Southern India','Kerala':'Southern India','Karnataka':'Southern India',
  'Andhra Pradesh':'Southern India','Telangana':'Southern India','Puducherry':'Southern India',
  'Maharashtra':'Western India','Gujarat':'Western India','Goa':'Western India',
  'West Bengal':'Eastern India','Odisha':'Eastern India','Bihar':'Eastern India',
  'Jharkhand':'Eastern India',
  'Madhya Pradesh':'Central India','Chhattisgarh':'Central India',
  'Assam':'Northeast India','Manipur':'Northeast India','Meghalaya':'Northeast India',
  'Mizoram':'Northeast India','Nagaland':'Northeast India','Tripura':'Northeast India',
  'Arunachal Pradesh':'Northeast India','Sikkim':'Northeast India',
};

function getCombined() {
  const { drafts, applied } = getCache();

  // Dedup: if same email exists in both, applied (complete) wins
  const appliedEmails = new Set(applied.map(a => a.email).filter(e => e && e.includes('@')));
  const dedupedDrafts = drafts.filter(d =>
    !d.email || !d.email.includes('@') || !appliedEmails.has(d.email)
  );

  const draftRows   = dedupedDrafts.map(d => ({ ...d, applicationType: 'Draft',    submittedDate: d.submittedDate }));
  const appliedRows = applied.map(a =>       ({ ...a, applicationType: 'Complete', submittedDate: a.submittedDate }));

  return [...draftRows, ...appliedRows];
}

function crossTab(arr, valFn, typeFn) {
  const out = {};
  arr.forEach(r => {
    const v = valFn(r) || 'Not Specified';
    const t = typeFn(r);
    if (!out[v]) out[v] = { label: v, Draft: 0, Complete: 0, Total: 0 };
    out[v][t]++;
    out[v].Total++;
  });
  return Object.values(out).sort((a, b) => b.Total - a.Total);
}

const appType = r => r.applicationType === 'Complete' ? 'Complete' : 'Draft';

router.get('/date-wise', (req, res) => {
  const { from, to } = req.query;
  const combined = byDate(getCombined(), from, to);
  const byDate = {};
  combined.forEach(a => {
    const date = normalizeDate(a.submittedDate);
    if (!date) return;
    if (!byDate[date]) byDate[date] = { date, draft: 0, complete: 0, total: 0 };
    if (a.applicationType === 'Complete') byDate[date].complete++;
    else byDate[date].draft++;
    byDate[date].total++;
  });
  res.json(Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)));
});

// Normalize uppercase state names to title case for region lookup
function toTitleCase(s) {
  if (!s) return s;
  return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

router.get('/region-wise', (req, res) => {
  const { from, to } = req.query;
  const combined = byDate(getCombined(), from, to);
  const byRegion = {};
  combined.forEach(a => {
    const normalized = toTitleCase(a.currentState);
    const region = STATE_TO_REGION[normalized] || STATE_TO_REGION[a.currentState] ||
      (a.permanentRegion && a.permanentRegion !== 'Not Specified' ? a.permanentRegion : 'Other');
    if (!byRegion[region]) byRegion[region] = { region, draft: 0, complete: 0, total: 0 };
    if (a.applicationType === 'Complete') byRegion[region].complete++;
    else byRegion[region].draft++;
    byRegion[region].total++;
  });
  const order = ['Southern India','Northern India','Western India','Eastern India','Central India','Northeast India','Other'];
  res.json(Object.values(byRegion).sort((a, b) => {
    const ai = order.indexOf(a.region), bi = order.indexOf(b.region);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  }));
});

router.get('/state-breakdown', (req, res) => {
  const { from, to } = req.query;
  const combined = byDate(getCombined(), from, to);
  const byState = {};
  combined.forEach(a => {
    const state = (a.currentState || '').trim();
    if (!state || state === 'Not Specified' || state === '-') return;
    if (!byState[state]) byState[state] = { state, draft: 0, complete: 0, total: 0 };
    if (a.applicationType === 'Complete') byState[state].complete++;
    else byState[state].draft++;
    byState[state].total++;
  });
  res.json(Object.values(byState).sort((a, b) => b.total - a.total).slice(0, 25));
});

router.get('/district-wise', (req, res) => {
  const { from, to, state: stateFilter = '' } = req.query;
  const combined = byDate(getCombined(), from, to);
  const byDist = {};
  combined.forEach(a => {
    if (stateFilter && a.currentState !== stateFilter) return;
    const dist = (a.currentDistrict || '').trim();
    if (!dist || dist === 'Not Specified' || dist === '-') return;
    const key = `${a.currentState}|${dist}`;
    if (!byDist[key]) byDist[key] = { state: a.currentState, district: dist, draft: 0, complete: 0, total: 0 };
    if (a.applicationType === 'Complete') byDist[key].complete++;
    else byDist[key].draft++;
    byDist[key].total++;
  });
  res.json(Object.values(byDist).sort((a, b) => b.total - a.total).slice(0, 30));
});

router.get('/dgca-medical', (req, res) => {
  const { from, to } = req.query;
  const combined = byDate(getCombined(), from, to);
  const complete  = combined.filter(r => r.applicationType === 'Complete');
  const statusMap = {};
  complete.forEach(r => { const v = r.dgcaMedical||'No Data'; statusMap[v]=(statusMap[v]||0)+1; });
  const incomeMap = {};
  complete.forEach(r => {
    const v = r.familyIncome||''; if (v.includes('Lakh')||v.includes('lakh')) incomeMap[v]=(incomeMap[v]||0)+1;
  });
  res.json({
    status: Object.entries(statusMap).map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count),
    income: Object.entries(incomeMap).map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count),
    totalComplete: complete.length,
    totalApplicants: combined.length,
  });
});

router.get('/dgca-computer', (req, res) => {
  const { from, to } = req.query;
  const combined = byDate(getCombined(), from, to);
  const clean = combined.filter(r => ['Yes','No','No Data'].includes(r.dgcaComputer));
  const summary = {};
  clean.forEach(r => { summary[r.dgcaComputer]=(summary[r.dgcaComputer]||0)+1; });
  res.json({ breakdown: crossTab(clean, r=>r.dgcaComputer, appType), summary });
});

router.get('/employment-status', (req, res) => {
  const { from, to } = req.query;
  const combined = byDate(getCombined(), from, to);
  const clean = combined.filter(r => ['Student','Employed','Unemployed'].includes(r.employmentStatus));
  res.json(crossTab(clean, r=>r.employmentStatus, appType));
});

router.get('/education-status', (req, res) => {
  const { from, to } = req.query;
  const combined = byDate(getCombined(), from, to);
  const clean = combined.filter(r => r.educationStatus && (r.educationStatus.includes('Complet')||r.educationStatus.includes('Pursuing')));
  const normalized = clean.map(r => ({
    ...r,
    educationStatus: r.educationStatus.toLowerCase().includes('complet') ? 'Completed' : 'Pursuing',
  }));
  res.json(crossTab(normalized, r=>r.educationStatus, appType));
});

router.get('/gender-breakdown', (req, res) => {
  const { from, to } = req.query;
  const combined = byDate(getCombined(), from, to);
  const clean = combined.filter(r => ['Male','Female','Other'].includes(r.gender));
  res.json(crossTab(clean, r=>r.gender, appType));
});

router.get('/category-breakdown', (req, res) => {
  const { from, to } = req.query;
  const combined = byDate(getCombined(), from, to);
  res.json(crossTab(combined, r=>r.category||'General', appType));
});

router.get('/passport-status', (req, res) => {
  const { from, to } = req.query;
  const combined = byDate(getCombined(), from, to);
  const clean = combined.filter(r => r.hasPassport);
  res.json(crossTab(clean, r=>(r.hasPassport==='Yes'?'Has Passport':'No Passport'), appType));
});

// ─── Issue resolution ─────────────────────────────────────────────────────────
router.get('/issue-resolution', (req, res) => {
  const { calling } = getCache();
  const rows = {};
  calling.filter(c => c.issueCategory).forEach(c => {
    const cat = c.issueCategory;
    if (!rows[cat]) rows[cat] = { category: cat, Resolved: 0, Pending: 0, Total: 0 };
    if (c.queryStatus === 'Resolved') rows[cat].Resolved++;
    else if (c.queryStatus === 'Pending') rows[cat].Pending++;
    rows[cat].Total++;
  });
  const overall = { Resolved:0, Pending:0, NotTracked:0, Total: calling.length };
  calling.forEach(c => {
    if (c.queryStatus === 'Resolved') overall.Resolved++;
    else if (c.queryStatus === 'Pending') overall.Pending++;
    else overall.NotTracked++;
  });
  res.json({ byCategory: Object.values(rows).sort((a,b)=>b.Total-a.Total), overall });
});

// ─── Calling routes ───────────────────────────────────────────────────────────
router.get('/calling-summary', (req, res) => {
  const { calling } = getCache();
  const s = { total: calling.length, called:0, dnp:0, wrongNumber:0, notCalled:0, switchOff:0, resolved:0, pending:0 };
  calling.forEach(c => {
    const cs = (c.callStatus||'').toLowerCase();
    if (cs==='called') s.called++;
    else if (cs==='dnp') s.dnp++;
    else if (cs==='wrong number') s.wrongNumber++;
    else if (cs==='switch off') s.switchOff++;
    else s.notCalled++;
    if (c.queryStatus==='Resolved') s.resolved++;
    else if (c.queryStatus==='Pending') s.pending++;
  });
  s.reachedRate    = s.total  ? ((s.called/s.total)*100).toFixed(1)   : 0;
  s.resolutionRate = s.called ? ((s.resolved/s.called)*100).toFixed(1) : 0;
  res.json(s);
});

router.get('/calling-agents', (req, res) => {
  const { calling } = getCache();
  const agents = {};
  calling.forEach(c => {
    const agent = c.assignedMember || 'Unassigned';
    if (!agents[agent]) agents[agent] = { agent, total:0, called:0, dnp:0, notCalled:0, resolved:0, pending:0 };
    const a = agents[agent];
    a.total++;
    const cs = (c.callStatus||'').toLowerCase();
    if (cs==='called') a.called++; else if (cs==='dnp') a.dnp++; else a.notCalled++;
    if (c.queryStatus==='Resolved') a.resolved++; else if (c.queryStatus==='Pending') a.pending++;
  });
  res.json(Object.values(agents).map(a=>({...a, reachRate:a.total?((a.called/a.total)*100).toFixed(0):0})).sort((a,b)=>b.total-a.total));
});

router.get('/calling-issues', (req, res) => {
  const { calling } = getCache();
  const counts = {};
  calling.forEach(c => { const i=c.issueCategory||'No Issue'; if (i) counts[i]=(counts[i]||0)+1; });
  res.json(Object.entries(counts).map(([category,count])=>({category,count})).sort((a,b)=>b.count-a.count));
});

router.get('/calling-status-dist', (req, res) => {
  const { calling } = getCache();
  const counts = {};
  calling.forEach(c => { const s=c.callStatus||'Not Called'; counts[s]=(counts[s]||0)+1; });
  res.json(Object.entries(counts).map(([status,count])=>({status,count})).sort((a,b)=>b.count-a.count));
});

router.get('/calling', (req, res) => {
  const { calling } = getCache();
  const { page=1, limit=50, agent, callStatus, queryStatus, search } = req.query;

  let f = calling;
  if (agent && agent!=='all')           f=f.filter(c=>c.assignedMember===agent);
  if (callStatus && callStatus!=='all') f=f.filter(c=>c.callStatus===callStatus);
  if (queryStatus && queryStatus!=='all') f=f.filter(c=>c.queryStatus===queryStatus);
  if (search) {
    const q=search.toLowerCase();
    f=f.filter(c=>c.name?.toLowerCase().includes(q)||c.email?.toLowerCase().includes(q)||c.remark?.toLowerCase().includes(q));
  }

  const total=f.length, pageNum=parseInt(page), limitNum=parseInt(limit);
  res.json({ data:f.slice((pageNum-1)*limitNum, pageNum*limitNum), total, page:pageNum, limit:limitNum, pages:Math.ceil(total/limitNum) });
});

// ─── Data reload ──────────────────────────────────────────────────────────────
router.post('/reload', (req, res) => {
  loadData();
  const { registered, drafts, applied, lastUpdated } = getCache();
  res.json({ message:'Data reloaded', registered:registered.length, drafts:drafts.length, applied:applied.length, lastUpdated });
});

module.exports = router;
