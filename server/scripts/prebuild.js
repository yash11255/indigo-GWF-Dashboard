/**
 * Pre-build script: converts Excel → JSON cache so serverless cold starts are fast.
 * Run at build time: node scripts/prebuild.js
 * Output: server/data/cache.json (~1-2 MB JSON vs 10 MB Excel + 6s parse time)
 */

const fs   = require('fs');
const path = require('path');

// __dirname = server/scripts/ → ROOT = server/
const ROOT      = path.join(__dirname, '..');
const DATA_FILE = path.join(ROOT, '01072026_IGWF_Applicants_List.xlsx');
const OUT_DIR   = path.join(ROOT, 'data');
const OUT_FILE  = path.join(OUT_DIR, 'cache.json');

if (!fs.existsSync(DATA_FILE)) {
  console.log('⚠️  Excel file not found — skipping prebuild. Serverless will start without pre-cached data.');
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify({ registered: [], drafts: [], applied: [], calling: [], lastUpdated: null }));
  process.exit(0);
}

// Inline the dataLoader logic here so prebuild is self-contained
const XLSX = require(path.join(ROOT, 'node_modules', 'xlsx'));

const NEEDED = [
  'ApplicationId','Application Type','Stage','AppliedBy','DraftDate','AppliedDate','Status',
  'FirstName','LastName','Email','PhoneNumber','DateOfBirth',
  'Gender','Gendernbsp','WhatsappNumber','AadharCardNumber','Category',
  'IsArmyVeteranCategory','IsPWDCategory','IsMinority','Minority',
  'FamilyAnnualIncome','Familys_annual_household_income',
  'Current_State','Current_District','Permanent_Region','Region',
  'Employment_status','ScholarshipName',
  'Do_you_have_a_valid_Indian_passport','Do_you_have_a_laptop',
  'Height_in_cm','Weight_in_kg','BMI','Do_you_wear_spectacles',
  'Any_known_chronic_medical_condition','What_is_your_education_status',
  'Did_you_study_Physics_Mathematics_and_English',
  'Have_you_undergone_DGCA_medical_assessment','Have_you_cleared_any_DGCA_exam',
  'Do_you_have_DGCA_computer_number','Do_you_have_DGCA_Computer_Number',
  'How_did_you_hear_about','What_was_your_score_in_Physics',
  'What_was_your_score_in_Maths','What_was_your_score_in_English',
];

function parseSheet(ws) {
  const ref = ws['!ref'];
  if (!ref) return [];
  const range = XLSX.utils.decode_range(ref);
  const encodeCell = XLSX.utils.encode_cell;
  const headers = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = ws[encodeCell({ r: range.s.r, c })];
    headers.push(cell ? String(cell.v || '').trim() : '');
  }
  const colMap = {};
  headers.forEach((h, i) => {
    if (NEEDED.includes(h)) { colMap[h] = i; return; }
    for (const n of NEEDED) {
      if (colMap[n] === undefined && h.startsWith(n)) colMap[n] = i;
    }
    if (colMap['__phys'] === undefined && h.includes('score_in_Physics')) colMap['__phys'] = i;
    if (colMap['__math'] === undefined && h.includes('score_in_Maths'))   colMap['__math'] = i;
    if (colMap['__eng']  === undefined && h.includes('score_in_English'))  colMap['__eng']  = i;
  });
  const logicalNames = Object.keys(colMap);
  const colIndices   = logicalNames.map(k => colMap[k]);
  const appIdCol     = colMap['ApplicationId'];
  if (appIdCol === undefined) return [];
  const rows = [];
  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    const idCell = ws[encodeCell({ r, c: appIdCol })];
    if (!idCell || !idCell.v) continue;
    const obj = {};
    for (let li = 0; li < logicalNames.length; li++) {
      const cell = ws[encodeCell({ r, c: colIndices[li] })];
      obj[logicalNames[li]] = cell ? String(cell.v ?? '').trim() : '';
    }
    rows.push(obj);
  }
  return rows;
}

function normalizeDate(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (!s || s === '0') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4,6}$/.test(s)) {
    const serial = parseInt(s, 10);
    if (serial > 30000 && serial < 60000) {
      const dt = new Date((serial - 25569) * 86400 * 1000);
      if (!isNaN(dt)) return dt.toISOString().split('T')[0];
    }
    return null;
  }
  const formats = [
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
    /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/,
  ];
  for (const fmt of formats) {
    const m = s.match(fmt);
    if (m) {
      const dt = new Date(fmt === formats[0] ? `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}` : `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`);
      if (!isNaN(dt)) return dt.toISOString().split('T')[0];
    }
  }
  const dt = new Date(s);
  return isNaN(dt) ? null : dt.toISOString().split('T')[0];
}

function pickFirst(row, ...keys) {
  for (const key of keys) {
    let val = row[key];
    if (!val || val === '' || val === '-') {
      const matchKey = Object.keys(row).find(k => k.startsWith(key) || key.startsWith(k));
      if (matchKey) val = row[matchKey];
    }
    if (val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== '-') {
      return String(val).trim();
    }
  }
  return null;
}

function parseRow(r) {
  const dgcaMedical  = pickFirst(r,'Have_you_undergone_DGCA_medical_assessment','Have_you_cleared_any_DGCA_exam') || 'No Data';
  const dgcaComputer = pickFirst(r,'Do_you_have_DGCA_computer_number','Do_you_have_DGCA_Computer_Number') || 'No Data';
  // New format uses 'Region'; old uses 'Permanent_Region'
  const permanentRegion = pickFirst(r,'Permanent_Region','Region') || 'Not Specified';
  // New format uses long 'Familys_annual_household_income...' key; old uses 'FamilyAnnualIncome'
  const familyAnnualIncome = pickFirst(r,'FamilyAnnualIncome','Familys_annual_household_income') || 'Not Specified';
  // New format: Stage column ('Draft'/'Completed'); old format: 'Application Type'
  const rawStage = r['Stage'] || r['Application Type'] || 'Draft';
  const applicationType = rawStage === 'Completed' ? 'Complete' : rawStage;
  let category = r['Category'] || 'General';
  if (!category || category === '-') category = 'General';
  return {
    applicationId:    r['ApplicationId'] || '',
    applicationType,
    firstName:        (r['FirstName'] || '').trim(),
    lastName:         (r['LastName']  || '').trim(),
    name:             `${(r['FirstName']||'').trim()} ${(r['LastName']||'').trim()}`.trim(),
    email:            (r['Email'] || '').toLowerCase().trim(),
    phone:            r['PhoneNumber'] || '',
    dateOfBirth:      normalizeDate(r['DateOfBirth']),
    gender:           pickFirst(r,'Gendernbsp','Gender') || 'Not Specified',
    category,
    isArmyVeteran:    r['IsArmyVeteranCategory'] || 'No',
    isPWD:            r['IsPWDCategory'] || 'No',
    isMinority:       r['IsMinority'] || 'No',
    familyAnnualIncome,
    currentState:     r['Current_State'] || 'Not Specified',
    currentDistrict:  r['Current_District'] || 'Not Specified',
    permanentRegion,
    employmentStatus: pickFirst(r,'Employment_status') || 'Not Specified',
    educationStatus:  pickFirst(r,'What_is_your_education_status') || 'Not Specified',
    studiedPME:       pickFirst(r,'Did_you_study_Physics_Mathematics_and_English') || 'Not Specified',
    hasPassport:      pickFirst(r,'Do_you_have_a_valid_Indian_passport') || 'Not Specified',
    hasLaptop:        pickFirst(r,'Do_you_have_a_laptop') || 'Not Specified',
    height:           pickFirst(r,'Height_in_cm') || '',
    weight:           pickFirst(r,'Weight_in_kg') || '',
    bmi:              r['BMI'] || '',
    wearSpectacles:   pickFirst(r,'Do_you_wear_spectacles') || 'Not Specified',
    chronicCondition: pickFirst(r,'Any_known_chronic_medical_condition') || 'Not Specified',
    dgcaMedical,
    dgcaComputer,
    physicsScore:     r['__phys'] || '',
    mathScore:        r['__math'] || '',
    englishScore:     r['__eng']  || '',
    heardAbout:       pickFirst(r,'How_did_you_hear_about') || 'Not Specified',
    submittedDate:    normalizeDate(r['DraftDate'] || r['AppliedDate']),
    status:           r['Status'] || '',
    appliedBy:        r['AppliedBy'] || '',
  };
}

console.log('\n📂 Prebuild: converting Excel → JSON cache...');
const t0 = Date.now();
const wb = XLSX.readFile(DATA_FILE, { cellDates: false });
console.log(`   Sheets: ${wb.SheetNames.join(', ')} (read in ${Date.now()-t0}ms)`);

const cache = { registered: [], drafts: [], applied: [], calling: [], lastUpdated: new Date().toISOString() };

const isNewFormat = !!wb.Sheets['IGWF_Applicants_List'];

if (isNewFormat) {
  // New format: single sheet with Stage column
  const allRows = parseSheet(wb.Sheets['IGWF_Applicants_List']).map(parseRow);
  cache.applied = allRows.filter(r => r.applicationType === 'Complete');
  cache.drafts  = allRows.filter(r => r.applicationType !== 'Complete');
  console.log(`  ✅ IGWF_Applicants_List: ${cache.applied.length} applied + ${cache.drafts.length} drafts`);

  const regSheet2 = wb.Sheets['IGWF_Registration_List'];
  if (regSheet2) {
    // Registration rows use 'AppliedBy' as ID (ApplicationId is empty)
    const raw = XLSX.utils.sheet_to_json(regSheet2, { defval: '' });
    cache.registered = raw.filter(r => r['AppliedBy'] || r['Email']).map(r => ({
      id:               String(r['AppliedBy'] || r['ApplicationId'] || ''),
      firstName:        (r['FirstName'] || '').trim(),
      lastName:         (r['LastName']  || '').trim(),
      name:             `${(r['FirstName']||'').trim()} ${(r['LastName']||'').trim()}`.trim(),
      email:            (r['Email'] || '').toLowerCase().trim(),
      phone:            String(r['PhoneNumber'] || ''),
      registrationDate: normalizeDate(String(r['AppliedDate'] || '')),
    }));
    console.log(`  ✅ IGWF_Registration_List: ${cache.registered.length} rows`);
  }
} else {
  // Old format: separate sheets with email-based dedup
  const appliedSheet = wb.Sheets['Applied applicants'];
  if (appliedSheet) {
    cache.applied = parseSheet(appliedSheet).map(parseRow);
    console.log(`  ✅ Applied applicants: ${cache.applied.length} rows`);
  }

  const draftSheet = wb.Sheets['Draft Applicants'];
  if (draftSheet) {
    const appliedKeys = new Set([
      ...cache.applied.map(r => r.email).filter(Boolean),
      ...cache.applied.map(r => r.applicationId).filter(Boolean),
    ]);
    const rows = parseSheet(draftSheet).map(parseRow);
    const before = rows.length;
    cache.drafts = rows.filter(r =>
      !appliedKeys.has(r.email) && !appliedKeys.has(r.applicationId)
    );
    const removed = before - cache.drafts.length;
    if (removed > 0) console.log(`  ⚠️  Removed ${removed} draft rows already in Applied sheet (export artifact)`);
    console.log(`  ✅ Draft Applicants: ${cache.drafts.length} rows`);
  }

  const regSheet = wb.Sheets['Registered Applicants'];
  if (regSheet) {
    const raw = XLSX.utils.sheet_to_json(regSheet, { defval: '' });
    cache.registered = raw.filter(r => r['Email'] || r['ID']).map(r => ({
      id: String(r['ID'] || ''),
      uniqueId: String(r['Unique ID'] || ''),
      firstName: (r['First Name'] || '').trim(),
      lastName:  (r['Last Name']  || '').trim(),
      name:      `${(r['First Name']||'').trim()} ${(r['Last Name']||'').trim()}`.trim(),
      email:     (r['Email'] || '').toLowerCase().trim(),
      phone:     String(r['Phone Number'] || ''),
      registrationDate: normalizeDate(String(r['Registration Date'] || '')),
    }));
    console.log(`  ✅ Registered: ${cache.registered.length} rows`);
  }
}

const callingSheet = wb.Sheets['Draft Applicants calling '] || wb.Sheets['Draft Applicants calling'];
if (callingSheet) {
  const raw = XLSX.utils.sheet_to_json(callingSheet, { defval: '' });
  cache.calling = raw.filter(r => {
    const v = String(r['__EMPTY'] || '').trim();
    return v.startsWith('SB-') || /^[A-Z]+-\d{4}-\d+$/.test(v);
  }).map(r => ({
    applicationId:   String(r['__EMPTY'] || '').trim(),
    applicationType: String(r['Application Type'] || '').trim(),
    firstName:       String(r['FirstName'] || '').trim(),
    lastName:        String(r['LastName']  || '').trim(),
    name:            `${String(r['FirstName']||'').trim()} ${String(r['LastName']||'').trim()}`.trim(),
    email:           String(r['Email'] || '').toLowerCase().trim(),
    phone:           String(r['PhoneNumber'] || ''),
    gender:          String(r['Gender'] || 'Not Specified').trim(),
    currentState:    String(r['Current_State'] || '').trim(),
    assignedMember:  String(r['Assigned to'] || '').trim(),
    callStatus:      String(r['Calling Status'] || 'Not Called').trim(),
    queryStatus:     String(r['Call Status'] || '').trim(),
    remark:          String(r['Remarks'] || '').trim(),
  }));
  console.log(`  ✅ Calling Tracker: ${cache.calling.length} rows`);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const json = JSON.stringify(cache);
fs.writeFileSync(OUT_FILE, json);
const sizeMB = (json.length / 1024 / 1024).toFixed(1);
console.log(`\n✅ Cache written to data/cache.json (${sizeMB} MB) in ${Date.now()-t0}ms`);
console.log(`   Cold start will now load in ~50ms instead of ~6000ms\n`);
