require('dotenv').config();
const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const auth = require('../middleware/auth');
const { getCache } = require('../utils/dataLoader');
const { loadFills, saveFills, applyFills, missingCounts } = require('../utils/aiFills');
const { getStatus: getEnrichStatus } = require('../utils/enrichment');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

router.use(auth);

// ─── Build live data context for system prompt ────────────────────────────────
function buildContext() {
  const { registered, drafts, applied, calling } = getCache();
  const total = drafts.length + applied.length;

  // State counts (combined)
  const stateMap = {};
  [...drafts, ...applied].forEach(r => {
    const s = r.currentState;
    if (s && s !== 'Not Specified' && s !== '-') stateMap[s] = (stateMap[s] || 0) + 1;
  });
  const topStates = Object.entries(stateMap).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // Employment (combined)
  const empMap = {};
  [...drafts, ...applied].forEach(r => {
    const e = r.employmentStatus;
    if (['Student', 'Employed', 'Unemployed'].includes(e)) empMap[e] = (empMap[e] || 0) + 1;
  });

  // Gender (drafts)
  const genderMap = {};
  drafts.forEach(r => { const g = r.gender || 'Not Specified'; genderMap[g] = (genderMap[g] || 0) + 1; });

  // Calling summary
  const resolved  = calling.filter(c => c.queryStatus === 'Resolved').length;
  const pending   = calling.filter(c => c.queryStatus === 'Pending').length;
  const notCalled = calling.filter(c => c.callStatus === 'Not Called').length;
  const dnp       = calling.filter(c => c.callStatus === 'DNP').length;

  // DGCA (applied only)
  const medYes = applied.filter(a => a.dgcaMedical === 'Yes').length;
  const medNo  = applied.filter(a => a.dgcaMedical === 'No').length;
  const compYes = applied.filter(a => a.dgcaComputer === 'Yes').length;

  return `
PROGRAMME: IndiGo "Giving Wings to Fly" CPL Pilot Scholarship 2026 — managed by BharatCares / SMEC Trust.
Data is from three live sources: registed.csv (registrations), Draft.csv (draft applications), applied.xlsx (submitted applications).

FUNNEL:
  Registered:  ${registered.length}
  Draft started: ${drafts.length}  (${registered.length ? ((drafts.length / registered.length) * 100).toFixed(1) : 0}% of registered)
  Submitted:   ${applied.length}  (${drafts.length ? ((applied.length / drafts.length) * 100).toFixed(1) : 0}% of drafts)
  Total in pipeline: ${total}

TOP STATES:
${topStates.map(([s, c], i) => `  ${i + 1}. ${s}: ${c}`).join('\n')}

EMPLOYMENT:
${Object.entries(empMap).map(([k, v]) => `  ${k}: ${v}`).join('\n')}

GENDER (draft applicants):
${Object.entries(genderMap).filter(([k]) => k !== 'Not Specified').map(([k, v]) => `  ${k}: ${v}`).join('\n')}

DGCA (complete submissions):
  Medical Class 2 — Yes: ${medYes}, No: ${medNo}
  Computer Number  — Yes: ${compYes}

CALLING TRACKER (${calling.length} contacts):
  Resolved: ${resolved} | Pending: ${pending} | DNP: ${dnp} | Not Called: ${notCalled}
`.trim();
}

// ─── Section insight prompts ──────────────────────────────────────────────────
const SECTION_PROMPTS = {
  date:        'daily application submission trend over time (Draft vs Complete)',
  region:      'regional distribution of applications across India (6 regions)',
  state:       'state-wise application breakdown (top 25 states)',
  district:    'district-level application distribution (top 30 districts)',
  'dgca-med':  'DGCA Medical Class 2 assessment completion rate among applicants',
  'dgca-comp': 'DGCA Computer Number availability among applicants',
  employment:  'employment status mix — Student vs Employed vs Unemployed',
  education:   'education qualification status — Completed vs Pursuing degree',
  issues:      'issue resolution rate from the calling/outreach tracker',
};

// ─── POST /api/ai/insights  (auto insight per section) ───────────────────────
router.post('/insights', async (req, res) => {
  const { section, sectionData } = req.body;
  const topic = SECTION_PROMPTS[section] || section;
  const dataSnippet = sectionData ? `\nSection data sample: ${JSON.stringify(sectionData).slice(0, 600)}` : '';

  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, 3000 * attempt));
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [{
          role: 'system',
          content: `You are a concise analytics advisor for a scholarship programme dashboard. Respond in plain text, no markdown, no bullet points. Max 75 words.`,
        }, {
          role: 'user',
          content: `Given this programme context:\n${buildContext()}${dataSnippet}\n\nWrite a 2-sentence actionable insight about: ${topic}.\nHighlight one key number or trend, then give one specific recommendation for the programme team.`,
        }],
        max_tokens: 180,
        temperature: 0.35,
      });
      return res.json({ insight: completion.choices[0].message.content.trim() });
    } catch (err) {
      lastErr = err;
      if (!err.message?.includes('rate') && !err.message?.includes('429')) break;
    }
  }
  console.error('Groq insights error:', lastErr?.message);
  res.status(500).json({ error: 'AI unavailable — rate limit, retry shortly' });
});

// ─── POST /api/ai/chat  (conversational assistant) ───────────────────────────
router.post('/chat', async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'message required' });

  const messages = [
    {
      role: 'system',
      content: `You are an intelligent analytics assistant for the IndiGo "Giving Wings to Fly" CPL Pilot Scholarship dashboard. Help programme managers understand data, spot trends, and make decisions.

${buildContext()}

Rules:
- Answer concisely using the statistics above; calculate percentages on the fly if needed
- Be professional but conversational — this is an internal ops tool
- If asked for something outside the data, say so briefly
- No markdown formatting — plain text only
- Max 120 words per response`,
    },
    ...history.slice(-12),
    { role: 'user', content: message.trim() },
  ];

  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, 3000 * attempt));
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages,
        max_tokens: 350,
        temperature: 0.3,
      });
      return res.json({ reply: completion.choices[0].message.content.trim() });
    } catch (err) {
      lastErr = err;
      if (!err.message?.includes('rate') && !err.message?.includes('429')) break;
    }
  }
  console.error('Groq chat error:', lastErr?.message);
  res.status(500).json({ error: 'AI unavailable — rate limit, retry shortly' });
});

// ─── GET /api/ai/missing-summary  (count missing fields) ─────────────────────
router.get('/missing-summary', (req, res) => {
  const { drafts, applied } = getCache();
  const isEmpty = v => !v || v === 'Not Specified' || v === '-' || v === '';
  const hasName = r => r.name && r.name.trim() !== '-' && r.name.trim() !== '- -' && r.name.trim().length > 3;

  const combined = applyFills([
    ...drafts.map(d => ({ ...d, applicationType: 'Draft' })),
    ...applied.map(a => ({ ...a, applicationType: 'Complete' })),
  ]);

  const fillable = {
    currentState:     combined.filter(r => hasName(r) && isEmpty(r.currentState)).length,
    employmentStatus: combined.filter(r => hasName(r) && (isEmpty(r.employmentStatus) || !['Student','Employed','Unemployed'].includes(r.employmentStatus))).length,
    gender:           combined.filter(r => hasName(r) && (isEmpty(r.gender) || !['Male','Female','Other'].includes(r.gender))).length,
  };

  const fills = loadFills();
  const alreadyFilled = Object.keys(fills).length;

  res.json({ fillable, alreadyFilled, total: combined.length });
});

// ─── POST /api/ai/apply-fills  (AI-fill a field for all fillable records) ────
// Processes records in batches of 15, saves to ai_fills.json, returns summary.
// Body: { field: 'employmentStatus' | 'currentState' | 'gender', limit: 30 }
router.post('/apply-fills', async (req, res) => {
  const { field = 'employmentStatus', limit = 30 } = req.body;

  const ALLOWED_FIELDS = ['currentState', 'employmentStatus', 'gender'];
  if (!ALLOWED_FIELDS.includes(field)) {
    return res.status(400).json({ error: `field must be one of: ${ALLOWED_FIELDS.join(', ')}` });
  }

  const { drafts, applied } = getCache();
  const isEmpty = v => !v || v === 'Not Specified' || v === '-' || v === '';
  const hasName = r => r.name && r.name.trim() !== '-' && r.name.trim() !== '- -' && r.name.trim().length > 3;

  const combined = applyFills([
    ...drafts.map(d => ({ ...d, applicationType: 'Draft' })),
    ...applied.map(a => ({ ...a, applicationType: 'Complete' })),
  ]);

  // Find records that are fillable for this field
  let candidates;
  if (field === 'employmentStatus') {
    candidates = combined.filter(r => hasName(r) && (isEmpty(r.employmentStatus) || !['Student','Employed','Unemployed'].includes(r.employmentStatus)));
  } else if (field === 'currentState') {
    candidates = combined.filter(r => hasName(r) && isEmpty(r.currentState));
  } else {
    candidates = combined.filter(r => hasName(r) && (isEmpty(r.gender) || !['Male','Female','Other'].includes(r.gender)));
  }

  const toProcess = candidates.slice(0, limit);
  if (!toProcess.length) return res.json({ filled: 0, field, message: 'No missing records found' });

  // Build field-specific prompt instructions
  const FIELD_PROMPTS = {
    employmentStatus: {
      values: ['Student', 'Employed', 'Unemployed'],
      hint: 'Use date of birth (age < 25 → likely Student), name, education status, and any other context.',
    },
    currentState: {
      values: ['Tamil Nadu','Maharashtra','Karnataka','Andhra Pradesh','Telangana','Kerala','Gujarat','Rajasthan','Uttar Pradesh','Delhi','Punjab','Haryana','West Bengal','Odisha','Madhya Pradesh','Chhattisgarh','Bihar','Jharkhand','Assam','Other'],
      hint: 'Use the applicant name (Indian names often hint at regional origin) and email/phone if available.',
    },
    gender: {
      values: ['Male', 'Female'],
      hint: 'Infer from the given name. Indian names are usually strongly gendered.',
    },
  };

  const spec = FIELD_PROMPTS[field];
  const BATCH_SIZE = 15;
  const fills = loadFills();
  let totalFilled = 0;
  const results = [];

  // Process in batches
  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);

    const batchData = batch.map(r => ({
      applicationId: r.applicationId,
      name: r.name,
      email: (r.email || '').replace(/(.{3}).*@/, '$1***@'),
      dateOfBirth: r.dateOfBirth || '',
      currentState: r.currentState || '',
      currentDistrict: r.currentDistrict || '',
      educationStatus: r.educationStatus || '',
      applicationType: r.applicationType,
    }));

    const prompt = `You are filling missing scholarship data. For each record, infer the most likely value for "${field}".

Allowed values: ${spec.values.join(', ')}
Inference hint: ${spec.hint}

Records:
${JSON.stringify(batchData, null, 2)}

Return ONLY a valid JSON array (no explanation, no markdown):
[{"applicationId":"SB-2026-xxxx","value":"<one of allowed values>","confidence":"high|medium|low"}]`;

    try {
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.05,
      });

      const raw = completion.choices[0].message.content.trim();
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) { console.warn('Batch parse fail:', raw.slice(0, 100)); continue; }

      const inferred = JSON.parse(match[0]);
      for (const item of inferred) {
        if (!item.applicationId || !item.value) continue;
        if (!fills[item.applicationId]) fills[item.applicationId] = {};
        fills[item.applicationId][field] = item.value;
        fills[item.applicationId]._meta = {
          ...(fills[item.applicationId]._meta || {}),
          [`${field}_confidence`]: item.confidence,
          [`${field}_filledAt`]: new Date().toISOString(),
        };
        totalFilled++;
        results.push({ applicationId: item.applicationId, value: item.value, confidence: item.confidence });
      }

      saveFills(fills);
    } catch (err) {
      console.error(`Batch ${i / BATCH_SIZE + 1} error:`, err.message);
    }
  }

  res.json({
    field,
    processed: toProcess.length,
    filled: totalFilled,
    results: results.slice(0, 10), // preview
    message: `AI filled ${totalFilled} "${field}" values. Analytics will now reflect updated data.`,
  });
});

// ─── GET /api/ai/enrichment-status  (live pipeline progress) ─────────────────
router.get('/enrichment-status', (req, res) => {
  const s = getEnrichStatus();
  const fills = loadFills();
  // Count real records filled (keys without '_emp' suffix)
  const filledRecords = Object.keys(fills).filter(k => !k.includes('_emp')).length;
  res.json({ ...s, filledRecords });
});

// ─── DELETE /api/ai/fills  (reset all AI fills) ───────────────────────────────
router.delete('/fills', (req, res) => {
  saveFills({});
  res.json({ message: 'All AI fills cleared' });
});

module.exports = router;
